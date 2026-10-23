/** @import { PoLineResponse, PurchaseOrder } from '@services/data/types' */
/** @import { CounterOfferRefusal } from '@services/transitions/policies' */
/** @import { AdjustDraft, TabKey } from './const' */
import { userVerbsFrom } from '@services/transitions';
import { confirmedQtyWithinBounds, counterOfferRefusal } from '@services/transitions/policies';
import { readConfirmedQty, readConfirmedQuantities } from '../orders/poConfirmModel';
import { ACTION_STATUSES, COMPLETED_STATUSES, PROGRESS_STATUSES } from './const';

// Pure helpers of the supplier orders page, moved out of `SupplierOrders.jsx`
// by the Phase 5 page split (no behaviour change).

/**
 * Short IDR amount for KPI tiles, table cells and Key Facts (billions as `M`,
 * millions as `jT`, smaller amounts in full).
 * @param {number} v
 * @returns {string}
 */
export const fmtIDR = (v) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
};

/**
 * A date as `DD Mon YYYY`, or an em dash when there is none.
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
 * The POs a sub-tab shows: the action, progress or completed status group, or
 * every PO for `all`.
 * @param {TabKey} tab
 * @param {PurchaseOrder[]} pos
 * @returns {PurchaseOrder[]}
 */
export const filterByTab = (tab, pos) => {
  if (tab === 'action') return pos.filter((p) => ACTION_STATUSES.includes(p.status));
  if (tab === 'progress') return pos.filter((p) => PROGRESS_STATUSES.includes(p.status));
  if (tab === 'completed') return pos.filter((p) => COMPLETED_STATUSES.includes(p.status));
  return pos;
};

// ── ACKNOWLEDGE (`t_po_acknowledge`) ───────────────────────────────────────
//
// ⚠️ **LEGALITY IS ASKED OF THE MACHINE, NOT RESTATED HERE.** `userVerbsFrom`
// reads the registered flow, so this offers the verb exactly where the
// transition table says it is legal (`Sent | Viewed`) and nowhere else. The
// page's own `ACTION_STATUSES` is the WRONG list for this: it is
// `[Sent, Acknowledged]` — a TAB grouping, not a legality one — so keying on
// it would offer acknowledge on an already-Acknowledged PO (illegal, refused
// at dispatch) and withhold it from a `Viewed` one (legal). Deriving also
// means a future edit to the flow reaches this control without anybody
// remembering to edit a literal here.
//
// ⚠️ **AND `Viewed` IS FIXTURE-ONLY, WHICH THIS DELIBERATELY DOES NOT HIDE.**
// Derived: `t_po_view` is the sole producer of `Viewed` and it has no hook, no
// caller and no dispatch site anywhere in the tree, so nothing a person can do
// moves a PO into that state. The two `Viewed` fixture rows (sup-006, sup-011)
// are therefore stranded. Rendering the control on them is still correct —
// acknowledge IS legal from `Viewed`, and the surface reports the machine
// rather than the fixture population. What would be dishonest is the opposite:
// suppressing a legal verb because today's data cannot reach its from-state.
/**
 * Whether the transition table offers `t_po_acknowledge` from this PO's
 * status (the detail footer's acknowledge slot renders only then).
 * @param {PurchaseOrder} po
 * @returns {boolean}
 */
export const acknowledgeIsLegalOn = (po) =>
  userVerbsFrom('purchaseOrder', po.status).some((v) => v.id === 't_po_acknowledge');

/**
 * The reads derived from the order panel's drafts, in one place so the page,
 * its sections and the commands read the same values: the per-line confirm
 * reads and bounds, the composite read the confirm dispatches, the adjust
 * lines with the policy's refusal, and the quantity / date change flags.
 * Pure: the page calls it above its early returns, before `usePoCommands`.
 * @param {PurchaseOrder | null} selected  The PO open in the panel.
 * @param {string[]} confirmedQtyRaws  The raw text of each confirm cell.
 * @param {Record<string, AdjustDraft>} adjustDrafts  Each line's adjust draft, by line id.
 * @param {string} deliveryDate  The confirmed delivery date being edited.
 */
export function readPanelDrafts(selected, confirmedQtyRaws, adjustDrafts, deliveryDate) {
  // ── CP-0 · W1 · 2f-c — THE ONE READ of the confirm quantities ──────────────
  // Per-line reads so each cell reports ITSELF; one composite for the dispatch.
  // All go through the same `normalizeQty` on the same strings, so a cell's
  // message, the button state and the dispatched payload cannot disagree.
  const lineReads = confirmedQtyRaws.map(readConfirmedQty);
  const qtysRead = readConfirmedQuantities(confirmedQtyRaws);
  // COURTESY MIRROR of the policy bound, per line — same predicate the policy
  // hook runs (`confirmedQtyWithinBounds`, ONE shared expression, so this
  // display structurally cannot drift from the law). The mirror is UX only:
  // it disables Confirm and explains the bound in the operator's language.
  // The POLICY refusal remains the guarantee — a dispatch that bypasses this
  // surface is still refused by the dispatcher, in its own voice.
  const lineBounds = lineReads.map(
    (r, i) =>
      r.ok && selected
        ? confirmedQtyWithinBounds(r.value, selected.lineItems[i]?.quantity ?? 0)
        : true // an unread cell shows its PARSE refusal; bounds wait for a number
  );
  const allBoundsOk = lineBounds.every(Boolean);
  const allQtysOk = qtysRead.ok && allBoundsOk;

  // ── ADJUST / REJECT (REQ-E07-02) ─────────────────────────────────────────
  // The courtesy mirror reads the SAME `counterOfferRefusal` the policy runs;
  // the policy stays the law for anything that does not come through here.
  /** @type {{ lineId: string; read: Partial<PoLineResponse>; refusal: CounterOfferRefusal | null }[]} */
  const adjustLines = selected
    ? selected.lineItems
        .filter((li) => adjustDrafts[li.id]?.on)
        .map((li) => {
          const d = adjustDrafts[li.id];
          const qty = readConfirmedQty(d.qty);
          /** @type {Partial<PoLineResponse>} */
          const read = {
            lineId: li.id,
            reasonCode: d.reasonCode || undefined,
            note: d.note.trim() || undefined,
            counterQty: qty.ok ? qty.value : undefined,
            counterDate: d.date
          };
          return { lineId: li.id, read, refusal: counterOfferRefusal(read, selected) };
        })
    : [];
  const adjustReady = adjustLines.length > 0 && adjustLines.every((l) => l.refusal === null);

  // Derived from the PARSED reads only — never summed over a guess. NULL under
  // a refusal: the diff warning is suppressed (the refusals speak instead), and
  // the confirmed-summary total — only reachable after a successful dispatch,
  // which requires every line to have read — renders an em dash rather than a
  // number nobody typed.
  const totalConfirmedQty = qtysRead.ok ? qtysRead.quantities.reduce((a, b) => a + b, 0) : null;
  const orderedTotalQty = selected ? selected.lineItems.reduce((a, li) => a + li.quantity, 0) : 0;
  const hasQtyChange = totalConfirmedQty !== null && totalConfirmedQty !== orderedTotalQty;
  const hasDateChange = selected !== null && deliveryDate !== selected.requestedDeliveryDate;

  return {
    lineReads,
    qtysRead,
    lineBounds,
    allBoundsOk,
    allQtysOk,
    adjustLines,
    adjustReady,
    totalConfirmedQty,
    hasQtyChange,
    hasDateChange
  };
}
