/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { QtyOutcome, QtyRefusalReason } from '@lib/localeNumber' */
/** @import { NewPRForm } from '../const' */
import FormSection from '@components/ui-v2/FormSection';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { inputClass, labelClass } from '../const';

// ── CP-0 · W1 · PR-2b — the New-PR quantity is PARSED, never coerced ─────────
// `Number(form.qty)` behind a `type="number"` field read "4.500" as 4.5, so a
// buyer authoring 4,500 KG minted a Draft PR for 4.5 KG — silently, and with a
// real audited document number attached. The field is now
// `type="text" inputmode="decimal"` (ruling 6.2) and routes through the ONE
// legal parser with NO convention hint, so a token legal under both readings
// refuses instead of being guessed.
//
// The type flip is what makes the parse non-optional rather than merely better:
// `type="number"` filtered the input space to what `Number` happens to accept,
// so a comma could never arrive. On a text field "4,500" reaches the handler,
// `Number` yields NaN, and NaN survives the whole spine — the dispatcher's
// requiredFields check tests emptiness (NaN is not empty), the command target
// accepts it (`typeof NaN === 'number'`), and `formatNumber(NaN)` renders a
// tidy em-dash. A corrupted quantity would look like a formatting nicety.
// Hence: the flip and the parse ship in one commit, never staged.
//
// EXHAUSTIVE, not Partial (the 2a discipline): widening QtyRefusalReason must
// break the build here, not render a blank refusal to a buyer.
/** @type {Record<QtyRefusalReason, string>} */
const QTY_REFUSAL_KEY = {
  EMPTY_QTY: 'requisitions.new.qty.refused.empty',
  NOT_NUMERIC: 'requisitions.new.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'requisitions.new.qty.refused.ambiguous'
};

const UOM_OPTIONS = ['KG', 'L', 'PCS', 'MT', 'BOX'];

/**
 * @typedef {object} NewPrItemStepProps
 * @property {NewPRForm} form The New-PR form state.
 * @property {(form: NewPRForm) => void} setForm
 * @property {QtyOutcome} parsedQty The page's ONE parse of `form.qty` (also gates submit).
 * @property {TFunction} t
 */

/**
 * New-PR step 1, the item: material, quantity (a text field parsed by the
 * page, with the refusal line and its glossary chip when a typed token cannot
 * be read) and unit. Moved out of `BuyerRequisitions.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<NewPrItemStepProps>}
 */
const NewPrItemStep = ({ form, setForm, parsedQty, t }) => (
  <FormSection
    eyebrow={t('requisitions.new.step1.eyebrow')}
    title={t('requisitions.new.step1.title')}
    description={t('requisitions.new.step1.desc')}
  >
    <div>
      <label className="block">
        <span className={labelClass}>{t('requisitions.new.field.material')}</span>
        <input
          className={inputClass}
          placeholder={t('requisitions.new.placeholder.material')}
          value={form.material}
          onChange={(e) => setForm({ ...form, material: e.target.value })}
        />
      </label>
    </div>
    <div className="grid grid-cols-[1fr_100px] gap-3">
      <div>
        <label className={labelClass}>{t('requisitions.new.field.quantity')}</label>
        {/* type=text + inputmode=decimal (ruling 6.2): type=number
            rejects the separators this field exists to adjudicate. */}
        <input
          type="text"
          inputMode="decimal"
          className={inputClass}
          placeholder={t('requisitions.new.placeholder.quantity')}
          aria-label={t('requisitions.new.field.quantity')}
          aria-invalid={form.qty.trim() !== '' && !parsedQty.ok}
          value={form.qty}
          onChange={(e) => setForm({ ...form, qty: e.target.value })}
        />
        {/* An untouched blank does not nag; a TYPED token that cannot be
            read says so, and says what to type instead. */}
        {form.qty.trim() !== '' && !parsedQty.ok && (
          <div
            role="alert"
            data-testid="new-pr-qty-refusal"
            className="mt-1 text-[11px] text-danger"
          >
            {t(QTY_REFUSAL_KEY[parsedQty.reason])}{' '}
            <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: parsedQty.reason }} />
          </div>
        )}
        <div className="mt-1 text-[11px] text-text-tertiary">{t('requisitions.new.qty.hint')}</div>
      </div>
      <div>
        <label className="block">
          <span className={labelClass}>{t('requisitions.new.field.uom')}</span>
          <select
            className={inputClass}
            value={form.uom}
            onChange={(e) => setForm({ ...form, uom: e.target.value })}
          >
            {UOM_OPTIONS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  </FormSection>
);

export default NewPrItemStep;
