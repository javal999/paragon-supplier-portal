// ─────────────────────────────────────────────────────────────────────────────
// Referential integrity of an engine dataset (REQ-E14-01).
//
// Every violation is NAMED — a check that only counts cannot say which row to
// fix. Runs the same on the synthetic dataset today and on the Master Data
// Management feed later. Pure: the material master arrives as a predicate, so
// the engine never imports the Hub's fixtures.
// ─────────────────────────────────────────────────────────────────────────────

import { lineKey, type EngineDataset } from './types';

export interface IntegrityViolation {
  readonly rule:
    | 'UNKNOWN_MATERIAL'
    | 'UNKNOWN_SUPPLIER'
    | 'NO_SOURCE'
    | 'ORPHAN_EVENT'
    | 'BOM_PARENT_NOT_FG'
    | 'FG_IS_A_MATERIAL'
    | 'UNKNOWN_FG';
  readonly where: string;
  readonly detail: string;
}

export interface IntegrityContext {
  /** Does the one material master name this code? */
  readonly isKnownMaterial: (materialCode: string) => boolean;
  /** Does the supplier master name this id? */
  readonly isKnownSupplier: (supplierId: string) => boolean;
}

export function integrityViolations(d: EngineDataset, ctx: IntegrityContext): IntegrityViolation[] {
  const out: IntegrityViolation[] = [];
  const material = (where: string, code: string) => {
    if (!ctx.isKnownMaterial(code)) out.push({ rule: 'UNKNOWN_MATERIAL', where, detail: code });
  };
  d.materials.forEach((m) => material('materials', m.materialCode));
  d.bom.forEach((b) => material(`bom ${b.parentCode}`, b.componentCode));
  d.sources.forEach((s) => material(`sources ${s.supplierId}`, s.materialCode));
  d.volumes.forEach((v) => material('volumes', v.materialCode));
  d.stock.forEach((s) => material(`stock ${s.date}`, s.materialCode));
  d.cycleCounts.forEach((c) => material(`cycleCounts ${c.countDate}`, c.materialCode));
  d.poLines.forEach((l) => material(`poLines ${l.poNumber}/${l.line}`, l.materialCode));
  d.planVersions.forEach((v) => material(`planVersions ${v.supplierId} v${v.versionNo}`, v.materialCode));
  d.sapSafetyStock.forEach((s) => material('sapSafetyStock', s.materialCode));

  for (const id of new Set([...d.sources.map((s) => s.supplierId), ...d.poLines.map((l) => l.supplierId)])) {
    if (!ctx.isKnownSupplier(id)) out.push({ rule: 'UNKNOWN_SUPPLIER', where: 'sources/poLines', detail: id });
  }

  const sourced = new Set(d.sources.map((s) => `${s.supplierId}|${s.materialCode}`));
  for (const l of d.poLines) {
    if (!sourced.has(`${l.supplierId}|${l.materialCode}`)) {
      out.push({ rule: 'NO_SOURCE', where: `poLines ${l.poNumber}/${l.line}`, detail: `${l.supplierId} × ${l.materialCode}` });
    }
  }
  for (const v of d.planVersions) {
    if (!sourced.has(`${v.supplierId}|${v.materialCode}`)) {
      out.push({ rule: 'NO_SOURCE', where: `planVersions v${v.versionNo}`, detail: `${v.supplierId} × ${v.materialCode}` });
    }
  }

  const lines = new Set(d.poLines.map((l) => lineKey(l.poNumber, l.line)));
  const event = (kind: string, poNumber: string, line: number) => {
    if (!lines.has(lineKey(poNumber, line))) out.push({ rule: 'ORPHAN_EVENT', where: kind, detail: lineKey(poNumber, line) });
  };
  d.confirmations.forEach((c) => event('confirmations', c.poNumber, c.line));
  d.receipts.forEach((r) => event(`receipts ${r.grNumber}`, r.poNumber, r.line));
  d.scheduleChanges.forEach((c) => event('scheduleChanges', c.poNumber, c.line));

  const fgs = new Set(d.finishedGoods.map((f) => f.skuCode));
  for (const b of d.bom) {
    if (!fgs.has(b.parentCode)) out.push({ rule: 'BOM_PARENT_NOT_FG', where: 'bom', detail: b.parentCode });
  }
  const skus = new Set<string>([...d.fgPlan.map((p) => p.skuCode), ...d.salesOrders.map((o) => o.skuCode)]);
  for (const sku of skus) {
    if (!fgs.has(sku)) out.push({ rule: 'UNKNOWN_FG', where: 'fgPlan/salesOrders', detail: sku });
  }
  for (const f of d.finishedGoods) {
    if (ctx.isKnownMaterial(f.skuCode)) out.push({ rule: 'FG_IS_A_MATERIAL', where: 'finishedGoods', detail: f.skuCode });
  }
  return out;
}
