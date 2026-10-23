/** @import React from 'react' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { useCallOffResponse } from '../hooks/useCallOffResponse' */
import { useTranslation } from 'react-i18next';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { checkTolerance, pendingDelay } from '@services/transitions/callOffRules';
/** @import { EMPTY } from '../const' */
import DelayAnswerForm from './DelayAnswerForm';
import RespondForm from './RespondForm';

/**
 * @typedef {object} RespondSectionProps
 * @property {CallOffView} selected  The call-off open in the panel (awaiting confirmation).
 * @property {typeof EMPTY} form  The page's response-and-dispatch form.
 * @property {(f: typeof EMPTY) => void} setForm  Its setter.
 * @property {boolean} busy  A call-off command is in flight.
 * @property {ReturnType<typeof useVerbAvailability>} confirmAvailability  Whether this user holds `calloff:confirm`.
 * @property {ReturnType<typeof useCallOffResponse>['run']} run  Sends one command and toasts its outcome.
 * @property {ReturnType<typeof useCallOffResponse>['proposal']} proposal  What the chosen answer proposes.
 * @property {ReturnType<typeof useCallOffResponse>['sendAnswer']} sendAnswer  Sends the respond form's answer.
 */

/**
 * The panel's respond section for a call-off awaiting confirmation: the
 * delay answer when PTI proposed a delay, else the respond form, or the
 * hand-off notice when the user does not hold the confirm verb. Moved out of
 * `SupplierCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<RespondSectionProps>}
 */
const RespondSection = ({
  selected,
  form,
  setForm,
  busy,
  confirmAvailability,
  run,
  proposal,
  sendAnswer
}) => {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" data-testid="supplier-calloff-respond">
      <h3 className="text-label text-text-tertiary uppercase">{t('co.respond.title')}</h3>
      {confirmAvailability.kind === 'held' && pendingDelay(selected.callOff) ? (
        <DelayAnswerForm
          view={selected}
          comment={form.comment}
          setComment={(comment) => setForm({ ...form, comment })}
          busy={busy}
          onAnswer={(delayAnswer) =>
            void run(
              {
                verb: 'confirm',
                id: selected.callOff.id,
                delayAnswer,
                comment: form.comment.trim() || undefined
              },
              t(delayAnswer === 'approve' ? 'co.toast.delayApproved' : 'co.toast.delayRejected', {
                number: selected.callOff.callOffNumber
              })
            )
          }
        />
      ) : confirmAvailability.kind === 'held' ? (
        <RespondForm
          view={selected}
          form={form}
          setForm={setForm}
          busy={busy}
          check={(() => {
            const p = proposal(selected);
            return p ? checkTolerance(selected.callOff, p.deliveries) : null;
          })()}
          onSend={() => sendAnswer(selected)}
        />
      ) : (
        <HandoffNotice availability={confirmAvailability} testId="handoff-calloff-confirm" />
      )}
    </section>
  );
};

export default RespondSection;
