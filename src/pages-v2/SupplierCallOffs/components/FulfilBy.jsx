/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { sdcClock } from '@services/sdc';
/** @import { CallOff } from '@services/data/types' */
import { fulfilmentWindow } from '@services/transitions/fulfilmentWindow';

/**
 * PEX-10 (BL-273) — the fulfilment window on the supplier's confirmation:
 * "Fulfil by 3 Dec 2026 (lead time 28 days)", counted from the confirmation
 * date with the material's lead time (DRC-6).
 *
 * Before the supplier confirms (Awaiting Confirmation), the same window counted
 * from today, labelled as such, so the supplier sees what confirming commits it
 * to. A call-off with no confirmation and no answer due (rejected) shows
 * nothing. A material with no lead time on record says so instead of a date.
 * @type {React.FC<{ callOff: CallOff; testId?: string }>}
 */
const FulfilBy = ({ callOff, testId }) => {
  const { t } = useTranslation();
  const confirmedAt = callOff.confirmation?.confirmedAt;
  const awaiting = callOff.status === 'Awaiting Confirmation' && !callOff.confirmation;
  if (!confirmedAt && !awaiting) return null;
  const window = fulfilmentWindow(confirmedAt ?? sdcClock.now(), callOff.leadTimeDays);
  const className = 'mt-1 text-[length:var(--fs-label-3)] text-text-secondary';
  if (!window)
    return (
      <div className={className} data-testid={testId} data-sla="no-lead-time">
        {t('co.sla.noLeadTime')}
      </div>
    );
  const date = <Data className="whitespace-nowrap">{formatDate(window.by)}</Data>;
  return (
    <div className={className} data-testid={testId} data-sla={confirmedAt ? 'confirmed' : 'today'}>
      {t(confirmedAt ? 'co.sla.fulfilBy' : 'co.sla.ifConfirmedToday')} {date}{' '}
      {t('co.sla.leadTime', { count: window.leadTimeDays })}
    </div>
  );
};

export default FulfilBy;
