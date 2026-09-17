// ────────────────────────────────────────────────────────────────────────────
// Mutable stores for forecast collaboration (REQ-E06-01 to REQ-E06-03).
//
// Same contract as the other mock stores: commands add new rows, reads resolve
// from here, `reset()` restores the seed for tests. Both are append-only — a
// published version is never edited (a change is a new version), and a view is
// recorded once per supplier × version.
//   · forecastVersionStore — every published version of each stream
//   · forecastViewStore    — when a supplier first opened a version
// Commitments are RequirementResponses and live in `requirementResponseStore`.
// ────────────────────────────────────────────────────────────────────────────

import type { ForecastPublication } from '../../../sdc/types';
import { FORECAST_VERSION_SEED, FORECAST_VIEW_SEED } from '../fixtures/forecastHub';

export interface ForecastViewRecord {
  readonly id: string;
  readonly publicationId: string;
  readonly supplierId: string;
  readonly viewedAt: string;
}

let versions: ForecastPublication[] = [...FORECAST_VERSION_SEED];

export const forecastVersionStore = {
  all(): readonly ForecastPublication[] {
    return versions;
  },
  get(publicationId: string): ForecastPublication | undefined {
    return versions.find((v) => v.publicationId === publicationId);
  },
  add(version: ForecastPublication): void {
    versions = [...versions, version];
  },
  reset(): void {
    versions = [...FORECAST_VERSION_SEED];
  },
};

let views: ForecastViewRecord[] = FORECAST_VIEW_SEED.map((v) => ({ ...v }));
let viewSeq = FORECAST_VIEW_SEED.length;

export const forecastViewStore = {
  all(): readonly ForecastViewRecord[] {
    return views;
  },
  get(id: string): ForecastViewRecord | undefined {
    return views.find((v) => v.id === id);
  },
  find(publicationId: string, supplierId: string): ForecastViewRecord | undefined {
    return views.find((v) => v.publicationId === publicationId && v.supplierId === supplierId);
  },
  add(row: ForecastViewRecord): void {
    views = [...views, row];
  },
  nextId(): string {
    viewSeq += 1;
    return `fv-${String(viewSeq).padStart(4, '0')}`;
  },
  reset(): void {
    views = FORECAST_VIEW_SEED.map((v) => ({ ...v }));
    viewSeq = FORECAST_VIEW_SEED.length;
  },
};
