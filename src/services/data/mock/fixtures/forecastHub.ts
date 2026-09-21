// ────────────────────────────────────────────────────────────────────────────
// Forecast collaboration sample data (REQ-E06-01 to REQ-E06-03), dated
// relative to the declared present.
//
// Two forecast streams, two versions each, built by the same rules the
// re-publish verb uses (`forecastRules.buildVersion`):
//   · Packaging (weekly, then monthly) — version 1 ten days ago, version 2
//     three days ago. sup-007 PT Sample Packaging supplies both bottles and
//     shares PK-PETB-8801 with sup-012.
//   · Raw material (monthly) — version 1 four weeks ago, version 2 an
//     emergency re-publication THIS MORNING (Monday 10:00 WIB — moved from four
//     days ago for the BL-48 demo, below). sup-002 PT Sample Specialty Fats
//     supplies both materials and shares RM-EMUL-9410 with sup-005, a
//     distributor waiting on its principal.
//
// What each seed shows at the declared present (all derived, never stored):
//   sup-007 — version 2 not yet opened (a Home task); a commitment carried
//     from version 1 and still accepted; a version-1 commitment within the
//     Trade-off tolerance whose week is now Firm, so it is an exception; a
//     changed Firm week back to awaiting and overdue; a Trade-off week 22%
//     short (Red); a week committed within 10%; an over-commit; a Forecast
//     week acknowledged; an unsubmitted draft PTI cannot see.
//   sup-012 — never opened version 2; its Firm weeks are overdue (escalation).
//   sup-002 — a Firm month 21% short (Red, High alert); a Firm over-commit
//     (information); a changed Trade-off month back to awaiting; a Trade-off
//     month within tolerance; a draft.
//   sup-005 — a distributor with a 60-day principal lead time (coverage).
//
// THE BL-48 DEADLINE DEMO (CR-26, on the hub working calendar; present =
// Monday 31 August 19:00 WIB). All four are derived, none is stored:
//   · A FIRM PERIOD DUE TOMORROW — raw-material v2 is published this morning,
//     so its Firm months are due Tuesday 1 September 10:00; sup-005 has not
//     answered its September month.
//   · (falls out of CR-26, not planted) A COMMITMENT SUBMITTED LATE — sup-002
//     answered raw-material v1's Firm September an hour after that version's
//     1-working-day deadline; carried forward, it keeps that verdict.
//   · A FIRM PERIOD ALREADY LATE — packaging v2 (Friday 09:00) was due Monday
//     09:00; sup-007's and sup-012's awaiting Firm weeks are late.
//   · 3 WORKING DAYS OVER A WEEKEND AND A HOLIDAY — packaging v2's Trade-off
//     and Forecast weeks: Monday, Tuesday, [Wednesday 2 September: the plant
//     shutdown in the SAP factory calendar], Thursday 3 September 09:00.
//   · AN ADMINISTRATOR OVERRIDE MOVES A DEADLINE — raw-material v2's Trade-off
//     and Forecast months: Tuesday, [Wednesday: shutdown], Thursday, [Friday 4:
//     collective leave the administrator ruled, `SEEDED_CALENDAR_RULINGS`],
//     Monday 7 September 10:00. Without the ruling it would be Friday 4.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
import type {
  ForecastPublication,
  Provenance,
  RequirementResponse,
  SupplierMaterialRelationship,
} from '../../../sdc/types';
import { materialEntry } from '../../../sdc/materialMaster';
import {
  buildVersion,
  generatePeriods,
  periodBounds,
  type ForecastPeriod,
  type ForecastSource,
} from '../../../transitions/forecastRules';
import type { ForecastStream } from '../../../sdc/types';

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/** An instant `offset` days from the declared present at `hourUtc` (WIB is UTC+7). */
const at = (offset: number, hourUtc: number) => new Date(P + offset * DAY_MS + hourUtc * 3_600_000).toISOString();

/** Which supplier carries which share of a material's demand. */
export const FORECAST_SOURCES: readonly ForecastSource[] = [
  { supplierId: 'sup-007', materialCode: 'PK-PETB-8801', share: 0.7 },
  { supplierId: 'sup-012', materialCode: 'PK-PETB-8801', share: 0.3 },
  { supplierId: 'sup-007', materialCode: 'PK-PETB-8802', share: 1 },
  { supplierId: 'sup-002', materialCode: 'RM-EMUL-9410', share: 0.7 },
  { supplierId: 'sup-005', materialCode: 'RM-EMUL-9410', share: 0.3 },
  { supplierId: 'sup-002', materialCode: 'RM-STEAR-7300', share: 1 },
];

/**
 * Every supplier qualified to supply a material — the suppliers a planner can
 * move demand to (REQ-E06-03 BR-05), including approved alternates that carry
 * no share today.
 */
export const QUALIFIED_SUPPLIERS: Readonly<Record<string, readonly string[]>> = {
  'PK-PETB-8801': ['sup-007', 'sup-012'],
  'PK-PETB-8802': ['sup-007', 'sup-012'],
  'RM-EMUL-9410': ['sup-002', 'sup-005', 'sup-010'],
  'RM-STEAR-7300': ['sup-002', 'sup-001'],
};

/** PTI's planned daily demand per material — the stand-in for the SAP planning run. */
export const PLANNED_DAILY_DEMAND: Readonly<Record<string, number>> = {
  'PK-PETB-8801': 7000,
  'PK-PETB-8802': 5500,
  'RM-EMUL-9410': 200,
  'RM-STEAR-7300': 420,
};

const periodDays = (p: ForecastPeriod) =>
  Math.round((Date.parse(`${p.end}T00:00:00.000Z`) - Date.parse(`${p.start}T00:00:00.000Z`)) / DAY_MS) + 1;

/** Base demand for a material in a period: daily demand × days. */
export const baseDemand = (materialCode: string, period: ForecastPeriod): number =>
  (PLANNED_DAILY_DEMAND[materialCode] ?? 0) * periodDays(period);

const sourcesOf = (stream: ForecastStream) =>
  FORECAST_SOURCES.filter((s) => (materialEntry(s.materialCode)?.materialType === 'VERP') === (stream === 'packaging'));

const version = (
  stream: ForecastStream,
  n: number,
  publishedAt: string,
  factors: Readonly<Record<string, number>> = {},
  emergency = false,
): ForecastPublication =>
  buildVersion({
    stream,
    version: n,
    publishedAt,
    sources: sourcesOf(stream),
    master: materialEntry,
    demand: (code, period, index) => baseDemand(code, period) * (factors[`${code}|${index}`] ?? 1),
    emergency,
  });

const PK_V1_AT = at(-10, 2);
const PK_V2_AT = at(-3, 2);
const RM_V1_AT = at(-28, 2);
const RM_V2_AT = at(0, 3); // BL-48 demo: this morning, Monday 10:00 WIB

const PK_V1 = version('packaging', 1, PK_V1_AT);
const PK_V2 = version('packaging', 2, PK_V2_AT, {
  'PK-PETB-8802|0': 1.1,
  'PK-PETB-8801|3': 0.9,
  'PK-PETB-8801|5': 1.15,
});
const RM_V1 = version('rawMaterial', 1, RM_V1_AT);
const RM_V2 = version(
  'rawMaterial',
  2,
  RM_V2_AT,
  { 'RM-EMUL-9410|1': 1.2, 'RM-STEAR-7300|2': 0.85, 'RM-STEAR-7300|4': 1.1 },
  true,
);

/** The seeded versions, oldest first per stream. */
export const FORECAST_VERSION_SEED: readonly ForecastPublication[] = [PK_V1, PK_V2, RM_V1, RM_V2];

const PK_WEEKS = generatePeriods('packaging', PK_V2_AT).map((p) => p.id);
const RM_MONTHS = generatePeriods('rawMaterial', RM_V2_AT).map((p) => p.id);

const PROV_SUBMITTED: Provenance = { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' };
const PROV_DRAFT: Provenance = { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'PLANNED' };

let seq = 0;
/** A commitment against a line that MUST exist in the named version. */
function commit(
  pub: ForecastPublication,
  supplierId: string,
  materialCode: string,
  periodBucket: string,
  answer: { qty?: number; reason?: string; upside?: number; draft?: boolean; ack?: string },
  submittedAt: string,
): RequirementResponse {
  const line = pub.lines.find((l) => l.supplierId === supplierId && l.materialCode === materialCode && l.periodBucket === periodBucket);
  if (!line) throw new Error(`forecast seed: no line ${supplierId} ${materialCode} ${periodBucket} in ${pub.publicationId}`);
  seq += 1;
  const base = {
    id: `rr-fc-${String(seq).padStart(4, '0')}`,
    supplierId,
    materialCode,
    periodBucket,
    publicationId: pub.publicationId,
    planVersion: pub.planVersion,
    submissionVersion: 1,
  };
  if (answer.ack !== undefined) {
    return { ...base, submittedAt, status: 'Submitted', acknowledgment: answer.ack ? { note: answer.ack } : {}, provenance: PROV_SUBMITTED };
  }
  return {
    ...base,
    ...(answer.draft ? {} : { submittedAt }),
    status: answer.draft ? 'Draft' : 'Submitted',
    forecastConfirmation: {
      confirmedQty: answer.qty ?? line.forecastQty,
      uom: line.uom,
      committedDate: periodBounds(periodBucket).start,
      ...(answer.upside !== undefined ? { upsideQty: answer.upside } : {}),
    },
    ...(answer.reason ? { rootCause: { level1: answer.reason } } : {}),
    provenance: answer.draft ? PROV_DRAFT : PROV_SUBMITTED,
  };
}

const V1_PK_ANSWERED = at(-9, 3);
const V2_PK_ANSWERED = at(-2, 2);
const V1_RM_ANSWERED = at(-27, 3);
const V2_RM_ANSWERED = at(0, 6); // Monday 13:00 WIB, after this morning's publication

/** Seeded commitments (RequirementResponses) against the forecast versions. */
export const FORECAST_COMMITMENT_SEED: readonly RequirementResponse[] = [
  // — Packaging, answered on version 1 —
  commit(PK_V1, 'sup-007', 'PK-PETB-8801', PK_WEEKS[0], {}, V1_PK_ANSWERED),
  commit(PK_V1, 'sup-007', 'PK-PETB-8801', PK_WEEKS[1], { qty: 31000, reason: 'capacity' }, V1_PK_ANSWERED),
  commit(PK_V1, 'sup-007', 'PK-PETB-8801', PK_WEEKS[2], {}, V1_PK_ANSWERED),
  commit(PK_V1, 'sup-007', 'PK-PETB-8802', PK_WEEKS[0], {}, V1_PK_ANSWERED),
  // — Packaging, answered on version 2 —
  commit(PK_V2, 'sup-007', 'PK-PETB-8802', PK_WEEKS[1], {}, V2_PK_ANSWERED),
  commit(PK_V2, 'sup-007', 'PK-PETB-8802', PK_WEEKS[2], { qty: 36000, reason: 'logistics' }, V2_PK_ANSWERED),
  commit(PK_V2, 'sup-007', 'PK-PETB-8802', PK_WEEKS[3], { qty: 30000, reason: 'material' }, V2_PK_ANSWERED),
  commit(PK_V2, 'sup-007', 'PK-PETB-8802', PK_WEEKS[4], { qty: 40000, upside: 5000 }, V2_PK_ANSWERED),
  commit(PK_V2, 'sup-007', 'PK-PETB-8801', PK_WEEKS[8], { ack: 'Seen; moulds are booked for this month.' }, V2_PK_ANSWERED),
  commit(PK_V2, 'sup-007', 'PK-PETB-8802', PK_WEEKS[5], { draft: true, qty: 38500 }, V2_PK_ANSWERED),
  // — Raw material, answered on version 1 —
  commit(RM_V1, 'sup-002', 'RM-EMUL-9410', RM_MONTHS[0], {}, V1_RM_ANSWERED),
  commit(RM_V1, 'sup-002', 'RM-EMUL-9410', RM_MONTHS[1], {}, V1_RM_ANSWERED),
  // BL-48 demo: sup-005 has NOT answered its Firm month, so on this morning's
  // version it is due tomorrow (Tuesday 1 September 10:00 WIB). It used to
  // carry a version-1 commitment here.
  // — Raw material, answered on version 2 —
  commit(RM_V2, 'sup-002', 'RM-STEAR-7300', RM_MONTHS[0], { qty: 10000, reason: 'capacity' }, V2_RM_ANSWERED),
  commit(RM_V2, 'sup-002', 'RM-STEAR-7300', RM_MONTHS[1], { qty: 14000 }, V2_RM_ANSWERED),
  commit(RM_V2, 'sup-002', 'RM-EMUL-9410', RM_MONTHS[2], { qty: 3800, reason: 'quality' }, V2_RM_ANSWERED),
  commit(RM_V2, 'sup-002', 'RM-STEAR-7300', RM_MONTHS[2], { draft: true, qty: 9000, reason: 'capacity' }, V2_RM_ANSWERED),
];

/** When each supplier first opened a version (REQ-E06-01: PTI sees who viewed it). */
export const FORECAST_VIEW_SEED: readonly { readonly id: string; readonly publicationId: string; readonly supplierId: string; readonly viewedAt: string }[] = [
  { id: 'fv-0001', publicationId: PK_V1.publicationId, supplierId: 'sup-007', viewedAt: at(-10, 5) },
  { id: 'fv-0002', publicationId: RM_V1.publicationId, supplierId: 'sup-002', viewedAt: at(-28, 6) },
  { id: 'fv-0003', publicationId: RM_V1.publicationId, supplierId: 'sup-005', viewedAt: at(-27, 2) },
  { id: 'fv-0004', publicationId: RM_V2.publicationId, supplierId: 'sup-002', viewedAt: at(0, 4) },
];

/** Supplier × material relationships for the forecast materials (coverage, BR-07). */
export const FORECAST_RELATIONSHIPS: readonly SupplierMaterialRelationship[] = [
  { supplierId: 'sup-007', materialCode: 'PK-PETB-8801', supplierType: 'manufacturer' },
  { supplierId: 'sup-012', materialCode: 'PK-PETB-8801', supplierType: 'manufacturer' },
  { supplierId: 'sup-007', materialCode: 'PK-PETB-8802', supplierType: 'manufacturer' },
  { supplierId: 'sup-002', materialCode: 'RM-EMUL-9410', supplierType: 'manufacturer' },
  {
    supplierId: 'sup-005',
    materialCode: 'RM-EMUL-9410',
    supplierType: 'distributor',
    principals: [{ principalId: 'PRIN-EMUL-02', principalLeadTimeDays: 60 }],
  },
  { supplierId: 'sup-002', materialCode: 'RM-STEAR-7300', supplierType: 'manufacturer' },
];

/** Exported for tests: the period ids of the seeded current versions. */
export const SEEDED_PACKAGING_WEEKS = PK_WEEKS;
export const SEEDED_RAW_MATERIAL_MONTHS = RM_MONTHS;
