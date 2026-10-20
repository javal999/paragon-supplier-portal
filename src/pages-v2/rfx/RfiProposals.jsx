// ────────────────────────────────────────────────────────────────────────────
// RFx UX 2G — the RFI's answers on the Compare and By supplier tabs: the
// summary strip (one card per submitted response, highest RESPONSE SCORE
// first — the score the read model already computes, which shortlists and
// never awards), the answers side by side in section accordions with "Show
// answers that differ", and one response laid out by section. Display only.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { RfiEventView } from '@services/sourcing/views' */
/** @import { RfiSummaryCard } from './rfxCompare' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { rfxSectionsOf } from '@services/sourcing/rfxConfig';
import { AnswerValue, IndicativePill, authored, sectionTitle } from './rfxAuthoringDisplay';
import { SupplierDocumentsPanel } from './SupplierDocumentsPanel';
import { AnswersBySection } from './RfxProposalViews';
import { GridFilterToggle, SummaryCard, SupplierStepper, VersionHistory } from './RfxEventTabs';
import { answersDiffer } from './rfxCompare';

/**
 * The Compare tab's summary strip for an RFI.
 * @type {React.FC<{ event: RfiEventView; cards: readonly RfiSummaryCard[]; onView: (supplierId: string) => void }>}
 */
export const RfiSummaryStrip = ({ event, cards, onView }) => {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-wrap gap-3" data-testid={`rfi-summary-${event.id}`}>
      {cards.map((c) => (
        <SummaryCard
          key={c.response.id}
          supplierName={c.response.supplierName}
          scoreLabel={t('rfx.rfi.score')}
          score={c.score}
          facts={[
            {
              key: 'answered',
              label: t('rfx.card.answered'),
              value: <Data>{t('rfx.card.answeredOf', { n: c.answered, m: c.required })}</Data>
            }
          ]}
          eligibility={
            event.invitedSuppliers.find((i) => i.supplierId === c.response.supplierId)?.eligibility
          }
          version={c.version}
          submittedAt={c.submittedAt}
          linkLabel={t('rfx.card.viewAnswers')}
          onView={() => onView(c.response.supplierId)}
          testId={`rfi-card-${c.response.supplierId}`}
        />
      ))}
    </ol>
  );
};

/**
 * The answers, side by side — submitted only (a draft answer is not in the
 * read). Each section is an accordion; "Show answers that differ" (OFF by
 * default) keeps the questions the suppliers answered differently. The
 * supplier header row stays in view while the grid scrolls.
 * @type {React.FC<{ event: RfiEventView }>}
 */
export const RfiAnswersGrid = ({ event }) => {
  const { t } = useTranslation();
  const [onlyDiffer, setOnlyDiffer] = useState(false);
  const [collapsed, setCollapsed] = useState(/** @type {ReadonlySet<string>} */ (new Set()));
  const cols = event.responses.length + 1;
  const stickyTh =
    'sticky top-0 z-10 bg-bg-hover text-left text-label text-text-tertiary uppercase py-3 px-4 align-bottom';
  /** @param {string} id */
  const toggle = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <>
      <div className="px-4 py-2 border-b border-border-subtle">
        <GridFilterToggle
          label={t('rfx.rfi.cmp.onlyDiffer')}
          checked={onlyDiffer}
          onChange={setOnlyDiffer}
          {...(event.responses.length < 2 ? { disabledReason: t('rfx.rfi.cmp.needTwo') } : {})}
          testId={`rfi-only-differ-${event.id}`}
        />
      </div>
      <div className="max-h-[70vh] overflow-auto" data-testid={`rfi-grid-scroll-${event.id}`}>
        <table className="w-full text-sm text-text-primary border-collapse">
          <thead className="border-b border-border-subtle" data-testid="rfi-grid-head">
            <tr>
              <th scope="col" className={stickyTh}>
                {t('rfx.rfi.section')}
              </th>
              {event.responses.map((r) => (
                <th key={r.id} scope="col" className={stickyTh}>
                  {r.supplierName}
                  <div className="text-xs font-normal normal-case text-text-tertiary">
                    {t('rfx.rfi.score')}:{' '}
                    {r.score === null ? t('rfx.rfi.noScore') : <Data>{r.score}</Data>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rfxSectionsOf(event.customSections).flatMap((section) => {
              const all = event.questions.filter((q) => q.sectionId === section.id);
              const list = onlyDiffer ? all.filter((q) => answersDiffer(q, event.responses)) : all;
              if (list.length === 0) return [];
              const open = !collapsed.has(section.id);
              const differ = all.filter((q) => answersDiffer(q, event.responses)).length;
              return [
                <tr
                  key={`section-${section.id}`}
                  className="bg-bg-hover border-b border-border-subtle"
                  data-testid={`rfi-section-${section.id}`}
                >
                  <td colSpan={cols} className="px-4 py-2">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggle(section.id)}
                      className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
                      data-testid={`rfi-section-toggle-${section.id}`}
                    >
                      <span aria-hidden="true">{open ? '▾' : '▸'}</span>
                      {sectionTitle(t, section)}
                      <span className="font-normal normal-case text-text-tertiary">
                        {t('rfx.rfi.cmp.differCount', { count: differ })}
                      </span>
                    </button>
                  </td>
                </tr>,
                ...(open
                  ? list.map((q) => (
                      <TableRow key={q.id} data-testid={`rfi-answer-row-${q.id}`}>
                        <TableCell className="align-top">
                          <div className="text-sm text-text-primary">
                            {authored(t, q.promptKey)}
                          </div>
                          {!!q.required && (
                            <StatusPill variant="neutral" className="mt-1">
                              {t('rfx.rfi.required')}
                            </StatusPill>
                          )}
                          {q.type === 'priceRange' && <IndicativePill className="mt-1 ml-1" />}
                        </TableCell>
                        {event.responses.map((r) => {
                          const answer = r.answers.find((a) => a.questionId === q.id);
                          return (
                            <TableCell
                              key={r.id}
                              className="align-top"
                              data-testid={`rfi-answer-${q.id}-${r.supplierId}`}
                            >
                              <div className="text-sm text-text-primary">
                                <AnswerValue
                                  q={q}
                                  a={answer}
                                  testId={`rfi-answer-files-${q.id}-${r.supplierId}`}
                                />
                              </div>
                              {!!answer?.description && (
                                <div className="text-xs text-text-tertiary mt-1">
                                  {answer.description}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  : [])
              ];
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

/**
 * By supplier: one RFI response — its answers by section with the supplier's
 * descriptions, its files, and its versions.
 * @type {React.FC<{ event: RfiEventView; cards: readonly RfiSummaryCard[]; supplierId: string; onPick: (supplierId: string) => void }>}
 */
export const RfiSupplierView = ({ event, cards, supplierId, onPick }) => {
  const { t } = useTranslation();
  const card = cards.find((c) => c.response.supplierId === supplierId) ?? cards[0];
  if (!card) return null;
  const r = card.response;
  const sid = r.supplierId;
  return (
    <div className="space-y-6" data-testid={`rfi-supplier-${event.id}`}>
      <SupplierStepper
        options={cards.map((c) => ({ id: c.response.supplierId, name: c.response.supplierName }))}
        current={sid}
        onChange={onPick}
        testId="rfi-supplier-step"
      />
      <p className="text-xs text-text-tertiary" data-testid={`rfi-supplier-score-${sid}`}>
        {t('rfx.rfi.score')}:{' '}
        {card.score === null ? t('rfx.rfi.noScore') : <Data>{card.score}</Data>}
        {' · '}
        {t('rfx.card.answered')}{' '}
        <Data>{t('rfx.card.answeredOf', { n: card.answered, m: card.required })}</Data>
      </p>
      <div id="rfi-supplier-answers" className="scroll-mt-4">
        <AnswersBySection
          title={r.supplierName}
          questions={event.questions}
          customSections={event.customSections}
          answers={r.answers}
          testId={`rfi-supplier-answers-${sid}`}
        />
      </div>
      <div id="rfi-supplier-documents" className="scroll-mt-4">
        <SupplierDocumentsPanel
          requests={event.documentRequests}
          responses={[r]}
          deadlineFor={(id) =>
            event.invitedSuppliers.find((i) => i.supplierId === id)?.deadline ??
            event.responseDeadline
          }
          testId={`rfi-supplier-docs-${sid}`}
        />
      </div>
      <div id="rfi-supplier-versions" className="scroll-mt-4">
        <VersionHistory versions={r.versions} testId={`rfi-supplier-versions-${sid}`} />
      </div>
    </div>
  );
};
