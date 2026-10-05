// ─────────────────────────────────────────────────────────────────────────────
// channel — the Communication Hub module (DEC-COMMS-PRIMARY).
//
// C1a — the SHARED CHANNEL VOCABULARY. The small typed core BOTH the inbound
// reply parser (C1) and the outbound request model (C3) consume, so neither mints
// its own channel enum / message shape and C4 needs no unification rewrite.
//
// ── MODULE BOUNDARY (ratified, acyclic) ──────────────────────────────────────
//   `channel` imports `sdc` (+ later `chase`), NEVER the reverse. There is no
//   `sdc → channel` and no `chase → channel` edge. Provenance points INTO sdc's
//   stable ids FROM here (see `makeProvenanceRef`) — sdc types stay untouched.
//
// See docs/Communication_Hub_Design_Skeleton_v1.md.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { SubmissionSession } from '../sdc' */

/** The three transport channels DEC-COMMS-PRIMARY spans. NB: the transport itself
 *  does not exist yet (skeleton §0) — this is the vocabulary a message/record is
 *  tagged with, not a live connection. */
/** @typedef {'whatsapp' | 'email' | 'wechat'} Channel */

/**
 * One inbound channel message — the raw record a reply arrives as. `supplierId`
 * is the APP-RESOLVED conversation binding (who this thread belongs to), the sole
 * legitimate source of the later `GridContext.supplierId`. It is NEVER derived
 * from the message text: the reply PARSER (C1) reads `rawText` only and cannot
 * emit a supplierId (un-falsifiability by construction — skeleton §2c).
 */
/**
 * `supplierId`:  The conversation binding — app-resolved, NOT parsed from `rawText`.
 * `receivedAt`:  ISO timestamp the message was received (injected — no ambient clock).
 * `rawText`:  The verbatim reply text the parser consumes.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly channel: Channel;
 *   readonly supplierId: string;
 *   readonly receivedAt: string;
 *   readonly rawText: string;
 * }} ChannelMessage
 */

/**
 * The correlation ref linking a channel message to the governed SDC dispatch it
 * produced (recorded on the channel side at confirm-dispatch in C2). It POINTS
 * INTO sdc's stable ids — `sessionId` and `causationAnchor` are the
 * `SubmissionSession`'s own fields — so provenance lives in the correlation layer,
 * never on a spoofable payload key and never coupling the source-agnostic adapter
 * to one source (skeleton §2c / C1 §5).
 */
/**
 * `channelMessageId`:  → `ChannelMessage.id`.
 * `sessionId`:  → `SubmissionSession.sessionId` (sdc).
 * `causationAnchor`:  → `SubmissionSession.auditCorrelationId` (sdc), or null before any attempt.
 *
 * @typedef {{
 *   readonly channelMessageId: string;
 *   readonly sessionId: string;
 *   readonly causationAnchor: string | null;
 * }} ChannelProvenanceRef
 */

/**
 * Build the provenance ref from a channel message id + the SDC submission session
 * envelope the confirmed dispatch was recorded on. `auditCorrelationId` is the
 * empty string before any attempt (session.js) — normalised to null here so the
 * "no dispatch yet" case is an honest absent value, not a blank string.
 * @param {string} channelMessageId
 * @param {Pick<SubmissionSession, 'sessionId' | 'auditCorrelationId'>} session
 * @returns {ChannelProvenanceRef}
 */
export function makeProvenanceRef(channelMessageId, session) {
  return {
    channelMessageId,
    sessionId: session.sessionId,
    causationAnchor: session.auditCorrelationId || null
  };
}
