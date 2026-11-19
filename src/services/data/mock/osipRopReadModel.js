// ────────────────────────────────────────────────────────────────────────────
// BL-196 (DRC-10, DRC-D11) and BL-198 (DRC-12a) — the material-level inputs of
// the OSIP ROPs, beside the per-supplier inputs `osipSafetyReadModel` gathers.
//
//   · level — the OSIP level in force per material (`osipLevelStore`, the
//     `t_osiplevel_set` ledger), [Default C2] level 4 when none was set;
//   · NPD — every variant's tag [Default D1], from:
//       firstOrderFulfilled: the PO store's lines and the goods receipts'
//         accepted quantities, as the hub holds them;
//       oneYearAfterLaunch / 52WeeksHistory: the engine dataset's finished
//         goods (launch date) and weekly sell-in, through the BOM lines valid
//         this week.
//   · the NPD observation ledger: `observeNpdTags` records the tag under the
//     rule in force, and a DROP (NPD → not NPD) raises the planner's "Review
//     ROP after first order" task (`openNpdReviews`). It runs around every
//     command (the alert ledger's `observeAlertConditions` precedent): only a
//     command or the clock moves a tag, and the observation before a command
//     is the baseline the one after it is compared with.
//
// Everything else is computed at read and never stored (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

/** @import { FirstOrder, MaterialRopInputs, NpdReview, NpdRule, NpdTag, OsipRopFigures, RopFigure } from '../../transitions/osipRopRules' */
import { MATERIAL_MASTER, sdcClock } from '../../sdc';
import { dayOf, mondayOf } from '../../engine/dates';
import { RULES_VERSION, stamp } from '../../transitions/osipRules';
import {
  OSIP_ROP_READ,
  firstOrder,
  npdObservations,
  npdTags,
  openNpdReviews,
  osipLevelInForce,
  osipRops
} from '../../transitions/osipRopRules';
import { osipSafety } from '../../transitions/osipSafetyRules';
import { osipSafetyInputs } from './osipSafetyReadModel';
import { engineDataset } from './fixtures/engineDataset';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { osipLevelStore } from './stores/osipLevelStore';
import { npdTagStore } from './stores/npdTagStore';

/**
 * DRC-12a — the first order of one material from the PO and GR stores.
 * @param {string} materialCode
 * @returns {FirstOrder}
 */
function firstOrderOf(materialCode) {
  const poLines = purchaseOrderStore.all().flatMap((po) =>
    po.lineItems
      .filter((l) => l.materialCode === materialCode)
      .map((l) => ({
        poNumber: po.poNumber,
        orderDate: po.orderDate,
        status: po.status,
        quantity: l.quantity,
        valueOnly: l.valueLimit !== undefined
      }))
  );
  const receipts = goodsReceiptStore.all().flatMap((gr) =>
    gr.inspectionResults
      .filter((i) => i.materialCode === materialCode)
      .map((i) => ({
        poNumber: gr.poNumber,
        receivedDate: gr.receivedDate,
        status: gr.status,
        qtyAccepted: i.qtyAccepted
      }))
  );
  return firstOrder(poLines, receipts);
}

/**
 * The launch dates and first sales weeks of the SKUs whose BOM lines valid
 * this week name each material.
 * @param {string} nowIso
 * @returns {(materialCode: string) => { parentLaunches: string[]; parentFirstSales: (string | null)[] }}
 */
function parentsReader(nowIso) {
  const data = engineDataset();
  const week = mondayOf(dayOf(nowIso));
  const links = data.bom.filter(
    (b) => b.validFrom <= week && (b.validTo === undefined || week < b.validTo)
  );
  /** @type {Map<string, string | null>} */
  const firstSale = new Map();
  for (const s of data.sales) {
    if (s.weekStart >= week || s.quantity <= 0) continue;
    const seen = firstSale.get(s.skuCode);
    if (seen === undefined || seen === null || s.weekStart < seen)
      firstSale.set(s.skuCode, s.weekStart);
  }
  return (materialCode) => {
    const parents = [
      ...new Set(links.filter((b) => b.componentCode === materialCode).map((b) => b.parentCode))
    ];
    return {
      parentLaunches: parents.flatMap((p) => {
        const fg = data.finishedGoods.find((f) => f.skuCode === p);
        return fg ? [fg.launchDate] : [];
      }),
      parentFirstSales: parents.map((p) => firstSale.get(p) ?? null)
    };
  };
}

/**
 * BL-196 / BL-198 — the level and NPD tags of every material, at the hub clock.
 * @param {readonly string[]} materialCodes
 * @param {string} [nowIso]
 * @returns {Map<string, MaterialRopInputs>}
 */
export function osipRopInputs(materialCodes, nowIso = sdcClock.now()) {
  const today = dayOf(nowIso);
  const parents = parentsReader(nowIso);
  /** @type {Map<string, MaterialRopInputs>} */
  const out = new Map();
  for (const code of materialCodes) {
    const fo = firstOrderOf(code);
    out.set(code, {
      level: osipLevelInForce(osipLevelStore.forMaterial(code)),
      npd: npdTags({ today, firstOrder: fo, ...parents(code) }),
      firstOrder: fo
    });
  }
  return out;
}

/**
 * The tag of every master material under one rule. The default variant reads
 * only the PO and GR stores; the dataset is built only for the other two.
 * @param {NpdRule} rule
 * @param {string} nowIso
 * @returns {Map<string, NpdTag>}
 */
function tagsUnder(rule, nowIso) {
  const today = dayOf(nowIso);
  const parents =
    rule === 'firstOrderFulfilled'
      ? () => ({ parentLaunches: [], parentFirstSales: [] })
      : parentsReader(nowIso);
  return new Map(
    Object.keys(MATERIAL_MASTER).map((code) => [
      code,
      npdTags({ today, firstOrder: firstOrderOf(code), ...parents(code) })[rule]
    ])
  );
}

/**
 * DRC-12a — record every material's tag under the rule in force; a drop raises
 * the review task (`npdObservations`). Each stored tag keeps its inputs and
 * `RULES_VERSION` (DRC-D16).
 * @param {string} [nowIso]
 * @returns {void}
 */
export function observeNpdTags(nowIso = sdcClock.now()) {
  const rule = OSIP_ROP_READ.npdRule;
  const rows = npdObservations(
    npdTagStore.all(),
    tagsUnder(rule, nowIso),
    rule,
    nowIso,
    (materialCode, tag) => stamp(tag, { materialCode, rule, today: dayOf(nowIso) }, RULES_VERSION),
    (materialCode) => osipLevelStore.plannerCount(materialCode)
  );
  if (rows.length > 0) npdTagStore.append(rows);
}

/**
 * DRC-12a — the open "Review ROP after first order" tasks.
 * @returns {NpdReview[]}
 */
export function npdReviews() {
  return openNpdReviews(npdTagStore.all(), (materialCode) =>
    osipLevelStore.plannerCount(materialCode)
  );
}

/**
 * DRC-10 — every supplier × material's ROP Order, ROP Fisik, Max and supplier
 * ROPs under the default rules, the level in force and the NPD rule in force:
 * what the PTI stock view's ROP Supplier, the alert rules' `systemMax` and the
 * ROP-level view read. Keyed `<supplierId>|<materialCode>`.
 * @param {string} [nowIso]
 * @returns {Map<string, OsipRopFigures>}
 */
export function systemRopFigures(nowIso = sdcClock.now()) {
  const osip = osipSafetyInputs(nowIso);
  const rop = osipRopInputs([...osip.keys()], nowIso);
  /** @type {Map<string, OsipRopFigures>} */
  const out = new Map();
  for (const [code, m] of osip) {
    const r = /** @type {MaterialRopInputs} */ (rop.get(code));
    const npd = r.npd[OSIP_ROP_READ.npdRule].npd;
    for (const s of m.suppliers) {
      const safety = osipSafety({ ...s, npd });
      out.set(`${s.supplierId}|${code}`, osipRops(s, safety, r.level.level));
    }
  }
  return out;
}

/**
 * DRC-D15 — the system's ROP Supplier of every supplier × material, under the
 * default rules, the level in force and the NPD rule in force: what the PTI
 * stock view shows beside the supplier's own (display-only) reorder point.
 * Keyed `<supplierId>|<materialCode>`.
 * @param {string} [nowIso]
 * @returns {Map<string, RopFigure>}
 */
export function systemRopSuppliers(nowIso = sdcClock.now()) {
  /** @type {Map<string, RopFigure>} */
  const out = new Map();
  for (const [key, f] of systemRopFigures(nowIso)) out.set(key, f.supplier.ropSupplier);
  return out;
}
