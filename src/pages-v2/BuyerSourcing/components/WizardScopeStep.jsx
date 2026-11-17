// ────────────────────────────────────────────────────────────────────────────
// The RFQ wizard's first step, "Scope": the requisition entrance, title,
// project, category, budget, materials, quantity and unit. Moved out of
// `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
//
// The qty/budget refusal maps and `rfqRefusalKey` live HERE, beside the two
// fields that render them, because GL-1's chip-coverage guard
// (`glossary/chipCoverage.test.js`) pairs a message map's uses with its
// declaration in one file. `MATERIAL_CATALOG` lives here because this step
// `.map()`s it (the module-scope-literal gate keys it `file::CONST`).
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ, RFQCategory } from '@data/mockRfqs' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { RequisitionPrefill } from '../../sourcing/requisitionPrefill' */
/** @import { RfqDraftRefusal } from '../../sourcing/rfqCreateModel' */
/** @import { readRfqBudget, readRfqTotalQty } from '../../sourcing/rfqCreateModel' */
/** @import { DraftRfq } from '../const' */
/** @import { useRfqWizard } from '../hooks/useRfqWizard' */
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { prefillFromRequisition } from '../../sourcing/requisitionPrefill';
import { RfqPrefillBanner } from '../../rfx/rfqSources';
import { StepRefusal } from '../../sourcing/RfqAuthoring';
import { CATEGORY_OPTIONS, UOM_OPTIONS } from '../const';
import { categoryLabel } from '../utils';

/** @type {Record<RFQCategory, string[]>} */
const MATERIAL_CATALOG = {
  Fragrance: [
    'Wardah Floral Accord',
    'Sample Citrus Compound',
    'Make Over Oud Base',
    'Emina Fresh Accord'
  ],
  'Active Ingredients': [
    'Niacinamide USP',
    'Sodium Hyaluronate HMW',
    'Vitamin C Derivative',
    'Retinyl Palmitate',
    'Salicylic Acid'
  ],
  Packaging: [
    'PET Bottle 100ml',
    'PET Bottle 200ml',
    'Airless Pump 15ml',
    'Folding Carton 150gsm',
    'Shipper Box 12-pack'
  ],
  Emulsifiers: ['Glyceryl Stearate SE', 'Polysorbate 80', 'Cetearyl Alcohol', 'Lecithin (Soy)'],
  Botanical: [
    'Centella Asiatica Extract',
    'Green Tea Extract',
    'Rice Bran Extract',
    'Mulberry Extract'
  ],
  Other: ['Custom material — specify in notes']
};

// CP-0 · W1 · 2e-b-4a — each wizard-number refusal names its own rule. A buyer
// who left the quantity blank, one who typed something unreadable, and one who
// typed a token legal under both conventions have made three different mistakes
// and need three different answers — not one anonymous disabled button.
//
// The maps are EXACT because `RfqDraftRefusal` is discriminated by field:
// `EMPTY_QTY` exists on the quantity (required) and is excluded from the budget
// (optional — a blank there is the answer), so neither map carries an entry it
// can never use.
/** @type {Record<QtyRefusalReason, string>} */
const RFQ_QTY_REFUSAL_KEY = {
  EMPTY_QTY: 'sourcing.wizard.qty.refused.empty',
  NOT_NUMERIC: 'sourcing.wizard.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'sourcing.wizard.qty.refused.ambiguous'
};

/** @type {Record< Exclude<QtyRefusalReason, 'EMPTY_QTY'>, string >} */
const RFQ_BUDGET_REFUSAL_KEY = {
  NOT_NUMERIC: 'sourcing.wizard.budget.refused.notNumeric',
  AMBIGUOUS_QTY: 'sourcing.wizard.budget.refused.ambiguous'
};

/**
 * The i18n key for a refusal, chosen by the field it came from.
 * @param {RfqDraftRefusal} refusal
 * @returns {string}
 */
export const rfqRefusalKey = (refusal) =>
  refusal.field === 'totalQty'
    ? RFQ_QTY_REFUSAL_KEY[refusal.reason]
    : RFQ_BUDGET_REFUSAL_KEY[refusal.reason];

/**
 * @typedef {object} WizardScopeStepProps
 * @property {DraftRfq} draft
 * @property {RFQ | null} editingRfq The Draft being edited (BL-93), re-derived from the live list.
 * @property {string | null} editingRfqId The id the wizard edits, or null when raising a new RFQ.
 * @property {readonly RFQ[]} rfqs The board's RFQs — the prefill banner names a copied RFQ from them.
 * @property {readonly PurchaseRequisition[]} sourceablePrs The requisitions the picker offers (C.2); may be empty.
 * @property {(prefill: RequisitionPrefill | null) => void} applySource Re-point the open wizard at a requisition.
 * @property {ReturnType<typeof useRfqWizard>['updateDraft']} updateDraft
 * @property {(m: string) => void} toggleMaterial
 * @property {ReturnType<typeof useRfqWizard>['changeCategory']} changeCategory B-12 — the category, its materials cleared and its usual unit.
 * @property {ReturnType<typeof readRfqTotalQty>} qtyRead The quantity field's own read (2e-b-4b).
 * @property {ReturnType<typeof readRfqBudget>} budgetRead The budget field's own read (2e-b-4b).
 * @property {string | null} uomRefusal RFX-D30 — the create verb's unit rule on the draft's unit; null when it passes.
 * @property {TFunction} t
 */

/**
 * The Scope step's content.
 * @type {React.FC<WizardScopeStepProps>}
 */
const WizardScopeStep = ({
  draft,
  editingRfq,
  editingRfqId,
  rfqs,
  sourceablePrs,
  applySource,
  updateDraft,
  changeCategory,
  toggleMaterial,
  qtyRead,
  budgetRead,
  uomRefusal,
  t
}) => (
  <div className="space-y-5">
    {/* ⚠️ C.2 — THE REQUISITION ENTRANCE, AND IT IS OPTIONAL BY DESIGN.
        Most RFQs are not raised from a requisition, so this is the FIRST
        field but never a required one: leaving it alone is the ordinary
        path and cascades onto nothing. Choosing one fills the fields it
        can carry and sets `sourceRequisitionId`, which is the payload key
        the dispatcher's cascade resolver reads. */}
    {/* B6 — where this wizard's content came from, one line, named by the
        event page's own resolver. BL-93 — an edit says which draft it is
        instead, and offers no requisition entrance: a requisition is
        linked once, when the RFQ is raised. */}
    {editingRfq ? (
      <div
        className="text-sm text-text-secondary bg-bg-hover border border-border-subtle rounded-md px-3 py-2"
        data-testid="rfq-edit-banner"
      >
        <span className="font-semibold text-text-primary">
          {t('rfxEdit.editing', { number: editingRfq.rfqNumber })}
        </span>{' '}
        {t('rfxEdit.editing.hint')}
      </div>
    ) : (
      draft.origin && <RfqPrefillBanner kind={draft.origin.kind} refs={draft} rfqs={rfqs} />
    )}
    {!editingRfqId && (
      <div>
        <label
          htmlFor="rfq-source-requisition"
          className="text-label text-text-tertiary uppercase block mb-1.5"
        >
          {t('sourcing.wizard.field.sourceRequisition')}
        </label>
        {sourceablePrs.length === 0 ? (
          /* ⚠️ AN HONEST EMPTY STATE, NOT A BLANK CONTROL. A `<select>` with
           only a placeholder looks broken and says nothing; this names WHY
           there is nothing to choose — a sourcing event is raised from an
           APPROVED requisition, and none is waiting. */
          <p
            className="text-sm text-text-tertiary border border-border-subtle rounded-md px-3 py-2 bg-bg-hover"
            data-testid="rfq-source-empty"
          >
            {t('sourcing.wizard.sourceRequisition.none')}
          </p>
        ) : (
          <>
            <select
              id="rfq-source-requisition"
              data-testid="rfq-source-select"
              value={draft.sourceRequisitionId ?? ''}
              onChange={(e) =>
                applySource(
                  sourceablePrs
                    .filter((pr) => pr.id === e.target.value)
                    .map(prefillFromRequisition)[0] ?? null
                )
              }
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            >
              <option value="">{t('sourcing.wizard.sourceRequisition.placeholder')}</option>
              {sourceablePrs.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.prNumber} · {pr.material}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              {t('sourcing.wizard.sourceRequisition.help')}
            </p>
          </>
        )}
      </div>
    )}
    <div>
      <label className="block">
        <span className="text-label text-text-tertiary uppercase block mb-1.5">
          {t('sourcing.wizard.field.title')} <span className="text-danger">*</span>
        </span>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => updateDraft('title', e.target.value)}
          placeholder={t('sourcing.wizard.placeholder.title')}
          className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
      </label>
    </div>
    <div>
      <label
        htmlFor="rfq-project-name"
        className="text-label text-text-tertiary uppercase block mb-1.5"
      >
        {t('rfqAuthoring.field.projectName')}
      </label>
      <input
        id="rfq-project-name"
        type="text"
        value={draft.projectName}
        onChange={(e) => updateDraft('projectName', e.target.value)}
        placeholder={t('rfqAuthoring.placeholder.projectName')}
        className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
      />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('sourcing.wizard.field.category')} <span className="text-danger">*</span>
          </span>
          <select
            value={draft.category}
            onChange={(e) => changeCategory(/** @type {RFQCategory} */ (e.target.value))}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          >
            <option value="">{t('sourcing.wizard.select.category')}</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(t, c)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className="text-label text-text-tertiary uppercase block mb-1.5">
          {t('sourcing.wizard.field.budget')}
        </label>
        {/* Ruling 6.2 — and load-bearing here in the worst way, because a
            blank is LEGAL on this field. `type="number"` erases a token it
            cannot parse to "" before React sees it, so the browser would
            quietly convert a budget the buyer typed into the "not
            specified" default with nobody told — the same silent
            downgrade the MOQ field was rescued from in 2e-b-2. */}
        <input
          type="text"
          inputMode="decimal"
          value={draft.budget}
          onChange={(e) => updateDraft('budget', e.target.value)}
          placeholder={t('sourcing.wizard.placeholder.budget')}
          aria-label={t('sourcing.wizard.field.budget')}
          aria-invalid={!budgetRead.ok}
          // BL-84 — the refusal under the field is tied to it.
          aria-describedby={!budgetRead.ok ? 'rfq-budget-refusal' : undefined}
          className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
        {/* An untouched blank does not nag — it is this field's answer,
            so `readRfqBudget` never refuses one. */}
        {!budgetRead.ok && (
          <div
            id="rfq-budget-refusal"
            role="alert"
            data-testid="rfq-budget-refusal"
            className="mt-1 text-[length:var(--fs-label-3)] text-danger"
          >
            {t(RFQ_BUDGET_REFUSAL_KEY[budgetRead.reason])}{' '}
            <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: budgetRead.reason }} />
          </div>
        )}
      </div>
    </div>
    <div>
      <label className="text-label text-text-tertiary uppercase block mb-1.5">
        {t('sourcing.wizard.field.materials')}{' '}
        <span className="normal-case text-text-tertiary">{t('rfqCompare.wizard.optional')}</span>
      </label>
      <p className="text-xs text-text-tertiary mb-1.5" data-testid="wizard-materials-optional">
        {t('rfqCompare.wizard.materialsOptional')}
      </p>
      {draft.category ? (
        <div className="flex flex-wrap gap-2">
          {MATERIAL_CATALOG[/** @type {RFQCategory} */ (draft.category)].map((m) => {
            const selected = draft.materials.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMaterial(m)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selected
                    ? 'bg-action text-white border border-action'
                    : 'bg-bg-surface text-text-secondary border border-border-input hover:border-action'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-tertiary">{t('sourcing.wizard.materials.selectFirst')}</p>
      )}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <label className="text-label text-text-tertiary uppercase block mb-1.5">
          {t('sourcing.wizard.field.totalQty')} <span className="text-danger">*</span>
        </label>
        {/* Ruling 6.2 — the parse CANNOT fire behind `type="number"`,
            which is what 2e-b-4a's smoke proved on a live id-ID browser:
            "2.400" reached Review as 2,4 because the number input had
            already rewritten the value per browser locale before React
            saw it. The gate cannot refuse what it never sees. `min="0"`
            goes with it — it was part of the number-input contract and
            the positivity rule now lives in `isStepValid`, where it is
            actually enforced. `type="text"` returns `.value` VERBATIM in
            every locale, which is what makes the parser load-bearing. */}
        <input
          type="text"
          inputMode="decimal"
          value={draft.totalQty}
          onChange={(e) => updateDraft('totalQty', e.target.value)}
          placeholder={t('sourcing.wizard.placeholder.qty')}
          aria-label={t('sourcing.wizard.field.totalQty')}
          aria-invalid={draft.totalQty.trim() !== '' && !qtyRead.ok}
          // BL-84 — the quantity refusal is tied to the quantity field.
          aria-describedby={
            draft.totalQty.trim() !== '' && !qtyRead.ok ? 'rfq-qty-refusal' : undefined
          }
          className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
        {/* An untouched blank does not nag on sight — it refuses at the
            gate (Next stays disabled) and says so on the field once the
            buyer has typed something (the 2e-a price precedent). */}
        {draft.totalQty.trim() !== '' && !qtyRead.ok && (
          <div
            id="rfq-qty-refusal"
            role="alert"
            data-testid="rfq-qty-refusal"
            className="mt-1 text-[length:var(--fs-label-3)] text-danger"
          >
            {t(RFQ_QTY_REFUSAL_KEY[qtyRead.reason])}{' '}
            <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: qtyRead.reason }} />
          </div>
        )}
      </div>
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('sourcing.wizard.field.uom')}
          </span>
          <select
            value={draft.uom}
            data-testid="rfq-wizard-uom"
            onChange={(e) =>
              updateDraft('uom', /** @type {(typeof UOM_OPTIONS)[number]} */ (e.target.value))
            }
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          >
            {/* RFX-D30 — an `Other` RFQ starts with no unit; the empty
                choice shows only until the buyer picks one. */}
            {draft.uom === '' ? (
              <option value="" disabled>
                {t('sourcing.wizard.uom.choose')}
              </option>
            ) : null}
            {UOM_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-1">
          <StepRefusal reason={uomRefusal} testId="rfq-uom-step-refusal" />
        </div>
      </div>
    </div>
  </div>
);

export default WizardScopeStep;
