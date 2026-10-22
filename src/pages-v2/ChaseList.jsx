/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
/** @import { ChaseSeverityLevel, SupplierChaseView } from '@services/chase' */
import { formatDate } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// ChaseList (SDC-5d, lifted out of BuyerChase for IA P-05) — the unified chase list.
//
// One card per supplier, WORST-FIRST (the reducer already sorts hard > soft, then
// chaseCount, then supplierId), carrying BOTH families — forecast-response
// staleness (data chase) AND delivery-commitment exceptions (nudge / alert /
// drift × firm/semi-firm). The hard/soft split is visible: a firm (JIT) miss
// reads Urgent (danger); a semi-firm (FRC) or a data non-response reads Advisory
// (warning). RENDER-ONLY — takes the views the caller read, derives nothing.
//
// HONEST: the callout above the cards says this is a derived list and that no
// message is sent from here. It travels WITH the list, so every page that shows
// the list keeps the statement. The per-card action belongs to the caller
// (`renderAction`).
// ─────────────────────────────────────────────────────────────────────────────

/** Severity → the quiet StatusPill tone. hard = Urgent (danger); soft = Advisory
 * @type {Record<ChaseSeverityLevel, 'danger' | 'warning' | 'neutral'>}
 *  (warning); none never appears (a listed supplier always has ≥1 live reason). */
const SEVERITY_VARIANT = {
  hard: 'danger',
  soft: 'warning',
  none: 'neutral'
};

/**
 * @typedef {object} ChaseListProps
 * @property {readonly SupplierChaseView[]} views - The chase views, already worst-first.
 * @property {(supplierId: string) => string} nameOf - supplierId → display name.
 * @property {(view: SupplierChaseView) => React.ReactNode} [renderAction] - The
 *   per-card action row, if any.
 */

/** @type {React.FC<ChaseListProps>} */
const ChaseList = ({ views, nameOf, renderAction }) => {
  const { t } = useTranslation();

  return (
    <div data-testid="chase-list">
      {/* Honest framing — a derived chase list; nothing is sent from here. */}
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={14} className="text-info shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-info">{t('chase.honestyTitle')}</strong> {t('chase.honestyBody')}
        </span>
      </div>

      {views.length === 0 ? (
        <div className="border border-border-subtle rounded-lg bg-white px-6 py-8 text-center text-sm text-text-tertiary">
          {t('chase.empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {views.map((view) => (
            <div
              key={view.supplierId}
              className="border border-border-subtle rounded-lg bg-white overflow-hidden"
              data-testid="chase-card"
            >
              {/* Card header — supplier + overall severity + count. */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-subtle">
                <span className="text-sm font-semibold text-text-primary">
                  {nameOf(view.supplierId)}
                </span>
                <StatusPill variant={SEVERITY_VARIANT[view.overallSeverity]}>
                  {t(`chase.severity.${view.overallSeverity}`)}
                </StatusPill>
                <span className="ml-auto text-xs text-text-tertiary">
                  {t('chase.count', { n: view.chaseCount })}
                </span>
              </div>

              <div className="px-4 py-3 flex flex-col gap-4">
                {/* Forecast-response staleness (the data family). */}
                {view.dataReasons.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-tertiary mb-1.5">
                      {t('chase.section.forecast')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {view.dataReasons.map((reason, i) => (
                        // eslint-disable-next-line react/no-array-index-key -- reason codes can repeat and have no id; read-only, stateless pills recomputed whole from the chase view
                        <StatusPill key={`${reason}-${i}`} variant="warning">
                          {t(`chase.data.${reason}`)}
                        </StatusPill>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery commitments (the commitment family) — mode × type ×
                    severity, material, due date. The per-row tone carries the
                    hard/soft split (a firm miss reads danger). */}
                {view.commitmentEntries.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-tertiary mb-1.5">
                      {t('chase.section.commitment')}
                    </div>
                    <ul className="flex flex-col divide-y divide-border-subtle">
                      {view.commitmentEntries.map((e) => (
                        <li
                          key={`${e.agreementId}-${e.itemSeq}-${e.mode}-${e.releaseSeq ?? 'drift'}`}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                        >
                          <StatusPill variant={SEVERITY_VARIANT[e.severity]}>
                            {t(`chase.mode.${e.mode}`)}
                          </StatusPill>
                          <StatusPill variant="neutral">{t(`chase.type.${e.type}`)}</StatusPill>
                          <Data className="text-sm">{e.materialCode}</Data>
                          <span className="text-text-tertiary text-xs">
                            {t('chase.due', { date: formatDate(e.dueDate) })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {renderAction ? <div>{renderAction(view)}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChaseList;
