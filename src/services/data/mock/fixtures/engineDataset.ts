// ─────────────────────────────────────────────────────────────────────────────
// THE ENGINE'S SYNTHETIC DATASET, WIRED TO THE HUB (BL-102; E14-01 BR-07).
//
// The generator (`services/engine/synthetic`) is pure. This module hands it the
// Hub's own inputs, so nothing is restated:
//   · materials      — MATERIAL_MASTER, the one master (C8 §4.0), every entry
//   · suppliers      — the Hub's sample supplier ids and categories
//   · relationships  — the SDC relationships and the forecast sources (with
//                      their shares), so an existing pair stays a pair
//   · lead times     — `zoneLengthsFor(...).firmDays` (REQ-E06-01 BR-05)
//   · confirm-by     — the PO response deadline itself (`responseDeadline`,
//                      REQ-E07-02 BR-01), on the hub working calendar
//   · the present    — the hub clock (`sdcClock.now()`), never the machine clock
//
// ⚠️ SIMULATED. Registered as the `engineDataset` capability in the liveness
// registry, awaiting the Master Data Management team's SAP feed (ENG-D1).
// Built lazily on first read and memoised per present.
// ─────────────────────────────────────────────────────────────────────────────

import { MATERIAL_MASTER, SUPPLIER_MATERIAL_RELATIONSHIPS } from '../../../sdc/fixtures';
import { sdcClock } from '../../../sdc/clock';
import { mockSuppliers } from '../../../../data/mockSuppliers';
import { zoneLengthsFor } from '../../../transitions/forecastConfig';
import { hubWorkingCalendar } from '../../../transitions/workingCalendarStore';
import { responseDeadline } from '../../poResponseProjection';
import { FORECAST_RELATIONSHIPS, FORECAST_SOURCES } from './forecastHub';
import { generateEngineDataset, type GeneratorInput } from '../../../engine/synthetic/generate';
import { DEFAULT_PROFILE, SUPPLIER_PROFILES } from '../../../engine/synthetic/profiles';
import type { EngineDataset, IsoInstant } from '../../../engine/types';

/** The seed. Change it and every synthetic row changes; the calibration test must still pass. */
export const ENGINE_DATASET_SEED = 20260924;

/**
 * The suppliers the synthetic dataset trades with: every supplier in an existing
 * relationship, plus sample suppliers of the categories the master needs.
 * Derived from the profile table so there is one list.
 */
export const ENGINE_SUPPLIER_IDS: readonly string[] = Object.keys(SUPPLIER_PROFILES).sort();

/** The generator's inputs, taken from the Hub. Exported so tests build the same dataset. */
export function engineGeneratorInput(now: IsoInstant, seed: number = ENGINE_DATASET_SEED): GeneratorInput {
  const cal = hubWorkingCalendar();
  return {
    seed,
    now,
    materials: Object.values(MATERIAL_MASTER).map((m) => ({
      materialCode: m.materialCode,
      materialType: m.materialType,
      materialGroup: m.materialGroup,
      canonicalUom: m.canonicalUom,
    })),
    suppliers: ENGINE_SUPPLIER_IDS.map((id) => {
      const s = mockSuppliers.find((x) => x.id === id);
      if (!s) throw new Error(`engine dataset: supplier '${id}' is not in the supplier master`);
      return { supplierId: id, category: s.category };
    }),
    relationships: [
      ...FORECAST_SOURCES.map((s) => ({ supplierId: s.supplierId, materialCode: s.materialCode, share: s.share })),
      ...FORECAST_RELATIONSHIPS.map((r) => ({ supplierId: r.supplierId, materialCode: r.materialCode })),
      ...SUPPLIER_MATERIAL_RELATIONSHIPS.map((r) => ({ supplierId: r.supplierId, materialCode: r.materialCode })),
    ],
    leadTimeDays: (supplierId, m) => zoneLengthsFor(supplierId, m.materialGroup, m.materialType).firmDays,
    confirmDeadline: (createdAt) => responseDeadline({ orderDate: createdAt }, cal).toISOString(),
    profiles: SUPPLIER_PROFILES,
    defaultProfile: DEFAULT_PROFILE,
  };
}

let memo: { now: string; data: EngineDataset } | null = null;

/** The dataset at the hub's present. */
export function engineDataset(): EngineDataset {
  const now = sdcClock.now();
  if (memo?.now !== now) memo = { now, data: generateEngineDataset(engineGeneratorInput(now)) };
  return memo.data;
}
