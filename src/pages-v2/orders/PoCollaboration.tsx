import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circle, CircleDot, XCircle } from 'lucide-react';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatDate, formatDateTime, formatNumber } from '../../lib/format';
import type { PurchaseOrder } from '../../services/data/types';
import {
  completionMovedLater,
  isAwaitingResponse,
  isEscalated,
  lifecycleSteps,
  respondedLate,
  responseDeadline,
  type StepState,
} from '../../services/data/poResponseProjection';

// ─────────────────────────────────────────────────────────────────────────────
// Order collaboration read blocks shared by the PTI and supplier PO panels:
// the response deadline (REQ-E07-02), the response record, the shipping notice
// (REQ-E07-05) and the PO's steps (SC-02). Read-only; the actions stay on the
// pages that own them.
// ─────────────────────────────────────────────────────────────────────────────

const sectionTitle = 'text-label text-text-tertiary uppercase mb-3';

/** "Respond by <date time>" while a response is due; Escalated once it is late. */
export const RespondByLine: React.FC<{ po: PurchaseOrder; nowIso: string }> = ({ po, nowIso }) => {
  const { t } = useTranslation();
  if (!isAwaitingResponse(po)) {
    return respondedLate(po) ? (
      <div className="text-xs text-warning-hover" data-testid="po-responded-late">
        {t('oc.respondedLate')}
      </div>
    ) : null;
  }
  const escalated = isEscalated(po, nowIso);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="po-respond-by">
      <span className="text-text-tertiary">{t('oc.respondBy')}</span>
      <Data className={escalated ? 'text-danger font-semibold' : 'font-semibold'}>
        {formatDateTime(responseDeadline(po))}
      </Data>
      {escalated && (
        <>
          <StatusPill variant="danger">Escalated</StatusPill>
          <span className="text-xs text-text-secondary">{t('oc.escalated.hint')}</span>
        </>
      )}
    </div>
  );
};

const STEP_ICON: Record<StepState, typeof Check> = {
  done: Check,
  current: CircleDot,
  upcoming: Circle,
  blocked: XCircle,
};

const STEP_CLASS: Record<StepState, string> = {
  done: 'text-success border-success/40 bg-success-soft',
  current: 'text-action border-action bg-white font-semibold',
  upcoming: 'text-text-tertiary border-border-subtle bg-white',
  blocked: 'text-danger border-danger/40 bg-danger-soft font-semibold',
};

/** The PO lifecycle as steps, with the current step highlighted (SC-02). */
export const PoLifecycleSteps: React.FC<{ po: PurchaseOrder; asnCount: number }> = ({ po, asnCount }) => {
  const { t } = useTranslation();
  const steps = lifecycleSteps(po, asnCount);
  return (
    <section>
      <h3 className={sectionTitle}>{t('oc.steps.title')}</h3>
      <ol className="flex flex-wrap gap-2" data-testid="po-lifecycle-steps">
        {steps.map((step) => {
          const Icon = STEP_ICON[step.state];
          const current = step.state === 'current' || step.state === 'blocked';
          return (
            <li
              key={step.id}
              aria-current={current ? 'step' : undefined}
              data-step={step.id}
              data-state={step.state}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${STEP_CLASS[step.state]}`}
            >
              <Icon size={12} aria-hidden="true" />
              <span>{t(`oc.step.${step.id}`)}</span>
              <span className="sr-only">({t(`oc.stepState.${step.state}`)})</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

/** What the supplier answered, per line where it adjusted. */
export const PoResponseDetails: React.FC<{ po: PurchaseOrder }> = ({ po }) => {
  const { t } = useTranslation();
  const r = po.response;
  return (
    <section data-testid="po-response-details">
      <h3 className={sectionTitle}>{t('oc.response.title')}</h3>
      {!r ? (
        <p className="text-sm text-text-secondary">{t('oc.response.none')}</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={r.option === 'reject' ? 'danger' : r.option === 'adjust' ? 'warning' : 'success'}>
              {t(`oc.response.option.${r.option}`)}
            </StatusPill>
            <span className="text-text-tertiary">
              {t('oc.response.at')} <Data>{formatDateTime(r.respondedAt)}</Data>
            </span>
          </div>
          {r.confirmedDeliveryDate && (
            <div>
              <span className="text-text-tertiary">{t('oc.response.confirmedDate')}: </span>
              <Data>{formatDate(r.confirmedDeliveryDate)}</Data>
            </div>
          )}
          {r.lines && r.lines.length > 0 && (
            <div className="border border-border-subtle rounded-md overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">{t('oc.response.col.line')}</th>
                    <th className="text-right px-3 py-2 font-semibold">{t('oc.response.col.ordered')}</th>
                    <th className="text-right px-3 py-2 font-semibold">{t('oc.response.col.counterQty')}</th>
                    <th className="text-left px-3 py-2 font-semibold">{t('oc.response.col.counterDate')}</th>
                    <th className="text-left px-3 py-2 font-semibold">{t('oc.response.col.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.lines.map((l) => {
                    const item = po.lineItems.find((li) => li.id === l.lineId);
                    return (
                      <tr key={l.lineId} className="border-t border-border-subtle">
                        <td className="px-3 py-2">
                          <Data>{item?.materialCode ?? l.lineId}</Data>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Data>
                            {item ? `${formatNumber(item.quantity)} ${item.uom}` : '—'}
                          </Data>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Data>
                            {formatNumber(l.counterQty)} {item?.uom ?? ''}
                          </Data>
                        </td>
                        <td className="px-3 py-2">
                          <Data>{formatDate(l.counterDate)}</Data>
                        </td>
                        <td className="px-3 py-2 text-text-primary">
                          {t(`oc.reason.${l.reasonCode}`)}
                          {l.note ? ` — ${l.note}` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {r.rejectionCauses && r.rejectionCauses.length > 0 && (
            <div>
              <span className="text-text-tertiary">{t('oc.response.causes')}: </span>
              {r.rejectionCauses.map((c) => t(`oc.cause.${c}`)).join(', ')}
            </div>
          )}
          {r.comment && (
            <div>
              <span className="text-text-tertiary">{t('oc.response.comment')}: </span>
              {r.comment}
            </div>
          )}
          {r.review && (
            <div className="text-text-secondary" data-testid="po-review-outcome">
              {r.review.decision === 'accepted'
                ? t('oc.review.accepted')
                : t('oc.review.rejected', { comment: r.review.comment ?? '' })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

/** Shipment started (from the first ASN) and the expected completion date. */
export const ShippingNoticeDetails: React.FC<{ po: PurchaseOrder }> = ({ po }) => {
  const { t } = useTranslation();
  const n = po.shippingNotice;
  return (
    <div className="space-y-2 text-sm" data-testid="po-shipping-notice">
      <div>
        <span className="text-text-tertiary">{t('oc.shipping.startedOn')}: </span>
        {n?.startedOn ? (
          <>
            <Data>{formatDate(n.startedOn)}</Data>
            {n.startedByAsn && (
              <span className="text-text-tertiary">
                {' '}
                {t('oc.shipping.startedBy')} <Data>{n.startedByAsn}</Data>
              </span>
            )}
          </>
        ) : (
          <span className="text-text-secondary">{t('oc.shipping.notStartedYet')}</span>
        )}
      </div>
      <div>
        <span className="text-text-tertiary">{t('oc.shipping.expected')}: </span>
        {n?.expectedCompletionDate ? (
          <Data>{formatDate(n.expectedCompletionDate)}</Data>
        ) : (
          <span className="text-text-secondary">{t('oc.shipping.none')}</span>
        )}
      </div>
      {completionMovedLater(po) && (
        <div className="text-xs text-warning-hover" data-testid="po-completion-moved">
          {t('oc.shipping.movedLater', { date: formatDate(n?.previousCompletionDate) })}
        </div>
      )}
    </div>
  );
};
