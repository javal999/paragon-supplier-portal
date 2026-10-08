/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
/** @import { StabilisedSeriesView } from '@services/data/types' */
import { held, meanOf, ratio } from '../utils';
import PeriodTable from './PeriodTable';

/**
 * One supplier × material row of the series table, and — when it is open — the
 * row under it that holds its weeks (`PeriodTable`).
 * `s` is the series. `open` is the key of the row whose weeks are shown (or
 * null) and `setOpen` changes it: the series table owns which row is open, so
 * opening one row closes the other.
 * @type {React.FC<{
 *   s: StabilisedSeriesView;
 *   open: string | null;
 *   setOpen: (key: string | null) => void;
 * }>}
 */
const SeriesRow = ({ s, open, setOpen }) => {
  const { t } = useTranslation();
  const key = `${s.supplierId}-${s.materialCode}`;
  const h = held(s);
  return (
    <>
      <TableRow data-testid={`stb-series-${key}`}>
        <TableCell>
          <div className="text-sm text-text-primary">{s.materialLabel}</div>
          <Data className="text-xs text-text-tertiary">{s.materialCode}</Data>
        </TableCell>
        <TableCell>{s.supplierName}</TableCell>
        <TableCell className="whitespace-nowrap">
          <Data>
            {t('stb.series.days', {
              firm: s.terms.firmDays,
              tradeOff: s.terms.tradeOffDays
            })}
          </Data>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <Data data-testid={`stb-held-${key}`}>{`${h.firm} · ${h.band} · ${h.damped}`}</Data>
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <Data>{`${ratio(meanOf(s.raw.masc))} → ${ratio(meanOf(s.stabilised.masc))}`}</Data>
        </TableCell>
        <TableCell>
          <Button
            variant="secondary"
            onClick={() => setOpen(open === key ? null : key)}
            // C2 (WCAG 4.1.2): the toggle says whether its weeks are shown.
            aria-expanded={open === key}
            data-testid={`stb-open-${key}`}
          >
            {open === key ? t('stb.series.hide') : t('stb.series.show')}
          </Button>
        </TableCell>
      </TableRow>
      {open === key && (
        <tr>
          <td colSpan={6} className="p-3 bg-bg-hover">
            <PeriodTable s={s} />
          </td>
        </tr>
      )}
    </>
  );
};

export default SeriesRow;
