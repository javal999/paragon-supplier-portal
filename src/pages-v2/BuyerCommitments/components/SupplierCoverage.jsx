/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import StatusPill from '@components/ui-v2/StatusPill';
import { coverageThresholds } from '@services/transitions/inventoryConfig';
import CoverageRow from './CoverageRow';
/** @import { ForecastCoverageRow } from '@services/data/types' */

/**
 * BR-07 — supplier coverage per material (CR-03), labelled an estimate: firm
 * demand, the coverage status and ratio, and the principal lead time for a
 * distributor. The hint states the administrator's ratio thresholds in force
 * (BL-32) in the page's language.
 * @type {React.FC<{ coverage: readonly ForecastCoverageRow[] }>}
 */
const SupplierCoverage = ({ coverage }) => {
  const { t, i18n } = useTranslation();
  /**
   * @param {number} n
   * @returns {string}
   */
  const ratioText = (n) =>
    n.toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-GB', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 3
    });
  return (
    <section data-testid="fc-coverage">
      <h2 className="text-section text-text-primary mb-2">
        {t('fc.pti.gaps.coverage')}{' '}
        <StatusPill variant="neutral" className="align-middle">
          {t('fc.pti.gaps.estimate')}
        </StatusPill>
      </h2>
      <p className="text-sm text-text-secondary mb-3">
        {t('fc.pti.gaps.coverageHint', {
          covered: ratioText(coverageThresholds().coveredFrom),
          atRisk: ratioText(coverageThresholds().atRiskFrom)
        })}
      </p>
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('fc.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.supplier')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.col.firmDemand')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.coverage')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.principalLeadTime')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {coverage.map((c) => (
              <CoverageRow key={`${c.supplierId}|${c.materialCode}`} row={c} />
            ))}
            {coverage.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-sm text-text-tertiary py-8">
                  {t('fc.pti.gaps.coverageNone')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default SupplierCoverage;
