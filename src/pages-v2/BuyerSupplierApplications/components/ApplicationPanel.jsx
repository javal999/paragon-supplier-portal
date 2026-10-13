/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

import SidePanel from '@components/ui-v2/SidePanel';
import NextActLine from '@components/ui-v2/NextActLine';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { ApplicationReview } from '../hooks/useApplicationReview' */
import ApplicationDetails from './ApplicationDetails';
import ApplicationActs from './ApplicationActs';

/**
 * @typedef {object} ApplicationPanelProps
 * @property {ApplicationReview} review              selection, confirm step and verbs (page state)
 * @property {VerbAvailability} reviewAvailability   the seat's hold on `application:review`
 * @property {VerbAvailability} decideAvailability   the seat's hold on `application:decide`
 */

/**
 * The review side panel for the selected application: who acts next, the
 * read-only details, then the acts. #280 — mounted only when a row is
 * selected; a closed panel is ABSENT. Moved out of `BuyerSupplierApplications`
 * by the Phase 5 page split.
 * @type {React.FC<ApplicationPanelProps>}
 */
const ApplicationPanel = ({ review, reviewAvailability, decideAvailability }) => {
  const { t } = useTranslation();
  const { selected, closePanel, nextAct } = review;

  return (
    <SidePanel
      open={selected !== null}
      onClose={closePanel}
      title={selected ? t('applications.panel.title', { number: selected.applicationNumber }) : ''}
    >
      {selected && (
        <div className="space-y-6">
          <NextActLine act={nextAct} testId="next-act-buyer-application" />
          <ApplicationDetails selected={selected} />

          {/* ── THE ACTS. Each in its OWN slot, gated on its OWN atom. ───── */}
          <ApplicationActs
            selected={selected}
            review={review}
            reviewAvailability={reviewAvailability}
            decideAvailability={decideAvailability}
          />
        </div>
      )}
    </SidePanel>
  );
};

export default ApplicationPanel;
