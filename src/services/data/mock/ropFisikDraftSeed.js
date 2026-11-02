// ────────────────────────────────────────────────────────────────────────────
// BL-199 / BL-230 — ONE CALL-OFF DRAFTED AT ROP FISIK, GROWN THROUGH THE TRIGGER.
//
// The planner's Call-offs page can show a draft the hub made when PTI SOH
// reached ROP Fisik ("Drafted at ROP Fisik", and its panel: SOH, ROP Fisik,
// Max, quantity, minimum delivery, flags). In the running app nobody could see
// it: a draft appears only on a PTI SOH update, the eWM feed is not connected,
// and nothing calls the refresh seam (`applyPtiStockRefresh`). The seed's own
// stock records are sequence 0, which the trigger never treats as an update.
//
// ⚠️ **SO THE DRAFT IS GROWN, NOT WRITTEN** — `requisitionSeed.js`'s rule. A
// hand-written call-off with `origin: 'ropFisik'` would carry figures no rule
// produced. This records one sample eWM refresh through the real seam, and the
// hub's own trigger drafts the call-off and stamps its figures.
//
// The update re-records RM-STEAR-7300's sample PTI SOH at J6 (`PTI_STOCK`, 900
// KG) unchanged, so no stock figure on any page moves: it is the same stock,
// now seen by the trigger. 900 is below ROP Fisik, so the trigger drafts the
// supplier's minimum delivery from the oldest blanket line; that delivery does
// not fit under Max, so the draft carries "Above Max" (BL-230).
//
// Called once at startup (`main.jsx`), after the other seeds. Tests never call
// it unless they mean to, so every suite still starts from the plain fixtures.
// ────────────────────────────────────────────────────────────────────────────

import { applyPtiStockRefresh } from './MockCommandService';
import { callOffStore } from './stores/callOffStore';
import { ptiStockStore } from './stores/ptiStockStore';

/** The sample material and plant the seed refreshes. */
export const ROP_FISIK_SEED = Object.freeze({ materialCode: 'RM-STEAR-7300', plant: 'J6' });

/**
 * `status`: `seeded` — the trigger drafted the call-off. `already-seeded` — a ROP Fisik draft of the material exists; skipped. `refused` — the refresh landed but the trigger drafted nothing; the stock record is left as the refresh wrote it.
 * `callOffId`:  The draft's id, when there is one.
 *
 * @typedef {{
 *   readonly status: 'seeded' | 'already-seeded' | 'refused';
 *   readonly callOffId?: string;
 * }} RopFisikDraftSeedOutcome
 */

const ropFisikDraft = () =>
  callOffStore
    .all()
    .find((c) => c.origin === 'ropFisik' && c.materialCode === ROP_FISIK_SEED.materialCode);

/**
 * Grow one ROP Fisik draft. Idempotent: a second call finds it and skips.
 * @returns {RopFisikDraftSeedOutcome}
 */
export function seedRopFisikDraft() {
  const existing = ropFisikDraft();
  if (existing) return { status: 'already-seeded', callOffId: existing.id };
  const record = ptiStockStore
    .forMaterial(ROP_FISIK_SEED.materialCode)
    .find((r) => r.plant === ROP_FISIK_SEED.plant);
  if (!record) return { status: 'refused' };
  applyPtiStockRefresh([{ ...ROP_FISIK_SEED, ptiSoh: record.ptiSoh }]);
  const drafted = ropFisikDraft();
  return drafted ? { status: 'seeded', callOffId: drafted.id } : { status: 'refused' };
}
