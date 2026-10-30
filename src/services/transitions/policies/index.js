// ────────────────────────────────────────────────────────────────────────────
// Policy-hook BINDINGS (v2.2 Step 3.4) — resolve a registered hook NAME to its
// function. `policyHooks.js` owns the name allowlist (schema-time); this module
// binds each name to its runtime implementation, which the dispatcher resolves.
// Kept separate so flow metadata stays serialisable (names, never closures).
//
// policies/ — this index re-exports what `policies.js` exported before it
// became a folder, so every `./policies` import resolves unchanged. Importing
// it binds every hook (side effect). The group files are imported in the order
// their bindings stood in `policies.js`; keep that order.
// ────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./purchaseOrder').CounterOfferRefusal} CounterOfferRefusal */

export { bindPolicyHook, resolvePolicyHook } from './bindings';
export { confirmedQtyWithinBounds, isIsoDate, counterOfferRefusal } from './purchaseOrder';
import './rollups';
import './sourcing';
import './governance';
import './requisition';
import './supplierApplication';
