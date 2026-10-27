/** @import { Column, CellProps } from 'react-datasheet-grid' */
/** @import { TFunction } from 'i18next' */
/** @import { RequirementResponse } from '@services/sdc' */
/** @import { CoverageRow } from '../const' */
import { useMemo } from 'react';
import Data from '@components/ui-v2/Data';
import ModelMarker from '@components/ui-v2/ModelMarker';
import PlanCellMarker from '../../plan-grid/PlanCellMarker';
import { dataCell, textCell } from '../../plan-grid/cells';
import { formatNumber } from '@lib/format';
import { statusLabelKey } from '@lib/statusLabel';
import { labelOf } from '@services/sdc';
import { CHIP_DANGER, CHIP_NEUTRAL, CHIP_SUCCESS, CHIP_WARNING, CLASS_LABEL_KEY } from '../const';
import { responseOf, supplierName } from '../utils';

/**
 * The consolidation grid's columns, memoised on `t`: supplier, material,
 * period, class, demand, confirmed, deficit, state, coverage and provenance.
 * Also owns the carried-forward token the state column renders. The grid is
 * read-only, so every column is `disabled`.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change): the two `useMemo`s run in the same order with the same deps.
 * @param {TFunction} t
 * @returns {Column<CoverageRow>[]}
 */
export function useConsolidationColumns(t) {
  // The carried-forward token: presumed valid (design §3.2), a muted note —
  // deliberately NOT a warning (the line did not move; nothing was voided).
  const carriedToken = useMemo(
    () => (
      <span
        className={`${CHIP_NEUTRAL} text-[length:var(--fs-caption-1)]`}
        title={t('sdc.state.carriedTitle')}
      >
        {t('sdc.state.carried')}
      </span>
    ),
    [t]
  );

  const columns = /** @type {Column<CoverageRow>[]} */ (
    useMemo(
      () => [
        {
          title: t('sdc.col.supplier'),
          disabled: true,
          grow: 2,
          minWidth: 160,
          component: /** @type {typeof textCell<CoverageRow>} */ (textCell)((r) =>
            supplierName(r.line.supplierId)
          )
        },
        {
          title: t('sdc.col.material'),
          disabled: true,
          grow: 2,
          minWidth: 230,
          /** @param {CellProps<CoverageRow>} props */
          component: ({ rowData }) => (
            <div className="w-full truncate px-2 text-sm">
              <Data className="text-xs">{rowData.line.materialCode}</Data>{' '}
              <span className="text-xs text-text-secondary">
                {labelOf(rowData.line.materialCode)}
              </span>
            </div>
          )
        },
        {
          title: t('sdc.col.period'),
          disabled: true,
          minWidth: 90,
          component: /** @type {typeof dataCell<CoverageRow>} */ (dataCell)(
            (r) => r.line.periodBucket
          )
        },
        {
          // Per-line class chip: an ECHO of the period-level class (the filter bar
          // owns it) — neutral, never a health state, never a per-material lock.
          title: t('sdc.col.class'),
          disabled: true,
          minWidth: 110,
          /** @param {CellProps<CoverageRow>} props */
          component: ({ rowData }) => (
            <div className="w-full px-2">
              <span className={CHIP_NEUTRAL}>
                {t(CLASS_LABEL_KEY[rowData.line.commitmentClass])}
              </span>
            </div>
          )
        },
        {
          title: t('sdc.col.demand'),
          disabled: true,
          minWidth: 120,
          component: /** @type {typeof dataCell<CoverageRow>} */ (dataCell)(
            (r) => `${formatNumber(r.line.forecastQty)} ${r.line.uom}`
          )
        },
        {
          title: t('sdc.col.confirmed'),
          disabled: true,
          minWidth: 120,
          component: /** @type {typeof dataCell<CoverageRow>} */ (dataCell)((r) => {
            // Awaiting has nothing; an acknowledgment COMMITS nothing (SDC-2b-EXT
            // invariant #11) — both render the honest dash, never a fabricated qty.
            if (r.state.kind === 'awaiting' || r.state.kind === 'acknowledged')
              return t('sdc.empty.dash');
            const fc = r.state.response.forecastConfirmation;
            return fc ? `${formatNumber(fc.confirmedQty)} ${r.line.uom}` : t('sdc.empty.dash');
          })
        },
        {
          title: t('sdc.col.deficit'),
          disabled: true,
          minWidth: 110,
          /** @param {CellProps<CoverageRow>} props */
          component: ({ rowData }) => (
            <div className="w-full px-2 text-right">
              {rowData.state.kind === 'short' ? (
                <Data className="text-xs text-danger">
                  −{formatNumber(rowData.state.deficitQty)} {rowData.line.uom}
                </Data>
              ) : (
                <span className="text-xs text-text-tertiary">{t('sdc.empty.dash')}</span>
              )}
            </div>
          )
        },
        {
          title: t('sdc.col.state'),
          disabled: true,
          grow: 2,
          minWidth: 240,
          /** @param {CellProps<CoverageRow>} props */
          component: ({ rowData }) => {
            const s = rowData.state;
            return (
              <div className="flex w-full flex-wrap items-center gap-1.5 px-2">
                {/* ⚠️ PF-1b — THE DRAFT HINT IS GONE (operator ruling). A muted
                  "draft in progress" rendered here whenever a supplier had an
                  unsubmitted response. It leaked no CONTENT, which is why it
                  passed review; it leaked EXISTENCE — and once creation births
                  every commitment at Draft, that is a live signal that a named
                  supplier has started composing, disclosed by nobody's choice.
                  The field is deleted from the projection too, so there is
                  nothing left here to render. */}
                {s.kind === 'awaiting' && (
                  <span className={CHIP_NEUTRAL}>{t('sdc.state.awaiting')}</span>
                )}
                {s.kind === 'acknowledged' && (
                  <>
                    {/* SDC-2b-EXT: a visibility response — honestly DISTINCT from
                      the commitment states (neutral, never the success chip). */}
                    <span className={CHIP_NEUTRAL}>{t('sdc.state.acknowledged')}</span>
                    {s.carriedForward && carriedToken}
                  </>
                )}
                {s.kind === 'confirmed-full' && (
                  <>
                    <span className={CHIP_SUCCESS}>{t('sdc.state.confirmedFull')}</span>
                    {s.carriedForward && carriedToken}
                  </>
                )}
                {s.kind === 'short' && (
                  <>
                    <span className={CHIP_DANGER}>{t('sdc.state.short')}</span>
                    {s.carriedForward && carriedToken}
                  </>
                )}
                {/* R1b - THE LIFECYCLE AXIS, which this cell never carried.
                  Everything above is the QUANTITY join (awaiting / acknowledged
                  / full / short / stale); a DISPUTED response rendered here as
                  plain `short`, pixel-identical to one nobody had looked at.
                  The label comes from the SAME central status map the supplier's
                  own page localizes through, so the two personas cannot drift
                  into different words for one state. */}
                {responseOf(s) &&
                  statusLabelKey(/** @type {RequirementResponse} */ (responseOf(s)).status) &&
                  /** @type {RequirementResponse} */ (responseOf(s)).status !== 'Submitted' && (
                    <span
                      className={
                        /** @type {RequirementResponse} */ (responseOf(s)).status === 'Disputed'
                          ? CHIP_WARNING
                          : CHIP_NEUTRAL
                      }
                      data-testid="sdc-lifecycle-chip"
                    >
                      {t(
                        /** @type {NonNullable<ReturnType<typeof statusLabelKey>>} */ (
                          statusLabelKey(/** @type {RequirementResponse} */ (responseOf(s)).status)
                        )
                      )}
                    </span>
                  )}
                {s.kind === 'stale-against-current' && (
                  <span className={CHIP_WARNING}>
                    {s.answeredQty === null
                      ? t('sdc.state.staleUnverified', {
                          current: formatNumber(s.currentQty)
                        })
                      : t('sdc.state.stale', {
                          answered: formatNumber(s.answeredQty),
                          current: formatNumber(s.currentQty)
                        })}
                  </span>
                )}
              </div>
            );
          }
        },
        {
          // The supplier-coverage indicator (addendum §6) — the ONE projection
          // that is ours. MODELED, Σ-marked; honest blank when nothing declared.
          title: t('sdc.col.coverage'),
          disabled: true,
          grow: 2,
          minWidth: 190,
          /** @param {CellProps<CoverageRow>} props */
          component: ({ rowData }) => {
            const cov = rowData.coverage;
            // Visibility-only pair: no committed demand → no sufficiency read.
            if (!cov) {
              return (
                <div className="w-full px-2 text-xs text-text-tertiary">{t('sdc.empty.dash')}</div>
              );
            }
            const st = cov.status;
            if (st.kind === 'no-declaration') {
              // The honest blank — never a fabricated zero, no Σ (nothing computed).
              return (
                <div className="w-full px-2 text-xs italic text-text-tertiary">
                  {t('sdc.coverage.noDeclaration')}
                </div>
              );
            }
            const chipCls =
              st.kind === 'covered'
                ? CHIP_SUCCESS
                : st.kind === 'at-risk'
                  ? CHIP_WARNING
                  : CHIP_DANGER;
            const label =
              st.kind === 'covered'
                ? t('sdc.coverage.covered')
                : st.kind === 'at-risk'
                  ? t('sdc.coverage.atRisk')
                  : t('sdc.coverage.uncovered');
            const ratio = Number.isFinite(st.ratio) ? ` · ${st.ratio.toFixed(2)}×` : '';
            const unbridgeable = st.kind !== 'covered' && st.unbridgeable;
            return (
              <div className="flex w-full flex-wrap items-center gap-1.5 px-2">
                <span className={chipCls}>
                  {label}
                  {ratio}
                  {unbridgeable ? ` — ${t('sdc.coverage.unbridgeable')}` : ''}
                </span>
                <ModelMarker label={t('sdc.coverage.model')} title={t('sdc.coverage.modelTitle')} />
                {/* SDC-3b — a total-only declaration: the ratio is honest but expiry
                  bridgeability is UNKNOWN. Marked, never assumed no-risk. */}
                {st.expiryBlind && (
                  <span
                    className="text-[length:var(--fs-caption-1)] italic text-text-tertiary"
                    title={t('sdc.coverage.expiryBlindTitle')}
                  >
                    {t('sdc.coverage.expiryBlind')}
                  </span>
                )}
              </div>
            );
          }
        },
        {
          title: t('sdc.col.provenance'),
          disabled: true,
          grow: 2,
          minWidth: 170,
          /** @param {CellProps<CoverageRow>} props */
          component: ({ rowData }) => (
            <div className="w-full px-2">
              <PlanCellMarker
                capability="forecastPublications"
                planState={rowData.line.provenance.planState}
              />
            </div>
          )
        }
      ],
      [t, carriedToken]
    )
  );

  return columns;
}
