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
import type { ActorAttribution } from '../../lib/enforcement';
import type {
  ResponseVersion,
  RfiAnswer,
  RfiResponse,
  RfpPricingAnswer,
  RfpResponse,
  RfpTermAnswer,
} from './types';

type AnyResponse = RfiResponse | RfpResponse;

/** The submitted content of a response, as a version holds it. */
function contentOf(r: AnyResponse): Omit<ResponseVersion<RfiAnswer | RfpTermAnswer>, 'number' | 'submittedAt'> {
  const rfp = 'rfpId' in r ? r : null;
  return {
    answers: r.answers,
    ...(rfp?.questionAnswers !== undefined ? { questionAnswers: rfp.questionAnswers } : {}),
    ...(rfp?.pricing !== undefined ? { pricing: rfp.pricing } : {}),
    ...(rfp?.otherTerms !== undefined ? { otherTerms: rfp.otherTerms } : {}),
    ...(r.documents !== undefined ? { documents: r.documents } : {}),
  };
}

/**
 * Every submitted version of a response, oldest first. A seeded Submitted
 * response carries no `versions` and is read as version 1 of its own fields,
 * so the seeds are never edited. A Draft that was never submitted has none.
 */
export function responseVersions(r: RfiResponse): readonly ResponseVersion<RfiAnswer>[];
export function responseVersions(r: RfpResponse): readonly ResponseVersion<RfpTermAnswer>[];
export function responseVersions(r: AnyResponse): readonly ResponseVersion<RfiAnswer | RfpTermAnswer>[] {
  return versionsOf(r);
}

function versionsOf(r: AnyResponse): readonly ResponseVersion<RfiAnswer | RfpTermAnswer>[] {
  if (r.versions && r.versions.length > 0) return r.versions;
  if (r.status !== 'Submitted') return [];
  return [{ number: 1, submittedAt: r.submittedAt ?? r.updatedAt, ...contentOf(r) }];
}

/**
 * The versions after `next` is submitted: the versions `prior` already holds
 * (a seed read as version 1), plus `next`'s content as the next number.
 */
export function versionsAfterSubmit(prior: RfiResponse, next: RfiResponse, submittedAt: string): readonly ResponseVersion<RfiAnswer>[];
export function versionsAfterSubmit(prior: RfpResponse, next: RfpResponse, submittedAt: string): readonly ResponseVersion<RfpTermAnswer>[];
export function versionsAfterSubmit(
  prior: AnyResponse,
  next: AnyResponse,
  submittedAt: string,
): readonly ResponseVersion<RfiAnswer | RfpTermAnswer>[] {
  const held = versionsOf(prior);
  return [...held, { number: held.length + 1, submittedAt, ...contentOf(next) }];
}

/**
 * The RFI response a revise payload would leave: each field the payload
 * carries replaces the stored one, as a save does; the rest is kept. Document
 * upload times and uploaders are the store's and the session's
 * (`stampDocuments`): `actor` is the SESSION's, never a payload field.
 */
export function revisedRfiResponse(
  r: RfiResponse,
  payload: Record<string, unknown>,
  now: string,
  actor: ActorAttribution,
): RfiResponse {
  return {
    ...r,
    ...(Array.isArray(payload.answers) ? { answers: payload.answers as RfiAnswer[] } : {}),
    ...(Array.isArray(payload.documents)
      ? { documents: stampDocuments(payload.documents, r.documents ?? [], now, actor) }
      : {}),
  };
}

/** The RFP response a revise payload would leave; as `revisedRfiResponse`. */
export function revisedRfpResponse(
  r: RfpResponse,
  payload: Record<string, unknown>,
  now: string,
  actor: ActorAttribution,
): RfpResponse {
  return {
    ...r,
    ...(Array.isArray(payload.answers) ? { answers: payload.answers as RfpTermAnswer[] } : {}),
    ...(typeof payload.otherTerms === 'string' ? { otherTerms: payload.otherTerms } : {}),
    ...(Array.isArray(payload.questionAnswers) ? { questionAnswers: payload.questionAnswers as RfiAnswer[] } : {}),
    ...(payload.pricing && typeof payload.pricing === 'object' ? { pricing: payload.pricing as RfpPricingAnswer } : {}),
    ...(Array.isArray(payload.documents)
      ? { documents: stampDocuments(payload.documents, r.documents ?? [], now, actor) }
      : {}),
  };
}
