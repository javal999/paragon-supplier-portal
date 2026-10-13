/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { QtyOutcome } from '@lib/localeNumber' */
/** @import { NewPRForm } from '../const' */
import SidePanel from '@components/ui-v2/SidePanel';
import FormSection from '@components/ui-v2/FormSection';
import Button from '@components/ui-v2/Button';
import NewPrItemStep from './NewPrItemStep';
import NewPrScheduleStep from './NewPrScheduleStep';
import { inputClass } from '../const';

/**
 * @typedef {object} NewRequisitionPanelProps
 * @property {boolean} open
 * @property {() => void} onClose Closes the panel (the Cancel button too); keeps the form.
 * @property {NewPRForm} form The New-PR form state.
 * @property {(form: NewPRForm) => void} setForm
 * @property {QtyOutcome} parsedQty The page's ONE parse of `form.qty`.
 * @property {boolean} canSubmit Material, a readable quantity, date and cost centre are present.
 * @property {() => void} onSubmit Dispatches `pr:create` (`submitNewPR`).
 * @property {TFunction} t
 */

/**
 * The New-PR side panel: three form steps (item, schedule, justification) and
 * a footer with Cancel and the submit button, disabled until `canSubmit`. Only
 * opened for a seat holding `pr:create` — the page withholds the opener
 * otherwise. Moved out of `BuyerRequisitions.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<NewRequisitionPanelProps>}
 */
const NewRequisitionPanel = ({
  open,
  onClose,
  form,
  setForm,
  parsedQty,
  canSubmit,
  onSubmit,
  t
}) => (
  <SidePanel
    open={open}
    onClose={onClose}
    title={t('requisitions.new.title')}
    footerActions={
      <>
        <Button variant="secondary" onClick={onClose}>
          {t('requisitions.new.cancel')}
        </Button>
        <Button variant="outline" disabled={!canSubmit} onClick={onSubmit}>
          {t('requisitions.new.submit')}
        </Button>
      </>
    }
  >
    <div className="space-y-5">
      <NewPrItemStep form={form} setForm={setForm} parsedQty={parsedQty} t={t} />

      <NewPrScheduleStep form={form} setForm={setForm} t={t} />

      <FormSection
        eyebrow={t('requisitions.new.step3.eyebrow')}
        title={t('requisitions.new.step3.title')}
        description={t('requisitions.new.step3.desc')}
      >
        <textarea
          aria-label={t('requisitions.new.step3.title')}
          className={`${inputClass} min-h-[72px] resize-y`}
          placeholder={t('requisitions.new.placeholder.justification')}
          value={form.justification}
          onChange={(e) => setForm({ ...form, justification: e.target.value })}
        />
        <div className="bg-info-soft border-l-2 border-info rounded px-3 py-2 text-xs text-text-primary">
          {t('requisitions.new.info')}
        </div>
      </FormSection>
    </div>
  </SidePanel>
);

export default NewRequisitionPanel;
