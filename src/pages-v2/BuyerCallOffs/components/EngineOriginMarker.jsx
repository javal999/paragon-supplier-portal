/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';

/**
 * X-03 — the marker on a call-off the Order plan drafted from an engine
 * recommendation while the engine dataset is not live (see `releaseWithheld`
 * in `../utils.js`). `testId` names the row or panel it sits in. Moved out of
 * `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ testId: string }>}
 */
const EngineOriginMarker = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <span data-testid={testId}>
      <StatusPill variant="warning">{t('co.origin.engine')}</StatusPill>
    </span>
  );
};

export default EngineOriginMarker;
