/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
/** @import { Column, CellProps } from 'react-datasheet-grid' */
import { DataSheetGrid, keyColumn, intColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './plan-grid/planGrid.css';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import Data from '@components/ui-v2/Data';
import LivenessPill from '@components/ui-v2/LivenessPill';
import PlanCellMarker from './plan-grid/PlanCellMarker';
import { dataCell, textCell } from './plan-grid/cells';
import IntakeAdjustDrawer from './plan-grid/IntakeAdjustDrawer';
import FullScreenSection from './plan-grid/FullScreenSection';
import { useQuotations } from '@services/query/hooks';
import { formatIDR, formatNumber } from '@lib/format';
import { mockSuppliers } from '@data/mockSuppliers';
/** @import { AwardCriterionKey, AwardScenarioRow, PrIntakeLine, WhatIfWeights } from './plan-grid/planGridModel' */
import {
  AWARD_CRITERIA,
  DEFAULT_WEIGHTS,
  awardScenarioRows,
  buildWhatIfOverlay,
  SAMPLE_INTAKE_LINES,
  selectedLine
} from './plan-grid/planGridModel';

// The editable weights row: the engine's int cells can be cleared to null; we
// coerce back to a non-null WhatIfWeights on change (guards the recompute NaN).
/** @typedef {Record<AwardCriterionKey, number | null>} WeightRow */

// ────────────────────────────────────────────────────────────────────────────
// PlanGrid (Stage G · G1.2a) — the READ-ONLY procurement-execution grid.
//
// First lazy-loaded route on main; the react-datasheet-grid engine ships in
// this page's async chunk (route-split — see AppRouter). The engine is strictly
// data-in / data-out: it renders the arrays we pass and emits edit events for
// the what-if WEIGHTS grid; every score is recomputed in pure TS
// (planGridModel), and the seam `aiCompositeScore` is NEVER written back. The
// registry (`purchaseRequisitions`, gate-2 shut) keeps every honest marker
// SIMULATED — green is structurally unreachable. NOTHING here dispatches (G1.2b).
// ────────────────────────────────────────────────────────────────────────────

const AWARD_RFQ = 'rfq-003';

// Fixed DSG heights (px). Each DSG's container is PINNED to its height via
// `--plan-dsg-h` + planGrid.css so it cannot auto-shrink to few-row content —
// the react-resize-detector feedback loop that pinning removes (see planGrid.css).
// These are the ONE source of truth for both the `height` prop and the pin.
const DSG_H = /** @type {const} */ ({ weights: 88, award: 176, intake: 216 });
/** @param {number} h */
const dsgVar = (h) => /** @type {React.CSSProperties} */ ({ '--plan-dsg-h': `${h}px` });

/**
 * @param {string} id
 * @returns {string}
 */
const supplierName = (id) => mockSuppliers.find((s) => s.id === id)?.name ?? id;

// dataCell/textCell (the read-only mono/sans cell helpers) moved to the shared
// ./plan-grid/cells module when the SDC consolidation grid became the second
// DSG consumer (SDC-1b).

/**
 * @typedef {AwardScenarioRow & {
 *     supplierName: string;
 *     whatIf: number;
 *   }} AwardDisplayRow
 */

/** @type {React.FC} */
const PlanGrid = () => {
  const { t } = useTranslation();
  const quotationsQuery = useQuotations();
  const quotations = quotationsQuery.data?.items ?? [];

  // The editable what-if weights (client state). Editing a weight cell in the
  // weights grid updates this; the award what-if column recomputes in pure TS.
  const [weights, setWeights] = useState(/** @type {WhatIfWeights} */ (DEFAULT_WEIGHTS));

  // G1.3.2 — the working-set selection: which intake line the drawer edits. The
  // intake DSG's "Adjust" action column sets this; the drawer reads it via the
  // pure `selectedLine` resolver. One line at a time — the working set of one.
  const [selectedLineId, setSelectedLineId] = useState(/** @type {string | null} */ (null));

  const awardRows = useMemo(() => awardScenarioRows(quotations, AWARD_RFQ), [quotations]);

  // C6 §2: the PLANNED overlay is a SEPARATE id-keyed map, recomputed from the
  // weights — never merged into the seam rows. The seam `aiCompositeScore` below
  // is read straight off awardRows and is structurally untouched by this.
  const overlay = useMemo(() => buildWhatIfOverlay(awardRows, weights), [awardRows, weights]);

  /** @type {AwardDisplayRow[]} */
  const awardDisplay = useMemo(
    () =>
      awardRows.map((r) => ({
        ...r,
        supplierName: supplierName(r.supplierId),
        whatIf: overlay[r.id]
      })),
    [awardRows, overlay]
  );

  // The weights grid is ONE editable row; each criterion is an editable int
  // cell. The engine emits the change; we lift it into `weights` (coercing a
  // cleared/null cell back to 0 so the pure-TS recompute never sees NaN).
  const weightsRow = /** @type {WeightRow[]} */ (useMemo(() => [{ ...weights }], [weights]));
  const weightColumns = /** @type {Column<WeightRow>[]} */ (
    useMemo(
      () =>
        AWARD_CRITERIA.map((c) => ({
          .../** @type {typeof keyColumn<WeightRow, typeof c.key>} */ (keyColumn)(c.key, intColumn),
          title: t(c.labelKey),
          minWidth: 90
        })),
      [t]
    )
  );
  /** @param {WeightRow[]} rows */
  const onWeightsChange = (rows) => {
    const r = rows[0];
    if (!r) return;
    setWeights({
      compliance: r.compliance ?? 0,
      price: r.price ?? 0,
      leadTime: r.leadTime ?? 0,
      reliability: r.reliability ?? 0
    });
  };

  const awardColumns = /** @type {Column<AwardDisplayRow>[]} */ (
    useMemo(
      () => [
        {
          title: t('planGrid.award.col.supplier'),
          disabled: true,
          grow: 2,
          minWidth: 180,
          component: /** @type {typeof textCell<AwardDisplayRow>} */ (textCell)(
            (r) => r.supplierName
          )
        },
        ...AWARD_CRITERIA.map((c) => ({
          title: t(c.labelKey),
          disabled: true,
          minWidth: 90,
          component: /** @type {typeof dataCell<AwardDisplayRow>} */ (dataCell)(
            (r) => r[c.scoreField]
          )
        })),
        {
          title: t('planGrid.award.col.seamScore'),
          disabled: true,
          minWidth: 110,
          component: /** @type {typeof dataCell<AwardDisplayRow>} */ (dataCell)((r) => (
            <span className="font-semibold text-data-navy">{r.aiCompositeScore}</span>
          ))
        },
        {
          title: t('planGrid.award.col.whatIfScore'),
          disabled: true,
          minWidth: 120,
          /** @param {CellProps<AwardDisplayRow>} props */
          component: ({ rowData }) => (
            <div className="w-full px-2 text-right">
              <span className="inline-flex items-center rounded-sm border border-info/30 bg-info-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-info">
                {rowData.whatIf}
              </span>
            </div>
          )
        }
      ],
      [t]
    )
  );

  const intakeColumns = /** @type {Column<PrIntakeLine>[]} */ (
    useMemo(
      () => [
        {
          // G1.3.2 — the working-set selection affordance: an explicit per-row
          // "Adjust" button that lifts the row id into `selectedLineId`. It reads
          // selection from the virtualized DSG (browse scales) without moving the
          // reason-gate into the grid body (it stays in the plain-DOM drawer). The
          // button stops propagation so the DSG's own cell selection is untouched.
          title: t('planGrid.intake.col.select'),
          disabled: true,
          minWidth: 96,
          /** @param {CellProps<PrIntakeLine>} props */
          component: ({ rowData }) => (
            <div className="w-full px-2">
              <button
                type="button"
                aria-label={t('planGrid.intake.select.action', { material: rowData.material })}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLineId(rowData.id);
                }}
                className="inline-flex items-center rounded-md border border-action/40 bg-action-soft px-2 py-0.5 text-xs text-action hover:border-action"
              >
                {t('planGrid.intake.col.select')}
              </button>
            </div>
          )
        },
        {
          title: t('planGrid.intake.col.material'),
          disabled: true,
          grow: 2,
          minWidth: 170,
          component: /** @type {typeof textCell<PrIntakeLine>} */ (textCell)((r) => r.material)
        },
        {
          title: t('planGrid.intake.col.source'),
          disabled: true,
          minWidth: 120,
          component: /** @type {typeof textCell<PrIntakeLine>} */ (textCell)(
            (r) => t(`planGrid.source.${r.source}`),
            'text-text-secondary'
          )
        },
        {
          title: t('planGrid.intake.col.lane'),
          disabled: true,
          grow: 2,
          minWidth: 180,
          component: /** @type {typeof textCell<PrIntakeLine>} */ (textCell)(
            (r) => r.suggestedSource ?? t('planGrid.empty.dash'),
            'text-text-secondary'
          )
        },
        {
          title: t('planGrid.intake.col.segment'),
          disabled: true,
          minWidth: 90,
          component: /** @type {typeof textCell<PrIntakeLine>} */ (textCell)(
            (r) => r.segment ?? t('planGrid.empty.dash'),
            'text-text-secondary'
          )
        },
        {
          title: t('planGrid.intake.col.suggestedQty'),
          disabled: true,
          minWidth: 110,
          component: /** @type {typeof dataCell<PrIntakeLine>} */ (dataCell)(
            (r) => `${formatNumber(r.suggestedQty)} ${r.uom}`
          )
        },
        {
          title: t('planGrid.intake.col.acceptedQty'),
          disabled: true,
          minWidth: 110,
          component: /** @type {typeof dataCell<PrIntakeLine>} */ (dataCell)(
            (r) => `${formatNumber(r.acceptedQty)} ${r.uom}`
          )
        },
        {
          title: t('planGrid.intake.col.adjusted'),
          disabled: true,
          minWidth: 110,
          /** @param {CellProps<PrIntakeLine>} props */
          component: ({ rowData }) => (
            <div className="w-full px-2 text-sm">
              <span
                className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[length:var(--fs-label-3)] font-medium ${
                  rowData.wasAdjusted
                    ? 'border-warning/30 bg-warning-soft text-warning-hover'
                    : 'border-border-subtle bg-bg-hover text-text-tertiary'
                }`}
              >
                {t(rowData.wasAdjusted ? 'planGrid.adjusted.yes' : 'planGrid.adjusted.no')}
              </span>
            </div>
          )
        },
        {
          title: t('planGrid.intake.col.period'),
          disabled: true,
          minWidth: 90,
          component: /** @type {typeof dataCell<PrIntakeLine>} */ (dataCell)((r) => r.period)
        },
        {
          title: t('planGrid.intake.col.estValue'),
          disabled: true,
          minWidth: 130,
          component: /** @type {typeof dataCell<PrIntakeLine>} */ (dataCell)((r) =>
            formatIDR(r.estimatedValue, { compact: true })
          )
        },
        {
          title: t('planGrid.intake.col.provenance'),
          disabled: true,
          grow: 2,
          minWidth: 170,
          /** @param {CellProps<PrIntakeLine>} props */
          component: ({ rowData }) => (
            <div className="w-full px-2">
              <PlanCellMarker capability="purchaseRequisitions" planState={rowData.planState} />
            </div>
          )
        }
      ],
      [t]
    )
  );

  const PLAN_CRUMB = [t('planGrid.crumb.acquire'), t('planGrid.crumb.planGrid')];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={PLAN_CRUMB}
        title={t('planGrid.header.title')}
        subtitle={t('planGrid.header.subtitle')}
        actions={<LivenessPill capability="purchaseRequisitions" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('planGrid.meta.summary', {
          quotations: awardRows.length,
          lines: SAMPLE_INTAKE_LINES.length
        })}
      </PageMetaLine>

      {/* Honest framing: read-only sandbox, SIMULATED, nothing pushed */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('planGrid.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('planGrid.honesty.body')}</p>
        </div>
      </div>

      {/* ── Award scenario — what-if overlay (full-screen-capable) ───────── */}
      <section className="mb-8">
        <FullScreenSection title={t('planGrid.award.title')} normalHeight={DSG_H.award}>
          {({ dsgHeight }) => (
            <>
              <p className="mb-1 text-sm text-text-secondary">{t('planGrid.award.subtitle')}</p>
              <p className="mb-3 text-xs text-text-tertiary">
                {t('planGrid.award.col.whatIfScore')} — {t('planGrid.clientComputed')}.{' '}
                {t('planGrid.whatif.hint')}
              </p>

              {/* Editable what-if weights (the ONE editable engine surface) */}
              <div
                data-testid="whatif-weights"
                className="mb-4 rounded-lg border border-border-subtle bg-bg-surface p-4"
              >
                <div className="mb-2 text-label uppercase text-text-tertiary">
                  {t('planGrid.whatif.label')}
                </div>
                {/* jsdom-reliable readout of the current weights (also the accessible
                    text alternative to the virtualized grid header) */}
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                  {AWARD_CRITERIA.map((c) => (
                    <span key={c.key}>
                      {t(c.labelKey)}: <Data className="text-data-navy">{weights[c.key]}</Data>
                    </span>
                  ))}
                </div>
                <div className="plan-dsg max-w-md" style={dsgVar(DSG_H.weights)}>
                  <DataSheetGrid
                    value={weightsRow}
                    columns={weightColumns}
                    onChange={onWeightsChange}
                    gutterColumn={false}
                    lockRows
                    disableContextMenu
                    height={DSG_H.weights}
                  />
                </div>
              </div>

              <div
                className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
                style={dsgVar(dsgHeight)}
              >
                <DataSheetGrid
                  value={awardDisplay}
                  columns={awardColumns}
                  gutterColumn={false}
                  lockRows
                  rowKey="id"
                  height={dsgHeight}
                />
              </div>
            </>
          )}
        </FullScreenSection>
      </section>

      {/* ── Requisition intake — review (C7 §2, full-screen-capable) ──────── */}
      <section className="mb-8">
        <FullScreenSection title={t('planGrid.intake.title')} normalHeight={DSG_H.intake}>
          {({ dsgHeight }) => (
            <>
              <p className="mb-3 text-sm text-text-secondary">{t('planGrid.intake.subtitle')}</p>
              <div
                className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
                style={dsgVar(dsgHeight)}
              >
                <DataSheetGrid
                  value={/** @type {PrIntakeLine[]} */ (SAMPLE_INTAKE_LINES)}
                  columns={intakeColumns}
                  gutterColumn={false}
                  lockRows
                  rowKey="id"
                  height={dsgHeight}
                />
              </div>
            </>
          )}
        </FullScreenSection>
      </section>

      {/* ── Adjust & push — the ONE governed mutation on the SELECTED line ── */}
      {/* (C6-LOCK, plain-DOM working-set drawer; full-screen-capable) */}
      <section className="mb-8">
        <FullScreenSection title={t('planGrid.drawer.title')} normalHeight={DSG_H.intake}>
          {() => (
            <>
              <p className="mb-3 text-sm text-text-secondary">{t('planGrid.drawer.subtitle')}</p>
              <IntakeAdjustDrawer line={selectedLine(SAMPLE_INTAKE_LINES, selectedLineId)} />
            </>
          )}
        </FullScreenSection>
      </section>
    </AppShellV2>
  );
};

export default PlanGrid;
