/** @import { SupplierCoverageEntry } from '@services/sdc' */
/** @import { CoverageRow } from '../const' */
import { useMemo } from 'react';
import {
  useConsolidationRows,
  useCoverageEntries,
  useChaseEntries,
  useSupplierRollups
} from '@services/query/sdcBuyerHooks';
import { ACCEPT_VERB, REVIEW_VERB } from '../const';
import { offers, offersResolve, responseOf } from '../utils';

/**
 * The page's four live reads and the row populations derived from them: every
 * row with its coverage joined in, and the three per-verb lists (disputed,
 * awaiting review, under review), each derived from what the machine offers
 * from the row's own state.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change): the same query hooks and `useMemo`s, in the same order.
 */
export function useConsolidationData() {
  // SDC-4d — the live buyer-scoped consolidation reads (over svc.collaboration.*,
  // fed by the shared sdcClock). Buyer-gated: a supplier persona resolves [].
  const { data: rows = [] } = useConsolidationRows();
  const { data: coverage = [] } = useCoverageEntries();
  const { data: chase = [] } = useChaseEntries();
  const { data: rollups = [] } = useSupplierRollups();

  // Join coverage INTO each row (SDC-4d) so the DSG reflects it after the async
  // read resolves — a column-closure lookup would stay stale (all dashes).
  const rowsWithCoverage = /** @type {CoverageRow[]} */ (
    useMemo(() => {
      const byPair = /** @type {Map<string, SupplierCoverageEntry>} */ (
        new Map(coverage.map((c) => [`${c.supplierId}|${c.materialCode}`, c]))
      );
      return rows.map((r) => ({
        ...r,
        coverage: byPair.get(`${r.line.supplierId}|${r.line.materialCode}`) ?? null
      }));
    }, [rows, coverage])
  );

  // R1b - the rows the MACHINE says are resolvable. `userVerbsFrom` reads
  // `surfaceable` (S51), so a verb the flow marks unsurfaced never reaches this
  // list even when its from-state matches; `status === 'Disputed'` would be
  // shorter, correct today, and would keep offering the button on the day
  // somebody flipped `surfaceable` to false.
  const disputedRows = useMemo(
    () =>
      rowsWithCoverage.filter((r) => {
        const response = responseOf(r.state);
        return response !== null && offersResolve(response.status);
      }),
    [rowsWithCoverage]
  );

  // WAVE C — the same derivation, once per verb. Each list is what the MACHINE
  // offers from the row's own state, so a section empties itself the moment its
  // verb stops being legal there and no list needs a status literal to say so.
  const awaitingReviewRows = useMemo(
    () =>
      rowsWithCoverage.filter((r) => {
        const response = responseOf(r.state);
        return response !== null && offers(REVIEW_VERB, response.status);
      }),
    [rowsWithCoverage]
  );

  // ⚠️ KEYED ON `ACCEPT_VERB`, AND THE TWO CTAs IT CARRIES ARE ASSERTED
  // CO-REACHABLE RATHER THAN ASSUMED. `_accept` and `_dispute` both declare
  // `from: ['UnderReview']`, so one derivation genuinely serves both — but the
  // dispute CTA re-asks the machine per row anyway (`offers(DISPUTE_VERB, …)`),
  // because a list keyed on one verb that renders a control for another is the
  // shape that survives a flow edit while quietly becoming a lie.
  const underReviewRows = useMemo(
    () =>
      rowsWithCoverage.filter((r) => {
        const response = responseOf(r.state);
        return response !== null && offers(ACCEPT_VERB, response.status);
      }),
    [rowsWithCoverage]
  );

  return {
    rows,
    chase,
    rollups,
    rowsWithCoverage,
    disputedRows,
    awaitingReviewRows,
    underReviewRows
  };
}
