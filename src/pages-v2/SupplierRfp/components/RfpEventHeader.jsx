/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RfpEventView, RfpResponseView } from '@services/sourcing/views' */
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { DeadlinePill, rfxNow } from '../../rfx/rfxDisplay';
import { DraftSaveState } from '../../rfx/ResponseFormState';
import { DaysLeftPill } from '../../rfx/supplierRowState';

/**
 * @typedef {object} RfpEventHeaderProps
 * @property {RfpEventView} event
 * @property {RfpResponseView | null} mine  This supplier's response, if any.
 * @property {(eventId: string) => boolean} hasLocalFor  Whether this browser keeps an edit for the event.
 * @property {Record<string, string>} savedAt  When each event's local edits were last written.
 * @property {boolean} saveFailed  The last browser write was refused.
 * @property {string} deadline  This supplier's response deadline.
 * @property {boolean} submitted
 * @property {boolean} declined  The supplier declined to respond.
 * @property {boolean} started  The supplier has a draft or a sent proposal.
 * @property {boolean} awarded  An award in force for this supplier (S-10).
 * @property {boolean} opened  The row is expanded.
 * @property {string} rowAction  What the row button offers (`supplierRowAction`).
 * @property {(id: string | null) => void} setOpenId  Expands or collapses the row.
 * @property {TFunction} t
 */

/**
 * One RFP row's header: event number and title, the draft-saved stamp, the
 * confidentiality, deadline, days-left, awarded and response-status pills,
 * and the open/collapse button labelled with what the supplier can do.
 * Moved out of `SupplierRfp.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<RfpEventHeaderProps>}
 */
const RfpEventHeader = ({
  event,
  mine,
  hasLocalFor,
  savedAt,
  saveFailed,
  deadline,
  submitted,
  declined,
  started,
  awarded,
  opened,
  rowAction,
  setOpenId,
  t
}) => (
  <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
    <div>
      <Data className="font-semibold">{event.eventNumber}</Data>
      <div className="text-sm text-text-primary">{event.title}</div>
    </div>
    <div className="flex items-center gap-3">
      {!!hasLocalFor(event.id) && (
        <DraftSaveState
          savedAt={savedAt[event.id]}
          failed={saveFailed}
          testId={`supplier-rfp-saved-${event.id}`}
        />
      )}
      {event.confidentiality && <StatusPill variant="neutral">{t('rfxa.conf.pill')}</StatusPill>}
      <DeadlinePill deadline={deadline} done={mine?.status === 'Submitted'} />
      <DaysLeftPill
        deadline={deadline}
        nowIso={rfxNow()}
        done={submitted || event.closed || declined}
        testId={`supplier-rfp-days-left-${event.id}`}
      />
      {awarded ? (
        <span data-testid={`supplier-rfp-awarded-${event.id}`}>
          <StatusPill variant="success">{t('rfxa.row.awarded')}</StatusPill>
        </span>
      ) : null}
      <StatusPill variant={mine?.status === 'Submitted' ? 'success' : started ? 'info' : 'neutral'}>
        {t(
          `rfx.response.${mine?.status === 'Submitted' ? 'submitted' : declined ? 'declined' : started ? 'draft' : 'notStarted'}`
        )}
      </StatusPill>
      <Button
        variant="secondary"
        onClick={() => setOpenId(opened ? null : event.id)}
        data-testid={`supplier-rfp-open-${event.id}`}
      >
        {opened
          ? t('rfx.collapse')
          : rowAction === 'answer'
            ? t('rfx.rfp.answer')
            : t(`rfxa.row.${rowAction}`)}
      </Button>
    </div>
  </header>
);

export default RfpEventHeader;
