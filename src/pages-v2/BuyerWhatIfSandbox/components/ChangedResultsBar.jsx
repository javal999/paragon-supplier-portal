// ─────────────────────────────────────────────────────────────────────────────
// B11 (SSTP walkthrough, 2026-11-12) — the results table sits about one screen
// above the inputs, so a planner who edits an input sees nothing move and reads
// the sandbox as broken. This bar is pinned to the bottom of the screen while
// any input or switch differs from the current plan, and lists each figure that
// moved (plan → scenario, with the difference). When nothing moved it says so,
// which is the answer for an input no rule reads yet (Supplier feedstock).
// Every figure is `compareRuns`' over the same two runs the table shows.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { WhatIfRun } from '@services/transitions/whatIfSandboxRules' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { termLabelText } from '@components/ui-v2/TermLabel';
import { compareRuns } from '@services/transitions/whatIfSandboxRules';
import { RESULT_TERM } from './ResultsTable';
import { diffText, figureText } from '../display';

/** The id the "See all results" link scrolls to (set on the results wrapper). */
export const RESULTS_ANCHOR_ID = 'wi-results-anchor';

/** @type {React.FC<{ plan: WhatIfRun; scenario: WhatIfRun; edited: number }>} */
const ChangedResultsBar = ({ plan, scenario, edited }) => {
  const { t, i18n } = useTranslation();
  if (edited === 0) return null;
  const indonesian = i18n.language?.toLowerCase().startsWith('id') ?? false;
  const moved = compareRuns(plan, scenario).filter((d) => d.changed);
  return (
    <div
      className="sticky bottom-0 z-10 -mx-1 max-h-[40vh] overflow-y-auto rounded-lg border border-action/40 bg-bg-surface px-4 py-3 shadow-md"
      role="status"
      aria-label={t('whatIf.bar.label')}
      data-testid="wi-changed-bar"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary" data-testid="wi-changed-bar-title">
          {moved.length > 0
            ? t('whatIf.bar.changed', { count: moved.length })
            : t('whatIf.bar.none')}
        </p>
        <a
          href={`#${RESULTS_ANCHOR_ID}`}
          className="text-sm text-action hover:text-action-hover underline"
          onClick={(e) => {
            // HashRouter owns the hash, so scroll instead of following the link.
            e.preventDefault();
            document
              .getElementById(RESULTS_ANCHOR_ID)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          data-testid="wi-changed-bar-see"
        >
          {t('whatIf.bar.see')}
        </a>
      </div>
      {moved.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary">
          {moved.map((d) => (
            <li key={d.key} data-testid={`wi-changed-${d.key}`}>
              {termLabelText(RESULT_TERM[d.key], indonesian)}:{' '}
              {d.delta === null ? (
                // A week or a text figure: diffText already reads "W41 → W38".
                <Data>{diffText(d, t)}</Data>
              ) : (
                <>
                  <Data>{figureText(d.key, d.plan, t)}</Data> →{' '}
                  <Data>{figureText(d.key, d.scenario, t)}</Data>{' '}
                  <span className="text-action-hover">({diffText(d, t)})</span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default ChangedResultsBar;
