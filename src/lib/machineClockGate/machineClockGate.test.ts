// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE MACHINE-CLOCK GATE.
//
// No non-test `src/` module reads the machine clock (`new Date()` with no
// argument, or `Date.now()`) unless the site is allowlisted with the reason it
// is honest. Everything else reads the hub clock.
//
// ── THE ORDER OF THIS FILE IS THE ARGUMENT (the moduleScopeLiteralGate shape) ─
//   1. THE SELF-PROBE runs first, both directions, on synthetic input: a
//      known-GOOD input must PASS before a known-BAD input's failure means
//      anything.
//   2. THE POPULATION GUARD asserts the tree walk saw real files and a known
//      member (`EMPTY-INPUT-REPORTS-CLEAN-01`).
//   3. THE TREE runs last, bilaterally against `allowlist.ts`.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'node:path';
import { deriveCensus, judge, siteKey, sitesIn, type AllowRow, type Census } from './derive';
import { MACHINE_CLOCK_ALLOWLIST } from './allowlist';

const ROOT = join(__dirname, '..', '..', '..');

// ═══ THE SYNTHETIC INPUT ═════════════════════════════════════════════════════
const GOOD = `
  // A comment that says new Date() is not a site.
  const note = 'nor is a string: Date.now()';
  export const parsed = new Date('2026-08-31');          // a parse, not a clock read
  export const fromMs = new Date(1_788_000_000_000);     // likewise
  export function mintId() { return \`id-\${Date.now()}\`; } // allowlisted below
`;
const BAD = `
  export function stampRecord() {
    return { createdAt: new Date().toISOString() };
  }
  export const bare = new Date;
  export const wrapped = new Date(Date.now() - 1000);
  export const viaGlobal = new globalThis.Date();
`;
const SYNTH_ALLOW: readonly AllowRow[] = [
  { key: 'src/Good.ts::mintId::Date.now()', count: 1, why: 'unique-id', reason: 'An id suffix, never shown as a date.' },
];

describe('machine-clock gate · the self-probe', () => {
  it('ACCEPTS a known-good input: comments, strings and parses are not sites; an allowlisted id passes', () => {
    const sites = sitesIn('src/Good.ts', GOOD);
    expect(sites.map(siteKey)).toEqual(['src/Good.ts::mintId::Date.now()']);
    const v = judge(sites, SYNTH_ALLOW);
    expect(v).toEqual({ unlisted: [], stale: [], miscounted: [], unreasoned: [] });
  });

  it('FLAGS every argument-less spelling, BY NAME', () => {
    const v = judge(sitesIn('src/Bad.ts', BAD), []);
    expect(v.unlisted.map((s) => `${s.owner} ${s.kind}`)).toEqual([
      'stampRecord.createdAt new Date()',
      'bare new Date()',
      'wrapped Date.now()',
      'viaGlobal new Date()',
    ]);
  });

  it('is BILATERAL: a row naming no live site is stale, and a changed count is caught', () => {
    const stale = judge([], SYNTH_ALLOW);
    expect(stale.stale.map((r) => r.key)).toEqual(['src/Good.ts::mintId::Date.now()']);
    const twice = sitesIn('src/Good.ts', `export function mintId() { return [Date.now(), Date.now()]; }`);
    const mis = judge(twice, SYNTH_ALLOW);
    expect(mis.miscounted).toEqual([{ row: SYNTH_ALLOW[0], live: 2 }]);
  });

  it('refuses a row with no real reason', () => {
    const v = judge([], [{ key: 'x', count: 1, why: 'unique-id', reason: 'ok' }]);
    expect(v.unreasoned.map((r) => r.key)).toEqual(['x']);
  });
});

// ═══ THE TREE ════════════════════════════════════════════════════════════════
describe('machine-clock gate · the tree', () => {
  let census: Census;
  beforeAll(() => {
    census = deriveCensus(ROOT);
  });

  it('examined the tree at all (membership, never a count)', () => {
    expect(census.filesWalked).toBeGreaterThan(100);
    // A known member: the toast id fallback. Chosen because no clock batch has
    // reason to touch it.
    expect(census.sites.some((s) => s.file === 'src/hooks/useToast.ts')).toBe(true);
    // A known NON-member: specs are out of scope.
    expect(census.sites.some((s) => /\.test\.tsx?$/.test(s.file))).toBe(false);
  });

  it('no machine-clock read outside the allowlist', () => {
    const v = judge(census.sites, MACHINE_CLOCK_ALLOWLIST);
    const report = v.unlisted.map((s) => `  ${s.file}:${s.line}  ${s.owner}  ${s.kind}`).join('\n');
    expect(
      v.unlisted,
      `Machine-clock reads with no allowlist row:\n${report}\n\n` +
        'Fix: read the hub clock (`sdcClock.now()` from src/services/sdc/clock, or the ' +
        "lane's alias rfxNow/ordersNow/forecastNow/inventoryNow). Only if the value is an id, " +
        'a live time of day, or test-harness state, add a row to src/lib/machineClockGate/allowlist.ts ' +
        'with its reason.',
    ).toEqual([]);
  });

  it('the allowlist is BILATERAL — every row still names a live site, at its exact count', () => {
    const v = judge(census.sites, MACHINE_CLOCK_ALLOWLIST);
    const stale = v.stale.map((r) => r.key);
    expect(stale, `Rows naming no live site — delete them:\n  ${stale.join('\n  ')}`).toEqual([]);
    expect(
      v.miscounted.map((m) => `${m.row.key}: row says ${m.row.count}, tree has ${m.live}`),
      'Rows whose count moved',
    ).toEqual([]);
    expect(v.unreasoned.map((r) => r.key), 'Rows with no stated reason').toEqual([]);
  });

  it('the allowlist has no duplicate keys', () => {
    const keys = MACHINE_CLOCK_ALLOWLIST.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
