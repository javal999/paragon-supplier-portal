/** @import React from 'react' */
/** @import { ExposureRow } from '@services/data/types' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { severityTone } from '@lib/statusTone';
import { dosVariant } from '../utils';
import SummaryStat from './SummaryStat';

/**
 * The "Supply exposure" tab body: a four-figure summary strip (exposed spend,
 * single-source critical, categories at risk, dual-sourced) over the exposure
 * table.
 *
 * Props: `exposure` (the fixture rows from `useExposure`).
 * @type {React.FC<{ exposure: ExposureRow[] }>}
 */
const ExposureTab = ({ exposure }) => {
  const { t } = useTranslation();
  const totalExposed = useMemo(
    () => exposure.filter((r) => r.risk !== 'low').reduce((s, r) => s + r.spend, 0),
    [exposure]
  );
  const singleSourceCritical = exposure.filter(
    (r) => !r.dualSource && r.risk === 'critical'
  ).length;
  const atRisk = exposure.filter((r) => r.risk !== 'low').length;
  const dualSourced = exposure.filter((r) => r.dualSource).length;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 px-5 py-4 border-b border-border-subtle">
        <SummaryStat
          label={t('risk.exposure.totalExposed')}
          value={`$${(totalExposed / 1000).toFixed(1)}M`}
          tone="danger"
        />
        <SummaryStat
          label={t('risk.exposure.singleSourceCritical')}
          value={singleSourceCritical.toString()}
          tone="danger"
        />
        <SummaryStat
          label={t('risk.exposure.categoriesAtRisk')}
          value={atRisk.toString()}
          tone="warning"
        />
        <SummaryStat
          label={t('risk.exposure.dualSourced')}
          value={dualSourced.toString()}
          tone="success"
        />
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('risk.exposure.col.category')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.region')}</TableHeaderCell>
          <TableHeaderCell className="text-right">
            {t('risk.exposure.col.annualSpend')}
          </TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.daysOfStock')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.risk')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.dualSource')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {exposure.map((row) => (
            <TableRow key={row.category + row.supplier}>
              <TableCell>
                <span className="font-semibold text-text-primary">{row.category}</span>
              </TableCell>
              <TableCell className="text-text-secondary">{row.supplier}</TableCell>
              <TableCell className="text-text-tertiary">{row.region}</TableCell>
              <TableCell className="text-right font-semibold text-text-primary">
                <Data>${(row.spend / 1000).toFixed(1)}M</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={dosVariant(row.dos)}>{row.dos}d</StatusPill>
              </TableCell>
              <TableCell>
                <StatusPill variant={severityTone(row.risk)}>{row.risk}</StatusPill>
              </TableCell>
              <TableCell>
                {row.dualSource ? (
                  <span className="text-success font-semibold">✓</span>
                ) : (
                  <span className="text-danger font-semibold">✗</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ExposureTab;
