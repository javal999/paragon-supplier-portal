// ─────────────────────────────────────────────────────────────────────────────
// THE ENGINE'S SYNTHETIC DATASET, WIRED TO THE HUB (BL-102; E14-01 BR-07).
//
// The generator (`services/engine/synthetic`) is pure. This module hands it the
// Hub's own inputs, so nothing is restated:
//   · materials      — MATERIAL_MASTER, the one master (C8 §4.0), every entry
//   · suppliers      — the Hub's sample supplier ids and categories
//   · relationships  — the SDC relationships and the forecast sources (with
//                      their shares), so an existing pair stays a pair
//   · lead times     — `zoneLengthsFor(...).firmDays` (REQ-E06-01 BR-05), split
//                      into SAMPLE steps that add up to it (DRC-6, BL-192)
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
import { mockSuppliers } from '@data/mockSuppliers';
import { zoneLengthsFor } from '../../../transitions/forecastConfig';
import { hubWorkingCalendar } from '../../../transitions/workingCalendarStore';
import { responseDeadline } from '../../poResponseProjection';
import { FORECAST_RELATIONSHIPS, FORECAST_SOURCES } from './forecastHub';
/** @import { GeneratorInput } from '../../../engine/synthetic/generate' */
import { generateEngineDataset } from '../../../engine/synthetic/generate';
import { DEFAULT_PROFILE, SUPPLIER_PROFILES } from '../../../engine/synthetic/profiles';
/** @import { EngineDataset, IsoInstant, LeadTimeRoute, LeadTimeStepId } from '../../../engine/types' */
import { splitLeadTime } from '../../../engine/leadTimeSteps';
import { SSTP, SSTP_FIGURES, SSTP_UNIT_PRICE_IDR } from './walkthroughSstp';

/**
 * DRC-6 (BL-192) — SAMPLE DATA. The route of a sample source: an Indonesian
 * supplier is local; a foreign one is an import, and an imported raw material
 * (SAP type ROH) is the imported-raw-material route [XLS Guidance].
 * @param {string} supplierId
 * @param {{ readonly materialType: string }} m
 * @returns {LeadTimeRoute}
 */
export function sampleLeadTimeRoute(supplierId, m) {
  const country = mockSuppliers.find((s) => s.id === supplierId)?.country ?? 'ID';
  if (country === 'ID') return 'local';
  return m.materialType === 'ROH' ? 'importedRawMaterial' : 'import';
}

/**
 * DRC-6 (BL-192) — ⚠️ SAMPLE DATA, NOT A RULE. How a sample source's existing
 * `leadTimeDays` is split into steps, so no total changes. The proportions
 * follow the shape of the XLS Guidance (shipment and ordering dominate an
 * import), not any supplier's real figures; the Master Data Management feed
 * replaces them (ENG-D1).
 * ⚠️ The sample totals are shorter than the XLS ranges for an import (a
 * 30-day imported raw material cannot hold 4 weeks to the principal plus 6–8
 * weeks of shipment): the split keeps the total, so the steps are smaller
 * than the guidance until the real feed arrives.
 * @type {Readonly<Record<LeadTimeRoute, Readonly<Partial<Record<LeadTimeStepId, number>>>>>}
 */
export const SAMPLE_LEAD_TIME_WEIGHTS = Object.freeze({
  local: Object.freeze({ machineQueue: 0.25, production: 0.5, delivery: 0.25 }),
  import: Object.freeze({
    orderingMaterial: 0.25,
    machineQueue: 0.15,
    production: 0.3,
    shipment: 0.3
  }),
  importedRawMaterial: Object.freeze({
    orderToPrincipal: 0.25,
    machineQueue: 0.1,
    production: 0.15,
    shipment: 0.4,
    delivery: 0.1
  })
});

/** The seed. Change it and every synthetic row changes; the calibration test must still pass. */
export const ENGINE_DATASET_SEED = 20260924;

/**
 * The suppliers the synthetic dataset trades with: every supplier in an existing
 * relationship, plus sample suppliers of the categories the master needs.
 * Derived from the profile table so there is one list.
 * @type {readonly string[]}
 */
export const ENGINE_SUPPLIER_IDS = Object.keys(SUPPLIER_PROFILES).sort();

/**
 * The generator's inputs, taken from the Hub. Exported so tests build the same dataset.
 * @param {IsoInstant} now
 * @param {number} [seed]
 * @returns {GeneratorInput}
 */
export function engineGeneratorInput(now, seed = ENGINE_DATASET_SEED) {
  const cal = hubWorkingCalendar();
  return {
    seed,
    now,
    // E2E walkthrough — the walkthrough pair is ADDED after generation
    // (`withWalkthroughPair`), never generated: one more material in the
    // generator would move every seeded draw and every other pair's rows.
    materials: Object.values(MATERIAL_MASTER)
      .filter((m) => m.materialCode !== SSTP.materialCode)
      .map((m) => ({
        materialCode: m.materialCode,
        materialType: m.materialType,
        materialGroup: m.materialGroup,
        canonicalUom: m.canonicalUom
      })),
    suppliers: ENGINE_SUPPLIER_IDS.map((id) => {
      const s = mockSuppliers.find((x) => x.id === id);
      if (!s) throw new Error(`engine dataset: supplier '${id}' is not in the supplier master`);
      return { supplierId: id, category: s.category };
    }),
    relationships: [
      ...FORECAST_SOURCES.map((s) => ({
        supplierId: s.supplierId,
        materialCode: s.materialCode,
        share: s.share
      })),
      ...FORECAST_RELATIONSHIPS.map((r) => ({
        supplierId: r.supplierId,
        materialCode: r.materialCode
      })),
      ...SUPPLIER_MATERIAL_RELATIONSHIPS.map((r) => ({
        supplierId: r.supplierId,
        materialCode: r.materialCode
      }))
    ],
    leadTimeDays: (supplierId, m) =>
      zoneLengthsFor(supplierId, m.materialGroup, m.materialType).firmDays,
    // DRC-6 (BL-192) — SAMPLE step split of the same total (see SAMPLE_LEAD_TIME_WEIGHTS).
    leadTimeSteps: (supplierId, m, total) => {
      const route = sampleLeadTimeRoute(supplierId, m);
      return { route, steps: splitLeadTime(route, total, SAMPLE_LEAD_TIME_WEIGHTS[route]) };
    },
    confirmDeadline: (createdAt) => responseDeadline({ orderDate: createdAt }, cal).toISOString(),
    profiles: SUPPLIER_PROFILES,
    defaultProfile: DEFAULT_PROFILE
  };
}

/**
 * E2E walkthrough 2026-11-12 — the pair sup-007 × 2000028400 with the
 * planners' purchasing figures (`SSTP_FIGURES`): lead time 35 days on the
 * local route, MOQ, MPQ (read as `orderMultiple`) and koli (read as units per
 * pallet). Appended to the generated dataset, so every generated row stays
 * byte-identical. It has no sales, BOM, stock or PO history: the engine's
 * history-based figures (CV, the MRP run) hold nothing for it.
 * @param {EngineDataset} data
 * @returns {EngineDataset}
 */
export function withWalkthroughPair(data) {
  const route = sampleLeadTimeRoute(SSTP.supplierId, { materialType: 'VERP' });
  /** @type {EngineDataset['materials'][number]} */
  const material = {
    materialCode: SSTP.materialCode,
    kind: 'packaging',
    uom: 'PCS',
    materialGroup: 'MG-20'
  };
  return {
    ...data,
    materials: [...data.materials, material],
    sources: [
      ...data.sources,
      {
        materialCode: SSTP.materialCode,
        supplierId: SSTP.supplierId,
        leadTimeDays: SSTP_FIGURES.leadTimeDays,
        moq: SSTP_FIGURES.moq,
        orderMultiple: SSTP_FIGURES.mpq,
        share: 1,
        leadTimeRoute: route,
        leadTimeSteps: splitLeadTime(
          route,
          SSTP_FIGURES.leadTimeDays,
          SAMPLE_LEAD_TIME_WEIGHTS[route]
        )
      }
    ],
    volumes: [
      ...data.volumes,
      { materialCode: SSTP.materialCode, unitsPerPallet: SSTP_FIGURES.koli }
    ],
    // The PO line's unit price; no SAP safety stock is on record for the pair.
    materialValues: [
      ...data.materialValues,
      { materialCode: SSTP.materialCode, unitValueIdr: SSTP_UNIT_PRICE_IDR }
    ],
    sapSafetyStock: [...data.sapSafetyStock, { materialCode: SSTP.materialCode, quantity: 0 }]
  };
}

/** @type {{ now: string; data: EngineDataset } | null} */
let memo = null;

/**
 * The dataset at the hub's present.
 * @returns {EngineDataset}
 */
export function engineDataset() {
  const now = sdcClock.now();
  if (memo?.now !== now)
    memo = { now, data: withWalkthroughPair(generateEngineDataset(engineGeneratorInput(now))) };
  return memo.data;
}
