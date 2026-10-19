/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Supplier } from '@services/data/types' */
/** @import { Grade } from '../const' */
import StatusPill from '@components/ui-v2/StatusPill';
import GradeBadge from './GradeBadge';

/**
 * @typedef {object} IdentityCardProps
 * @property {Supplier} mySupplier  The signed-in supplier's master record.
 * @property {string} channelLabel  The translated preferred-channel label.
 * @property {Grade | undefined} grade  Projected scorecard grade; absent when nothing is measured.
 * @property {number | undefined} score  Projected performance score; absent with the grade.
 * @property {'success' | 'warning' | 'danger' | 'neutral'} otifVariant  Pill tone for OTIF.
 * @property {string} otifStatusLabel  Pill text for OTIF ("On Track", "No history", …).
 * @property {boolean} hasOtif  Whether the supplier has a measured OTIF at all.
 * @property {number | undefined} otif  The measured OTIF percentage.
 * @property {TFunction} t
 */

/**
 * The identity card under the page header: supplier name, SAP BP number and
 * channel, the grade tile with its score, and the OTIF pill. Moved out of
 * `SupplierDashboard.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<IdentityCardProps>}
 */
const IdentityCard = ({
  mySupplier,
  channelLabel,
  grade,
  score,
  otifVariant,
  otifStatusLabel,
  hasOtif,
  otif,
  t
}) => (
  <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
    <div className="flex items-center justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        <div className="text-section text-text-primary mb-1">{mySupplier.name}</div>
        <div className="text-sm text-text-secondary">
          {t('supplierDashboard.identity.sapBp', {
            bp: mySupplier.sapBpNumber,
            channel: channelLabel
          })}
        </div>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <div className="text-center">
          <div className="text-[length:var(--fs-caption-1)] text-text-tertiary uppercase tracking-wider mb-2">
            {t('supplierDashboard.identity.grade')}
          </div>
          {grade ? (
            <GradeBadge grade={grade} />
          ) : (
            <div className="text-xs text-text-tertiary">{t('rfx.noHistory')}</div>
          )}
          <div className="text-xs text-text-secondary mt-1">
            {score === undefined ? '—' : t('supplierDashboard.identity.score', { score })}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <StatusPill variant={otifVariant}>{otifStatusLabel}</StatusPill>
          <div className="text-xs text-text-secondary">
            {hasOtif ? t('supplierDashboard.identity.otif', { value: otif }) : t('rfx.noHistory')}
          </div>
          <div className="text-xs text-text-tertiary">{t('supplierDashboard.identity.target')}</div>
        </div>
      </div>
    </div>
  </section>
);

export default IdentityCard;
