/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import TermTip from '@components/forecast/TermTip';
import { formatDate } from '@lib/format';
/** @import { StabilisedSeriesView } from '@services/data/types' */
/** @import { PeriodResult } from '@services/engine/stabilise' */
import { qtyOf } from '../../materialPlan/planDisplay';
import { RULE_VARIANT } from '../const';
import { qty, weekLabel } from '../utils';

/**
 * One series' weeks (AC-03), opened from its row in the series table: the
 * engine's value, the last and first values the supplier saw, the damped value,
 * the allowed range, what would be published and the rule that set it.
 * `s` is the supplier × material series whose latest weeks are listed.
 * @type {React.FC<{ s: StabilisedSeriesView }>}
 */
const PeriodTable = ({ s }) => {
  const { t } = useTranslation();
  const key = `${s.supplierId}-${s.materialCode}`;
  return (
    <div className="overflow-x-auto" data-testid={`stb-detail-${key}`}>
      <h3 className="text-sm font-semibold text-text-primary mb-2">
        {t('stb.detail.title', { material: s.materialLabel, supplier: s.supplierName })}
      </h3>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('stb.detail.col.week')}</TableHeaderCell>
          <TableHeaderCell>
            <span className="inline-flex items-center gap-1">
              {t('stb.detail.col.zone')} <TermTip term="Firm" /> <TermTip term="Trade-off" />
            </span>
          </TableHeaderCell>
          <TableHeaderCell term="engineValue" />
          <TableHeaderCell term="lastPublished" />
          <TableHeaderCell term="firstPublished" />
          <TableHeaderCell term="dampedValue" />
          <TableHeaderCell term="allowedRange" />
          <TableHeaderCell term="toPublish" />
          <TableHeaderCell term="stabiliseRule" />
        </TableHeader>
        <tbody>
          {s.latest.map(
            /** @param {PeriodResult} p */ (p) => (
              <TableRow key={p.period} data-testid={`stb-week-${key}-${p.period}`}>
                <TableCell className="whitespace-nowrap">
                  <Data>{weekLabel(p.period)}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{formatDate(p.period)}</Data>
                  </div>
                </TableCell>
                <TableCell>{t(`stb.zone.${p.zone}`)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data data-testid={`stb-raw-${key}-${p.period}`}>{qty(p.raw, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data className="text-text-secondary">{qty(p.previous, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data className="text-text-secondary">{qty(p.first, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data className="text-text-secondary">{qty(p.damped, s.uom)}</Data>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {p.range ? (
                    <Data className="text-text-secondary">{`${qtyOf(p.range.low, s.uom)} – ${qtyOf(p.range.high, s.uom)}`}</Data>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data data-testid={`stb-published-${key}-${p.period}`}>
                    {qty(p.published, s.uom)}
                  </Data>
                </TableCell>
                <TableCell>
                  <StatusPill variant={RULE_VARIANT[p.rule]}>
                    <span data-testid={`stb-rule-${key}-${p.period}`}>
                      {t(`stb.rule.${p.rule}`)}
                    </span>
                  </StatusPill>
                  {p.beyondBand && p.rule !== 'override' && (
                    <div
                      className="text-xs text-warning-hover mt-1"
                      data-testid={`stb-reason-needed-${key}-${p.period}`}
                    >
                      {t('stb.detail.reasonNeeded')}
                    </div>
                  )}
                  {p.reason && <div className="text-xs text-text-secondary mt-1">{p.reason}</div>}
                  {p.previous !== null && p.awaitingCommitment && (
                    <div className="text-xs text-text-tertiary mt-1">
                      {t('stb.detail.recommit')}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default PeriodTable;
