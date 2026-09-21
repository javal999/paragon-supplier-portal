// ────────────────────────────────────────────────────────────────────────────
// RAISING AN INFORMATION REQUEST — section 3.6a (CE-01 to CE-08), REQ-E03-02.
//
// Four steps, in the order the act actually happens: what the request is about,
// what it asks, who is asked, and a last look before it leaves the building.
//
// ⚠️ **"SAVE DRAFT" AND "SEND TO SUPPLIERS" ARE TWO ACTS, NOT ONE BUTTON WITH A
// CONFIRMATION (CE-06).** Creating and sending are separate permissions — a
// buyer may hold `rfi:create` and not `rfi:publish`, and then this wizard can
// raise a draft somebody else sends. One "Create" button that also published
// would collapse that pair and make the second permission unenforceable from
// the only screen that could respect it.
//
// ⚠️ **THE LIBRARY IS NEVER EDITED HERE (CE-03 / CE-04 / CE-05).** The template
// opens the question list and the buyer adds and removes FOR THIS EVENT; the
// event carries its own list from birth (the create verb stores `questions`), so
// a later change to `rfxConfig` never rewrites an event suppliers have answered.
// There is no save-as-template and no copy-a-past-event, deliberately.
//
// ⚠️ **A ONE-OFF QUESTION'S PROMPT IS THE BUYER'S OWN WORDS, NOT AN i18n KEY,
// AND THE SHAPE SAYS SO.** Every library prompt is a key resolved through `t()`;
// a question typed here cannot be, because nobody translated it. i18next echoes
// an unknown key, so the buyer's sentence renders as the buyer's sentence — in
// both locales, which is the honest outcome: PTI asked it in one language and
// the hub does not invent the other one.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import Wizard, { WizardStep } from '../../components/ui-v2/Wizard';
import ModalOverlay from '../../components/ui-v2/ModalOverlay';
import { useToast } from '../../hooks/useToast';
import { useRfxCommand } from '../../services/query/commandHooks';
import {
  RFI_QUESTION_LIBRARY,
  RFI_SECTION_ORDER,
  RFX_CATEGORY_FAMILIES,
  rfiTemplate,
  rfxCategoryFamily,
} from '../../services/sourcing/rfxConfig';
import { isPastDeadline } from '../../services/transitions/rfxRules';
import type { RfiQuestion, RfiQuestionType } from '../../services/sourcing/types';
import RfxInviteeStep from './RfxInviteeStep';
import { rfxNow } from './rfxDisplay';

/**
 * The answer kinds a one-off question may ask for.
 *
 * ⚠️ **`singleChoice` AND `multipleChoice` ARE DELIBERATELY ABSENT.** A choice
 * question is its OPTION LIST, and there is no option editor here — offering
 * the kind would mean minting options nobody wrote, so a supplier would be asked
 * to pick from a list PTI never authored. A buyer who needs a choice question
 * asks Procurement to put it in the library (CE-05), which is the same route
 * every other library change takes.
 *
 * i18n-defer: these are ANSWER-KIND IDS off the `RfiQuestionType` union, not
 * copy — the words a buyer reads are `t('rfx.qtype.<kind>')`, resolved in the
 * component body below. A literal here would be the id, not the sentence.
 */
const QUESTION_TYPES: readonly RfiQuestionType[] = [
  'yesNo',
  'numberWithUnit',
  'date',
  'text',
  'attachment',
];

interface Draft {
  title: string;
  family: string;
  description: string;
  responseDeadline: string;
  questions: RfiQuestion[];
  invitedSupplierIds: string[];
}

const EMPTY: Draft = {
  title: '',
  family: '',
  description: '',
  responseDeadline: '',
  questions: [],
  invitedSupplierIds: [],
};

interface RfiCreateWizardProps {
  /** Close without creating anything. */
  onCancel: () => void;
  /** The new event's id — the board lands the buyer on it (CE-08's trail). */
  onCreated: (rfiId: string) => void;
  /** Does this seat hold `rfi:publish`? A seat that does not may still draft. */
  canPublish: boolean;
}

const RfiCreateWizard: React.FC<RfiCreateWizardProps> = ({ onCancel, onCreated, canPublish }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [oneOff, setOneOff] = useState<{ type: RfiQuestionType; prompt: string; required: boolean }>({
    type: 'text',
    prompt: '',
    required: false,
  });
  const [libraryPick, setLibraryPick] = useState('');

  const family = rfxCategoryFamily(draft.family);
  const template = family?.templateId ? rfiTemplate(family.templateId) : undefined;

  /** Choosing the family RE-OPENS the question list from its template. */
  const chooseFamily = (id: string) => {
    const tpl = rfxCategoryFamily(id)?.templateId;
    const questions = tpl ? [...(rfiTemplate(tpl)?.questions ?? [])] : [];
    setDraft((d) => ({ ...d, family: id, questions }));
  };

  const removeQuestion = (id: string) =>
    setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) }));

  const addFromLibrary = () => {
    const found = RFI_QUESTION_LIBRARY.find((q) => q.id === libraryPick);
    if (!found || draft.questions.some((q) => q.id === found.id)) return;
    setDraft((d) => ({ ...d, questions: [...d.questions, found] }));
    setLibraryPick('');
  };

  const addOneOff = () => {
    const prompt = oneOff.prompt.trim();
    if (!prompt) return;
    // Section F is where a question for THIS EVENT lives (`RFI_SECTION_ORDER`),
    // which keeps it visibly apart from the template's A–E on every surface.
    const id = `event-${draft.questions.filter((q) => q.sectionId === 'event').length + 1}`;
    setDraft((d) => ({
      ...d,
      questions: [
        ...d.questions,
        {
          id,
          sectionId: 'event',
          promptKey: prompt,
          type: oneOff.type,
          required: oneOff.required,
        },
      ],
    }));
    setOneOff({ type: 'text', prompt: '', required: false });
  };

  const toggleSupplier = (supplierId: string) =>
    setDraft((d) => ({
      ...d,
      invitedSupplierIds: d.invitedSupplierIds.includes(supplierId)
        ? d.invitedSupplierIds.filter((s) => s !== supplierId)
        : [...d.invitedSupplierIds, supplierId],
    }));

  // CE-07 — a deadline already past is not a response window. The reading is
  // the VERB's own (`isPastDeadline`, end of the deadline day), not a second
  // recipe: a wizard that accepted a date the submit gate treats as closed would
  // publish an event no supplier could answer.
  const deadlineInFuture =
    draft.responseDeadline !== '' && !isPastDeadline(draft.responseDeadline, rfxNow());

  const stepValid = (n: number): boolean => {
    if (n === 0) return draft.title.trim().length > 0 && draft.family !== '' && deadlineInFuture;
    if (n === 1) return draft.questions.length > 0;
    if (n === 2) return draft.invitedSupplierIds.length > 0;
    return true;
  };

  const sendable = stepValid(0) && stepValid(1) && stepValid(2);

  const create = (publish: boolean) =>
    command.mutate(
      {
        verb: 'createRfi',
        title: draft.title.trim(),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        templateId: template?.id ?? '',
        materialCategory: family?.supplierCategory ?? '',
        responseDeadline: draft.responseDeadline,
        invitedSupplierIds: draft.invitedSupplierIds,
        questions: draft.questions,
        ...(publish ? { publish: true } : {}),
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({ variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) });
            return;
          }
          toast({
            variant: 'success',
            title: t(publish ? 'rfx.toast.published' : 'rfx.toast.draftCreated'),
          });
          // ⚠️ THE ID COMES FROM THE STORE, NOT FROM HERE. A client-minted id
          // would land the buyer on an event that does not exist.
          if (res.entityId) onCreated(res.entityId);
          else onCancel();
        },
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
      },
    );

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';

  const steps: WizardStep[] = [
    {
      id: 'scope',
      title: t('rfx.create.step.scope'),
      shortTitle: t('rfx.create.step.scope.short'),
      description: t('rfx.create.step.scope.desc'),
      content: (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfi-new-title">
              {t('rfx.create.field.title')}
            </label>
            <input
              id="rfi-new-title"
              value={draft.title}
              placeholder={t('rfx.create.field.title.ph')}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfi-new-family">
              {t('rfx.create.field.family')}
            </label>
            <select
              id="rfi-new-family"
              data-testid="rfi-new-family"
              value={draft.family}
              onChange={(e) => chooseFamily(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('rfx.create.field.family.pick')}</option>
              {RFX_CATEGORY_FAMILIES.filter((f) => f.templateId).map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.labelKey)}
                </option>
              ))}
            </select>
            {template && (
              <p className="text-xs text-text-tertiary mt-1" data-testid="rfi-new-template">
                {t('rfx.rfi.template')}: {t(template.nameKey)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfi-new-description">
              {t('rfx.create.field.description')}
            </label>
            <textarea
              id="rfi-new-description"
              rows={3}
              value={draft.description}
              placeholder={t('rfx.create.field.description.ph')}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfi-new-deadline">
              {t('rfx.create.field.deadline')}
            </label>
            <input
              id="rfi-new-deadline"
              type="date"
              value={draft.responseDeadline}
              onChange={(e) => setDraft((d) => ({ ...d, responseDeadline: e.target.value }))}
              className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
            {!deadlineInFuture && (
              <p className="text-xs text-danger mt-1" data-testid="rfi-new-deadline-refusal">
                {t('rfx.create.field.deadline.future')}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'questions',
      title: t('rfx.create.step.questions'),
      shortTitle: t('rfx.create.step.questions.short'),
      description: t('rfx.create.step.questions.desc'),
      content: (
        <div className="space-y-5">
          <p className="text-xs text-text-tertiary">{t('rfx.create.library.note')}</p>

          {RFI_SECTION_ORDER.map((section) => {
            const rows = draft.questions.filter((q) => q.sectionId === section);
            if (rows.length === 0) return null;
            return (
              <div key={section}>
                <h4 className="text-sm font-semibold text-text-primary mb-2">
                  {t(`rfx.section.${section}`)}
                </h4>
                <ul className="space-y-1">
                  {rows.map((q) => (
                    <li
                      key={q.id}
                      data-testid={`rfi-new-question-${q.id}`}
                      className="flex items-start justify-between gap-3 border border-border-subtle rounded-md px-3 py-2"
                    >
                      <span className="text-sm text-text-primary">
                        {t(q.promptKey)}
                        {q.required && (
                          <StatusPill variant="neutral" className="ml-2">
                            {t('rfx.rfi.required')}
                          </StatusPill>
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={`${t('rfx.rfi.removeQuestion')} — ${t(q.promptKey)}`}
                        data-testid={`rfi-new-remove-${q.id}`}
                        onClick={() => removeQuestion(q.id)}
                        className="text-text-tertiary hover:text-danger"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {draft.questions.length === 0 && (
            <p className="text-sm text-danger" data-testid="rfi-new-no-questions">
              {t('rfx.create.atLeastOneQuestion')}
            </p>
          )}

          {/* — Add from the library. The library itself is untouched (CE-03). — */}
          <div className="border-t border-border-subtle pt-4">
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfi-new-library">
              {t('rfx.create.library')}
            </label>
            {(() => {
              const available = RFI_QUESTION_LIBRARY.filter(
                (q) => !draft.questions.some((x) => x.id === q.id),
              );
              if (available.length === 0)
                return (
                  <p className="text-xs text-text-tertiary" data-testid="rfi-new-library-empty">
                    {t('rfx.create.library.empty')}
                  </p>
                );
              return (
                <div className="flex flex-wrap items-end gap-3">
                  <select
                    id="rfi-new-library"
                    data-testid="rfi-new-library"
                    value={libraryPick}
                    onChange={(e) => setLibraryPick(e.target.value)}
                    className="flex-1 min-w-[16rem] bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                  >
                    <option value="">—</option>
                    {available.map((q) => (
                      <option key={q.id} value={q.id}>
                        {t(`rfx.section.${q.sectionId}`)} · {t(q.promptKey)}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={!libraryPick}
                    onClick={addFromLibrary}
                    data-testid="rfi-new-library-add"
                  >
                    {t('rfx.create.add')}
                  </Button>
                </div>
              );
            })()}
          </div>

          {/* — A question for this event only (section F). — */}
          <div className="border-t border-border-subtle pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-text-primary">{t('rfx.create.oneOff')}</h4>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem]">
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfi-new-oneoff-type">
                  {t('rfx.create.oneOff.type')}
                </label>
                <select
                  id="rfi-new-oneoff-type"
                  value={oneOff.type}
                  onChange={(e) => setOneOff((o) => ({ ...o, type: e.target.value as RfiQuestionType }))}
                  className={inputClass}
                >
                  {QUESTION_TYPES.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`rfx.qtype.${kind}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[16rem]">
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfi-new-oneoff-prompt">
                  {t('rfx.create.oneOff.prompt')}
                </label>
                <input
                  id="rfi-new-oneoff-prompt"
                  value={oneOff.prompt}
                  placeholder={t('rfx.create.oneOff.prompt.ph')}
                  onChange={(e) => setOneOff((o) => ({ ...o, prompt: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text-secondary h-10">
                <input
                  type="checkbox"
                  className="accent-teal"
                  checked={oneOff.required}
                  onChange={(e) => setOneOff((o) => ({ ...o, required: e.target.checked }))}
                />
                {t('rfx.create.oneOff.required')}
              </label>
              <Button
                variant="outline"
                disabled={oneOff.prompt.trim().length === 0}
                onClick={addOneOff}
                data-testid="rfi-new-oneoff-add"
              >
                {t('rfx.rfi.addQuestion')}
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'invitees',
      title: t('rfx.create.step.invitees'),
      shortTitle: t('rfx.create.step.invitees.short'),
      description: t('rfx.create.step.invitees.desc'),
      content: (
        <RfxInviteeStep
          supplierCategory={family?.supplierCategory ?? ''}
          selected={draft.invitedSupplierIds}
          onToggle={toggleSupplier}
          testIdPrefix="rfi-new"
        />
      ),
    },
    {
      id: 'review',
      title: t('rfx.create.step.review'),
      shortTitle: t('rfx.create.step.review.short'),
      description: t('rfx.create.step.review.desc'),
      content: (
        <div className="space-y-5" data-testid="rfi-new-review">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.field.title')}</dt>
              <dd className="text-text-primary">{draft.title}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.field.family')}</dt>
              <dd className="text-text-primary">{family ? t(family.labelKey) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.field.deadline')}</dt>
              <dd className="text-text-primary">
                <Data>{draft.responseDeadline || '—'}</Data>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.review.questions')}</dt>
              <dd className="text-text-primary">
                {t('rfx.rfi.questions', { count: draft.questions.length })}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.description')}
              </dt>
              <dd className="text-text-secondary">{draft.description || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.review.invitees')}</dt>
              <dd className="text-text-primary">
                {t('rfx.invite.selected', { count: draft.invitedSupplierIds.length })}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-text-tertiary">{t('rfx.create.sendRule')}</p>

          {/* CE-06 — two acts. The draft is savable by a seat that cannot send. */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={command.isPending}
              onClick={() => create(false)}
              data-testid="rfi-new-save-draft"
            >
              {t('rfx.create.saveDraft')}
            </Button>
          </div>
          {!canPublish && (
            <p className="text-xs text-text-tertiary" data-testid="rfi-new-cannot-send">
              {t('rfx.status.draftHiddenFromSuppliers')}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <ModalOverlay onClose={onCancel}>
      <Wizard
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        onCancel={onCancel}
        onComplete={() => create(true)}
        isStepValid={(n) => (n === steps.length - 1 ? canPublish && sendable : stepValid(n))}
        completeLabel={t('rfx.create.send')}
      />
    </ModalOverlay>
  );
};

export default RfiCreateWizard;
