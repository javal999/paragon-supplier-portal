/** @import React from 'react' */
/** @import { GeoRisk } from '@services/data/types' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { severityTone } from '@lib/statusTone';

/**
 * The "Geopolitical" tab body: one card per geo-risk with its severity, score,
 * impact, affected suppliers and mitigation.
 *
 * Props: `geoRisks` (the fixture rows from `useGeoRisks`).
 * @type {React.FC<{ geoRisks: GeoRisk[] }>}
 */
const GeopoliticalTab = ({ geoRisks }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      {geoRisks.map((r) => {
        const sevVariant = severityTone(r.severity);
        const sevSoftBg =
          sevVariant === 'danger'
            ? 'bg-danger-soft'
            : sevVariant === 'warning'
              ? 'bg-warning-soft'
              : 'bg-success-soft';
        return (
          <div
            key={r.country}
            className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden"
          >
            <div
              className={`${sevSoftBg} px-5 py-4 flex items-center gap-4 border-b border-border-subtle`}
            >
              <span className="text-2xl leading-none">{r.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-text-primary">{r.country}</span>
                  <StatusPill variant={sevVariant}>{r.severity}</StatusPill>
                  {/* i18n-defer: mock/sample data — geo-risk card copy seeded from fixtures */}
                  <span className="text-xs text-text-tertiary">{r.region}</span>
                </div>
                <div className="text-sm text-text-secondary mt-1">{r.event}</div>
              </div>
              <div className="text-right shrink-0">
                <Data
                  as="div"
                  className={`text-2xl font-semibold leading-none ${
                    sevVariant === 'danger'
                      ? 'text-danger'
                      : sevVariant === 'warning'
                        ? 'text-warning-hover'
                        : 'text-success'
                  }`}
                >
                  {r.score}
                </Data>
                <div className="text-[length:var(--fs-caption-1)] text-text-tertiary mt-0.5">
                  {t('risk.geo.riskScore')}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <div className="text-label text-text-tertiary uppercase mb-1">
                  {t('risk.geo.impact')}
                </div>
                <div className="text-sm text-text-secondary">{r.impact}</div>
                <div
                  className={`text-sm font-semibold mt-2 ${
                    sevVariant === 'danger' ? 'text-danger' : 'text-warning-hover'
                  }`}
                >
                  {r.exposure}
                </div>
              </div>
              <div>
                <div className="text-label text-text-tertiary uppercase mb-1">
                  {t('risk.geo.affectedSuppliers')}
                </div>
                {r.suppliers.map((s) => (
                  <div key={s} className="text-sm text-text-primary">
                    • {s}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-label text-text-tertiary uppercase mb-1">
                  {t('risk.geo.mitigation')}
                </div>
                <div className="text-sm text-text-secondary mb-2">{r.mitigation}</div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill variant="neutral">
                    {t('risk.alt.probability')}: {r.probability}%
                  </StatusPill>
                  <StatusPill variant="neutral">{r.timeline}</StatusPill>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GeopoliticalTab;
