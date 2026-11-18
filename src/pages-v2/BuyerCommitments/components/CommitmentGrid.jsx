/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { gapColourThresholds } from '@services/transitions/forecastConfig';
import { thresholdPct } from '../utils';
import GridCell from './GridCell';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

/**
 * BR-01 / BR-02 — the grid of commitment against forecast: one row per
 * supplier × material, one column per period (oldest first), each cell a
 * `GridCell`. The hint states the administrator's colour thresholds in force
 * (BL-32), never a number written into the sentence.
 * @type {React.FC<{
 *   shown: readonly ForecastCommitmentLine[];
 *   rows: readonly ForecastCommitmentLine[];
 *   periods: readonly [string, string][];
 *   periodLabel: (bucket: string) => string;
 *   nowIso: string;
 * }>}
 */
const CommitmentGrid = ({ shown, rows, periods, periodLabel, nowIso }) => {
  const { t } = useTranslation();
  /**
   * @param {string} supplierId
   * @param {string} code
   * @param {string} period
   */
  const cell = (supplierId, code, period) =>
    shown.find(
      (l) => l.supplierId === supplierId && l.materialCode === code && l.periodBucket === period
    );
  return (
    <section className="mb-6" data-testid="fc-grid">
      <h2 className="text-section text-text-primary mb-2">{t('fc.pti.gaps.grid')}</h2>
      <p className="text-sm text-text-secondary mb-3">
        {t('fc.pti.gaps.gridHint', {
          green: thresholdPct(gapColourThresholds().greenFrom),
          amber: thresholdPct(gapColourThresholds().amberFrom)
        })}
      </p>
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <table className="text-sm min-w-full">
          <thead>
            <tr className="bg-bg-hover text-label text-text-tertiary uppercase">
              <th scope="col" className="text-left px-3 py-2 sticky left-0 bg-bg-hover">
                {t('fc.col.supplierMaterial')}
              </th>
              {periods.map(([p]) => (
                <th key={p} scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                  {periodLabel(p)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.supplierId}|${r.materialCode}`}
                className="border-t border-border-subtle"
              >
                <th
                  scope="row"
                  className="text-left px-3 py-2 sticky left-0 bg-bg-surface font-normal whitespace-nowrap"
                >
                  <div className="text-text-primary">{r.supplierName}</div>
                  <Data className="text-xs">{r.materialCode}</Data>
                </th>
                {periods.map(([p]) => (
                  <GridCell
                    key={p}
                    label={periodLabel(p)}
                    line={cell(r.supplierId, r.materialCode, p)}
                    nowIso={nowIso}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CommitmentGrid;
