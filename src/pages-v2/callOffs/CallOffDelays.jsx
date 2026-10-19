/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@lib/format';
/** @import { CallOff, CallOffDelay } from '@services/data/types' */
/** @import { ActorAttribution } from '@lib/enforcement' */

// ─────────────────────────────────────────────────────────────────────────────
// DRC-5 (BL-191) — the delays proposed on one call-off because the LTP dropped,
// newest first, on both call-off screens: the dates, whether the supplier has
// answered and how, and when each side acted (the audit trail). Who acted is
// shown as recorded; with no person in the session it says so.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {ActorAttribution | undefined} a
 * @param {(k: string) => string} t
 */
const who = (a, t) =>
  a && a.kind === 'RESOLVED' ? a.person.displayName : t('co.delay.unattributed');

/** @type {React.FC<{ callOff: Pick<CallOff, 'delays'>; testId: string }>} */
const CallOffDelays = ({ callOff, testId }) => {
  const { t } = useTranslation();
  const delays = [...(callOff.delays ?? [])].reverse();
  if (delays.length === 0) return null;
  /** @param {CallOffDelay} d */
  const line = (d) => {
    const dates = { from: formatDate(d.fromNeedDate), to: formatDate(d.toNeedDate) };
    if (d.answer === 'approved') return t('co.delay.approved', dates);
    if (d.answer === 'rejected') return t('co.delay.rejected', dates);
    return t('co.delay.pending', dates);
  };
  return (
    <section data-testid={testId}>
      <h3 className="text-label text-text-tertiary uppercase mb-2">{t('co.delay.title')}</h3>
      <ul className="text-sm space-y-2">
        {delays.map((d) => (
          <li key={d.proposedAt} data-testid={`${testId}-${d.answer ?? 'pending'}`}>
            <p className="text-text-primary">{line(d)}</p>
            <p className="text-xs text-text-tertiary">
              {t('co.delay.proposedAt', { date: formatDateTime(d.proposedAt) })} ·{' '}
              {who(d.proposedBy, t)}
              {d.answeredAt ? (
                <>
                  {' · '}
                  {t('co.delay.answeredAt', { date: formatDateTime(d.answeredAt) })} ·{' '}
                  {who(d.answeredBy, t)}
                </>
              ) : null}
            </p>
            {d.reason ? <p className="text-xs text-text-secondary">“{d.reason}”</p> : null}
            {d.comment ? <p className="text-xs text-text-secondary">“{d.comment}”</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CallOffDelays;
