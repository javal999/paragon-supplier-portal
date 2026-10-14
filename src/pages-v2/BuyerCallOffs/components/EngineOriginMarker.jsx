/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';

/**
 * X-03 — the "from the engine" marker on a draft whose release is withheld
 * (see `releaseWithheld` in `../utils`). `testId` names the row or the panel.
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
