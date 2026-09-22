// ────────────────────────────────────────────────────────────────────────────
// CR-23 — THE COMPLIANCE GATE'S OPEN VALUES, READ IN FORCE.
//
// ⚠️ **PLACEHOLDERS UNTIL THE OWNER DECIDES — BL-55 (assumption A-05).** The
// requirement fixes every criterion of the gate EXCEPT the OTIF minimum and
// whether a supplier with no OTIF history passes. Both are proposed values, not
// rulings: 80%, and "No history" passes.
//
// ⚠️ **THEY ARE THE HUB ADMINISTRATOR'S (BL-32).** The defaults live in
// `transitions/hubSettings.ts`; when BL-55 is decided, the value is changed on
// Administration → Tolerances and rule values, through `t_setting_set`, with no
// code change. The gate, the award verb and every surface read these two
// accessors at the moment they judge a supplier.
// ────────────────────────────────────────────────────────────────────────────

import { hubSetting, hubSettingFlag } from '../transitions/hubSettingsStore';

/** BL-55 placeholder — the minimum measured OTIF (%) a supplier needs to pass, in force now. */
export function gateMinOtifPct(): number {
  return hubSetting('gate.minOtifPct');
}

/** BL-55 placeholder — does a supplier with no OTIF history ("No history") pass? In force now. */
export function gateNoHistoryPasses(): boolean {
  return hubSettingFlag('gate.noHistoryPasses');
}
