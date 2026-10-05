// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURE — Material G2. Takes bidding eligibility out of a spec whose
// subject is something else (the best-score reason, the split, the break).
//
// Records a REAL (non-placeholder) list for both levels that asks for nothing,
// so every vendor computes as Preferred: G2 neither warns (placeholder ruling,
// 2026-09-29) nor refuses. Specs that are ABOUT eligibility never call this —
// they set the lists they need, or run on the placeholder seed.
// ─────────────────────────────────────────────────────────────────────────────

import { NO_PERSON } from '@context/noPerson';
import { qualificationRuleStore } from '@services/transitions/qualificationRuleStore';

export function everyVendorQualified(): void {
  qualificationRuleStore.reset();
  for (const level of ['approved', 'preferred'] as const) {
    qualificationRuleStore.append({ level, requiredDocs: [], placeholder: false, setAt: '2026-01-01T00:00:00.000Z', setBy: NO_PERSON });
  }
}
