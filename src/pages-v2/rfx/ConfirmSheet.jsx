/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { AnyAwardLine } from '@services/sourcing/types' */
/** @import { ItemPanelAward } from './AwardPanel' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { qty } from './rfxDisplay';

// ────────────────────────────────────────────────────────────────────────────
// RFx UX 1C (B-05) — THE CONFIRMATION SHEET. Closing an RFI or RFP, cancelling
// an award and recording one are governed acts, so each is confirm-before-
// commit, as the RFQ board already treats the FX pin (`BuyerSourcing/index.jsx`):
// the button opens an inline sheet that restates the effects, and nothing is
// dispatched until "Record the award" (or the act's own verb) is pressed.
// "Back to edit" closes the sheet and keeps what the buyer typed.
//
// The effect lines are built by the pure functions below, so a spec can pin
// them without rendering a page. They restate what the verb does; they decide
// nothing.
// ────────────────────────────────────────────────────────────────────────────

/** One line of a sheet. */
/** @typedef {{ key: string; text: string }} Effect */

/**
 * @type {React.FC<{
 *   title: string;
 *   effects: readonly Effect[];
 *   confirmLabel: string;
 *   onConfirm: () => void;
 *   onBack: () => void;
 *   pending?: boolean;
 *   confirmDisabled?: boolean;
 *   testId: string;
 *   confirmTestId?: string;
 *   children?: React.ReactNode;
 * }>}
 */
export const ConfirmSheet = ({
  title,
  effects,
  confirmLabel,
  onConfirm,
  onBack,
  pending = false,
  confirmDisabled = false,
  testId,
  confirmTestId,
  children
}) => {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={title}
      className="border border-action rounded-md bg-action-soft p-4 space-y-2"
      data-testid={testId}
    >
      <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
      <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
        {effects.map((e) => (
          <li key={e.key} data-testid={`${testId}-${e.key}`}>
            {e.text}
          </li>
        ))}
      </ul>
      {children}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="outline"
          disabled={pending || confirmDisabled}
          onClick={onConfirm}
          data-testid={confirmTestId ?? `${testId}-confirm`}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onBack} data-testid={`${testId}-back`}>
          {t('rfx.confirm.back')}
        </Button>
      </div>
    </div>
  );
};

/**
 * Closing an RFI or RFP (`t_rfi_close` / `t_rfp_close`, Open → Closed): who is
 * affected, what stops, and how it is undone (extend: Closed → Open).
 * @param {TFunction} t
 * @param {{ invited: number; responded: number }} counts
 * @returns {Effect[]}
 */
export function closeEffects(t, { invited, responded }) {
  return [
    { key: 'who', text: t('rfx.confirm.close.who', { invited, responded }) },
    { key: 'closes', text: t('rfx.confirm.close.closes') },
    { key: 'reversible', text: t('rfx.confirm.close.reversible') }
  ];
}

/**
 * BL-222 — cancelling a whole RFQ (`t_rfq_cancel`, Draft/Open/Closed →
 * Cancelled): who is affected, what closes, and that no verb leaves Cancelled.
 * The verb takes no reason (`requiredFields: []`) and declares no cascade, so
 * the quotes already in are left as they are — the sheet says exactly that.
 * @param {TFunction} t
 * @param {{ invited: number; quoted: number }} counts
 * @returns {Effect[]}
 */
export function cancelRfqEffects(t, { invited, quoted }) {
  return [
    { key: 'who', text: t('rfx.confirm.cancelRfq.who', { invited, quoted }) },
    { key: 'closes', text: t('rfx.confirm.cancelRfq.closes') },
    { key: 'quotes', text: t('rfx.confirm.cancelRfq.quotes') },
    { key: 'final', text: t('rfx.confirm.cancelRfq.final') }
  ];
}

/**
 * The suppliers a FINAL award records as not awarded, read as the award verb
 * writes `notAwardedSupplierIds`: everyone in `pool` (an RFQ's invitees, an
 * RFP's responders) that neither an award in force nor this one names. A
 * partial award names nobody.
 * @param {{ final: boolean; lines: readonly { supplierId: string }[] }} award
 * @param {readonly { lines: readonly { supplierId: string }[] }[]} inForce
 * @param {readonly string[]} pool
 * @returns {string[]}
 */
export function notAwardedOnFinal(award, inForce, pool) {
  if (!award.final) return [];
  const named = new Set([
    ...inForce.flatMap((a) => a.lines.map((l) => l.supplierId)),
    ...award.lines.map((l) => l.supplierId)
  ]);
  return pool.filter((sid) => !named.has(sid));
}

/**
 * The award sheet: one line per item with its split, the items closed without
 * an award, who is recorded as not awarded (or that the rest stays open), the
 * reason on record, and what can still be undone.
 * @template {AnyAwardLine} L
 * @param {TFunction} t
 * @param {{
 *   award: ItemPanelAward<L>;
 *   notAwarded: readonly string[];
 *   supplierName: (id: string) => string;
 *   lineItem: (line: L) => { key: string; label: string };
 *   itemLabel: (key: string) => string;
 * }} input
 * @returns {Effect[]}
 */
export function awardEffects(t, { award, notAwarded, supplierName, lineItem, itemLabel }) {
  /** @type {Map<string, { label: string; lines: L[] }>} */
  const byItem = new Map();
  for (const line of award.lines) {
    const { key, label } = lineItem(line);
    const entry = byItem.get(key) ?? { label, lines: [] };
    entry.lines.push(line);
    byItem.set(key, entry);
  }
  /** @type {Effect[]} */
  const out = [...byItem].map(([key, { label, lines }]) => ({
    key: `item-${key}`,
    text: t('rfx.confirm.award.item', {
      item: label,
      split: lines
        .map((l) =>
          t('rfx.confirm.award.share', {
            supplier: supplierName(l.supplierId),
            pct: l.sharePct,
            qty: qty(l.quantity)
          })
        )
        .join(', ')
    })
  }));
  if (award.notAwardedItems.length > 0) {
    out.push({
      key: 'willNot',
      text: t('rfx.confirm.award.willNot', {
        items: award.notAwardedItems.map(itemLabel).join(', ')
      })
    });
  }
  if (!award.final) {
    out.push({ key: 'partial', text: t('rfx.confirm.award.partial') });
  } else if (notAwarded.length > 0) {
    out.push({
      key: 'notAwarded',
      text: t('rfx.confirm.award.notAwarded', {
        names: notAwarded.map(supplierName).join(', ')
      })
    });
  }
  out.push(
    award.reason
      ? {
          key: 'reason',
          text: t('rfx.confirm.award.reason', {
            reason: award.reason
          })
        }
      : { key: 'reason', text: t('rfx.confirm.award.noReason') }
  );
  out.push({ key: 'after', text: t('rfx.confirm.award.after') });
  return out;
}
