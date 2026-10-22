/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { AwardView } from '@services/sourcing/views' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import { STAGE_STEPS, rfqStageOf } from '../utils';

/** @type {Record<(typeof STAGE_STEPS)[number], string>} */
const STEP_KEY = {
  sent: 'rfx.stage.sent',
  quotesIn: 'rfx.stage.quotesIn',
  round: 'rfx.stage.round',
  award: 'rfx.stage.award',
  sap: 'rfx.stage.sap',
  done: 'rfx.stage.done'
};

/**
 * RFx UX 1C (B-01) — where the event stands: six steps (Sent · Quotes in ·
 * Round · Award · Raised in SAP · Done) derived by `rfqStageOf` from the
 * status, the quotes, the rounds and the awards in force, and a "Next" pill
 * naming the buyer's next act. Display only: it decides nothing.
 * @type {React.FC<{
 *   rfq: RFQ;
 *   quoted: number;
 *   rounds: readonly { closed: boolean }[];
 *   inForce: readonly AwardView[];
 * }>}
 */
const EventStageBar = ({ rfq, quoted, rounds, inForce }) => {
  const { t } = useTranslation();
  const invited = rfq.invitedSupplierIds.length;
  const { current, next, roundSkipped } = rfqStageOf({
    status: rfq.status,
    invited,
    quoted,
    rounds,
    inForce
  });
  const openRounds = rounds.filter((r) => !r.closed).length;
  const withLines = inForce.filter((a) => a.lines.length > 0);
  /** @type {Record<(typeof STAGE_STEPS)[number], string>} */
  const detail = {
    sent: t('rfx.stage.d.suppliers', { count: invited }),
    quotesIn: t('rfx.stage.d.quoted', { quoted, invited }),
    round:
      openRounds > 0
        ? t('rfx.stage.d.roundOpen', { count: openRounds })
        : rounds.length > 0
          ? t('rfx.stage.d.roundHeld', { count: rounds.length })
          : t('rfx.stage.d.none'),
    award: inForce.length > 0 ? t(`rfx.status.${rfq.status}`) : '',
    sap:
      withLines.length > 0
        ? t('rfx.stage.d.ofTotal', {
            done: withLines.filter((a) => a.status === 'Raised in SAP').length,
            total: withLines.length
          })
        : '',
    done: ''
  };
  return (
    <div className="mb-4 space-y-2" data-testid="event-stage">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {t('rfx.stage.label')}
        </span>
        <span data-testid="event-next">
          <StatusPill variant={next === 'none' || next === 'cancelled' ? 'neutral' : 'info'}>
            {t('rfx.stage.next')}: {t(`rfx.stage.nextAct.${next}`)}
          </StatusPill>
        </span>
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STAGE_STEPS.map((step, i) => {
          const state =
            step === 'round' && roundSkipped
              ? 'skipped'
              : i < current
                ? 'done'
                : i === current
                  ? 'current'
                  : 'todo';
          const tone =
            state === 'current'
              ? 'border-action bg-action-soft'
              : state === 'done'
                ? 'border-border-subtle bg-bg-surface'
                : 'border-border-subtle bg-bg-surface opacity-70';
          return (
            <li
              key={step}
              className={`rounded-md border px-3 py-2 text-xs ${tone}`}
              data-testid={`event-stage-${step}`}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span
                className={`block font-semibold ${state === 'current' ? 'text-action-hover' : 'text-text-primary'}`}
              >
                {i + 1} {t(STEP_KEY[step])}
              </span>
              <span className="text-text-tertiary">{detail[step]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default EventStageBar;
