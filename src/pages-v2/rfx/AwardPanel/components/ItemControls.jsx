/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { AnyAwardLine, AwardSplitBasis } from '@services/sourcing/types' */
import { qty } from '../../rfxDisplay';
/** @import { ItemChoice } from '../types' */
/** @import { ItemRowProps } from './AwardItemRow' */

const selectClass =
  'bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action';

/**
 * The item's decision, its break and its split basis.
 * @template {AnyAwardLine} L
 * @param {ItemRowProps<L>} props
 * @returns {React.ReactElement}
 */
export const ItemControls = ({ item, draft, brk, otherOpenNow, otherWillNot, onChange }) => {
  const { t } = useTranslation();
  const key = item.key;
  /**
   * @param {AwardSplitBasis} basis
   * @param {string} label
   */
  const basisButton = (basis, label) => (
    <button
      type="button"
      aria-pressed={draft.basis === basis}
      data-testid={`award-basis-${key}-${basis}`}
      onClick={() => onChange({ ...draft, basis, values: {} })}
      className={`px-3 h-9 text-sm border ${
        draft.basis === basis
          ? 'border-action text-action-hover bg-action-soft'
          : 'border-border-input text-text-secondary'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="px-4 py-2 border-b border-border-subtle flex flex-wrap items-end gap-3">
      <div>
        <label
          className="block text-xs font-semibold text-text-secondary mb-1"
          htmlFor={`award-choice-${key}`}
        >
          {t('rfqCompare.award.choice')}
        </label>
        <select
          id={`award-choice-${key}`}
          data-testid={`award-choice-${key}`}
          value={draft.choice}
          onChange={(e) =>
            onChange({ ...draft, choice: /** @type {ItemChoice} */ (e.target.value) })
          }
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
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor={`award-break-${key}`}
          >
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
        <div
          role="group"
          aria-label={t('rfqCompare.award.basis')}
          className="inline-flex rounded-md overflow-hidden"
        >
          {basisButton('pct', t('rfqCompare.award.basis.pct'))}
          {basisButton('qty', t('rfqCompare.award.basis.qty'))}
        </div>
      )}
    </div>
  );
};
