// ────────────────────────────────────────────────────────────────────────────
// RAISING A PROPOSAL REQUEST — section 3.6a (CE-01 to CE-08), REQ-E03-04.
//
// The same four steps as the RFI wizard, with the middle one asking for TERMS
// instead of questions — which is the whole difference between the two documents
// and the reason they are two machines rather than one with a type field.
//
// ⚠️ **A PICKED TERM WITHOUT PTI'S REQUESTED VALUE IS NOT A TERM (REQ-E03-04).**
// The comparison renders "PTI asks for" beside every supplier's answer, and a
// blank there would put an empty column header above a table of deviations from
// nothing. The verb refuses it by name (`TERM_VALUE_REQUIRED`); this step refuses
// it before the buyer gets that far, and NAMES THE TERMS still missing a value
// rather than disabling a button silently.
//
// ⚠️ **THE TERM LIST IS PROCUREMENT'S AND IS NEVER EDITED HERE (CE-03 / CE-05).**
// The buyer picks FROM `RFP_STANDARD_TERMS` for one event; there is no way to
// mint a term, because a term nobody standardised cannot be compared across
// events and the supplier form would have nothing to render it from.
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import Wizard, { WizardStep } from '../../components/ui-v2/Wizard';
import { useToast } from '../../hooks/useToast';
import { BID_CURRENCIES, BASE_CURRENCY } from '../../lib/currencyPolicy';
import { useRfxCommand } from '../../services/query/commandHooks';
import {
  RFP_STANDARD_TERMS,
  RFP_TERM_GROUP_ORDER,
  RFX_CATEGORY_FAMILIES,
  rfpTerm,
  rfxCategoryFamily,
} from '../../services/sourcing/rfxConfig';
import { isPastDeadline } from '../../services/transitions/rfxRules';
import RfxInviteeStep from './RfxInviteeStep';
import { rfxNow } from './rfxDisplay';

interface Draft {
  title: string;
  family: string;
  scope: string;
  currency: string;
  responseDeadline: string;
  /** Picked term → PTI's requested value. Order of the standard list is kept. */
  terms: Record<string, string>;
  invitedSupplierIds: string[];
}

const EMPTY: Draft = {
  title: '',
  family: '',
  scope: '',
  currency: BASE_CURRENCY,
  responseDeadline: '',
  terms: {},
  invitedSupplierIds: [],
};

interface RfpCreateWizardProps {
  onCancel: () => void;
  onCreated: (rfpId: string) => void;
  /** Does this seat hold `rfp:publish`? A seat that does not may still draft. */
  canPublish: boolean;
}

const RfpCreateWizard: React.FC<RfpCreateWizardProps> = ({ onCancel, onCreated, canPublish }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useRfxCommand();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const family = rfxCategoryFamily(draft.family);

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
  /** The picked terms still missing PTI's value — the refusal, by name. */
  const missingValues = picked.filter((id) => draft.terms[id].trim().length === 0);

  // CE-07 — the same reading the submit verb uses, so the wizard cannot admit a
  // window the answer gate treats as closed.
  const deadlineInFuture =
    draft.responseDeadline !== '' && !isPastDeadline(draft.responseDeadline, rfxNow());

  const stepValid = (n: number): boolean => {
    if (n === 0) return draft.title.trim().length > 0 && draft.family !== '' && deadlineInFuture;
    if (n === 1) return picked.length > 0 && missingValues.length === 0;
    if (n === 2) return draft.invitedSupplierIds.length > 0;
    return true;
  };

  const sendable = stepValid(0) && stepValid(1) && stepValid(2);

  /** The rows in the STANDARD LIST's own order — the order every RFP renders in. */
  const termRows = () =>
    RFP_STANDARD_TERMS.filter((term) => term.id in draft.terms).map((term) => ({
      termId: term.id,
      requestedValue: draft.terms[term.id].trim(),
    }));

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
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfp-new-title">
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
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfp-new-family">
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
            <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfp-new-scope">
              {t('rfx.rfp.field.scope')}
            </label>
            <textarea
              id="rfp-new-scope"
              rows={3}
              value={draft.scope}
              placeholder={t('rfx.rfp.field.scope.ph')}
              onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value }))}
              className="w-full bg-white border border-border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[10rem]">
              <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfp-new-currency">
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
              <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor="rfp-new-deadline">
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
                          <input
                            type="text"
                            value={draft.terms[term.id]}
                            aria-label={`${t(term.labelKey)} — ${t('rfx.rfp.term.requested')}`}
                            onChange={(e) => setValue(term.id, e.target.value)}
                            className="flex-1 min-w-[12rem] bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action"
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {picked.length === 0 && (
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
              <dd className="text-text-secondary">{draft.scope || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-text-tertiary">{t('rfx.create.review.terms')}</dt>
              <dd>
                <ul className="space-y-1">
                  {termRows().map((row) => (
                    <li key={row.termId} className="text-sm" data-testid={`rfp-new-review-term-${row.termId}`}>
                      <span className="text-text-primary">{t(rfpTerm(row.termId)!.labelKey)}</span>
                      {' — '}
                      <Data>{row.requestedValue}</Data>
                    </li>
                  ))}
                </ul>
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

export default RfpCreateWizard;
