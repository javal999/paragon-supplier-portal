/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
/** @import { AnyAwardLine } from '@services/sourcing/types' */
/** @import { AwardItem, AwardRefusal } from '@services/sourcing/awardShape' */
import {
  awardReasonOwed,
  awardShapeRefusal,
  itemOfAwardLine,
  itemsOpenAfter,
  settlesRestWithoutLines
} from '@services/sourcing/awardShape';
import { vendorNames } from '../../eligibilityDisplay';
/** @import { NamedEligibility } from '@services/sourcing/sourcingType' */
import LivenessPill from '@components/ui-v2/LivenessPill';
import { complianceThresholds } from '@services/transitions/inventoryConfig';
import { useAwardCompliance } from '../../ComplianceAwardPill';
/** @import { ItemDraft, ItemModel, PanelCommon } from '../types' */
import { EMPTY_DRAFT } from '../const';
import { awardRefusalMessage, breakOfDraft, linesOfItem } from '../utils';
import { AwardItemRow } from './AwardItemRow';

// ── The shared form ──────────────────────────────────────────────────────────

/**
 * `showBestMarker`:  Mark the best-scored bid on an item (a tiered RFQ's per-item score).
 *
 * @template {AnyAwardLine} L
 * @typedef {PanelCommon<L> & {
 *     model: ItemModel<L>;
 *     showBestMarker: (item: AwardItem) => boolean;
 *   }} ItemAwardFormProps
 */

/**
 * The form both panels render: one row per item, the refusal, the reason and
 * the confirm buttons. It owns the per-item drafts and the reason, and judges
 * the lines with the verb's own rule before it lets the buyer confirm.
 * @template {AnyAwardLine} L
 * @param {ItemAwardFormProps<L>} props
 * @returns {React.ReactElement}
 */
export const ItemAwardForm = (props) => {
  const { model, qualifies, supplierName, noneAwardable, pending, onAward, eligibilityOf } = props;
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState(/** @type {Record<string, ItemDraft>} */ ({}));
  const [reason, setReason] = useState('');
  const compliance = useAwardCompliance();
  const { items, defaultBreak, partlyAwarded } = model;
  // CR-23, then Material G2 — a bidder below the level against a real list is
  // not awardable (the verb refuses AWARD_SUPPLIER_NOT_QUALIFIED too).
  /** @param {string} sid */
  const awardable = (sid) => qualifies(sid) && eligibilityOf?.(sid)?.state !== 'refused';
  /** @param {AwardItem} item */
  const qualifiedBids = (item) => model.bidsFor(item).filter((b) => awardable(b.supplierId));
  /**
   * @param {string} sid
   * @returns {NamedEligibility | undefined}
   */
  const namedEligibility = (sid) => {
    const eligibility = eligibilityOf?.(sid);
    return eligibility
      ? { supplierId: sid, supplierName: supplierName(sid), eligibility }
      : undefined;
  };
  const openItems = items.filter((i) => !i.awardedIn);
  /**
   * @param {string} key
   * @returns {ItemDraft}
   */
  const draftOf = (key) => drafts[key] ?? EMPTY_DRAFT;
  /**
   * @param {string} key
   * @param {ItemDraft} next
   */
  const setDraft = (key, next) => setDrafts((prev) => ({ ...prev, [key]: next }));

  const lines = openItems.flatMap((item) => {
    const d = draftOf(item.key);
    const brk = breakOfDraft(item, d, defaultBreak);
    return d.choice === 'award' && brk ? linesOfItem(model, item, d, brk, qualifiedBids(item)) : [];
  });
  // NR-3 BR-06 — an item left "Not awarded now" makes this a PARTIAL award;
  // "Will not award" rides on the final award only, so the two are exclusive.
  const final = !openItems.some((i) => draftOf(i.key).choice === 'open');
  const willNot = final
    ? openItems.filter((i) => draftOf(i.key).choice === 'willNot').map((i) => i.key)
    : [];
  const touched = lines.length > 0 || openItems.some((i) => draftOf(i.key).choice !== 'award');

  const shapeRefusal = awardShapeRefusal(
    items,
    lines,
    model.quotes,
    final && model.offerSettleRest ? { partlyAwarded, notAwardedKeys: willNot } : undefined
  );
  const open = shapeRefusal ? [] : itemsOpenAfter(items, lines, willNot);
  /** @type {AwardRefusal | null} */
  const refusal =
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
        flagged: compliance.flagged
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
          otherOpenNow={openItems.some(
            (i) => i.key !== item.key && draftOf(i.key).choice === 'open'
          )}
          otherWillNot={openItems.some(
            (i) => i.key !== item.key && draftOf(i.key).choice === 'willNot'
          )}
          onChange={(next) => setDraft(item.key, next)}
        />
      ))}

      {touched && !!refusal && (
        <p
          className="text-sm text-danger"
          role="alert"
          data-testid="award-item-refusal"
          data-code={refusal.code}
        >
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
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor="award-reason"
          >
            {t('rfx.award.reason')}
          </label>
          {(model.reasonAlways || departing.length > 0) && (
            <p className="text-xs text-warning-hover mb-1">
              {model.reasonAlways
                ? t('rfx.rfpAward.reasonAlways')
                : t('rfqCompare.award.reasonItems', {
                    items: departing.map((i) => i.name).join(', ')
                  })}
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
                suppliers: [...new Set(flaggedItems.flatMap((o) => o.supplierIds))]
                  .map(supplierName)
                  .join(', '),
                items: flaggedItems.map((o) => model.label(o.item)).join(', '),
                flagPct: complianceThresholds().flagPct
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
            onClick={() =>
              onAward({ final, lines, reason: reason.trim(), notAwardedItems: willNot })
            }
          >
            {final ? t('rfx.award.confirm') : t('rfqCompare.award.confirmPartial')}
          </Button>
        </div>
      )}
      {canSettleRest && (
        <div
          className="border-t border-border-subtle pt-3 space-y-2"
          data-testid="award-settle-rest"
        >
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
                notAwardedItems: openKeys
              })
            }
          >
            {t('rfqCompare.award.willNotRest')}
          </Button>
        </div>
      )}
    </div>
  );
};
