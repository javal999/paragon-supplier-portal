/** @import React from 'react' */
/** @import { CoaForm } from '../const' */
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FIELD_HINT, FIELD_INPUT, FIELD_LABEL } from '../const';
import { coaComplete } from '../utils';

/**
 * @typedef {object} CoaDeclarationFieldsProps
 * @property {CoaForm} form  The COA form's current values (page state).
 * @property {React.Dispatch<React.SetStateAction<CoaForm>>} setForm
 */

/**
 * UCX-P5 (BL-366) · UCX-D23 — the form a COA request opens: the batch, the COA
 * number, who issued it and when, and what it covers. **NO CERTIFICATE SCHEME
 * IS OFFERED**, because a COA carries none — the scheme list (BPJPH, MUI, BPOM)
 * is the finding this form answers (UCX-F14).
 *
 * ⚠️ **THE BATCH IS PREFILLED FROM THE REQUEST AND STAYS EDITABLE.** PTI names
 * the batch it wants; the certificate in hand is the authority, so the supplier
 * may correct it — and the December kit's K8 watches exactly that choice.
 *
 * ⚠️ **NO FILE CONTROL, AND THE SENTENCE SAYS SO BEFORE THE ACT.** File storage
 * waits for BL-27 (UCX-S6, the proposal's named open point).
 * @type {React.FC<CoaDeclarationFieldsProps>}
 */
const CoaDeclarationFields = ({ form, setForm }) => {
  const { t } = useTranslation();
  return (
    <>
      <section
        className="bg-bg-hover border-l-2 border-action rounded px-4 py-3"
        data-testid="coa-nofile-notice"
      >
        <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <FileText size={14} className="text-action shrink-0" aria-hidden="true" />
          {t('supplierDocuments.coa.noFile.title')}
        </div>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          {t('supplierDocuments.coa.noFile.body')}
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <span className={FIELD_LABEL}>{t('supplierDocuments.coa.kind')}</span>
          <div className="flex items-center gap-2 text-sm text-text-primary" data-testid="coa-kind">
            {t('supplierDocuments.coa.kindValue')}
            <span className="text-xs text-text-tertiary">
              {t('supplierDocuments.coa.fromRequest')}
            </span>
          </div>
          <span className={FIELD_HINT}>{t('supplierDocuments.coa.lead')}</span>
        </div>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.coa.batch')}</span>
          <input
            className={FIELD_INPUT}
            data-testid="coa-batch"
            value={form.batch}
            onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
          />
          <span className={FIELD_HINT}>{t('supplierDocuments.coa.batchHint')}</span>
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.coa.number')}</span>
          <input
            className={FIELD_INPUT}
            data-testid="coa-number"
            value={form.coaNumber}
            onChange={(e) => setForm((f) => ({ ...f, coaNumber: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.coa.issuer')}</span>
          <input
            className={FIELD_INPUT}
            data-testid="coa-issuer"
            value={form.issuer}
            onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.coa.issuedOn')}</span>
          <input
            type="date"
            className={FIELD_INPUT}
            data-testid="coa-issuedOn"
            value={form.issuedOn}
            onChange={(e) => setForm((f) => ({ ...f, issuedOn: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.coa.scope')}</span>
          <textarea
            rows={3}
            className={FIELD_INPUT}
            data-testid="coa-scopeText"
            value={form.scopeText}
            onChange={(e) => setForm((f) => ({ ...f, scopeText: e.target.value }))}
          />
          <span className={FIELD_HINT}>{t('supplierDocuments.coa.scopeHint')}</span>
        </label>

        {/* C10 5.2 / D-ID-3 — whose act this is recorded as, before the act. */}
        <p className="text-xs text-text-tertiary" data-testid="declaration-attribution">
          {t('supplierDocuments.panel.attribution')}
        </p>
        {!coaComplete(form) && (
          <p className="text-xs text-text-tertiary" data-testid="coa-incomplete">
            {t('supplierDocuments.coa.incomplete')}
          </p>
        )}
      </section>
    </>
  );
};

export default CoaDeclarationFields;
