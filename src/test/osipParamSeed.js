// ─────────────────────────────────────────────────────────────────────────────
// TEST SEAM — a planner-set OSIP value (team answers 2026-10-28), written to the
// ledger `t_osipparam_set` writes, for specs that need one before they render.
// The sample data sets none: ROP Supplier, for one, has no figure until the
// bottleneck production lead time is set (Team B10).
// ─────────────────────────────────────────────────────────────────────────────

import { NO_PERSON } from '@context/noPerson';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { osipParamKey } from '@services/transitions/osipParams';

/**
 * @param {import('@services/transitions/osipParams').OsipParam} param
 * @param {{ readonly supplierId?: string; readonly materialCode?: string }} at
 * @param {number | boolean | null} value
 * @returns {void}
 */
export function seedOsipParam(param, at, value) {
  const key = osipParamKey(param, at);
  osipParamStore.append({
    key,
    param,
    value,
    previous: osipParamStore.valueOf(key),
    reason: null,
    setAt: '2026-08-31T03:00:00.000Z',
    setBy: NO_PERSON
  });
}
