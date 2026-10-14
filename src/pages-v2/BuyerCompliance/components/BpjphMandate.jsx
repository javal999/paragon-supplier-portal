/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { Shield } from 'lucide-react';
import Data from '@components/ui-v2/Data';

/**
 * @typedef {object} BpjphMandateProps
 * @property {{ compliant: number; total: number }} bpjph Halal rows that are scheme-valid, out of
 *   every halal row (computed by the page).
 * @property {{ daysLeft: number; pct: number }} deadline Days from the anchored present to the
 *   BPJPH mandate date (computed by the page; `pct` is not rendered).
 * @property {TFunction} t
 */

/**
 * The two BPJPH mandate blocks above the KPI row: the warning banner with the
 * scheme-aware compliant count, and the neutral deadline card with the days
 * remaining. Moved out of `BuyerCompliance.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<BpjphMandateProps>}
 */
const BpjphMandate = ({ bpjph, deadline, t }) => (
  <>
    <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 flex items-start gap-3">
      <Shield size={16} className="text-warning-hover shrink-0 mt-0.5" />
      <div className="text-sm text-text-secondary">
        <strong className="text-warning-hover">{t('compliance.bpjph.banner.title')}</strong>{' '}
        {t('compliance.bpjph.banner.body')}{' '}
        <strong className="text-text-primary">
          {t('compliance.bpjph.banner.certs', {
            compliant: bpjph.compliant,
            total: bpjph.total
          })}
        </strong>{' '}
        {t('compliance.bpjph.banner.compliantSuffix')}
      </div>
    </div>

    {/* D-CENSUS-8 — the FACT stays, the URGENCY is retracted.
        The 17 Oct 2026 BPJPH date is real Indonesian regulation. What was false
        was this card's rhetoric: a red-when-≤90-days countdown with a draining
        progress bar, which reads as "this product is racing a deadline" — the
        exact pressure the canon removed on 2026-07-15 (Track-R is a normal
        operator lane; certification is handled manually by the compliance team).
        Now: neutral border, neutral figure, no colour escalation, no depleting
        bar. A date the reader may need to know, stated without manufacturing
        alarm about it. */}
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-5 py-4 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-bold text-text-primary">
            {t('compliance.deadline.title')}
          </div>
          <div className="text-xs text-text-tertiary mt-0.5 max-w-2xl">
            {t('compliance.deadline.subtitle')}
          </div>
        </div>
        <div className="text-right shrink-0">
          <Data as="div" className="text-kpi leading-none text-text-secondary">
            {deadline.daysLeft}
          </Data>
          <div className="text-xs text-text-tertiary mt-1">
            {t('compliance.deadline.daysRemaining')}
          </div>
        </div>
      </div>
    </div>
  </>
);

export default BpjphMandate;
