// ────────────────────────────────────────────────────────────────────────────
// RFx UX 2G — the question lists the RFI and RFP event pages share: the
// questions PTI sent (Overview) and one supplier's answers by section
// (By supplier). Display only.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { RfiAnswer, RfiQuestion, RfxCustomSection } from '@services/sourcing/types' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import { rfxSectionsOf } from '@services/sourcing/rfxConfig';
import { AnswerValue, IndicativePill, authored, sectionTitle } from './rfxAuthoringDisplay';

/**
 * The questions PTI sent, by section, with the Required marker.
 * @type {React.FC<{ title: string; questions: readonly RfiQuestion[]; customSections: readonly RfxCustomSection[] | undefined; testId: string }>}
 */
export const QuestionsSent = ({ title, questions, customSections, testId }) => {
  const { t } = useTranslation();
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={testId}
    >
      <h3 className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {title}
      </h3>
      <div className="px-4 py-3 space-y-3">
        {rfxSectionsOf(customSections).flatMap((section) => {
          const list = questions.filter((q) => q.sectionId === section.id);
          if (list.length === 0) return [];
          return [
            <div key={section.id}>
              <h4 className="text-xs uppercase tracking-wide text-text-tertiary">
                {sectionTitle(t, section)}
              </h4>
              <ul className="mt-1 space-y-1">
                {list.map((q) => (
                  <li
                    key={q.id}
                    className="text-sm text-text-primary"
                    data-testid={`${testId}-${q.id}`}
                  >
                    {authored(t, q.promptKey)}
                    {!!q.required && (
                      <StatusPill variant="neutral" className="ml-2">
                        {t('rfx.rfi.required')}
                      </StatusPill>
                    )}
                    {q.type === 'priceRange' && <IndicativePill className="ml-1" />}
                  </li>
                ))}
              </ul>
            </div>
          ];
        })}
      </div>
    </div>
  );
};

/**
 * One supplier's answers, by section: the question, the answer, and the
 * description the supplier wrote beside it.
 * @type {React.FC<{ title: string; questions: readonly RfiQuestion[]; customSections: readonly RfxCustomSection[] | undefined; answers: readonly RfiAnswer[]; testId: string }>}
 */
export const AnswersBySection = ({ title, questions, customSections, answers, testId }) => {
  const { t } = useTranslation();
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm"
      data-testid={testId}
    >
      <h3 className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary">
        {title}
      </h3>
      <div className="px-4 py-3 space-y-4">
        {rfxSectionsOf(customSections).flatMap((section) => {
          const list = questions.filter((q) => q.sectionId === section.id);
          if (list.length === 0) return [];
          return [
            <div key={section.id}>
              <h4 className="text-xs uppercase tracking-wide text-text-tertiary">
                {sectionTitle(t, section)}
              </h4>
              <dl className="mt-1 divide-y divide-border-subtle">
                {list.map((q) => {
                  const a = answers.find((x) => x.questionId === q.id);
                  return (
                    <div
                      key={q.id}
                      className="grid gap-1 py-2 sm:grid-cols-2"
                      data-testid={`${testId}-${q.id}`}
                    >
                      <dt className="text-sm text-text-secondary">
                        {authored(t, q.promptKey)}
                        {q.type === 'priceRange' && <IndicativePill className="ml-1" />}
                      </dt>
                      <dd className="text-sm text-text-primary">
                        <AnswerValue q={q} a={a} testId={`${testId}-${q.id}-files`} />
                        {!!a?.description && (
                          <div className="text-xs text-text-tertiary mt-1">{a.description}</div>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ];
        })}
      </div>
    </div>
  );
};
