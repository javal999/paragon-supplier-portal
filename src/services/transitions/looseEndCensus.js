// ─────────────────────────────────────────────────────────────────────────────
// PF-0 · THE LOOSE-END CENSUS — every hole in the shipped flow catalog, named.
//
// ⚠️ **THIS FILE IS AN EXEMPTION LIST, NOT A TO-DO LIST.** Every row is a loose
// end that SHIPS TODAY. None is fixed by this batch (the fence: D-1 is the
// operator's, per state). What the census buys is that each one is DELIBERATE
// and REPORTED, instead of merely present.
//
// ── ⚠️ THE CENSUS IS BILATERAL, AND THAT IS THE LOAD-BEARING HALF ───────────
//   `flowGraph.test.js` fails in BOTH directions:
//
//     · A DERIVED LOOSE END WITH NO ROW HERE → RED. A new hole cannot ship
//       silently; somebody has to write down what it is and why.
//     · A ROW HERE THAT IS NO LONGER A LOOSE END → RED. Fixing an edge FORCES
//       the deletion of its exemption, **so the census can only shrink
//       truthfully.**
//
//   The second direction is the one nothing normally checks, and it is the one
//   that rots: an exemption list that survives its own subject is a document
//   asserting a defect the tree no longer has (`C9-STALE-BY-FIX-01`, the same
//   class one layer down). Here it cannot survive, because the check derives the
//   truth first and compares second.
//
// ── THE PRECEDENTS THIS OBEYS ───────────────────────────────────────────────
//   `ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01` — the authored list is a STRICT
//   SUBSET of the derived truth, and the derivation is authority. This file
//   never enumerates flows, states or transitions on its own account; it only
//   annotates keys that `analyzeAllFlows` produced.
//   `CENSUS-MUST-DERIVE-01` — a population is derived, never shape-matched.
//
// ── ⚠️ THE KEY IS `entity#kind#subject` AND CARRIES NO PROSE ────────────────
//   `note` is for a reader and is never compared. A census keyed on its own
//   wording would go red every time somebody improved a sentence, which trains
//   people to regenerate the file instead of reading it — and a census that gets
//   regenerated routinely is not a census.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { LooseEndKind } from './flowGraph' */

/**
 * WHY a loose end is exempt. A CLOSED vocabulary, and the closure is the point:
 * four different situations that a single "known issue" would flatten into one.
 *
 * ⚠️ **NO CATCH-ALL MEMBER.** There is no `OTHER` and no `WONT_FIX` — one such
 * member turns a closed vocabulary into free text wearing an enum's clothes
 * (`OVERRIDE_REASONS`, same argument). A hole that fits none of these four is a
 * hole nobody has understood yet, and it should be red until somebody does.
 */
/**
 *  The resolving edge is INTENDED and not yet authored. A real gap, booked.
 *  `t_invoice_resolve` is the shape these are missing.
 *  The states/verbs exist in the catalog and NOTHING WIRES THE PATH to them
 *  (FORK-2 hybrid: author all flows, wire per Stage-2 surface).
 *  A sub-flow that is documented substrate — rolled up by its parent and never
 *  instantiated on its own, so it has no creation verb and no resting edges.
 *  The `initial` state IS how instances come into existence, with no creation
 *  verb by design: the entity exists because its subject does.
 *
 * @typedef {| 'deferred-edge'
 *   | 'authored-unwired'
 *   | 'substrate-only'
 *   | 'born-state'} LooseEndReason
 */

/** One exempted loose end. `entity`/`kind`/`subject` must match a DERIVED key. */
/**
 * `note`:  For a human. NEVER compared — see the header.
 *
 * @typedef {{
 *   readonly entity: string;
 *   readonly kind: LooseEndKind;
 *   readonly subject: string;
 *   readonly reason: LooseEndReason;
 *   readonly note: string;
 * }} CensusEntry
 */

/**
 * THE CENSUS. **NINE rows — down from EIGHTEEN at PF-0**, and the shrink is the
 * point: PF-1a repaired seven, PF-1b two more, and the bilateral gate FORCED
 * every exemption out. A row cannot outlive its subject here, so this list can
 * only get shorter truthfully. All nine are derived first and annotated second.
 *
 * **Deleted at PF-1a (D-1, ruled per state):** rfq `Draft` × 2 + `t_rfq_publish`
 * (creation now births at Draft, so publish fires and the declared initial is
 * true) · advanceShipNotice `Discrepancy` · requirementResponse `Disputed` ·
 * purchaseRequisition `Rejected` (resolution edges on the `t_invoice_resolve`
 * pattern) · goodsReceipt `Quality Hold` (the resume edge behind an affordance
 * that already shipped).
 *
 * **Deleted at PF-1b (D-1 extended to the supplier lane):** requirementResponse
 * `Draft` + `t_requirementresponse_promote` — creation births at `Draft` and
 * promote is the submission.
 *
 * ⚠️ **THE SETTLEMENT PAIRS ARE NOT IN IT, AND THEIR ABSENCE IS THE D-2 RULING
 * WORKING.** `Posted to SAP` and `Payment Released` were unreachable, and
 * `Posting to SAP` / `Releasing Payment` were exit-less, in the DECLARED data —
 * truthfully, because `settle()`'s finalize advanced them from inside the
 * adapter. They are absent here because the declaration was made honest
 * (`settlesTo`), not because the reader was told to look away.
 * @type {readonly CensusEntry[]}
 */
export const LOOSE_END_CENSUS = Object.freeze([
  // ── goodsReceiptLine ───────────────────────────────────────────────────────
  {
    entity: 'goodsReceiptLine',
    kind: 'initial-integrity',
    subject: 'Pending',
    reason: 'substrate-only',
    note:
      '⚠️ THE SCHEMA CANNOT BRING A LINE INTO EXISTENCE — zero creation verbs, zero inbound edges to ' +
      '`Pending`, and no CommandTarget. The line sub-flow is rolled up by the GR header (`grRollup`) ' +
      'and never instantiated on its own; it is documented substrate, and the analyzer seeds its ' +
      'reachability from `initial` so this is reported ONCE instead of smeared over six states.'
  },

  // ── invoiceMatch ───────────────────────────────────────────────────────────
  {
    entity: 'invoiceMatch',
    kind: 'initial-integrity',
    subject: 'Pending',
    reason: 'substrate-only',
    note:
      'No creation verb: the match sub-flow is rolled up by the invoice header (`invoiceRollup`) and ' +
      'never instantiated. Documented substrate, same as the GR line.'
  },
  {
    entity: 'invoiceMatch',
    kind: 'exit-less-state',
    subject: 'Qty Mismatch',
    reason: 'substrate-only',
    note:
      'A variance verdict with NO RE-MATCH EDGE — once the rollup lands here the sub-flow cannot ' +
      'progress. Substrate rather than deferred-edge: the flow is never instantiated, so the missing ' +
      'edge has never been reachable by anything. It becomes a deferred-edge the day it is.'
  },
  {
    entity: 'invoiceMatch',
    kind: 'exit-less-state',
    subject: 'Price Variance',
    reason: 'substrate-only',
    note: 'The twin of `Qty Mismatch`, and the same reasoning applies unchanged.'
  },

  // ── rfq — ⚠️ NO ROWS. All three are GONE (PF-1a · D-1). ────────────────────
  // The three that stood here were one cause: `initial: 'Draft'` contradicting a
  // creation verb that births at `Open`. Creation now births at `Draft`, so the
  // initial is true, `Draft` is reachable, and `t_rfq_publish` fires. Kept as a
  // comment and not silently deleted, because "this flow used to be the worst
  // one in the census" is the fact a reader of a shrinking list most wants.

  // ── purchaseRequisition ────────────────────────────────────────────────────
  // ⚠️ `t_pr_source`'S ROW IS GONE, AND ITS ABSENCE IS THE RECORD. It read
  // "the sentence has no subject: nothing can fire it". At C.1 `t_rfq_create`
  // became its subject, so the row stopped being true and the bilateral gate
  // ("every CENSUS entry is still a loose end") forced it out in the SAME batch
  // that authored the link — which is the census working, not a chore. Kept as
  // a comment rather than silently deleted, because a shrinking list is only
  // legible if you can see what left it.
  {
    entity: 'purchaseRequisition',
    kind: 'unauthored-cascade',
    subject: 't_pr_convert',
    reason: 'authored-unwired',
    note:
      'The PR→PO conversion cascade: declares `trigger: cascade` and no source in `cascades.js` names ' +
      'it, so nothing can fire it. It is now the LAST of the pair — `t_pr_source` left this census at ' +
      'C.1 — and it is unauthored BY RULING, not by omission: a PO is raised in S/4 and arrives here ' +
      'as a fact, so minting one would be CTR-FABRICATION-01 a layer down. Its source arrives with F2.'
  },

  // ── compliance ─────────────────────────────────────────────────────────────
  {
    entity: 'compliance',
    kind: 'initial-integrity',
    subject: 'Missing',
    reason: 'born-state',
    note:
      'NO creation verb BY DESIGN, and the registration comment says so: a required compliance cell ' +
      'exists because the requirement matrix says a supplier × scheme needs a certificate, so ' +
      '`Missing` is the natural born-state. The one row here that is an intended shape rather than a ' +
      'gap — which is exactly why the reason vocabulary distinguishes it from `substrate-only`.'
  },

  // ── requirementResponse — ⚠️ NO ROWS. Both are GONE (PF-1b · D-1). ─────────
  // `Draft` (unreachable) and `t_requirementresponse_promote` (dead) were the
  // RFQ contradiction in a second flow, and they were the two rows PF-1a
  // deliberately did NOT sweep along: D-1 rested on a stated fact about SOURCING
  // practice, and whether a supplier drafts before submitting was a different
  // question. The operator answered it — SUPPLIERS DRAFT TOO — so creation
  // births at `Draft` and promote is the submission. Kept as a comment because
  // "this flow was ruled separately, and on purpose" is the fact a reader of a
  // shrinking list would otherwise have to reconstruct.

  // ── enforcement ────────────────────────────────────────────────────────────
  {
    entity: 'enforcement',
    kind: 'initial-integrity',
    subject: 'Governed',
    reason: 'substrate-only',
    note:
      'A DEGENERATE SINGLE-STATE LEDGER MACHINE with no creation verb: the entity IS the governed ' +
      'check, and the governed checks are a frozen closed vocabulary in `lib/enforcement.js`, not ' +
      'rows anybody creates. The recording verb is statePreserving, so it is neither an entry nor an ' +
      'exit, and the state is correctly declared terminal. ' +
      "⚠️ THIS NOTE DELIBERATELY DOES NOT SPELL THE VOCABULARY'S IDENTIFIER: the enforcement " +
      'consumer census (`lib/enforcement.test.js`) matches TEXT, so writing the name here would have ' +
      'enrolled a document that imports nothing as a CONSUMER of that module. `DESCRIBE-DONT-RENDER-01` ' +
      '— name the mechanism, never render it.'
  },

  // ── role ───────────────────────────────────────────────────────
  {
    entity: 'role',
    kind: 'initial-integrity',
    subject: 'Defined',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE ENFORCEMENT MACHINE, and for the same ' +
      'reason: the entity IS the system bundle being copied, and the system bundles are a frozen ' +
      'closed vocabulary compiled into the tree — not rows anybody creates. The grant verb is ' +
      'statePreserving, so it is neither an entry nor an exit, and the state is correctly declared ' +
      'terminal. ' +
      '⚠️ WHAT IS CREATED BY THE VERB IS NOT AN INSTANCE OF THIS MACHINE. A grant appends a ' +
      'derived bundle to a ledger; the thing commanded stays exactly as it was. Modelling the child ' +
      'as a born entity would have made the parent its creator, which is the one relationship the ' +
      'copy deliberately does not have — a child follows its parent, it is not owned by it.'
  },

  // ── threePl (BL-51) ────────────────────────────────────────────────────────
  {
    entity: 'threePl',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE ENFORCEMENT AND ROLE MACHINES: the entity ' +
      "IS a logistics provider on the administrator's list, addressed by a well-formed id, and setting " +
      'an id the list does not yet hold adds it — so there is no separate creation verb to be an entry. ' +
      'The recording verb is statePreserving, so it is neither an entry nor an exit, and the state is ' +
      'correctly declared terminal. The tracking links built from the list are derived at read and are ' +
      'never states of any machine.'
  },
  // ── mrpController (Material C4) ────────────────────────────────────────────
  {
    entity: 'mrpController',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE 3PL LIST: the entity IS an SAP MRP ' +
      'controller code, addressed by the code, and setting a code the list does not hold yet adds it — ' +
      'there is no separate creation verb to be an entry. The recording verb is statePreserving, so it is ' +
      'neither an entry nor an exit, and the state is correctly declared terminal. What a material shows ' +
      'is derived at read from the latest change per code and is never a state.'
  },
  // ── supplierOverlay (Material A1) ──────────────────────────────────────────
  {
    entity: 'supplierOverlay',
    kind: 'initial-integrity',
    subject: 'Defined',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE 3PL LIST: the entity IS a supplier on the ' +
      'supplier master, addressed by its id, and the master (the SAP stand-in) is where suppliers come ' +
      'from — the hub never creates one, so there is no creation verb to be an entry. The recording verb ' +
      'is statePreserving, so it is neither an entry nor an exit, and the state is correctly declared ' +
      'terminal. The mode in force is derived at read from the latest overlay row and is never a state.'
  },
  // ── qualificationRule (Material G1) ────────────────────────────────────────
  {
    entity: 'qualificationRule',
    kind: 'initial-integrity',
    subject: 'Defined',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE 3PL LIST: the entity IS one qualification ' +
      'level (approved or preferred), and both lists exist from the start as placeholder lists — there is ' +
      'no creation verb to be an entry. The recording verb is statePreserving, so it is neither an entry ' +
      'nor an exit, and the state is correctly declared terminal. The list in force is derived at read ' +
      "from the latest change and is never a state; a vendor's level is computed and is never a state either."
  },
  // ── sourcingType (Material G2) ─────────────────────────────────────────────
  {
    entity: 'sourcingType',
    kind: 'initial-integrity',
    subject: 'Defined',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE QUALIFICATION LISTS: the entity IS one key of ' +
      'the sourcing type map (a category or a purchasing group), and every key exists from the start as ' +
      'Direct — there is no creation verb to be an entry. The recording verb is statePreserving, so it is ' +
      'neither an entry nor an exit. The type in force is derived at read from the latest change; an ' +
      'event stores its own type at publish.'
  },
  // ── workingCalendar (BL-50) ────────────────────────────────────────────────
  {
    entity: 'workingCalendar',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE ENFORCEMENT AND ROLE MACHINES: the entity ' +
      'IS a calendar date, and the dates are the year the SAP factory calendar load covers — not rows ' +
      'anybody creates. The ruling verb is statePreserving, so it is neither an entry nor an exit, and ' +
      'the state is correctly declared terminal. The deadlines a ruling moves are derived at read from ' +
      'the calendar and are never states of any machine.'
  },
  // ── reasonCode (BL-32) ─────────────────────────────────────────────────────
  {
    entity: 'reasonCode',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE 3PL LIST: the entity IS one code on one ' +
      'reason list, addressed by <list>:<code>, and setting a code the list does not yet hold adds it — ' +
      'so there is no separate creation verb to be an entry. There is no delete: a retired code stays ' +
      'so the records that carry it keep their label. The verb is statePreserving, so the state is ' +
      'correctly declared terminal.'
  },
  // ── maxStock (REQ-E06-04) ──────────────────────────────────────────────────
  {
    entity: 'maxStock',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE 3PL LIST AND THE REASON LISTS: the entity ' +
      'IS one supplier × material the hub assigns, addressed by <supplierId>|<materialCode>, and setting ' +
      'a pair with no value yet adds one — so there is no separate creation verb to be an entry. Clearing ' +
      'is a change with no quantity, never a delete. The verb is statePreserving, so the state is ' +
      'correctly declared terminal.'
  },
  // ── warehouseDecision (FUX-D3) ─────────────────────────────────────────────
  {
    entity: 'warehouseDecision',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE MAXIMUM STOCK: the entity IS one warehouse ' +
      'stream × week, addressed by <stream>|<weekStart>, and recording the first decision of a week adds ' +
      'it — so there is no separate creation verb to be an entry. A later decision is a new record; ' +
      'nothing is edited or deleted. The verb is statePreserving, so the state is correctly declared terminal.'
  },
  // ── osipLevel (DRC-D11, BL-196) ────────────────────────────────────────────
  {
    entity: 'osipLevel',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE MAXIMUM STOCK: the entity IS one material ' +
      'the master resolves, addressed by its code, and setting its first level adds it — so there is no ' +
      'separate creation verb to be an entry. A change is a new row; nothing is edited or deleted. The ' +
      'verb is statePreserving, so the state is correctly declared terminal.'
  },
  // ── osipParam (team answers 2026-10-28) ──────────────────────────────────
  {
    entity: 'osipParam',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE OSIP LEVEL: the entity IS one value key ' +
      '(a material, a supplier or a supplier × material the masters resolve), and setting its first value ' +
      'adds it — so there is no separate creation verb to be an entry. A change is a new row; nothing is ' +
      'edited or deleted. The verb is statePreserving, so the state is correctly declared terminal.'
  },
  // ── ltpInput (BL-267) ─────────────────────────────────────────────────────
  {
    entity: 'ltpInput',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE OSIP VALUE: the entity IS one key (an upload ' +
      'of one series of a material, or the choice of a material), and its first row adds it — so there is ' +
      'no separate creation verb to be an entry. A change is a new row; nothing is edited or deleted. The ' +
      'verb is statePreserving, so the state is correctly declared terminal.'
  },
  // ── promotion (BL-235) ────────────────────────────────────────────────────
  {
    entity: 'promotion',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE LTP INPUT: the entity IS one key (a SKU and a ' +
      'week), and its first row adds it — so there is no separate creation verb to be an entry. A change or ' +
      'a withdrawal is a new row; nothing is edited or deleted. The verb is statePreserving, so the state ' +
      'is correctly declared terminal.'
  },
  // ── hubSetting (BL-32)─────────────────────────────────────────────────────
  {
    entity: 'hubSetting',
    kind: 'initial-integrity',
    subject: 'Maintained',
    reason: 'substrate-only',
    note:
      'THE SAME DEGENERATE SINGLE-STATE LEDGER SHAPE AS THE CALENDAR AND 3PL MACHINES: the entity IS a ' +
      'rule value, addressed by a key the registry defines (or a stale-period override of an assigned ' +
      'supplier and material) — not rows anybody creates. The recording verb is statePreserving, so it ' +
      'is neither an entry nor an exit, and the state is correctly declared terminal. The verdicts a ' +
      'value decides are derived at read by the rules that read it and are never states of any machine.'
  },
  // ── stockAccess (REQ-E08-03) ───────────────────────────────────────────────
  {
    entity: 'stockAccess',
    kind: 'initial-integrity',
    subject: 'NoAccess',
    reason: 'born-state',
    note:
      'NO creation verb BY DESIGN: the entity IS a supplier in the inventory view, and every such ' +
      'supplier starts without access to PTI stock. `NoAccess` is the natural born-state; the planner ' +
      'grants from it and removes back to it, so there is nothing to create.'
  },

  // ── inventoryAlert (REQ-E08-05) ────────────────────────────────────────────
  {
    entity: 'inventoryAlert',
    kind: 'initial-integrity',
    subject: 'Open',
    reason: 'born-state',
    note:
      'NO creation verb BY DESIGN: an alert exists because its condition is derived from the ' +
      'inventory figures and capacity at read time, so `Open` is its born-state. Only the planner ' +
      'closure is recorded; a recurrence after the condition cleared is a fresh open alert.'
  },

  // ── callOffChase (AIB-3, BL-351) ───────────────────────────────────────────
  {
    entity: 'callOffChase',
    kind: 'initial-integrity',
    subject: 'Open',
    reason: 'born-state',
    note:
      'NO creation verb BY DESIGN: a chase exists because the derivation says a sent call-off has no ' +
      'covering ASN and the next working day has come, so `Open` is its born-state. Only the ' +
      'planner’s closure is recorded; the chase fires once and a closed one never re-opens.'
  }
]);
