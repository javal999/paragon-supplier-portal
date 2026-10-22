/** @import React from 'react' */
/** @import { CallOffCommandVars } from '@services/query/commandHooks' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { CallOffView, ReleaseCheck } from '@services/transitions/callOffRules' */
/** @import { CallOffForm } from '../utils' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { inputClass, labelClass } from '../../callOffs/callOffDisplay';
import DraftFields from './DraftFields';
import ExceedsNotice from './ExceedsNotice';

/**
 * @typedef {object} ChangeSectionProps
 * @property {CallOffView['callOff']} c The call-off being changed.
 * @property {CallOffForm} form The page's call-off form.
 * @property {(f: CallOffForm) => void} setForm
 * @property {boolean} busy A call-off command is in flight.
 * @property {boolean} planHeld Whether the seat holds `calloff:plan`; otherwise the handoff notice shows.
 * @property {ReturnType<typeof useVerbAvailability>} planAvailability
 * @property {string} today
 * @property {(vars: CallOffCommandVars, success: string, close?: boolean) => Promise<boolean>} run
 * @property {string} reason The typed reason, trimmed; the change needs one.
 * @property {{ quantity?: number; needDate?: string }} edits What the form changes.
 * @property {ReleaseCheck | null} changeRelease The remaining check the change verb runs.
 * @property {readonly string[]} changeCodes BL-32 / DRC-5 — the active change reason codes.
 * @property {(type: 'callOffChange', code: string) => string} reasonLabel
 * @property {string} reasonCode The chosen reason code (state of the panel body, so it outlives this section).
 * @property {(code: string) => void} setReasonCode
 * @property {boolean} delay DRC-5 — "LTP dropped" is chosen: a later need date is a delay the supplier approves.
 * @property {unknown} delayRefused DRC-5 — why the verb would refuse the delay, or `null`.
 */

/**
 * Change a call-off the supplier already answered, back to Awaiting
 * Confirmation: the edit fields, a coded reason (DRC-5), the remaining check
 * and the submit. Rendered by the panel only while the call-off is changeable.
 * Moved out of `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<ChangeSectionProps>}
 */
const ChangeSection = ({
  c,
  form,
  setForm,
  busy,
  planHeld,
  planAvailability,
  today,
  run,
  reason,
  edits,
  changeRelease,
  changeCodes,
  reasonLabel,
  reasonCode,
  setReasonCode,
  delay,
  delayRefused
}) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" data-testid="calloff-change">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.change.title')}</h3>
      {planHeld ? (
        <>
          <p className="text-sm text-text-secondary">{t('co.change.intro')}</p>
          <DraftFields form={form} setForm={setForm} uom={c.uom} today={today} />
          <div>
            <label htmlFor="co-change-reason-code" className={labelClass}>
              {t('co.change.reasonCode')}
            </label>
            <select
              id="co-change-reason-code"
              className={inputClass}
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              <option value="">{t('co.change.reasonCodeNone')}</option>
              {changeCodes.map((code) => (
                <option key={code} value={code}>
                  {reasonLabel('callOffChange', code)}
                </option>
              ))}
            </select>
            {delay ? (
              <p className="mt-1 text-xs text-text-tertiary" data-testid="calloff-delay-hint">
                {t('co.change.delayHint')}
              </p>
            ) : null}
          </div>
          {/* The change verb runs the same remaining check as a release. */}
          <ExceedsNotice
            check={changeRelease}
            uom={c.uom}
            testId="calloff-change-exceeds-remaining"
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              disabled={
                busy ||
                reason === '' ||
                Object.keys(edits).length === 0 ||
                (changeRelease?.exceeds ?? false) ||
                delayRefused !== null
              }
              onClick={() =>
                void run(
                  {
                    verb: 'change',
                    id: c.id,
                    reason,
                    ...(reasonCode ? { reasonCode } : {}),
                    ...edits
                  },
                  t('co.toast.changed')
                )
              }
            >
              {t('co.change.submit')}
            </Button>
          </div>
        </>
      ) : (
        <HandoffNotice availability={planAvailability} testId="handoff-calloff-change" />
      )}
    </section>
  );
};

export default ChangeSection;
