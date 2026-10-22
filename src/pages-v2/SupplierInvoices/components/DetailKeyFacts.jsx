/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierInvoice } from '@services/data/types' */
/** @import { useNextAct } from '@hooks/useVerbAvailability' */
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import NextActLine from '@components/ui-v2/NextActLine';
import { statusTone } from '@lib/statusTone';
import { fmtDate, fmtIDRFull } from '../utils';
import DueCell from './DueCell';

/**
 * @typedef {object} DetailKeyFactsProps
 * @property {SupplierInvoice} selected  The invoice the detail panel shows.
 * @property {ReturnType<typeof useNextAct>} nextAct  Who acts next on it (S2b).
 * @property {TFunction} t
 */

/**
 * The detail panel's key-facts section: PO, amount, submitted and due dates,
 * stage with the next-act line, channel, buyer contact, bank account, SAP FI
 * document and payment reference. Moved out of `SupplierInvoices.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<DetailKeyFactsProps>}
 */
const DetailKeyFacts = ({ selected, nextAct, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('supplierInvoices.section.keyFacts')}
    </h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.poReference')}</dt>
        <Data as="dd" className="text-text-primary">
          {selected.poNumber}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.amount')}</dt>
        <dd className="text-text-primary font-semibold">
          <Data>{fmtIDRFull(selected.amount)}</Data>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.submitted')}</dt>
        <dd className="text-text-primary font-medium">
          <Data>{fmtDate(selected.submittedDate)}</Data>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.dueDate')}</dt>
        <dd className="text-text-primary font-medium">
          <DueCell inv={selected} t={t} />
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.status')}</dt>
        <dd>
          <StatusPill variant={statusTone(selected.stage)}>{selected.stage}</StatusPill>
          <span className="mt-1 block">
            <NextActLine act={nextAct} testId="next-act-supplier-invoice" />
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.channel')}</dt>
        <dd className="text-text-primary font-medium">{selected.channel}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.buyerContact')}</dt>
        <dd className="text-text-primary font-medium">{selected.buyerContact}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.bankAccount')}</dt>
        <dd className="text-text-primary font-medium">{selected.bankAccount}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.sapFiDoc')}</dt>
        <Data
          as="dd"
          className={`text-xs ${selected.sapFiDoc ? 'text-success' : 'text-text-tertiary'}`}
        >
          {selected.sapFiDoc ?? t('supplierInvoices.field.pending')}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierInvoices.field.paymentRef')}</dt>
        <Data
          as="dd"
          className={`text-xs ${selected.paymentRef ? 'text-text-primary' : 'text-text-tertiary'}`}
        >
          {selected.paymentRef ?? t('supplierInvoices.field.pending')}
        </Data>
      </div>
    </dl>
  </section>
);

export default DetailKeyFacts;
