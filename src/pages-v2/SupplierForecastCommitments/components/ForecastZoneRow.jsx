/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import TableCell from '@components/ui-v2/TableCell';
import TableRow from '@components/ui-v2/TableRow';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import {
  CommitmentDeadline,
  CommitmentStatePill,
  ZonePill,
  qtyText
} from '../../forecasts/forecastDisplay';

/**
 * A Forecast-zone line's row (BR-08): the period, zone, forecast quantity and
 * due date, "acknowledge only" across the commitment columns, the state, and
 * Acknowledge while it is awaiting — or the handoff notice when the seat may
 * not acknowledge.
 * @type {React.FC<{
 *   l: ForecastCommitmentLine;
 *   label: string;
 *   nowIso: string;
 *   canAck: boolean;
 *   pending: boolean;
 *   ackAvail: VerbAvailability;
 *   onAcknowledge: (l: ForecastCommitmentLine) => void;
 * }>}
 */
const ForecastZoneRow = ({ l, label, nowIso, canAck, pending, ackAvail, onAcknowledge }) => {
  const { t } = useTranslation();
  return (
    <TableRow data-testid={`fc-sup-row-${l.materialCode}-${l.periodBucket}`}>
      <TableCell className="whitespace-nowrap">{label}</TableCell>
      <TableCell>
        <ZonePill zone={l.zone} />
      </TableCell>
      <TableCell className="text-right">
        <Data>{qtyText(l.forecastQty)}</Data>
      </TableCell>
      <TableCell>
        <CommitmentDeadline
          line={l}
          nowIso={nowIso}
          testId={`fc-due-${l.materialCode}-${l.periodBucket}`}
        />
      </TableCell>
      <TableCell colSpan={4}>
        <span className="text-xs text-text-tertiary">{t('fc.sup.ackOnly')}</span>
      </TableCell>
      <TableCell>
        <CommitmentStatePill line={l} nowIso={nowIso} />
      </TableCell>
      <TableCell>
        {l.state === 'awaiting' &&
          (canAck ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => onAcknowledge(l)}
              aria-label={t('fc.sup.acknowledgeFor', { period: label })}
            >
              {t('fc.sup.acknowledge')}
            </Button>
          ) : (
            <HandoffNotice availability={ackAvail} testId="handoff-forecast-acknowledge" />
          ))}
      </TableCell>
    </TableRow>
  );
};

export default ForecastZoneRow;
