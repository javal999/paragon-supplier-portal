// SupplierShipments — pure helpers (no React). Moved out of the page file
// unchanged; the closures that read page data now take it as parameters.

/** @import { AsnForCallOffCheck, CallOffView } from '@services/transitions/callOffRules' */
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
/** @import { ASN, CallOffWarning, PurchaseOrder } from '@services/data/types' */
/** @import { AsnLinesRead, OpenLine } from '../shipments/asnLines' */
/** @import { AsnForm } from './const' */
import { asnCallOffWarnings } from '@services/transitions/callOffRules';
import { defaultCarrier } from '../shipments/CarrierPicker';
import { openLinesFor, readLines } from '../shipments/asnLines';
import { EMPTY_FORM } from './const';

/**
 * A stored date as "07 Apr 2026", or an em dash when there is none.
 * @param {string} s
 * @returns {string}
 */
export const fmtDate = (s) => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * MR-6 BR-10 / BR-11 — the ASN as the call-off check reads it, from what the
 * form holds. Both submit paths build it this way, so the supplier sees the
 * warnings the verb will record.
 * @param {Pick<AsnForCallOffCheck, 'asnNumber' | 'poReference' | 'callOffId' | 'callOffFinal'>} base
 * @param {AsnLinesRead} read
 * @param {string} eta
 * @param {string} shipDate
 * @returns {AsnForCallOffCheck}
 */
export const asnForCheck = (base, read, eta, shipDate) => ({
  ...base,
  eta,
  ...(shipDate ? { shipDate } : {}),
  lineItems: read.lines
    .filter((l) => Number.isFinite(l.input.shippedQty))
    .map((l) => ({ materialCode: l.input.materialCode, shippedQty: l.input.shippedQty }))
});

/**
 * A fresh ASN form, its carrier defaulted from the 3PL list in force.
 * @returns {AsnForm}
 */
export const newAsnForm = () => ({ ...EMPTY_FORM, ...defaultCarrier() });

/**
 * The lines a draft is submitted with: its PO's lines (open quantity leaving
 * this draft out), plus any stored line whose material the PO does not carry.
 * @param {ASN} asn
 * @param {readonly PurchaseOrder[]} shippablePos  The POs an ASN may ship against.
 * @param {readonly ASN[]} asns  Every ASN the supplier holds.
 * @returns {OpenLine[]}
 */
export function submitLinesFor(asn, shippablePos, asns) {
  const po = shippablePos.find((p) => p.poNumber === asn.poReference);
  const fromPo = po ? openLinesFor(po, asns, asn.asnNumber) : [];
  const extra = asn.lineItems
    .filter((li) => !fromPo.some((l) => l.materialCode === li.materialCode))
    .map((li) => ({
      materialCode: li.materialCode,
      description: li.description,
      uom: li.uom ?? '',
      open: li.shippedQty
    }));
  return [...fromPo, ...extra];
}

/**
 * @typedef {object} WizardRead
 * @property {PurchaseOrder | undefined} selectedPO  The PO picked at step 1.
 * @property {OpenLine[]} wizardOpenLines  That PO's open lines.
 * @property {AsnLinesRead} wizardRead  Every line through the one line rule (AR-11).
 * @property {CallOffWarning[]} wizardWarnings  What the confirm step warns about.
 * @property {(s: number) => boolean} isStepValid  Whether step `s` may advance.
 */

/**
 * The Create-ASN wizard's derived reads: the chosen PO, its lines through the
 * one line rule the verbs call, the call-off warnings and each step's validity.
 * @param {object} args
 * @param {AsnForm} args.form  The wizard's form state.
 * @param {readonly PurchaseOrder[]} args.shippablePos  The POs an ASN may ship against.
 * @param {readonly ASN[]} args.asns  Every ASN the supplier holds.
 * @param {Readonly<Record<string, readonly AvailableBatch[]>>} args.declaredBatches  Batch picker options by material.
 * @param {readonly Pick<CallOffView, 'callOff' | 'delivery'>[]} args.callOffViewList  The call-off projection.
 * @returns {WizardRead}
 */
export function readWizard({ form, shippablePos, asns, declaredBatches, callOffViewList }) {
  const selectedPO = shippablePos.find((p) => p.id === form.poId);
  const wizardOpenLines = selectedPO ? openLinesFor(selectedPO, asns) : [];
  // AR-11 — every line through the one line rule the verbs call.
  const wizardRead = readLines(form.lines, wizardOpenLines, {
    po: selectedPO,
    asns,
    eta: form.eta,
    overShipReason: form.overShipReason,
    batches: declaredBatches
  });
  // MR-6 BR-10 / BR-11 — what the confirm step warns about; never a block.
  const wizardWarnings = selectedPO
    ? asnCallOffWarnings(
        asnForCheck(
          {
            asnNumber: '',
            poReference: selectedPO.poNumber,
            ...(form.callOffId
              ? { callOffId: form.callOffId, callOffFinal: form.callOffFinal }
              : {})
          },
          wizardRead,
          form.eta,
          form.shipDate
        ),
        callOffViewList,
        asns
      )
    : [];
  const step1Valid = form.poId !== '';
  // BR-04 required fields; `complete` carries each line's refusal, including
  // BR-02's reason when a line ships above open.
  const step2Valid =
    form.carrier !== '' &&
    form.trackingNumber !== '' &&
    form.shipDate !== '' &&
    form.eta !== '' &&
    form.eta >= form.shipDate &&
    // MR-6 BR-08 — a line short on shelf life does not stop the wizard: step 3
    // asks Quality for an exception instead of submitting.
    (wizardRead.complete || wizardRead.onlyShelfLife);
  const step3Valid =
    form.confirmed && (!wizardRead.onlyShelfLife || form.exceptionReason.trim() !== '');
  /**
   * @param {number} s
   * @returns {boolean}
   */
  const isStepValid = (s) => (s === 0 ? step1Valid : s === 1 ? step2Valid : step3Valid);
  return { selectedPO, wizardOpenLines, wizardRead, wizardWarnings, isStepValid };
}
