/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
/** @import { MaterialNameState } from '@services/data/types' */
/** @import { MaterialNameRefusal } from '@services/transitions/materialNameRules' */
import { materialNameRefusalOf } from '@services/transitions/materialNameRules';

// ─────────────────────────────────────────────────────────────────────────────
// Material C2 · shared display bits for supplier trade names (MR-3).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<MaterialNameState, 'success' | 'warning' | 'danger' | 'neutral'>} */
const STATE_VARIANT = {
  'Awaiting approval': 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Replaced: 'neutral'
};

/** @type {Record<MaterialNameState, string>} */
const STATE_KEY = {
  'Awaiting approval': 'matName.state.awaiting',
  Approved: 'matName.state.approved',
  Rejected: 'matName.state.rejected',
  Replaced: 'matName.state.replaced'
};

/**
 * A trade name's state as a quiet pill.
 * @type {React.FC<{ state: MaterialNameState; testId?: string }>}
 */
export const MaterialNameStatePill = ({ state, testId }) => {
  const { t } = useTranslation();
  return (
    <span data-testid={testId}>
      <StatusPill variant={STATE_VARIANT[state]}>{t(STATE_KEY[state])}</StatusPill>
    </span>
  );
};

/**
 * The approved trade name, shown beside PTI's description on a stock row. The
 * supplier reads "Your name"; a PTI viewer reads "Supplier's name" (FU-10).
 * @type {React.FC<{ name?: string; viewer: 'supplier' | 'pti'; testId?: string }>}
 */
export const TradeNameBeside = ({ name, viewer, testId }) => {
  const { t } = useTranslation();
  return name ? (
    <div className="text-xs text-text-secondary" data-testid={testId}>
      {t(viewer === 'supplier' ? 'matName.beside' : 'matName.besideSupplier', { name })}
    </div>
  ) : null;
};

/** @type {Record<MaterialNameRefusal, string>} */
const REFUSAL_KEY = {
  NOT_ASSIGNED: 'matName.refusal.NOT_ASSIGNED',
  NAME_LENGTH: 'matName.refusal.NAME_LENGTH',
  SUPPLIER_NO_LENGTH: 'matName.refusal.SUPPLIER_NO_LENGTH',
  REASON_REQUIRED: 'matName.refusal.REASON_REQUIRED'
};

/**
 * The i18n key for a refusal code, or for a dispatcher reason ending in one.
 * @param {MaterialNameRefusal | string | undefined | null} refusal
 * @returns {string | null}
 */
export function refusalKeyOf(refusal) {
  const code = materialNameRefusalOf(refusal ?? undefined);
  return code ? REFUSAL_KEY[code] : null;
}
