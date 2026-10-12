/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierDocumentCategory } from '@services/data/types' */
/** @import { useDocumentRequest } from '../hooks/useDocumentRequest' */
import Data from '@components/ui-v2/Data';

// ⚠️ **ALL SIX MEMBERS OF `SupplierDocumentCategory`, AND THE TWO THAT LOOK
// REDUNDANT ARE THE REASON THE VERB CARRIES A CATEGORY AT ALL.**
// `CERT_TYPE_TO_CATEGORY` (the declare path) reaches only four of them —
// `Halal Compliance` · `BPOM Regulatory` · `Quality` · `Other`. **`Tax & Legal`
// and `Contract` have NO declare path**: outside the seeded fixtures, a
// requested document is the only way a row in either category can ever exist.
// Dropping them from this list would make two of the platform's six document
// kinds unreachable by anybody.
//
// The `id` is the canonical EN union member — it is what the payload carries
// and what the store holds. Only `labelKey` localizes.
/** @type {{ id: SupplierDocumentCategory; labelKey: string }[]} */
const REQUEST_CATEGORIES = [
  { id: 'Halal Compliance', labelKey: 'compliance.request.category.halal' },
  { id: 'BPOM Regulatory', labelKey: 'compliance.request.category.bpom' },
  { id: 'Quality', labelKey: 'compliance.request.category.quality' },
  { id: 'Tax & Legal', labelKey: 'compliance.request.category.taxLegal' },
  { id: 'Contract', labelKey: 'compliance.request.category.contract' },
  { id: 'Other', labelKey: 'compliance.request.category.other' }
];

/**
 * @typedef {object} RequestPanelBodyProps
 * @property {ReturnType<typeof useDocumentRequest>} requester The request's fields, their setters,
 *   the supplier roster, the resolved supplier name and the confirming flag.
 * @property {TFunction} t
 */

/**
 * The request panel's body: the supplier / category / note form, or — on the
 * confirm step — every field restated with the supplier's resolved name before
 * anything commits. Moved out of `BuyerCompliance.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<RequestPanelBodyProps>}
 */
const RequestPanelBody = ({ requester, t }) => {
  const {
    reqConfirming,
    reqSupplier,
    setReqSupplier,
    reqSupplierName,
    reqCategory,
    setReqCategory,
    reqNote,
    setReqNote,
    supplierOptions
  } = requester;
  /* ⚠️ **CONFIRM-BEFORE-COMMIT, AND WHAT IT IS FOR IS THE SUPPLIER
      CHOICE, NOT THE CLICK.** This act writes across the tenancy
      boundary — a row minted here lands in ANOTHER company's queue and
      names them as owing Paragon a document. The roster resolution
      (`requireCreationOwner`) refuses an id that is not a tenant; it
      cannot refuse the WRONG tenant, because the wrong tenant is a
      perfectly valid one. Only a reader can catch that, so the reader
      is shown the resolved NAME — not the id they picked from — beside
      every other field, before anything commits. */
  return reqConfirming ? (
    <div className="space-y-4" data-testid="doc-request-confirm">
      <p className="text-sm text-text-secondary">{t('compliance.request.confirm.lead')}</p>
      <dl className="bg-bg-hover rounded px-4 py-3 space-y-3 text-sm">
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('compliance.request.field.supplier')}
          </dt>
          <dd className="text-text-primary font-semibold">
            {/* i18n-defer: mock/sample data (supplier name) */}
            {reqSupplierName} <Data className="text-xs text-text-tertiary">{reqSupplier}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('compliance.request.field.category')}
          </dt>
          <dd className="text-text-primary">
            {t(
              REQUEST_CATEGORIES.find((c) => c.id === reqCategory)?.labelKey ??
                'compliance.request.category.other'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-label text-text-tertiary uppercase">
            {t('compliance.request.field.note')}
          </dt>
          {/* i18n-defer: buyer-authored free text, shown to the
              supplier word for word. */}
          <dd className="text-text-secondary">{reqNote.trim()}</dd>
        </div>
      </dl>
      <p className="text-xs text-text-tertiary">{t('compliance.request.confirm.unattributed')}</p>
    </div>
  ) : (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">{t('compliance.request.panel.lead')}</p>

      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('compliance.request.field.supplier')}
        </span>
        <select
          data-testid="doc-request-supplier"
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
          value={reqSupplier}
          onChange={(e) => setReqSupplier(e.target.value)}
        >
          <option value="">{t('compliance.request.field.supplierPlaceholder')}</option>
          {/* ⚠️ THE ROSTER THROUGH THE SEAM, NOT THE FIXTURE MODULE.
              The dispatcher resolves the chosen id against the SAME
              roster, so every value this control can produce is a value
              the gate accepts — the refusal exists for a payload this
              control cannot construct, which is precisely why the
              refusal is not decorative. */}
          {supplierOptions.map((sup) => (
            <option key={sup.id} value={sup.id}>
              {/* i18n-defer: mock/sample data (supplier name) */}
              {sup.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('compliance.request.field.category')}
        </span>
        <select
          data-testid="doc-request-category"
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
          value={reqCategory}
          onChange={(e) =>
            setReqCategory(/** @type {SupplierDocumentCategory | ''} */ (e.target.value))
          }
        >
          <option value="">{t('compliance.request.field.categoryPlaceholder')}</option>
          {REQUEST_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {t(c.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('compliance.request.field.note')}
        </span>
        <textarea
          rows={3}
          data-testid="doc-request-note"
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary"
          placeholder={t('compliance.request.field.notePlaceholder')}
          value={reqNote}
          onChange={(e) => setReqNote(e.target.value)}
        />
        <span className="block text-xs text-text-tertiary mt-1">
          {t('compliance.request.field.noteHint')}
        </span>
      </label>
    </div>
  );
};

export default RequestPanelBody;
