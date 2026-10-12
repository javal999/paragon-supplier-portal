/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { AnyAwardLine } from '@services/sourcing/types' */
/** @import { AwardItem, AwardItemBreak } from '@services/sourcing/awardShape' */
import { qty } from '../../rfxDisplay';
/** @import { AwardBid, ItemDraft } from '../types' */
/** @import { ItemAwardFormProps } from './ItemAwardForm' */
import { round2 } from '../utils';
import { ItemControls } from './ItemControls';
import { ItemBidTable } from './ItemBidTable';

// ── One item ────────────────────────────────────────────────────────────────

/**
 * `otherOpenNow`:  Another item is "Not awarded now", so this award is partial: no "Will not award".
 * `otherWillNot`:  Another item is "Will not award", so this award is final: no "Not awarded now".
 *
 * @template {AnyAwardLine} L
 * @typedef {ItemAwardFormProps<L> & {
 *     item: AwardItem;
 *     label: string;
 *     draft: ItemDraft;
 *     brk: AwardItemBreak | undefined;
 *     lines: readonly L[];
 *     bids: readonly AwardBid[];
 *     otherOpenNow: boolean;
 *     otherWillNot: boolean;
 *     onChange: (next: ItemDraft) => void;
 *   }} ItemRowProps
 */

/**
 * One item of the form: its label and running total, then either the award
 * already in force or the item's controls and its bid table. Its draft lives
 * in `ItemAwardForm`; this row reports changes through `onChange`.
 * @template {AnyAwardLine} L
 * @param {ItemRowProps<L>} props
 * @returns {React.ReactElement}
 */
export const AwardItemRow = (props) => {
  const { t } = useTranslation();
  const { item, draft, brk, lines } = props;
  const key = item.key;
  const pctTotal = round2(lines.reduce((s, l) => s + l.sharePct, 0));
  const qtyTotal = lines.reduce((s, l) => s + l.quantity, 0);
  const complete =
    brk !== undefined &&
    (draft.basis === 'pct'
      ? Math.abs(pctTotal - 100) <= 0.01
      : Math.abs(qtyTotal - brk.pieces) <= 1);
  return (
    <div
      className="border border-border-subtle rounded-md overflow-hidden"
      data-testid={`award-item-${key}`}
    >
      <div className="px-4 py-2 border-b border-border-subtle flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary">{props.label}</span>
        {!item.awardedIn && draft.choice === 'award' && brk && (
          <Data
            className={`text-xs ${complete ? 'text-success' : 'text-text-tertiary'}`}
            data-testid={`award-item-total-${key}`}
          >
            {draft.basis === 'pct'
              ? t('rfqCompare.award.itemTotal', { pct: pctTotal })
              : t('rfqCompare.award.itemTotalQty', {
                  total: qty(qtyTotal),
                  pieces: qty(brk.pieces)
                })}
          </Data>
        )}
      </div>
      {item.awardedIn ? (
        <p
          className="px-4 py-2 text-xs text-text-secondary"
          data-testid={`award-item-awarded-${key}`}
        >
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
};
