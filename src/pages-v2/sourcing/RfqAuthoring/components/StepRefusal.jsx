import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
import { refusalMessage } from '../utils';

/**
 * Why Next is disabled on this step, said on the step rather than left to guess.
 * @type {React.FC<{ reason: string | null; testId: string }>}
 */
export const StepRefusal = ({ reason, testId }) => {
  const { t } = useTranslation();
  if (!reason) return null;
  return (
    <p
      role="status"
      data-testid={testId}
      className="text-xs text-text-secondary border-l-2 border-warning pl-2"
    >
      {refusalMessage(t, reason)}
    </p>
  );
};
