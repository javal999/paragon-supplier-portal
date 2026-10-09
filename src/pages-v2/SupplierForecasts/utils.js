// ────────────────────────────────────────────────────────────────────────────
// SupplierForecasts — pure helpers (no React). Material lookups through the
// one master, the "latest own response" echo, and the R1a next-actor key.
// ────────────────────────────────────────────────────────────────────────────

import { nextActorFrom } from '@services/transitions';
/** @import { Uom, ForecastLine, ForecastPublication, RequirementResponse } from '@services/sdc' */
// CP-2 · B1 — the ONE master lookup; this page no longer indexes the master.
import { labelOf, uomOf } from '@services/sdc';

// CP-2 · B1 — the ASYMMETRY is the point. `materialLabel` echoing the raw code
// on a miss was ALREADY right: the reader sees the token the data carried.
// `materialUom` defaulting to 'KG' was its defective sibling — a unit is not a
// label. A PCS material shown as KG is a fabricated claim with arithmetic
// consequences, and nothing on the surface said a unit had been invented. It now
// returns null, and every render site's existing `|| '—'` becomes honest absence.
/**
 * @param {string} code
 * @returns {string}
 */
export const materialLabel = (code) => labelOf(code);
/**
 * @param {string} code
 * @returns {Uom | null}
 */
export const materialUom = (code) => {
  const unit = uomOf(code);
  return unit.ok ? unit.uom : null;
};

// CP-0 · W1 · PR-2d — `numberFromField` is GONE. It was the blanket coercion
// `Number(v.replace(/,/g,''))`, which read "2.400" as 2.4 and "2,400" as 2400 —
// one plausible reading of two, picked silently. 2a took the declaration path
// off it, 2c the confirm path, and this batch takes the last consumer (the
// shipment-qty gate). Every typed quantity on this page now goes through
// `normalizeQty`, and nothing re-derives its own coercion.

/** The latest own response answering this exact published line (this
 * @param {readonly RequirementResponse[]} responses
 * @param {ForecastPublication} publication
 * @param {ForecastLine} line
 * @returns {RequirementResponse | undefined}
 *  publication), for the inline "your latest response" echo. */
export const latestResponseFor = (responses, publication, line) =>
  responses
    .filter(
      (r) =>
        r.publicationId === publication.publicationId &&
        r.materialCode === line.materialCode &&
        r.periodBucket === line.periodBucket
    )
    .reduce(
      (best, r) => (!best || r.submissionVersion > best.submissionVersion ? r : best),
      /** @type {RequirementResponse | undefined} */ (undefined)
    );

/**
 * R1a — the one line that names the actor. `ended` and `stranded` are kept
 * apart here exactly as `nextActorFrom` keeps them apart: a state the surface
 * cannot leave must never render as "Complete".
 * @param {string} state
 * @returns {string | null}
 */
export const nextActorKey = (state) => {
  const next = nextActorFrom('requirementResponse', state);
  if (next.kind === 'ended') return 'sdcSup.responses.actor.ended';
  if (next.kind === 'stranded') return null;
  // The supplier's own turn wins the label when both personas can act — this is
  // the supplier's page, and "your turn" is the actionable half.
  return next.personas.includes('supplier')
    ? 'sdcSup.responses.actor.supplier'
    : 'sdcSup.responses.actor.buyer';
};
