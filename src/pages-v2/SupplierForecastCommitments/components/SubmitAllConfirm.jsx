/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
/** @import { PeriodRow } from '../const' */
import { qtyText } from '../../forecasts/forecastDisplay';

/**
 * BL-240 (U-02) — the confirm step before a period's Submit all: every
 * material, period and quantity about to be committed, with the quantities
 * still at the forecast pre-fill (BR-09) marked, so a supplier does not commit
 * figures it never read. The pre-fill itself stays. Confirm sends the period;
 * Cancel and Escape send nothing.
 * @type {React.FC<{
 *   row: PeriodRow;
 *   label: string;
 *   pending: boolean;
 *   onCancel: () => void;
 *   onConfirm: () => void;
 * }>}
 */
const SubmitAllConfirm = ({ row, label, pending, onCancel, onConfirm }) => {
  const { t } = useTranslation();
  const anyPrefilled = row.summary.some((s) => s.prefilled);
  const title = t('fc.sup.week.confirm.title', { period: label });
  return (
    <ModalOverlay label={title} onClose={onCancel} testId={`fc-week-confirm-${row.bucket}`}>
      <div className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-lg shadow-lg p-5">
        <h2 className="text-section text-text-primary mb-2">{title}</h2>
        <p className="text-sm text-text-primary mb-3">
          {t('fc.sup.week.confirm.body', { count: row.summary.length })}
        </p>
        <ul className="space-y-1 mb-3" data-testid={`fc-week-confirm-lines-${row.bucket}`}>
          {row.summary.map(({ line, qty, prefilled }) => (
            <li
              key={line.key}
              className="text-sm text-text-primary"
              data-testid={`fc-week-confirm-line-${line.materialCode}`}
              data-prefilled={prefilled ? 'true' : 'false'}
            >
              <Data>{line.materialCode}</Data> · {label} ·{' '}
              <Data>{qty === null ? '—' : `${qtyText(qty)} ${line.uom}`}</Data>
              {prefilled && (
                <span className="ml-2 text-xs text-warning-hover">
                  {t('fc.sup.week.confirm.prefilled')}
                </span>
              )}
            </li>
          ))}
        </ul>
        {anyPrefilled && (
          <p className="text-xs text-text-tertiary mb-4">
            {t('fc.sup.week.confirm.prefilledNote')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} data-testid="fc-week-confirm-cancel">
            {t('fc.sup.week.confirm.cancel')}
          </Button>
          <Button
            variant="outline"
            disabled={pending || row.refusal !== null}
            onClick={onConfirm}
            data-testid="fc-week-confirm-submit"
          >
            {t('fc.sup.week.submitAll')}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
};

export default SubmitAllConfirm;
