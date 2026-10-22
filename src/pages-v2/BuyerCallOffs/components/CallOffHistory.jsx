/** @import React from 'react' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { LinkedAsn } from '../utils' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import CallOffDelays from '../../callOffs/CallOffDelays';
import { ToleranceFindings, qty } from '../../callOffs/callOffDisplay';
import { AsnPlannerMarkers } from '../../shipments/CallOffWarnings';

/**
 * MR-6 BR-12 / FU-7 — the planner's markers on one heads-up ASN.
 * @type {React.FC<{ asnNumber: string; linkedAsns: readonly LinkedAsn[] }>}
 */
const HeadsUpMarkers = ({ asnNumber, linkedAsns }) => {
  const linked = linkedAsns.find((l) => l.asn.asnNumber === asnNumber);
  return linked ? (
    <div className="mt-1">
      <AsnPlannerMarkers asn={linked.asn} warnings={linked.warnings} />
    </div>
  ) : null;
};

/**
 * What has happened to one call-off, in the panel under its facts: the
 * supplier's confirmation (with the tolerance rule applied, CR-05), the
 * rejection reason, the delays proposed for an LTP drop (DRC-5), the heads-ups
 * (with each ASN's markers) and the notes. Each part renders only when there is
 * something to show. Renders a fragment, so its sections sit in the panel as
 * before. Moved out of `BuyerCallOffs.jsx` by the Phase 5 page split (no
 * behaviour change).
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

      {/* DRC-5 (BL-191) — delays proposed for an LTP drop, and the supplier's answers. */}
      <CallOffDelays callOff={c} testId="calloff-delays" />

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
