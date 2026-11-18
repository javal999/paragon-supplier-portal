// ────────────────────────────────────────────────────────────────────────────
// Inbound rules — AIB-2 (BL-350).
//
// An "inbound" in the hub is an ASN that has been sent to SAP: the supplier's
// declared delivery, whose goods receipt and quality status SAP owns. These are
// the DERIVED facts the Expeditor's list and To-Do need, computed at read time
// from the ASN, its acknowledgment and its goods receipt — nothing here is
// stored (law 0.5).
//
// ⚠️ **THE ACKNOWLEDGMENT DEADLINE IS ONE WORKING DAY ON THE HUB'S CALENDAR**
// (AIB-2 BR-05, `[Proposed]`). It is computed through `hubWorkingCalendar()`
// like every other deadline in the hub (Q-18): a ruling that makes a day
// non-working moves this deadline with the rest. The arrival is the ASN's ETA
// at the start of that calendar day — the hub holds no arrival time.
//
// ⚠️ **THE GR IS READ, NEVER WRITTEN.** `receiptOf` only picks the goods
// receipt SAP posted; the hub records no inspection and no receipt here.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ASN } from '../data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
/** @import { WorkingCalendar } from '@lib/workingCalendar' */
import { addWorkingDays, documentInstant, isCalendarDate } from '@lib/workingCalendar';
import { hubWorkingCalendar } from './workingCalendarStore';

/**
 * ASN states that ARE an inbound: the supplier has sent it, so the Expeditor
 * has something to review. A Draft is not an inbound yet; a Cancelled one never
 * becomes one.
 * @type {readonly ASN['status'][]}
 */
export const INBOUND_ASN_STATES = ['Submitted', 'In Transit', 'Delivered', 'Discrepancy'];

/**
 * What the Expeditor's list and the To-Do show for one goods receipt — the
 * result SAP holds, never a hub record.
 * `status`:  SAP's receipt status (`GRStatus`).
 * `rejectedQty`:  The quantity rejected at inspection, summed over the lines.
 * `disposition`:  SAP's disposition for the receipt.
 *
 * @typedef {{
 *   readonly grNumber: string;
 *   readonly receivedDate: string;
 *   readonly status: string;
 *   readonly rejectedQty: number;
 *   readonly disposition: string;
 * }} InboundReceiptView
 */

/**
 * One inbound, as the list renders it.
 * `dueAt`:  The acknowledgment deadline, or null when the ASN has no readable ETA.
 * `overdue`:  Past the deadline and not acknowledged — what the To-Do counts.
 *
 * @typedef {{
 *   readonly asn: ASN;
 *   readonly dueAt: Date | null;
 *   readonly overdue: boolean;
 *   readonly acknowledged: boolean;
 *   readonly receipt: InboundReceiptView | null;
 * }} InboundRow
 */

/**
 * One calendar date as a WORKING-DAY deadline: the ETA's own start, moved to
 * the next working hour, plus one working day (AIB-2 BR-05). `null` when the
 * ETA is not a readable date — an ASN with no ETA has no deadline to miss.
 * @param {string | undefined} eta
 * @param {WorkingCalendar} [cal]
 * @returns {Date | null}
 */
export function inboundDueAt(eta, cal = hubWorkingCalendar()) {
  if (!isCalendarDate(eta)) return null;
  return addWorkingDays(documentInstant(eta, cal), 1, cal);
}

/**
 * The goods receipt that answers an inbound, read from SAP's records: the one
 * whose `asnNumber` is this ASN. Absent until SAP posts it.
 * @param {readonly Pick<GoodsReceipt, 'asnNumber' | 'grNumber' | 'receivedDate' | 'status' | 'disposition' | 'inspectionResults'>[]} receipts
 * @param {string} asnNumber
 * @returns {InboundReceiptView | null}
 */
export function receiptOf(receipts, asnNumber) {
  const gr = receipts.find((r) => r.asnNumber === asnNumber);
  if (!gr) return null;
  return {
    grNumber: gr.grNumber,
    receivedDate: gr.receivedDate,
    status: gr.status,
    rejectedQty: gr.inspectionResults.reduce(
      (sum, l) => sum + (Number.isFinite(l.qtyRejected) ? l.qtyRejected : 0),
      0
    ),
    disposition: gr.disposition
  };
}

/**
 * The inbounds and their state at `nowIso`.
 * @param {readonly ASN[]} asns
 * @param {readonly Pick<GoodsReceipt, 'asnNumber' | 'grNumber' | 'receivedDate' | 'status' | 'disposition' | 'inspectionResults'>[]} receipts
 * @param {string} nowIso
 * @returns {InboundRow[]}
 */
export function inboundRows(asns, receipts, nowIso) {
  const now = Date.parse(nowIso);
  return asns
    .filter((a) => INBOUND_ASN_STATES.includes(a.status))
    .map((asn) => {
      const dueAt = inboundDueAt(asn.eta);
      const acknowledged = Boolean(asn.inboundAcknowledgment);
      return {
        asn,
        dueAt,
        overdue: !acknowledged && dueAt !== null && Number.isFinite(now) && now > dueAt.getTime(),
        acknowledged,
        receipt: receiptOf(receipts, asn.asnNumber)
      };
    });
}

/**
 * The Expeditor's To-Do: inbounds past their deadline with no acknowledgment
 * (AIB-2 BR-05, AC-05).
 * @param {readonly InboundRow[]} rows
 * @returns {InboundRow[]}
 */
export const outstandingInbounds = (rows) => rows.filter((r) => r.overdue);
