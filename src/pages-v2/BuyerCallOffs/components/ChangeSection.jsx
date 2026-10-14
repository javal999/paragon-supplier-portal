/** @import React from 'react' */
/** @import { ReleaseCheck } from '@services/transitions/callOffRules' */
/** @import { PanelBodyProps } from './CallOffPanelBody' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import DraftFields from './DraftFields';
import ExceedsNotice from './ExceedsNotice';

/**
 * @typedef {Pick<PanelBodyProps, 'form' | 'setForm' | 'busy' | 'planHeld' | 'planAvailability' | 'today' | 'run'> & {
 *   c: PanelBodyProps['view']['callOff'];
 *   reason: string;
 *   edits: { quantity?: number; needDate?: string };
 *   changeRelease: ReleaseCheck | null;
 * }} ChangeSectionProps
 */

/**
 * Change a call-off the supplier already answered, sending it back to Awaiting
 * Confirmation: the edit fields, the same remaining check a release runs
 * (`changeRelease`, on the typed quantity), and the submit. A seat without
 * `calloff:plan` sees the handoff notice instead.
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
  changeRelease
}) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" data-testid="calloff-change">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.change.title')}</h3>
      {planHeld ? (
        <>
          <p className="text-sm text-text-secondary">{t('co.change.intro')}</p>
          <DraftFields form={form} setForm={setForm} uom={c.uom} today={today} />
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
                (changeRelease?.exceeds ?? false)
              }
              onClick={() =>
                void run({ verb: 'change', id: c.id, reason, ...edits }, t('co.toast.changed'))
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
