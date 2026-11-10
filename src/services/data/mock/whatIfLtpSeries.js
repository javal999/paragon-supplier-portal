// ────────────────────────────────────────────────────────────────────────────
// PEX-15 (BL-277) — the LTP series a material's what-if scenarios read, one per
// scenario (BR-02): A (Baseline), Festive, B (Protection buffer).
//
// THE SEAM TO PEX-5 (BL-267). The series are the planner's uploads in force for
// the material (`t_ltpinput_set`), read by the same rule the DA page reads them
// with (`ltpWeeks`), so the sandbox and the DA page show one figure:
//   · Baseline = LTP A: the upload when there is one (PEX-5 BR-02), else the
//     forecast the sandbox already reads.
//   · Festive / Protection buffer = LTP Festive / LTP B: null (scenario
//     unavailable, never estimated) when that series was not uploaded. A week
//     the upload leaves out reads LTP A, as the DA page does for the chosen
//     series (`CHOICE_WEEK_EMPTY`).
//   · An upload is per material; the pair gets the supplier's share of it
//     (CAP-D11, `share`), as the DA page gives it.
//   · The strategic buffer (Festive − A) and protection buffer (B − A) are those
//     two series minus Baseline; nothing here stores them.
// The preset pair (PPT 7, a fixed golden case) holds no uploads: Baseline only.
// The LTP choice does not move a scenario: a scenario names its series.
// ────────────────────────────────────────────────────────────────────────────

/** @import { LtpSeriesSet } from '../../transitions/whatIfLevels' */
import { ltpWeeks, materialLtpInputs } from '../../transitions/ltpInputRules';
import { ltpInputStore } from './stores/ltpInputStore';

/**
 * @param {{
 *   materialCode: string;
 *   weeks: readonly string[];
 *   liveLtp: readonly number[];
 *   share: () => number;
 *   preset?: boolean;
 * }} input
 *   `weeks`: the sandbox's weeks (Mondays). `liveLtp`: the pair's LTP A per week
 *   as the sandbox reads it. `share`: the supplier's share of the material, 0 to 1; asked only when the material has an upload.
 * @returns {LtpSeriesSet}
 */
export function whatIfLtpSeries({ materialCode, weeks, liveLtp, share, preset = false }) {
  if (preset) return { A: liveLtp, Festive: null, B: null };
  const inputs = materialLtpInputs(ltpInputStore.all(), materialCode);
  if (!inputs.hasUpload) return { A: liveLtp, Festive: null, B: null };
  const lw = ltpWeeks(weeks, liveLtp, inputs, share());
  return {
    A: lw.a,
    Festive: inputs.uploads.Festive ? lw.festive.map((q, i) => q ?? lw.a[i]) : null,
    B: inputs.uploads.B ? lw.b.map((q, i) => q ?? lw.a[i]) : null
  };
}
