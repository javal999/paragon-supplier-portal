/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { useNextAct } from '@hooks/useVerbAvailability' */
import StatusPill from '@components/ui-v2/StatusPill';
import NextActLine from '@components/ui-v2/NextActLine';
import { statusTone } from '@lib/statusTone';
import Data from '@components/ui-v2/Data';
import { poDisplayStatus } from '@services/data/poResponseProjection';
import { formatIDR, formatDate } from '@lib/format';
import { isOverdue } from '../utils';

/**
 * @typedef {object} PoKeyFactsProps
 * @property {PurchaseOrder} selectedPO  The PO the panel was opened on.
 * @property {PurchaseOrder | null} livePO  The same PO's live row; every fact reads it, so a review shows at once.
 * @property {string} nowIso  The orders clock, for the display status.
 * @property {ReturnType<typeof useNextAct>} nextAct  Who acts next on the PO.
 * @property {TFunction} t
 */

/**
 * The panel's key-facts list: order and delivery dates, total value, channel,
 * status with the next-act line, currency, Incoterms and payment terms. Moved
 * out of `BuyerOrders.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<PoKeyFactsProps>}
 */
const PoKeyFacts = ({ selectedPO, livePO, nowIso, nextAct, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('buyerOrders.panel.keyFacts')}
    </h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.orderDate')}</dt>
        <Data as="dd" className="text-text-primary font-medium">
          {formatDate((livePO ?? selectedPO).orderDate)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.deliveryDate')}</dt>
        <Data
          as="dd"
          className={`font-medium ${isOverdue(livePO ?? selectedPO) ? 'text-danger' : 'text-text-primary'}`}
        >
          {formatDate((livePO ?? selectedPO).requestedDeliveryDate)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.totalValue')}</dt>
        <Data as="dd" className="text-text-primary font-semibold">
          {formatIDR((livePO ?? selectedPO).totalValue)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.channel')}</dt>
        <dd className="text-text-primary font-medium">{(livePO ?? selectedPO).channel}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.status')}</dt>
        <dd>
          <StatusPill variant={statusTone(poDisplayStatus(livePO ?? selectedPO, nowIso))}>
            {poDisplayStatus(livePO ?? selectedPO, nowIso)}
          </StatusPill>
          {/* The buyer's half of the same silence. `Confirmed`,
              `Partially Delivered` and `Delivered` are all stranded
              on this machine — every exit is an S/4HANA goods
              movement — so the buyer watching a PO had a status word
              and no indication that the wait is SAP's, not the
              supplier's. Derived from the canonical state. */}
          <span className="mt-1 block">
            <NextActLine act={nextAct} testId="next-act-buyer-po" />
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.currency')}</dt>
        <dd className="text-text-primary font-medium">{(livePO ?? selectedPO).currency}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.incoterms')}</dt>
        {/* i18n-defer: hardcoded sample terms — Incoterms/payment-term codes kept verbatim (glossary: loanwords/codes) */}
        <dd className="text-text-primary font-medium">CIF Jakarta</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('buyerOrders.panel.field.paymentTerms')}</dt>
        <dd className="text-text-primary font-medium">Net 30</dd>
      </div>
    </dl>
  </section>
);

export default PoKeyFacts;
