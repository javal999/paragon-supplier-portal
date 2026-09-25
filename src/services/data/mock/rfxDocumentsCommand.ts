// ────────────────────────────────────────────────────────────────────────────
// NR-1 — the document policies on the supplier's response verbs.
//
// Imported by `MockCommandService` for its side effect: importing this module
// binds the policies, the `rfqEngagementCommand` precedent. Each binding only
// gathers the facts from the stores and hands them to the pure rules in
// `transitions/rfxDocumentRules`, so a screen's pre-check and the verb read
// the same rule (RFX-R2).
//
//   t_rfiresponse_save / t_rfpresponse_save  → rfx_response_documents_within_limits
//   t_rfiresponse_submit / t_rfpresponse_submit → rfx_response_documents_complete
//   t_quotation_submit                        → quotation_documents_complete
// ────────────────────────────────────────────────────────────────────────────

import { bindPolicyHook, POLICY_HOOKS } from '../../transitions';
import {
  documentLimitsRefusal,
  documentsOf,
  isResponseDocumentInput,
  responseDocumentsRefusal,
} from '../../transitions/rfxDocumentRules';
import type { RfiAnswer, RfiResponse, RfpResponse, ResponseDocument } from '../../sourcing/types';
import { rfiEventStore, rfiResponseStore, rfpEventStore, rfpResponseStore } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';

/** Files held on attachment answers: they count toward the 30 per response (D-3). */
const answerFiles = (answers: readonly RfiAnswer[] | undefined): number =>
  (answers ?? []).reduce((n, a) => n + (a.attachments?.length ?? 0), 0);

const MALFORMED = 'ATTACHMENT_MALFORMED: every document carries an id and a file record (name, size, type)';

/** The payload's documents, or a refusal when they are not a list of documents. */
function payloadDocuments(
  payload: Record<string, unknown>,
): { ok: true; documents: readonly ResponseDocument[] | undefined } | { ok: false; reason: string } {
  if (payload.documents === undefined) return { ok: true, documents: undefined };
  if (!Array.isArray(payload.documents) || !payload.documents.every(isResponseDocumentInput)) {
    return { ok: false, reason: MALFORMED };
  }
  return { ok: true, documents: payload.documents as ResponseDocument[] };
}

// NR-1 BR-05 — a draft save checks the limits only. The required requests are
// the submit's rule: a supplier saves as it goes.
bindPolicyHook(POLICY_HOOKS.RFX_RESPONSE_DOCUMENTS_WITHIN_LIMITS, ({ payload }) => {
  const parsed = payloadDocuments(payload);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  if (!parsed.documents) return { ok: true };
  const supplierId = String(payload.supplierId);
  let filesAlready: number;
  if (payload.rfiId !== undefined) {
    const prior = rfiResponseStore.all().find((r) => r.rfiId === String(payload.rfiId) && r.supplierId === supplierId);
    filesAlready = answerFiles(Array.isArray(payload.answers) ? (payload.answers as RfiAnswer[]) : prior?.answers);
  } else {
    const prior = rfpResponseStore.all().find((r) => r.rfpId === String(payload.rfpId) && r.supplierId === supplierId);
    filesAlready = answerFiles(
      Array.isArray(payload.questionAnswers) ? (payload.questionAnswers as RfiAnswer[]) : prior?.questionAnswers,
    );
  }
  const reason = documentLimitsRefusal(parsed.documents, filesAlready);
  return reason ? { ok: false, reason } : { ok: true };
});

// NR-1 BR-03 to BR-05 — on submit, the stored documents against the event's
// requests. The entity says which event type it answers.
bindPolicyHook(POLICY_HOOKS.RFX_RESPONSE_DOCUMENTS_COMPLETE, ({ target, entityId }) => {
  const response = target.readEntity(entityId) as (RfiResponse | RfpResponse) | null;
  if (!response) return { ok: false, reason: 'response not found' };
  const rfi = 'rfiId' in response ? response : null;
  const event = rfi ? rfiEventStore.get(rfi.rfiId) : rfpEventStore.get((response as RfpResponse).rfpId);
  if (!event) return { ok: false, reason: 'event not found' };
  const filesAlready = answerFiles(rfi ? rfi.answers : (response as RfpResponse).questionAnswers);
  const reason = responseDocumentsRefusal(event.documentRequests ?? [], response.documents ?? [], filesAlready);
  return reason ? { ok: false, reason } : { ok: true };
});

// NR-1 BR-03 to BR-05 — a quote is created at submit, so the payload is the
// response. Its legacy `attachments` count toward the limit through
// `documentsOf`, and answer no request.
bindPolicyHook(POLICY_HOOKS.QUOTATION_DOCUMENTS_COMPLETE, ({ payload }) => {
  const rfq = rfqStore.get(String(payload.rfqId));
  if (!rfq) return { ok: false, reason: 'RFQ_NOT_FOUND: sourcing event not found' };
  const parsed = payloadDocuments(payload);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const documents = parsed.documents ?? [];
  const legacy = Array.isArray(payload.attachments) ? (payload.attachments as ResponseDocument['attachment'][]) : [];
  const all = documentsOf({ documents, attachments: legacy });
  const filesAlready =
    all.length - documents.length +
    answerFiles(Array.isArray(payload.answers) ? (payload.answers as RfiAnswer[]) : undefined);
  const reason = responseDocumentsRefusal(rfq.documentRequests ?? [], documents, filesAlready);
  return reason ? { ok: false, reason } : { ok: true };
});
