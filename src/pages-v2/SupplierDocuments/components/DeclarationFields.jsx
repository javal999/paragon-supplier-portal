/** @import React from 'react' */
/** @import { CertType } from '@services/data/types' */
/** @import { DeclarationForm } from '../const' */
import { FileText } from 'lucide-react';
import { certTypeLabelKey } from '@lib/complianceView';
import { useTranslation } from 'react-i18next';
import { FIELD_HINT, FIELD_INPUT, FIELD_LABEL } from '../const';
import { declarationComplete } from '../utils';

// ── §82 · THE DECLARATION FORM ──────────────────────────────────────────────
//
// ⚠️ **THE SCHEME LIST IS THE `CertType` UNION, WRITTEN OUT ONCE AND BOUND BY
// THE TYPE.** `satisfies readonly CertType[]` plus the exhaustive
// `certTypeLabelKey` switch means adding a seventh scheme is a `tsc` failure in
// two places rather than a dropdown that silently omits it. A `.map` over an
// object's keys would have been shorter and would have lost that.
const CERT_TYPES = /** @satisfies {readonly CertType[]} */ (
  /** @type {const} */ ([
    'HALAL_BPJPH',
    'HALAL_MUI_LEGACY',
    'HALAL_FOREIGN',
    'BPOM',
    'ISO',
    'OTHER'
  ])
);

/**
 * @typedef {object} DeclarationFieldsProps
 * @property {DeclarationForm} form  The form's current values (page state).
 * @property {React.Dispatch<React.SetStateAction<DeclarationForm>>} setForm
 */

/**
 * The declaration form before the act is recorded: the no-file notice, then
 * the certificate fields (type, number, issuer, issued / expires on, scope),
 * the attribution line and the incomplete hint. The form state stays in the
 * page (`useDeclarationPanel`) because the footer's submit reads it. Moved out
 * of `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<DeclarationFieldsProps>}
 */
const DeclarationFields = ({ form, setForm }) => {
  const { t } = useTranslation();
  return (
    <>
      {/* THE HONEST SENTENCE, BEFORE THE FORM AND NOT AFTER IT. A
          supplier must know what this act is while deciding whether to
          perform it - a disclaimer under the button is a receipt, not a
          notice. The claim is precisely bounded: the platform CAN read a
          file (the Stock page's StockUploadPanel parses a workbook); what it
          has no seam for is KEEPING or FORWARDING one. */}
      <section
        className="bg-bg-hover border-l-2 border-action rounded px-4 py-3"
        data-testid="declaration-nofile-notice"
      >
        <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <FileText size={14} className="text-action shrink-0" aria-hidden="true" />
          {t('supplierDocuments.panel.noFile.title')}
        </div>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          {t('supplierDocuments.panel.noFile.body')}
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-label text-text-tertiary uppercase">
          {t('supplierDocuments.panel.certDetails')}
        </h3>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.field.certType')}</span>
          <select
            className={FIELD_INPUT}
            data-testid="declare-certType"
            value={form.certType}
            onChange={(e) =>
              setForm((f) => ({ ...f, certType: /** @type {CertType} */ (e.target.value) }))
            }
          >
            {CERT_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {t(certTypeLabelKey(ct))}
              </option>
            ))}
          </select>
          <span className={FIELD_HINT}>{t('supplierDocuments.field.certType.hint')}</span>
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.field.certNumber')}</span>
          <input
            className={FIELD_INPUT}
            data-testid="declare-certNumber"
            value={form.certNumber}
            onChange={(e) => setForm((f) => ({ ...f, certNumber: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.field.issuer')}</span>
          <input
            className={FIELD_INPUT}
            data-testid="declare-issuer"
            value={form.issuer}
            onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={FIELD_LABEL}>{t('supplierDocuments.field.issuedOn')}</span>
            <input
              type="date"
              className={FIELD_INPUT}
              data-testid="declare-issuedOn"
              value={form.issuedOn}
              onChange={(e) => setForm((f) => ({ ...f, issuedOn: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className={FIELD_LABEL}>{t('supplierDocuments.field.expiresOn')}</span>
            <input
              type="date"
              className={FIELD_INPUT}
              data-testid="declare-expiresOn"
              value={form.expiresOn}
              onChange={(e) => setForm((f) => ({ ...f, expiresOn: e.target.value }))}
            />
          </label>
        </div>
        <span className={FIELD_HINT}>{t('supplierDocuments.field.expiresOn.hint')}</span>

        <label className="block">
          <span className={FIELD_LABEL}>{t('supplierDocuments.field.scopeText')}</span>
          <textarea
            rows={3}
            className={FIELD_INPUT}
            data-testid="declare-scopeText"
            placeholder={t('supplierDocuments.field.scopeText.placeholder')}
            value={form.scopeText}
            onChange={(e) => setForm((f) => ({ ...f, scopeText: e.target.value }))}
          />
          <span className={FIELD_HINT}>{t('supplierDocuments.field.scopeText.hint')}</span>
        </label>

        {/* C10 5.2 / D-ID-3 - the surface says WHOSE act this is recorded
            as, BEFORE the act, because it cannot name a person. */}
        <p className="text-xs text-text-tertiary" data-testid="declaration-attribution">
          {t('supplierDocuments.panel.attribution')}
        </p>
        {!declarationComplete(form) && (
          <p className="text-xs text-text-tertiary" data-testid="declaration-incomplete">
            {t('supplierDocuments.panel.incomplete')}
          </p>
        )}
      </section>
    </>
  );
};

export default DeclarationFields;
