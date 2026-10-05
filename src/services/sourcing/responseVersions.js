// ────────────────────────────────────────────────────────────────────────────
// NR-1 BR-08 (D-6, AR-05) — the version history of an RFI or RFP response.
//
// A supplier revises a submitted response until the deadline
// (`t_rfiresponse_revise` / `t_rfpresponse_revise`). Each submit and each
// revise APPENDS a version; no version is edited or removed (RFX-R3). The
// response's own fields always hold the latest version, so every existing
// read keeps reading "the response" and gets the latest.
//
// Pure: no store, no clock. The target, the policy hooks and the read model
// call the same functions, so the content a policy judges is the content the
// target stores (RFX-R2).
// ────────────────────────────────────────────────────────────────────────────

import { stampDocuments } from '../transitions/rfxDocumentRules';
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { ResponseVersion, RfiAnswer, RfiResponse, RfpPricingAnswer, RfpResponse, RfpTermAnswer } from './types' */

/** @typedef {RfiResponse | RfpResponse} AnyResponse */

/**
 * The submitted content of a response, as a version holds it.
 * @param {AnyResponse} r
 * @returns {Omit<ResponseVersion<RfiAnswer | RfpTermAnswer>, 'number' | 'submittedAt'>}
 */
function contentOf(r) {
  const rfp = 'rfpId' in r ? r : null;
  return {
    answers: r.answers,
    ...(rfp?.questionAnswers !== undefined ? { questionAnswers: rfp.questionAnswers } : {}),
    ...(rfp?.pricing !== undefined ? { pricing: rfp.pricing } : {}),
    ...(rfp?.otherTerms !== undefined ? { otherTerms: rfp.otherTerms } : {}),
    ...(r.documents !== undefined ? { documents: r.documents } : {})
  };
}

/**
 * Every submitted version of a response, oldest first. A seeded Submitted
 * response carries no `versions` and is read as version 1 of its own fields,
 * so the seeds are never edited. A Draft that was never submitted has none.
 */
/**
 * @overload
 * @param {RfiResponse} r
 * @returns {readonly ResponseVersion<RfiAnswer>[]}
 */
/**
 * @overload
 * @param {RfpResponse} r
 * @returns {readonly ResponseVersion<RfpTermAnswer>[]}
 */
/**
 * @param {AnyResponse} r
 * @returns {readonly ResponseVersion<RfiAnswer | RfpTermAnswer>[]}
 */
export function responseVersions(r) {
  return versionsOf(r);
}

/**
 * @param {AnyResponse} r
 * @returns {readonly ResponseVersion<RfiAnswer | RfpTermAnswer>[]}
 */
function versionsOf(r) {
  if (r.versions && r.versions.length > 0) return r.versions;
  if (r.status !== 'Submitted') return [];
  return [{ number: 1, submittedAt: r.submittedAt ?? r.updatedAt, ...contentOf(r) }];
}

/**
 * The versions after `next` is submitted: the versions `prior` already holds
 * (a seed read as version 1), plus `next`'s content as the next number.
 */
/**
 * @overload
 * @param {RfiResponse} prior
 * @param {RfiResponse} next
 * @param {string} submittedAt
 * @returns {readonly ResponseVersion<RfiAnswer>[]}
 */
/**
 * @overload
 * @param {RfpResponse} prior
 * @param {RfpResponse} next
 * @param {string} submittedAt
 * @returns {readonly ResponseVersion<RfpTermAnswer>[]}
 */
/**
 * @param {AnyResponse} prior
 * @param {AnyResponse} next
 * @param {string} submittedAt
 * @returns {readonly ResponseVersion<RfiAnswer | RfpTermAnswer>[]}
 */
export function versionsAfterSubmit(prior, next, submittedAt) {
  const held = versionsOf(prior);
  return [...held, { number: held.length + 1, submittedAt, ...contentOf(next) }];
}

/**
 * The RFI response a revise payload would leave: each field the payload
 * carries replaces the stored one, as a save does; the rest is kept. Document
 * upload times and uploaders are the store's and the session's
 * (`stampDocuments`): `actor` is the SESSION's, never a payload field.
 * @param {RfiResponse} r
 * @param {Record<string, unknown>} payload
 * @param {string} now
 * @param {ActorAttribution} actor
 * @returns {RfiResponse}
 */
export function revisedRfiResponse(r, payload, now, actor) {
  return {
    ...r,
    ...(Array.isArray(payload.answers)
      ? { answers: /** @type {RfiAnswer[]} */ (payload.answers) }
      : {}),
    ...(Array.isArray(payload.documents)
      ? { documents: stampDocuments(payload.documents, r.documents ?? [], now, actor) }
      : {})
  };
}

/**
 * The RFP response a revise payload would leave; as `revisedRfiResponse`.
 * @param {RfpResponse} r
 * @param {Record<string, unknown>} payload
 * @param {string} now
 * @param {ActorAttribution} actor
 * @returns {RfpResponse}
 */
export function revisedRfpResponse(r, payload, now, actor) {
  return {
    ...r,
    ...(Array.isArray(payload.answers)
      ? { answers: /** @type {RfpTermAnswer[]} */ (payload.answers) }
      : {}),
    ...(typeof payload.otherTerms === 'string' ? { otherTerms: payload.otherTerms } : {}),
    ...(Array.isArray(payload.questionAnswers)
      ? { questionAnswers: /** @type {RfiAnswer[]} */ (payload.questionAnswers) }
      : {}),
    ...(payload.pricing && typeof payload.pricing === 'object'
      ? { pricing: /** @type {RfpPricingAnswer} */ (payload.pricing) }
      : {}),
    ...(Array.isArray(payload.documents)
      ? { documents: stampDocuments(payload.documents, r.documents ?? [], now, actor) }
      : {})
  };
}
