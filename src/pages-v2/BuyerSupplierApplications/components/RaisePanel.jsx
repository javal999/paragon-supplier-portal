/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

import SidePanel from '@components/ui-v2/SidePanel';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RaiseApplication } from '../hooks/useRaiseApplication' */
import RaiseConfirm from './RaiseConfirm';
import RaiseForm from './RaiseForm';

/**
 * @typedef {object} RaisePanelProps
 * @property {RaiseApplication} raise                 the draft and its handlers (page state)
 * @property {VerbAvailability} submitAvailability    the seat's hold on `application:submit`
 */

/**
 * B3 · THE DOOR — the side panel that raises an application: the form, then a
 * confirm step, both behind the `application:submit` gate. Moved out of
 * `BuyerSupplierApplications` by the Phase 5 page split; the draft state stays
 * in the page (`useRaiseApplication`).
 * @type {React.FC<RaisePanelProps>}
 */
const RaisePanel = ({ raise, submitAvailability }) => {
  const { t } = useTranslation();

  return (
    <SidePanel
      open={raise.raiseOpen}
      onClose={raise.closeRaise}
      title={t('applications.raise.panel.title')}
    >
      {/* ⚠️ THE MODE IS GATED, NOT ONLY THE DOOR (§84). `SupplierOrders`
          shipped a live commit behind a comment asserting the one entrance
          was guarded, and the comment was false. A seat narrowed while this
          panel stands open is reachable — so the body checks the atom too,
          and the notice is what it falls back to rather than a blank. */}
      {submitAvailability.kind !== 'held' ? (
        <HandoffNotice
          availability={submitAvailability}
          testId="handoff-application-submit-panel"
        />
      ) : raise.raiseConfirming ? (
        <RaiseConfirm raise={raise} />
      ) : (
        <RaiseForm raise={raise} />
      )}
    </SidePanel>
  );
};

export default RaisePanel;
