/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import TermTip from '@components/forecast/TermTip';
import { commitmentGap, isAcknowledgeOnly, ltpSohGap } from '@services/transitions/forecastRules';
import { CommitmentDeadline, pctText, qtyText } from '../../forecasts/forecastDisplay';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

/**
 * One supplier × material × period cell of the grid (BR-01 / BR-02):
 * commitment over forecast, tinted green / amber / red by the gap colour
 * (CR-22) once there is a commitment, the zone and gap text, and the time left
 * or how late (CR-26 · BL-48). A period with no line renders a dash.
 *
 * PEX-3 BR-02 (BL-284) — the forecast figure carries the week's hover: the LTP
 * (planned use), PTI stock on hand and the gap between them (`ltpSohGap`, the
 * heads-up note's formula). PTI reads every material, so no stock grant gates
 * this side (Q-W3, PEX-D24).
 * @type {React.FC<{ line: ForecastCommitmentLine | undefined; label: string; nowIso: string }>}
 */
const GridCell = ({ line: l, label, nowIso }) => {
  const { t, i18n } = useTranslation();
  if (!l) return <td className="px-3 py-2 text-text-tertiary">—</td>;
  const committed = l.committedQty !== null && l.state !== 'awaiting' && !isAcknowledgeOnly(l.zone);
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
  // PEX-3 BR-02 (BL-284) — the LTP is the forecast quantity; the stock term may
  // be absent for a material with no PTI stock record, and then no tip shows.
  const ltp = typeof l.ltpQty === 'number' ? l.ltpQty : l.forecastQty;
  const stockGap = ltpSohGap(ltp, l.ptiSoh);
  const tipName = t('fc.pti.cellHoverName', { period: label });
  const tipVars = {
    period: label,
    uom: l.uom,
    ltp: qtyText(ltp),
    soh: qtyText(l.ptiSoh ?? 0),
    gap: qtyText(stockGap ?? 0)
  };
  const en = i18n.getFixedT('en');
  const id = i18n.getFixedT('id');
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
        {stockGap === null ? (
          <Data>{qtyText(l.forecastQty)}</Data>
        ) : (
          <TermTip
            entry={{
              label: { en: tipName, id: tipName },
              en: en('fc.pti.cellHover', tipVars),
              id: id('fc.pti.cellHover', tipVars)
            }}
            name={tipName}
            slugId={`demand-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
          >
            <Data>{qtyText(l.forecastQty)}</Data>
          </TermTip>
        )}
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
        {!gap && !isAcknowledgeOnly(l.zone) && ` · ${t('fc.state.awaiting')}`}
        {isAcknowledgeOnly(l.zone) &&
          l.state === 'acknowledged' &&
          ` · ${t('fc.state.acknowledged')}`}
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
