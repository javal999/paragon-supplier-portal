/** @import React from 'react' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate, formatDateTime } from '@lib/format';
import { ConfirmationPill, DeliveryPill, qty } from '../../callOffs/callOffDisplay';

/**
 * The facts at the top of one call-off's panel: supplier, PO, material, type,
 * quantity, need date, confirmation (and its deadline while awaited), delivery
 * and OTIF once measured. Moved out of `BuyerCallOffs.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<{ view: CallOffView }>}
 */
const CallOffFacts = ({ view }) => {
  const { t } = useTranslation();
  const c = view.callOff;
  return (
    <dl className="grid grid-cols-[150px_1fr] gap-y-2 text-sm">
      <dt className="text-text-tertiary">{t('co.col.supplier')}</dt>
      <dd className="text-text-primary">{c.supplierName}</dd>
      <dt className="text-text-tertiary">{t('co.col.po')}</dt>
      <dd>
        <Data>{c.poNumber}</Data>
      </dd>
      <dt className="text-text-tertiary">{t('co.col.material')}</dt>
      <dd>
        <Data className="text-text-tertiary">{c.materialCode}</Data> {c.description}
      </dd>
      <dt className="text-text-tertiary">{t('co.col.type')}</dt>
      <dd>{t(`co.type.${c.type}`)}</dd>
      <dt className="text-text-tertiary">{t('co.col.quantity')}</dt>
      <dd>
        <Data>{`${qty(c.quantity)} ${c.uom}`}</Data>
      </dd>
      <dt className="text-text-tertiary">{t('co.col.needDate')}</dt>
      <dd>
        <Data>{formatDate(c.needDate)}</Data>
      </dd>
      <dt className="text-text-tertiary">{t('co.col.confirmation')}</dt>
      <dd>
        <ConfirmationPill status={view.confirmation} />
      </dd>
      {view.deadline && c.status === 'Awaiting Confirmation' && (
        <>
          <dt className="text-text-tertiary">{t('co.col.confirmBy')}</dt>
          <dd>
            <Data>{formatDateTime(view.deadline.toISOString())}</Data>
          </dd>
        </>
      )}
      <dt className="text-text-tertiary">{t('co.col.delivery')}</dt>
      <dd>
        <DeliveryPill status={view.delivery} />
      </dd>
      {view.otif !== null && (
        <>
          <dt className="text-text-tertiary">{t('co.col.otif')}</dt>
          <dd data-testid="calloff-otif">
            {t(view.otif === 1 ? 'co.otif.met' : 'co.otif.missed')}
          </dd>
        </>
      )}
    </dl>
  );
};

export default CallOffFacts;
