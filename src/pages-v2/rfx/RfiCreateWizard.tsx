// ────────────────────────────────────────────────────────────────────────────
// RAISING AN INFORMATION REQUEST — section 3.6a (CE-01 to CE-08), REQ-E03-02,
// and the RFx authoring batch (2026-09-21).
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
// ⚠️ **THE LIBRARY IS NEVER EDITED HERE (CE-03 / CE-05).** The template opens
// the question list and the buyer adds and removes FOR THIS EVENT; the event
// carries its own list from birth (the create verb stores `questions`), so a
// later change to `rfxConfig` never rewrites an event suppliers have answered.
//
// ⚠️ **CE-04 IS REVERSED (D2).** The buyer may start from a system template,
// from a template of their own, or from a copy of a past RFI, and may save this
// one as a template. A copy carries content and invitees; its dates are blank.
// Templates live in this browser (`rfxTemplates.ts`) and the page says so.
//
// ⚠️ **A ONE-OFF QUESTION'S PROMPT IS THE BUYER'S OWN WORDS, NOT AN i18n KEY.**
// Every library prompt is a key resolved through `t()`; a question typed here
// cannot be, because nobody translated it. It renders as the buyer's sentence
// in both locales (`authored`), which is the honest outcome.
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import SessionAttachments from '../../components/ui-v2/SessionAttachments';
import Wizard, { WizardStep } from '../../components/ui-v2/Wizard';
import { useToast } from '../../hooks/useToast';
import { BASE_CURRENCY } from '../../lib/currencyPolicy';
import type { SessionAttachmentMeta } from '../../lib/sessionFiles';
import { useRfxCommand } from '../../services/query/commandHooks';
import {
  RFI_QUESTION_LIBRARY,
  RFI_TEMPLATES,
  RFX_CATEGORY_FAMILIES,
  rfiTemplate,
  rfxCategoryFamily,
  rfxFamilyForCategory,
} from '../../services/sourcing/rfxConfig';
import { rfiTemplateStore, type RfiTemplateContent } from '../../services/sourcing/rfxTemplates';
import { isPastDeadline } from '../../services/transitions/rfxRules';
import type { RfiEvent, RfiQuestion, RfxCustomSection } from '../../services/sourcing/types';
import RfxInviteeStep from './RfxInviteeStep';
import RfxQuestionEditor from './RfxQuestionEditor';
import RfxSaveTemplate from './RfxSaveTemplate';
import RfxStartFrom, { type StartOption } from './RfxStartFrom';
import { rfxNow } from './rfxDisplay';

interface Draft {
  title: string;
  family: string;
  description: string;
  responseDeadline: string;
  questions: readonly RfiQuestion[];
  customSections: readonly RfxCustomSection[];
  invitedSupplierIds: string[];
  attachments: readonly SessionAttachmentMeta[];
  confidential: boolean;
  confidentialityTerms: string;
}

const EMPTY: Draft = {
  title: '',
  family: '',
  description: '',
  responseDeadline: '',
  questions: [],
  customSections: [],
  invitedSupplierIds: [],
  attachments: [],
  confidential: false,
  confidentialityTerms: '',
};

interface RfiCreateWizardProps {
  /** Close without creating anything. */
  onCancel: () => void;
  /** The new event's id — the board lands the buyer on it (CE-08's trail). */
  onCreated: (rfiId: string) => void;
  /** Does this seat hold `rfi:publish`? A seat that does not may still draft. */
  canPublish: boolean;
  /** Past events the buyer may copy (D2). */
  pastEvents?: readonly RfiEvent[];
}

/** The template content this draft would save (D2): content only, never who or when. */
const contentOf = (d: Draft): RfiTemplateContent => ({
  familyId: d.family,
  ...(d.description.trim() ? { description: d.description.trim() } : {}),
  questions: d.questions,
  customSections: d.customSections,
  confidential: d.confidential,
  ...(d.confidential && d.confidentialityTerms.trim() ? { confidentialityTerms: d.confidentialityTerms.trim() } : {}),
});

const RfiCreateWizard: React.FC<RfiCreateWizardProps> = ({ onCancel, onCreated, canPublish, pastEvents = [] }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  // Bumped after a save or delete so the picker re-reads the store.
  const [storeVersion, setStoreVersion] = useState(0);

  const family = rfxCategoryFamily(draft.family);
  const template = family?.templateId ? rfiTemplate(family.templateId) : undefined;

  const saved = useMemo(() => rfiTemplateStore.readState(), [storeVersion]);

  const startOptions: StartOption[] = [
    ...RFI_TEMPLATES.map((tpl) => ({ key: `system:${tpl.id}`, label: t(tpl.nameKey), group: 'system' as const })),
    ...saved.templates.map((tpl) => ({ key: `saved:${tpl.id}`, label: tpl.name, group: 'saved' as const })),
    ...pastEvents.map((e) => ({ key: `past:${e.id}`, label: `${e.eventNumber} · ${e.title}`, group: 'past' as const })),
  ];

  const applyContent = (c: RfiTemplateContent) =>
    setDraft((d) => ({
      ...d,
      family: c.familyId,
      description: c.description ?? d.description,
      questions: c.questions,
      customSections: c.customSections,
      confidential: c.confidential,
      confidentialityTerms: c.confidentialityTerms ?? '',
    }));

  const applyStart = (key: string) => {
    const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (kind === 'system') {
      const fam = RFX_CATEGORY_FAMILIES.find((f) => f.templateId === id);
      setDraft((d) => ({ ...d, family: fam?.id ?? d.family, questions: rfiTemplate(id)?.questions ?? [], customSections: [] }));
    } else if (kind === 'saved') {
      const tpl = saved.templates.find((x) => x.id === id);
      if (tpl) applyContent(tpl.content);
    } else if (kind === 'past') {
      const e = pastEvents.find((x) => x.id === id);
      if (!e) return;
      // A COPY carries content and invitees; its dates are cleared (D2).
      setDraft({
        ...EMPTY,
        title: e.title,
        family: rfxFamilyForCategory(e.materialCategory)?.id ?? '',
        description: e.description ?? '',
        questions: e.questions,
        customSections: e.customSections ?? [],
        invitedSupplierIds: e.invitees.map((i) => i.supplierId),
        attachments: e.attachments ?? [],
        confidential: !!e.confidentiality,
        confidentialityTerms: e.confidentiality?.terms ?? '',
      });
    }
  };

  /** Choosing the family RE-OPENS the question list from its template. */
  const chooseFamily = (id: string) => {
    const tpl = rfxCategoryFamily(id)?.templateId;
    const questions = tpl ? [...(rfiTemplate(tpl)?.questions ?? [])] : [];
    setDraft((d) => ({ ...d, family: id, questions, customSections: [] }));
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
        ...(draft.customSections.length > 0 ? { customSections: draft.customSections } : {}),
        ...(draft.attachments.length > 0 ? { attachments: draft.attachments } : {}),
        ...(draft.confidential
          ? { confidentiality: draft.confidentialityTerms.trim() ? { terms: draft.confidentialityTerms.trim() } : {} }
          : {}),
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

  const saveTemplate = (name: string) => {
    const res = rfiTemplateStore.save(name, contentOf(draft), rfxNow());
    setStoreVersion((v) => v + 1);
    return res;
  };

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  const steps: WizardStep[] = [
    {
      id: 'scope',
      title: t('rfx.create.step.scope'),
      shortTitle: t('rfx.create.step.scope.short'),
      description: t('rfx.create.step.scope.desc'),
      content: (
        <div className="space-y-5">
          <RfxStartFrom
            options={startOptions}
            onApply={applyStart}
            onDeleteSaved={(key) => {
              rfiTemplateStore.remove(key.slice('saved:'.length));
              setStoreVersion((v) => v + 1);
            }}
            unreadable={saved.unreadable}
            rejected={saved.rejected}
            testIdPrefix="rfi-new"
          />
          <div>
            <label className={labelClass} htmlFor="rfi-new-title">
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
            <label className={labelClass} htmlFor="rfi-new-family">
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
            <label className={labelClass} htmlFor="rfi-new-description">
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
            <label className={labelClass} htmlFor="rfi-new-deadline">
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
          <div>
            <span className={labelClass}>{t('rfxa.att.buyer')}</span>
            <SessionAttachments
              value={draft.attachments}
              onChange={(next) => setDraft((d) => ({ ...d, attachments: next }))}
              label={t('rfxa.att.buyer')}
              testId="rfi-new-attachments"
            />
          </div>
          <ConfidentialityFields
            confidential={draft.confidential}
            terms={draft.confidentialityTerms}
            onChange={(confidential, terms) =>
              setDraft((d) => ({ ...d, confidential, confidentialityTerms: terms }))
            }
            testIdPrefix="rfi-new"
          />
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
          <RfxQuestionEditor
            value={{ questions: draft.questions, customSections: draft.customSections }}
            onChange={(next) =>
              setDraft((d) => ({ ...d, questions: next.questions, customSections: next.customSections }))
            }
            library={RFI_QUESTION_LIBRARY}
            defaultCurrency={BASE_CURRENCY}
            testIdPrefix="rfi-new"
          />
          {draft.questions.length === 0 && (
            <p className="text-sm text-danger" data-testid="rfi-new-no-questions">
              {t('rfx.create.atLeastOneQuestion')}
            </p>
          )}
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
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.att.buyer')}</dt>
              <dd className="text-text-primary" data-testid="rfi-new-review-attachments">
                {t('rfxa.att.count', { count: draft.attachments.length })}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.conf.pill')}</dt>
              <dd className="text-text-primary" data-testid="rfi-new-review-confidential">
                {draft.confidential ? t('rfxa.conf.on') : t('rfxa.conf.off')}
              </dd>
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

          <RfxSaveTemplate onSave={saveTemplate} defaultName={draft.title} testIdPrefix="rfi-new" />
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(13,27,42,0.4)]">
      <Wizard
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        onCancel={onCancel}
        onComplete={() => create(true)}
        isStepValid={(n) => (n === steps.length - 1 ? canPublish && sendable : stepValid(n))}
        completeLabel={t('rfx.create.send')}
      />
    </div>
  );
};

/** The optional confidentiality gate, as the buyer sets it on an event. */
export const ConfidentialityFields: React.FC<{
  confidential: boolean;
  terms: string;
  onChange: (confidential: boolean, terms: string) => void;
  testIdPrefix: string;
}> = ({ confidential, terms, onChange, testIdPrefix: p }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          className="accent-teal"
          checked={confidential}
          data-testid={`${p}-confidential`}
          onChange={(e) => onChange(e.target.checked, terms)}
        />
        {t('rfxa.conf.toggle')}
      </label>
      <p className="text-xs text-text-tertiary">{t('rfxa.conf.toggle.hint')}</p>
      {confidential && (
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`${p}-confidential-terms`}>
            {t('rfxa.conf.terms')}
          </label>
          <textarea
            id={`${p}-confidential-terms`}
            rows={3}
            value={terms}
            placeholder={t('rfxa.conf.standardTerms')}
            onChange={(e) => onChange(true, e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
          />
        </div>
      )}
    </div>
  );
};

export default RfiCreateWizard;
