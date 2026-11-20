// ────────────────────────────────────────────────────────────────────────────
// CR-23 — THE COMPLIANCE GATE'S OPEN VALUES, READ IN FORCE.
//
// ⚠️ **DECIDED — OWNER RULING 2026-11-20 (BL-55, assumption A-05).** The OTIF
// minimum is 90%, and a supplier with no OTIF history ("No history") passes.
//
// ⚠️ **THEY ARE THE HUB ADMINISTRATOR'S (BL-32).** The defaults live in
// `transitions/hubSettings.js`; a changed value is recorded on
// Administration → Tolerances and rule values, through `t_setting_set`, with no
// code change. The gate, the award verb and every surface read these two
// accessors at the moment they judge a supplier.
// ────────────────────────────────────────────────────────────────────────────

import { hubSetting, hubSettingFlag } from '../transitions/hubSettingsStore';

/**
 * The minimum measured OTIF (%) a supplier needs to pass, in force now.
 * @returns {number}
 */
export function gateMinOtifPct() {
  return hubSetting('gate.minOtifPct');
}

/**
 * Does a supplier with no OTIF history ("No history") pass? In force now.
 * @returns {boolean}
 */
export function gateNoHistoryPasses() {
  return hubSettingFlag('gate.noHistoryPasses');
}
