import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { formatDate } from '../../lib/format';
import type { RFQ } from '../../data/mockRfqs';
import type { AwardView } from '../../services/sourcing/views';
import type { AwardStatus } from '../../services/sourcing/types';
import type { VerbAvailability } from '../../services/transitions/handoff';
import { awardItemsOf, itemOfAwardLine } from '../../services/sourcing/awardShape';
import {
  awardCancelRefusal,
  awardSapMarkRefusal,
  othersInForceAfterCancel,
  trailOfViews,
} from '../../services/sourcing/awardStatus';
import { qty } from './rfxDisplay';
import { itemLabel } from './AwardPanel';

// ────────────────────────────────────────────────────────────────────────────
// THE RECORDED AWARDS OF ONE RFQ (RFx C3; NR-3 BR-09 to BR-11). Every award the
// event has had, newest first, each with its status (Active, Cancelled, Raised
// in SAP) derived from the appended trail — a cancelled award is kept and read,
// never removed (AR-08).
//
// "Cancel award" needs a reason, "Mark raised in SAP" the SAP document number.
// Each is offered on an ACTIVE award only, and only to a seat holding its atom;
// any other seat reads whose act it is, in the act's own slot (handoff, §76).
// The form's confirm is pre-checked with the verb's own rules
// (`awardCancelRefusal`, `awardSapMarkRefusal`), and the cancel verb — back to
// Closed, or staying Partly awarded — is picked with the function the policy
// refuses the wrong one by (`othersInForceAfterCancel`).
// ────────────────────────────────────────────────────────────────────────────

const STATUS_KEY: Record<AwardStatus, string> = {
  Active: 'rfqCompare.award.status.active',
  Cancelled: 'rfqCompare.award.status.cancelled',
  'Raised in SAP': 'rfqCompare.award.status.sapRaised',
};
const STATUS_VARIANT: Record<AwardStatus, 'success' | 'neutral' | 'info'> = {
  Active: 'success',
  Cancelled: 'neutral',
  'Raised in SAP': 'info',
};

export interface AwardRecordsProps {
  rfq: RFQ;
  /** Every award of this event, cancelled ones included. */
  awards: readonly AwardView[];
  supplierName: (supplierId: string) => string;
  cancelVerb: VerbAvailability;
  sapVerb: VerbAvailability;
  pending: boolean;
  onCancel: (award: AwardView, reason: string, partial: boolean) => void;
  onMarkSap: (award: AwardView, sapDocumentNo: string) => void;
}

export const AwardRecords: React.FC<AwardRecordsProps> = (props) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" data-testid="award-recorded">
      {props.awards.map((award) => (
        <AwardRecordCard key={award.id} {...props} award={award} />
      ))}
      <p className="text-xs text-text-tertiary">{t('rfx.award.noPo')}</p>
    </div>
  );
};

const AwardRecordCard: React.FC<AwardRecordsProps & { award: AwardView }> = (props) => {
  const { t } = useTranslation();
  const { award, supplierName } = props;
  return (
    <div className="border border-border-subtle rounded-md p-4 space-y-3" data-testid={`award-record-${award.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-secondary">
          {t('rfqCompare.award.record', { id: award.id, date: formatDate(award.awardedAt) })}
        </span>
        <span data-testid={`award-status-${award.id}`}>
          <StatusPill variant={STATUS_VARIANT[award.status]}>{t(STATUS_KEY[award.status])}</StatusPill>
        </span>
      </div>
      {award.lines.length > 0 ? (
        <AwardLinesTable rfq={props.rfq} award={award} supplierName={supplierName} />
      ) : (
        <p className="text-sm text-text-secondary" data-testid={`award-no-lines-${award.id}`}>
          {t('rfqCompare.award.noLines')}
        </p>
      )}
      {!!award.reason && <p className="text-sm text-text-secondary">{award.reason}</p>}
      {award.departedFromBestScore && (
        <p className="text-sm text-warning-hover" data-testid="award-departed">
          {t('rfx.award.departed')}
        </p>
      )}
      {award.notAwardedSupplierIds.length > 0 && (
        <p className="text-sm text-text-tertiary" data-testid="award-not-awarded">
          {t('rfx.award.notAwarded')}: {award.notAwardedSupplierIds.map((s) => supplierName(s)).join(', ')}
        </p>
      )}
      {!!award.cancellation && (
        <p className="text-sm text-text-secondary" data-testid={`award-cancelled-${award.id}`}>
          {t('rfqCompare.award.cancelledOn', {
            date: formatDate(award.cancellation.cancelledAt),
            reason: award.cancellation.reason,
          })}
        </p>
      )}
      {!!award.sapMark && (
        <p className="text-sm text-text-secondary" data-testid={`award-sap-${award.id}`}>
          {t('rfqCompare.award.sapRaisedAs', {
            doc: award.sapMark.sapDocumentNo,
            date: formatDate(award.sapMark.markedAt),
          })}
        </p>
      )}
      {award.status === 'Active' && <AwardRecordActions {...props} />}
    </div>
  );
};

/** One award's lines: item, supplier, share, quantity and the break. */
const AwardLinesTable: React.FC<{ rfq: RFQ; award: AwardView; supplierName: (id: string) => string }> = ({
  rfq,
  award,
  supplierName,
}) => {
  const { t } = useTranslation();
  const items = awardItemsOf(rfq);
  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfqCompare.award.col.item')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.share')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.qty')}</TableHeaderCell>
        <TableHeaderCell>{t('rfqCompare.award.col.break')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {award.lines.map((line) => {
          const item = itemOfAwardLine(items, line);
          const key = item?.key ?? (line.itemLineNo !== undefined ? String(line.itemLineNo) : line.itemCode);
          const uom =
            (line.itemLineNo !== undefined
              ? rfq.items?.find((i) => i.lineNo === line.itemLineNo)?.uom
              : rfq.lineItems?.find((l) => l.materialCode === line.itemCode)?.uom) ?? rfq.uom;
          return (
            <TableRow key={`${key}-${line.supplierId}`} data-testid={`award-line-${key}-${line.supplierId}`}>
              <TableCell className="text-sm">{item ? itemLabel(t, rfq, item) : line.itemCode || '—'}</TableCell>
              <TableCell>{supplierName(line.supplierId)}</TableCell>
              <TableCell>
                <Data>{line.sharePct}%</Data>
              </TableCell>
              <TableCell>
                <Data>
                  {qty(line.quantity)} {uom}
                </Data>
              </TableCell>
              <TableCell>
                <Data>{line.awardTierQty === undefined ? '—' : qty(line.awardTierQty)}</Data>
              </TableCell>
            </TableRow>
          );
        })}
      </tbody>
    </Table>
  );
};

const inputClass =
  'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';

/** Cancel (with a reason) and "Raised in SAP" (with the document number) on an active award. */
const AwardRecordActions: React.FC<AwardRecordsProps & { award: AwardView }> = ({
  award,
  awards,
  cancelVerb,
  sapVerb,
  pending,
  onCancel,
  onMarkSap,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'none' | 'cancel' | 'sap'>('none');
  const [reason, setReason] = useState('');
  const [sapNo, setSapNo] = useState('');
  const trail = trailOfViews(awards);
  const partial = othersInForceAfterCancel(award.id, awards, trail) > 0;
  const cancelBlocked = awardCancelRefusal({ awardId: award.id, reason, eventAwards: awards, trail, partial }) !== null;
  const sapBlocked =
    awardSapMarkRefusal({ awardId: award.id, sapDocumentNo: sapNo, eventAwards: awards, trail }) !== null;
  const close = () => {
    setMode('none');
    setReason('');
    setSapNo('');
  };

  if (mode === 'cancel' && cancelVerb.kind === 'held') {
    return (
      <div className="space-y-2" data-testid={`award-cancel-form-${award.id}`}>
        <label className="block text-xs font-semibold text-text-secondary" htmlFor={`award-cancel-reason-${award.id}`}>
          {t('rfqCompare.award.cancelReason')}
        </label>
        <input
          id={`award-cancel-reason-${award.id}`}
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-text-tertiary">
          {partial ? t('rfqCompare.award.cancelToPartly') : t('rfqCompare.award.cancelToClosed')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending || cancelBlocked}
            data-testid={`award-cancel-confirm-${award.id}`}
            onClick={() => {
              onCancel(award, reason.trim(), partial);
              close();
            }}
          >
            {t('rfqCompare.award.cancelConfirm')}
          </Button>
          <Button variant="secondary" onClick={close}>
            {t('rfqCompare.award.close')}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === 'sap' && sapVerb.kind === 'held') {
    return (
      <div className="space-y-2" data-testid={`award-sap-form-${award.id}`}>
        <label className="block text-xs font-semibold text-text-secondary" htmlFor={`award-sap-no-${award.id}`}>
          {t('rfqCompare.award.sapDocumentNo')}
        </label>
        <input
          id={`award-sap-no-${award.id}`}
          type="text"
          value={sapNo}
          onChange={(e) => setSapNo(e.target.value)}
          className={inputClass}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending || sapBlocked}
            data-testid={`award-sap-confirm-${award.id}`}
            onClick={() => {
              onMarkSap(award, sapNo.trim());
              close();
            }}
          >
            {t('rfqCompare.award.sapConfirm')}
          </Button>
          <Button variant="secondary" onClick={close}>
            {t('rfqCompare.award.close')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {cancelVerb.kind === 'held' ? (
        <Button variant="secondary" data-testid={`award-cancel-${award.id}`} onClick={() => setMode('cancel')}>
          {t('rfqCompare.award.cancel')}
        </Button>
      ) : (
        <HandoffNotice availability={cancelVerb} testId="handoff-rfq-award-cancel" />
      )}
      {sapVerb.kind === 'held' ? (
        <Button variant="secondary" data-testid={`award-sap-mark-${award.id}`} onClick={() => setMode('sap')}>
          {t('rfqCompare.award.sapMark')}
        </Button>
      ) : (
        <HandoffNotice availability={sapVerb} testId="handoff-rfq-award-sap" />
      )}
    </div>
  );
};
