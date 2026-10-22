/** @import { RFQ, RFQCategory } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { GroupTab, KpiFilter } from '../const' */
/** @import { RfqNextStep } from '../utils' */
import { useMemo, useState } from 'react';
import { awardsInForce, trailOfViews } from '@services/sourcing/awardStatus';
import { TODAY } from '../const';
import { byNextDeadline, matchesGroup, matchesKpi, rfqNextStep } from '../utils';
import { rfqStageOf } from '../../BuyerSourcingEvent/utils';
/** @import { StageNext } from '../../BuyerSourcingEvent/utils' */

/**
 * @typedef {object} RfqBoardContext
 * @property {readonly Quotation[]} quotations Every quotation the buyer reads.
 * @property {readonly { rfqId: string; closed: boolean }[]} rounds Every negotiation round.
 * @property {readonly ({ id: string; eventType: string; eventId: string; status: string; lines: readonly unknown[] } & Parameters<typeof trailOfViews>[0][number])[]} awards Every recorded award, cancelled ones included.
 */

/**
 * The RFQ board's state and everything derived from the RFQ list: the tab,
 * KPI-tile, category and search filters, the tab counts, the four KPIs, each
 * RFQ's next step, the filtered rows in next-deadline order and the awarded
 * rows.
 *
 * RFx UX 1D (B-04): the board opens on "Needs my action"; a KPI tile, clicked,
 * replaces the tab filter with its own (clicked again, or a tab clicked, it is
 * cleared); every view is ordered by next deadline with Closed last.
 *
 * The board reads the seam list ALONE (`rfqs`): a created RFQ arrives through
 * getRFQs after the create dispatch invalidates.
 * @param {readonly RFQ[]} rfqs
 * @param {RfqBoardContext} ctx
 */
export const useRfqBoard = (rfqs, { quotations, rounds, awards }) => {
  const [group, setGroupState] = useState(/** @type {GroupTab} */ ('action'));
  const [kpi, setKpi] = useState(/** @type {KpiFilter | null} */ (null));
  const [selectedCats, setSelectedCats] = useState(/** @type {RFQCategory[]} */ ([]));
  const [search, setSearch] = useState('');
  // ONE clock read for the board, captured once and injected into every
  // day-count below — the replacement for the deleted `REFERENCE_TODAY` pin.
  const nowIso = TODAY;

  // The buyer's next act on each RFQ, from the state the event page reads:
  // the queue's step (`rfqNextStep`), and — for the side panel (B-15) — the
  // stage bar's own `next` and the quoted count its wording reads.
  const stageById = useMemo(() => {
    /** @type {Map<string, { step: RfqNextStep | null; next: StageNext; quoted: number }>} */
    const out = new Map();
    for (const r of rfqs) {
      const quoted = new Set(quotations.filter((q) => q.rfqId === r.id).map((q) => q.supplierId))
        .size;
      const eventAwards = awards.filter((a) => a.eventType === 'rfq' && a.eventId === r.id);
      const ctx = {
        quoted,
        rounds: rounds.filter((x) => x.rfqId === r.id),
        inForce: awardsInForce(eventAwards, trailOfViews(eventAwards))
      };
      const { next } = rfqStageOf({
        status: r.status,
        invited: r.invitedSupplierIds.length,
        ...ctx
      });
      out.set(r.id, { step: rfqNextStep(r, ctx), next, quoted });
    }
    return out;
  }, [rfqs, quotations, rounds, awards]);
  const nextById = useMemo(
    () => new Map([...stageById].map(([id, s]) => [id, s.step])),
    [stageById]
  );

  /** @param {RFQ} r */
  const nextOf = (r) => nextById.get(r.id) ?? null;
  /** @param {RFQ} r */
  const quotedOf = (r) => stageById.get(r.id)?.quoted ?? 0;
  /**
   * The stage bar's `next` for an RFQ, and the quoted count its label reads.
   * @param {RFQ} r
   * @returns {{ next: StageNext; quoted: number } | null}
   */
  const stageOf = (r) => {
    const s = stageById.get(r.id);
    return s ? { next: s.next, quoted: s.quoted } : null;
  };

  /** @type {Record<GroupTab, number>} */
  const counts = useMemo(() => {
    /** @param {GroupTab} g */
    const count = (g) => rfqs.filter((r) => matchesGroup(r, g, nextById.get(r.id) ?? null)).length;
    return {
      action: count('action'),
      open: count('open'),
      pending: count('pending'),
      draft: count('draft'),
      awarded: count('awarded'),
      closed: count('closed')
    };
  }, [rfqs, nextById]);

  const kpis = useMemo(() => {
    /** @param {KpiFilter} k */
    const count = (k) => rfqs.filter((r) => matchesKpi(r, k, nowIso)).length;
    return {
      active: count('active'),
      awaiting: count('awaiting'),
      readyToAward: count('ready'),
      awardedQuarter: count('awarded')
    };
  }, [rfqs, nowIso]);

  const activeFiltered = useMemo(() => {
    return rfqs
      .filter((r) =>
        kpi ? matchesKpi(r, kpi, nowIso) : matchesGroup(r, group, nextById.get(r.id) ?? null)
      )
      .filter((r) => (selectedCats.length === 0 ? true : selectedCats.includes(r.materialCategory)))
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.materialIds.join(' ').toLowerCase().includes(q)
        );
      })
      .sort(byNextDeadline);
  }, [rfqs, group, kpi, nowIso, nextById, selectedCats, search]);

  /** A tab, clicked, clears any KPI-tile filter. @param {GroupTab} g */
  const setGroup = (g) => {
    setKpi(null);
    setGroupState(g);
  };

  /** A tile toggles its own filter. @param {KpiFilter} k */
  const toggleKpi = (k) => setKpi((prev) => (prev === k ? null : k));

  const awarded = useMemo(() => rfqs.filter((r) => r.status === 'Awarded'), [rfqs]);

  /** @param {RFQCategory} cat */
  const toggleCategory = (cat) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  return {
    group,
    setGroup,
    kpi,
    toggleKpi,
    nextOf,
    quotedOf,
    stageOf,
    selectedCats,
    toggleCategory,
    search,
    setSearch,
    nowIso,
    counts,
    kpis,
    activeFiltered,
    awarded
  };
};
