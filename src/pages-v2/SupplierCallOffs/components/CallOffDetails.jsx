/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import {
  ConfirmationPill,
  DeliveryPill,
  ToleranceFindings,
  qty
} from '../../callOffs/callOffDisplay';

/**
 * The read-only top of the call-off panel: the key facts, the confirmation
 * on record with the tolerance rule that decided it, PTI's latest note and the
 * rejection reason. Renders siblings (a fragment) inside the panel's stack.
 * Moved out of `SupplierCallOffs.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{ selected: CallOffView }>}
 */
const CallOffDetails = ({ selected }) => {
  const { t } = useTranslation();
  return (
    <>
      <dl className="grid grid-cols-[150px_1fr] gap-y-2 text-sm">
        <dt className="text-text-tertiary">{t('co.col.po')}</dt>
        <dd>
          <Data>{selected.callOff.poNumber}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.col.material')}</dt>
        <dd>
          <Data className="text-text-tertiary">{selected.callOff.materialCode}</Data>{' '}
          {selected.callOff.description}
        </dd>
        <dt className="text-text-tertiary">{t('co.col.quantity')}</dt>
        <dd>
          <Data>{`${qty(selected.callOff.quantity)} ${selected.callOff.uom}`}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.col.needDate')}</dt>
        <dd>
          <Data>{formatDate(selected.callOff.needDate)}</Data>
        </dd>
        <dt className="text-text-tertiary">{t('co.col.type')}</dt>
        <dd>{t(`co.type.${selected.callOff.type}`)}</dd>
        <dt className="text-text-tertiary">{t('co.col.confirmation')}</dt>
        <dd>
          <ConfirmationPill status={selected.confirmation} />
        </dd>
        <dt className="text-text-tertiary">{t('co.col.delivery')}</dt>
        <dd>
          <DeliveryPill status={selected.delivery} />
        </dd>
      </dl>

      {selected.callOff.confirmation && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">
            {t('co.panel.confirmation')}
          </h3>
          <ul className="text-sm space-y-1">
            {selected.callOff.confirmation.deliveries.map((d, i) => (
              // eslint-disable-next-line react/no-array-index-key -- read-only snapshot of a confirmed schedule, rendered in stored order; deliveries carry no id and may share qty+date
              <li key={i}>
                <Data>{`${qty(d.quantity)} ${selected.callOff.uom}`}</Data> ·{' '}
                <Data>{formatDate(d.date)}</Data>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-text-tertiary">
            {t(`co.approval.${selected.callOff.confirmation.approval}`)}
          </p>
          {/* CR-05 — which rule applied to this answer, and why. */}
          {selected.tolerance && (
            <div className="mt-2">
              <ToleranceFindings
                check={selected.tolerance}
                uom={selected.callOff.uom}
                needDate={selected.callOff.needDate}
                testId="supplier-calloff-tolerance-applied"
              />
            </div>
          )}
        </section>
      )}

      {/* slice(-1) leaves at most one note; its timestamp `at` is its identity. */}
      {selected.callOff.notes
        .filter((n) => n.action === 'returned' || n.action === 'change')
        .slice(-1)
        .map((n) => (
          <section key={n.at}>
            <h3 className="text-label text-text-tertiary uppercase mb-2">{t('co.sup.fromPti')}</h3>
            <p className="text-sm text-text-primary">{n.text}</p>
          </section>
        ))}

      {selected.callOff.rejectionReason && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">
            {t('co.panel.rejection')}
          </h3>
          <p className="text-sm text-text-primary">{selected.callOff.rejectionReason}</p>
        </section>
      )}
    </>
  );
};

export default CallOffDetails;
