// ─────────────────────────────────────────────────────────────────────────────
// BL-243 (U-07) — one name for the Foresight commitments page in every string,
// as IA R-2 named it ("Foresight commitments", ID "Komitmen foresight"): the
// supplier alert link and body, the PTI tab, the consolidation note and the
// supplier Capacity sentence. Applying R-2, not a rename (FSR-D7).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { inventoryCapacityEn, inventoryCapacityId } from './inventoryCapacity';
import { forecastCollaborationEn, forecastCollaborationId } from './forecastCollaboration';

const OLD_NAMES =
  /commitments & gaps|komitmen & selisih|forecast & commitments|prakiraan & komitmen/i;

describe('BL-243 — the page carries one name', () => {
  it('no string in either locale keeps an old name', () => {
    for (const dict of [
      inventoryCapacityEn,
      inventoryCapacityId,
      forecastCollaborationEn,
      forecastCollaborationId
    ]) {
      for (const [key, text] of Object.entries(dict)) expect(text, key).not.toMatch(OLD_NAMES);
    }
  });

  it('the alert link and the PTI tab use the R-2 name', () => {
    expect(inventoryCapacityEn['inv.alerts.openCommitments']).toBe('Open Foresight commitments');
    expect(inventoryCapacityId['inv.alerts.openCommitments']).toBe('Buka Komitmen foresight');
    expect(forecastCollaborationEn['fc.pti.pageTab.gaps']).toBe('Foresight commitments');
    expect(forecastCollaborationId['fc.pti.pageTab.gaps']).toBe('Komitmen foresight');
  });
});
