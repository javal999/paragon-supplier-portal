// ─────────────────────────────────────────────────────────────────────────────
// BL-102 — the synthetic engine dataset: calibration, determinism, integrity,
// and no machine clock.
//
// ⚠️ EVERY FIGURE BELOW IS DERIVED FROM THE GENERATED ROWS, never restated.
// Each band is bilateral: the shipped dataset lands inside it AND a known-bad
// perturbation of the same rows lands outside it, so a band that could not
// fail would show here as a failing perturbation, not as a green check.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { deriveCensus, sitesIn } from '@lib/machineClockGate/derive';
import { MATERIAL_MASTER } from '../../sdc/fixtures';
import { isKnownMaterial, materialEntry } from '../../sdc/materialMaster';
import { SDC_SIMULATED_NOW } from '../../sdc/clock';
import { mockSuppliers } from '@data/mockSuppliers';
import { SUPPLIER_MATERIAL_RELATIONSHIPS } from '../../sdc/fixtures';
import { FORECAST_RELATIONSHIPS } from '../../data/mock/fixtures/forecastHub';
import {
  ENGINE_DATASET_SEED,
  ENGINE_SUPPLIER_IDS,
  engineDataset,
  engineGeneratorInput,
} from '../../data/mock/fixtures/engineDataset';
import { generateEngineDataset, DEFAULT_SIZES } from './generate';
import { addDays, dayOf, mondayOf } from '../dates';
import { confirmedByDeadline, lineHistories } from '../lines';
import { cfotByDefinition } from '../cfot';
import { stockAccuracy, warehouseUtilisation } from '../stock';
import { integrityViolations } from '../integrity';
import type { EngineDataset } from '../types';
import { poCfot } from '../../data/performanceRules';
import type { PurchaseOrder } from '../../data/types';
import type { GoodsReceipt } from '@data/mockGoodsReceipts';
import { latestConfirmation, requirementAt, type LineHistory } from '../lines';
import type { CfotWindow } from '../cfot';

const NOW = SDC_SIMULATED_NOW;
const TODAY = dayOf(NOW);
const WINDOW = { from: addDays(TODAY, -26 * 7 + 1), to: TODAY };
const data = engineDataset();

// ── The measures, derived ───────────────────────────────────────────────────

/** BR-01: lines confirmed by their deadline ÷ lines whose deadline fell in the window. */
function confirmationRate(d: EngineDataset): number {
  const due = lineHistories(d).filter((h) => {
    const day = dayOf(h.line.confirmDeadline);
    return h.line.confirmDeadline <= NOW && day >= WINDOW.from && day <= WINDOW.to;
  });
  return due.filter(confirmedByDeadline).length / due.length;
}

const cfot = (d: EngineDataset) => cfotByDefinition(lineHistories(d), WINDOW).rate!;

function recentUtilisation(d: EngineDataset, kind: 'packaging' | 'rawMaterial', n: number): number[] {
  return warehouseUtilisation(d.stock, d.volumes, d.warehouses)
    .filter((p) => p.kind === kind)
    .slice(-n)
    .map((p) => p.utilisation);
}

const flaggedShare = (d: EngineDataset) => {
  const acc = stockAccuracy(d.cycleCounts);
  return acc.filter((a) => a.flagged).length / acc.length;
};

// ── Population controls ─────────────────────────────────────────────────────

describe('BL-102 — the dataset exists and is the one the Hub serves', () => {
  it('examined something: named members present, a known-bad member absent', () => {
    const codes = data.materials.map((m) => m.materialCode);
    expect(codes).toContain('PK-PETB-8801');
    expect(codes).toContain('RM-EMUL-9410');
    expect(codes).not.toContain('RM-SAMPLE-0001');
    expect(data.poLines.length).toBeGreaterThan(100);
  });

  it('uses EVERY material in the one master, and classifies by material type, not by code prefix', () => {
    expect(new Set(data.materials.map((m) => m.materialCode))).toEqual(new Set(Object.keys(MATERIAL_MASTER)));
    for (const m of data.materials) {
      expect(m.kind).toBe(materialEntry(m.materialCode)!.materialType === 'VERP' ? 'packaging' : 'rawMaterial');
      expect(m.uom).toBe(materialEntry(m.materialCode)!.canonicalUom);
    }
    // Both streams are populated from the type alone.
    expect(data.materials.some((m) => m.kind === 'packaging')).toBe(true);
    expect(data.materials.some((m) => m.kind === 'rawMaterial')).toBe(true);
  });

  it('is sized as declared: FG SKUs, 104 weeks of sales ending last week, 26 weeks of POs', () => {
    expect(data.finishedGoods.length).toBe(DEFAULT_SIZES.finishedGoods);
    const weeks = [...new Set(data.sales.map((s) => s.weekStart))].sort();
    expect(weeks.length).toBe(DEFAULT_SIZES.salesWeeks);
    expect(weeks[weeks.length - 1]).toBe(addDays(mondayOf(TODAY), -7));
    for (const w of weeks) expect(mondayOf(w)).toBe(w);
    expect(ENGINE_SUPPLIER_IDS.length).toBeGreaterThanOrEqual(8);
    expect(ENGINE_SUPPLIER_IDS.length).toBeLessThanOrEqual(12);
    const created = data.poLines.map((l) => dayOf(l.createdAt)).sort();
    expect(created[0] >= addDays(TODAY, -(DEFAULT_SIZES.poWeeks + 12) * 7)).toBe(true);
  });

  it('dates everything relative to the declared present: nothing happened after it', () => {
    for (const c of data.confirmations) expect(c.confirmedAt <= NOW).toBe(true);
    for (const c of data.scheduleChanges) expect(c.at <= NOW).toBe(true);
    for (const r of data.receipts) expect(r.receivedDate <= TODAY).toBe(true);
    for (const l of data.poLines) expect(l.createdAt <= NOW).toBe(true);
    for (const s of data.stock) expect(s.date <= TODAY).toBe(true);
    expect(data.stock.map((s) => s.date).sort().pop()).toBe(mondayOf(TODAY));
    // Open lines exist past the present — the future is ordered, not happened.
    expect(data.poLines.some((l) => l.requestedDate > TODAY)).toBe(true);
    // A different present moves the dataset with it.
    const later = generateEngineDataset(engineGeneratorInput(addDays(TODAY, 28) + NOW.slice(10)));
    expect(later.stock.map((s) => s.date).sort().pop()).toBe(mondayOf(addDays(TODAY, 28)));
  });
});

// ── Calibration (E14-01 BR-07) ──────────────────────────────────────────────

describe('BL-102 — calibrated to the owner’s "Challenge & Gaps" measures', () => {
  it('confirmation by the deadline ≈ 67% (±3 pts) — and a dataset nobody confirms leaves the band', () => {
    const rate = confirmationRate(data);
    expect(rate).toBeGreaterThanOrEqual(0.64);
    expect(rate).toBeLessThanOrEqual(0.7);
    const bad = { ...data, confirmations: [] };
    expect(confirmationRate(bad)).toBeLessThan(0.64);
  });

  it('CFOT by its definition ≈ 36% (±3 pts) — and a dataset delivered in full on time leaves the band', () => {
    const rate = cfot(data);
    expect(rate).toBeGreaterThanOrEqual(0.33);
    expect(rate).toBeLessThanOrEqual(0.39);
    const perfect: EngineDataset = {
      ...data,
      receipts: lineHistories(data).map((h, i) => ({
        grNumber: `PROBE-${i}`,
        poNumber: h.line.poNumber,
        line: h.line.line,
        receivedQty: 10 * h.line.orderedQty,
        // Early enough to precede every date a line can be measured against.
        receivedDate: addDays(h.line.requestedDate, -30),
      })),
    };
    expect(cfot(perfect)).toBeGreaterThan(0.39);
  });

  it('packaging warehouse 121–142% of capacity over the latest 13 weekly snapshots — halving stock leaves the band', () => {
    const recent = recentUtilisation(data, 'packaging', 13);
    expect(recent.length).toBe(13);
    for (const u of recent) {
      expect(u).toBeGreaterThanOrEqual(1.21);
      expect(u).toBeLessThanOrEqual(1.42);
    }
    const halved = { ...data, stock: data.stock.map((s) => ({ ...s, onHandQty: s.onHandQty / 2 })) };
    expect(Math.max(...recentUtilisation(halved, 'packaging', 13))).toBeLessThan(1.21);
  });

  it('raw-material warehouse ≈ 106% over the latest 3 weekly snapshots — double capacity leaves the band', () => {
    const recent = recentUtilisation(data, 'rawMaterial', 3);
    const mean = recent.reduce((s, x) => s + x, 0) / recent.length;
    expect(mean).toBeGreaterThanOrEqual(1.04);
    expect(mean).toBeLessThanOrEqual(1.08);
    for (const u of recent) expect(Math.abs(u - 1.06)).toBeLessThanOrEqual(0.03);
    const roomy = { ...data, warehouses: data.warehouses.map((w) => ({ ...w, capacityPallets: w.capacityPallets * 2 })) };
    const after = recentUtilisation(roomy, 'rawMaterial', 3);
    expect(after.reduce((s, x) => s + x, 0) / after.length).toBeLessThan(1.04);
  });

  it('10–20% of materials fail the 2% stock-accuracy check (ENG-D2) — perfect counts leave the band', () => {
    const share = flaggedShare(data);
    expect(share).toBeGreaterThanOrEqual(0.1);
    expect(share).toBeLessThanOrEqual(0.2);
    const exact = { ...data, cycleCounts: data.cycleCounts.map((c) => ({ ...c, countedQty: c.systemQty })) };
    expect(flaggedShare(exact)).toBeLessThan(0.1);
  });
});

// ── Determinism ─────────────────────────────────────────────────────────────

describe('BL-102 — deterministic', () => {
  it('the same seed yields an identical dataset', () => {
    const a = generateEngineDataset(engineGeneratorInput(NOW, ENGINE_DATASET_SEED));
    const b = generateEngineDataset(engineGeneratorInput(NOW, ENGINE_DATASET_SEED));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).toBe(JSON.stringify(data));
  });

  it('a different seed yields a different dataset (the equality above is not vacuous)', () => {
    const other = generateEngineDataset(engineGeneratorInput(NOW, ENGINE_DATASET_SEED + 1));
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(data));
  });
});

// ── Referential integrity ───────────────────────────────────────────────────

const ctx = {
  isKnownMaterial: (code: string) => isKnownMaterial(code),
  isKnownSupplier: (id: string) => mockSuppliers.some((s) => s.id === id),
};

describe('BL-102 — referential integrity', () => {
  it('no violation: every material resolves in MATERIAL_MASTER, every line is sourced, every event has its line', () => {
    expect(integrityViolations(data, ctx)).toEqual([]);
  });

  it('the checker fires, BY NAME, on each kind of defect it guards', () => {
    const line = data.poLines[0];
    const bad: EngineDataset = {
      ...data,
      receipts: [...data.receipts, { grNumber: 'PROBE-GR', poNumber: 'SYN-PO-99999', line: 10, receivedQty: 1, receivedDate: TODAY }],
      poLines: [...data.poLines, { ...line, line: 990, materialCode: 'RM-SAMPLE-0001' }, { ...line, line: 991, supplierId: 'sup-004' }],
      bom: [...data.bom, { ...data.bom[0], parentCode: 'PK-PETB-8801' }],
    };
    const rules = integrityViolations(bad, ctx).map((v) => `${v.rule}:${v.detail}`);
    expect(rules).toContain('ORPHAN_EVENT:SYN-PO-99999#10');
    expect(rules).toContain('UNKNOWN_MATERIAL:RM-SAMPLE-0001');
    expect(rules).toContain(`NO_SOURCE:sup-004 × ${line.materialCode}`);
    expect(rules).toContain('BOM_PARENT_NOT_FG:PK-PETB-8801');
  });

  it('BL-115: a yield outside (0, 1] is named (it would divide by zero or turn a loss into a gain); 1 and 0.9 pass', () => {
    const b = data.bom[0];
    const probe = (yieldPct: number) =>
      integrityViolations({ ...data, bom: [{ ...b, yieldPct }] }, ctx)
        .filter((v) => v.rule === 'BOM_YIELD_OUT_OF_RANGE')
        .map((v) => v.detail);
    expect(probe(1)).toEqual([]);
    expect(probe(0.9)).toEqual([]);
    expect(probe(0)).toEqual([`${b.componentCode} yield 0`]);
    expect(probe(1.2)).toEqual([`${b.componentCode} yield 1.2`]);
    expect(probe(Number.NaN)).toEqual([`${b.componentCode} yield NaN`]);
  });

  it('BL-115: the synthetic BOM carries yield 1 on every line (no loss until the BOM feed carries yield)', () => {
    expect(data.bom.length).toBeGreaterThan(0);
    expect(new Set(data.bom.map((l) => l.yieldPct))).toEqual(new Set([1]));
  });

  it('finished goods are new synthetic identities, never materials', () => {
    for (const f of data.finishedGoods) {
      expect(f.skuCode.startsWith('SYN-FG-')).toBe(true);
      expect(isKnownMaterial(f.skuCode)).toBe(false);
    }
  });

  it('every existing supplier–material relationship inside the supplier set is a source', () => {
    const inSet = new Set(ENGINE_SUPPLIER_IDS);
    const pairs = [...SUPPLIER_MATERIAL_RELATIONSHIPS, ...FORECAST_RELATIONSHIPS].filter((r) => inSet.has(r.supplierId));
    expect(pairs.length).toBeGreaterThan(0);
    const sources = new Set(data.sources.map((s) => `${s.supplierId}|${s.materialCode}`));
    for (const r of pairs) expect(sources.has(`${r.supplierId}|${r.materialCode}`)).toBe(true);
    // A stated share is kept: sup-007 carries 70% of PK-PETB-8801 in the forecast sources.
    expect(data.sources.find((s) => s.supplierId === 'sup-007' && s.materialCode === 'PK-PETB-8801')?.share).toBe(0.7);
  });

  it('shares of each material sum to one', () => {
    const byMaterial = new Map<string, number>();
    for (const s of data.sources) byMaterial.set(s.materialCode, (byMaterial.get(s.materialCode) ?? 0) + s.share);
    for (const [, total] of byMaterial) expect(total).toBeCloseTo(1, 9);
  });
});

// ── No machine clock (X-01) ─────────────────────────────────────────────────

describe('BL-102 — the engine never reads the machine clock', () => {
  const ENGINE = 'src/services/engine/';

  it('the machine-clock census walks the engine folder and finds no site in it', () => {
    const census = deriveCensus(process.cwd());
    expect(census.filesWalked).toBeGreaterThan(100);
    expect(census.sites.filter((s) => s.file.startsWith(ENGINE))).toEqual([]);
    // The instrument does fire on an engine-shaped file that reads the clock.
    expect(sitesIn(`${ENGINE}probe.ts`, 'export const t = () => Date.now();').length).toBe(1);
  });

  it('no Math.random call anywhere in the engine (the seeded Rng is the only noise)', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) files.push(p);
      }
    };
    walk(join(process.cwd(), ENGINE));
    expect(files.some((f) => f.endsWith('generate.ts'))).toBe(true);
    const offenders = files.filter((f) => /Math\.random\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
    expect(/Math\.random\s*\(/.test('const x = Math.random();')).toBe(true);
  });
});

// ── CFOT: the definition against the as-built calculation (BL-66) ───────────
//
// The AS-BUILT CFOT (`data/performanceRules.poCfot`, untouched) run over the
// same rows, so the gap to the definition is MEASURED rather than guessed. An
// adapter, not a second implementation: engine rows are reshaped into the
// Hub's `PurchaseOrder` / `GoodsReceipt` (only the fields `poCfot` reads) and
// the shipped function is called unchanged. Mapping:
//   · one Hub PO per `SYN-PO` number; line quantity = what PTI asks for now
//   · `confirmedDeliveryDate` = the latest committed date across its lines
//     (the Hub holds ONE date per PO)
//   · a line confirmed for another quantity or date → an `adjust` response with
//     no planner review, which the as-built binds when SENT (BL-66 (1))
//   · receipts → one goods receipt each, matched by PO and material
// Aggregated as `cfotAggregate` does: Σ on time ÷ Σ ordered.

function asBuiltCfot(histories: readonly LineHistory[], window: CfotWindow): number | null {
  const byPo = new Map<string, LineHistory[]>();
  for (const h of histories) byPo.set(h.line.poNumber, [...(byPo.get(h.line.poNumber) ?? []), h]);
  let ordered = 0;
  let onTime = 0;
  for (const [poNumber, lines] of byPo) {
    const live = lines.filter((h) => requirementAt(h).qty > 0);
    if (live.length === 0) continue;
    const committed = live.map((h) => latestConfirmation(h)?.confirmedDate ?? requirementAt(h).date).sort();
    const confirmedDeliveryDate = committed[committed.length - 1];
    if (confirmedDeliveryDate < window.from || confirmedDeliveryDate > window.to) continue;
    const adjusted = live
      .map((h) => ({ h, c: latestConfirmation(h) }))
      .filter(({ h, c }) => c !== null && (c.confirmedQty !== requirementAt(h).qty || c.confirmedDate !== confirmedDeliveryDate));
    const po = {
      id: poNumber,
      poNumber,
      supplierId: live[0].line.supplierId,
      confirmedDeliveryDate,
      lineItems: live.map((h) => ({ id: String(h.line.line), materialCode: h.line.materialCode, quantity: requirementAt(h).qty })),
      ...(adjusted.length > 0
        ? {
            response: {
              option: 'adjust',
              respondedAt: adjusted[0].c!.confirmedAt,
              lines: adjusted.map(({ h, c }) => ({ lineId: String(h.line.line), counterQty: c!.confirmedQty, counterDate: c!.confirmedDate })),
            },
          }
        : {}),
    } as unknown as PurchaseOrder;
    const receipts = live.flatMap((h) =>
      h.receipts.map(
        (r) =>
          ({
            poNumber,
            receivedDate: r.receivedDate,
            inspectionResults: [{ materialCode: h.line.materialCode, qtyReceived: r.receivedQty }],
          }) as unknown as GoodsReceipt,
      ),
    );
    const row = poCfot(po, receipts);
    if (!row) continue;
    ordered += row.orderedQty;
    onTime += row.deliveredOnTimeQty;
  }
  return ordered > 0 ? onTime / ordered : null;
}

describe('BL-102 — CFOT by definition vs the as-built calculation (BL-66), measured', () => {
  it('both run over the same rows; against the requested date the figure is lower (BR-06)', () => {
    const histories = lineHistories(data);
    const definition = cfotByDefinition(histories, WINDOW);
    const asBuilt = asBuiltCfot(histories, WINDOW);
    expect(definition.perPo.length).toBeGreaterThan(50);
    expect(asBuilt).not.toBeNull();
    expect(asBuilt!).toBeGreaterThan(0);
    expect(asBuilt!).toBeLessThan(1);
    expect(cfotByDefinition(histories, WINDOW, 'requested').rate!).toBeLessThan(definition.rate!);
  });

  it('the adapter is live: a PO received in full on time reads 100% as-built', () => {
    const h = lineHistories(data).find((x) => x.confirmations.length > 0 && requirementAt(x).qty > 0)!;
    const c = latestConfirmation(h)!;
    const ideal: LineHistory = {
      ...h,
      receipts: [{ grNumber: 'PROBE', poNumber: h.line.poNumber, line: h.line.line, receivedQty: requirementAt(h).qty, receivedDate: addDays(c.confirmedDate, -1) }],
    };
    const d = c.confirmedDate;
    // Alone in its PO, confirmed as ordered: the as-built counts it in full.
    const solo: LineHistory = { ...ideal, confirmations: [{ ...c, confirmedQty: requirementAt(h).qty }] };
    expect(asBuiltCfot([solo], { from: d, to: d })).toBe(1);
  });
});
