/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { formatDate, formatNumber } from '@lib/format';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useDemandAnticipation } from '@services/query/hooks';
import { supplyGapRows } from '@services/transitions/supplyBelowDemandRules';
/** @import { SupplyGapRow } from '@services/transitions/supplyBelowDemandRules' */
import { draftNeedDate } from '../../orderPlan/orderPlanRelease';
import { useDraftGapCallOff, gapDraftKey } from '../hooks/useDraftGapCallOff';
import { weekLabel } from '../utils';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-12 (BL-181) — "Below demand anticipation" on What to order, brief §6.
//
// Its own section, separate from the engine's recommended orders: the engine
// nets only its own synthetic PO lines, not hub call-offs (ENG-B19), so mixing
// the two lists would count supply twice. It reads the demand anticipation
// read (`getDemandAnticipation`, with CAP-12's open supply, gap and proposal
// per week) — no new service method — and lists every week with a gap.
//
// Each gap shows its proposal (BR-02, BR-03): a call-off on the oldest blanket
// line with balance, then the next, each with "Create draft call-off" (the
// existing draft verb, `useDraftGapCallOff`); and "New PO needed" for what no
// line covers, which the planner raises in SAP (CAP-D4: the hub recommends).
// Each row links to the supplier × material on the Demand anticipation page.
//
// Every input is the hub's sample data (the sample LTP, SAP stock fixtures and
// the hub's POs and call-offs), and the section says so in its own line. Not
// with the "Sample data" badge: What to order carries ONE simulated-data
// banner and no badge (FUX A4, F-14, `forecastUxA4.test.jsx`), and that banner
// already covers this section; the line adds where these figures come from.
// ─────────────────────────────────────────────────────────────────────────────

/** @param {SupplyGapRow} g */
const rowKeyOf = (g) => `${g.supplierId}-${g.materialCode}-${g.week}`;

/**
 * @param {{ today: string }} props
 * @returns {React.ReactNode}
 */
const BelowDemandSection = ({ today }) => {
  const { t } = useTranslation();
  const query = useDemandAnticipation();
  const planAvailability = useVerbAvailability('calloff:plan');
  const { drafted, pending, createDraft } = useDraftGapCallOff(today);
  const gaps = supplyGapRows(query.data?.items ?? []);

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="op-below-demand"
    >
      <h2 className="text-section text-text-primary mb-1">{t('supplyGap.title')}</h2>
      <p className="text-xs text-warning-hover mb-1" data-testid="op-below-demand-sample">
        {t('supplyGap.sample')}
      </p>
      <p className="text-xs text-text-tertiary mb-1">{t('supplyGap.intro')}</p>
      <p className="text-xs text-text-tertiary mb-3">{t('supplyGap.basis')}</p>
      {query.isPending ? (
        <p className="text-sm text-text-tertiary py-4" data-testid="op-below-demand-loading">
          {t('loadingState.title')}
        </p>
      ) : query.isError ? (
        <p className="text-sm text-danger py-4" role="alert" data-testid="op-below-demand-error">
          {t('errorState.subtitle')}
        </p>
      ) : gaps.length === 0 ? (
        <p
          className="text-sm text-text-tertiary py-6 text-center"
          data-testid="op-below-demand-empty"
        >
          {t('supplyGap.empty')}
        </p>
      ) : (
        <>
          <p className="text-xs text-text-secondary mb-2" data-testid="op-below-demand-count">
            {t('supplyGap.count', { count: gaps.length })}
          </p>
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('supplyGap.col.supplier')}</TableHeaderCell>
              <TableHeaderCell>{t('supplyGap.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('supplyGap.col.week')}</TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('supplyGap.col.demandAnticipation')}
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('supplyGap.col.openSupply')}
              </TableHeaderCell>
              <TableHeaderCell className="text-right">{t('supplyGap.col.gap')}</TableHeaderCell>
              <TableHeaderCell>{t('supplyGap.col.proposal')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {gaps.map((g) => {
                const key = rowKeyOf(g);
                const href = `/buyer/demand-anticipation?supplier=${encodeURIComponent(g.supplierId)}&material=${encodeURIComponent(g.materialCode)}`;
                return (
                  <TableRow key={key} data-testid={`op-gap-${key}`}>
                    <TableCell className="align-top">{g.supplierName}</TableCell>
                    <TableCell className="align-top">
                      <Link
                        to={href}
                        className="text-action-hover underline"
                        data-testid={`op-gap-link-${key}`}
                        aria-label={t('supplyGap.open', {
                          material: g.materialCode,
                          supplier: g.supplierName
                        })}
                      >
                        <Data className="text-action-hover">{g.materialCode}</Data>
                      </Link>
                      <div className="text-xs text-text-tertiary">{g.materialLabel}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Data>{weekLabel(g.week)}</Data>
                      <div className="text-xs text-text-tertiary">
                        <Data className="text-text-tertiary">{formatDate(g.week)}</Data>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Data>{formatNumber(g.demandAnticipation)}</Data>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Data>{formatNumber(g.openSupply)}</Data>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Data
                        className="font-semibold text-warning-hover"
                        data-testid={`op-gap-qty-${key}`}
                      >
                        {formatNumber(g.gap)}
                      </Data>
                    </TableCell>
                    <TableCell className="align-top">
                      <ul className="space-y-2">
                        {g.proposal.callOffs.map((c, i) => {
                          const dKey = gapDraftKey(g, c);
                          return (
                            <li key={dKey} data-testid={`op-gap-calloff-${key}-${c.poNumber}`}>
                              <div className="text-sm text-text-primary">
                                {t('supplyGap.proposal.callOff', {
                                  qty: formatNumber(c.qty),
                                  po: c.poNumber
                                })}{' '}
                                <span className="text-xs text-text-tertiary">
                                  (
                                  {i === 0
                                    ? t('supplyGap.proposal.oldest')
                                    : t('supplyGap.proposal.next')}
                                  )
                                </span>
                              </div>
                              {drafted.has(dKey) ? (
                                <StatusPill variant="success">
                                  {t('supplyGap.action.drafted')}
                                </StatusPill>
                              ) : planAvailability.kind === 'held' ? (
                                <div className="mt-1">
                                  <Button
                                    variant="outline"
                                    onClick={() => void createDraft(g, c)}
                                    disabled={pending}
                                    data-testid={`op-gap-draft-${key}-${c.poNumber}`}
                                  >
                                    {t('supplyGap.action.draft')}
                                  </Button>
                                  <div className="text-xs text-text-tertiary mt-1">
                                    {t('supplyGap.action.needDate', {
                                      date: formatDate(draftNeedDate(g.week, today))
                                    })}{' '}
                                    · {t('supplyGap.action.releaseNote')}
                                  </div>
                                </div>
                              ) : (
                                <HandoffNotice
                                  availability={planAvailability}
                                  testId="handoff-orderplan-gap-draft"
                                />
                              )}
                            </li>
                          );
                        })}
                        {g.proposal.newPoQty > 0 ? (
                          <li data-testid={`op-gap-newpo-${key}`}>
                            <StatusPill variant="warning">
                              {t('supplyGap.proposal.newPo', {
                                qty: formatNumber(g.proposal.newPoQty),
                                uom: g.uom
                              })}
                            </StatusPill>
                            <div className="text-xs text-text-tertiary mt-1 max-w-[18rem]">
                              {t('supplyGap.proposal.newPoHint')}
                            </div>
                          </li>
                        ) : null}
                      </ul>
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </>
      )}
    </section>
  );
};

export default BelowDemandSection;
