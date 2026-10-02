// ─────────────────────────────────────────────────────────────────────────────
// Shared display for REQ-E14-02 — the planner page and the supplier panel read
// the same service row and render its numbers the same way.
//
// "No history" is a real answer and is never 0% (the performanceRules rule):
// a supplier with nothing due in the window has no rate.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatNumber } from '@lib/format';
import type { MissSplit } from '@services/engine/reliability';

/** A 0–1 rate as a whole percentage, or null. */
export const pctOf = (rate: number | null): string | null => (rate === null ? null : `${Math.round(rate * 100)}%`);

/** A MASC value to two decimals, or null. */
export const mascOf = (value: number | null): string | null =>
  value === null ? null : formatNumber(Math.round(value * 100) / 100);

/** A rate in mono, or the honest "no history". */
export const Rate: React.FC<{ value: string | null; testId?: string }> = ({ value, testId }) => {
  const { t } = useTranslation();
  return value === null ? (
    <span className="text-text-tertiary" data-testid={testId}>
      {t('rel.noData')}
    </span>
  ) : (
    <Data data-testid={testId}>{value}</Data>
  );
};

/** The three causes of a miss, each with its count. */
export const MissSplitLine: React.FC<{ split: MissSplit; testId?: string }> = ({ split, testId }) => {
  const { t } = useTranslation();
  return (
    <span className="text-xs text-text-secondary" data-testid={testId}>
      {t('rel.split.never')} <Data>{split.neverConfirmed}</Data> · {t('rel.split.supplier')}{' '}
      <Data>{split.supplierCaused}</Data> · {t('rel.split.pti')} <Data>{split.ptiCaused}</Data>
    </span>
  );
};
