import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import { formatDate } from '../../lib/format';
import type { RFQ } from '../../data/mockRfqs';
import type { Quotation } from '../../data/mockQuotations';
import type { GateResult } from '../../services/sourcing/complianceGate';
import type {
  AnyAwardLine,
  AwardLine,
  AwardRecord,
  AwardSplitBasis,
  RfpAwardLine,
} from '../../services/sourcing/types';
import type { RfpAwardView, RfpOfferRoundView, RfpRoundOptionView } from '../../services/sourcing/views';
import { itemCostAt, itemOfLine, splitQuantities } from '../../services/sourcing/rfqComparison';
import {
  awardItemsOf,
  awardReasonOwed,
  awardShapeRefusal,
  itemOfAwardLine,
  itemsOpenAfter,
  settlesRestWithoutLines,
  type AwardItem,
  type AwardItemBreak,
  type AwardQuoteShape,
  type AwardRefusal,
} from '../../services/sourcing/awardShape';
import { awardItemsOfRfp } from '../../services/sourcing/rfpAward';
import { firmPricesInForce, type FirmPriceInForce } from '../../services/sourcing/rfpFirmOffer';
import { EmptyRow, GateMarker, money, qty } from './rfxDisplay';
import { EligibilityMarker, vendorNames } from './eligibilityDisplay';
import type { BiddingEligibility, NamedEligibility } from '../../services/sourcing/sourcingType';
import { FirmPill } from './rfxAuthoringDisplay';
import LivenessPill from '../../components/ui-v2/LivenessPill';
import { complianceThresholds } from '../../services/transitions/inventoryConfig';
import { ComplianceAwardPill, useAwardCompliance } from './ComplianceAwardPill';

// ────────────────────────────────────────────────────────────────────────────
// THE AWARD PANEL — ONE PANEL FOR EVERY RFQ (RFx C3; NR-3 BR-02 to BR-07,
// AR-03, AR-04) AND FOR AN RFP (RFx D3; NR-2 BR-05, BR-06). It grew out of the
// tiered per-item award form, and a legacy RFQ renders through it too: the
// award rule's item list (`awardItemsOf`) is the same for both kinds, so the
// panel reads items, never "tiered or not". An RFP renders through it with
// the rule's RFP item list (`awardItemsOfRfp`: one item per option of a closed
// firm-offer round, its quantity points as breaks), so a buyer awards an RFP
// option exactly as an RFQ item.
//
// Per item the buyer picks a break, splits by % or by quantity (the other side
// is derived and shown read-only), or leaves the item "Not awarded now" (it
// stays open: the award is PARTIAL) or, on the final award, "Will not award".
//
// ⚠️ **THE PAGE JUDGES WITH THE VERB'S OWN RULE.** The lines it sends are
// checked by `awardShapeRefusal` over the verb's own item list, then for items
// left open and for the reason, exactly as `rfq_award_governed` /
// `rfp_award_governed` check them, so a form the page lets through is one the
// verb accepts and a refusal reads the same on both sides. The page is the
// message; the verb is the lock.
//
// The two event kinds differ only in what an ITEM MODEL answers (below): who
// can be awarded an item (a quote, or a firm offer in force), what price a row
// shows, how a line is written, and whether a reason is always required (an
// RFP: NR-2 BR-06) or only when the award departs from the best score (an RFQ).
// ────────────────────────────────────────────────────────────────────────────

/** What the buyer decided for one open item. */
type ItemChoice = 'award' | 'open' | 'willNot';

interface ItemDraft {
  readonly choice: ItemChoice;
  readonly basis: AwardSplitBasis;
  /** Unset = the default break (the evaluation break on a tiered RFQ). */
  readonly breakQty?: number;
  /** bid key → the typed share (%) or quantity, as text. */
  readonly values: Readonly<Record<string, string>>;
}

const EMPTY_DRAFT: ItemDraft = { choice: 'award', basis: 'pct', values: {} };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The award a panel asks the page to dispatch. */
export interface ItemPanelAward<L extends AnyAwardLine> {
  /** The final award when true, the partial award when false. */
  readonly final: boolean;
  readonly lines: L[];
  readonly reason: string;
  /** "Will not award" item keys (final award only). */
  readonly notAwardedItems: string[];
}

/** The award the RFQ panel asks the page to dispatch (`award` / `awardPartial`). */
export type PanelAward = ItemPanelAward<AwardLine>;

/** A shape refusal in the reader's language. */
export const awardRefusalMessage = (t: TFunction, r: AwardRefusal, supplierName: (id: string) => string): string =>
  r.unqualified
    ? t(r.code === 'AWARD_SUPPLIER_NOT_QUALIFIED' ? 'rfqCompare.refusal.AWARD_SUPPLIER_NOT_QUALIFIED' : 'elig.refusal.reasonRequired', {
        vendors: vendorNames(r.unqualified),
      })
    : r.code === 'AWARD_SPLIT_INCOMPLETE' && r.total !== undefined
    ? t('rfqCompare.refusal.AWARD_SPLIT_INCOMPLETE_QTY', {
        item: r.item ?? '',
        total: qty(r.total),
        breakQty: qty(r.breakQty ?? 0),
      })
    : t(`rfqCompare.refusal.${r.code}`, {
        item: r.item ?? '',
        pct: r.pct ?? 0,
        detail: r.detail ? supplierName(r.detail) : '',
      });

/**
 * An item as the reader sees it: "Item 1 · Oslo front sticker" (a tiered item
 * or a legacy line), or "The whole event" for a legacy RFQ with no lines.
 */
export function itemLabel(t: TFunction, rfq: RFQ, item: AwardItem): string {
  if (item.tiered) {
    const it = itemOfLine(rfq, item.lineNo);
    return `${t('rfqCompare.content.item', { n: item.lineNo })} · ${it?.description ?? ''}`;
  }
  const li = rfq.lineItems?.find((l) => l.materialCode === item.itemCode);
  return li
    ? `${t('rfqCompare.content.item', { n: li.lineNo })} · ${li.description}`
    : t('rfqCompare.award.wholeEvent');
}

// ── The item model: what an event kind answers ─────────────────────────────

/** One party that can be awarded an item: an RFQ quote, or an RFP supplier's firm offer. */
export interface AwardBid {
  /** The key a typed value is stored under (a quotation id, or a supplier id on an RFP). */
  readonly key: string;
  readonly supplierId: string;
}

/** The typed and derived sides of one line, before the event kind writes it. */
interface LineValues {
  readonly sharePct: number;
  readonly quantity: number;
  readonly basis: AwardSplitBasis;
}

interface ItemModel<L extends AnyAwardLine> {
  /** The verb's own item list, with the awards in force applied (`awardedIn`). */
  readonly items: readonly AwardItem[];
  readonly partlyAwarded: boolean;
  /** The quotes the shape rule reads (none on an RFP: each item judges its own offers). */
  readonly quotes: readonly AwardQuoteShape[];
  readonly defaultBreak: number | null;
  /** NR-2 BR-06 — an RFP award always needs a reason. */
  readonly reasonAlways: boolean;
  /** "Will not award the rest": offered only where the verb accepts a final award with no lines. */
  readonly offerSettleRest: boolean;
  /** The words under "Will not award the rest" (an item on an RFQ, an option on an RFP). */
  readonly settleRestHelpKey: string;
  readonly hintKey: string;
  readonly partialNoteKey: string;
  readonly label: (item: AwardItem) => string;
  readonly bidsFor: (item: AwardItem) => readonly AwardBid[];
  readonly priceHeader: (item: AwardItem, brk: AwardItemBreak) => string;
  readonly priceCell: (item: AwardItem, bid: AwardBid, brk: AwardItemBreak) => React.ReactNode;
  readonly uomOf: (item: AwardItem) => string;
  readonly lineOf: (item: AwardItem, bid: AwardBid, brk: AwardItemBreak, v: LineValues) => L;
  /** Which bid a line belongs to (its `AwardBid.key`). */
  readonly bidKeyOf: (line: L) => string;
  /** The best-scored bid for an item at a break, or null (none, a tie, or not scored). */
  readonly bestOf: (item: AwardItem, breakQty: number) => string | null;
}

/** What every panel takes besides its item model. */
interface PanelCommon<L extends AnyAwardLine> {
  qualifies: (supplierId: string) => boolean;
  gateOf: (supplierId: string) => GateResult | undefined;
  /**
   * Material G2 (MR-10 BR-07, edge case 1) — each bidder against the event's
   * sourcing type on the award date. `refused` gets no input and shows why;
   * `warn` (placeholder lists) can be awarded with a reason. Absent = not known.
   */
  eligibilityOf?: (supplierId: string) => BiddingEligibility | undefined;
  supplierName: (supplierId: string) => string;
  /** BL-64 — no bidding supplier passes CR-23: rows show why, and nothing is sent. */
  noneAwardable: boolean;
  pending: boolean;
  onAward: (award: ItemPanelAward<L>) => void;
}

// ── The RFQ panel (C3) ───────────────────────────────────────────────────────

export interface AwardPanelProps extends PanelCommon<AwardLine> {
  rfq: RFQ;
  /** The CURRENT version of each bid on the event. */
  quotes: readonly Quotation[];
  /** The awards of this event still in force (not cancelled). */
  inForce: readonly AwardRecord[];
  /** The break a tiered item is awarded at unless the buyer picks another. */
  defaultBreak: number | null;
  /** The best-scored quote for an item at a break, or null (none, or a tie). */
  bestOf: (item: AwardItem, breakQty: number) => string | null;
}

export const AwardPanel: React.FC<AwardPanelProps> = ({ rfq, quotes, inForce, defaultBreak, bestOf, ...common }) => {
  const { t } = useTranslation();
  const byId = new Map(quotes.map((q) => [q.id, q] as const));
  const model: ItemModel<AwardLine> = {
    items: awardItemsOf(rfq, inForce),
    partlyAwarded: rfq.status === 'Partly awarded',
    quotes,
    defaultBreak,
    reasonAlways: false,
    offerSettleRest: true,
    settleRestHelpKey: 'rfqCompare.award.willNotRestHelp',
    hintKey: 'rfqCompare.award.hint',
    partialNoteKey: 'rfqCompare.award.partialNote',
    label: (item) => itemLabel(t, rfq, item),
    // A tiered item's quoting suppliers; every bid on a legacy one.
    bidsFor: (item) =>
      (item.tiered
        ? quotes.filter((q) => (q.itemQuotes ?? []).some((iq) => iq.itemLineNo === item.lineNo))
        : quotes
      ).map((q) => ({ key: q.id, supplierId: q.supplierId })),
    priceHeader: (item, brk) =>
      item.tiered ? t('rfqCompare.cmp.col.totalAtBreak', { qty: qty(brk.qty) }) : t('rfx.cmp.row.unitPrice'),
    priceCell: (item, bid, brk) => {
      const q = byId.get(bid.key)!;
      const rfqItem = item.tiered ? itemOfLine(rfq, item.lineNo) : undefined;
      if (item.tiered) {
        const cost = rfqItem ? itemCostAt(rfq, rfqItem, q, brk.qty) : null;
        return cost ? (
          <Data>{money(cost.total, q.currency ?? rfq.currency)}</Data>
        ) : (
          <span className="text-xs text-text-tertiary">{t('rfqCompare.cmp.notPriced')}</span>
        );
      }
      const lineUnit = q.lines?.find((l) => l.materialCode === item.itemCode)?.unitPrice ?? q.unitPrice;
      return <Data>{money(lineUnit, q.currency ?? rfq.currency)}</Data>;
    },
    uomOf: (item) =>
      (item.tiered ? itemOfLine(rfq, item.lineNo)?.uom : undefined) ??
      rfq.lineItems?.find((l) => l.materialCode === item.itemCode)?.uom ??
      rfq.uom,
    lineOf: (item, bid, brk, v) => ({
      supplierId: bid.supplierId,
      quotationId: bid.key,
      itemCode: item.itemCode,
      ...(item.tiered ? { itemLineNo: item.lineNo } : {}),
      sharePct: v.sharePct,
      quantity: v.quantity,
      splitBasis: v.basis,
      awardTierQty: brk.qty,
    }),
    bidKeyOf: (line) => line.quotationId,
    // The "Best scored" marker is a tiered RFQ's, per item and break.
    bestOf,
  };
  return <ItemAwardForm model={model} {...common} showBestMarker={(item) => item.tiered} />;
};

// ── The RFP panel (D3) ───────────────────────────────────────────────────────

export interface RfpAwardPanelProps extends PanelCommon<RfpAwardLine> {
  rfpId: string;
  /** The RFP's stored status (`Partly awarded` decides the settle-rest rule). */
  status: string;
  currency: string;
  /** Every firm-offer round of this RFP, with its offers (the buyer's read). */
  rounds: readonly RfpOfferRoundView[];
  /** The awards of this RFP still in force (not cancelled). */
  inForce: readonly RfpAwardView[];
  /** The clock a firm offer's validity is judged at (the verb's `rfxNow`). */
  nowIso: string;
}

/** Each option once, by its ref, from the rounds that name it. */
export const optionsOfRounds = (rounds: readonly RfpOfferRoundView[]): readonly RfpRoundOptionView[] => [
  ...new Map(rounds.flatMap((r) => r.options).map((o) => [o.ref, o] as const)).values(),
];

/**
 * The firm prices the award reads: the LAST offer per supplier and option
 * across the CLOSED rounds only (NR-2 BR-04), exactly as `awardItemsOfRfp`
 * judges a line.
 */
export function awardableFirmPrices(rounds: readonly RfpOfferRoundView[]): readonly FirmPriceInForce[] {
  const closed = rounds.filter((r) => r.closedAt !== undefined);
  return firmPricesInForce(closed.flatMap((r) => r.offers.map((o) => ({ ...o, roundNumber: r.roundNumber }))));
}

export const RfpAwardPanel: React.FC<RfpAwardPanelProps> = ({
  rfpId,
  status,
  currency,
  rounds,
  inForce,
  nowIso,
  ...common
}) => {
  const { t } = useTranslation();
  const options = optionsOfRounds(rounds);
  const offers = rounds.flatMap((r) => r.offers);
  const prices = awardableFirmPrices(rounds);
  const priceAt = (supplierId: string, ref: string, breakQty: number) =>
    prices.find((p) => p.supplierId === supplierId && p.optionRef === ref && p.qty === breakQty);
  const model: ItemModel<RfpAwardLine> = {
    items: awardItemsOfRfp({ id: rfpId }, rounds, offers, {
      nowIso,
      options,
      priorAwards: inForce.map((a) => ({ ...a, reason: a.reason ?? '' })),
    }),
    partlyAwarded: status === 'Partly awarded',
    quotes: [],
    defaultBreak: null,
    reasonAlways: true,
    // BL-130 (REQ-E03-04 BR-16f) — the RFP verb takes a final award with no
    // lines when it marks every open option "Will not award", as the RFQ's does.
    offerSettleRest: true,
    settleRestHelpKey: 'rfx.rfpAward.willNotRestHelp',
    hintKey: 'rfx.rfpAward.hint',
    partialNoteKey: 'rfx.rfpAward.partialNote',
    label: (item) => options.find((o) => o.ref === item.key)?.title ?? item.key,
    bidsFor: (item) =>
      [...new Set(prices.filter((p) => p.optionRef === item.key).map((p) => p.supplierId))].map((supplierId) => ({
        key: supplierId,
        supplierId,
      })),
    priceHeader: (_item, brk) => t('rfx.rfpAward.priceAt', { qty: qty(brk.qty) }),
    priceCell: (item, bid, brk) => {
      const p = priceAt(bid.supplierId, item.key, brk.qty);
      return p ? (
        <span className="flex flex-col">
          <Data>{money(p.unitPrice, currency)}</Data>
          <span className="text-xs text-text-tertiary">
            {t('rfx.firm.validUntil', { date: formatDate(p.validUntil) })}
          </span>
        </span>
      ) : (
        <span className="text-xs text-text-tertiary">{t('rfx.rfpAward.noFirmPrice')}</span>
      );
    },
    uomOf: () => '',
    lineOf: (item, bid, brk, v) => {
      // The offer the supplier's price in force comes from: the rule refuses a
      // line naming any other (an older offer, or none at this point).
      const p =
        priceAt(bid.supplierId, item.key, brk.qty) ??
        prices.find((x) => x.supplierId === bid.supplierId && x.optionRef === item.key);
      const offer = p ? offers.find((o) => o.roundId === p.roundId && o.supplierId === bid.supplierId) : undefined;
      return {
        supplierId: bid.supplierId,
        optionRef: item.key,
        firmOfferId: offer?.id ?? '',
        sharePct: v.sharePct,
        quantity: v.quantity,
        splitBasis: v.basis,
        awardTierQty: brk.qty,
      };
    },
    bidKeyOf: (line) => line.supplierId,
    // An RFP award is not judged against a best score: its reason is always required.
    bestOf: () => null,
  };
  return <ItemAwardForm model={model} {...common} showBestMarker={() => false} />;
};

// ── The shared form ──────────────────────────────────────────────────────────

/** The breaks an item is awarded at in this draft. */
function breakOfDraft(item: AwardItem, draft: ItemDraft, defaultBreak: number | null): AwardItemBreak | undefined {
  const wanted = draft.breakQty ?? defaultBreak ?? undefined;
  return item.breaks.find((b) => b.qty === wanted) ?? item.breaks[0];
}

/**
 * The award lines one item's draft describes: a share derives its quantity
 * (`splitQuantities`, remainder unit on the first line, as the rule derives
 * it); a quantity derives its share over the break. Blank or zero is no line.
 */
function linesOfItem<L extends AnyAwardLine>(
  model: ItemModel<L>,
  item: AwardItem,
  draft: ItemDraft,
  brk: AwardItemBreak,
  bids: readonly AwardBid[],
): L[] {
  const picked = bids.flatMap((bid) => {
    const v = Number(draft.values[bid.key]);
    return Number.isFinite(v) && v > 0 ? [{ bid, v }] : [];
  });
  const qtys = draft.basis === 'pct' ? splitQuantities(brk.pieces, picked.map((p) => p.v)) : [];
  return picked.map(({ bid, v }, i) =>
    model.lineOf(item, bid, brk, {
      sharePct: draft.basis === 'pct' ? v : round2((v * 100) / brk.pieces),
      quantity: draft.basis === 'pct' ? qtys[i]! : v,
      basis: draft.basis,
    }),
  );
}

interface ItemAwardFormProps<L extends AnyAwardLine> extends PanelCommon<L> {
  model: ItemModel<L>;
  /** Mark the best-scored bid on an item (a tiered RFQ's per-item score). */
  showBestMarker: (item: AwardItem) => boolean;
}

function ItemAwardForm<L extends AnyAwardLine>(props: ItemAwardFormProps<L>): React.ReactElement {
  const { model, qualifies, supplierName, noneAwardable, pending, onAward, eligibilityOf } = props;
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [reason, setReason] = useState('');
  const compliance = useAwardCompliance();
  const { items, defaultBreak, partlyAwarded } = model;
  // CR-23, then Material G2 — a bidder below the level against a real list is
  // not awardable (the verb refuses AWARD_SUPPLIER_NOT_QUALIFIED too).
  const awardable = (sid: string) => qualifies(sid) && eligibilityOf?.(sid)?.state !== 'refused';
  const qualifiedBids = (item: AwardItem) => model.bidsFor(item).filter((b) => awardable(b.supplierId));
  const namedEligibility = (sid: string): NamedEligibility | undefined => {
    const eligibility = eligibilityOf?.(sid);
    return eligibility ? { supplierId: sid, supplierName: supplierName(sid), eligibility } : undefined;
  };
  const openItems = items.filter((i) => !i.awardedIn);
  const draftOf = (key: string): ItemDraft => drafts[key] ?? EMPTY_DRAFT;
  const setDraft = (key: string, next: ItemDraft) => setDrafts((prev) => ({ ...prev, [key]: next }));

  const lines = openItems.flatMap((item) => {
    const d = draftOf(item.key);
    const brk = breakOfDraft(item, d, defaultBreak);
    return d.choice === 'award' && brk ? linesOfItem(model, item, d, brk, qualifiedBids(item)) : [];
  });
  // NR-3 BR-06 — an item left "Not awarded now" makes this a PARTIAL award;
  // "Will not award" rides on the final award only, so the two are exclusive.
  const final = !openItems.some((i) => draftOf(i.key).choice === 'open');
  const willNot = final ? openItems.filter((i) => draftOf(i.key).choice === 'willNot').map((i) => i.key) : [];
  const touched = lines.length > 0 || openItems.some((i) => draftOf(i.key).choice !== 'award');

  const shapeRefusal = awardShapeRefusal(
    items,
    lines,
    model.quotes,
    final && model.offerSettleRest ? { partlyAwarded, notAwardedKeys: willNot } : undefined,
  );
  const open = shapeRefusal ? [] : itemsOpenAfter(items, lines, willNot);
  const refusal: AwardRefusal | null =
    shapeRefusal ??
    (final && open.length > 0
      ? { code: 'AWARD_ITEMS_OPEN', item: open.map((i) => i.name).join(', ') }
      : !final && open.length === 0
        ? { code: 'AWARD_NOTHING_OPEN' }
        : null);
  // THE ONE REASON RULE the verbs call (MAT-R2): best score departed, an RFP,
  // or — Material G2 — a vendor below the level on a placeholder list, or —
  // Material B4 (MR-2 BR-06) — a share to a red-flagged supplier.
  const owed = refusal
    ? null
    : awardReasonOwed({
        items,
        lines,
        always: model.reasonAlways,
        ...(model.reasonAlways ? {} : { bestOf: model.bestOf }),
        eligibilityOf: namedEligibility,
        flagged: compliance.flagged,
      });
  const departing = owed?.departing ?? [];
  const unqualified = owed?.unqualified ?? [];
  const flaggedItems = owed?.flagged ?? [];
  const needsReason = model.reasonAlways || (owed?.owed ?? false);

  // "Will not award the rest" — the final award with NO lines, legal only on a
  // Partly awarded RFQ and only when it marks every open item (C3's rule).
  const openKeys = openItems.map((i) => i.key);
  const canSettleRest =
    model.offerSettleRest &&
    partlyAwarded &&
    settlesRestWithoutLines(items, { partlyAwarded, notAwardedKeys: openKeys });

  return (
    <div className="space-y-4" data-testid="award-form">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-tertiary">{t(model.hintKey)}</p>
        {/* MAT-R14 — the compliance pills are built from sample stock records. */}
        <LivenessPill capability="inventory" />
      </div>
      {items.map((item) => (
        <AwardItemRow
          key={item.key}
          {...props}
          item={item}
          label={model.label(item)}
          draft={draftOf(item.key)}
          brk={breakOfDraft(item, draftOf(item.key), defaultBreak)}
          lines={lines.filter((l) => itemOfAwardLine(items, l)?.key === item.key)}
          bids={model.bidsFor(item)}
          otherOpenNow={openItems.some((i) => i.key !== item.key && draftOf(i.key).choice === 'open')}
          otherWillNot={openItems.some((i) => i.key !== item.key && draftOf(i.key).choice === 'willNot')}
          onChange={(next) => setDraft(item.key, next)}
        />
      ))}

      {touched && !!refusal && (
        <p className="text-sm text-danger" role="alert" data-testid="award-item-refusal" data-code={refusal.code}>
          {awardRefusalMessage(t, refusal, supplierName)}
        </p>
      )}
      {!final && !refusal && (
        <p className="text-xs text-text-secondary" data-testid="award-partial-note">
          {t(model.partialNoteKey)}
        </p>
      )}
      {needsReason && (
        <div data-testid="award-reason-required">
          <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="award-reason">
            {t('rfx.award.reason')}
          </label>
          {(model.reasonAlways || departing.length > 0) && (
            <p className="text-xs text-warning-hover mb-1">
              {model.reasonAlways
                ? t('rfx.rfpAward.reasonAlways')
                : t('rfqCompare.award.reasonItems', { items: departing.map((i) => i.name).join(', ') })}
            </p>
          )}
          {unqualified.length > 0 && (
            <p className="text-xs text-warning-hover mb-1" data-testid="award-reason-unqualified">
              {t('elig.award.warnReason', { vendors: vendorNames(unqualified) })}
            </p>
          )}
          {flaggedItems.length > 0 && (
            <p className="text-xs text-danger mb-1" data-testid="award-reason-compliance">
              {t('rfqCompare.award.reasonFlagged', {
                suppliers: [...new Set(flaggedItems.flatMap((o) => o.supplierIds))].map(supplierName).join(', '),
                items: flaggedItems.map((o) => model.label(o.item)).join(', '),
                flagPct: complianceThresholds().flagPct,
              })}
            </p>
          )}
          <input
            id="award-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
        </div>
      )}
      {!noneAwardable && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={pending || refusal !== null || (needsReason && !reason.trim())}
            data-testid="award-confirm"
            onClick={() => onAward({ final, lines, reason: reason.trim(), notAwardedItems: willNot })}
          >
            {final ? t('rfx.award.confirm') : t('rfqCompare.award.confirmPartial')}
          </Button>
        </div>
      )}
      {canSettleRest && (
        <div className="border-t border-border-subtle pt-3 space-y-2" data-testid="award-settle-rest">
          <p className="text-xs text-text-tertiary">{t(model.settleRestHelpKey)}</p>
          {/* An RFP award always needs a reason (NR-2 BR-06), this one included:
              it takes the reason typed above. */}
          <Button
            variant="outline"
            disabled={pending || (model.reasonAlways && !reason.trim())}
            data-testid="award-will-not-rest"
            onClick={() =>
              onAward({
                final: true,
                lines: [],
                reason: model.reasonAlways ? reason.trim() : '',
                notAwardedItems: openKeys,
              })
            }
          >
            {t('rfqCompare.award.willNotRest')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── One item ────────────────────────────────────────────────────────────────

interface ItemRowProps<L extends AnyAwardLine> extends ItemAwardFormProps<L> {
  item: AwardItem;
  label: string;
  draft: ItemDraft;
  brk: AwardItemBreak | undefined;
  lines: readonly L[];
  bids: readonly AwardBid[];
  /** Another item is "Not awarded now", so this award is partial: no "Will not award". */
  otherOpenNow: boolean;
  /** Another item is "Will not award", so this award is final: no "Not awarded now". */
  otherWillNot: boolean;
  onChange: (next: ItemDraft) => void;
}

const selectClass =
  'bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action';

function AwardItemRow<L extends AnyAwardLine>(props: ItemRowProps<L>): React.ReactElement {
  const { t } = useTranslation();
  const { item, draft, brk, lines } = props;
  const key = item.key;
  const pctTotal = round2(lines.reduce((s, l) => s + l.sharePct, 0));
  const qtyTotal = lines.reduce((s, l) => s + l.quantity, 0);
  const complete =
    brk !== undefined &&
    (draft.basis === 'pct' ? Math.abs(pctTotal - 100) <= 0.01 : Math.abs(qtyTotal - brk.pieces) <= 1);
  return (
    <div className="border border-border-subtle rounded-md overflow-hidden" data-testid={`award-item-${key}`}>
      <div className="px-4 py-2 border-b border-border-subtle flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">{props.label}</span>
        {!item.awardedIn && draft.choice === 'award' && brk && (
          <Data
            className={`text-xs ${complete ? 'text-success' : 'text-text-tertiary'}`}
            data-testid={`award-item-total-${key}`}
          >
            {draft.basis === 'pct'
              ? t('rfqCompare.award.itemTotal', { pct: pctTotal })
              : t('rfqCompare.award.itemTotalQty', { total: qty(qtyTotal), pieces: qty(brk.pieces) })}
          </Data>
        )}
      </div>
      {item.awardedIn ? (
        <p className="px-4 py-2 text-xs text-text-secondary" data-testid={`award-item-awarded-${key}`}>
          {t('rfqCompare.award.awardedIn', { award: item.awardedIn })}
        </p>
      ) : (
        <>
          <ItemControls {...props} />
          {draft.choice === 'award' && brk && <ItemBidTable {...props} brk={brk} />}
        </>
      )}
    </div>
  );
}

/** The item's decision, its break and its split basis. */
function ItemControls<L extends AnyAwardLine>({
  item,
  draft,
  brk,
  otherOpenNow,
  otherWillNot,
  onChange,
}: ItemRowProps<L>): React.ReactElement {
  const { t } = useTranslation();
  const key = item.key;
  const basisButton = (basis: AwardSplitBasis, label: string) => (
    <button
      type="button"
      aria-pressed={draft.basis === basis}
      data-testid={`award-basis-${key}-${basis}`}
      onClick={() => onChange({ ...draft, basis, values: {} })}
      className={`px-3 h-9 text-sm border ${
        draft.basis === basis ? 'border-action text-action-hover bg-action-soft' : 'border-border-input text-text-secondary'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="px-4 py-2 border-b border-border-subtle flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`award-choice-${key}`}>
          {t('rfqCompare.award.choice')}
        </label>
        <select
          id={`award-choice-${key}`}
          data-testid={`award-choice-${key}`}
          value={draft.choice}
          onChange={(e) => onChange({ ...draft, choice: e.target.value as ItemChoice })}
          className={selectClass}
        >
          <option value="award">{t('rfqCompare.award.choice.award')}</option>
          <option value="open" disabled={otherWillNot}>
            {t('rfqCompare.award.choice.open')}
          </option>
          <option value="willNot" disabled={otherOpenNow}>
            {t('rfqCompare.award.choice.willNot')}
          </option>
        </select>
      </div>
      {draft.choice === 'award' && item.breaks.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`award-break-${key}`}>
            {t('rfqCompare.award.break')}
          </label>
          <select
            id={`award-break-${key}`}
            data-testid={`award-break-${key}`}
            value={brk?.qty ?? ''}
            onChange={(e) => onChange({ ...draft, breakQty: Number(e.target.value) })}
            className={selectClass}
          >
            {item.breaks.map((b) => (
              <option key={b.qty} value={b.qty}>
                {qty(b.qty)}
              </option>
            ))}
          </select>
        </div>
      )}
      {draft.choice === 'award' && item.breaks.length === 1 && brk && (
        <p className="text-xs text-text-secondary" data-testid={`award-break-${key}`}>
          {t('rfqCompare.award.break')}: <Data>{qty(brk.qty)}</Data>
        </p>
      )}
      {draft.choice === 'award' && (
        <div role="group" aria-label={t('rfqCompare.award.basis')} className="inline-flex rounded-md overflow-hidden">
          {basisButton('pct', t('rfqCompare.award.basis.pct'))}
          {basisButton('qty', t('rfqCompare.award.basis.qty'))}
        </div>
      )}
    </div>
  );
}

/** One input per bid that can be awarded the item, and the derived side. */
function ItemBidTable<L extends AnyAwardLine>(props: ItemRowProps<L> & { brk: AwardItemBreak }): React.ReactElement {
  const { t } = useTranslation();
  const { item, brk, bids, draft, model } = props;
  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>
          {model.priceHeader(item, brk)}
          <FirmPill className="ml-2 normal-case" testId={`award-firm-${item.key}`} />
        </TableHeaderCell>
        <TableHeaderCell>{draft.basis === 'pct' ? t('rfx.award.col.share') : t('rfqCompare.award.qty')}</TableHeaderCell>
        <TableHeaderCell>{draft.basis === 'pct' ? t('rfqCompare.award.qty') : t('rfx.award.col.share')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {bids.map((bid) => (
          <AwardBidRow key={bid.key} {...props} bid={bid} />
        ))}
        {bids.length === 0 && (
          <EmptyRow colSpan={4} testId={`award-item-empty-${item.key}`}>
            {t('rfqCompare.cmp.noQuotes')}
          </EmptyRow>
        )}
      </tbody>
    </Table>
  );
}

function AwardBidRow<L extends AnyAwardLine>({
  model,
  item,
  label,
  brk,
  bid,
  draft,
  lines,
  qualifies,
  gateOf,
  eligibilityOf,
  supplierName,
  showBestMarker,
  onChange,
}: ItemRowProps<L> & { brk: AwardItemBreak; bid: AwardBid }): React.ReactElement {
  const { t } = useTranslation();
  const key = item.key;
  const line = lines.find((l) => model.bidKeyOf(l) === bid.key);
  const uom = model.uomOf(item);
  const side = draft.basis === 'pct' ? t('rfx.award.col.share') : t('rfqCompare.award.qty');
  const eligibility = eligibilityOf?.(bid.supplierId);
  const compliance = useAwardCompliance();
  return (
    <TableRow data-testid={`award-input-${key}-${bid.supplierId}`}>
      <TableCell>
        {supplierName(bid.supplierId)}
        {/* Material B4 (MR-2 step 4) — the bidder's weekly update compliance. */}
        <ComplianceAwardPill
          pct={compliance.pctOf(bid.supplierId)}
          testId={`award-compliance-${key}-${bid.supplierId}`}
        />
        {showBestMarker(item) && model.bestOf(item, brk.qty) === bid.key && (
          <StatusPill variant="success" className="ml-2">
            {t('rfqCompare.cmp.bestScored')}
          </StatusPill>
        )}
        {/* Material G2 (edge case 1) — why this bidder is below the level. */}
        <div className="mt-1">
          <EligibilityMarker eligibility={eligibility} testId={`award-elig-${key}-${bid.supplierId}`} />
        </div>
      </TableCell>
      <TableCell>{model.priceCell(item, bid, brk)}</TableCell>
      <TableCell>
        {/* BR-01a — no input for a supplier failing the gate, and the reason
            instead. The verb refuses it too: this is the message, not the lock. */}
        {!qualifies(bid.supplierId) ? (
          <GateMarker gate={gateOf(bid.supplierId)} testId={`award-gate-${key}-${bid.supplierId}`} />
        ) : eligibility?.state === 'refused' ? (
          <span className="text-xs text-danger" data-testid={`award-not-qualified-${key}-${bid.supplierId}`}>
            {t('elig.refused')}
          </span>
        ) : (
          <input
            type="number"
            min={0}
            max={draft.basis === 'pct' ? 100 : undefined}
            aria-label={`${label} — ${supplierName(bid.supplierId)} — ${side}`}
            value={draft.values[bid.key] ?? ''}
            onChange={(e) => onChange({ ...draft, values: { ...draft.values, [bid.key]: e.target.value } })}
            className="w-28 bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action"
          />
        )}
      </TableCell>
      {/* The derived side, read-only: the quantity a share makes, or the share a quantity is. */}
      <TableCell data-testid={`award-qty-${key}-${bid.supplierId}`}>
        {line ? (
          <Data>{draft.basis === 'pct' ? `${qty(line.quantity)}${uom ? ` ${uom}` : ''}` : `${line.sharePct}%`}</Data>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
