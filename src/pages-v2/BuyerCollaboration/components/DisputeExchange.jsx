/** @import React from 'react' */
/** @import { DisputeEntry } from '@services/sdc' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';

// ────────────────────────────────────────────────────────────────────────────
// R1b - THE RESOLVE CAPTURE.
//
// The shape is BuyerInvoices' dispute panel, copied rather than invented: a
// SidePanel (`role="dialog" aria-modal="true"`), the record above, the authored
// text below, cancel + commit in the footer. What is NOT copied is the guard.
// The neighbour's commit is `disabled={mutation.isPending}` only, and refuses a
// blank reason by early-returning into a toast - measured on the tree, not
// assumed from the pattern. Here the commit is ALSO disabled while the answer is
// blank, on the operator ruling: the supplier cannot dispute without saying why,
// so the buyer must not resolve without saying why, and a dismissible capture on
// a required field is how a required thing becomes a suggestion.
//
// THE RAISE IS RENDERED ABOVE THE BOX, and it is not decoration: a planner
// answering a dispute they cannot see would be composing a reply to a message
// they never read. The supplier's OWN words sit beside it for the same reason -
// R1a rendered the supplier's objection to the supplier; this is the first
// surface that renders it to the BUYER, at the moment of answering it.
//
// DP2-WARN-01: `text-warning-hover` is the only warning colour legal as TEXT on
// light; the bright DEFAULT is graphical-only and `text-warning` never appears.
// DP2-BUTTON-01: the commit is SOLID action-blue - a resolution appends to an
// immutable ledger the supplier reads, which is the reserved irreversible-commit
// class. The row CTA that opens this panel is outline: it commits nothing.
// ────────────────────────────────────────────────────────────────────────────
/**
 * The dispute ledger of one response, oldest first: each entry labelled raised
 * or resolved, with its date and the words as written. Renders nothing for an
 * empty ledger. Read by `ReasonPanel` above the authored text.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{ entries: readonly DisputeEntry[] }>}
 */
const DisputeExchange = ({ entries }) => {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="sdc-resolve-exchange">
      {entries.map((e, i) => (
        <div
          // DisputeEntry has no id, and `at` repeats (the SDC clock is a fixed
          // simulated now). One response's ledger is append-only, oldest first,
          // so the index is the entry's sequence number and never shifts.
          // eslint-disable-next-line react/no-array-index-key -- append-only ledger: index is the entry's sequence number
          key={`${e.at}-${i}`}
          className={`border-l-2 py-1 pl-3 ${
            e.kind === 'raised' ? 'border-l-warning' : 'border-l-success'
          }`}
        >
          <div className="text-label mb-0.5 uppercase">
            <span className={e.kind === 'raised' ? 'text-warning-hover' : 'text-success'}>
              {t(e.kind === 'raised' ? 'sdc.resolve.raised' : 'sdc.resolve.resolved')}
            </span>{' '}
            <Data className="normal-case text-text-tertiary">{formatDate(e.at)}</Data>
          </div>
          <div className="text-xs text-text-secondary">{e.text}</div>
        </div>
      ))}
    </div>
  );
};

export default DisputeExchange;
