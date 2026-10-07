/** @import { RFQ, RFQCategory } from '@data/mockRfqs' */
/** @import { GroupTab } from '../const' */
import { useMemo, useState } from 'react';
import { daysUntil } from '@services/data/dayProjection';
import { TODAY } from '../const';
import { isAllResponded, matchesGroup } from '../utils';

/**
 * The RFQ board's state and everything derived from the RFQ list: the tab,
 * category and search filters, the tab counts, the four KPIs, the filtered
 * active rows and the awarded rows. Moved out of `SourcingWorkspace` by the
 * Phase 5 page split (no behaviour change).
 *
 * The board reads the seam list ALONE (`rfqs`): a created RFQ arrives through
 * getRFQs after the create dispatch invalidates.
 * @param {readonly RFQ[]} rfqs
 */
export const useRfqBoard = (rfqs) => {
  const [group, setGroup] = useState(/** @type {GroupTab} */ ('all'));
  const [selectedCats, setSelectedCats] = useState(/** @type {RFQCategory[]} */ ([]));
  const [search, setSearch] = useState('');
  // ONE clock read for the board, captured once and injected into every
  // day-count below — the replacement for the deleted `REFERENCE_TODAY` pin.
  const nowIso = TODAY;

  const lastUpdated = useMemo(
    () =>
      rfqs.reduce((acc, r) => (r.createdAt > acc ? r.createdAt : acc), rfqs[0]?.createdAt ?? ''),
    [rfqs]
  );

  const counts = useMemo(() => {
    const open = rfqs.filter((r) => r.status === 'Open' && !isAllResponded(r)).length;
    const pending = rfqs.filter((r) => r.status === 'Open' && isAllResponded(r)).length;
    const awarded = rfqs.filter((r) => r.status === 'Awarded').length;
    const closed = rfqs.filter((r) => r.status === 'Closed' || r.status === 'Cancelled').length;
    return {
      all: rfqs.length,
      open,
      pending,
      awarded,
      closed
    };
  }, [rfqs]);

  const kpis = useMemo(() => {
    const active = rfqs.filter((r) => r.status === 'Open').length;
    const awaiting = rfqs.filter((r) => {
      if (r.status !== 'Open') return false;
      const d = daysUntil(r.responseDeadline, nowIso);
      // An unreadable deadline is not evidence a response is due this week.
      if (d === null) return false;
      return d <= 7 && d >= 0;
    }).length;
    const readyToAward = rfqs.filter((r) => r.status === 'Open' && isAllResponded(r)).length;
    const awardedQuarter = rfqs.filter((r) => {
      if (r.status !== 'Awarded') return false;
      const d = daysUntil(r.createdAt, nowIso);
      if (d === null) return false;
      return -d <= 90;
    }).length;
    return { active, awaiting, readyToAward, awardedQuarter };
  }, [rfqs, nowIso]);

  const activeFiltered = useMemo(() => {
    return rfqs
      .filter((r) => r.status !== 'Awarded')
      .filter((r) => matchesGroup(r, group))
      .filter((r) => (selectedCats.length === 0 ? true : selectedCats.includes(r.materialCategory)))
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.materialIds.join(' ').toLowerCase().includes(q)
        );
      });
  }, [rfqs, group, selectedCats, search]);

  const awarded = useMemo(() => rfqs.filter((r) => r.status === 'Awarded'), [rfqs]);

  /** @param {RFQCategory} cat */
  const toggleCategory = (cat) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  return {
    group,
    setGroup,
    selectedCats,
    toggleCategory,
    search,
    setSearch,
    nowIso,
    lastUpdated,
    counts,
    kpis,
    activeFiltered,
    awarded
  };
};
