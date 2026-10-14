/** @import { ASN } from '@services/data/types' */
/** @import { CallOffView } from '@services/transitions/callOffRules' */
/** @import { LinkedAsn } from '../utils' */
import { useMemo } from 'react';
import { callOffWarnings } from '@services/transitions/callOffRules';
import { isActiveAsn } from '@services/transitions/fulfilmentRules';

/**
 * MR-6 BR-12 (edge case 6) — each call-off's ASNs with the CURRENT comparison,
 * recomputed on read: the planner's "Mismatch" marker. Keyed by call-off id;
 * a call-off with no active ASN has no entry.
 * @param {readonly CallOffView[]} views
 * @param {readonly ASN[]} asns
 * @returns {Map<string, LinkedAsn[]>}
 */
export const useLinkedAsns = (views, asns) =>
  useMemo(() => {
    const out = /** @type {Map<string, LinkedAsn[]>} */ (new Map());
    for (const v of views) {
      const mine = asns
        .filter((a) => a.callOffId === v.callOff.id && isActiveAsn(a))
        .map((a) => ({ asn: a, warnings: callOffWarnings(v.callOff, asns, a) }));
      if (mine.length > 0) out.set(v.callOff.id, mine);
    }
    return out;
  }, [views, asns]);
