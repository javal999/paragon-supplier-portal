/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
/** @import { ReasonListId } from '@services/transitions/reasonCodes' */
import { useReasonLabel } from '../admin/reasonCodeDisplay';
import { NO_REASON, toggleReason } from './reasonFilterRules';

/**
 * CAP-5 BR-01..BR-03 — the shortfall Reason filter: a multi-select over the
 * reasons, each option with its count ("Force Majeure (3)"), plus "No reason".
 * Nothing chosen is no filter. Shared by the commitment exception list and PTI
 * Capacity; the page owns where the choice lives (state or address).
 * @type {React.FC<{
 *   list: ReasonListId;
 *   options: readonly { id: string; count: number }[];
 *   value: readonly string[];
 *   onChange: (next: string[]) => void;
 *   testId: string;
 * }>}
 */
const ReasonFilter = ({ list, options, value, onChange, testId }) => {
  const { t } = useTranslation();
  const reasonLabel = useReasonLabel();
  /** @param {string} id */
  const nameOf = (id) =>
    id === NO_REASON ? t('fc.filter.reason.none') : reasonLabel(list, id, 'record');
  const summary =
    value.length === 0
      ? t('fc.filter.reason.all')
      : value.length === 1
        ? nameOf(value[0])
        : t('fc.filter.reason.chosen', { count: value.length });
  return (
    <details className="relative" data-testid={testId}>
      <summary
        className="list-none cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md"
        data-testid={`${testId}-toggle`}
      >
        <span className="text-text-secondary">{t('fc.filter.reason.label')}</span>
        <span>{summary}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <fieldset className="absolute right-0 z-20 mt-1 min-w-[240px] bg-bg-surface border border-border-subtle rounded-md shadow-sm p-2">
        <legend className="sr-only">{t('fc.filter.reason.label')}</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-primary rounded hover:bg-bg-hover"
          >
            <input
              type="checkbox"
              checked={value.includes(o.id)}
              onChange={() => onChange(toggleReason(value, o.id))}
              data-testid={`${testId}-option-${o.id}`}
            />
            {t('fc.filter.reason.option', { label: nameOf(o.id), count: o.count })}
          </label>
        ))}
        {value.length > 0 && (
          <button
            type="button"
            className="mt-1 px-2 py-1 text-sm text-action-hover hover:underline"
            onClick={() => onChange([])}
            data-testid={`${testId}-clear`}
          >
            {t('fc.filter.reason.clear')}
          </button>
        )}
      </fieldset>
    </details>
  );
};

export default ReasonFilter;
