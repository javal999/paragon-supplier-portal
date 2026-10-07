/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { formatDate } from '@lib/format';
/** @import { RescheduleProposalView, SapChangeMark } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { WITHHELD_ID } from '../const';
import { markFor } from '../utils';

/**
 * Everything a proposal's act needs from the page, threaded through the table.
 * @typedef {object} ProposalActionContext
 * @property {ReadonlySet<string>} sent the call-offs whose change was sent this session
 * @property {readonly SapChangeMark[]} sapMarks the "taken to SAP" marks on this read
 * @property {VerbAvailability} planAvailability the seat's answer for `calloff:plan`
 * @property {VerbAvailability} sapAvailability the seat's answer for `sapchange:mark`
 * @property {boolean} withheld the engine dataset is not live (X-03): both acts are off
 * @property {(p: RescheduleProposalView) => Promise<void>} onSend send the call-off change
 * @property {(p: RescheduleProposalView) => Promise<void>} onMark mark the PO line taken to SAP
 * @property {boolean} sendPending a call-off change is in flight
 * @property {boolean} markPending a "taken to SAP" mark is in flight
 */

/** @param {RescheduleProposalView} p */
const reasonId = (p) => `rs-withheld-why-${p.id}`;
/** @param {RescheduleProposalView} p */
const withheldWhy = (p) => `${reasonId(p)} ${WITHHELD_ID}`;

/**
 * The act for one proposal — or why there is none.
 * @type {React.FC<{ p: RescheduleProposalView } & ProposalActionContext>}
 */
const ProposalAction = ({
  p,
  sent,
  sapMarks,
  planAvailability,
  sapAvailability,
  withheld,
  onSend,
  onMark,
  sendPending,
  markPending
}) => {
  const { t } = useTranslation();
  if (p.line.kind === 'callOff') {
    if (p.type === 'cancel')
      return <span className="text-xs text-text-tertiary">{t('rs.action.callOffCancel')}</span>;
    if (sent.has(p.id))
      return <StatusPill variant="info">{t('rs.action.awaitingConfirmation')}</StatusPill>;
    if (planAvailability.kind !== 'held')
      return <HandoffNotice availability={planAvailability} testId="handoff-reschedule-change" />;
    // Simulated data: the act is shown, switched off, with a one-word reason;
    // the full reason is stated once above the table (rs-actions-withheld).
    // C2 (WCAG 4.1.2): the switched-off act names its reason to a screen
    // reader too — the one-word reason under it and the full one above.
    if (withheld)
      return (
        <div>
          <Button
            variant="outline"
            disabled
            aria-describedby={withheldWhy(p)}
            data-testid={`rs-send-off-${p.id}`}
          >
            {t('rs.action.send')}
          </Button>
          <div
            id={reasonId(p)}
            className="text-xs text-warning-hover mt-1"
            data-testid={`rs-withheld-${p.id}`}
          >
            {t('rs.action.sampleData')}
          </div>
        </div>
      );
    return (
      <Button
        variant="outline"
        onClick={() => void onSend(p)}
        disabled={sendPending}
        data-testid={`rs-send-${p.id}`}
      >
        {t('rs.action.send')}
      </Button>
    );
  }
  const mark = markFor(sapMarks, p.id);
  if (mark)
    return (
      <div className="text-xs" data-testid={`rs-marked-${p.id}`}>
        <StatusPill variant="info">{t('rs.action.taken')}</StatusPill>
        <div className="text-text-tertiary mt-1">
          <Data>{formatDate(mark.markedAt)}</Data>
        </div>
      </div>
    );
  if (sapAvailability.kind !== 'held')
    return <HandoffNotice availability={sapAvailability} testId="handoff-reschedule-sap" />;
  return (
    <div>
      <div className="text-xs text-text-secondary mb-1">{t('rs.action.inSap')}</div>
      {withheld ? (
        <div>
          <Button
            variant="outline"
            disabled
            aria-describedby={withheldWhy(p)}
            data-testid={`rs-mark-off-${p.id}`}
          >
            {t('rs.action.mark')}
          </Button>
          <div
            id={reasonId(p)}
            className="text-xs text-warning-hover mt-1"
            data-testid={`rs-withheld-${p.id}`}
          >
            {t('rs.action.sampleData')}
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => void onMark(p)}
          disabled={markPending}
          data-testid={`rs-mark-${p.id}`}
        >
          {t('rs.action.mark')}
        </Button>
      )}
    </div>
  );
};

export default ProposalAction;
