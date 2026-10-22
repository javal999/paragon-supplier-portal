// ────────────────────────────────────────────────────────────────────────────
// INV-D9 · THE "ASK SUPPLIER" TARGET (Inventory UX S-04; the ask half of INV-D8).
//
// `entityId` is the ask id (`ask-0001`, minted by the store).
//
//   · `readState` answers the stored state for an ask that exists.
//   · `readScopeOwner` NAMES THE SUPPLIER the ask is to, so a supplier seat can
//     answer only its own asks: another supplier is refused at SCOPE before
//     its role is read (§86). `creationOwner` is the supplier the payload
//     names, resolved against the supplier master for every persona
//     (`requireCreationOwner`): nobody can ask a supplier that does not exist.
//   · `create` inserts the ask with its first history step (`raised`); the
//     time (hub clock) and the actor (the session's) are assigned here.
//   · `applyTransition` moves the state and APPENDS one step — `answered`
//     (with the reply and its optional date), `closed` or `withdrawn`. No
//     earlier step is changed (RFX-R3).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CommandTarget } from '../../../transitions' */
/** @import { SupplierAsk, SupplierAskEvent, RiskClass } from '../../types' */
/** @import { SupplierAskTopic } from '../../../transitions/supplierAskRules' */
import { bindPolicyHook, POLICY_HOOKS } from '../../../transitions';
import {
  SUPPLIER_ASK_REFUSAL_SENTENCE,
  supplierAskAnswerRefusal,
  supplierAskRaiseRefusal,
  supplierAskSubjectKey
} from '../../../transitions/supplierAskRules';
import { dayOf } from '../../../transitions/inventoryRules';
import { sdcClock } from '../../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { supplierAskStore } from '../stores/supplierAskStore';
import { allCapacityPlans, isAssignedMaterial } from '../inventoryReadModel';
import { isKnownSupplier } from '../supplierMaster';

/**
 * @param {unknown} v
 * @returns {string}
 */
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** @type {readonly RiskClass[]} */
const RISK_CLASSES = ['high', 'medium', 'low'];

/** @type {Record<string, SupplierAsk['state']>} */
const STATE_OF_EVENT = {
  answered: 'Answered',
  closed: 'Closed',
  withdrawn: 'Withdrawn'
};

/**
 * The asks still waiting on someone (Open or Answered).
 * @param {SupplierAsk} a
 * @returns {boolean}
 */
const isLive = (a) => a.state === 'Open' || a.state === 'Answered';

/** @type {CommandTarget} */
export const supplierAskTarget = {
  readState: (id) => supplierAskStore.get(id)?.state ?? null,
  readScopeOwner: (id) => supplierAskStore.get(id)?.supplierId ?? null,
  readEntity: (id) => supplierAskStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope) => {
    const kind =
      toState === 'Answered' ? 'answered' : toState === 'Closed' ? 'closed' : 'withdrawn';
    const date = str(payload.answerDate);
    /** @type {SupplierAskEvent} */
    const event = {
      kind,
      at: sdcClock.now(),
      actor: scope.actor ?? NO_PERSON,
      ...(kind === 'answered' ? { text: str(payload.answer) } : {}),
      ...(kind === 'answered' && date !== '' ? { date } : {})
    };
    supplierAskStore.append(id, STATE_OF_EVENT[kind], event);
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = str(payload.supplierId);
    return isKnownSupplier(sid) ? sid : null;
  },
  create: (payload, _toState, scope) => {
    // The policy hook has refused every payload this could not store.
    const materialCode = str(payload.materialCode);
    const due = str(payload.dueDate);
    const risk = /** @type {RiskClass} */ (str(payload.riskClass));
    const question = str(payload.question);
    const at = sdcClock.now();
    const actor = scope.actor ?? NO_PERSON;
    const row = supplierAskStore.insert({
      supplierId: str(payload.supplierId),
      ...(materialCode !== ''
        ? { materialCode }
        : { planningGroupId: str(payload.planningGroupId), week: str(payload.week) }),
      topic: /** @type {SupplierAskTopic} */ (str(payload.topic)),
      ...(RISK_CLASSES.includes(risk) ? { riskClass: risk } : {}),
      question,
      ...(due !== '' ? { dueDate: due } : {}),
      state: 'Open',
      history: [{ kind: 'raised', at, actor, text: question }]
    });
    return { entityId: row.id };
  }
};

/**
 * Does the supplier supply this subject: the material is assigned to it, or
 * the planning group week is in its capacity plan?
 * @param {string} supplierId
 * @param {Record<string, unknown>} payload
 * @returns {boolean}
 */
export function supplierSuppliesSubject(supplierId, payload) {
  const materialCode = str(payload.materialCode);
  if (materialCode !== '') return isAssignedMaterial(supplierId, materialCode);
  const groupId = str(payload.planningGroupId);
  const week = str(payload.week);
  return allCapacityPlans().some(
    (p) =>
      p.supplierId === supplierId &&
      p.planningGroupId === groupId &&
      p.weeks.some((w) => w.week === week)
  );
}

/**
 * The live ask (Open or Answered) on the same supplier × subject, if any.
 * @param {string} supplierId
 * @param {{ materialCode?: string; planningGroupId?: string; week?: string }} subject
 * @returns {SupplierAsk | undefined}
 */
export function liveAskOnSubject(supplierId, subject) {
  const key = supplierAskSubjectKey(supplierId, subject);
  return supplierAskStore
    .all()
    .find((a) => isLive(a) && supplierAskSubjectKey(a.supplierId, a) === key);
}

/**
 * @param {import('../../../transitions/supplierAskRules').SupplierAskRefusal} code
 * @returns {{ ok: false; reason: string }}
 */
const refuse = (code) => ({ ok: false, reason: `${code}: ${SUPPLIER_ASK_REFUSAL_SENTENCE[code]}` });

// INV-D9 — the same rule the PTI dialog's pre-check calls.
bindPolicyHook(POLICY_HOOKS.SUPPLIER_ASK_RAISABLE, ({ payload }) => {
  const supplierId = str(payload.supplierId);
  /** @type {{ materialCode?: string; planningGroupId?: string; week?: string }} */
  const subject = {
    materialCode: str(payload.materialCode),
    planningGroupId: str(payload.planningGroupId),
    week: str(payload.week)
  };
  const refusal = supplierAskRaiseRefusal({
    topic: payload.topic,
    subject,
    question: payload.question,
    dueDate: payload.dueDate,
    today: dayOf(sdcClock.now()),
    supplied: supplierSuppliesSubject(supplierId, payload),
    openOnSubject: liveAskOnSubject(supplierId, subject) !== undefined
  });
  return refusal ? refuse(refusal) : { ok: true };
});

// INV-D9 — the same rule the supplier's reply form calls.
bindPolicyHook(POLICY_HOOKS.SUPPLIER_ASK_ANSWERABLE, ({ payload }) => {
  const refusal = supplierAskAnswerRefusal({
    answer: payload.answer,
    answerDate: payload.answerDate
  });
  return refusal ? refuse(refusal) : { ok: true };
});
