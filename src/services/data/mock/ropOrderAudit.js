// ────────────────────────────────────────────────────────────────────────────
// PSC-4 BR-10 (BL-339) — what an ROP-ORDER-ONLY change records (DRC-D16).
//
// ROP Order is computed at read and stored nowhere (law 0.5), so a change that
// moves only ROP Order — the cover setting, the event window, the Material
// Buffer switch, the protection buffer switch — is recorded with the inputs the
// figure was reading and `RULES_VERSION`. It writes NO DA version (owner ruling
// 2026-11-19, Q2).
//
// Called from the two write paths that can make such a change
// (`targets/osipParam.js` and `targets/eventCalendar.js`), never from a page.
// ────────────────────────────────────────────────────────────────────────────

/** @import { QueryScope } from '../../data/types' */
import { RULES_VERSION, stamp } from '../../transitions/osipRules';
import { hubWeeks } from '../../transitions/demandAnticipationRules';
import { osipParamKey, switchIsOn } from '../../transitions/osipParams';
import { leadTimeBreakdown } from '../../engine/leadTimeSteps';
import { dayOf, mondayOf } from '../../engine/dates';
import { sdcClock } from '../../sdc';
import { engineDataset } from './fixtures/engineDataset';
import { osipParamStore } from './stores/osipParamStore';
import { eventCalendarStore } from '../../transitions/eventCalendarStore';
import { ropOrderAuditStore } from './stores/ropOrderAuditStore';
import { coverageWeeksFor, coverWeeksFor, materialBufferSwitchFor } from './bufferModelARead';
import { NO_PERSON } from '@context/noPerson';

/**
 * The inputs the ROP Order figure of one material reads at this instant, as
 * the DRC-D16 audit keeps them.
 * @param {string} materialCode
 * @param {string} planningWeek
 * @returns {Record<string, unknown>}
 */
function ropOrderInputs(materialCode, planningWeek) {
  const src = engineDataset().sources.find((s) => s.materialCode === materialCode);
  const sw = materialBufferSwitchFor(materialCode, planningWeek);
  return {
    planningWeek,
    leadTimeWeeks: src ? leadTimeBreakdown(src).totalWeeks : null,
    coverWeeks: coverWeeksFor(materialCode),
    coverageWeeks: coverageWeeksFor(materialCode),
    materialBufferOn: switchIsOn(
      osipParamStore.valueOf(osipParamKey('materialBufferOn', { materialCode }))
    ),
    materialBufferOverride:
      osipParamStore.valueOf(osipParamKey('materialBufferOn', { materialCode })) ?? null,
    materialBufferSwitchSource: sw.source,
    eventWindow: sw.event ? sw.event.id : null,
    protectionBufferOn: switchIsOn(
      osipParamStore.valueOf(osipParamKey('protectionBufferOn', { materialCode }))
    ),
    eventWindows: eventCalendarStore.inForce().map((e) => e.id)
  };
}

/**
 * BR-10 / DRC-D16 — append the audit row for a change that moves ROP Order only.
 * @param {{
 *   readonly key: string;
 *   readonly field: 'coverWeeks' | 'coverageWeeks' | 'materialBufferOn' | 'protectionBufferOn' | 'eventWindow';
 *   readonly value: number | boolean | null;
 *   readonly reason: string | null;
 *   readonly materialCode: string | null;
 *   readonly scope: QueryScope;
 *   readonly extraInputs?: Readonly<Record<string, unknown>>;
 *   readonly nowIso?: string;
 * }} input
 * @returns {void}
 */
export function recordRopOnlyChange({
  key,
  field,
  value,
  reason,
  materialCode,
  scope,
  extraInputs,
  nowIso = sdcClock.now()
}) {
  const planningWeek = hubWeeks(nowIso, 1)[0] ?? mondayOf(dayOf(nowIso));
  const inputs = {
    ...(materialCode ? ropOrderInputs(materialCode, planningWeek) : { planningWeek }),
    ...(extraInputs ?? {})
  };
  ropOrderAuditStore.append({
    key,
    field,
    value,
    reason,
    // The figure itself is not stored (law 0.5): the STAMP records what made
    // the next read what it is.
    figure: stamp(null, inputs, RULES_VERSION),
    setAt: nowIso,
    setBy: scope.actor ?? NO_PERSON
  });
}
