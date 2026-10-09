/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableCell from '@components/ui-v2/TableCell';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
/** @import { ForecastCommitmentLine, ForecastVersionView } from '@services/data/types' */
import { ZonePill, qtyText } from '../../forecasts/forecastDisplay';

/**
 * The Changes tab (BR-06): what moved since the previous version — each
 * changed or added line of the shown materials, with the previous quantity,
 * the current one and the difference. Says so instead when this is the first
 * version or nothing changed.
 * @type {React.FC<{
 *   previous: ForecastVersionView | null;
 *   current: ForecastVersionView | null;
 *   changed: ForecastCommitmentLine[];
 *   added: ForecastCommitmentLine[];
 *   shownMaterials: string[];
 *   periodLabel: (bucket: string) => string;
 * }>}
 */
const ChangesTable = ({ previous, current, changed, added, shownMaterials, periodLabel }) => {
  const { t } = useTranslation();
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto"
      data-testid="fc-changes"
    >
      {!previous ? (
        <p className="text-sm text-text-tertiary py-8 text-center">
          {t('fc.changes.firstVersion')}
        </p>
      ) : changed.length + added.length === 0 ? (
        <p className="text-sm text-text-tertiary py-8 text-center">{t('fc.changes.none')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('fc.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.period')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.col.zone')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('fc.col.previous', { version: previous.version })}
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('fc.col.current', { version: current?.version ?? '' })}
            </TableHeaderCell>
            <TableHeaderCell className="text-right">{t('fc.col.change')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {[...changed, ...added]
              .filter((l) => shownMaterials.includes(l.materialCode))
              .sort(
                (a, b) =>
                  a.materialCode.localeCompare(b.materialCode) ||
                  a.periodStart.localeCompare(b.periodStart)
              )
              .map((l) => (
                <TableRow key={l.key} data-testid={`fc-change-${l.materialCode}-${l.periodBucket}`}>
                  <TableCell>
                    <Data>{l.materialCode}</Data>
                  </TableCell>
                  <TableCell>{periodLabel(l.periodBucket)}</TableCell>
                  <TableCell>
                    <ZonePill zone={l.zone} />
                  </TableCell>
                  <TableCell className="text-right">
                    {l.previousQty === null ? (
                      <span className="text-xs text-text-tertiary">{t('fc.changes.new')}</span>
                    ) : (
                      <Data>{qtyText(l.previousQty)}</Data>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Data>{qtyText(l.forecastQty)}</Data>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.previousQty === null ? (
                      '—'
                    ) : (
                      <Data>{`${l.forecastQty > l.previousQty ? '+' : ''}${qtyText(l.forecastQty - l.previousQty)}`}</Data>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default ChangesTable;
