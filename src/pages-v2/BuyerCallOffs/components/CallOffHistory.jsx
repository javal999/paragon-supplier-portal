/** @import React from 'react' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { LinkedAsn } from '../utils' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { ToleranceFindings, qty } from '../../callOffs/callOffDisplay';
import HeadsUpMarkers from './HeadsUpMarkers';

/**
 * The read-only record sections of the call-off panel, in order: the
 * supplier's confirmation (with the CR-05 tolerance findings), the rejection
 * reason, the delivery heads-ups (with MR-6 ASN markers) and the notes. Each
 * section renders only when it has content.
 * @type {React.FC<{ view: CallOffView; linkedAsns: readonly LinkedAsn[] }>}
 */
const CallOffHistory = ({ view, linkedAsns }) => {
  const { t } = useTranslation();
  const c = view.callOff;
  return (
    <>
      {c.confirmation && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">
            {t('co.panel.confirmation')}
          </h3>
          <ul className="text-sm space-y-1">
            {/* Key: the date — a split confirmation is refused when both
                deliveries share a date (proposedDeliveries, 'splitDates'). */}
            {c.confirmation.deliveries.map((d) => (
              <li key={d.date}>
                <Data>{`${qty(d.quantity)} ${c.uom}`}</Data> · <Data>{formatDate(d.date)}</Data>
              </li>
            ))}
          </ul>
          {c.confirmation.comment && (
            <p className="mt-1 text-sm text-text-secondary">“{c.confirmation.comment}”</p>
          )}
          <p className="mt-1 text-xs text-text-tertiary">
            {t(`co.approval.${c.confirmation.approval}`)}
          </p>
          {/* CR-05 — the rule that put this confirmation where it is, and why. */}
          {view.tolerance && (
            <div className="mt-2">
              <ToleranceFindings
                check={view.tolerance}
                uom={c.uom}
                needDate={c.needDate}
                testId="calloff-tolerance-applied"
              />
            </div>
          )}
        </section>
      )}

      {c.rejectionReason && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">
            {t('co.panel.rejection')}
          </h3>
          <p className="text-sm text-text-primary">{c.rejectionReason}</p>
        </section>
      )}

      {view.headsUps.length > 0 && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">{t('co.panel.headsUps')}</h3>
          <ul className="text-sm space-y-1">
            {view.headsUps.map((h) => (
              <li key={h.ref}>
                <Data>{`${qty(h.quantity)} ${c.uom}`}</Data> ·{' '}
                {t('co.headsUp.line', {
                  shipped: formatDate(h.shippedDate),
                  arrival: formatDate(h.expectedArrival)
                })}
                {h.source === 'asn' && (
                  <>
                    {' '}
                    · <Data>{h.ref}</Data>
                  </>
                )}
                {h.source === 'asn' ? (
                  <HeadsUpMarkers asnNumber={h.ref} linkedAsns={linkedAsns} />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.notes.length > 0 && (
        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-2">{t('co.panel.notes')}</h3>
          <ul className="text-sm space-y-1">
            {/* CallOffNote has no id and `at` can repeat. Notes are append-only,
                oldest first, so the index is the note's sequence number. */}
            {c.notes.map((n, i) => (
              // eslint-disable-next-line react/no-array-index-key -- append-only notes: index is the note's sequence number
              <li key={i}>
                <span className="text-text-tertiary">{t(`co.note.${n.action}`)}:</span> {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
};

export default CallOffHistory;
