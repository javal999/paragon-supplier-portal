// ────────────────────────────────────────────────────────────────────────────
// RAISING A PROPOSAL REQUEST — section 3.6a (CE-01 to CE-08), REQ-E03-04, and
// the RFx authoring batch (2026-09-21).
//
// Six steps: what it is about, the terms PTI asks for, indicative pricing
// (optional), questions (optional), who is asked, and a last look.
//
// ⚠️ **A PICKED TERM WITHOUT PTI'S REQUESTED VALUE IS NOT A TERM (REQ-E03-04).**
// The comparison renders "PTI asks for" beside every supplier's answer, and a
// blank there would put an empty column header above a table of deviations from
// nothing. The verb refuses it by name (`TERM_VALUE_REQUIRED`); this step refuses
// it before the buyer gets that far, and NAMES THE TERMS still missing a value
// rather than disabling a button silently.
//
// ⚠️ **THE STANDARD TERM LIST IS STILL PROCUREMENT'S (CE-03 / CE-05)** — the
// buyer picks from it and never edits it. What is new (spec, RFP terms) is the
// CUSTOM term: a term of the buyer's own for this RFP, carrying its label, group,
// value kind and options, so a supplier can answer it and the comparison can
// label it. An off-list id without the `custom-` prefix is still refused.
//
// ⚠️ **INDICATIVE PRICING IS OPTIONAL AND ALWAYS LABELLED INDICATIVE (D4).**
// Open-spec requests (Tundra, ICY) ask for options × quantity points; firm
// prices by tier belong to the RFQ.
//
// ⚠️ **CREATED FROM AN RFI (D3).** With a `prefill`, the wizard opens on the
// RFI's title, family, scope (its description, and its questions as scope
// notes) and responders, and the created RFP stores `sourceRfiId`. Every field
// stays editable.
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import SessionAttachments from '../../components/ui-v2/SessionAttachments';
import Wizard, { WizardStep } from '../../components/ui-v2/Wizard';
import ModalOverlay from '../../components/ui-v2/ModalOverlay';
import { useToast } from '../../hooks/useToast';
import { BID_CURRENCIES, BASE_CURRENCY, type BidCurrency } from '../../lib/currencyPolicy';
import type { AttachmentMeta } from '../../services/attachments/sessionAttachments';
import { useRfxCommand } from '../../services/query/commandHooks';
import {
  RFP_STANDARD_TERMS,
  RFP_TERM_GROUP_ORDER,
  RFX_CATEGORY_FAMILIES,
  rfpTerm,
  rfxCategoryFamily,
  rfxFamilyForCategory,
} from '../../services/sourcing/rfxConfig';
import { rfpTemplateStore, type RfpTemplateContent } from '../../services/sourcing/rfxTemplates';
import type { RfpPrefill } from '../../services/sourcing/rfxPrefill';
import {
  isPastDeadline,
  rfiQuestionsRefusal,
  rfpPricingRequestRefusal,
  termValueFits,
} from '../../services/transitions/rfxRules';
import type {
  RfiQuestion,
  RfpEvent,
  RfpPricingRequest,
  RfpTermRow,
  RfxCustomSection,
} from '../../services/sourcing/types';
import RfxInviteeStep from './RfxInviteeStep';
import RfxQuestionEditor from './RfxQuestionEditor';
import RfxSaveTemplate from './RfxSaveTemplate';
import RfxStartFrom, { type StartOption } from './RfxStartFrom';
import { ConfidentialityFields } from './RfiCreateWizard';
import { CustomTermEditor, TermValueInput } from './RfpTermControls';
import { RfpPricingEditor } from './RfpPricing';
import { IndicativePill, authored, termLabel } from './rfxAuthoringDisplay';
import { rfxNow } from './rfxDisplay';

interface Draft {
  title: string;
  family: string;
  scope: string;
  currency: string;
  responseDeadline: string;
  /** Picked standard term → PTI's requested value. Order of the standard list is kept. */
  terms: Record<string, string>;
  /** The buyer's own terms for this RFP. */
  customTerms: readonly RfpTermRow[];
  invitedSupplierIds: string[];
  questions: readonly RfiQuestion[];
  customSections: readonly RfxCustomSection[];
  pricing: RfpPricingRequest | undefined;
  attachments: readonly AttachmentMeta[];
  confidential: boolean;
  confidentialityTerms: string;
  termsText: string;
  termsFile: readonly AttachmentMeta[];
  sourceRfiId: string;
}

const EMPTY: Draft = {
  title: '',
  family: '',
  scope: '',
  currency: BASE_CURRENCY,
  responseDeadline: '',
  terms: {},
  customTerms: [],
  invitedSupplierIds: [],
  questions: [],
  customSections: [],
  pricing: undefined,
  attachments: [],
  confidential: false,
  confidentialityTerms: '',
  termsText: '',
  termsFile: [],
  sourceRfiId: '',
};

interface RfpCreateWizardProps {
  onCancel: () => void;
  onCreated: (rfpId: string) => void;
  /** Does this seat hold `rfp:publish`? A seat that does not may still draft. */
  canPublish: boolean;
  /** Past events the buyer may copy (D2). */
  pastEvents?: readonly RfpEvent[];
  /** Open pre-filled from an RFI (D3). */
  prefill?: RfpPrefill & { readonly sourceRfiNumber: string };
}

/** Split a stored term list into the wizard's two halves. */
const splitTerms = (rows: readonly RfpTermRow[]) => ({
  terms: Object.fromEntries(rows.filter((r) => rfpTerm(r.termId)).map((r) => [r.termId, r.requestedValue])),
  customTerms: rows.filter((r) => !rfpTerm(r.termId)),
});

const RfpCreateWizard: React.FC<RfpCreateWizardProps> = ({
  onCancel,
  onCreated,
  canPublish,
  pastEvents = [],
  prefill,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    if (!prefill) return EMPTY;
    // D3 — the RFI's questions become the RFP's scope notes, resolved here
    // because only a component can translate.
    const notes = prefill.scopeNoteKeys.map((k) => `- ${authored(t, k)}`).join('\n');
    const scope = [prefill.scope, notes ? `${t('rfxa.fromRfi.notes')}\n${notes}` : '']
      .filter((s) => s.trim().length > 0)
      .join('\n\n');
    return {
      ...EMPTY,
      title: prefill.title,
      family: prefill.familyId,
      scope,
      invitedSupplierIds: [...prefill.invitedSupplierIds],
      attachments: prefill.attachments,
      confidential: prefill.confidential,
      confidentialityTerms: prefill.confidentialityTerms ?? '',
      sourceRfiId: prefill.sourceRfiId,
    };
  });
  const [storeVersion, setStoreVersion] = useState(0);

  const family = rfxCategoryFamily(draft.family);
  const saved = useMemo(() => rfpTemplateStore.readState(), [storeVersion]);

  const startOptions: StartOption[] = [
    ...saved.templates.map((tpl) => ({ key: `saved:${tpl.id}`, label: tpl.name, group: 'saved' as const })),
    ...pastEvents.map((e) => ({ key: `past:${e.id}`, label: `${e.eventNumber} · ${e.title}`, group: 'past' as const })),
  ];

  const applyStart = (key: string) => {
    const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (kind === 'saved') {
      const c = saved.templates.find((x) => x.id === id)?.content;
      if (!c) return;
      setDraft((d) => ({
        ...d,
        family: c.familyId,
        scope: c.scope,
        currency: c.currency,
        ...splitTerms(c.terms),
        questions: c.questions,
        customSections: c.customSections,
        pricing: c.pricing,
        confidential: c.confidential,
        confidentialityTerms: c.confidentialityTerms ?? '',
        termsText: c.termsText ?? '',
      }));
    } else if (kind === 'past') {
      const e = pastEvents.find((x) => x.id === id);
      if (!e) return;
      // A COPY carries content and invitees; its dates are cleared (D2).
      setDraft({
        ...EMPTY,
        title: e.title,
        family: rfxFamilyForCategory(e.materialCategory)?.id ?? '',
        scope: e.scope,
        currency: e.currency,
        ...splitTerms(e.terms),
        questions: e.questions ?? [],
        customSections: e.customSections ?? [],
        pricing: e.pricing,
        invitedSupplierIds: e.invitees.map((i) => i.supplierId),
        attachments: e.attachments ?? [],
        confidential: !!e.confidentiality,
        confidentialityTerms: e.confidentiality?.terms ?? '',
        termsText: e.termsDocument?.text ?? '',
        termsFile: e.termsDocument?.attachment ? [e.termsDocument.attachment] : [],
      });
    }
  };

  const togglePick = (termId: string) =>
    setDraft((d) => {
      if (termId in d.terms) {
        const { [termId]: _dropped, ...rest } = d.terms;
        return { ...d, terms: rest };
      }
      return { ...d, terms: { ...d.terms, [termId]: '' } };
    });

  const setValue = (termId: string, value: string) =>
    setDraft((d) => ({ ...d, terms: { ...d.terms, [termId]: value } }));

  const toggleSupplier = (supplierId: string) =>
    setDraft((d) => ({
      ...d,
      invitedSupplierIds: d.invitedSupplierIds.includes(supplierId)
        ? d.invitedSupplierIds.filter((s) => s !== supplierId)
        : [...d.invitedSupplierIds, supplierId],
    }));

  const picked = Object.keys(draft.terms);
  /** The picked terms still missing PTI's value, or holding one not of the term's kind. */
  const missingValues = picked.filter(
    (id) => draft.terms[id].trim().length === 0 || !termValueFits({ termId: id, requestedValue: '' }, draft.terms[id]),
  );

  // CE-07 — the same reading the submit verb uses, so the wizard cannot admit a
  // window the answer gate treats as closed.
  const deadlineInFuture =
    draft.responseDeadline !== '' && !isPastDeadline(draft.responseDeadline, rfxNow());

  const pricingRefusal = rfpPricingRequestRefusal(draft.pricing);
  const questionsRefusal = rfiQuestionsRefusal(draft.questions, draft.customSections);

  const stepValid = (n: number): boolean => {
    if (n === 0) return draft.title.trim().length > 0 && draft.family !== '' && deadlineInFuture;
    if (n === 1) return picked.length + draft.customTerms.length > 0 && missingValues.length === 0;
    if (n === 2) return pricingRefusal === null;
    if (n === 3) return questionsRefusal === null;
    if (n === 4) return draft.invitedSupplierIds.length > 0;
    return true;
  };

  const sendable = [0, 1, 2, 3, 4].every(stepValid);

  /** The rows in the STANDARD LIST's own order, then the buyer's own terms. */
  const termRows = (): RfpTermRow[] => [
    ...RFP_STANDARD_TERMS.filter((term) => term.id in draft.terms).map((term) => ({
      termId: term.id,
      requestedValue: draft.terms[term.id].trim(),
    })),
    ...draft.customTerms,
  ];

  const hasTc = draft.termsText.trim().length > 0 || draft.termsFile.length > 0;

  const create = (publish: boolean) =>
    command.mutate(
      {
        verb: 'createRfp',
        title: draft.title.trim(),
        scope: draft.scope.trim(),
        materialCategory: family?.supplierCategory ?? '',
        responseDeadline: draft.responseDeadline,
        currency: draft.currency,
        invitedSupplierIds: draft.invitedSupplierIds,
        terms: termRows(),
        ...(draft.questions.length > 0 ? { questions: draft.questions } : {}),
        ...(draft.customSections.length > 0 ? { customSections: draft.customSections } : {}),
        ...(draft.pricing ? { pricing: draft.pricing } : {}),
        ...(draft.attachments.length > 0 ? { attachments: draft.attachments } : {}),
        ...(draft.confidential
          ? { confidentiality: draft.confidentialityTerms.trim() ? { terms: draft.confidentialityTerms.trim() } : {} }
          : {}),
        ...(hasTc
          ? {
              termsDocument: {
                ...(draft.termsText.trim() ? { text: draft.termsText.trim() } : {}),
                ...(draft.termsFile[0] ? { attachment: draft.termsFile[0] } : {}),
              },
            }
          : {}),
        ...(draft.sourceRfiId ? { sourceRfiId: draft.sourceRfiId } : {}),
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
          if (res.entityId) onCreated(res.entityId);
          else onCancel();
        },
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
      },
    );

  const contentOf = (): RfpTemplateContent => ({
    familyId: draft.family,
    scope: draft.scope.trim(),
    currency: draft.currency,
    terms: termRows(),
    questions: draft.questions,
    customSections: draft.customSections,
    ...(draft.pricing ? { pricing: draft.pricing } : {}),
    confidential: draft.confidential,
    ...(draft.confidential && draft.confidentialityTerms.trim()
      ? { confidentialityTerms: draft.confidentialityTerms.trim() }
      : {}),
    ...(draft.termsText.trim() ? { termsText: draft.termsText.trim() } : {}),
  });

  const saveTemplate = (name: string) => {
    const res = rfpTemplateStore.save(name, contentOf(), rfxNow());
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
          {prefill && (
            <p className="text-sm text-action-hover bg-action-soft rounded px-3 py-2" data-testid="rfp-new-from-rfi">
              {t('rfx.event.fromRfi', { event: prefill.sourceRfiNumber })}. {t('rfxa.fromRfi.editable')}
            </p>
          )}
          <RfxStartFrom
            options={startOptions}
            onApply={applyStart}
            onDeleteSaved={(key) => {
              rfpTemplateStore.remove(key.slice('saved:'.length));
              setStoreVersion((v) => v + 1);
            }}
            unreadable={saved.unreadable}
            rejected={saved.rejected}
            testIdPrefix="rfp-new"
          />
          <div>
            <label className={labelClass} htmlFor="rfp-new-title">
              {t('rfx.create.field.title')}
            </label>
            <input
              id="rfp-new-title"
              value={draft.title}
              placeholder={t('rfx.create.field.title.ph')}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="rfp-new-family">
              {t('rfx.create.field.family')}
            </label>
            <select
              id="rfp-new-family"
              data-testid="rfp-new-family"
              value={draft.family}
              onChange={(e) => setDraft((d) => ({ ...d, family: e.target.value }))}
              className={inputClass}
            >
              <option value="">{t('rfx.create.field.family.pick')}</option>
              {RFX_CATEGORY_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="rfp-new-scope">
              {t('rfx.rfp.field.scope')}
            </label>
            <textarea
              id="rfp-new-scope"
              rows={4}
              value={draft.scope}
              placeholder={t('rfx.rfp.field.scope.ph')}
              onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value }))}
              className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[10rem]">
              <label className={labelClass} htmlFor="rfp-new-currency">
                {t('rfx.rfp.field.currency')}
              </label>
              <select
                id="rfp-new-currency"
                data-testid="rfp-new-currency"
                value={draft.currency}
                onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                className={inputClass}
              >
                {BID_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="rfp-new-deadline">
                {t('rfx.create.field.deadline')}
              </label>
              <input
                id="rfp-new-deadline"
                type="date"
                value={draft.responseDeadline}
                onChange={(e) => setDraft((d) => ({ ...d, responseDeadline: e.target.value }))}
                className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              {!deadlineInFuture && (
                <p className="text-xs text-danger mt-1" data-testid="rfp-new-deadline-refusal">
                  {t('rfx.create.field.deadline.future')}
                </p>
              )}
            </div>
          </div>
          <div>
            <SessionAttachments
              value={draft.attachments}
              onChange={(next) => setDraft((d) => ({ ...d, attachments: next }))}
              label={t('rfxa.att.buyer')}
              testId="rfp-new-attachments"
            />
          </div>
          <ConfidentialityFields
            confidential={draft.confidential}
            terms={draft.confidentialityTerms}
            onChange={(confidential, terms) =>
              setDraft((d) => ({ ...d, confidential, confidentialityTerms: terms }))
            }
            testIdPrefix="rfp-new"
          />
          <div className="space-y-2" data-testid="rfp-new-tc">
            <label className={labelClass} htmlFor="rfp-new-tc-text">
              {t('rfxa.tc.title')}
            </label>
            <p className="text-xs text-text-tertiary">{t('rfxa.tc.hint')}</p>
            <textarea
              id="rfp-new-tc-text"
              rows={3}
              value={draft.termsText}
              onChange={(e) => setDraft((d) => ({ ...d, termsText: e.target.value }))}
              className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
            />
            <SessionAttachments
              value={draft.termsFile}
              single
              onChange={(next) => setDraft((d) => ({ ...d, termsFile: next }))}
              label={t('rfxa.tc.file')}
              testId="rfp-new-tc-file"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'terms',
      title: t('rfx.create.step.terms'),
      shortTitle: t('rfx.create.step.terms.short'),
      description: t('rfx.create.step.terms.desc'),
      content: (
        <div className="space-y-5">
          <p className="text-xs text-text-tertiary">{t('rfx.create.library.note')}</p>

          {RFP_TERM_GROUP_ORDER.map((group) => {
            const rows = RFP_STANDARD_TERMS.filter((term) => term.group === group);
            if (rows.length === 0) return null;
            return (
              <div key={group}>
                <h4 className="text-xs uppercase tracking-wide text-text-tertiary mb-2">
                  {t(`rfx.group.${group}`)}
                </h4>
                <ul className="space-y-2">
                  {rows.map((term) => {
                    const chosen = term.id in draft.terms;
                    const row: RfpTermRow = { termId: term.id, requestedValue: '' };
                    return (
                      <li
                        key={term.id}
                        data-testid={`rfp-new-term-${term.id}`}
                        className="flex flex-wrap items-center gap-3 border border-border-subtle rounded-md px-3 py-2"
                      >
                        <label className="flex items-center gap-2 text-sm text-text-primary min-w-[14rem]">
                          <input
                            type="checkbox"
                            className="accent-teal"
                            checked={chosen}
                            aria-label={`${t(term.labelKey)} — ${t('rfx.rfp.term.pick')}`}
                            onChange={() => togglePick(term.id)}
                          />
                          {t(term.labelKey)}
                        </label>
                        {chosen && (
                          <div className="flex-1 min-w-[12rem]">
                            <TermValueInput
                              row={row}
                              value={draft.terms[term.id]}
                              onChange={(v) => setValue(term.id, v)}
                              ariaLabel={`${t(term.labelKey)} — ${t('rfx.rfp.term.requested')}`}
                              invalid={missingValues.includes(term.id) && draft.terms[term.id].trim().length > 0}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <CustomTermEditor
            terms={draft.customTerms}
            onChange={(next) => setDraft((d) => ({ ...d, customTerms: next }))}
          />

          {picked.length + draft.customTerms.length === 0 && (
            <p className="text-sm text-danger" data-testid="rfp-new-no-terms">
              {t('rfx.create.atLeastOneTerm')}
            </p>
          )}
          {missingValues.length > 0 && (
            <p className="text-sm text-danger" data-testid="rfp-new-missing-values">
              {t('rfx.rfp.term.requestedMissing')}{' '}
              {missingValues.map((id) => t(rfpTerm(id)!.labelKey)).join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'pricing',
      title: t('rfxa.step.pricing'),
      shortTitle: t('rfxa.step.pricing.short'),
      description: t('rfxa.step.pricing.desc'),
      content: (
        <RfpPricingEditor value={draft.pricing} onChange={(next) => setDraft((d) => ({ ...d, pricing: next }))} />
      ),
    },
    {
      id: 'questions',
      title: t('rfxa.step.rfpQuestions'),
      shortTitle: t('rfx.create.step.questions.short'),
      description: t('rfxa.step.rfpQuestions.desc'),
      content: (
        <RfxQuestionEditor
          value={{ questions: draft.questions, customSections: draft.customSections }}
          onChange={(next) =>
            setDraft((d) => ({ ...d, questions: next.questions, customSections: next.customSections }))
          }
          defaultCurrency={draft.currency as BidCurrency}
          testIdPrefix="rfp-new"
        />
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
          testIdPrefix="rfp-new"
        />
      ),
    },
    {
      id: 'review',
      title: t('rfx.create.step.review'),
      shortTitle: t('rfx.create.step.review.short'),
      description: t('rfx.create.step.review.desc'),
      content: (
        <div className="space-y-5" data-testid="rfp-new-review">
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
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.rfp.field.currency')}</dt>
              <dd className="text-text-primary">
                <Data>{draft.currency}</Data>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.rfp.field.scope')}</dt>
              <dd className="text-text-secondary whitespace-pre-line">{draft.scope || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.review.terms')}</dt>
              <dd>
                <ul className="space-y-1">
                  {termRows().map((row) => (
                    <li key={row.termId} className="text-sm" data-testid={`rfp-new-review-term-${row.termId}`}>
                      <span className="text-text-primary">{termLabel(t, row)}</span>
                      {' — '}
                      <Data>{row.requestedValue}</Data>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.step.pricing.short')}</dt>
              <dd className="text-text-primary" data-testid="rfp-new-review-pricing">
                {draft.pricing ? (
                  <>
                    {t('rfxa.pricing.summary', {
                      options: draft.pricing.options.length,
                      points: draft.pricing.quantityPoints.length,
                    })}{' '}
                    <IndicativePill />
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.review.questions')}</dt>
              <dd className="text-text-primary">{t('rfx.rfi.questions', { count: draft.questions.length })}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.conf.pill')}</dt>
              <dd className="text-text-primary">{draft.confidential ? t('rfxa.conf.on') : t('rfxa.conf.off')}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.tc.title')}</dt>
              <dd className="text-text-primary">{hasTc ? t('rfxa.tc.on') : t('rfxa.tc.off')}</dd>
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
              data-testid="rfp-new-save-draft"
            >
              {t('rfx.create.saveDraft')}
            </Button>
          </div>
          {!canPublish && (
            <p className="text-xs text-text-tertiary" data-testid="rfp-new-cannot-send">
              {t('rfx.status.draftHiddenFromSuppliers')}
            </p>
          )}

          <RfxSaveTemplate onSave={saveTemplate} defaultName={draft.title} testIdPrefix="rfp-new" />
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

export default RfpCreateWizard;
