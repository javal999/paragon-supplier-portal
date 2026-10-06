/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { NextAct } from '@services/transitions/nextAct' */
import StatusPill from '@components/ui-v2/StatusPill';
import NextActLine from '@components/ui-v2/NextActLine';
import Data from '@components/ui-v2/Data';
import { formatDate, formatIDR, formatNumber } from '@lib/format';
import { DraftRevisionNote } from '../../rfx/draftEdit';
import { STATUS_VARIANT } from '../const';
import { categoryLabel } from '../utils';

/**
 * The side panel's summary: category, status with who acts next, created
 * (and last edited), deadlines, quantity, estimated value, currency and terms.
 * Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{ selectedRfq: RFQ; nextAct: NextAct | null; t: TFunction }>}
 */
const RfqSummary = ({ selectedRfq, nextAct, t }) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">{t('sourcing.panel.summary')}</h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.category')}</dt>
        <dd className="text-text-primary font-medium">
          {categoryLabel(t, selectedRfq.materialCategory)}
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.status')}</dt>
        <dd>
          <StatusPill variant={STATUS_VARIANT[selectedRfq.status]}>{selectedRfq.status}</StatusPill>
          <span className="mt-1 block">
            <NextActLine act={nextAct} testId="next-act-buyer-rfq" />
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.created')}</dt>
        <Data as="dd" className="text-text-primary font-medium">
          {formatDate(selectedRfq.createdAt)}
        </Data>
        <DraftRevisionNote revisions={selectedRfq.revisions} testId="rfq-last-edited" />
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.responseDeadline')}</dt>
        <Data as="dd" className="text-text-primary font-medium">
          {formatDate(selectedRfq.responseDeadline)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.awardDeadline')}</dt>
        <Data as="dd" className="text-text-primary font-medium">
          {formatDate(selectedRfq.awardDeadline)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.totalQty')}</dt>
        <Data as="dd" className="text-text-primary font-medium">
          {formatNumber(selectedRfq.totalQty)} {selectedRfq.uom}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.estValue')}</dt>
        <Data as="dd" className="text-text-primary font-semibold">
          {formatIDR(selectedRfq.estimatedValue)}
        </Data>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.currency')}</dt>
        <dd className="text-text-primary font-medium">{selectedRfq.currency}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.incoterms')}</dt>
        <dd className="text-text-primary font-medium">{selectedRfq.incoterms}</dd>
      </div>
      <div>
        <dt className="text-text-tertiary">{t('sourcing.panel.field.paymentTerms')}</dt>
        <dd className="text-text-primary font-medium">{selectedRfq.paymentTerms}</dd>
      </div>
    </dl>
  </section>
);

export default RfqSummary;
