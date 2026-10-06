import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { forecastUxEn, forecastUxId } from './forecastUx';
import { hubEn, hubId } from './hub';
import { orderPlanEn, orderPlanId } from './orderPlan';
import { rescheduleEn, rescheduleId } from './reschedule';
import { stabiliseEn, stabiliseId } from './stabilise';
import { forecastCollaborationEn, forecastCollaborationId } from './forecastCollaboration';
import { demandForecastEn, demandForecastId } from './demandForecast';
import { forecastBiasEn, forecastBiasId } from './forecastBias';
import { materialRequirementEn, materialRequirementId } from './materialRequirement';
import { safetyStockEn, safetyStockId } from './safetyStock';
import { dataHealthEn, dataHealthId } from './dataHealth';

// ─────────────────────────────────────────────────────────────────────────────
// FUX phase 3, C1 — strings that phases 1 and 2 left without a reader.
//
// Derived from every key in forecastUx.js, hub.js and the strings files of the
// 13 forecast pages that no non-test source file reads, counting keys read
// through template literals (`fux.thisWeek.card.${id}`) and through prefix
// tables (`BUILT_IN_LABEL_PREFIX`: `fc.reason.`, `fb.reason.`) as read.
// `fux.purpose.${page}` reads only the ids of `ForecastPageId` and
// 'performance', so the 2 purpose lines of pages that became tabs are unused.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, [Record<string, string>, Record<string, string>]>} */
const LOCALES = {
  forecastUx: [forecastUxEn, forecastUxId],
  hub: [hubEn, hubId],
  orderPlan: [orderPlanEn, orderPlanId],
  reschedule: [rescheduleEn, rescheduleId],
  stabilise: [stabiliseEn, stabiliseId],
  forecastCollaboration: [forecastCollaborationEn, forecastCollaborationId],
  demandForecast: [demandForecastEn, demandForecastId],
  forecastBias: [forecastBiasEn, forecastBiasId],
  materialRequirement: [materialRequirementEn, materialRequirementId],
  safetyStock: [safetyStockEn, safetyStockId],
  dataHealth: [dataHealthEn, dataHealthId]
};

/** @type {Record<string, string[]>} */
const REMOVED = {
  forecastUx: ['fux.purpose.publishedVersions', 'fux.purpose.forecastBias'],
  hub: [
    'hub.nav.section.forecast',
    'hub.nav.pti.forecasts',
    'hub.nav.pti.commitments',
    'hub.nav.pti.fsReconcile',
    'hub.nav.pti.reliability',
    'hub.nav.pti.materialRequirement',
    'hub.nav.pti.safetyStock',
    'hub.nav.pti.orderPlan',
    'hub.nav.pti.reschedule',
    'hub.nav.pti.stabilise',
    'hub.nav.pti.dataHealth',
    'hub.nav.pti.demandForecast',
    'hub.nav.pti.forecastBias',
    'hub.nav.pti.modelBacktest',
    'hub.nav.pti.engine.publishedVersions',
    'hub.nav.pti.engine.forecastBias',
    'hub.home.count.one',
    'hub.home.count.other'
  ],
  orderPlan: ['op.title'],
  reschedule: ['rs.title', 'rs.meta.plan'],
  stabilise: ['stb.title', 'stb.meta.plan'],
  forecastCollaboration: [
    'fc.sup.submit',
    'fc.sup.revise',
    'fc.sup.submitFor',
    'fc.pti.versions.title',
    'fc.pti.gaps.title'
  ],
  demandForecast: ['df.title'],
  forecastBias: ['fb.title'],
  materialRequirement: ['mrq.meta.plan'],
  safetyStock: ['sst.meta.plan'],
  dataHealth: ['dh.meta.checked']
};

/**
 * Known readers, one per way a key is read: literal, template literal, prefix table.
 * @type {Record<string, string[]>}
 */
const STILL_USED = {
  forecastUx: ['fux.purpose.whatToOrder', 'fux.purpose.performance', 'fux.thisWeek.card.publish'],
  hub: ['hub.nav.pti.whatToOrder', 'hub.nav.pti.engine.safetyStock', 'hub.home.severity.critical'],
  orderPlan: ['op.meta.plan'],
  forecastCollaboration: ['fc.reason.capacity'],
  forecastBias: ['fb.reason.market-info'],
  safetyStock: ['sst.title']
};

/**
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function sourceFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (
      /\.(t|j)sx?$/.test(e.name) &&
      !/\.(test|spec)\.(t|j)sx?$/.test(e.name) &&
      !p.includes(`${path.sep}test${path.sep}`)
    )
      out.push(p);
  }
  return out;
}

describe('FUX3 C1 — unused forecast strings are gone', () => {
  it.each(Object.entries(REMOVED))(
    '%s: every derived unused key is gone from EN and ID',
    (file, keys) => {
      const [en, id] = LOCALES[file];
      for (const key of keys) {
        expect(en[key], `${key} (EN)`).toBeUndefined();
        expect(id[key], `${key} (ID)`).toBeUndefined();
      }
    }
  );

  it.each(Object.entries(STILL_USED))(
    '%s: a known-used key is still present in EN and ID',
    (file, keys) => {
      const [en, id] = LOCALES[file];
      for (const key of keys) {
        expect(en[key], `${key} (EN)`).toBeTruthy();
        expect(id[key], `${key} (ID)`).toBeTruthy();
      }
    }
  );

  it('no source file reads a removed key', () => {
    const root = path.resolve(__dirname, '../..');
    const i18nDir = path.resolve(__dirname);
    const text = sourceFiles(root)
      .filter((f) => path.dirname(f) !== i18nDir)
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n');
    const removed = Object.values(REMOVED).flat();
    // Control: the scan reads source, so a key with a known literal reader is found.
    expect(text).toContain("'hub.nav.pti.whatToOrder'");
    for (const key of removed) {
      expect(
        text.includes(`'${key}'`) || text.includes(`"${key}"`) || text.includes(`\`${key}\``),
        key
      ).toBe(false);
    }
  });
});
