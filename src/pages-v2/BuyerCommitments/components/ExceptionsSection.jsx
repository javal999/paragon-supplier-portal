/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import ExceptionRow from './ExceptionRow';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { Action } from '../const' */
/** @import { useReasonLabel } from '../../admin/reasonCodeDisplay' */

/**
 * BR-04 / BR-05 — the ranked exception list and the planner's actions: the
 * heading with its count, the hint, the Due column's rule stated once (a11y
 * finding 19), and the table, one `ExceptionRow` per exception or an empty row.
 * @type {React.FC<{
 *   exceptions: readonly ForecastCommitmentLine[];
 *   dueRule: string;
 *   daysOfSupplyOf: (code: string) => number | null;
 *   periodLabel: (bucket: string) => string;
 *   reasonLabel: ReturnType<typeof useReasonLabel>;
 *   nowIso: string;
 *   review: VerbAvailability;
 *   publish: VerbAvailability;
 *   onAction: (kind: Action['kind'], line: ForecastCommitmentLine) => void;
 * }>}
 */
const ExceptionsSection = ({
  exceptions,
  dueRule,
  daysOfSupplyOf,
  periodLabel,
  reasonLabel,
  nowIso,
  review,
  publish,
  onAction
}) => {
  const { t } = useTranslation();
  return (
    <section className="mb-6" data-testid="fc-exceptions">
      <h2 className="text-section text-text-primary mb-2">
        {t('fc.pti.gaps.exceptions', { count: exceptions.length })}
      </h2>
      <p className="text-sm text-text-secondary mb-1">{t('fc.pti.gaps.exceptionsHint')}</p>
      {/* A11y finding 19 — the Due column's rule, once and visible, outside the table so it is not read in every cell. */}
      <p className="text-xs text-text-tertiary mb-3" data-testid="fc-due-rule">
        {t('fc.pti.gaps.dueRuleNote', { due: t('fc.col.due'), rule: dueRule })}
      </p>
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell pin="left">#</TableHeaderCell>
            <TableHeaderCell pin="left">{t('fc.col.supplier')}</TableHeaderCell>
            <TableHeaderCell pin="left">{t('fc.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.period')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.col.forecastShort')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.col.commitmentShort')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.gap')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.due')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.daysOfSupply')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.actions')}</TableHeaderCell>
            {/* Zone shows as a pill under each row's period; the expander adds its definitions. */}
            <TableHeaderCell pin="right">
              <span className="sr-only">{t('fc.col.details')}</span>
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {exceptions.map((l, i) => (
              <ExceptionRow
                key={l.key}
                line={l}
                rank={i + 1}
                days={daysOfSupplyOf(l.materialCode)}
                periodLabel={periodLabel}
                reasonLabel={reasonLabel}
                nowIso={nowIso}
                review={review}
                publish={publish}
                onAction={onAction}
              />
            ))}
            {exceptions.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center text-sm text-text-tertiary py-8">
                  {t('fc.pti.gaps.noExceptions')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default ExceptionsSection;
