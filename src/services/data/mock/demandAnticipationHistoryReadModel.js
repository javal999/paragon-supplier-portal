// ────────────────────────────────────────────────────────────────────────────
// DRC-3 (BL-189) — the demand anticipation history read over the mock stores:
// every publication the append-only store holds (DRC-2), with the call-offs'
// approved delays (DRC-5) and the names the page shows. The rows are the pure
// rules' (`demandAnticipationHistory`); nothing is recomputed here.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DaHistoryRow } from '../../transitions/demandAnticipationHistory' */
import { materialEntry } from '../../sdc';
import { daHistoryRows } from '../../transitions/demandAnticipationHistory';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { callOffStore } from './stores/callOffStore';
import { allCommitmentLines } from './forecastReadModel';
import { supplierNameOf } from './inventoryReadModel';
// The read model registers the store's seed; importing it makes sure the
// history opens on the same seeded publication the Demand anticipation page does.
import './demandAnticipationReadModel';

/**
 * Every publication × supplier × material, newest publication first.
 * @returns {DaHistoryRow[]}
 */
export function allDemandAnticipationHistory() {
  const lines = allCommitmentLines(null);
  /** @param {string} supplierId */
  const nameOf = (supplierId) =>
    lines.find((l) => l.supplierId === supplierId)?.supplierName ?? supplierNameOf(supplierId);
  return daHistoryRows(demandAnticipationStore.all(), callOffStore.all()).map((r) => {
    const entry = materialEntry(r.materialCode);
    return {
      ...r,
      supplierName: nameOf(r.supplierId),
      materialLabel: entry?.label ?? r.materialCode,
      uom: entry?.canonicalUom ?? ''
    };
  });
}
