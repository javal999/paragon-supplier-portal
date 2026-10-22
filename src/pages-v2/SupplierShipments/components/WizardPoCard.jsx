/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { ASN, PurchaseOrder } from '@services/data/types' */
/** @import { AsnForm } from '../const' */
import { openLinesFor } from '../../shipments/asnLines';
import { poLineQuantityText } from '../../orders/poLineQuantity';
import { fmtDate, poSelection } from '../utils';

/**
 * One shippable PO as a pressable card at wizard step 1. Picking it seeds the
 * form's lines from the PO's open lines and clears the over-ship reason and
 * call-off; the picked card also shows supplier, delivery and channel.
 * @type {React.FC<{ po: PurchaseOrder; asns: readonly ASN[]; selected: boolean; updateForm: (patch: Partial<AsnForm>) => void }>}
 */
const WizardPoCard = ({ po, asns, selected, updateForm }) => {
  const { t } = useTranslation();
  const mat = po.lineItems[0];
  const openTotal = openLinesFor(po, asns).reduce((a, l) => a + l.open, 0);
  return (
    <button
      type="button"
      onClick={() => updateForm(poSelection(po, asns))}
      aria-pressed={selected}
      className={`text-left rounded-md p-4 border transition-colors ${
        selected
          ? 'border-action bg-action-soft'
          : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Data as="div" className="text-sm font-bold text-text-primary">
            {po.poNumber}
          </Data>
          <div className="text-sm text-text-secondary mt-1">{mat?.description ?? '—'}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-text-tertiary">
            {t('supplierShipments.wizard.select.qty')}{' '}
            <Data>{mat ? poLineQuantityText(t, mat) : '—'}</Data>
          </div>
          <div className="text-xs text-text-tertiary">
            {t('supplierShipments.wizard.select.delivery')}{' '}
            <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
          </div>
          <div className="text-xs text-text-tertiary">
            {t('fc.asn.select.open')}{' '}
            <Data>{mat ? `${openTotal.toLocaleString()} ${mat.uom}` : '—'}</Data>
          </div>
        </div>
      </div>
      {selected && (
        <div className="mt-3 pt-3 border-t border-teal/30 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-text-secondary">
          <div>
            <strong className="text-text-primary">
              {t('supplierShipments.wizard.select.supplier')}
            </strong>{' '}
            {po.supplierName}
          </div>
          <div>
            <strong className="text-text-primary">
              {t('supplierShipments.wizard.select.requestedDelivery')}
            </strong>{' '}
            <Data>{fmtDate(po.requestedDeliveryDate)}</Data>
          </div>
          <div>
            <strong className="text-text-primary">
              {t('supplierShipments.wizard.select.deliveryAddress')}
            </strong>{' '}
            {/* i18n-defer: mock/sample data (delivery address) */}
            NDC Jatake 6, Tangerang
          </div>
          <div>
            <strong className="text-text-primary">
              {t('supplierShipments.wizard.select.channel')}
            </strong>{' '}
            {po.channel}
          </div>
        </div>
      )}
    </button>
  );
};

export default WizardPoCard;
