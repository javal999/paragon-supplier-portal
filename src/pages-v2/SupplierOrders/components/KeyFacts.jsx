/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { NextAct } from '@services/transitions/nextAct' */
import StatusPill from '@components/ui-v2/StatusPill';
import NextActLine from '@components/ui-v2/NextActLine';
import Data from '@components/ui-v2/Data';
import { statusTone } from '@lib/statusTone';
import { poDisplayStatus } from '@services/data/poResponseProjection';
import { RespondByLine } from '../../orders/PoCollaboration';
import { fmtDate, fmtIDR } from '../utils';

/**
 * @typedef {object} KeyFactsProps
 * @property {PurchaseOrder} selected  The PO open in the panel (its open-time snapshot).
 * @property {PurchaseOrder | null} selectedLive  The same PO read from the live query, so the status follows a command.
 * @property {string} nowIso  The clock the display status and respond-by line are derived against.
 * @property {NextAct | null} nextAct  Who acts next on the PO's live status.
 * @property {TFunction} t
 */

/**
 * The order panel's Key Facts: dates, line count, value, the live status with
 * who acts next, the respond-by line and the channel. Moved out of
 * `SupplierOrders.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<KeyFactsProps>}
 */
const KeyFacts = ({ selected, selectedLive, nowIso, nextAct, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {t('supplierOrders.panel.keyFacts')}
    </h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-text-tertiary">{t('supplierOrders.col.orderDate')}</dt>
        <dd className="text-text-primary font-medium">
          <Data>{fmtDate(selected.orderDate)}</Data>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierOrders.col.requestedDelivery')}</dt>
        <dd className="text-text-primary font-medium">
          <Data>{fmtDate(selected.requestedDeliveryDate)}</Data>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierOrders.panel.lineItems')}</dt>
        <dd className="text-text-primary font-medium">{selected.lineItems.length}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierOrders.panel.totalValue')}</dt>
        <dd className="text-text-primary font-semibold">
          <Data>{fmtIDR(selected.totalValue)}</Data>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierOrders.col.status')}</dt>
        <dd>
          <StatusPill variant={statusTone(poDisplayStatus(selectedLive ?? selected, nowIso))}>
            {poDisplayStatus(selectedLive ?? selected, nowIso)}
          </StatusPill>
          {/* WHO ACTS NEXT — the answer the pill cannot give. A PO in
              `Confirmed` carries no footer verb and no handoff notice
              (there is no surfaceable atom to ask about), so before
              this line the supplier saw a status word and nothing
              else while both parties waited on S/4HANA. Derived from
              the CANONICAL state, never the pill's label. */}
          <span className="mt-1 block">
            <NextActLine act={nextAct} testId="next-act-supplier-po" />
          </span>
        </dd>
      </div>
      <div className="col-span-2">
        <RespondByLine po={selectedLive ?? selected} nowIso={nowIso} />
      </div>
      <div>
        <dt className="text-text-tertiary">{t('supplierOrders.panel.channel')}</dt>
        <dd className="text-text-primary font-medium">
          {/* i18n-defer: mock/sample data (fixture-derived channel value) */}
          {selected.channel}
        </dd>
      </div>
    </dl>
  </section>
);

export default KeyFacts;
