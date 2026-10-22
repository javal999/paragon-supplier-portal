// ────────────────────────────────────────────────────────────────────────────
// BL-202 (DRC-17 BR-05) — the saved what-if scenarios, one row per save.
//
// Append-only (MAT-R3): a row is never changed or removed. Each keeps who
// saved it, when, its inputs, its rule switches, the rules version in force
// (`RULES_VERSION`) and its headline figures stamped with that version
// (DRC-D16), so the page can say a scenario was made under other rules.
// Written only by `t_whatifscenario_save`; read by the sandbox page. Nothing
// else reads it, and it feeds no plan (BR-06).
//
// Held in memory like every other record in the prototype: lost on reload.
// Empty at start: no scenario is invented.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { Stamped } from '../../../transitions/osipRules' */
/** @import { HeadlineFigures, WhatIfInputs, WhatIfSwitches } from '../../../transitions/whatIfSandboxRules' */

/**
 * @typedef {{
 *   readonly id: string;
 *   readonly name: string;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly inputs: WhatIfInputs;
 *   readonly switches: WhatIfSwitches;
 *   readonly rulesVersion: string;
 *   readonly figuresAtSave: Stamped<HeadlineFigures>;
 *   readonly savedAt: string;
 *   readonly savedBy: ActorAttribution;
 * }} WhatIfScenario
 */

/** @type {WhatIfScenario[]} */
let rows = [];
let seq = 0;

export const whatIfScenarioStore = {
  /** @returns {readonly WhatIfScenario[]} */
  all() {
    return rows;
  },
  /**
   * @param {string} id
   * @returns {WhatIfScenario | undefined}
   */
  get(id) {
    return rows.find((r) => r.id === id);
  },
  /**
   * One supplier × material's scenarios, oldest first.
   * @param {string} supplierId
   * @param {string} materialCode
   * @returns {readonly WhatIfScenario[]}
   */
  forPair(supplierId, materialCode) {
    return rows.filter((r) => r.supplierId === supplierId && r.materialCode === materialCode);
  },
  /**
   * @param {Omit<WhatIfScenario, 'id'>} row
   * @returns {WhatIfScenario}
   */
  add(row) {
    seq += 1;
    /** @type {WhatIfScenario} */
    const made = { ...row, id: `wis-${String(seq).padStart(4, '0')}` };
    rows = [...rows, made];
    return made;
  },
  /**
   * TEST SEAM — back to nothing saved.
   * @returns {void}
   */
  reset() {
    rows = [];
    seq = 0;
  }
};
