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
import type { AwardView, RfpAwardView } from '../../services/sourcing/views';
import type { AwardEventType, AwardStatus } from '../../services/sourcing/types';
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
import { QualificationWarningsNote } from './eligibilityDisplay';

// ────────────────────────────────────────────────────────────────────────────
// THE RECORDED AWARDS OF ONE EVENT (RFx C3; NR-3 BR-09 to BR-11). Every award
// the event has had, newest first, each with its status (Active, Cancelled,
// Raised in SAP) derived from the appended trail — a cancelled award is kept
// and read, never removed (AR-08). An RFQ's awards and an RFP's (RFx D3) read
// through the same card; only the lines table differs (an item, or an option).
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

/** What a recorded award card reads, on either event type. */
type AnyAwardView = AwardView | RfpAwardView;

interface RecordActions<A extends AnyAwardView> {
  supplierName: (supplierId: string) => string;
  cancelVerb: VerbAvailability;
  sapVerb: VerbAvailability;
  pending: boolean;
  onCancel: (award: A, reason: string, partial: boolean) => void;
  onMarkSap: (award: A, sapDocumentNo: string) => void;
}

export interface AwardRecordsProps extends RecordActions<AwardView> {
  rfq: RFQ;
  /** Every award of this event, cancelled ones included. */
  awards: readonly AwardView[];
}

export const AwardRecords: React.FC<AwardRecordsProps> = ({ rfq, awards, ...actions }) => (
  <RecordList
    eventType="rfq"
    awards={awards}
    {...actions}
    departed={(a) => a.departedFromBestScore}
    renderLines={(award) => <AwardLinesTable rfq={rfq} award={award} supplierName={actions.supplierName} />}
  />
);

export interface RfpAwardRecordsProps extends RecordActions<RfpAwardView> {
  /** Every award of this RFP, cancelled ones included. */
  awards: readonly RfpAwardView[];
}

/** RFx D3 — the recorded awards of one RFP, per option, with cancel and SAP marking. */
export const RfpAwardRecords: React.FC<RfpAwardRecordsProps> = ({ awards, ...actions }) => (
  <RecordList
    eventType="rfp"
    awards={awards}
    {...actions}
    departed={() => false}
    renderLines={(award) => <RfpAwardLinesTable award={award} />}
  />
);

interface RecordListProps<A extends AnyAwardView> extends RecordActions<A> {
  eventType: AwardEventType;
  awards: readonly A[];
  departed: (award: A) => boolean;
  renderLines: (award: A) => React.ReactNode;
}

function RecordList<A extends AnyAwardView>(props: RecordListProps<A>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" data-testid="award-recorded">
      {props.awards.map((award) => (
        <AwardRecordCard key={award.id} {...props} award={award} />
      ))}
      <p className="text-xs text-text-tertiary">{t('rfx.award.noPo')}</p>
    </div>
  );
}

function AwardRecordCard<A extends AnyAwardView>(props: RecordListProps<A> & { award: A }): React.ReactElement {
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
        props.renderLines(award)
      ) : (
        <p className="text-sm text-text-secondary" data-testid={`award-no-lines-${award.id}`}>
          {t('rfqCompare.award.noLines')}
        </p>
      )}
      {!!award.reason && <p className="text-sm text-text-secondary">{award.reason}</p>}
      {/* BL-147 — the vendors awarded below the level on placeholder rules, as recorded. */}
      <QualificationWarningsNote
        kind="awarded"
        warnings={award.qualificationWarnings}
        supplierName={supplierName}
        {...(award.reason ? { reason: award.reason } : {})}
        testId={`award-qualification-${award.id}`}
      />
      {/* Material B4 (MR-2 BR-06, AC-05) — the compliance kept as shown at award. */}
      {!!award.complianceAtAward && award.complianceAtAward.length > 0 && (
        <p className="text-xs text-text-tertiary" data-testid={`award-compliance-at-${award.id}`}>
          {t('rfqCompare.award.complianceAtAward')}:{' '}
          {award.complianceAtAward
            .map((c) => `${supplierName(c.supplierId)} ${c.pct === null ? t('rfx.noHistory') : `${c.pct}%`}`)
            .join(', ')}
        </p>
      )}
      {props.departed(award) && (
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
}

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

/** One RFP award's lines: option, supplier, share, quantity and the quantity point. */
const RfpAwardLinesTable: React.FC<{ award: RfpAwardView }> = ({ award }) => {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfxa.pricing.col.option')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.share')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.award.col.qty')}</TableHeaderCell>
        <TableHeaderCell>{t('rfx.rfpAward.col.point')}</TableHeaderCell>
      </TableHeader>
      <tbody>
        {award.lines.map((line) => (
          <TableRow
            key={`${line.optionRef}-${line.supplierId}`}
            data-testid={`award-line-${line.optionRef}-${line.supplierId}`}
          >
            <TableCell className="text-sm">{line.optionTitle}</TableCell>
            <TableCell>{line.supplierName}</TableCell>
            <TableCell>
              <Data>{line.sharePct}%</Data>
            </TableCell>
            <TableCell>
              <Data>{qty(line.quantity)}</Data>
            </TableCell>
            <TableCell>
              <Data>{line.awardTierQty === undefined ? '—' : qty(line.awardTierQty)}</Data>
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
};

const inputClass =
  'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';

/** Cancel (with a reason) and "Raised in SAP" (with the document number) on an active award. */
function AwardRecordActions<A extends AnyAwardView>({
  eventType,
  award,
  awards,
  cancelVerb,
  sapVerb,
  pending,
  onCancel,
  onMarkSap,
}: RecordListProps<A> & { award: A }): React.ReactElement {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'none' | 'cancel' | 'sap'>('none');
  const [reason, setReason] = useState('');
  const [sapNo, setSapNo] = useState('');
  const trail = trailOfViews(awards);
  const partial = othersInForceAfterCancel(award.id, awards, trail) > 0;
  const cancelBlocked =
    awardCancelRefusal({ awardId: award.id, reason, eventAwards: awards, trail, partial, eventType }) !== null;
  const sapBlocked =
    awardSapMarkRefusal({ awardId: award.id, sapDocumentNo: sapNo, eventAwards: awards, trail }) !== null;
  const close = () => {
    setMode('none');
    setReason('');
    setSapNo('');
  };
  const cancelNote =
    eventType === 'rfp'
      ? partial
        ? 'rfx.rfpAward.cancelToPartly'
        : 'rfx.rfpAward.cancelToClosed'
      : partial
        ? 'rfqCompare.award.cancelToPartly'
        : 'rfqCompare.award.cancelToClosed';

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
        <p className="text-xs text-text-tertiary">{t(cancelNote)}</p>
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
        <HandoffNotice
          availability={cancelVerb}
          testId={eventType === 'rfp' ? 'handoff-rfp-award-cancel' : 'handoff-rfq-award-cancel'}
        />
      )}
      {sapVerb.kind === 'held' ? (
        <Button variant="secondary" data-testid={`award-sap-mark-${award.id}`} onClick={() => setMode('sap')}>
          {t('rfqCompare.award.sapMark')}
        </Button>
      ) : (
        <HandoffNotice
          availability={sapVerb}
          testId={eventType === 'rfp' ? 'handoff-rfp-award-sap' : 'handoff-rfq-award-sap'}
        />
      )}
    </div>
  );
}
