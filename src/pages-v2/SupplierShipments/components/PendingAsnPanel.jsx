/** @import React from 'react' */
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { fmtDate } from '../utils';

/**
 * The "awaiting ASN" panel: one row per confirmed PO with no ASN yet, each
 * offering Create ASN — or, for a seat that does not hold `asn:create`, the
 * handoff notice in that slot.
 * @type {React.FC<{ pendingPOs: readonly PurchaseOrder[]; create: VerbAvailability; onCreateAsnForPO: (poId: string) => void }>}
 */
const PendingAsnPanel = ({ pendingPOs, create, onCreateAsnForPO }) => {
  const { t } = useTranslation();
  return (
    <section className="bg-warning-soft border-l-2 border-warning rounded-md px-4 py-3">
      <div className="text-sm font-semibold text-text-primary mb-3">
        {t(
          pendingPOs.length === 1
            ? 'supplierShipments.pending.awaiting.one'
            : 'supplierShipments.pending.awaiting.other',
          { count: pendingPOs.length }
        )}
      </div>
      <div className="flex flex-col gap-2">
        {pendingPOs.map((po) => {
          const first = po.lineItems[0];
          return (
            <div
              key={po.id}
              className="bg-bg-surface border border-border-subtle rounded-md px-3 py-2 grid grid-cols-1 sm:grid-cols-[140px_1fr_180px_140px] gap-3 items-center text-sm"
            >
              <Data className="font-bold text-text-primary">{po.poNumber}</Data>
              <span className="text-text-secondary">{first?.description ?? '—'}</span>
              <span className="text-text-tertiary text-xs whitespace-nowrap">
                {t('supplierShipments.pending.req')}{' '}
                <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
              </span>
              <div className="justify-self-end">
                {create.kind === 'held' ? (
                  <Button variant="outline" icon={Plus} onClick={() => onCreateAsnForPO(po.id)}>
                    {t('asn.create.action')}
                  </Button>
                ) : (
                  <HandoffNotice availability={create} testId="handoff-asn-create" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PendingAsnPanel;
