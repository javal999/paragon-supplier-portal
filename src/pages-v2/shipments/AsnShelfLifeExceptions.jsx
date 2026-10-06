// ────────────────────────────────────────────────────────────────────────────
// MR-6 d "Approver" — ASN exceptions: every ASN awaiting a shelf-life decision,
// with material, batch, expiry, ETA, months left and the supplier's reason.
// Quality approves (the ASN is submitted; the goods are received into blocked
// stock) or rejects with a reason (the ASN returns to the supplier as a draft).
//
// The atom is `asn:approve-shelf-life`, held by `compliance` only (AR-02,
// MAT-D6). A seat without it sees who decides, never a live button.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailabilities } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useAdvanceShipNoticeExceptionDecision } from '@services/query/commandHooks';
import { monthsLeftAt, shelfLifeExceptionOf } from '@services/transitions/fulfilmentRules';
/** @import { ASN } from '@services/data/types' */
import { monthsText } from './ShelfLifeParts';

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';

/** @type {React.FC<{ asn: ASN }>} */
const Decision = ({ asn }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const decide = useAdvanceShipNoticeExceptionDecision();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  /** @param {'approve' | 'reject'} decision */
  const run = (decision) =>
    decide.mutate(
      { asnNumber: asn.asnNumber, decision, ...(decision === 'reject' ? { reason } : {}) },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('fc.asn.shelfLife.decisionFailed', { asnNumber: asn.asnNumber }),
              description: refusalText(res.reason) ?? res.reason ?? ''
            });
            return;
          }
          toast({
            variant: 'success',
            title:
              decision === 'approve'
                ? t('fc.asn.shelfLife.approved', { asnNumber: asn.asnNumber })
                : t('fc.asn.shelfLife.rejected', { asnNumber: asn.asnNumber })
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('asn.denied.title'),
            description: t('asn.denied.desc')
          })
      }
    );
  return rejecting ? (
    <div className="space-y-2 min-w-[220px]">
      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('fc.asn.shelfLife.rejectReason', { asnNumber: asn.asnNumber })}
        </span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClass}
        />
      </label>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setRejecting(false)}>
          {t('supplierShipments.action.cancel')}
        </Button>
        <Button
          variant="outline"
          onClick={() => run('reject')}
          disabled={decide.isPending || reason.trim() === ''}
        >
          {t('fc.asn.shelfLife.reject')}
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex gap-2 justify-end">
      <Button variant="secondary" onClick={() => setRejecting(true)} disabled={decide.isPending}>
        {t('fc.asn.shelfLife.reject')}
      </Button>
      <Button variant="outline" onClick={() => run('approve')} disabled={decide.isPending}>
        {t('fc.asn.shelfLife.approve')}
      </Button>
    </div>
  );
};

/** @type {React.FC<{ asns: readonly ASN[] }>} */
const AsnShelfLifeExceptions = ({ asns }) => {
  const { t } = useTranslation();
  const verbs = useVerbAvailabilities(/** @type {const} */ ({ decide: 'asn:approve-shelf-life' }));
  const waiting = asns.filter((a) => a.status === 'Awaiting exception');
  return (
    <section
      data-testid="asn-shelf-life-queue"
      className="bg-bg-surface border border-border-subtle rounded-md p-4 space-y-3"
    >
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          {t('fc.asn.shelfLife.queue.title')}
        </h3>
        <p className="text-xs text-text-tertiary">{t('fc.asn.shelfLife.queue.desc')}</p>
      </div>
      {waiting.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t('fc.asn.shelfLife.queue.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-tertiary uppercase">
                <th className="text-left py-1 pr-2">{t('fc.asn.shelfLife.col.asn')}</th>
                <th className="text-left py-1 pr-2">{t('fc.asn.shelfLife.col.material')}</th>
                <th className="text-left py-1 pr-2">{t('fc.asn.shelfLife.col.batch')}</th>
                <th className="text-left py-1 pr-2">{t('fc.asn.shelfLife.col.expiry')}</th>
                <th className="text-left py-1 pr-2">{t('fc.asn.shelfLife.col.eta')}</th>
                <th className="text-left py-1 pr-2">{t('fc.asn.shelfLife.col.left')}</th>
                <th className="text-left py-1 pr-2">{t('fc.asn.shelfLife.col.reason')}</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {waiting.map((a) => {
                const view = shelfLifeExceptionOf(a);
                const lines = view?.request.lines ?? [];
                return (
                  <tr
                    key={a.asnNumber}
                    data-testid={`asn-shelf-life-row-${a.asnNumber}`}
                    className="border-t border-border-subtle align-top"
                  >
                    <td className="py-2 pr-2">
                      <Data>{a.asnNumber}</Data>
                    </td>
                    <td className="py-2 pr-2">
                      {lines.map((l) => (
                        <Data as="div" key={l.materialCode}>
                          {l.materialCode}
                        </Data>
                      ))}
                    </td>
                    <td className="py-2 pr-2">
                      {lines.map((l) => (
                        <Data as="div" key={l.materialCode}>
                          {l.lotNumber}
                        </Data>
                      ))}
                    </td>
                    <td className="py-2 pr-2">
                      {lines.map((l) => (
                        <Data as="div" key={l.materialCode}>
                          {formatDate(l.expiryDate)}
                        </Data>
                      ))}
                    </td>
                    <td className="py-2 pr-2">
                      <Data>{view ? formatDate(view.request.eta) : '—'}</Data>
                    </td>
                    <td className="py-2 pr-2 text-danger">
                      {lines.map((l) => (
                        <div key={l.materialCode}>
                          {t('fc.asn.shelfLife.months', {
                            months: view
                              ? monthsText(monthsLeftAt(view.request.eta, l.expiryDate))
                              : '—',
                            min: l.minMonths
                          })}
                        </div>
                      ))}
                    </td>
                    <td className="py-2 pr-2 text-text-primary">{view?.reason ?? ''}</td>
                    <td className="py-2 text-right">
                      {verbs.decide.kind === 'held' ? (
                        <Decision asn={a} />
                      ) : (
                        <HandoffNotice
                          availability={verbs.decide}
                          testId="handoff-asn-shelf-life"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AsnShelfLifeExceptions;
