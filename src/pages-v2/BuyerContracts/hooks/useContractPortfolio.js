/** @import { Contract, ContractType } from '@data/mockContracts' */
/** @import { ContractObligation } from '@data/mockObligations' */
/** @import { Supplier } from '@services/data/types' */
/** @import { ContractDisplayStatus } from '@services/data/contractExpiry' */
/** @import { GroupTab } from '../const' */
import { useCallback, useMemo } from 'react';
import { obligationDisplay } from '@services/data/obligationProjection';
import { contractDisplayStatus, inRenewalHorizon } from '@services/data/contractExpiry';
import { formatMonth, matchesGroup } from '../utils';

/**
 * @typedef {object} ContractPortfolioInput
 * @property {Contract[]} contracts The ONE contract source (the resolved read).
 * @property {ContractObligation[]} obligations
 * @property {Map<string, Supplier>} supplierById Supplier lookup, for the search filter.
 * @property {string} nowIso The workspace's one clock read.
 * @property {GroupTab} group The selected status tab.
 * @property {ContractType[]} selectedTypes The type chips currently on.
 * @property {string} search The list search text.
 */

/**
 * Everything the contract list derives from the read: the newest signed date,
 * the per-row display status, the tab badges, the KPI figures, the overdue
 * obligation count, the filtered rows and the renewal pipeline. No state of
 * its own. Moved out of `BuyerContracts.jsx`'s workspace by the Phase 5 page
 * split (no behaviour change; every memo keeps its dependency list).
 * @param {ContractPortfolioInput} input
 */
export function useContractPortfolio({
  contracts,
  obligations,
  supplierById,
  nowIso,
  group,
  selectedTypes,
  search
}) {
  const lastUpdated = useMemo(() => {
    return contracts.reduce(
      (acc, c) => (c.signedDate && c.signedDate > acc ? c.signedDate : acc),
      contracts[0]?.signedDate ?? ''
    );
  }, [contracts]);

  // ⚠️ **ONE EVALUATION PER ROW, AND EVERYTHING BELOW READS IT.** The badge,
  // the tab list, the tile, the pill and the expiry tone were five separate
  // reads of three different rules; they are now five reads of this map. A
  // contract cannot appear under a tab whose badge disagrees, because the badge
  // and the tab are `.filter`s over the same values.
  const displayById = useMemo(
    () =>
      /** @type {Map<string, ContractDisplayStatus>} */ (
        new Map(contracts.map((c) => [c.id, contractDisplayStatus(c, nowIso)]))
      ),
    [contracts, nowIso]
  );
  // Stable while `displayById` is, so the memos below can list it.
  const displayOf = useCallback(
    /**
     * @param {Contract} c
     * @returns {ContractDisplayStatus}
     */
    (c) => displayById.get(c.id) ?? c.status,
    [displayById]
  );

  const counts = useMemo(() => {
    /** @param {ContractDisplayStatus} s */
    const by = (s) => contracts.filter((c) => displayOf(c) === s).length;
    return {
      all: contracts.length,
      active: by('Active'),
      // ⚠️ THIS LINE IS THE DEFECT THIS BATCH EXISTS FOR. It read
      // `c.status === 'Expiring'` — the one predicate on this page with no
      // clock in it — so the badge counted authored literals while the tab
      // beside it ran a 90-day band. Badge 2, list 4, tile 4, since 2026-05-20.
      expiring: by('Expiring'),
      expired: by('Expired'),
      renewed: by('Renewed'),
      draft: by('Draft'),
      terminated: by('Terminated')
    };
  }, [contracts, displayOf]);

  const kpis = useMemo(() => {
    const active = counts.active;
    // The tile and the tab badge are now literally the same number rather than
    // two predicates that happened to be written twice — the inline copy of
    // `matchesGroup`'s band that used to live here is gone.
    const expiringSoon = counts.expiring;
    const totalValue = contracts
      .filter((c) => displayOf(c) === 'Active')
      .reduce((sum, c) => sum + c.value, 0);
    return { active, expiringSoon, totalValue };
  }, [contracts, displayOf, counts.active, counts.expiring]);

  // ⚠️ COMPUTED, not counted off the stored literal. Measured on 2026-09-08,
  // the day this changed: the tile read 5 (the authored `Overdue` count, exactly
  // right at `DECLARED_PRESENT`) while the correct answer against the wall clock
  // was 11 — six obligations past due that the buyer was not being shown. The
  // tile could never have moved, because a stored literal does not.
  const overdueObligations = useMemo(
    () => obligations.filter((o) => obligationDisplay(o, nowIso) === 'Overdue').length,
    [obligations, nowIso]
  );

  const filtered = useMemo(() => {
    return contracts
      .filter((c) => matchesGroup(displayOf(c), group))
      .filter((c) => (selectedTypes.length === 0 ? true : selectedTypes.includes(c.type)))
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          c.contractNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (supplierById.get(c.supplierId)?.name ?? '').toLowerCase().includes(q)
        );
      });
    // `supplierById` is listed so a search typed before the supplier read lands
    // re-filters once names arrive (react-hooks/exhaustive-deps, 2026-10-28).
  }, [contracts, group, selectedTypes, search, displayOf, supplierById]);

  const renewalPipeline = useMemo(() => {
    // The 180 arm SURVIVES and is now `CONTRACT_RENEWAL_HORIZON_DAYS`, named in
    // `contractExpiry.js` beside the reason: this is a PLANNING horizon grouped
    // by month, and routing it through the classifier would collapse a
    // two-quarter view into a duplicate of the Expiring tab. It is the one
    // window left on this axis, and it is no longer a literal on a page.
    const upcoming = contracts.filter((c) => inRenewalHorizon(c, nowIso));
    const groups = /** @type {Map<string, Contract[]>} */ (new Map());
    for (const c of upcoming) {
      const key = formatMonth(c.endDate);
      const existing = groups.get(key) ?? [];
      existing.push(c);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const ad = new Date(a[1][0].endDate).getTime();
      const bd = new Date(b[1][0].endDate).getTime();
      return ad - bd;
    });
  }, [contracts, nowIso]);

  return {
    lastUpdated,
    displayOf,
    counts,
    kpis,
    overdueObligations,
    filtered,
    renewalPipeline
  };
}
