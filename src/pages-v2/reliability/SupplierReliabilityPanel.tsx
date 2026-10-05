import React from 'react';
import { useTranslation } from 'react-i18next';
import LivenessPill from '@components/ui-v2/LivenessPill';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { useSupplierReliability } from '@services/query/hooks';
import { MissSplitLine, Rate, mascOf, pctOf } from './reliabilityDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S OWN RELIABILITY — REQ-E14-02 BR-07 / AC-03 (owner ENG-D3).
//
// A supplier sees its own confirmation rate, its commitment reliability, its
// delivered-on-the-confirmed-date figure (CFOT, BL-82), its missed lines by cause, and PTI's plan-change figure for ITS materials — and
// never another supplier's. That isolation is not enforced here: the service
// returns this supplier's row and nothing else (`getSupplierReliability`
// scopes before the page sees any data), so there is no other row to leak.
//
// Placed on the supplier's forecast page: it is the page every supplier with
// forecast lines reaches (the performance page shows an empty state for any
// supplier without authored scorecard figures), and PTI's plan-change figure
// belongs beside the plan it describes.
// ─────────────────────────────────────────────────────────────────────────────

const Tile: React.FC<{ label: string; children: React.ReactNode; testId: string }> = ({ label, children, testId }) => (
  <div className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3" data-testid={testId}>
    <div className="text-label text-text-tertiary uppercase mb-1">{label}</div>
    {children}
  </div>
);

const SupplierReliabilityPanel: React.FC = () => {
  const { t } = useTranslation();
  const query = useSupplierReliability(26);
  if (query.isPending || query.isError) return null;
  const row = query.data.items[0];

  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4" data-testid="rel-sup-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-section text-text-primary">{t('rel.sup.title')}</h2>
          <p className="text-xs text-text-secondary mt-1">{t('rel.sup.subtitle')}</p>
          {row && (
            <p className="text-xs text-text-tertiary mt-1">
              {t('rel.window.26')} · <Data>{formatDate(row.windowFrom)}</Data> – <Data>{formatDate(row.windowTo)}</Data>
            </p>
          )}
        </div>
        <LivenessPill capability="engineDataset" />
      </div>
      {!row ? (
        <p className="text-sm text-text-tertiary" data-testid="rel-sup-empty">
          {t('rel.sup.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Tile label={t('rel.kpi.confirmation')} testId="rel-sup-confirmation">
            <div className="text-lg font-semibold">
              <Rate value={pctOf(row.confirmation.rate)} />
            </div>
            <div className="text-xs text-text-tertiary">
              {t('rel.kpi.confirmation.sub', { confirmed: row.confirmation.confirmed, due: row.confirmation.due })}
            </div>
          </Tile>
          <Tile label={t('rel.kpi.commitment')} testId="rel-sup-commitment">
            <div className="text-lg font-semibold">
              <Rate value={pctOf(row.commitment.rate)} />
            </div>
            <div className="text-xs text-text-tertiary">{t('rel.kpi.commitment.sub')}</div>
          </Tile>
          <Tile label={t('rel.kpi.cfot')} testId="rel-sup-cfot">
            <div className="text-lg font-semibold">
              <Rate value={pctOf(row.cfot.rate)} />
            </div>
            <div className="text-xs text-text-tertiary">{t('rel.kpi.cfot.sub', { count: row.cfot.pos })}</div>
          </Tile>
          <Tile label={t('rel.kpi.misses')} testId="rel-sup-misses">
            <div className="text-lg font-semibold">
              <Data>{row.misses.total}</Data>
            </div>
            <MissSplitLine split={row.misses} />
          </Tile>
          <Tile label={t('rel.kpi.planChange')} testId="rel-sup-planchange">
            <div className="text-lg font-semibold">
              <Rate value={pctOf(row.planChange.share)} />
            </div>
            <div className="text-xs text-text-tertiary">
              {t('rel.kpi.planChange.sub', {
                changed: row.planChange.changedInsideLeadTime,
                schedules: row.planChange.schedules,
              })}
            </div>
            <div className="text-xs text-text-tertiary mt-1">
              {t('rel.col.masc')} <Rate value={mascOf(row.planChange.masc)} />
            </div>
          </Tile>
        </div>
      )}
    </section>
  );
};

export default SupplierReliabilityPanel;
