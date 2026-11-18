// ────────────────────────────────────────────────────────────────────────────
// Fulfilment rules · the ZWME021 SEQUENCE RULES (AIB-1 BR-03, BL-348).
//
// The four rules SAP's inbound upload applies, moved BEFORE the submit so the
// supplier corrects a bad inbound in the hub instead of in an SAP error queue:
//
//   1. within one sequence, all lines have the same PO
//   2. … the same delivery date
//   3. … the same External ID (the Surat Jalan number)
//   4. the sequence is not blank
//
// AIB-D1: ONE SEQUENCE = ONE ASN, the External ID IS the SJ number, and the
// supplier enters the sequence. So the sequence is the ASN's inbound-upload
// identity: this ASN's own lines must agree on the three values, and another
// non-cancelled ASN of the same supplier may not carry the same sequence.
//
// ⚠️ **THE ERROR NAMES BOTH VALUES** (AC-02 names both PO numbers). A message
// that says only "lines disagree" makes the supplier hunt for the difference in
// two documents; `{ value, expected }` is the pair the screen prints.
//
// ⚠️ **THE DELIVERY DATE IS THE ASN'S ETA.** The hub's ASN carries one expected
// arrival (`eta`, REQ-E07-04 BR-04) and no second delivery date, so comparing
// anything else would compare a field the supplier never entered. Recorded as a
// judgement call in the BL-348 report.
//
// PURE: no store, no clock. The form and the submit policy hook call the SAME
// function (the `asnLineRefusal` precedent, AR-11), so the two cannot drift.
// ────────────────────────────────────────────────────────────────────────────

import { isNonBlank } from './shared';

/**
 * Why one line is refused by the sequence rules: two lines disagree on the
 * value behind it. A blank sequence or External ID is a HEADER refusal
 * (`sequenceMissing` / `externalIdMissing`) — no line is individually at fault,
 * so no line is blamed for it.
 * @typedef {'externalId' | 'po' | 'deliveryDate'} AsnSequenceErrorCode
 */

/**
 * One line's error, carrying BOTH values where two differ.
 * `value`:  This line's value (blank for a missing required one).
 * `expected`: The sequence's value (the first line's, or the other ASN's that holds the sequence).
 *
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly code: AsnSequenceErrorCode;
 *   readonly value: string;
 *   readonly expected: string;
 * }} AsnSequenceLineError
 */

/**
 * The result the form and the verb both read.
 * `sequenceMissing`: the sequence is blank (rule 4).
 * `externalIdMissing`: the SJ / External ID is blank — required by REQ-E07-04 BR-04 as amended.
 * `alreadyUsedBy`: another non-cancelled ASN of this supplier carries the same sequence. One sequence = one ASN (AIB-D1), so this is a refusal on its own when every value agrees; when the values differ the line errors are what the supplier sees.
 * `lines`: every refused line, in line order. Empty ⇒ only the header checks failed.
 *
 * @typedef {{
 *   readonly ok: boolean;
 *   readonly sequenceMissing: boolean;
 *   readonly externalIdMissing: boolean;
 *   readonly alreadyUsedBy: string | null;
 *   readonly lines: readonly AsnSequenceLineError[];
 * }} AsnSequenceRead
 */

/**
 * A line as the sequence rule reads it. `poReference` / `deliveryDate` /
 * `externalId` are per-line overrides; omitted, they fall back to the ASN's
 * header values. The hub's own form never sends an override (one ASN is one PO
 * and one ETA) — they exist because the rule is about LINES, and the test that
 * proves it changes a line, not the header.
 *
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly poReference?: string;
 *   readonly deliveryDate?: string;
 *   readonly externalId?: string;
 * }} AsnSequenceLine
 */

/**
 * One non-cancelled ASN of the same supplier, as the group check reads it.
 * @typedef {{
 *   readonly asnNumber: string;
 *   readonly sequence?: string;
 *   readonly externalId?: string;
 *   readonly poReference?: string;
 *   readonly eta?: string;
 * }} AsnSequencePeer
 */

/**
 * The sequence rules over one ASN's lines (AIB-1 BR-03, AC-01 to AC-05).
 *
 * Blank sequence ⇒ `sequenceMissing` AND every line carries a `sequence` error,
 * because BR-05 shows each failed line its own error. A blank External ID is
 * the SJ requirement (REQ-E07-04 BR-04) and behaves the same way. Two lines
 * that disagree on PO, delivery date or External ID each carry an error naming
 * their own value and the first line's.
 *
 * The peer check runs over the supplier's other ASNs: a sequence is one ASN
 * (AIB-D1). A peer with the same sequence and DIFFERENT values yields the same
 * per-line errors, naming the peer's value — the "2 POs in one sequence" case
 * the slide refuses. A peer with the same sequence and the SAME values yields
 * `alreadyUsedBy`, because the supplier is trying to send one sequence twice.
 *
 * @param {{
 *   sequence?: string;
 *   externalId?: string;
 *   poReference?: string;
 *   deliveryDate?: string;
 *   lines: readonly AsnSequenceLine[];
 *   peers?: readonly AsnSequencePeer[];
 *   excludeAsn?: string;
 * }} input
 * @returns {AsnSequenceRead}
 */
export function asnSequenceRead(input) {
  const sequence = typeof input.sequence === 'string' ? input.sequence.trim() : '';
  const headerExternalId = typeof input.externalId === 'string' ? input.externalId.trim() : '';
  const headerPo = typeof input.poReference === 'string' ? input.poReference.trim() : '';
  const headerDate = typeof input.deliveryDate === 'string' ? input.deliveryDate.trim() : '';
  const sequenceMissing = !isNonBlank(sequence);
  const externalIdMissing = !isNonBlank(headerExternalId);
  const lines = input.lines;
  /** @type {AsnSequenceLineError[]} */
  const errors = [];
  /**
   * Every value one line carries, header defaults applied.
   * @param {AsnSequenceLine} line
   */
  const valuesOf = (line) => ({
    po: (line.poReference ?? headerPo).trim(),
    deliveryDate: (line.deliveryDate ?? headerDate).trim(),
    externalId: (line.externalId ?? headerExternalId).trim()
  });
  // The first line is the sequence's reference — the value the others must
  // match, and the one whose number an error names as `expected`.
  const first = lines.length > 0 ? valuesOf(lines[0]) : null;
  const peers = (input.peers ?? []).filter(
    (p) =>
      isNonBlank(p.sequence) &&
      String(p.sequence).trim() === sequence &&
      p.asnNumber !== input.excludeAsn
  );
  /** A peer that agrees with the header on all three values, if any. */
  const matchingPeer = peers.find(
    (p) =>
      (p.poReference ?? '').trim() === headerPo &&
      (p.eta ?? '').trim() === headerDate &&
      (p.externalId ?? '').trim() === headerExternalId
  );
  const alreadyUsedBy = !sequenceMissing && matchingPeer ? matchingPeer.asnNumber : null;
  for (const line of lines) {
    const v = valuesOf(line);
    // A blank sequence or External ID is the HEADER's refusal, reported once on
    // the field (AC-05); blaming every line for it would be five copies of one
    // fact. A mismatch is per line, naming both values (AC-02 to AC-04).
    if (sequenceMissing || externalIdMissing) continue;
    let refused = false;
    if (first) {
      if (v.po !== first.po) {
        errors.push({
          materialCode: line.materialCode,
          code: 'po',
          value: v.po,
          expected: first.po
        });
        refused = true;
      }
      if (v.deliveryDate !== first.deliveryDate) {
        errors.push({
          materialCode: line.materialCode,
          code: 'deliveryDate',
          value: v.deliveryDate,
          expected: first.deliveryDate
        });
        refused = true;
      }
      if (v.externalId !== first.externalId) {
        errors.push({
          materialCode: line.materialCode,
          code: 'externalId',
          value: v.externalId,
          expected: first.externalId
        });
        refused = true;
      }
    }
    // The same three comparisons against every ASN already holding this
    // sequence — the refusals the slide lists as "2 POs / 2 dates / 2 External
    // IDs in one sequence".
    for (const peer of peers) {
      const pv = {
        po: (peer.poReference ?? '').trim(),
        deliveryDate: (peer.eta ?? '').trim(),
        externalId: (peer.externalId ?? '').trim()
      };
      if (!refused && pv.po !== headerPo) {
        errors.push({
          materialCode: line.materialCode,
          code: 'po',
          value: headerPo,
          expected: pv.po
        });
        refused = true;
      }
      if (!refused && pv.deliveryDate !== headerDate) {
        errors.push({
          materialCode: line.materialCode,
          code: 'deliveryDate',
          value: headerDate,
          expected: pv.deliveryDate
        });
        refused = true;
      }
      if (!refused && pv.externalId !== headerExternalId) {
        errors.push({
          materialCode: line.materialCode,
          code: 'externalId',
          value: headerExternalId,
          expected: pv.externalId
        });
        refused = true;
      }
      if (refused) break;
    }
  }
  return {
    ok:
      !sequenceMissing &&
      !externalIdMissing &&
      alreadyUsedBy === null &&
      errors.length === 0 &&
      lines.length > 0,
    sequenceMissing,
    externalIdMissing,
    alreadyUsedBy,
    lines: errors
  };
}

/**
 * The error for one material, or `null` — the shape a line editor renders.
 * @param {AsnSequenceRead} read
 * @param {string} materialCode
 * @returns {AsnSequenceLineError | null}
 */
export const sequenceErrorFor = (read, materialCode) =>
  read.lines.find((e) => e.materialCode === materialCode) ?? null;

/**
 * One sentence for a failure, naming both values where two differ. The screen's
 * copy lives in i18n (`fc.asn.sequence.*`); this is the VERB's reason detail, so
 * a refusal arriving through `onSuccess` still names the pair.
 * @param {AsnSequenceRead} read
 * @returns {string}
 */
export function asnSequenceRefusalText(read) {
  if (read.sequenceMissing) return 'SEQUENCE_RULES: the sequence is required';
  if (read.externalIdMissing) return 'SEQUENCE_RULES: the Surat Jalan (External ID) is required';
  if (read.alreadyUsedBy)
    return `SEQUENCE_RULES: one sequence is one ASN — ASN ${read.alreadyUsedBy} already uses it`;
  const first = read.lines[0];
  if (!first) return 'SEQUENCE_RULES: refused';
  const field =
    first.code === 'po' ? 'PO' : first.code === 'deliveryDate' ? 'delivery date' : 'External ID';
  return `SEQUENCE_RULES: ${field} '${first.value}' and '${first.expected}' differ on line ${first.materialCode}`;
}
