/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDateTime } from '@lib/format';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

/**
 * The full-width row under a commitment line holding its revision log: each
 * revision PTI raised and each one resolved, with when and the text. Renders
 * only when the line has log entries.
 * @type {React.FC<{ l: ForecastCommitmentLine }>}
 */
const CommitmentLogRow = ({ l }) => {
  const { t } = useTranslation();
  return (
    <tr
      className="border-t border-border-subtle"
      data-testid={`fc-sup-log-${l.materialCode}-${l.periodBucket}`}
    >
      <td colSpan={9} className="px-4 py-2 text-xs text-text-secondary">
        {l.log.map((e, i) => (
          <div key={i}>
            <span className="font-semibold">
              {t(e.kind === 'raised' ? 'fc.log.revision' : 'fc.log.resolved')}
            </span>{' '}
            <Data>{formatDateTime(e.at)}</Data> — {e.text}
          </div>
        ))}
      </td>
    </tr>
  );
};

export default CommitmentLogRow;
