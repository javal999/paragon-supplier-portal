/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { StatusFilter } from '../utils' */
import { useMemo } from 'react';
import { deliveryDrift, umbrellaRemaining } from '@services/transitions/callOffRules';
import { callOffsForPo } from '../../orders/orderSummaryModel';
import { needsAction } from '../utils';

/**
 * @typedef {object} CallOffSectionsInput
 * @property {readonly CallOffView[]} views Every call-off the planner sees.
 * @property {{ items?: readonly PurchaseOrder[] } | undefined} posData The confirmed and partly delivered POs' page (the umbrella lines' source).
 * @property {string | null} drilledPo REQ-E07-03 — the PO a drill-through names, or `null`.
 * @property {boolean} onToAct Whether the To act tab is open.
 * @property {StatusFilter} statusFilter The To act status chip.
 */

/**
 * The umbrella lines the page lists. `drilledViews` is the call-offs a PO
 * drill-through counts (`null` without one); `allSections` is every umbrella
 * line with every call-off on it, which the panels and the prefill look lines
 * up in; `sections` is what the current tab lists (P-12). Pure derivation, no
 * state; the memo dependencies are the page's own. Moved out of
 * `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @param {CallOffSectionsInput} input
 */
export function useCallOffSections({ views, posData, drilledPo, onToAct, statusFilter }) {
  const driftKeys = useMemo(
    () => new Set(deliveryDrift(views).map((d) => `${d.supplierId}|${d.materialCode}`)),
    [views]
  );
  /** @param {CallOffView} v */
  const matchesStatusFilter = (v) =>
    statusFilter === 'awaitingApproval'
      ? v.confirmation === 'Awaiting Approval'
      : statusFilter === 'escalated'
        ? v.confirmation === 'Escalated'
        : v.delivery === 'atRisk';
  /**
   * ⚠️ **WHEN A PO FILTER IS IN PLAY THE PAGE LISTS WHAT THE SUMMARY COUNTED,
   * WHICH IS NARROWER THAN ITS OWN NORMAL POPULATION.** Unfiltered, a planner
   * sees its own drafts and dismissed drafts here — those are planning artefacts
   * it owns. BR-09 excludes them from the summary's count, so a drill-through
   * that still listed them would break AC-10 on the buyer side only. Same
   * predicate, one module.
   */
  const drilledViews = useMemo(
    () => (drilledPo === null ? null : callOffsForPo(views, drilledPo)),
    [views, drilledPo]
  );

  // Every umbrella line with every call-off on it (within a PO drill-through,
  // that PO's). The panels and the prefill look lines up here, so a line the
  // current tab or filter hides is still found.
  const allSections = useMemo(() => {
    /** @type {readonly PurchaseOrder[]} */
    const pos = posData?.items ?? [];
    const all = views.map((v) => v.callOff);
    return pos
      .flatMap((po) =>
        po.lineItems.map((line) => {
          const rows = (drilledViews ?? views)
            .filter((v) => v.callOff.poLineId === line.id)
            .sort((a, b) => a.callOff.needDate.localeCompare(b.callOff.needDate));
          return { po, line, remaining: umbrellaRemaining(line, all), rows };
        })
      )
      .filter((s) => drilledPo === null || s.po.id === drilledPo);
  }, [posData, views, drilledViews, drilledPo]);

  // P-12 — what the current tab lists. All call-offs: every line. To act: the
  // lines with a row to act on (only those rows) and the drifting lines (all
  // their rows), narrowed by the status chip.
  const sections = useMemo(
    () =>
      allSections
        .flatMap((s) => {
          if (!onToAct) return [s];
          const drifting = driftKeys.has(`${s.po.supplierId}|${s.line.materialCode}`);
          if (statusFilter === 'drift') return drifting ? [s] : [];
          const rows =
            statusFilter === 'all'
              ? drifting
                ? s.rows
                : s.rows.filter(needsAction)
              : s.rows.filter(matchesStatusFilter);
          return rows.length > 0 ? [{ ...s, rows }] : [];
        })
        .sort(
          (a, b) => b.rows.length - a.rows.length || a.po.poNumber.localeCompare(b.po.poNumber)
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allSections, onToAct, statusFilter, driftKeys]
  );

  return { drilledViews, allSections, sections };
}
