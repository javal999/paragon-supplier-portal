// ────────────────────────────────────────────────────────────────────────────
// The forecast collaboration read model over the mock stores (REQ-E06-01 to 03).
//
// ONE place gathers the version, view and commitment stores and hands them to
// the pure rules (`transitions/forecastRules`), so the read service, the
// command targets and the alert engine see the same lines. Nothing computed
// here is stored.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ForecastCommitmentLine, ForecastCoverageRow, ForecastVersionView } from '../types' */
/** @import { ForecastPublication, ForecastStream } from '../../sdc/types' */
import { mockSuppliers } from '@data/mockSuppliers';
import { FORECAST_PUBLICATIONS } from '../../sdc/fixtures';
import { materialEntry } from '../../sdc/materialMaster';
import { supplierCoverageEntries } from '../../sdc/consolidation';
import { sdcClock } from '../../sdc/clock';
import {
  buildCommitmentLines,
  streamVersions,
  versionChanges
} from '../../transitions/forecastRules';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
import { ptiStockStore } from './stores/ptiStockStore';
import { FORECAST_RELATIONSHIPS, QUALIFIED_SUPPLIERS } from './fixtures/forecastHub';

/**
 * @param {string} supplierId
 * @returns {string}
 */
export const forecastSupplierName = (supplierId) =>
  mockSuppliers.find((s) => s.id === supplierId)?.name ?? supplierId;

/** @type {readonly ForecastStream[]} */
export const STREAMS = ['packaging', 'rawMaterial'];

/**
 * A publication by id — a forecast version or an SDC-0 publication.
 * @param {string} publicationId
 * @returns {ForecastPublication | undefined}
 */
export function forecastPublicationById(publicationId) {
  return (
    forecastVersionStore.get(publicationId) ??
    FORECAST_PUBLICATIONS.find((p) => p.publicationId === publicationId)
  );
}

/**
 * @param {string} publicationId
 * @returns {boolean}
 */
export const isForecastVersion = (publicationId) =>
  forecastVersionStore.get(publicationId) !== undefined;

/**
 * The current version of a stream.
 * @param {ForecastStream} stream
 * @returns {ForecastPublication | null}
 */
export function currentVersion(stream) {
  const versions = streamVersions(forecastVersionStore.all(), stream);
  return versions[versions.length - 1] ?? null;
}

/**
 * FUX-D3 — the current version number of a stream (as `allVersionViews` numbers it), or null when none is published.
 * @param {ForecastStream} stream
 * @returns {number | null}
 */
export function currentPlanVersion(stream) {
  const versions = streamVersions(forecastVersionStore.all(), stream);
  const last = versions[versions.length - 1];
  return last ? (last.version ?? versions.length) : null;
}

/**
 * Suppliers qualified to supply a material (REQ-E06-03 BR-05 reassignment targets).
 * @param {string} materialCode
 * @returns {readonly string[]}
 */
export const qualifiedSuppliers = (materialCode) => QUALIFIED_SUPPLIERS[materialCode] ?? [];

/**
 * Every current line with its commitment. `draftsFor` adds that supplier's own drafts.
 * @param {string | null} [draftsFor]
 * @returns {ForecastCommitmentLine[]}
 */
export function allCommitmentLines(draftsFor = null) {
  // PEX-3 BR-02 (BL-284) — PTI stock on hand per material, the SOH term of the
  // heads-up note's gap: the hub's SAP stock records (BL-199), all plants summed.
  const stock = ptiStockStore.combined();
  return buildCommitmentLines({
    publications: forecastVersionStore.all(),
    responses: requirementResponseStore.all(),
    master: materialEntry,
    supplierName: forecastSupplierName,
    draftsFor,
    qualifiedSuppliers,
    ptiStock: (materialCode) => stock.find((r) => r.materialCode === materialCode)?.ptiSoh ?? null
  });
}

/**
 * Every version with the suppliers it carries and when each first opened it.
 * @returns {ForecastVersionView[]}
 */
export function allVersionViews() {
  /** @type {ForecastVersionView[]} */
  const out = [];
  for (const stream of STREAMS) {
    const versions = streamVersions(forecastVersionStore.all(), stream);
    versions.forEach((v, i) => {
      const supplierIds = [...new Set(v.lines.map((l) => l.supplierId))].sort();
      out.push({
        publicationId: v.publicationId,
        planVersion: v.planVersion,
        stream,
        version: v.version ?? i + 1,
        publishedAt: v.publishedAt,
        emergency: v.emergency === true,
        changeNote: v.changeNote ?? null,
        isCurrent: i === versions.length - 1,
        suppliers: supplierIds.map((supplierId) => ({
          supplierId,
          supplierName: forecastSupplierName(supplierId),
          viewedAt: forecastViewStore.find(v.publicationId, supplierId)?.viewedAt ?? null,
          changedPeriods: versionChanges(v, versions[i - 1] ?? null, supplierId).length
        }))
      });
    });
  }
  return out.sort((a, b) => a.stream.localeCompare(b.stream) || b.version - a.version);
}

/**
 * REQ-E06-03 BR-07 — supplier coverage per material against the Firm demand of
 * the current version (CR-03), through the SDC coverage indicator, with the
 * principal lead time for a distributor. Modelled, so the page labels it an
 * estimate.
 * @param {string} [nowIso]
 * @returns {ForecastCoverageRow[]}
 */
export function allCoverageRows(nowIso = sdcClock.now()) {
  /** @type {ForecastCoverageRow[]} */
  const rows = [];
  for (const stream of STREAMS) {
    const current = currentVersion(stream);
    if (!current) continue;
    /** @type {ForecastPublication} */
    const firmOnly = {
      ...current,
      lines: current.lines.filter((l) => l.commitmentClass === 'firm')
    };
    const entries = supplierCoverageEntries(
      [firmOnly],
      inventoryDeclarationStore.all(),
      incomingShipmentStore.all(),
      FORECAST_RELATIONSHIPS,
      nowIso
    );
    for (const e of entries) {
      const rel = FORECAST_RELATIONSHIPS.find(
        (r) => r.supplierId === e.supplierId && r.materialCode === e.materialCode
      );
      const leadTimes =
        rel?.supplierType === 'distributor'
          ? (rel.principals ?? []).map((p) => p.principalLeadTimeDays)
          : [];
      const s = e.status;
      rows.push({
        stream,
        supplierId: e.supplierId,
        supplierName: forecastSupplierName(e.supplierId),
        materialCode: e.materialCode,
        materialLabel: materialEntry(e.materialCode)?.label ?? e.materialCode,
        uom: e.uom,
        firmDemandQty: e.committedDemandQty,
        ratio: s.kind === 'no-declaration' ? null : s.ratio,
        status:
          s.kind === 'no-declaration' ? 'noFigures' : s.kind === 'at-risk' ? 'atRisk' : s.kind,
        supplierType: rel?.supplierType ?? 'manufacturer',
        principalLeadTimeDays: leadTimes.length > 0 ? Math.min(...leadTimes) : null,
        unbridgeable: s.kind === 'at-risk' || s.kind === 'uncovered' ? s.unbridgeable : false
      });
    }
  }
  return rows.sort(
    (a, b) =>
      a.materialCode.localeCompare(b.materialCode) || a.supplierName.localeCompare(b.supplierName)
  );
}
