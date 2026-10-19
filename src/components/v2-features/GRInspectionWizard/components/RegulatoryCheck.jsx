/** @import * as React from 'react' */
import { labelFor, radioCls } from './fieldParts';

// ── CP-3 · `REQUIRED-OPENS-PRE-ANSWERED-01` — ONE control, BOTH regulatory
// checks ─────────────────────────────────────────────────────────────────────
// The halal check and the BPOM check were two hand-rolled radio pairs with two
// hand-rolled seeds, and that is precisely how one of them ended up demanding an
// answer while its neighbour supplied one. They now render through a SINGLE
// component, so "unanswered looks like this" is one fact in one place and a
// future check cannot quietly re-acquire a default.
//
// ⚠️ **THE UNANSWERED MARKER IS NOT AN ERROR MESSAGE, and its role says so.**
// `role="status"` (polite), not `role="alert"`: nobody has done anything wrong
// on open — a required question is simply outstanding. The BPOM *refusal* below
// keeps `role="alert"`, because that one IS a fault in the data. Two different
// facts, two different announcements.
//
// The blocking is NOT here. `qualityValid` blocks, as it already did; this
// component only makes the blocked state legible instead of a silently blank
// pair of radios.
/**
 * @typedef {object} RegulatoryCheckProps
 * @property {string} name -  Radio group name — unique per line (`halal-3`, `bpom-3`).
 * @property {string} label
 * @property {'Pass' | 'Fail'} [value] -  The recorded answer, or `undefined` for the honest absence of one.
 * @property {(v: 'Pass' | 'Fail') => void} onChange
 * @property {(token: string) => string} el -  Display resolver for the Pass/Fail tokens — the STORED value stays EN.
 * @property {string} unansweredText
 * @property {string} testId
 */

/**
 * A required Pass/Fail regulatory check (halal seal, BPOM lot) with an
 * unanswered marker while no answer is recorded.
 * @type {React.FC<RegulatoryCheckProps>}
 */
const RegulatoryCheck = ({ name, label, value, onChange, el, unansweredText, testId }) => (
  <div>
    {labelFor(label)}
    <div className="flex gap-4">
      {
        /** @type {const} */ (['Pass', 'Fail']).map((v) => (
          <label key={v} className={radioCls}>
            <input
              type="radio"
              name={name}
              value={v}
              // A line renders up to four Pass/Fail pairs, so an accessible name of
              // just "Pass" is ambiguous four times over — to a screen reader and
              // to a spec alike. Qualified by the check it belongs to; the visible
              // word is still contained in it (WCAG 2.5.3).
              aria-label={`${label} — ${el(v)}`}
              // REQUIRED, and machine-readable as such. The row only renders when
              // the check applies, so `aria-required` is never a lie: a check that
              // does not apply has no control to be required.
              aria-required
              checked={value === v}
              onChange={() => onChange(v)}
            />
            {el(v)}
          </label>
        ))
      }
    </div>
    {value === undefined && (
      <div
        data-testid={testId}
        role="status"
        className="mt-1 text-[length:var(--fs-label-3)] text-warning-hover"
      >
        {unansweredText}
      </div>
    )}
  </div>
);

export default RegulatoryCheck;
