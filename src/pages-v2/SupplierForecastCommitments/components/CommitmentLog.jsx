/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDateTime } from '@lib/format';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

/**
 * A committed period's revision log, under the grid (PEX-2: the periods are
 * columns now, so the log no longer fits a full-width row): each revision PTI
 * raised and each one resolved, with when and the text. Renders only when the
 * line has log entries.
 * @type {React.FC<{ l: ForecastCommitmentLine; label: string }>}
 */
const CommitmentLog = ({ l, label }) => {
  const { t } = useTranslation();
  return (
    <div
      className="px-4 py-2 text-xs text-text-secondary border-t border-border-subtle"
      data-testid={`fc-sup-log-${l.materialCode}-${l.periodBucket}`}
    >
      <span className="font-semibold text-text-primary">{label}</span>
      {l.log.map((e, i) => (
        // eslint-disable-next-line react/no-array-index-key -- append-only log; entries are never reordered or removed
        <div key={i}>
          <span className="font-semibold">
            {t(e.kind === 'raised' ? 'fc.log.revision' : 'fc.log.resolved')}
          </span>{' '}
          <Data>{formatDateTime(e.at)}</Data> — {e.text}
        </div>
      ))}
    </div>
  );
};

export default CommitmentLog;
