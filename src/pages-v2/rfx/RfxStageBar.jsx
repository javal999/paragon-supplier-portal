/** @import React from 'react' */
/** @import { RfxNextAct } from './rfxEventStage' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';

/**
 * One step of the bar: its key, its label key and the short detail under it.
 * @typedef {{ key: string; labelKey: string; detail: string }} RfxStageStep
 */

/**
 * RFx UX 2A (B-09) — the stage bar on the RFI and RFP event pages, in the look
 * of the RFQ event page's `EventStageBar` (lane 1C), which is RFQ-shaped and
 * owned by that page. The steps and the step the event is on come from
 * `rfiStageOf` / `rfpStageOf`. Display only: it decides nothing.
 * @type {React.FC<{
 *   steps: readonly RfxStageStep[];
 *   current: number;
 *   next: RfxNextAct;
 *   testId: string;
 * }>}
 */
const RfxStageBar = ({ steps, current, next, testId }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4 space-y-2" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {t('rfx.stage.label')}
        </span>
        <span data-testid={`${testId}-next`}>
          <StatusPill variant={next === 'none' || next === 'cancelled' ? 'neutral' : 'info'}>
            {t('rfx.stage.next')}: {t(`rfx.stage.nextAct.${next}`)}
          </StatusPill>
        </span>
      </div>
      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {steps.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          const tone =
            state === 'current'
              ? 'border-action bg-action-soft'
              : state === 'done'
                ? 'border-border-subtle bg-bg-surface'
                : 'border-border-subtle bg-bg-surface opacity-70';
          return (
            <li
              key={step.key}
              className={`rounded-md border px-3 py-2 text-xs ${tone}`}
              data-testid={`${testId}-${step.key}`}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span
                className={`block font-semibold ${state === 'current' ? 'text-action-hover' : 'text-text-primary'}`}
              >
                {i + 1} {t(step.labelKey)}
              </span>
              <span className="text-text-tertiary">{step.detail}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default RfxStageBar;
