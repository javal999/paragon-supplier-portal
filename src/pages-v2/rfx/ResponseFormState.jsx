// ────────────────────────────────────────────────────────────────────────────
// S-01 / S-02 · WHAT A SUPPLIER RESPONSE FORM SAYS ABOUT ITSELF.
//
// Shared by the RFI form, the RFP form and the RFQ quote drawer:
//   · `DraftSaveState` — "Draft saved 19:04 on this device", by the title;
//   · `ResponseProblemsBanner` — "N answers still missing or not valid", with
//     one jump link per field, all at once;
//   · `SendBlockedReason` — why Send is off, naming the count;
//   · `StillMissing` — the one-line message under a field left empty.
//
// A jump link is a BUTTON, never `href="#…"`: the router is a HashRouter, so a
// fragment link would navigate away from the form it is meant to scroll.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatSavedTime } from './responseDraft';

/**
 * One field the supplier still has to fill or fix. `anchor` is the DOM id of
 * the field (or the block that holds it); `label` names it in the reader's
 * language.
 * @typedef {{ readonly anchor: string; readonly label: string }} ResponseProblem
 */

/**
 * Scroll to a field and put the cursor in it.
 * @param {string} anchor
 */
export function jumpTo(anchor) {
  const el = globalThis.document?.getElementById(anchor);
  if (!el) return;
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  const focusable = el.matches('input, select, textarea, button')
    ? el
    : el.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
  /** @type {HTMLElement | null} */ (focusable)?.focus?.();
}

/**
 * Keep the first problem per anchor, so one field is listed once.
 * @param {readonly ResponseProblem[]} problems
 * @returns {ResponseProblem[]}
 */
export const uniqueProblems = (problems) => {
  const seen = new Set();
  return problems.filter((p) => (seen.has(p.anchor) ? false : (seen.add(p.anchor), true)));
};

/** @type {React.FC<{ problems: readonly ResponseProblem[]; testId: string }>} */
export const ResponseProblemsBanner = ({ problems, testId }) => {
  const { t } = useTranslation();
  if (problems.length === 0) return null;
  return (
    <div
      role="alert"
      data-testid={testId}
      className="border border-danger bg-danger-soft rounded-md px-3 py-2 text-sm"
    >
      <strong className="text-danger">{t('rfx.form.problems', { count: problems.length })}</strong>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {problems.map((p) => (
          <li key={p.anchor}>
            <button
              type="button"
              onClick={() => jumpTo(p.anchor)}
              className="text-danger underline hover:no-underline text-left"
              data-testid={`${testId}-link-${p.anchor}`}
            >
              {p.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** @type {React.FC<{ count: number; testId: string }>} */
export const SendBlockedReason = ({ count, testId }) => {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <span className="text-xs text-danger" data-testid={testId}>
      {t('rfx.form.sendBlocked', { count })}
    </span>
  );
};

/** @type {React.FC<{ testId?: string }>} */
export const StillMissing = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <div className="text-xs text-danger mt-1" data-testid={testId}>
      {t('rfx.form.stillMissing')}
    </div>
  );
};

/**
 * The save state by the title: nothing before the first edit, "Draft saved
 * HH:MM on this device" after it, and a warning when the browser refused to
 * keep it.
 * @type {React.FC<{ savedAt?: string; failed: boolean; testId: string }>}
 */
export const DraftSaveState = ({ savedAt, failed, testId }) => {
  const { t } = useTranslation();
  if (failed) {
    return (
      <span className="text-xs text-warning-hover" data-testid={testId}>
        {t('rfx.form.notSaved')}
      </span>
    );
  }
  const time = formatSavedTime(savedAt);
  if (!time) return null;
  return (
    <span
      className="text-xs text-text-tertiary"
      data-testid={testId}
      title={t('rfx.form.savedHint')}
    >
      {t('rfx.form.saved')} <Data>{time}</Data>
    </span>
  );
};
