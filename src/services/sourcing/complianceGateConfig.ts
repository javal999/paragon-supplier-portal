// ────────────────────────────────────────────────────────────────────────────
// CR-23 — THE COMPLIANCE GATE'S OPEN VALUES, IN ONE PLACE.
//
// ⚠️ **PLACEHOLDERS UNTIL THE OWNER DECIDES — BL-55 (assumption A-05).** The
// requirement fixes every criterion of the gate EXCEPT the OTIF minimum and
// whether a supplier with no OTIF history passes. Both are proposed values, not
// rulings. When BL-55 is decided, the change is one line here and nothing else:
// the gate, the award verb and every surface read these two constants.
// ────────────────────────────────────────────────────────────────────────────

/** BL-55 placeholder — the minimum measured OTIF (%) a supplier needs to pass. */
export const GATE_MIN_OTIF_PCT = 80;

/** BL-55 placeholder — a supplier with no OTIF history ("No history") passes. */
export const GATE_NO_HISTORY_PASSES = true;
