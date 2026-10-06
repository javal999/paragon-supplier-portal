/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate } from '@lib/format';
import { useReceiptDiscrepancyResolve } from '@services/query/commandHooks';
/** @import { GoodsReceipt } from '@services/data/types' */
import { isOpenDispute } from '@services/transitions/fulfilmentRules';

// ─────────────────────────────────────────────────────────────────────────────
// DISPUTED RECEIPT DISCREPANCIES — REQ-E07-06 (MP side).
//
// The receipts whose discrepancy a supplier disputed and PTI has not resolved.
// The planner reads the supplier's comment and resolves with a comment of its
// own. Absent when there is nothing to resolve.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC<{ goodsReceipts: readonly GoodsReceipt[] }>} */
const ReceiptDisputesSection = ({ goodsReceipts }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const resolve = useReceiptDiscrepancyResolve();
  const availability = useVerbAvailability('receiptdiscrepancy:resolve');
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [comment, setComment] = useState('');

  const disputes = goodsReceipts.filter(isOpenDispute);
  if (disputes.length === 0) return null;
  const selected = disputes.find((g) => g.id === selectedId) ?? null;

  const doResolve = () => {
    if (!selected) return;
    const grNumber = selected.grNumber;
    resolve.mutate(
      { receiptId: selected.id, resolutionComment: comment.trim() },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('fc.grDispute.failed', { grNumber }),
              description: refusalText(res.reason) ?? res.reason ?? ''
            });
            return;
          }
          toast({ variant: 'success', title: t('fc.grDispute.success', { grNumber }) });
          setSelectedId(null);
          setComment('');
        },
        onError: () => toast({ variant: 'error', title: t('fc.grDispute.failed', { grNumber }) })
      }
    );
  };

  return (
    <section
      className="mb-6 border border-border-subtle rounded-lg bg-white overflow-hidden"
      data-testid="gr-receipt-disputes"
    >
      <div className="px-6 py-4 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" aria-hidden="true" />
          {t('fc.grDispute.heading')}
        </h2>
        <p className="mt-1 text-xs text-text-secondary">{t('fc.grDispute.subtitle')}</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('fc.grDispute.col.receipt')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.grDispute.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.grDispute.col.po')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.grDispute.col.comment')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.grDispute.col.answered')}</TableHeaderCell>
            <TableHeaderCell> </TableHeaderCell>
          </TableHeader>
          <tbody>
            {disputes.map((gr) => (
              <TableRow key={gr.id}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{gr.grNumber}</Data>
                </TableCell>
                <TableCell className="text-text-secondary">{gr.supplierName}</TableCell>
                <TableCell>
                  <Data className="text-text-secondary">{gr.poNumber}</Data>
                </TableCell>
                <TableCell className="text-text-primary text-sm">
                  {gr.discrepancyResponse?.comment}
                </TableCell>
                <TableCell>
                  <Data className="text-xs text-text-secondary">
                    {formatDate(gr.discrepancyResponse?.respondedAt)}
                  </Data>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {availability.kind === 'held' ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedId(gr.id);
                        setComment('');
                      }}
                    >
                      {t('fc.grDispute.action')}
                    </Button>
                  ) : (
                    <HandoffNotice
                      availability={availability}
                      testId="handoff-gr-dispute-resolve"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <SidePanel
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? t('fc.grDispute.panel.title', { grNumber: selected.grNumber }) : ''}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setSelectedId(null)}>
              {t('fc.grDispute.cancel')}
            </Button>
            <Button
              variant="outline"
              disabled={resolve.isPending || comment.trim() === ''}
              onClick={doResolve}
            >
              {t('fc.grDispute.confirm')}
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <div className="text-label text-text-tertiary uppercase mb-1">
                {t('fc.grDispute.panel.supplierSays')}
              </div>
              <p className="text-sm text-text-primary">{selected.discrepancyResponse?.comment}</p>
            </div>
            <div>
              <label
                htmlFor="gr-dispute-resolution"
                className="block text-label text-text-tertiary uppercase mb-1"
              >
                {t('fc.grDispute.comment')}
              </label>
              <textarea
                id="gr-dispute-resolution"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
              />
            </div>
          </div>
        )}
      </SidePanel>
    </section>
  );
};

export default ReceiptDisputesSection;
