// ────────────────────────────────────────────────────────────────────────────
// BL-32 · REASON CODES — added, renamed and retired by the administrator,
// through the REAL dispatcher and the REAL store, and read by every verb in
// force. Never deleted: a retired code still labels the records that carry it.
//
// Proved here, by named case:
//   1. The coded lists are DERIVED (four), the constants they replaced are gone
//      from shipped code, and call-off / dispute reasons are free text (control).
//   2. The readers are derived and pinned — every verb and parser reads the
//      list in force; no page renders a reason label outside the one helper.
//   3. For EACH list: a new code is accepted by the verb that reads it; retired,
//      it is refused on a new answer; the old answer still reads (retired).
//   4. Governance both ways; refusals by name (empty label, clash, last code).
//   5. Persistence re-checked on read.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
/** @import { QueryScope } from '../types' */
import { DataError, POStatus } from '../types';
import {
  PERSONA_SYSTEM_ROLES,
  SEEDED_SEAT_ROLES,
  SYSTEM_ROLES,
  rolesHolding
} from '../../transitions/businessRoles';
/** @import { ReasonListId } from '../../transitions/reasonCodes' */
import {
  NOTE_REQUIRED_CODE,
  REASON_CODES_KEY,
  REASON_LISTS,
  STARTER_REASON_CODES,
  activeReasonCodes,
  builtInReasonLabels,
  isActiveReasonCode,
  reasonCodeStore
} from '../../transitions/reasonCodes';
import { counterOfferRefusal } from '../../transitions/policies';
import { shortfallRefusal } from '../../transitions/forecastRules';
import { capacitySubmissionRefusal } from '../../transitions/capacityRules';
import { getKnownFlows } from '../../transitions';

const svc = new MockCommandService();
const NOBODY = /** @type {const} */ ({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
/**
 * @param {...string} roles
 * @returns {QueryScope}
 */
const seat = (...roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NOBODY
});
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NOBODY
};

/**
 * @param {string} list
 * @param {string} code
 * @param {unknown} labelEn
 * @param {unknown} labelId
 * @param {unknown} [active]
 */
const cmd = (list, code, labelEn, labelId, active = true) => ({
  transitionId: 't_reasoncode_set',
  entity: 'reasonCode',
  entityId: `${list}:${code}`,
  payload: { labelEn, labelId, active, setBy: NOBODY }
});

/**
 * @param {ReasonListId} list
 * @param {string} code
 * @param {string} labelEn
 * @param {string} labelId
 */
async function record(list, code, labelEn, labelId, active = true) {
  const r = await svc.dispatch(seat('compliance'), cmd(list, code, labelEn, labelId, active));
  expect(r.status, r.reason).toBe('done');
}

/**
 * @param {QueryScope} scope
 * @param {ReturnType<typeof cmd>} c
 * @returns {Promise<string>}
 */
async function outcomeOf(scope, c) {
  try {
    const r = await svc.dispatch(scope, c);
    return r.status === 'failed' ? `failed/${r.reason ?? ''}` : `ok/${r.status}`;
  } catch (e) {
    return e instanceof DataError ? `throw/${e.code}` : `throw/${/** @type {Error} */ (e).name}`;
  }
}

beforeEach(() => {
  reasonCodeStore.reset();
  purchaseOrderStore.reset();
  commandAuditSink.clear();
});
afterEach(() => reasonCodeStore.reset());

// ── 1 · The population ──────────────────────────────────────────────────────

/**
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function shipped(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shipped(full, out);
    else if (/\.[jt]sx?$/.test(name) && !name.includes('.test.')) out.push(full);
  }
  return out;
}
/** @param {string} s */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const SHIPPED = shipped(join(process.cwd(), 'src')).map((f) => ({
  path: relative(process.cwd(), f).split('\\').join('/'),
  code: code(readFileSync(f, 'utf8'))
}));
/** @param {RegExp} re */
const callersOf = (re) =>
  SHIPPED.filter((f) => re.test(f.code))
    .map((f) => f.path)
    .sort();

describe('BL32-RSN-POP · the coded reason lists, derived', () => {
  it('BL32-RSN-POP-01 · the lists, each the §3.6 / BR-06 / MR-9 BR-05 starter list', () => {
    expect([...REASON_LISTS]).toEqual([
      'poAdjust',
      'poReject',
      'capacityShortfall',
      'commitmentShortfall',
      'alertClose',
      'forecastOverride'
    ]);
    expect(STARTER_REASON_CODES.poReject).toEqual(['date', 'quantity', 'quality']);
    for (const l of /** @type {const} */ ([
      'poAdjust',
      'capacityShortfall',
      'commitmentShortfall'
    ])) {
      expect(STARTER_REASON_CODES[l]).toEqual([
        'capacity',
        'material',
        'logistics',
        'quality',
        'other'
      ]);
    }
    // MR-9 BR-05 — the alert close reasons; "Other" is the one that needs a note.
    expect(STARTER_REASON_CODES.alertClose).toEqual([
      'calloff-raised',
      'po-raised',
      'supplier-updated',
      'supplier-confirmed-other',
      'data-error',
      'risk-accepted',
      'other'
    ]);
    expect(STARTER_REASON_CODES.alertClose).toContain(NOTE_REQUIRED_CODE);
    // REQ-E14-11 X-06 — the forecast override reasons (ENG-B104); "Other" needs a note.
    expect(STARTER_REASON_CODES.forecastOverride).toEqual([
      'promotion',
      'customer-order',
      'listing-gain',
      'listing-loss',
      'market-info',
      'data-correction',
      'other'
    ]);
    expect(STARTER_REASON_CODES.forecastOverride).toContain(NOTE_REQUIRED_CODE);
    expect(NOTE_REQUIRED_CODE).toBe('other');
    // Every starter code of every list has its shipped label in EN and ID.
    for (const l of REASON_LISTS) {
      for (const c of STARTER_REASON_CODES[l])
        expect(builtInReasonLabels(l, c), `${l}:${c}`).not.toBeNull();
    }
    expect(builtInReasonLabels('alertClose', 'other')).toEqual({
      en: 'Other (note required)',
      id: 'Lainnya (catatan wajib)'
    });
    // Known-false: a code that is not on the list has no shipped label.
    expect(builtInReasonLabels('alertClose', 'capacity')).toBeNull();
  });

  it('BL32-RSN-POP-02 · the constants the lists replaced are gone from shipped code', () => {
    for (const name of [
      'PO_REASON_CODES',
      'PO_REJECTION_CAUSES',
      'CAPACITY_REASONS',
      'COMMITMENT_REASONS',
      'isCapacityReason',
      'isCommitmentReason',
      'ROOT_CAUSE_LEVELS'
    ]) {
      expect(callersOf(new RegExp(`\\b${name}\\b`)), name).toEqual([]);
    }
    // Control: the matcher finds a list constant that does exist.
    expect(callersOf(/\bSTARTER_REASON_CODES\b/)).toContain(
      'src/services/transitions/reasonCodes.js'
    );
  });

  it('BL32-RSN-POP-03 · call-off and receipt-dispute reasons are free text — no coded list to maintain', () => {
    const callOffFlow = readFileSync(
      join(process.cwd(), 'src/services/transitions/flows/callOff.flow.js'),
      'utf8'
    );
    const disputeFlow = readFileSync(
      join(process.cwd(), 'src/services/transitions/flows/receiptDiscrepancy.flow.js'),
      'utf8'
    );
    expect(callOffFlow).toMatch(/requiredFields: \['reason'\]/);
    expect(disputeFlow).toMatch(/requiredFields: \['receiptId', 'comment'\]/);
    // Known-false: no call-off or dispute list exists to derive.
    expect(callersOf(/\b(CALL_OFF_REASONS|DISPUTE_REASONS)\b/)).toEqual([]);
  });
});

// ── 2 · The readers ──────────────────────────────────────────────────────────

describe('BL32-RSN-READ · every reader reads the list in force', () => {
  it('BL32-RSN-READ-01 · the verbs and parsers that check a code, pinned', () => {
    expect(callersOf(/\bisActiveReasonCode\s*\(/)).toEqual([
      'src/services/data/mock/MockCommandService.js',
      'src/services/data/mock/targets/forecastOverride.js',
      'src/services/transitions/capacityRules.js',
      'src/services/transitions/forecastRules.js',
      'src/services/transitions/inventoryAlertRules.js',
      'src/services/transitions/policies.js',
      'src/services/transitions/reasonCodes.js'
    ]);
  });

  it('BL32-RSN-READ-02 · the pickers offer the active list; the records read through one label helper', () => {
    expect(callersOf(/\buseActiveReasonCodes\s*\(/)).toEqual([
      'src/pages-v2/BuyerAlerts.jsx',
      'src/pages-v2/BuyerForecastBias.jsx',
      'src/pages-v2/SupplierCapacity.jsx',
      'src/pages-v2/SupplierForecastCommitments.jsx',
      'src/pages-v2/SupplierForecasts.jsx',
      'src/pages-v2/SupplierOrders.jsx',
      'src/pages-v2/admin/reasonCodeDisplay.js'
    ]);
    expect(callersOf(/\buseReasonLabel\s*\(/)).toEqual([
      'src/pages-v2/BuyerAlerts.jsx',
      'src/pages-v2/BuyerCapacity.jsx',
      'src/pages-v2/BuyerCommitments.jsx',
      'src/pages-v2/BuyerForecastBias.jsx',
      'src/pages-v2/SupplierCapacity.jsx',
      'src/pages-v2/SupplierForecastCommitments.jsx',
      'src/pages-v2/SupplierForecasts.jsx',
      'src/pages-v2/SupplierOrders.jsx',
      'src/pages-v2/admin/reasonCodeDisplay.js',
      'src/pages-v2/orders/PoCollaboration.jsx'
    ]);
    // Known-false: no page builds a reason label from its i18n key itself any
    // more — that would label an added code with its raw key.
    expect(
      callersOf(/t\(`(oc\.reason|oc\.cause|inv\.capacity\.reason|fc\.reason|fb\.reason)\.\$\{/)
    ).toEqual([]);
  });
});

// ── 3 · Each list: add → accepted; retire → refused on a new answer ──────────

const LINE = { lineId: 'li-008a', counterQty: 120000, counterDate: '2025-05-10' };
/** @param {string[]} causes */
const reject = (causes) =>
  svc.dispatch(supplier, {
    transitionId: 't_po_reject',
    entity: 'purchaseOrder',
    entityId: 'po-008',
    payload: { rejectionCauses: causes, comment: 'probe' }
  });
const HORIZON = ['2026-09-07'];
/** @param {string} reason */
const capacity = (reason) =>
  capacitySubmissionRefusal([{ week: '2026-09-07', allocated: 50, reason }], () => 100, HORIZON);

describe('BL32-RSN-FLIP · a code added is accepted, and retired is refused — per list', () => {
  it('poAdjust · a new adjust reason is accepted on a counter-offer, and refused once retired', async () => {
    const po = /** @type {import('../types').PurchaseOrder} */ (purchaseOrderStore.get('po-008'));
    expect(counterOfferRefusal({ ...LINE, reasonCode: 'tooling' }, po)).toBe('reason');
    await record('poAdjust', 'tooling', 'Tooling change', 'Perubahan perkakas');
    expect(counterOfferRefusal({ ...LINE, reasonCode: 'tooling' }, po)).toBeNull();
    await record('poAdjust', 'tooling', 'Tooling change', 'Perubahan perkakas', false);
    expect(counterOfferRefusal({ ...LINE, reasonCode: 'tooling' }, po)).toBe('reason');
    // Retired, not deleted: the code is still on the list for old answers.
    expect(reasonCodeStore.get('poAdjust', 'tooling')).toMatchObject({
      active: false,
      labelEn: 'Tooling change'
    });
  });

  it('poReject · a new rejection cause goes through the verb, and a retired starter cause is refused by name', async () => {
    expect((await reject(['price'])).status).toBe('failed');
    await record('poReject', 'price', 'Price', 'Harga');
    const ok = await reject(['price']);
    expect(ok.status, ok.reason).not.toBe('failed');
    expect(
      /** @type {import('../types').PurchaseOrder} */ (purchaseOrderStore.get('po-008')).status
    ).toBe(POStatus.REJECTED);
    purchaseOrderStore.reset();
    await record('poReject', 'quality', 'Quality', 'Kualitas', false);
    const refused = await reject(['quality']);
    expect(refused.reason).toMatch(/rejection cause 'quality' is retired/);
  });

  it('capacityShortfall · a new reason clears a week below demand, and refused once retired', async () => {
    expect(capacity('machine-breakdown')).toMatchObject({ refusal: 'reasonRequired' });
    await record('capacityShortfall', 'machine-breakdown', 'Machine breakdown', 'Mesin rusak');
    expect(capacity('machine-breakdown')).toBeNull();
    await record(
      'capacityShortfall',
      'machine-breakdown',
      'Machine breakdown',
      'Mesin rusak',
      false
    );
    expect(capacity('machine-breakdown')).toMatchObject({ refusal: 'reasonRequired' });
  });

  it('commitmentShortfall · a new reason clears a commitment below forecast, and refused once retired', async () => {
    expect(shortfallRefusal(1000, 800, { level1: 'raw-material-quota' })).toBe('reasonRequired');
    await record(
      'commitmentShortfall',
      'raw-material-quota',
      'Raw material quota',
      'Kuota bahan baku'
    );
    expect(shortfallRefusal(1000, 800, { level1: 'raw-material-quota' })).toBeNull();
    await record('commitmentShortfall', 'material', 'Material', 'Material', false);
    expect(shortfallRefusal(1000, 800, { level1: 'material' })).toBe('reasonRequired');
    expect(activeReasonCodes('commitmentShortfall')).not.toContain('material');
    expect(reasonCodeStore.list('commitmentShortfall').map((r) => r.code)).toContain('material');
  });

  it('a rename changes the label and keeps the code (old answers keep pointing at it)', async () => {
    await record('poAdjust', 'logistics', 'Transport', 'Transportasi');
    expect(reasonCodeStore.get('poAdjust', 'logistics')).toMatchObject({
      labelEn: 'Transport',
      labelId: 'Transportasi',
      active: true,
      builtIn: true
    });
    expect(isActiveReasonCode('poAdjust', 'logistics')).toBe(true);
    const [c] = reasonCodeStore.changes();
    expect(c.previous).toEqual({ active: true });
  });
});

// ── 4 · Governance and refusals ──────────────────────────────────────────────

describe('BL32-RSN-GOV · t_reasoncode_set — who may, and what is refused', () => {
  it('BL32-RSN-GOV-01 · registered, surfaced, statePreserving, on reasoncode:maintain', () => {
    const t = getKnownFlows()
      .find((f) => f.entity === 'reasonCode')
      ?.transitions.find((x) => x.id === 't_reasoncode_set');
    expect(t?.requiredRole).toBe('reasoncode:maintain');
    expect(t?.statePreserving).toBe(true);
    expect(t?.surfaceable).toEqual({ surfaced: true });
  });

  it('BL32-RSN-GOV-02 · compliance and admin hold it; the lanes that answer or judge the reasons do not', async () => {
    expect(rolesHolding('reasoncode:maintain')).toEqual(['compliance']);
    expect(SYSTEM_ROLES.admin).toContain('reasoncode:maintain');
    for (const lane of /** @type {const} */ ([
      'planning',
      'procurement',
      'receiving',
      'finance',
      'requisitioner'
    ])) {
      expect(SYSTEM_ROLES[lane], lane).not.toContain('reasoncode:maintain');
    }
    for (const lane of PERSONA_SYSTEM_ROLES.supplier)
      expect(SYSTEM_ROLES[lane], lane).not.toContain('reasoncode:maintain');
    expect(
      (await svc.dispatch(seat('admin'), cmd('poAdjust', 'tooling', 'Tooling', 'Perkakas'))).status
    ).toBe('done');
    expect(
      (await svc.dispatch(seat('planning'), cmd('poAdjust', 'tooling2', 'Tooling 2', 'Perkakas 2')))
        .reason
    ).toMatch(/^ROLE_NOT_PERMITTED/);
    expect(await outcomeOf(supplier, cmd('poAdjust', 'tooling3', 'Tooling 3', 'Perkakas 3'))).toBe(
      'throw/SCOPE_DENIED'
    );
    expect(
      commandAuditSink.byEvent('t_reasoncode_set').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });

  it.each([
    [
      'an empty English label',
      cmd('poAdjust', 'tooling', '  ', 'Perkakas'),
      /the English label for tooling is empty/
    ],
    // '' is caught one gate earlier, by the required-field rule — still named.
    [
      'an empty Indonesian label',
      cmd('poAdjust', 'tooling', 'Tooling', ''),
      /MISSING_FIELDS:labelId/
    ],
    [
      'a blank Indonesian label',
      cmd('poAdjust', 'tooling', 'Tooling', '   '),
      /the Indonesian label for tooling is empty/
    ],
    [
      'a label another code shows',
      cmd('poAdjust', 'tooling', 'Capacity', 'Perkakas'),
      /already labelled "Capacity" \(capacity\)/
    ],
    [
      'a label another code shows in Indonesian',
      cmd('poAdjust', 'tooling', 'Tooling', 'Kapasitas'),
      /already labelled "Kapasitas" in Indonesian/
    ],
    [
      'active not a yes/no',
      cmd('poAdjust', 'tooling', 'Tooling', 'Perkakas', 'yes'),
      /active must be true or false/
    ]
  ])('BL32-RSN-POL · refuses %s', async (_l, c, why) => {
    const r = await svc.dispatch(seat('compliance'), c);
    expect(r.reason).toMatch(why);
    expect(reasonCodeStore.changes()).toHaveLength(0);
  });

  it('BL32-RSN-POL · the last offered code of a list cannot be retired; the others can', async () => {
    await record('poReject', 'date', 'Date', 'Tanggal', false);
    await record('poReject', 'quantity', 'Quantity', 'Kuantitas', false);
    const r = await svc.dispatch(
      seat('compliance'),
      cmd('poReject', 'quality', 'Quality', 'Kualitas', false)
    );
    expect(r.reason).toMatch(/quality is the last code offered in poReject/);
    expect(activeReasonCodes('poReject')).toEqual(['quality']);
  });

  it('BL32-RSN-POL · an unknown list or a malformed code is NOT_FOUND', async () => {
    expect(
      await outcomeOf(seat('compliance'), cmd('asnReasons', 'late', 'Late', 'Terlambat'))
    ).toBe('throw/NOT_FOUND');
    expect(await outcomeOf(seat('compliance'), cmd('poAdjust', 'Bad Code', 'Bad', 'Buruk'))).toBe(
      'throw/NOT_FOUND'
    );
  });
});

// ── 5 · Persistence ──────────────────────────────────────────────────────────

describe('BL32-RSN-STORE · kept across a reload, re-checked on read', () => {
  it('survives a reload; a hand-edited empty label is refused on read and named', async () => {
    await record('capacityShortfall', 'machine-breakdown', 'Machine breakdown', 'Mesin rusak');
    reasonCodeStore.rehydrate();
    expect(isActiveReasonCode('capacityShortfall', 'machine-breakdown')).toBe(true);
    const stored = JSON.parse(
      /** @type {NonNullable<ReturnType<typeof window.localStorage.getItem>>} */ (
        window.localStorage.getItem(REASON_CODES_KEY)
      )
    );
    stored.changes.push({
      list: 'poAdjust',
      code: 'blank',
      labelEn: '',
      labelId: 'x',
      active: true,
      setBy: NOBODY,
      setAt: '2026-09-21T00:00:00.000Z'
    });
    window.localStorage.setItem(REASON_CODES_KEY, JSON.stringify(stored));
    reasonCodeStore.rehydrate();
    expect(reasonCodeStore.readState().rejected).toEqual([
      { row: 'poAdjust:blank', reason: 'the English label for blank is empty' }
    ]);
    expect(reasonCodeStore.get('poAdjust', 'blank')).toBeUndefined();
    expect(isActiveReasonCode('capacityShortfall', 'machine-breakdown')).toBe(true);
  });

  it('an unparseable store is unreadable, and the starter lists stand', () => {
    window.localStorage.setItem(REASON_CODES_KEY, 'nope');
    reasonCodeStore.rehydrate();
    expect(reasonCodeStore.readState().unreadable).toBe(true);
    expect(activeReasonCodes('poAdjust')).toEqual([...STARTER_REASON_CODES.poAdjust]);
  });
});
