// ────────────────────────────────────────────────────────────────────────────
// RAISING A PROPOSAL REQUEST — section 3.6a (CE-01 to CE-08), REQ-E03-04, and
// the RFx authoring batch (2026-09-21).
//
// Seven steps: what it is about, the terms PTI asks for, indicative pricing
// (optional), questions (optional), who is asked, the documents each supplier
// sends back (optional, NR-1 BR-02), and a last look.
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
// stays editable, and step 1 says where it came from ("Pre-filled from RFI-…").
//
// ⚠️ **BL-93 — THE SAME WIZARD EDITS A DRAFT.** With `editing`, it opens on
// every stored field of that Draft RFP (dates, terms, pricing options, T&C,
// files, invitees) and saves through `t_rfp_revise_draft`. The RFI it came from
// is not editable content: the verb keeps the stored `sourceRfiId`.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
import Wizard from '@components/ui-v2/Wizard';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
import { useToast } from '@hooks/useToast';
/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { BID_CURRENCIES, BASE_CURRENCY } from '@lib/currencyPolicy';
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
import { useRfxCommand } from '@services/query/commandHooks';
import {
  RFP_STANDARD_TERMS,
  RFP_TERM_GROUP_ORDER,
  RFX_CATEGORY_FAMILIES,
  rfpTerm,
  rfxCategoryFamily,
  rfxFamilyForCategory
} from '@services/sourcing/rfxConfig';
/** @import { RfpTemplateContent } from '@services/sourcing/rfxTemplates' */
import { rfpTemplateStore } from '@services/sourcing/rfxTemplates';
/** @import { RfpPrefill } from '@services/sourcing/rfxPrefill' */
import {
  isPastDeadline,
  rfiQuestionsRefusal,
  rfpPricingRequestRefusal,
  termValueFits
} from '@services/transitions/rfxRules';
import { documentRequestsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { DocumentRequest, RfiQuestion, RfpEvent, RfpPricingRequest, RfpTermRow, RfxCustomSection } from '@services/sourcing/types' */
import DocumentRequestsEditor, { DocumentRequestsSummary } from './DocumentRequestsEditor';
import RfxInviteeStep from './RfxInviteeStep';
import { useSourcingTypeMap } from './eligibilityDisplay';
import { mappedSourcingType } from '@services/sourcing/sourcingType';
import RfxQuestionEditor from './RfxQuestionEditor';
import RfxSaveTemplate from './RfxSaveTemplate';
/** @import { StartOption } from './RfxStartFrom' */
import RfxStartFrom from './RfxStartFrom';
import { ConfidentialityFields } from './RfiCreateWizard';
import { CustomTermEditor, TermValueInput } from './RfpTermControls';
import { RfpPricingEditor } from './RfpPricing';
import { IndicativePill, authored, termLabel } from './rfxAuthoringDisplay';
import { rfxNow } from './rfxDisplay';
import { draftEditRefusal } from './draftEdit';
import { PrefillBanner } from './rfqSources';

/**
 * @typedef {object} Draft
 * @property {string} title
 * @property {string} family
 * @property {string} scope
 * @property {string} currency
 * @property {string} responseDeadline
 * @property {Record<string, string>} terms -  Picked standard term → PTI's requested value. Order of the standard list is kept.
 * @property {readonly RfpTermRow[]} customTerms -  The buyer's own terms for this RFP.
 * @property {string[]} invitedSupplierIds
 * @property {readonly RfiQuestion[]} questions
 * @property {readonly RfxCustomSection[]} customSections
 * @property {RfpPricingRequest | undefined} pricing
 * @property {readonly AttachmentMeta[]} attachments
 * @property {boolean} confidential
 * @property {string} confidentialityTerms
 * @property {string} termsText
 * @property {readonly AttachmentMeta[]} termsFile
 * @property {string} sourceRfiId
 * @property {string} [purchasingGroup] -  Not authored here: carried so an edit keeps the event's purchasing group.
 * @property {readonly DocumentRequest[]} documentRequests NR-1 BR-02 — edited on the "Documents from suppliers" step (B3), and
 *   carried through edit, copy, template and RFI pre-fill.
 */

/** @type {Draft} */
const EMPTY = {
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
  documentRequests: []
};

/**
 * @typedef {object} RfpCreateWizardProps
 * @property {() => void} onCancel
 * @property {(rfpId: string) => void} onCreated
 * @property {boolean} canPublish -  Does this seat hold `rfp:publish`? A seat that does not may still draft.
 * @property {readonly RfpEvent[]} [pastEvents] -  Past events the buyer may copy (D2).
 * @property {RfpPrefill & { readonly sourceRfiNumber: string }} [prefill] -  Open pre-filled from an RFI (D3).
 * @property {RfpEvent} [editing] -  BL-93 — the Draft RFP being edited. Absent = a new RFP.
 */

/**
 * Split a stored term list into the wizard's two halves.
 * @param {readonly RfpTermRow[]} rows
 */
const splitTerms = (rows) => ({
  terms: Object.fromEntries(
    rows.filter((r) => rfpTerm(r.termId)).map((r) => [r.termId, r.requestedValue])
  ),
  customTerms: rows.filter((r) => !rfpTerm(r.termId))
});

/**
 * BL-93 — a stored Draft RFP as the wizard edits it: every field, dates kept.
 * @param {RfpEvent} e
 * @returns {Draft}
 */
const draftOf = (e) => ({
  title: e.title,
  family: rfxFamilyForCategory(e.materialCategory)?.id ?? '',
  scope: e.scope,
  currency: e.currency,
  responseDeadline: e.responseDeadline,
  ...splitTerms(e.terms),
  invitedSupplierIds: e.invitees.map((i) => i.supplierId),
  questions: e.questions ?? [],
  customSections: e.customSections ?? [],
  pricing: e.pricing,
  attachments: e.attachments ?? [],
  confidential: !!e.confidentiality,
  confidentialityTerms: e.confidentiality?.terms ?? '',
  termsText: e.termsDocument?.text ?? '',
  termsFile: e.termsDocument?.attachment ? [e.termsDocument.attachment] : [],
  sourceRfiId: e.sourceRfiId ?? '',
  ...(e.purchasingGroup ? { purchasingGroup: e.purchasingGroup } : {}),
  documentRequests: e.documentRequests ?? []
});

/** @type {React.FC<RfpCreateWizardProps>} */
const RfpCreateWizard = ({
  onCancel,
  onCreated,
  canPublish,
  pastEvents = [],
  prefill,
  editing
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(
    /** @type {() => Draft} */ (
      () => {
        if (editing) return draftOf(editing);
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
          // NR-1 BR-11 — the RFI's requests carry; its responses' documents do not.
          documentRequests: prefill.documentRequests
        };
      }
    )
  );
  const [storeVersion, setStoreVersion] = useState(0);

  const family = rfxCategoryFamily(draft.family);
  // Material G2 (MR-10 BR-06) — the type comes from the category (and the
  // purchasing group when one is set); the buyer never types it.
  const sourcingMap = useSourcingTypeMap();
  const sourcingType = family
    ? mappedSourcingType(
        {
          kind: 'rfp',
          materialCategory: family.supplierCategory,
          ...(draft.purchasingGroup ? { purchasingGroup: draft.purchasingGroup } : {})
        },
        sourcingMap
      )
    : undefined;
  const saved = useMemo(() => rfpTemplateStore.readState(), [storeVersion]);

  /** @type {StartOption[]} */
  const startOptions = [
    ...saved.templates.map((tpl) => ({
      key: `saved:${tpl.id}`,
      label: tpl.name,
      group: /** @type {const} */ ('saved')
    })),
    ...pastEvents.map((e) => ({
      key: `past:${e.id}`,
      label: `${e.eventNumber} · ${e.title}`,
      group: /** @type {const} */ ('past')
    }))
  ];

  /** @param {string} key */
  const applyStart = (key) => {
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
        documentRequests: c.documentRequests ?? []
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
        // NR-1 BR-11 — the buyer's requests copy; supplier documents never do.
        documentRequests: e.documentRequests ?? []
      });
    }
  };

  /** @param {string} termId */
  const togglePick = (termId) =>
    setDraft((d) => {
      if (termId in d.terms) {
        const { [termId]: _dropped, ...rest } = d.terms;
        return { ...d, terms: rest };
      }
      return { ...d, terms: { ...d.terms, [termId]: '' } };
    });

  /**
   * @param {string} termId
   * @param {string} value
   */
  const setValue = (termId, value) =>
    setDraft((d) => ({ ...d, terms: { ...d.terms, [termId]: value } }));

  /** @param {string} supplierId */
  const toggleSupplier = (supplierId) =>
    setDraft((d) => ({
      ...d,
      invitedSupplierIds: d.invitedSupplierIds.includes(supplierId)
        ? d.invitedSupplierIds.filter((s) => s !== supplierId)
        : [...d.invitedSupplierIds, supplierId]
    }));

  const picked = Object.keys(draft.terms);
  /** The picked terms still missing PTI's value, or holding one not of the term's kind. */
  const missingValues = picked.filter(
    (id) =>
      draft.terms[id].trim().length === 0 ||
      !termValueFits({ termId: id, requestedValue: '' }, draft.terms[id])
  );

  // CE-07 — the same reading the submit verb uses, so the wizard cannot admit a
  // window the answer gate treats as closed.
  const deadlineInFuture =
    draft.responseDeadline !== '' && !isPastDeadline(draft.responseDeadline, rfxNow());

  const pricingRefusal = rfpPricingRequestRefusal(draft.pricing);
  const questionsRefusal = rfiQuestionsRefusal(draft.questions, draft.customSections);

  /**
   * @param {number} n
   * @returns {boolean}
   */
  const stepValid = (n) => {
    if (n === 0) return draft.title.trim().length > 0 && draft.family !== '' && deadlineInFuture;
    if (n === 1) return picked.length + draft.customTerms.length > 0 && missingValues.length === 0;
    if (n === 2) return pricingRefusal === null;
    if (n === 3) return questionsRefusal === null;
    if (n === 4) return draft.invitedSupplierIds.length > 0;
    // NR-1 BR-02 — the create verb's own rule; an RFP has no items.
    if (n === 5) return documentRequestsRefusal(draft.documentRequests) === null;
    return true;
  };

  const sendable = [0, 1, 2, 3, 4, 5].every(stepValid);

  /**
   * The rows in the STANDARD LIST's own order, then the buyer's own terms.
   * @returns {RfpTermRow[]}
   */
  const termRows = () => [
    ...RFP_STANDARD_TERMS.filter((term) => term.id in draft.terms).map((term) => ({
      termId: term.id,
      requestedValue: draft.terms[term.id].trim()
    })),
    ...draft.customTerms
  ];

  const hasTc = draft.termsText.trim().length > 0 || draft.termsFile.length > 0;

  /** @param {boolean} publish */
  const create = (publish) =>
    command.mutate(
      {
        ...(editing
          ? { verb: /** @type {const} */ ('reviseRfp'), rfpId: editing.id }
          : { verb: /** @type {const} */ ('createRfp') }),
        title: draft.title.trim(),
        scope: draft.scope.trim(),
        materialCategory: family?.supplierCategory ?? '',
        ...(draft.purchasingGroup ? { purchasingGroup: draft.purchasingGroup } : {}),
        responseDeadline: draft.responseDeadline,
        currency: draft.currency,
        invitedSupplierIds: draft.invitedSupplierIds,
        terms: termRows(),
        ...(draft.questions.length > 0 ? { questions: draft.questions } : {}),
        ...(draft.customSections.length > 0 ? { customSections: draft.customSections } : {}),
        ...(draft.pricing ? { pricing: draft.pricing } : {}),
        ...(draft.attachments.length > 0 ? { attachments: draft.attachments } : {}),
        ...(draft.documentRequests.length > 0 ? { documentRequests: draft.documentRequests } : {}),
        ...(draft.confidential
          ? {
              confidentiality: draft.confidentialityTerms.trim()
                ? { terms: draft.confidentialityTerms.trim() }
                : {}
            }
          : {}),
        ...(hasTc
          ? {
              termsDocument: {
                ...(draft.termsText.trim() ? { text: draft.termsText.trim() } : {}),
                ...(draft.termsFile[0] ? { attachment: draft.termsFile[0] } : {})
              }
            }
          : {}),
        ...(draft.sourceRfiId ? { sourceRfiId: draft.sourceRfiId } : {}),
        ...(publish ? { publish: true } : {})
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'error',
              title:
                draftEditRefusal(t, res.reason) ??
                t('rfx.toast.refused', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'success',
            title: t(
              editing
                ? publish
                  ? 'rfxEdit.toast.sent'
                  : 'rfxEdit.toast.saved'
                : publish
                  ? 'rfx.toast.published'
                  : 'rfx.toast.draftCreated'
            )
          });
          if (res.entityId) onCreated(res.entityId);
          else onCancel();
        },
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) })
      }
    );

  /** @returns {RfpTemplateContent} */
  const contentOf = () => ({
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
    ...(draft.documentRequests.length > 0 ? { documentRequests: draft.documentRequests } : {})
  });

  /** @param {string} name */
  const saveTemplate = (name) => {
    const res = rfpTemplateStore.save(name, contentOf(), rfxNow());
    setStoreVersion((v) => v + 1);
    return res;
  };

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  /** @type {WizardStep[]} */
  const steps = [
    {
      id: 'scope',
      title: t('rfx.create.step.scope'),
      shortTitle: t('rfx.create.step.scope.short'),
      description: t('rfx.create.step.scope.desc'),
      content: (
        <div className="space-y-5">
          {/* B6 — the one-line source note, the same banner the RFQ wizard
              shows, naming the RFI by its number (the view's resolver). */}
          {prefill && !editing ? (
            <PrefillBanner source={prefill.sourceRfiNumber} testId="rfp-new-from-rfi" />
          ) : null}
          {editing ? (
            <div
              className="text-sm text-text-secondary bg-bg-hover border border-border-subtle rounded-md px-3 py-2"
              data-testid="rfp-edit-banner"
            >
              <span className="font-semibold text-text-primary">
                {t('rfxEdit.editing', { number: editing.eventNumber })}
              </span>{' '}
              {t('rfxEdit.editing.hint')}
            </div>
          ) : (
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
          )}
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
      )
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
                    /** @type {RfpTermRow} */
                    const row = { termId: term.id, requestedValue: '' };
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
                        {chosen ? (
                          <div className="flex-1 min-w-[12rem]">
                            <TermValueInput
                              row={row}
                              value={draft.terms[term.id]}
                              onChange={(v) => setValue(term.id, v)}
                              ariaLabel={`${t(term.labelKey)} — ${t('rfx.rfp.term.requested')}`}
                              invalid={
                                missingValues.includes(term.id) &&
                                draft.terms[term.id].trim().length > 0
                              }
                            />
                          </div>
                        ) : null}
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
              {missingValues
                .map((id) =>
                  t(
                    /** @type {import('../../services/sourcing/types').RfpTermDefinition} */ (
                      rfpTerm(id)
                    ).labelKey
                  )
                )
                .join(', ')}
            </p>
          )}
        </div>
      )
    },
    {
      id: 'pricing',
      title: t('rfxa.step.pricing'),
      shortTitle: t('rfxa.step.pricing.short'),
      description: t('rfxa.step.pricing.desc'),
      content: (
        <RfpPricingEditor
          value={draft.pricing}
          onChange={(next) => setDraft((d) => ({ ...d, pricing: next }))}
        />
      )
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
            setDraft((d) => ({
              ...d,
              questions: next.questions,
              customSections: next.customSections
            }))
          }
          defaultCurrency={/** @type {BidCurrency} */ (draft.currency)}
          testIdPrefix="rfp-new"
        />
      )
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
          {...(sourcingType ? { sourcingType } : {})}
        />
      )
    },
    {
      id: 'documents',
      title: t('rfxa.step.documents'),
      shortTitle: t('rfxa.step.documents.short'),
      description: t('rfxa.step.documents.desc'),
      content: (
        <DocumentRequestsEditor
          value={draft.documentRequests}
          onChange={(next) => setDraft((d) => ({ ...d, documentRequests: next }))}
          testIdPrefix="rfp-new"
        />
      )
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
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.title')}
              </dt>
              <dd className="text-text-primary">{draft.title}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.family')}
              </dt>
              <dd className="text-text-primary">{family ? t(family.labelKey) : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.field.deadline')}
              </dt>
              <dd className="text-text-primary">
                <Data>{draft.responseDeadline || '—'}</Data>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.rfp.field.currency')}
              </dt>
              <dd className="text-text-primary">
                <Data>{draft.currency}</Data>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.rfp.field.scope')}</dt>
              <dd className="text-text-secondary whitespace-pre-line">{draft.scope || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.review.terms')}
              </dt>
              <dd>
                <ul className="space-y-1">
                  {termRows().map((row) => (
                    <li
                      key={row.termId}
                      className="text-sm"
                      data-testid={`rfp-new-review-term-${row.termId}`}
                    >
                      <span className="text-text-primary">{termLabel(t, row)}</span>
                      {' — '}
                      <Data>{row.requestedValue}</Data>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfxa.step.pricing.short')}
              </dt>
              <dd className="text-text-primary" data-testid="rfp-new-review-pricing">
                {draft.pricing ? (
                  <>
                    {t('rfxa.pricing.summary', {
                      options: t('rfxa.pricing.optionCount', {
                        count: draft.pricing.options.length
                      }),
                      points: t('rfxa.pricing.pointCount', {
                        count: draft.pricing.quantityPoints.length
                      })
                    })}{' '}
                    <IndicativePill />
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.review.questions')}
              </dt>
              <dd className="text-text-primary">
                {t('rfx.rfi.questions', { count: draft.questions.length })}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.conf.pill')}</dt>
              <dd className="text-text-primary">
                {draft.confidential ? t('rfxa.conf.on') : t('rfxa.conf.off')}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.tc.title')}</dt>
              <dd className="text-text-primary">{hasTc ? t('rfxa.tc.on') : t('rfxa.tc.off')}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">
                {t('rfx.create.review.invitees')}
              </dt>
              <dd className="text-text-primary">
                {t('rfx.invite.selected', { count: draft.invitedSupplierIds.length })}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">{t('rfxa.doc.review')}</dt>
              <dd className="text-text-primary">
                <DocumentRequestsSummary value={draft.documentRequests} testIdPrefix="rfp-new" />
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
              {t(editing ? 'rfxEdit.saveChanges' : 'rfx.create.saveDraft')}
            </Button>
          </div>
          {!canPublish && (
            <p className="text-xs text-text-tertiary" data-testid="rfp-new-cannot-send">
              {t('rfx.status.draftHiddenFromSuppliers')}
            </p>
          )}

          <RfxSaveTemplate onSave={saveTemplate} defaultName={draft.title} testIdPrefix="rfp-new" />
        </div>
      )
    }
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
        completeLabel={t(editing ? 'rfxEdit.saveAndSend' : 'rfx.create.send')}
      />
    </ModalOverlay>
  );
};

export default RfpCreateWizard;
