/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import StatusPill from '@components/ui-v2/StatusPill';
import { useDataHealth } from '@services/query/hooks';
/** @import { EngineStep } from '@services/engine/dataHealth' */
import { failingChecks } from './cycleCounts';

// ─────────────────────────────────────────────────────────────────────────────
// DATA HEALTH CHIP — F-02 (Forecast UX phase 1, task A3).
//
// A result page names the engine step it shows; the chip counts the failing
// quality checks of every feed whose failure reaches that step. "Reaches" is
// the Data health report's own `affects` (the engine's `affectedSteps`, direct
// readers and downstream): this component keeps no mapping of its own.
//
// Read-only and presentation-only (FUX-R1). The report is computed on the
// engine's synthetic dataset; the page's own liveness pill says so (FUX-R3).
//
// C2 (WCAG 1.4.3): the link is `action.hover`, as `action` text measures
// 4.41:1 on the page background, under the 4.5:1 floor.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `step`:  The engine step whose result the page shows (E14-03, E14-05, E14-13).
 *
 * @typedef {{
 *     readonly step: EngineStep;
 *     readonly className?: string;
 *   }} DataHealthChipProps
 */

/** @type {React.FC<DataHealthChipProps>} */
const DataHealthChip = ({ step, className = '' }) => {
  const { t } = useTranslation();
  const query = useDataHealth();
  if (query.isPending) return null;
  const report = query.data ?? null;
  const failing = report ? failingChecks(report, step) : null;
  return (
    <p
      className={`flex flex-wrap items-center gap-2 text-xs ${className}`}
      data-testid="data-health-chip"
    >
      {failing === null ? (
        <StatusPill variant="neutral">{t('dh.chip.unknown')}</StatusPill>
      ) : failing > 0 ? (
        <StatusPill variant="warning">
          <span data-testid="data-health-chip-failing">
            {t('dh.chip.failing', { count: failing })}
          </span>
        </StatusPill>
      ) : (
        <StatusPill variant="success">
          <span data-testid="data-health-chip-pass">{t('dh.chip.pass')}</span>
        </StatusPill>
      )}
      {failing !== 0 && (
        <Link
          to="/buyer/data-health"
          className="text-action-hover underline"
          data-testid="data-health-chip-link"
        >
          {t('dh.chip.link')}
        </Link>
      )}
    </p>
  );
};

export default DataHealthChip;
