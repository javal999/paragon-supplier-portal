/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { DisputeEntry } from '@services/sdc' */
import { formatDate } from '@lib/format';

// ── R1b — THE BUYER'S WORDS, RENDERED BACK TO THE SUPPLIER ──────────────────
//
// The mirror of `rootCause` directly below it: that is the supplier's own
// explanation shown back to them; this is the buyer's, shown to the party who
// did not write it. R1a put "awaiting Paragon" on this row — a promise of
// review — and without this the outcome of that review arrived as a bare status
// change. A dispute the supplier can see but not understand is half a remedy
// (`HALAL-REFUSAL-DEAD-ENDS-01`, one lane over).
//
// ⚠️ THE WHOLE LEDGER RENDERS, NOT THE LAST ENTRY. A resolved dispute is not the
// same as one never raised, and showing only the current standing would erase
// exactly the distinction the ledger exists to keep. Raise and resolution read in
// order, each with its own instant.
//
// DP2-WARN-01: `text-warning-hover` is the ONLY warning colour legal as TEXT on
// light — the bright DEFAULT fails AA and `text-warning` must never be used.
/**
 * The buyer's dispute ledger on one response card (`ResponsesTab`): every
 * entry, raise and resolution, in order with its instant. Renders nothing when
 * `entries` is empty.
 * @type {React.FC<{ entries: readonly DisputeEntry[] }>}
 */
const DisputeLedger = ({ entries }) => {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-2" data-testid="sdcsup-dispute-ledger">
      {entries.map((e, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key -- append-only ledger; the index only splits same-instant entries
          key={`${e.at}-${i}`}
          className={`border-l-2 pl-3 py-1 ${
            e.kind === 'raised' ? 'border-l-warning' : 'border-l-success'
          }`}
        >
          <div className="text-label uppercase mb-0.5">
            <span className={e.kind === 'raised' ? 'text-warning-hover' : 'text-success'}>
              {t(
                e.kind === 'raised'
                  ? 'sdcSup.responses.dispute.raised'
                  : 'sdcSup.responses.dispute.resolved'
              )}
            </span>{' '}
            <Data className="text-text-tertiary normal-case">{formatDate(e.at)}</Data>
          </div>
          <div className="text-xs text-text-secondary">{e.text}</div>
        </div>
      ))}
    </div>
  );
};

export default DisputeLedger;
