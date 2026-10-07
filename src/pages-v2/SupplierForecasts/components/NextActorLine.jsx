/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { nextActorKey } from '../utils';

/**
 * R1a — the line on a response card that names whose act is next, derived
 * from the machine through `nextActorKey`. Renders nothing for a `stranded`
 * state. `state` is the response's status.
 * @type {React.FC<{ state: string }>}
 */
const NextActorLine = ({ state }) => {
  const { t } = useTranslation();
  const key = nextActorKey(state);
  if (!key) return null;
  return (
    <div className="text-xs text-text-tertiary mb-3" data-testid="sdcsup-response-actor">
      {t(key)}
    </div>
  );
};

export default NextActorLine;
