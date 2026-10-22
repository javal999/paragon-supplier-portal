/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';

/**
 * One step of the bar: its key, its label key, the short detail under it, and
 * whether the event moved past it without it (the RFQ's "Round").
 * @typedef {{ key: string; labelKey: string; detail: string; skipped?: boolean }} RfxStageStep
 */

/** The large-screen column count, by number of steps (Tailwind needs literal classes). */
const LG_COLS = /** @type {Record<number, string>} */ ({ 6: 'lg:grid-cols-6' });

/**
 * BL-220 — THE stage bar of the RFQ, RFI and RFP event pages (it was two:
 * lane 1C's RFQ `EventStageBar` and wave 2's RFI/RFP copy). Each page builds
 * its own steps and its "Next" wording — `rfqStageBar` for the RFQ,
 * `rfiStageOf` / `rfpStageOf` for the RFI and RFP — and this renders them.
 * Display only: it decides nothing.
 * @type {React.FC<{
 *   steps: readonly RfxStageStep[];
 *   current: number;
 *   next: string;
 *   nextKey?: string;
 *   testId: string;
 *   nextTestId?: string;
 * }>}
 */
const RfxStageBar = ({ steps, current, next, nextKey, testId, nextTestId }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4 space-y-2" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {t('rfx.stage.label')}
        </span>
        <span data-testid={nextTestId ?? `${testId}-next`}>
          <StatusPill variant={next === 'none' || next === 'cancelled' ? 'neutral' : 'info'}>
            {t('rfx.stage.next')}: {t(nextKey ?? `rfx.stage.nextAct.${next}`)}
          </StatusPill>
        </span>
      </div>
      <ol
        className={`grid grid-cols-2 sm:grid-cols-3 ${LG_COLS[steps.length] ?? 'lg:grid-cols-5'} gap-2`}
      >
        {steps.map((step, i) => {
          const state = step.skipped
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
