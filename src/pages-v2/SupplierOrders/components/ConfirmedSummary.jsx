/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
import { CheckCircle2, ChevronRight } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import { fmtDate } from '../utils';

/**
 * @typedef {object} ConfirmedSummaryProps
 * @property {PurchaseOrder} selected  The PO just confirmed.
 * @property {string} confirmedAt  The time the confirm landed (HH:MM).
 * @property {string} deliveryDate  The confirmed delivery date (ISO).
 * @property {number | null} totalConfirmedQty  The confirmed total, or null when a cell did not read.
 * @property {string} notes  The note sent with the confirm.
 * @property {TFunction} t
 */

/**
 * The order panel's `confirmed` mode: the success block with the PO, the time,
 * the confirmed delivery date and total quantity, the Create ASN next step and
 * the note sent. Moved out of `SupplierOrders.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<ConfirmedSummaryProps>}
 */
const ConfirmedSummary = ({ selected, confirmedAt, deliveryDate, totalConfirmedQty, notes, t }) => (
  <section className="bg-success-soft border-l-2 border-success rounded px-4 py-3">
    <div className="flex items-center gap-2 mb-2">
      <CheckCircle2 size={16} className="text-success" />
      <div>
        <div className="text-sm font-bold text-success">
          {t('supplierOrders.panel.orderConfirmed')}
        </div>
        <div className="text-xs text-text-secondary">
          <Data>{selected.poNumber}</Data> · {t('supplierOrders.panel.confirmedAt')}{' '}
          <Data>{confirmedAt}</Data>
        </div>
      </div>
    </div>
    <dl className="grid grid-cols-3 gap-3 mt-3">
      <div className="bg-white rounded px-3 py-2 border border-border-subtle">
        <dt className="text-label text-text-tertiary uppercase mb-0.5">
          {t('supplierOrders.panel.deliveryShort')}
        </dt>
        <dd className="text-sm font-bold text-text-primary">
          <Data>{fmtDate(deliveryDate)}</Data>
        </dd>
      </div>
      <div className="bg-white rounded px-3 py-2 border border-border-subtle">
        <dt className="text-label text-text-tertiary uppercase mb-0.5">
          {t('supplierOrders.panel.totalQty')}
        </dt>
        <dd className="text-sm font-bold text-text-primary">
          <Data>
            {totalConfirmedQty !== null
              ? `${totalConfirmedQty.toLocaleString()} ${t('supplierOrders.units')}`
              : '—'}
          </Data>
        </dd>
      </div>
      <div className="bg-white rounded px-3 py-2 border border-border-subtle">
        <dt className="text-label text-text-tertiary uppercase mb-0.5">
          {t('supplierOrders.panel.next')}
        </dt>
        <dd className="text-sm font-bold text-teal-hover inline-flex items-center gap-1">
          {t('supplierOrders.action.createAsn')} <ChevronRight size={12} />
        </dd>
      </div>
    </dl>
    {notes && (
      <div className="mt-3 text-xs text-text-secondary bg-white rounded px-3 py-2 border border-border-subtle">
        {t('supplierOrders.panel.notesPrefix')} {notes}
      </div>
    )}
  </section>
);

export default ConfirmedSummary;
