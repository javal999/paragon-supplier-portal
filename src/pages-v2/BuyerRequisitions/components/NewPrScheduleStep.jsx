/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { NewPRForm } from '../const' */
import FormSection from '@components/ui-v2/FormSection';
import { useEnumLabel } from '@hooks/useEnumLabel';
import { inputClass, labelClass } from '../const';

const COST_CENTERS = [
  'CC-RD-001 — R&D',
  'CC-PKG-002 — Packaging',
  'CC-MFG-001 — Manufacturing',
  'CC-SC-001 — Supply Chain',
  'CC-RD-003 — Perfumer'
];

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

/**
 * @typedef {object} NewPrScheduleStepProps
 * @property {NewPRForm} form The New-PR form state.
 * @property {(form: NewPRForm) => void} setForm
 * @property {TFunction} t
 */

/**
 * New-PR step 2, when and who pays: required date, cost centre and priority
 * (rendered through the enum-label map). Moved out of `BuyerRequisitions.jsx`
 * by the Phase 5 page split (no behaviour change).
 * @type {React.FC<NewPrScheduleStepProps>}
 */
const NewPrScheduleStep = ({ form, setForm, t }) => {
  const el = useEnumLabel();
  return (
    <FormSection
      eyebrow={t('requisitions.new.step2.eyebrow')}
      title={t('requisitions.new.step2.title')}
      description={t('requisitions.new.step2.desc')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block">
            <span className={labelClass}>{t('requisitions.new.field.requiredDate')}</span>
            <input
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
        </div>
        <div>
          <label className="block">
            <span className={labelClass}>{t('requisitions.new.field.costCenter')}</span>
            <select
              className={inputClass}
              value={form.costCenter}
              onChange={(e) => setForm({ ...form, costCenter: e.target.value })}
            >
              <option value="">{t('requisitions.new.select.placeholder')}</option>
              {COST_CENTERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div>
        <label className="block">
          <span className={labelClass}>{t('requisitions.new.field.priority')}</span>
          <select
            className={inputClass}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {el(p)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </FormSection>
  );
};

export default NewPrScheduleStep;
