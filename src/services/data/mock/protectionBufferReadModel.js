// ────────────────────────────────────────────────────────────────────────────
// BL-205 (DRC-9c) [Proposed] — the inputs of the protection buffer beyond the
// LTP, per supplier × material:
//   · level — the OSIP level in force for the material (`osipLevelStore`,
//     DRC-D11; [Default C2] when none set);
//   · MPQ   — the purchasing info record's `orderMultiple` (engine dataset
//     `MaterialSource`): MPQ = orderMultiple until the master data feed carries
//     MPQ (wave 2 default).
// The LTP itself is the forecast lines the page already reads, and the rule
// (`drcBufferRules.protectionBufferRows`) runs on the page, so a switch variant
// needs no new read. Computed at read, never stored (law 0.5), so not stamped.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ProtectionBufferInput } from '../../transitions/drcBufferRules' */
import { osipLevelInForce } from '../../transitions/osipRopRules';
import { engineDataset } from './fixtures/engineDataset';
import { osipLevelStore } from './stores/osipLevelStore';

/**
 * BL-205 — every sourced supplier × material's level and production MPQ.
 * @returns {ProtectionBufferInput[]}
 */
export function protectionBufferInputs() {
  return engineDataset().sources.map((s) => {
    const level = osipLevelInForce(osipLevelStore.forMaterial(s.materialCode));
    return {
      supplierId: s.supplierId,
      materialCode: s.materialCode,
      level: level.level,
      levelSource: level.source,
      // [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default).
      mpq: s.orderMultiple > 0 ? s.orderMultiple : null
    };
  });
}
