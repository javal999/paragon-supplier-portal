/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { commitmentGap } from '@services/transitions/forecastRules';
import { CommitmentDeadline, pctText, qtyText } from '../../forecasts/forecastDisplay';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

/**
 * One supplier × material × period cell of the grid (BR-01 / BR-02):
 * commitment over forecast, tinted green / amber / red by the gap colour
 * (CR-22) once there is a commitment, the zone and gap text, and the time left
 * or how late (CR-26 · BL-48). A period with no line renders a dash.
 * @type {React.FC<{ line: ForecastCommitmentLine | undefined; nowIso: string }>}
 */
const GridCell = ({ line: l, nowIso }) => {
  const { t } = useTranslation();
  if (!l) return <td className="px-3 py-2 text-text-tertiary">—</td>;
  const committed = l.committedQty !== null && l.state !== 'awaiting' && l.zone !== 'forecast';
  const gap = committed
    ? commitmentGap(
        l.zone,
        l.forecastQty,
        /** @type {NonNullable<typeof l.committedQty>} */ (l.committedQty)
      )
    : null;
  const tint = gap
    ? gap.colour === 'green'
      ? 'bg-success-soft'
      : gap.colour === 'amber'
        ? 'bg-warning-soft'
        : 'bg-danger-soft'
    : '';
  return (
    <td
      className={`px-3 py-2 align-top whitespace-nowrap ${tint}`}
      data-testid={`fc-cell-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
      data-colour={gap?.colour ?? 'none'}
    >
      <div>
        <Data>
          {committed
            ? qtyText(/** @type {NonNullable<typeof l.committedQty>} */ (l.committedQty))
            : '—'}
        </Data>
        <span className="text-text-tertiary"> / </span>
        <Data>{qtyText(l.forecastQty)}</Data>
      </div>
      <div className="text-xs text-text-secondary">
        {t(`fc.zone.${l.zone}`)}
        {gap && (
          <>
            {' · '}
            <Data>{pctText(gap.pct)}</Data>
            {gap.overCommit ? ` · ${t('fc.gap.overCommit')}` : ''}
          </>
        )}
        {!gap && l.zone !== 'forecast' && ` · ${t('fc.state.awaiting')}`}
        {l.zone === 'forecast' && l.state === 'acknowledged' && ` · ${t('fc.state.acknowledged')}`}
      </div>
      {/* CR-26 · BL-48 — time left or how late, per cell. */}
      <CommitmentDeadline
        line={l}
        nowIso={nowIso}
        compact
        testId={`fc-due-cell-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
      />
    </td>
  );
};

export default GridCell;
