/** @import React from 'react' */
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import LivenessPill from '@components/ui-v2/LivenessPill';
import { formatDate } from '@lib/format';
import { CURRENT, SIMULATED_ASOF } from '../const';

/**
 * The top of the page: the page header (or, `embedded`, the subtitle and the
 * liveness pill only — the host page owns the header), the meta line with the
 * line and supplier counts, the plan version and the simulated as-of, and the
 * honesty banner.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * `rows` and `rollups` are read for their counts only.
 * @type {React.FC<{ embedded: boolean; rows: readonly unknown[]; rollups: readonly unknown[] }>}
 */
const ConsolidationHeader = ({ embedded, rows, rollups }) => {
  const { t } = useTranslation();
  const CRUMB = [t('sdc.crumb.section'), t('sdc.crumb.page')];

  return (
    <>
      {embedded ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">{t('sdc.header.subtitle')}</p>
          <LivenessPill capability="forecastPublications" />
        </div>
      ) : (
        <PageHeader
          breadcrumb={CRUMB}
          title={t('sdc.header.title')}
          subtitle={t('sdc.header.subtitle')}
          actions={<LivenessPill capability="forecastPublications" />}
        />
      )}

      <PageMetaLine className={embedded ? 'mb-6' : '-mt-6 mb-6'}>
        {t('sdc.meta.summary', {
          lines: rows.length,
          suppliers: rollups.length,
          planVersion: CURRENT?.planVersion ?? t('sdc.empty.dash'),
          asOf: formatDate(SIMULATED_ASOF)
        })}
      </PageMetaLine>

      {/* Honest framing: read-only consolidation, SIMULATED feed, nothing dispatches */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('sdc.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('sdc.honesty.body')}</p>
        </div>
      </div>
    </>
  );
};

export default ConsolidationHeader;
