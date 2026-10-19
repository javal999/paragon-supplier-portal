/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { SourcingTypeMap } from '@services/sourcing/sourcingType' */
/** @import { rfqStageLine } from '../utils' */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import { RfqSourceLinks } from '../../rfx/rfqSources';
import { SourcingTypePill } from '../../rfx/eligibilityDisplay';
import { sourcingTypeOf } from '@services/sourcing/sourcingType';

/**
 * The row under the page header: back to the board, the event's status, its
 * sourcing type (fixed at publish) and the documents it was raised from. Moved
 * out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no behaviour
 * change). RFx UX B-15 — beside the status, the stage in words ("Collecting
 * quotes · round 1 open"), so an Open status no longer has to say both.
 * @type {React.FC<{ rfq: RFQ; rfqs: readonly RFQ[]; sourcingMap: SourcingTypeMap; stageLine: ReturnType<typeof rfqStageLine> }>}
 */
const EventStatusBar = ({ rfq, rfqs, sourcingMap, stageLine }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Link
        to="/buyer/rfq"
        className="text-sm text-action-hover hover:underline"
        data-testid="event-back"
      >
        {t('rfx.event.back')}
      </Link>
      <StatusPill variant={rfq.status === 'Awarded' ? 'success' : 'info'}>
        {t(`rfx.status.${rfq.status}`)}
      </StatusPill>
      <span className="text-sm text-text-primary" data-testid="event-stage-line">
        <span className="text-text-tertiary">{t('rfx.stage.label')}:</span>{' '}
        {t(`rfx.stageLine.${stageLine.phase}`)}
        {stageLine.openRound !== null
          ? ` · ${t('rfx.stageLine.roundOpen', { round: stageLine.openRound })}`
          : ''}
      </span>
      {/* Material G2 (MR-10 BR-06) — the type, fixed at publish. */}
      <SourcingTypePill
        type={sourcingTypeOf(
          {
            kind: 'rfq',
            status: rfq.status,
            materialCategory: rfq.materialCategory,
            ...(rfq.sourcingType ? { sourcingType: rfq.sourcingType } : {})
          },
          sourcingMap
        )}
        testId="event-sourcing-type"
      />
      <RfqSourceLinks rfq={rfq} rfqs={rfqs} />
    </div>
  );
};

export default EventStatusBar;
