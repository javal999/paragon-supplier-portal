import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import type { RFQ } from '../../data/mockRfqs';
import type { Quotation } from '../../data/mockQuotations';
import type { GateResult } from '../../services/sourcing/complianceGate';
import type { AwardLine, AwardRecord, AwardSplitBasis } from '../../services/sourcing/types';
import { itemCostAt, itemOfLine, splitQuantities } from '../../services/sourcing/rfqComparison';
import {
  awardItemsDepartingBest,
  awardItemsOf,
  awardShapeRefusal,
  itemsOpenAfter,
  settlesRestWithoutLines,
  type AwardItem,
  type AwardItemBreak,
  type AwardRefusal,
} from '../../services/sourcing/awardShape';
import { EmptyRow, GateMarker, money, qty } from './rfxDisplay';
import { FirmPill } from './rfxAuthoringDisplay';

// ────────────────────────────────────────────────────────────────────────────
// THE AWARD PANEL — ONE PANEL FOR EVERY RFQ (RFx C3; NR-3 BR-02 to BR-07,
// AR-03, AR-04). It grew out of the tiered per-item award form, and a legacy
// RFQ renders through it too: the award rule's item list (`awardItemsOf`) is
// the same for both kinds, so the panel reads items, never "tiered or not".
//
// Per item the buyer picks a break, splits by % or by quantity (the other side
// is derived and shown read-only), or leaves the item "Not awarded now" (it
// stays open: the award is PARTIAL) or, on the final award, "Will not award".
//
// ⚠️ **THE PAGE JUDGES WITH THE VERB'S OWN RULE.** The lines it sends are
// checked by `awardShapeRefusal` over `awardItemsOf(rfq, awards in force)`, then
// for items left open and for the reason, exactly as `rfq_award_governed`
// checks them, so a form the page lets through is one the verb accepts and a
// refusal reads the same on both sides. The page is the message; the verb is
// the lock.
// ────────────────────────────────────────────────────────────────────────────

/** What the buyer decided for one open item. */
type ItemChoice = 'award' | 'open' | 'willNot';

interface ItemDraft {
  readonly choice: ItemChoice;
  readonly basis: AwardSplitBasis;
  /** Unset = the default break (the evaluation break on a tiered RFQ). */
  readonly breakQty?: number;
  /** quotationId → the typed share (%) or quantity, as text. */
  readonly values: Readonly<Record<string, string>>;
}

const EMPTY_DRAFT: ItemDraft = { choice: 'award', basis: 'pct', values: {} };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The award this panel asks the page to dispatch. */
export interface PanelAward {
  /** `award` (the final award) when true, `awardPartial` when false. */
  readonly final: boolean;
  readonly lines: AwardLine[];
  readonly reason: string;
  /** "Will not award" item keys (final award only). */
  readonly notAwardedItems: string[];
}

/** A shape refusal in the reader's language. */
export const awardRefusalMessage = (t: TFunction, r: AwardRefusal, supplierName: (id: string) => string): string =>
  r.code === 'AWARD_SPLIT_INCOMPLETE' && r.total !== undefined
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

/** The break an item is awarded at in this draft. */
function breakOfDraft(item: AwardItem, draft: ItemDraft, defaultBreak: number | null): AwardItemBreak | undefined {
  const wanted = draft.breakQty ?? defaultBreak ?? undefined;
  return item.breaks.find((b) => b.qty === wanted) ?? item.breaks[0];
}

/**
 * The award lines one item's draft describes: a share derives its quantity
 * (`splitQuantities`, remainder unit on the first line, as the rule derives
 * it); a quantity derives its share over the break. Blank or zero is no line.
 */
function linesOfItem(
  item: AwardItem,
  draft: ItemDraft,
  brk: AwardItemBreak,
  quotes: readonly Pick<Quotation, 'id' | 'supplierId'>[],
): AwardLine[] {
  const picked = quotes.flatMap((q) => {
    const v = Number(draft.values[q.id]);
    return Number.isFinite(v) && v > 0 ? [{ q, v }] : [];
  });
  const qtys = draft.basis === 'pct' ? splitQuantities(brk.pieces, picked.map((p) => p.v)) : [];
  return picked.map(({ q, v }, i) => ({
    supplierId: q.supplierId,
    quotationId: q.id,
    itemCode: item.itemCode,
    ...(item.tiered ? { itemLineNo: item.lineNo } : {}),
    sharePct: draft.basis === 'pct' ? v : round2((v * 100) / brk.pieces),
    quantity: draft.basis === 'pct' ? qtys[i]! : v,
    splitBasis: draft.basis,
    awardTierQty: brk.qty,
  }));
}

export interface AwardPanelProps {
  rfq: RFQ;
  /** The CURRENT version of each bid on the event. */
  quotes: readonly Quotation[];
  /** The awards of this event still in force (not cancelled). */
  inForce: readonly AwardRecord[];
  /** The break a tiered item is awarded at unless the buyer picks another. */
  defaultBreak: number | null;
  /** The best-scored quote for an item at a break, or null (none, or a tie). */
  bestOf: (item: AwardItem, breakQty: number) => string | null;
  qualifies: (supplierId: string) => boolean;
  gateOf: (supplierId: string) => GateResult | undefined;
  supplierName: (supplierId: string) => string;
  /** BL-64 — no quoting supplier passes CR-23: rows show why, and nothing is sent. */
  noneAwardable: boolean;
  pending: boolean;
  onAward: (award: PanelAward) => void;
}

export const AwardPanel: React.FC<AwardPanelProps> = ({
  rfq,
  quotes,
  inForce,
  defaultBreak,
  bestOf,
  qualifies,
  gateOf,
  supplierName,
  noneAwardable,
  pending,
  onAward,
}) => {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [reason, setReason] = useState('');
  const qualified = useMemo(() => quotes.filter((q) => qualifies(q.supplierId)), [quotes, qualifies]);
  const items = awardItemsOf(rfq, inForce);
  const openItems = items.filter((i) => !i.awardedIn);
  const draftOf = (key: string): ItemDraft => drafts[key] ?? EMPTY_DRAFT;
  const setDraft = (key: string, next: ItemDraft) => setDrafts((prev) => ({ ...prev, [key]: next }));

  const lines = openItems.flatMap((item) => {
    const d = draftOf(item.key);
    const brk = breakOfDraft(item, d, defaultBreak);
    return d.choice === 'award' && brk ? linesOfItem(item, d, brk, qualified) : [];
  });
  // NR-3 BR-06 — an item left "Not awarded now" makes this a PARTIAL award;
  // "Will not award" rides on the final award only, so the two are exclusive.
  const final = !openItems.some((i) => draftOf(i.key).choice === 'open');
  const willNot = final ? openItems.filter((i) => draftOf(i.key).choice === 'willNot').map((i) => i.key) : [];
  const partlyAwarded = rfq.status === 'Partly awarded';
  const touched = lines.length > 0 || openItems.some((i) => draftOf(i.key).choice !== 'award');

  const shapeRefusal = awardShapeRefusal(
    items,
    lines,
    quotes,
    final ? { partlyAwarded, notAwardedKeys: willNot } : undefined,
  );
  const open = shapeRefusal ? [] : itemsOpenAfter(items, lines, willNot);
  const refusal: AwardRefusal | null =
    shapeRefusal ??
    (final && open.length > 0
      ? { code: 'AWARD_ITEMS_OPEN', item: open.map((i) => i.name).join(', ') }
      : !final && open.length === 0
        ? { code: 'AWARD_NOTHING_OPEN' }
        : null);
  const departing = refusal ? [] : awardItemsDepartingBest(items, lines, bestOf);
  const needsReason = departing.length > 0;

  // "Will not award the rest" — the final award with NO lines, legal only on a
  // Partly awarded RFQ and only when it marks every open item (C3's rule).
  const openKeys = openItems.map((i) => i.key);
  const canSettleRest =
    partlyAwarded && settlesRestWithoutLines(items, { partlyAwarded, notAwardedKeys: openKeys });

  return (
    <div className="space-y-4" data-testid="award-form">
      <p className="text-xs text-text-tertiary">{t('rfqCompare.award.hint')}</p>
      {items.map((item) => (
        <AwardItemRow
          key={item.key}
          rfq={rfq}
          item={item}
          draft={draftOf(item.key)}
          brk={breakOfDraft(item, draftOf(item.key), defaultBreak)}
          lines={lines.filter((l) => itemMatches(item, l))}
          quotes={quotesFor(item, quotes)}
          otherOpenNow={openItems.some((i) => i.key !== item.key && draftOf(i.key).choice === 'open')}
          otherWillNot={openItems.some((i) => i.key !== item.key && draftOf(i.key).choice === 'willNot')}
          bestOf={bestOf}
          qualifies={qualifies}
          gateOf={gateOf}
          supplierName={supplierName}
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
          {t('rfqCompare.award.partialNote')}
        </p>
      )}
      {needsReason && (
        <div data-testid="award-reason-required">
          <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="award-reason">
            {t('rfx.award.reason')}
          </label>
          <p className="text-xs text-warning-hover mb-1">
            {t('rfqCompare.award.reasonItems', { items: departing.map((i) => i.name).join(', ') })}
          </p>
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
          <p className="text-xs text-text-tertiary">{t('rfqCompare.award.willNotRestHelp')}</p>
          <Button
            variant="outline"
            disabled={pending}
            data-testid="award-will-not-rest"
            onClick={() => onAward({ final: true, lines: [], reason: '', notAwardedItems: openKeys })}
          >
            {t('rfqCompare.award.willNotRest')}
          </Button>
        </div>
      )}
    </div>
  );
};

/** Does this award line name this item? (The rule's own match, for display.) */
const itemMatches = (item: AwardItem, line: AwardLine): boolean =>
  item.tiered ? line.itemLineNo === item.lineNo : line.itemLineNo === undefined && line.itemCode === item.itemCode;

/** The bids offered on an item: a tiered item's quoting suppliers, every bid on a legacy one. */
const quotesFor = (item: AwardItem, quotes: readonly Quotation[]): readonly Quotation[] =>
  item.tiered ? quotes.filter((q) => (q.itemQuotes ?? []).some((iq) => iq.itemLineNo === item.lineNo)) : quotes;

// ── One item ────────────────────────────────────────────────────────────────

interface ItemRowProps {
  rfq: RFQ;
  item: AwardItem;
  draft: ItemDraft;
  brk: AwardItemBreak | undefined;
  lines: readonly AwardLine[];
  quotes: readonly Quotation[];
  /** Another item is "Not awarded now", so this award is partial: no "Will not award". */
  otherOpenNow: boolean;
  /** Another item is "Will not award", so this award is final: no "Not awarded now". */
  otherWillNot: boolean;
  bestOf: (item: AwardItem, breakQty: number) => string | null;
  qualifies: (supplierId: string) => boolean;
  gateOf: (supplierId: string) => GateResult | undefined;
  supplierName: (supplierId: string) => string;
  onChange: (next: ItemDraft) => void;
}

const selectClass =
  'bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action';

const AwardItemRow: React.FC<ItemRowProps> = (props) => {
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
        <span className="text-sm font-semibold text-text-primary">{itemLabel(t, props.rfq, item)}</span>
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
          {draft.choice === 'award' && brk && <ItemSupplierTable {...props} brk={brk} />}
        </>
      )}
    </div>
  );
};

/** The item's decision, its break and its split basis. */
const ItemControls: React.FC<ItemRowProps> = ({ item, draft, brk, otherOpenNow, otherWillNot, onChange }) => {
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
};

/** One input per supplier that can be awarded the item, and the derived side. */
const ItemSupplierTable: React.FC<ItemRowProps & { brk: AwardItemBreak }> = (props) => {
  const { t } = useTranslation();
  const { item, brk, quotes, draft } = props;
  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>
          {item.tiered ? t('rfqCompare.cmp.col.totalAtBreak', { qty: qty(brk.qty) }) : t('rfx.cmp.row.unitPrice')}
          <FirmPill className="ml-2 normal-case" testId={`award-firm-${item.key}`} />
        </TableHeaderCell>
        <TableHeaderCell>{draft.basis === 'pct' ? t('rfx.award.col.share') : t('rfqCompare.award.qty')}</TableHeaderCell>
        <TableHeaderCell>{draft.basis === 'pct' ? t('rfqCompare.award.qty') : t('rfx.award.col.share')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {quotes.map((q) => (
          <AwardSupplierRow key={q.id} {...props} quote={q} />
        ))}
        {quotes.length === 0 && (
          <EmptyRow colSpan={4} testId={`award-item-empty-${item.key}`}>
            {t('rfqCompare.cmp.noQuotes')}
          </EmptyRow>
        )}
      </tbody>
    </Table>
  );
};

const AwardSupplierRow: React.FC<ItemRowProps & { brk: AwardItemBreak; quote: Quotation }> = ({
  rfq,
  item,
  brk,
  quote: q,
  draft,
  lines,
  bestOf,
  qualifies,
  gateOf,
  supplierName,
  onChange,
}) => {
  const { t } = useTranslation();
  const key = item.key;
  const line = lines.find((l) => l.quotationId === q.id);
  const rfqItem = item.tiered ? itemOfLine(rfq, item.lineNo) : undefined;
  const cost = rfqItem ? itemCostAt(rfq, rfqItem, q, brk.qty) : null;
  const lineUnit = q.lines?.find((l) => l.materialCode === item.itemCode)?.unitPrice ?? q.unitPrice;
  const uom = rfqItem?.uom ?? rfq.lineItems?.find((l) => l.materialCode === item.itemCode)?.uom ?? rfq.uom;
  const side = draft.basis === 'pct' ? t('rfx.award.col.share') : t('rfqCompare.award.qty');
  return (
    <TableRow data-testid={`award-input-${key}-${q.supplierId}`}>
      <TableCell>
        {supplierName(q.supplierId)}
        {item.tiered && bestOf(item, brk.qty) === q.id && (
          <StatusPill variant="success" className="ml-2">
            {t('rfqCompare.cmp.bestScored')}
          </StatusPill>
        )}
      </TableCell>
      <TableCell>
        {item.tiered ? (
          cost ? (
            <Data>{money(cost.total, q.currency ?? rfq.currency)}</Data>
          ) : (
            <span className="text-xs text-text-tertiary">{t('rfqCompare.cmp.notPriced')}</span>
          )
        ) : (
          <Data>{money(lineUnit, q.currency ?? rfq.currency)}</Data>
        )}
      </TableCell>
      <TableCell>
        {/* BR-01a — no input for a supplier failing the gate, and the reason
            instead. The verb refuses it too: this is the message, not the lock. */}
        {!qualifies(q.supplierId) ? (
          <GateMarker gate={gateOf(q.supplierId)} testId={`award-gate-${key}-${q.supplierId}`} />
        ) : (
          <input
            type="number"
            min={0}
            max={draft.basis === 'pct' ? 100 : undefined}
            aria-label={`${itemLabel(t, rfq, item)} — ${supplierName(q.supplierId)} — ${side}`}
            value={draft.values[q.id] ?? ''}
            onChange={(e) => onChange({ ...draft, values: { ...draft.values, [q.id]: e.target.value } })}
            className="w-28 bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action"
          />
        )}
      </TableCell>
      {/* The derived side, read-only: the quantity a share makes, or the share a quantity is. */}
      <TableCell data-testid={`award-qty-${key}-${q.supplierId}`}>
        {line ? (
          <Data>{draft.basis === 'pct' ? `${qty(line.quantity)} ${uom}` : `${line.sharePct}%`}</Data>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </TableCell>
    </TableRow>
  );
};
