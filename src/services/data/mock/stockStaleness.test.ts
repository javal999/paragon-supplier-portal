// ────────────────────────────────────────────────────────────────────────────
// Material B1 — staleness by update mode through the REAL read model
// (MR-1 BR-05, AC-02, edge case 1; AR-07). The positions carry `staleAt`, and
// the unchanged `stockFreshness(position, now)` and the staleData alert read it.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { activeAlertConditions, allPositions } from './inventoryReadModel';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { stockSyncStore } from './stores/inventoryHubStores';
import { supplierOverlayStore } from './stores/supplierOverlayStore';
import { stockFreshness } from '../../transitions/inventoryRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

beforeEach(() => {
  inventoryDeclarationStore.reset();
  stockSyncStore.reset();
  supplierOverlayStore.reset();
  sdcClock.reset();
});
afterEach(() => {
  supplierOverlayStore.reset();
  sdcClock.reset();
});

const positionAt = (now: string, supplierId: string, materialCode: string) =>
  allPositions(now).find((p) => p.supplierId === supplierId && p.materialCode === materialCode)!;
const staleKeys = (now: string) => activeAlertConditions(now).filter((c) => c.rule === 'staleData').map((c) => c.key);

describe('AC-02 · a manual material turns stale the moment the Thursday cutoff passes, and raises staleData', () => {
  // sup-009 (manual) last updated AI-VITC-6730 on Thursday 27 Aug, 09:00 WIB,
  // inside the cycle that closed that night; nothing since.
  const BEFORE = '2026-09-03T16:59:00.000Z'; // Thursday 3 Sep, 23:59 WIB — the cutoff
  const AFTER = '2026-09-03T16:59:00.001Z';

  it('current at the cutoff, stale just after it; the alert follows', () => {
    const p = positionAt(BEFORE, 'sup-009', 'AI-VITC-6730');
    expect(p.lastUpdatedAt).toBe('2026-08-27T02:00:00.000Z');
    expect(p.staleAt).toBe(BEFORE);
    expect(stockFreshness(p, BEFORE)).toBe('current');
    expect(staleKeys(BEFORE)).not.toContain('staleData|AI-VITC-6730|sup-009');
    expect(stockFreshness(positionAt(AFTER, 'sup-009', 'AI-VITC-6730'), AFTER)).toBe('stale');
    expect(staleKeys(AFTER)).toContain('staleData|AI-VITC-6730|sup-009');
  });

  it('known-good: a material updated in the cycle after (Friday 28 Aug) stays current past that cutoff', () => {
    expect(stockFreshness(positionAt(AFTER, 'sup-009', 'AI-PANTO-6640'), AFTER)).toBe('current');
  });
});

describe('edge case 1 · a mode change mid-cycle takes effect at the next cycle', () => {
  // sup-008 (manual) last updated PK-CART-9901 on Saturday 29 Aug; no override.
  const switchToApi = (setAt: string) =>
    supplierOverlayStore.append({ supplierId: 'sup-008', stockUpdateMode: 'api', setAt, setBy: NO_PERSON });

  it('switched to API on Monday 31 Aug: judged manual until the cutoff, by the API rule after it', () => {
    switchToApi('2026-08-31T01:00:00.000Z');
    const monday = '2026-08-31T12:00:00.000Z';
    expect(positionAt(monday, 'sup-008', 'PK-CART-9901').staleAt).toBe('2026-09-10T16:59:00.000Z');
    expect(stockFreshness(positionAt(monday, 'sup-008', 'PK-CART-9901'), monday)).toBe('current');
    // The next cycle starts at the Thursday cutoff: now the last good pull decides,
    // and there is none since the figure of 29 Aug.
    const friday = '2026-09-04T01:00:00.000Z';
    const p = positionAt(friday, 'sup-008', 'PK-CART-9901');
    expect(p.staleAt).toBe('2026-08-30T02:00:00.000Z');
    expect(stockFreshness(p, friday)).toBe('stale');
  });

  it('known-good: without the switch the same figure is still current that Friday', () => {
    const friday = '2026-09-04T01:00:00.000Z';
    expect(stockFreshness(positionAt(friday, 'sup-008', 'PK-CART-9901'), friday)).toBe('current');
  });
});

describe('owner ruling 2026-09-29 · API: 24 hours after the last SUCCESSFUL pull wins; a failed pull only warns', () => {
  // sup-008 is set to API well before this cycle, pulled successfully on
  // Monday 31 Aug 08:00 WIB, and its pull failed at 09:00 WIB. No override.
  const SUCCESS = '2026-08-31T01:00:00.000Z';
  const FAILED = '2026-08-31T02:00:00.000Z';
  beforeEach(() => {
    supplierOverlayStore.append({ supplierId: 'sup-008', stockUpdateMode: 'api', setAt: '2026-08-01T00:00:00.000Z', setBy: NO_PERSON });
    const figure = inventoryDeclarationStore.latestFor('sup-008', 'PK-CART-9901')!;
    inventoryDeclarationStore.add({ ...figure, id: 'inv-test-b1', declaredAt: SUCCESS, channel: 'api' });
    stockSyncStore.add({ id: 'sync-b1-ok', supplierId: 'sup-008', at: SUCCESS, outcome: 'success' });
    stockSyncStore.add({ id: 'sync-b1-ko', supplierId: 'sup-008', at: FAILED, outcome: 'failed', errorKey: 'timeout' });
  });

  it('the failed pull at 09:00 leaves the figure current, with the warning, until 24 h after the success', () => {
    const monday = '2026-08-31T12:00:00.000Z';
    const p = positionAt(monday, 'sup-008', 'PK-CART-9901');
    expect(p.lastPullFailedAt).toBe(FAILED);
    expect(p.staleAt).toBe('2026-09-01T01:00:00.000Z');
    expect(stockFreshness(p, monday)).toBe('current');
    expect(staleKeys(monday)).not.toContain('staleData|PK-CART-9901|sup-008');
    const atLimit = '2026-09-01T01:00:00.000Z';
    expect(stockFreshness(positionAt(atLimit, 'sup-008', 'PK-CART-9901'), atLimit)).toBe('current');
  });

  it('after 24 h it is stale and raises staleData', () => {
    const past = '2026-09-01T01:00:00.001Z';
    expect(stockFreshness(positionAt(past, 'sup-008', 'PK-CART-9901'), past)).toBe('stale');
    expect(staleKeys(past)).toContain('staleData|PK-CART-9901|sup-008');
  });

  it('known-good: a later successful pull clears the warning', () => {
    stockSyncStore.add({ id: 'sync-b1-ok2', supplierId: 'sup-008', at: '2026-08-31T03:00:00.000Z', outcome: 'success' });
    expect(positionAt('2026-08-31T12:00:00.000Z', 'sup-008', 'PK-CART-9901').lastPullFailedAt).toBeNull();
  });
});
