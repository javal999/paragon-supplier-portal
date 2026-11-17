// SupplierShipments — pure helpers (no React). Moved out of the page file
// unchanged; the closures that read page data now take it as parameters.

/** @import { AsnForCallOffCheck, CallOffView } from '@services/transitions/callOffRules' */
/** @import { AvailableBatch } from '@services/transitions/fulfilmentRules' */
/** @import { ASN, CallOffWarning, PurchaseOrder } from '@services/data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
/** @import { AsnLinesRead, OpenLine } from '../shipments/asnLines' */
/** @import { AsnForm } from './const' */
import { formatDate } from '@lib/format';
import { asnCallOffWarnings } from '@services/transitions/callOffRules';
import { defaultCarrier } from '../shipments/CarrierPicker';
import { openLinesFor, readLines, seedLines } from '../shipments/asnLines';
import { EMPTY_FORM } from './const';

/**
 * A stored date as "31 Aug 2026" in English and "31 Agu 2026" in Indonesian,
 * or an em dash when there is none.
 * @param {string} s
 * @returns {string}
 */
export const fmtDate = (s) => formatDate(s);

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
 * BL-303 (UL-05) — the logistics fields step 2 still needs, in the order the
 * form shows them; empty when the step may advance on its logistics. The same
 * list drives the step rule and the hint under the form, so the screen never
 * blocks **Next** without naming why.
 * @param {Pick<AsnForm, 'carrier' | 'trackingNumber' | 'shipDate' | 'eta'>} form
 * @returns {readonly ('carrier' | 'tracking' | 'shipDate' | 'eta' | 'etaBeforeShip')[]}
 */
export const missingLogistics = (form) => {
  /** @type {('carrier' | 'tracking' | 'shipDate' | 'eta' | 'etaBeforeShip')[]} */
  const out = [];
  if (form.carrier === '') out.push('carrier');
  if (form.trackingNumber === '') out.push('tracking');
  if (form.shipDate === '') out.push('shipDate');
  if (form.eta === '') out.push('eta');
  if (form.shipDate !== '' && form.eta !== '' && form.eta < form.shipDate)
    out.push('etaBeforeShip');
  return out;
};

/**
 * A fresh ASN form, its carrier defaulted from the 3PL list in force.
 * @returns {AsnForm}
 */
export const newAsnForm = () => ({ ...EMPTY_FORM, ...defaultCarrier() });

/**
 * The form patch for picking a PO at step 1: its open lines seeded, and no
 * call-off chosen yet. The PO card and an address naming the PO both use it.
 * `receipts`:  GR-1 / BL-71 — kept-open receipts reopen their missing quantity.
 * @param {PurchaseOrder} po
 * @param {readonly ASN[]} asns  Every ASN the supplier holds.
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [receipts]
 * @returns {Partial<AsnForm>}
 */
export const poSelection = (po, asns, receipts = []) => ({
  poId: po.id,
  lines: seedLines(openLinesFor(po, asns, undefined, receipts)),
  overShipReason: '',
  callOffId: '',
  callOffFinal: false
});

/**
 * The lines a draft is submitted with: its PO's lines (open quantity leaving
 * this draft out), plus any stored line whose material the PO does not carry.
 * @param {ASN} asn
 * @param {readonly PurchaseOrder[]} shippablePos  The POs an ASN may ship against.
 * @param {readonly ASN[]} asns  Every ASN the supplier holds.
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [receipts]
 * @returns {OpenLine[]}
 */
export function submitLinesFor(asn, shippablePos, asns, receipts = []) {
  const po = shippablePos.find((p) => p.poNumber === asn.poReference);
  const fromPo = po ? openLinesFor(po, asns, asn.asnNumber, receipts) : [];
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
 * @param {readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]} [args.receipts]  GR-1 / BL-71 — kept-open receipts.
 * @returns {WizardRead}
 */
export function readWizard({
  form,
  shippablePos,
  asns,
  declaredBatches,
  callOffViewList,
  receipts = []
}) {
  const selectedPO = shippablePos.find((p) => p.id === form.poId);
  const wizardOpenLines = selectedPO ? openLinesFor(selectedPO, asns, undefined, receipts) : [];
  // AR-11 — every line through the one line rule the verbs call.
  const wizardRead = readLines(form.lines, wizardOpenLines, {
    po: selectedPO,
    asns,
    eta: form.eta,
    overShipReason: form.overShipReason,
    batches: declaredBatches,
    receipts
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
    missingLogistics(form).length === 0 &&
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
