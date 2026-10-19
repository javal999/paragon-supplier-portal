/** @import React from 'react' */

/**
 * One step of the entry strip.
 * @typedef {object} EntryStep
 * @property {string} id Stable key ("terms", "respond", "quote").
 * @property {string} label The step in words, numbered ("Step 1: Say if you will respond").
 * @property {boolean} done
 */

/**
 * The steps in order, with the first step not done marked as the current one.
 * @param {readonly EntryStep[]} steps
 * @returns {(EntryStep & { state: 'done' | 'current' | 'todo' })[]}
 */
// i18n-defer: the state is a key that picks a class and a data-state attribute, never copy
export const stepStates = (steps) => {
  const current = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({
    ...s,
    state: s.done ? 'done' : i === current ? 'current' : 'todo'
  }));
};

/** @type {Record<'done' | 'current' | 'todo', string>} */
const STEP_CLASS = {
  done: 'bg-teal-soft text-teal-hover',
  current: 'bg-action-soft text-action-hover font-semibold',
  todo: 'bg-bg-hover text-text-tertiary'
};

/**
 * RFx UX S-07 — the one entry pattern of a supplier event card: the steps to
 * the quote as a strip ("Step 1: Say if you will respond · Step 2: Quote"),
 * with the confidentiality terms as step 0 when they apply. Generic over its
 * steps so the RFI and RFP rows can carry the same strip (BL-132).
 * @type {React.FC<{ steps: readonly EntryStep[]; testId: string }>}
 */
const RfqStepStrip = ({ steps, testId }) => (
  <ol className="flex flex-wrap gap-1.5 text-xs mb-3" data-testid={testId}>
    {stepStates(steps).map((s) => (
      <li
        key={s.id}
        className={`rounded-full px-2 py-0.5 ${STEP_CLASS[s.state]}`}
        data-testid={`${testId}-${s.id}`}
        data-state={s.state}
        aria-current={s.state === 'current' ? 'step' : undefined}
      >
        {s.label}
      </li>
    ))}
  </ol>
);

export default RfqStepStrip;
