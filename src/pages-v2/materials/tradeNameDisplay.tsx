import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import type { MaterialNameState } from '../../services/data/types';
import { materialNameRefusalOf, type MaterialNameRefusal } from '../../services/transitions/materialNameRules';

// ─────────────────────────────────────────────────────────────────────────────
// Material C2 · shared display bits for supplier trade names (MR-3).
// ─────────────────────────────────────────────────────────────────────────────

const STATE_VARIANT: Record<MaterialNameState, 'success' | 'warning' | 'danger' | 'neutral'> = {
  'Awaiting approval': 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Replaced: 'neutral',
};

const STATE_KEY: Record<MaterialNameState, string> = {
  'Awaiting approval': 'matName.state.awaiting',
  Approved: 'matName.state.approved',
  Rejected: 'matName.state.rejected',
  Replaced: 'matName.state.replaced',
};

/** A trade name's state as a quiet pill. */
export const MaterialNameStatePill: React.FC<{ state: MaterialNameState; testId?: string }> = ({ state, testId }) => {
  const { t } = useTranslation();
  return (
    <span data-testid={testId}>
      <StatusPill variant={STATE_VARIANT[state]}>{t(STATE_KEY[state])}</StatusPill>
    </span>
  );
};

/** The approved trade name, shown beside PTI's description on a stock row. */
export const TradeNameBeside: React.FC<{ name?: string; testId?: string }> = ({ name, testId }) => {
  const { t } = useTranslation();
  return name ? (
    <div className="text-xs text-text-secondary" data-testid={testId}>
      {t('matName.beside', { name })}
    </div>
  ) : null;
};

const REFUSAL_KEY: Record<MaterialNameRefusal, string> = {
  NOT_ASSIGNED: 'matName.refusal.NOT_ASSIGNED',
  NAME_LENGTH: 'matName.refusal.NAME_LENGTH',
  SUPPLIER_NO_LENGTH: 'matName.refusal.SUPPLIER_NO_LENGTH',
  REASON_REQUIRED: 'matName.refusal.REASON_REQUIRED',
};

/** The i18n key for a refusal code, or for a dispatcher reason ending in one. */
export function refusalKeyOf(refusal: MaterialNameRefusal | string | undefined | null): string | null {
  const code = materialNameRefusalOf(refusal ?? undefined);
  return code ? REFUSAL_KEY[code] : null;
}
