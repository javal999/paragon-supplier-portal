/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { qtyText } from '../../forecasts/forecastDisplay';
/** @import { ForecastCoverageRow } from '@services/data/types' */

/**
 * The supplier's lead-time cell: a distributor's principal lead time (and the
 * "cannot be bridged" pill when it is), or the manufacturer label.
 * @type {React.FC<{ row: ForecastCoverageRow }>}
 */
const LeadTimeCell = ({ row: c }) => {
  const { t } = useTranslation();
  return (
    <TableCell className="text-sm">
      {c.supplierType === 'distributor' ? (
        <>
          {t('fc.coverage.distributor', { days: c.principalLeadTimeDays ?? '—' })}
          {c.unbridgeable && (
            <StatusPill variant="danger" className="ml-2">
              {t('fc.coverage.unbridgeable')}
            </StatusPill>
          )}
        </>
      ) : (
        <span className="text-text-tertiary">{t('fc.coverage.manufacturer')}</span>
      )}
    </TableCell>
  );
};

/**
 * One supplier × material coverage row (BR-07, CR-03): the material and its
 * label, the supplier, firm demand with its unit, the coverage status pill with
 * the ratio when there is one, and the lead-time cell.
 * @type {React.FC<{ row: ForecastCoverageRow }>}
 */
const CoverageRow = ({ row: c }) => {
  const { t } = useTranslation();
  return (
    <TableRow data-testid={`fc-coverage-${c.supplierId}-${c.materialCode}`}>
      <TableCell>
        <Data>{c.materialCode}</Data>
        <div className="text-xs text-text-secondary">{c.materialLabel}</div>
      </TableCell>
      <TableCell className="text-sm text-text-primary">{c.supplierName}</TableCell>
      <TableCell className="text-right">
        <Data>{`${qtyText(c.firmDemandQty)} ${c.uom}`}</Data>
      </TableCell>
      <TableCell>
        <StatusPill
          variant={
            c.status === 'covered'
              ? 'success'
              : c.status === 'atRisk'
                ? 'warning'
                : c.status === 'uncovered'
                  ? 'danger'
                  : 'neutral'
          }
        >
          {t(`fc.coverage.${c.status}`)}
          {c.ratio !== null && (
            <>
              {' · '}
              <Data>{c.ratio.toFixed(2)}</Data>
            </>
          )}
        </StatusPill>
      </TableCell>
      <LeadTimeCell row={c} />
    </TableRow>
  );
};

export default CoverageRow;
