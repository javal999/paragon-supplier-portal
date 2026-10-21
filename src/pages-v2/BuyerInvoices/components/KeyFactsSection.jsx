/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BuyerInvoice } from '@services/data/types' */
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import NextActLine from '@components/ui-v2/NextActLine';
import { formatIDR, formatDate } from '@lib/format';
import { STATUS_VARIANT } from '../const';

/**
 * @typedef {object} KeyFactsSectionProps
 * @property {BuyerInvoice} selected  The open invoice.
 * @property {React.ComponentProps<typeof NextActLine>['act']} nextAct
 *   Who acts next, from `useNextAct` over `lifecycleState` (S2a).
 * @property {TFunction} t
 */

/**
 * The panel's key facts: supplier, PO, amount, payment terms, due date,
 * approver, status (with the who-acts-next line) and channel. Moved out of
 * `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<KeyFactsSectionProps>}
 */
const KeyFactsSection = ({ selected, nextAct, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('buyerInvoices.section.keyFacts')}
    </h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.supplier')}</dt>
        <dd className="text-text-primary font-medium">{selected.supplierName}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.poReference')}</dt>
        <Data as="dd" className="text-text-primary">
          {selected.poNumber}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.amount')}</dt>
        <Data as="dd" className="text-text-primary font-semibold">
          {formatIDR(selected.amount)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.paymentTerms')}</dt>
        <dd className="text-text-primary font-medium">{selected.paymentTerms}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.dueDate')}</dt>
        <Data
          as="dd"
          className={`font-medium ${
            selected.status === 'Overdue' ? 'text-danger' : 'text-text-primary'
          }`}
        >
          {formatDate(selected.dueDate)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.approver')}</dt>
        <dd className="text-text-primary font-medium">{selected.approver}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.status')}</dt>
        <dd>
          <StatusPill variant={STATUS_VARIANT[selected.status]}>{selected.status}</StatusPill>
          <span className="mt-1 block">
            <NextActLine act={nextAct} testId="next-act-buyer-invoice" />
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerInvoices.field.channel')}</dt>
        <dd className="text-text-primary font-medium">{selected.channel}</dd>
      </div>
    </dl>
  </section>
);

export default KeyFactsSection;
