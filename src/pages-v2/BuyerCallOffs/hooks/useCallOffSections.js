/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { useMemo, useState } from 'react';
import { useUrlEnumParam } from '@hooks/useUrlEnumParam';
import { deliveryDrift, umbrellaRemaining } from '@services/transitions/callOffRules';
import { callOffsForPo } from '../../orders/orderSummaryModel';

/** @typedef {'all' | 'awaitingApproval' | 'escalated' | 'atRisk' | 'drift'} StatusFilter */

/**
 * The status chip filter (with the `?status=` deep link, #74) and the umbrella
 * sections it narrows: one per PO line, its remaining figures and its
 * call-offs, limited to the drilled PO (REQ-E07-03) when there is one. Called
 * by the page component, so the filter state is owned by the page.
 * @param {object} args
 * @param {readonly CallOffView[]} args.views  Every call-off view the page reads.
 * @param {{ items: readonly PurchaseOrder[] } | undefined} args.posData  The umbrella POs query's data.
 * @param {string | null} args.drilledPo  The PO the page is drilled to, or `null`.
 */
export const useCallOffSections = ({ views, posData, drilledPo }) => {
  const [statusFilter, setStatusFilter] = useState(/** @type {StatusFilter} */ ('all'));
  // Deep-link read: `?status=` narrows the My Tasks call-off tasks to the
  // umbrella rows that match.
  useUrlEnumParam(
    'status',
    /** @type {StatusFilter[]} */ (['all', 'awaitingApproval', 'escalated', 'atRisk', 'drift']),
    setStatusFilter
  );
  const driftKeys = useMemo(
    () => new Set(deliveryDrift(views).map((d) => `${d.supplierId}|${d.materialCode}`)),
    [views]
  );
  const rowFilterActive =
    statusFilter === 'awaitingApproval' ||
    statusFilter === 'escalated' ||
    statusFilter === 'atRisk';
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

  const sections = useMemo(() => {
    /** @type {readonly PurchaseOrder[]} */
    const pos = posData?.items ?? [];
    const all = views.map((v) => v.callOff);
    return pos
      .flatMap((po) =>
        po.lineItems.map((line) => {
          const baseRows = (drilledViews ?? views).filter((v) => v.callOff.poLineId === line.id);
          const rows = (rowFilterActive ? baseRows.filter(matchesStatusFilter) : baseRows).sort(
            (a, b) => a.callOff.needDate.localeCompare(b.callOff.needDate)
          );
          return { po, line, remaining: umbrellaRemaining(line, all), rows };
        })
      )
      .filter((s) => drilledPo === null || s.po.id === drilledPo)
      .filter((s) => !rowFilterActive || s.rows.length > 0)
      .filter(
        (s) =>
          statusFilter !== 'drift' || driftKeys.has(`${s.po.supplierId}|${s.line.materialCode}`)
      )
      .sort((a, b) => b.rows.length - a.rows.length || a.po.poNumber.localeCompare(b.po.poNumber));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posData, views, drilledViews, drilledPo, statusFilter, driftKeys]);

  return { statusFilter, setStatusFilter, drilledViews, sections };
};
