/** @import React from 'react' */
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { CHIP_NEUTRAL, CLASS_LABEL_KEY, CURRENT } from '../const';
import { periodClass } from '../utils';

/**
 * The period filter bar: an "all" button and one button per horizon bucket of
 * the current publication (a firm bucket carries a lock), then the
 * period-level commitment-class badges the per-line chips only echo. The page
 * owns `period`; this reads it and calls `setPeriod`.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{ period: string; setPeriod: (period: string) => void }>}
 */
const PeriodBar = ({ period, setPeriod }) => {
  const { t } = useTranslation();
  const horizon = CURRENT?.horizon ?? [];

  return (
    <div data-testid="sdc-period-bar" className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPeriod('all')}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            period === 'all'
              ? 'border-action bg-action-soft text-action'
              : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
          }`}
        >
          {t('sdc.period.all')}
        </button>
        {horizon.map((bucket) => (
          <button
            key={bucket}
            type="button"
            onClick={() => setPeriod(bucket)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
              period === bucket
                ? 'border-action bg-action-soft text-action'
                : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <Data className="text-xs">{bucket}</Data>
            {periodClass(bucket) === 'firm' && <Lock size={12} aria-hidden="true" />}
          </button>
        ))}
      </div>
      {/* The period-level commitmentClass badges — per-line chips only ECHO these */}
      <div className="mt-2 flex flex-wrap gap-2">
        {horizon.map((bucket) => {
          const cls = periodClass(bucket);
          return (
            <span key={bucket} className={CHIP_NEUTRAL}>
              {cls === 'firm' ? (
                <>
                  <Lock size={11} aria-hidden="true" />
                  {t('sdc.period.locked', { period: bucket })}
                </>
              ) : (
                <>
                  {bucket} · {t(cls === 'mixed' ? 'sdc.class.mixed' : CLASS_LABEL_KEY[cls])}
                </>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default PeriodBar;
