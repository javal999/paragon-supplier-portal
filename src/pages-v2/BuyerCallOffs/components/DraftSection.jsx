/** @import React from 'react' */
/** @import { ReleaseCheck } from '@services/transitions/callOffRules' */
/** @import { PanelBodyProps } from './CallOffPanelBody' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { formatIDR } from '@lib/format';
import { qty } from '../../callOffs/callOffDisplay';
import DraftFields from './DraftFields';
import ExceedsNotice from './ExceedsNotice';

/**
 * @typedef {Pick<PanelBodyProps, 'form' | 'setForm' | 'busy' | 'planHeld' | 'planAvailability' | 'today' | 'run'> & {
 *   c: PanelBodyProps['view']['callOff'];
 *   reason: string;
 *   edits: { quantity?: number; needDate?: string };
 *   draftRelease: ReleaseCheck | null;
 *   withheld: boolean;
 * }} DraftSectionProps
 */

/**
 * The draft's actions: edit (with reason), dismiss (with reason) and release.
 * `reason`, `edits`, `draftRelease` (BL-49, the draft's own quantity against
 * its line) and `withheld` (X-03) are derived once by `CallOffPanelBody`. A
 * seat without `calloff:plan` sees the handoff notice instead.
 * @type {React.FC<DraftSectionProps>}
 */
const DraftSection = ({
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
  draftRelease,
  withheld
}) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" data-testid="calloff-draft-actions">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.draft.title')}</h3>
      {planHeld ? (
        <>
          <DraftFields form={form} setForm={setForm} uom={c.uom} today={today} withType />
          {/* BL-49 — releasing this draft is checked against what remains on
              its own line, and refused with the figures when it does not fit. */}
          {draftRelease && (
            <>
              <p className="text-xs text-text-secondary" data-testid="calloff-draft-remaining">
                {draftRelease.remaining.remainingQty === null
                  ? t('co.new.remainingValue', {
                      value: formatIDR(draftRelease.remaining.remainingValue)
                    })
                  : t('co.new.remaining', {
                      quantity: qty(draftRelease.remaining.remainingQty),
                      uom: c.uom,
                      value: formatIDR(draftRelease.remaining.remainingValue)
                    })}
              </p>
              <ExceedsNotice
                check={draftRelease}
                uom={c.uom}
                testId="calloff-draft-exceeds-remaining"
              />
            </>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="secondary"
              disabled={busy || reason === ''}
              onClick={() =>
                void run({ verb: 'dismiss', id: c.id, reason }, t('co.toast.dismissed'))
              }
            >
              {t('co.draft.dismiss')}
            </Button>
            <Button
              variant="secondary"
              disabled={
                busy || reason === '' || (Object.keys(edits).length === 0 && form.type === c.type)
              }
              onClick={() =>
                void run(
                  {
                    verb: 'editDraft',
                    id: c.id,
                    reason,
                    ...edits,
                    ...(form.type !== c.type ? { type: form.type } : {})
                  },
                  t('co.toast.draftSaved'),
                  false
                )
              }
            >
              {t('co.draft.save')}
            </Button>
            {/* X-03 — the release is withheld and says why, rather than acting
                and being refused. Edit and dismiss above stay available. */}
            {withheld ? (
              <p
                role="note"
                className="basis-full text-xs text-text-secondary text-right"
                data-testid="calloff-draft-release-withheld"
              >
                {t('co.draft.releaseWithheld')}
              </p>
            ) : (
              <Button
                variant="outline"
                disabled={busy || (draftRelease?.exceeds ?? false)}
                onClick={() => void run({ verb: 'releaseDraft', id: c.id }, t('co.toast.released'))}
              >
                {t('co.draft.release')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <HandoffNotice availability={planAvailability} testId="handoff-calloff-draft" />
      )}
    </section>
  );
};

export default DraftSection;
