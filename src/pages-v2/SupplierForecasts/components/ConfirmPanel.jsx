/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Lock, Send } from 'lucide-react';
import { useActiveReasonCodes, useReasonLabel } from '../../admin/reasonCodeDisplay';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import FormSection from '@components/ui-v2/FormSection';
import Data from '@components/ui-v2/Data';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useRequirementResponseSubmit } from '@services/query/sdcSupplierHooks';
/** @import { ForecastLine, ForecastPublication, SdcObjectKind } from '@services/sdc' */
import { buildRequirementResponsePayload } from '@services/sdc';
/** @import { CommandResult } from '@services/data/types' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
import { normalizeQty } from '@lib/localeNumber';
import { formatNumber } from '@lib/format';
/** @import { ConfirmForm } from '../const' */
import { CHIP, CLASS_LABEL_KEY, inputClass, labelClass } from '../const';
import { materialLabel } from '../utils';

// ── CP-0 · W1 · PR-2c — the forecast commitment is PARSED, never coerced ─────
//
// This is the supplier's binding answer to a published requirement, and a
// misread here does not stay a bad number — it CASCADES. "40.000" against a
// 40,000 PCS line became 40, which tripped `isShort`, which forced the supplier
// to pick a shortfall root cause for a quantity they had committed IN FULL,
// which shipped a 39,960-unit deficit to the planner's collaboration board. The
// platform interrogated a supplier about a shortfall that did not exist, then
// chased them for it.
//
// NO CONVENTION HINT. Unlike the channel surfaces (where the channel itself
// carries a convention and hardcodes 'id'), this form has no carrier: the
// identity holds only persona/supplierId/supplierName, no locale, and no
// numeric-preference attribute exists anywhere in the model. The supplier
// master's `country` is NOT that signal and inferring from it would be a
// plausible-wrong guess of exactly the kind this batch exists to kill — DE and
// FR use the same "1.234,56" convention as ID while MY and CN use the EN one,
// and a jurisdiction is not the convention of whoever is typing. So an ambiguous
// token refuses (CP-0 §5a) rather than being resolved from a signal we do not
// actually have.
//
// EXHAUSTIVE, not Partial (the 2a discipline): the next refusal reason added to
// the union must break the build here, not render a blank line to a supplier.
//
// It lives in THIS file, beside both of its uses (the submit-time toast and the
// inline refusal), because GL-1's `chipCoverage` links a message map to its
// uses only within the file that declares it.
/** @type {Record<QtyRefusalReason, string>} */
const CONFIRM_REFUSAL_KEY = {
  EMPTY_QTY: 'sdcSup.panel.qty.refused.empty',
  NOT_NUMERIC: 'sdcSup.panel.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'sdcSup.panel.qty.refused.ambiguous'
};

/**
 * @typedef {object} ConfirmPanelProps
 * @property {ForecastLine | null} line  the line being confirmed; `null` closes the panel
 * @property {ConfirmForm} form
 * @property {React.Dispatch<React.SetStateAction<ConfirmForm>>} setForm
 * @property {() => void} onClose  Cancel and the panel's own close
 * @property {() => void} onSaved  after a saved draft: close, reset, switch to My responses
 * @property {ForecastPublication} publication  the RENDERED publication (snapshot keys)
 * @property {string} supplierId  from the identity, never the form
 * @property {() => string | undefined} causationId  the visit's audit anchor
 * @property {(kind: SdcObjectKind, res: CommandResult) => void} recordAttempt
 * @property {() => void} failToast  the generic failure toast for a thrown dispatch
 */

/**
 * The forecast confirm panel (SDC-2b): the line summary, the confirmed
 * quantity (parsed once, refused inline), committed date and capacity
 * constraint, and the shortfall root cause. Its submit SAVES A DRAFT through
 * `t_requirementresponse_submit` (PF-1b); the draft is sent from My responses.
 *
 * Form state stays in the workspace, which opens the panel with an empty form.
 * @type {React.FC<ConfirmPanelProps>}
 */
const ConfirmPanel = ({
  line: panelLine,
  form,
  setForm,
  onClose,
  onSaved,
  publication,
  supplierId,
  causationId,
  recordAttempt,
  failToast
}) => {
  const { t } = useTranslation();
  // BL-32 — the commitment-shortfall list in force (the same codes the Forecast
  // & commitments page offers): only active codes, labelled from the list.
  const rootCauseCodes = useActiveReasonCodes('commitmentShortfall');
  const rootCauseLabel = useReasonLabel();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const submitMutation = useRequirementResponseSubmit();

  // The ONE parse for the confirm form. Everything downstream — the short
  // detection, the root-cause requirement, the submit gate, the payload — reads
  // THIS result, so none of them can disagree about what the supplier typed.
  const confirmQty = normalizeQty(form.confirmedQty);
  // A quantity nobody can read is not a shortfall. `isShort` is only ASKABLE of
  // a number that exists, so an unreadable entry never accuses the supplier of
  // falling short — it says it cannot read them.
  const isShort = panelLine !== null && confirmQty.ok && confirmQty.value < panelLine.forecastQty;
  // BL-326 — the refusal element exists only while it is shown, so the field
  // describes it exactly then (alongside the permanent hint).
  const qtyRefused = form.confirmedQty.trim() !== '' && !confirmQty.ok;

  const submitConfirmation = async () => {
    if (!panelLine) return;
    // Quantity must be STATED and READABLE — a typed 0 is legal (F-2), a blank
    // field is not a zero, and an ambiguous token is not a number. The refusal
    // reason is named rather than collapsed into one generic "missing quantity",
    // because "you left this empty" and "we cannot tell which number you mean"
    // ask the supplier for different things.
    if (!confirmQty.ok) {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.missingQty.title'),
        description: t(CONFIRM_REFUSAL_KEY[confirmQty.reason])
      });
      return;
    }
    // Short (including 0): the deviation needs its root cause (form-level rule).
    if (confirmQty.value < panelLine.forecastQty && !form.rootCauseLevel1) {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.missingRootCause.title'),
        description: t('sdcSup.toast.missingRootCause.body')
      });
      return;
    }
    // Snapshot keys come from the RENDERED publication + line; supplierId from
    // the IDENTITY — never the form (un-falsifiable binding, SDC-2a).
    const payload = buildRequirementResponsePayload(publication, panelLine, supplierId, {
      // The SAME parsed value the gate above judged — the builder can no longer
      // re-read the string and reach a different number (CP-0 §4).
      confirmedQty: confirmQty.value,
      // THE HOIST — the token travels with the number so the TRANSITION can check
      // that they agree, instead of taking this component's word for it. Both come
      // from the one `normalizeQty` call at the top of this component, so the
      // transition's re-parse is the identical call on the identical input and
      // agreement here is STRUCTURAL, not lucky.
      //
      // No `numberConvention` key: that call is deliberately HINT-FREE (a confirm
      // form carries no origin convention — the `poConfirmModel` ruling), and the
      // transition must re-parse the same way. Passing a convention this component
      // does not actually have is how "renders in one language, parses in another"
      // gets written; #240 is the register entry for that shape.
      confirmedQtyRaw: form.confirmedQty,
      ...(form.capacityConstraint ? { capacityConstraint: form.capacityConstraint } : {}),
      ...(form.rootCauseLevel1
        ? {
            rootCause: {
              level1: form.rootCauseLevel1,
              ...(form.rootCauseNote ? { note: form.rootCauseNote } : {})
            }
          }
        : {})
    });
    try {
      const res = await submitMutation.mutateAsync({ payload, causationId: causationId() });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.toast.failed.title'),
          description: refusalText(res.reason) ?? res.reason ?? t('sdcSup.toast.failed.body')
        });
        return;
      }
      recordAttempt('RequirementResponse', res);
      // ⚠️ PF-1b — THIS SAVED A DRAFT. Nothing has been sent: the buyer's
      // consolidation skips `Draft`, so the planner still reads `awaiting` for
      // this line until the supplier submits from My responses. The old copy
      // ("Confirmation submitted") became false the moment creation moved.
      toast({
        variant: 'success',
        title: t('sdcSup.toast.draftSaved.title', {
          material: materialLabel(panelLine.materialCode)
        }),
        description: t('sdcSup.toast.draftSaved.body')
      });
      onSaved();
    } catch {
      failToast();
    }
  };

  return (
    <SidePanel
      open={panelLine !== null}
      onClose={onClose}
      title={
        panelLine
          ? t('sdcSup.panel.title', { material: materialLabel(panelLine.materialCode) })
          : ''
      }
      footerActions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('sdcSup.panel.cancel')}
          </Button>
          {/* ⚠️ PF-1b — WAS SOLID, NOW OUTLINE, and the ruling is what changed
              it. F-3 made this "the ONE solid primary on this surface: the
              governed commit" — true while the button SUBMITTED. It now SAVES
              A DRAFT, and a draft is the most reversible act on the page. The
              solid did not become merely unnecessary; it became a false
              signal, promising weight the click no longer carries. */}
          <Button
            variant="outline"
            icon={Send}
            disabled={submitMutation.isPending}
            onClick={submitConfirmation}
          >
            {submitMutation.isPending ? t('sdcSup.panel.submitting') : t('sdcSup.panel.submit')}
          </Button>
        </>
      }
    >
      {panelLine && (
        <div className="space-y-5">
          <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Data className="text-sm font-bold text-text-primary">{panelLine.materialCode}</Data>
              <span className={CHIP}>
                {panelLine.commitmentClass === 'firm' && <Lock size={11} aria-hidden="true" />}
                {t(CLASS_LABEL_KEY[panelLine.commitmentClass])}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
              <span>
                {t('sdcSup.panel.requested')}{' '}
                <Data as="strong" className="text-text-primary">
                  {formatNumber(panelLine.forecastQty)} {panelLine.uom}
                </Data>
              </span>
              <span>
                {t('sdcSup.line.period')}{' '}
                <Data as="strong" className="text-text-primary">
                  {panelLine.periodBucket}
                </Data>
              </span>
            </div>
          </section>

          <FormSection
            eyebrow={t('sdcSup.panel.qty.eyebrow')}
            title={t('sdcSup.panel.qty.title')}
            description={t('sdcSup.panel.qty.desc')}
          >
            <div>
              <label className={labelClass} htmlFor="sdcsup-qty">
                {t('sdcSup.panel.qtyLabel', { uom: panelLine.uom })}
              </label>
              {/* type=text + inputmode=decimal (ruling 6.2): type=number
                  rejects the separators this field exists to adjudicate, so
                  the fix could never fire behind it. */}
              <input
                id="sdcsup-qty"
                type="text"
                inputMode="decimal"
                placeholder="0"
                aria-invalid={qtyRefused}
                aria-describedby={
                  qtyRefused ? 'sdcsup-qty-refusal sdcsup-qty-hint' : 'sdcsup-qty-hint'
                }
                value={form.confirmedQty}
                onChange={(e) => setForm({ ...form, confirmedQty: e.target.value })}
                className={inputClass}
              />
              {qtyRefused && (
                <div
                  id="sdcsup-qty-refusal"
                  role="alert"
                  data-testid="confirm-qty-refusal"
                  className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                >
                  {t(CONFIRM_REFUSAL_KEY[confirmQty.reason])}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'QtyRefusalReason', term: confirmQty.reason }}
                  />
                </div>
              )}
              <div
                id="sdcsup-qty-hint"
                className="mt-1 text-[length:var(--fs-label-3)] text-text-tertiary"
              >
                {t('sdcSup.panel.qty.hint')}
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('sdcSup.panel.date.eyebrow')}
            title={t('sdcSup.panel.date.title')}
            description={t('sdcSup.panel.date.desc')}
          >
            <div>
              <label className={labelClass} htmlFor="sdcsup-constraint">
                {t('sdcSup.panel.capacityConstraint')}
              </label>
              <input
                id="sdcsup-constraint"
                type="text"
                placeholder={t('sdcSup.panel.capacityPlaceholder')}
                value={form.capacityConstraint}
                onChange={(e) => setForm({ ...form, capacityConstraint: e.target.value })}
                className={inputClass}
              />
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('sdcSup.panel.rootCause.eyebrow')}
            title={t('sdcSup.panel.rootCause.title')}
            description={t('sdcSup.panel.rootCause.desc')}
          >
            <div>
              <label className={labelClass} htmlFor="sdcsup-rootcause">
                {t('sdcSup.panel.rootCause.level1')}
                {isShort && <span className="text-danger"> *</span>}
              </label>
              <select
                id="sdcsup-rootcause"
                value={form.rootCauseLevel1}
                onChange={(e) => setForm({ ...form, rootCauseLevel1: e.target.value })}
                className={inputClass}
              >
                <option value="">{t('sdcSup.panel.rootCause.select')}</option>
                {rootCauseCodes.map((level) => (
                  <option key={level} value={level}>
                    {rootCauseLabel('commitmentShortfall', level)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="sdcsup-rootcause-note">
                {t('sdcSup.panel.rootCause.note')}
              </label>
              <textarea
                id="sdcsup-rootcause-note"
                rows={3}
                placeholder={t('sdcSup.panel.rootCause.notePlaceholder')}
                value={form.rootCauseNote}
                onChange={(e) => setForm({ ...form, rootCauseNote: e.target.value })}
                className={`${inputClass} resize-y`}
              />
            </div>
          </FormSection>
        </div>
      )}
    </SidePanel>
  );
};

export default ConfirmPanel;
