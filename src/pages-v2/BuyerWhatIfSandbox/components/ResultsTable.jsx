// ─────────────────────────────────────────────────────────────────────────────
// DRC-17 BR-03 / BR-05 (BL-202) — every output figure of the scenario against
// the current plan, with the difference ("PR need +120,000", "first shortage
// W41 → W38"), and up to 3 saved scenarios side by side. Each row carries
// "Provisional: rule awaiting Material Planning" with its question IDs
// (design rule 5). Every figure is `runWhatIf`'s.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { WhatIfRun } from '@services/transitions/whatIfSandboxRules' */
import { useTranslation } from 'react-i18next';
import TermLabel from '@components/ui-v2/TermLabel';
import Data from '@components/ui-v2/Data';
import { HEADLINE_KEYS, compareRuns } from '@services/transitions/whatIfSandboxRules';
import { Provisional, Section, diffText, figureText } from '../display';

/**
 * A compared column: a saved scenario's run.
 * @typedef {{ readonly id: string; readonly name: string; readonly run: WhatIfRun }} ComparedRun
 */

/** BL-233 — the glossary term each result row is labelled by. */
const RESULT_TERM = /** @type {const} */ ({
  ropOrder: 'ropOrder',
  ropFisik: 'ropFisik',
  max: 'whatIfMax',
  safetyOrder: 'safetyOrder',
  totalDa: 'daOverLeadTime',
  prNeed: 'prGenerated',
  prRecommendation: 'planCheckPr',
  callOffs: 'triggerCallOffs',
  triggerPr: 'triggerPr',
  remainder: 'whatIfRemainder',
  carried: 'whatIfCarryOver',
  firstShortageWeek: 'firstShortageWeek',
  weeksAboveMax: 'weeksAboveMax'
});

const TH = 'text-left text-xs font-medium text-text-tertiary uppercase py-2 pr-4 align-bottom';
const TD = 'py-2 pr-4 align-top text-sm';

/**
 * One figure cell: the value and, beside a scenario, its difference from the plan.
 * @type {React.FC<{ text: string; diff?: string; changed?: boolean; testId: string }>}
 */
const Cell = ({ text, diff, changed, testId }) => (
  <td className={TD} data-testid={testId}>
    <Data>{text}</Data>
    {diff !== undefined ? (
      <span
        className={`block text-xs ${changed ? 'text-action-hover' : 'text-text-tertiary'}`}
        data-testid={`${testId}-diff`}
      >
        {diff}
      </span>
    ) : null}
  </td>
);

/** @type {React.FC<{ plan: WhatIfRun; scenario: WhatIfRun; compared: readonly ComparedRun[] }>} */
const ResultsTable = ({ plan, scenario, compared }) => {
  const { t } = useTranslation();
  const mine = compareRuns(plan, scenario);
  const others = compared.map((c) => ({ ...c, diffs: compareRuns(plan, c.run) }));
  return (
    <Section title={t('whatIf.section.results')} testId="wi-results">
      <div className="overflow-x-auto">
        <table className="min-w-full" data-testid="wi-results-table">
          <thead className="border-b border-border-subtle">
            <tr>
              <th scope="col" className={TH}>
                {t('whatIf.col.figure')}
              </th>
              <th scope="col" className={TH}>
                {t('whatIf.col.plan')}
              </th>
              <th scope="col" className={TH}>
                {t('whatIf.col.scenario')}
              </th>
              {others.map((c) => (
                <th key={c.id} scope="col" className={TH} data-testid={`wi-col-${c.id}`}>
                  {t('whatIf.col.saved', { name: c.name })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {HEADLINE_KEYS.map((key, i) => (
              <tr key={key} data-testid={`wi-row-${key}`}>
                <th scope="row" className={`${TD} text-left font-normal text-text-secondary`}>
                  <TermLabel term={RESULT_TERM[key]} />
                  {key === 'max' && scenario.maxSource === 'override' ? (
                    <span className="text-xs text-text-tertiary"> ({t('whatIf.maxOverride')})</span>
                  ) : null}
                  <Provisional figure={key} testId={`wi-prov-${key}`} />
                </th>
                <Cell text={figureText(key, mine[i].plan, t)} testId={`wi-plan-${key}`} />
                <Cell
                  text={figureText(key, mine[i].scenario, t)}
                  diff={diffText(mine[i], t)}
                  changed={mine[i].changed}
                  testId={`wi-scn-${key}`}
                />
                {others.map((c) => (
                  <Cell
                    key={c.id}
                    text={figureText(key, c.diffs[i].scenario, t)}
                    diff={diffText(c.diffs[i], t)}
                    changed={c.diffs[i].changed}
                    testId={`wi-cmp-${c.id}-${key}`}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scenario.flags.length > 0 ? (
        <ul className="mt-3 text-xs text-warning-hover space-y-0.5" data-testid="wi-flags">
          {scenario.flags.map((f) => (
            <li key={f}>{t(`whatIf.flag.${f}`)}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-xs text-text-tertiary" data-testid="wi-reading">
        {t('whatIf.reading')}
      </p>
    </Section>
  );
};

export default ResultsTable;
