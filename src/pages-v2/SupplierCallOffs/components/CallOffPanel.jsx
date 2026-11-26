/** @import React from 'react' */
/** @import { useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { useAsnWizardAvailability } from '../../shipments/asnWizardEntry' */
/** @import { useCallOffResponse } from '../hooks/useCallOffResponse' */
import { useTranslation } from 'react-i18next';
import SidePanel from '@components/ui-v2/SidePanel';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { isConfirmedAndAccepted } from '@services/transitions/callOffRules';
import CallOffDelays from '../../callOffs/CallOffDelays';
/** @import { EMPTY } from '../const' */
import CallOffDetails from './CallOffDetails';
import DispatchSection from './DispatchSection';
import RespondSection from './RespondSection';

/**
 * @typedef {object} CallOffPanelProps
 * @property {CallOffView | null} selected  The call-off the panel shows; null keeps it closed.
 * @property {() => void} onClose  Closes the panel.
 * @property {typeof EMPTY} form  The page's response-and-dispatch form.
 * @property {(f: typeof EMPTY) => void} setForm  Its setter.
 * @property {boolean} busy  A call-off command is in flight.
 * @property {ReturnType<typeof useVerbAvailability>} confirmAvailability  Whether this user holds `calloff:confirm`.
 * @property {ReturnType<typeof useVerbAvailability>} dispatchAvailability  Whether this user holds `calloff:dispatch`.
 * @property {ReturnType<typeof useAsnWizardAvailability>} asnWizard  Whether the Create-ASN wizard is open to this user.
 * @property {string | null} draftAsn  UCX-P3 — the open draft ASN this call-off's mark step created, if any.
 * @property {(v: CallOffView, form: typeof EMPTY) => Promise<void>} markShipped  UCX-P3 — send the notice and open the draft.
 * @property {ReturnType<typeof useCallOffResponse>['run']} run  Sends one command and toasts its outcome.
 * @property {ReturnType<typeof useCallOffResponse>['proposal']} proposal  What the chosen answer proposes.
 * @property {ReturnType<typeof useCallOffResponse>['sendAnswer']} sendAnswer  Sends the respond form's answer.
 */

/**
 * The side panel of one call-off: its details, PTI's delays, the respond
 * section while it awaits confirmation, the awaiting-approval line, and the
 * dispatch section once it is confirmed and accepted. Moved out of
 * `SupplierCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<CallOffPanelProps>}
 */
const CallOffPanel = ({
  selected,
  onClose,
  form,
  setForm,
  busy,
  confirmAvailability,
  dispatchAvailability,
  asnWizard,
  draftAsn,
  markShipped,
  run,
  proposal,
  sendAnswer
}) => {
  const { t } = useTranslation();
  return (
    <SidePanel
      open={selected !== null}
      onClose={onClose}
      title={selected ? t('co.panel.title', { number: selected.callOff.callOffNumber }) : ''}
    >
      {selected && (
        <div className="space-y-6">
          <CallOffDetails selected={selected} />

          {/* DRC-5 (BL-191) — delays PTI proposed for an LTP drop, and the answers. */}
          <CallOffDelays callOff={selected.callOff} testId="supplier-calloff-delays" />

          {selected.callOff.status === 'Awaiting Confirmation' && (
            <RespondSection
              selected={selected}
              form={form}
              setForm={setForm}
              busy={busy}
              confirmAvailability={confirmAvailability}
              run={run}
              proposal={proposal}
              sendAnswer={sendAnswer}
            />
          )}

          {selected.confirmation === 'Awaiting Approval' && (
            <p
              className="text-sm text-text-secondary"
              data-testid="supplier-calloff-awaiting-approval"
            >
              {t('co.sup.awaitingApproval')}
            </p>
          )}

          {isConfirmedAndAccepted(selected.callOff) && (
            <DispatchSection
              selected={selected}
              form={form}
              setForm={setForm}
              busy={busy}
              dispatchAvailability={dispatchAvailability}
              asnWizard={asnWizard}
              draftAsn={draftAsn}
              markShipped={markShipped}
            />
          )}
        </div>
      )}
    </SidePanel>
  );
};

export default CallOffPanel;
