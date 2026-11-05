/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { CommitmentDeadline, CommitmentStatePill, ZonePill } from '../../forecasts/forecastDisplay';
import { CELL, DemandCell, HEAD } from './gridCells';

/**
 * PEX-2 (BL-265) — one acknowledge-only period (the later weeks of Zone
 * Capacity, BR-08) as a COLUMN of the grid: the period, zone, ordered quantity
 * and due date; no fulfilment window (an acknowledgement commits to nothing);
 * "acknowledge only" across the three commitment rows; the state, and
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
const AcknowledgeColumn = ({ l, label, nowIso, canAck, pending, ackAvail, onAcknowledge }) => {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={label}
      className="contents"
      data-testid={`fc-sup-row-${l.materialCode}-${l.periodBucket}`}
    >
      <div className={HEAD}>{label}</div>
      <div className={CELL}>
        <ZonePill zone={l.zone} />
      </div>
      <DemandCell l={l} label={label} />
      <div className={CELL}>
        <CommitmentDeadline
          line={l}
          nowIso={nowIso}
          testId={`fc-due-${l.materialCode}-${l.periodBucket}`}
        />
      </div>
      <div className={`${CELL} text-xs text-text-tertiary`}>—</div>
      <div className={`${CELL} row-span-3 max-w-[14rem]`}>
        <span className="text-xs text-text-tertiary">{t('fc.sup.ackOnly')}</span>
      </div>
      <div className={CELL}>
        <CommitmentStatePill line={l} nowIso={nowIso} />
      </div>
      <div className={CELL}>
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
      </div>
    </div>
  );
};

export default AcknowledgeColumn;
