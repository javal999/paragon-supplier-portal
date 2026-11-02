/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { formatDate, formatIDR } from '@lib/format';
/** @import { RescheduleProposalView } from '@services/data/types' */
import { qtyOf } from '../../materialPlan/planDisplay';
import { pw, weekLabel } from '../utils';
import ProposalAction from './ProposalAction';
/** @import { ProposalActionContext } from './ProposalAction' */

/**
 * The warning and note pills under a proposal's position.
 * @type {React.FC<{ p: RescheduleProposalView }>}
 */
const ProposalFlags = ({ p }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {p.needsSupplierAgreement && (
        <StatusPill variant="warning">{t('rs.flag.agreement')}</StatusPill>
      )}
      {p.liability && <StatusPill variant="warning">{t('rs.flag.liability')}</StatusPill>}
      {p.bandLimited && <StatusPill variant="neutral">{t('rs.flag.band')}</StatusPill>}
      {p.lastOpenLineOnPo && <StatusPill variant="neutral">{t('rs.flag.lastLine')}</StatusPill>}
      {p.addsToPlanChange && <StatusPill variant="neutral">{t('rs.flag.planChange')}</StatusPill>}
    </div>
  );
};

/**
 * @typedef {object} ProposalTableProps
 * @property {readonly RescheduleProposalView[]} rows the proposals to list, in order
 * @property {boolean} selectable whether each row carries a select checkbox
 * @property {string} testPrefix the row `data-testid` prefix (`rs-relief`, `rs-shortage`, `rs-nosaving`)
 * @property {ReadonlySet<string>} selected the selected proposal ids
 * @property {(id: string) => void} onToggle select or unselect one proposal
 * @property {ProposalActionContext} action what each row's act needs
 */

/**
 * One proposal table — relief, shortage or no-saving: the order, now and
 * proposed, what it frees and saves, its cost, its position against the lead
 * time and the Firm zone, and its act.
 * @type {React.FC<ProposalTableProps>}
 */
const ProposalTable = ({ rows, selectable, testPrefix, selected, onToggle, action }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {selectable && <TableHeaderCell>{t('rs.col.select')}</TableHeaderCell>}
          <TableHeaderCell>{t('rs.col.rank')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.material')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.order')}</TableHeaderCell>
          <TableHeaderCell>{t('rs.col.now')}</TableHeaderCell>
          <TableHeaderCell term="rsProposed" />
          <TableHeaderCell term="rsFreed" />
          <TableHeaderCell term="rsSaving" />
          <TableHeaderCell term="rsChangeCost" />
          <TableHeaderCell term="rsPosition" />
          <TableHeaderCell>{t('rs.col.action')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {rows.map((p) => (
            <TableRow key={p.id} data-testid={`${testPrefix}-${p.id}`}>
              {selectable && (
                <TableCell className="align-top">
                  {/* A11y finding 15: the label carries the 44 px coarse-pointer tap area. */}
                  <label className="touch-target inline-flex">
                    <input
                      type="checkbox"
                      aria-label={t('rs.col.selectOne', { order: p.line.reference })}
                      checked={selected.has(p.id)}
                      onChange={() => onToggle(p.id)}
                      data-testid={`rs-select-${p.id}`}
                    />
                  </label>
                </TableCell>
              )}
              <TableCell className="align-top">
                <Data>{p.rank ?? '—'}</Data>
              </TableCell>
              <TableCell className="align-top">
                <div className="text-sm text-text-primary">{p.materialLabel}</div>
                <Data className="text-xs text-text-tertiary">{p.line.materialCode}</Data>
                <div className="text-xs text-text-secondary">{p.supplierName ?? '—'}</div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data>{p.line.reference}</Data>
                <div className="text-xs text-text-tertiary">{t(`rs.kind.${p.line.kind}`)}</div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data>{formatDate(p.line.date)}</Data>
                <div className="text-xs text-text-tertiary">
                  <Data>{`${qtyOf(p.line.quantity, p.uom)} ${p.uom}`}</Data>
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <StatusPill variant="neutral">{t(`rs.type.${p.type}`)}</StatusPill>
                <div className="text-xs mt-1" data-testid={`rs-proposed-${p.id}`}>
                  {p.proposedDate === null ? (
                    <span className="text-text-tertiary">{t('rs.proposed.cancel')}</span>
                  ) : (
                    <>
                      <Data>{formatDate(p.proposedDate)}</Data> ·{' '}
                      <Data>{`${qtyOf(p.proposedQuantity, p.uom)} ${p.uom}`}</Data>
                    </>
                  )}
                </div>
                <div className="text-xs text-text-tertiary">
                  {p.needWeek === null
                    ? t('rs.need.none')
                    : t('rs.need.week', { week: weekLabel(p.needWeek) })}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data data-testid={`rs-freed-${p.id}`}>
                  {t('rs.palletWeeks', { value: pw(p.overCapacityPalletWeeksFreed) })}
                </Data>
                <div className="text-xs text-text-tertiary">
                  {t('rs.freedAll', { value: pw(p.palletWeeksFreed) })}
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data data-testid={`rs-saving-${p.id}`}>
                  {formatIDR(Math.round(p.rentSavedIdr))}
                </Data>
                <div className="text-xs text-text-tertiary">
                  {t('rs.net')} <Data>{formatIDR(Math.round(p.netSavingIdr))}</Data>
                </div>
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <Data data-testid={`rs-penalty-${p.id}`}>
                  {formatIDR(Math.round(p.changePenaltyIdr))}
                </Data>
                {p.liability && (
                  <div className="text-xs text-warning-hover">{t('rs.liabilityNotPriced')}</div>
                )}
              </TableCell>
              <TableCell className="align-top">
                <div className="text-sm" data-testid={`rs-zone-${p.id}`}>
                  {t(`rs.zone.${p.zone}`)}
                </div>
                <div className="text-xs text-text-tertiary">
                  {t(p.insideLeadTime ? 'rs.lt.inside' : 'rs.lt.outside', {
                    days: p.daysAhead,
                    lead: p.leadTimeDays
                  })}
                </div>
                <ProposalFlags p={p} />
              </TableCell>
              <TableCell className="align-top">
                <ProposalAction p={p} {...action} />
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ProposalTable;
