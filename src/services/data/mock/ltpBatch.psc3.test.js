// ─────────────────────────────────────────────────────────────────────────────
// BL-338 (PSC-3) — the batch LTP upload, through the REAL rules and services:
//   · the file: one row per material × week, a refusal per bad row, the last
//     row of a repeated material × week wins and the repeat is listed;
//   · the computed total: the FG plan and the BOM, read from the DRC-18 path —
//     a material used by several finished goods appears once and its total is
//     the sum of their parts; an FG with no plan is left out and named;
//   · the batch dispatch: every material is stamped with uploader, date and
//     file name; the upload wins over the computed total and the difference is
//     derived; the published DA is marked out of date with the LTP cause.
// Every figure is derived from the read or the rules, never restated; named
// members (the material, the FGs) are pinned because a replacement keeps ids.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { fgDemandInputs } from './ltpFgDemandReadModel';
import { ltpInputStore } from './stores/ltpInputStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import {
  compareLtpBatch,
  ltpComputedAvailable,
  parseLtpBatchCsv,
  ltpUploadKey
} from '../../transitions/ltpInputRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {import('../types').QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};

// Named members of the seeded dataset (the seed is pinned; the figures around
// them are derived below). PK-PETB-8802 is used by SYN-FG-011 and SYN-FG-014,
// and SYN-FG-008 carries no plan row (it was discontinued).
const MAT = 'PK-PETB-8802';
const OTHER = 'RM-STEAR-7300';
const NO_PLAN_MAT = '2000028400';
const NO_PLAN_FG = 'SYN-FG-008';
const W1 = '2026-08-31';
const W2 = '2026-09-07';

beforeEach(() => {
  sdcClock.reset();
  ltpInputStore.reset();
  demandAnticipationStore.reset();
  demandAnticipationStore.all();
});
afterEach(() => {
  ltpInputStore.reset();
  sdcClock.reset();
});

/**
 * The DA row as the read actually serves it (DRC-18 + PSC-3 fields included;
 * the service's declared row type predates them).
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly supplierId: string;
 *   readonly share: number | null;
 *   readonly fgUsers?: readonly string[];
 *   readonly noPlanFgs?: readonly string[];
 *   readonly fgDemandAvailable?: boolean;
 *   readonly weeks: readonly {
 *     readonly week: string;
 *     readonly fgDemandMaterial?: number | null;
 *     readonly fgBreakdown?: readonly { readonly skuCode: string; readonly quantity: number }[] | null;
 *   }[];
 *   readonly ltpInputs?: {
 *     readonly hasUpload: boolean;
 *     readonly uploads: Readonly<
 *       Record<
 *         'A' | 'Festive' | 'B',
 *         { readonly sourceFile: string; readonly setAt: string; readonly setBy: unknown } | null
 *       >
 *     >;
 *     readonly byWeek: Readonly<Record<string, { readonly a: number } | undefined>>;
 *   };
 *   readonly outOfDate?: {
 *     readonly causes: readonly {
 *       readonly kind: string;
 *       readonly before: unknown;
 *       readonly after: unknown;
 *       readonly by: unknown;
 *     }[];
 *   } | null;
 * }} BatchRow
 */

/** @param {readonly { materialCode: string; weeks: Record<string, number> }[]} materials */
const batchUpload = async (materials, sourceFile = 'ltp-a-batch.csv') => {
  /** @type {Awaited<ReturnType<MockCommandService['dispatch']>>[]} */
  const out = [];
  for (const m of materials) {
    out.push(
      await cmd.dispatch(planning, {
        transitionId: 't_ltpinput_set',
        entity: 'ltpInput',
        entityId: ltpUploadKey(m.materialCode, 'A'),
        payload: { weeks: m.weeks, sourceFile }
      })
    );
  }
  return out;
};
/** @param {string} materialCode @returns {Promise<BatchRow[]>} */
const rowsOf = async (materialCode) =>
  /** @type {BatchRow[]} */ (
    /** @type {unknown} */ (
      (await svc.getDemandAnticipation(planning)).items.filter(
        (r) => r.materialCode === materialCode
      )
    )
  );

/** @type {readonly { materialCode: string; weeks: Record<string, number> }[]} */
const TWO = [
  { materialCode: MAT, weeks: { [W1]: 20_000, [W2]: 21_000 } },
  { materialCode: OTHER, weeks: { [W1]: 5_000 } }
];

describe('PSC-3 BR-01 — one file, many materials, one row per material × week', () => {
  it('reads a 2-material file into one entry per material', () => {
    const parsed = parseLtpBatchCsv(
      [
        'material,week,quantity',
        `${MAT},${W1},1200`,
        `${MAT},${W2},1300`,
        `${OTHER},${W1},900`
      ].join('\n')
    );
    if ('refusal' in parsed) throw new Error(parsed.refusal);
    expect(parsed.repeated).toEqual([]);
    expect(parsed.materials.map((m) => m.materialCode)).toEqual([MAT, OTHER]);
    expect(parsed.materials[0].weeks).toEqual({ [W1]: 1200, [W2]: 1300 });
    expect(parsed.materials[1].weeks).toEqual({ [W1]: 900 });
  });

  it('reads a headerless file, and semicolons or tabs as separators', () => {
    const parsed = parseLtpBatchCsv(`${MAT};${W1};1200\n${MAT}\t${W2}\t1300`);
    if ('refusal' in parsed) throw new Error(parsed.refusal);
    expect(parsed.materials).toEqual([{ materialCode: MAT, weeks: { [W1]: 1200, [W2]: 1300 } }]);
  });

  it('refuses a row that is not material, week, quantity; a non-Monday; a bad quantity; an empty file', () => {
    /** @param {string} text */
    const refusal = (text) => {
      const parsed = parseLtpBatchCsv(text);
      return 'refusal' in parsed ? parsed.refusal : '';
    };
    expect(refusal(`${MAT},${W1}`)).toMatch(/LTP_BATCH_ROW_INVALID/);
    expect(refusal(`,${W1},1200`)).toMatch(/LTP_BATCH_MATERIAL_REQUIRED/);
    expect(refusal(`${MAT},2026-08-30,1200`)).toMatch(/not a Monday/);
    expect(refusal(`${MAT},${W1},abc`)).toMatch(/not a number from 0/);
    expect(refusal(`${MAT},${W1},-5`)).toMatch(/not a number from 0/);
    expect(refusal('')).toMatch(/LTP_BATCH_EMPTY/);
    expect(refusal('material,week,quantity')).toMatch(/LTP_BATCH_EMPTY/);
  });

  it('keeps the last row of a repeated material × week and lists the repeat', () => {
    const parsed = parseLtpBatchCsv(
      [`${MAT},${W1},1200`, `${MAT},${W1},1500`, `${MAT},${W2},1300`].join('\n')
    );
    if ('refusal' in parsed) throw new Error(parsed.refusal);
    expect(parsed.materials[0].weeks).toEqual({ [W1]: 1500, [W2]: 1300 });
    expect(parsed.repeated).toEqual([{ materialCode: MAT, week: W1 }]);
  });
});

describe('PSC-3 BR-02 / AC-02 — the computed total from the FG plan and the BOM', () => {
  it('a material used by several FGs appears once; its total is the sum of the FG parts', () => {
    const inputs = fgDemandInputs(sdcClock.now());
    const parts = inputs.breakdown?.get(MAT);
    if (!parts) throw new Error('the engine holds no breakdown for the material');
    const week = W1;
    const fgs = parts.get(week) ?? [];
    // Named members: both planned FGs behind the material's first week.
    expect(fgs.map((p) => p.skuCode).sort()).toEqual(['SYN-FG-011', 'SYN-FG-014']);
    const sum = fgs.reduce((n, p) => n + p.quantity, 0);
    expect(sum).toBeCloseTo(inputs.totals?.get(MAT)?.get(week) ?? Number.NaN, 6);
  });

  it('the read serves the same total on every supplier row of the material, with the breakdown behind it', async () => {
    const rows = await rowsOf(MAT);
    expect(rows.length).toBeGreaterThan(0);
    const totals = new Set(rows.map((r) => JSON.stringify(r.weeks.map((w) => w.fgDemandMaterial))));
    expect(totals.size).toBe(1);
    for (const w of rows[0].weeks) {
      const sum = (w.fgBreakdown ?? []).reduce((n, p) => n + p.quantity, 0);
      expect(sum).toBeCloseTo(w.fgDemandMaterial ?? Number.NaN, 6);
    }
  });
});

describe('PSC-3 BR-04 / AC-04 — no FG plan, no upload', () => {
  it('a material no FG uses reads Not available, and the read says why', async () => {
    const rows = await rowsOf(NO_PLAN_MAT);
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0];
    expect(r.fgUsers).toEqual([]);
    expect(r.noPlanFgs).toEqual([]);
    expect(ltpComputedAvailable(r)).toBe(false);
    // No upload in force: the material has nothing to read but "Not available".
    expect(r.ltpInputs?.hasUpload).toBe(false);
  });

  it('an FG with no plan is left out of the total and named for the page', async () => {
    const rows = await rowsOf(MAT);
    const r = rows[0];
    expect(r.fgUsers).toContain(NO_PLAN_FG);
    expect(r.noPlanFgs).toEqual([NO_PLAN_FG]);
    // Some FG behind the material still has a plan, so the total is available.
    expect(ltpComputedAvailable(r)).toBe(true);
    // The left-out FG contributes no part of the total.
    const skus = new Set(r.weeks.flatMap((w) => (w.fgBreakdown ?? []).map((p) => p.skuCode)));
    expect(skus.has(NO_PLAN_FG)).toBe(false);
  });
});

describe('PSC-3 BR-02 / BR-03 / BR-06 — the batch dispatch', () => {
  it('AC-01: one batch file uploads every material, each stamped with uploader, date and file name', async () => {
    const results = await batchUpload(TWO);
    expect(results.map((r) => r.status)).toEqual(['done', 'done']);
    const ledger = ltpInputStore.all();
    expect(ledger.map((r) => `${r.materialCode}|${r.series}|${r.sourceFile}`)).toEqual([
      `${MAT}|A|ltp-a-batch.csv`,
      `${OTHER}|A|ltp-a-batch.csv`
    ]);
    for (const m of TWO) {
      const rows = await rowsOf(m.materialCode);
      for (const r of rows) {
        const upload = r.ltpInputs?.uploads.A;
        expect(upload).toMatchObject({ sourceFile: 'ltp-a-batch.csv' });
        // The stamp is the hub clock's instant, not read from the payload.
        expect(upload?.setAt).toBe(sdcClock.now());
        // The uploader is the session's actor: the seam's honest placeholder.
        expect(upload?.setBy).toEqual(NO_PERSON);
      }
    }
  });

  it('the upload wins over the computed total; both figures and the difference are derived', async () => {
    const uploaded = 40_000;
    const inputs = fgDemandInputs(sdcClock.now());
    const computed = Object.fromEntries(
      [...(inputs.totals?.get(MAT) ?? new Map())].map(([week, qty]) => [week, qty])
    );
    await batchUpload([{ materialCode: MAT, weeks: { [W1]: uploaded } }]);
    const rows = await rowsOf(MAT);
    for (const r of rows) {
      const week = r.weeks.find((w) => w.week === W1);
      // The grid reads the upload, per supplier share (BR-02: the upload is the override).
      expect(r.ltpInputs?.byWeek[W1]?.a).toBe(Math.round(uploaded * (r.share ?? 0)));
      // The computed total stays readable beside it; the difference is uploaded − computed.
      expect(week?.fgDemandMaterial).toBeCloseTo(computed[W1] ?? Number.NaN, 6);
      expect(ltpComputedAvailable(r)).toBe(true);
    }
    const [row] = compareLtpBatch({ [W1]: uploaded }, computed);
    expect(row.uploaded).toBe(uploaded);
    expect(row.computed).toBeCloseTo(computed[W1] ?? Number.NaN, 6);
    expect(row.difference).toBeCloseTo(uploaded - (computed[W1] ?? Number.NaN), 6);
    // A week the hub holds no total for keeps the upload and no difference.
    expect(compareLtpBatch({ [W1]: uploaded }, {})[0].difference).toBeNull();
  });

  it('AC-05: a batch upload marks the published DA out of date with the LTP A cause', async () => {
    const before = (await rowsOf(MAT))[0];
    expect(before.outOfDate).toBeNull();
    const weeks = { [W1]: 20_000, [W2]: 21_000 };
    await batchUpload([{ materialCode: MAT, weeks }]);
    const marked = (await rowsOf(MAT)).filter((r) => r.outOfDate);
    expect(marked.length).toBeGreaterThan(0);
    for (const r of marked) {
      const cause = (r.outOfDate?.causes ?? []).find((c) => c.kind === 'ltpA');
      expect(cause).toMatchObject({ before: null, after: 41_000 });
      expect(cause?.by).toEqual(NO_PERSON);
    }
    // A material the file did not name is not marked.
    for (const r of await rowsOf(OTHER)) expect(r.outOfDate).toBeNull();
  });
});
