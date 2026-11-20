/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import TermTip from '@components/forecast/TermTip';
import { formatDate } from '@lib/format';
import { fulfilByDay, ltpSohGap } from '@services/transitions/forecastRules';
import { qtyText } from '../../forecasts/forecastDisplay';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// PEX-2 (BL-265) — the content of two cells of the supplier commitments grid.
// CAP-1 wave 3 (BL-343) renders that grid through the shared `WeekGrid`, so
// these draw a cell's CONTENT only: the grid owns the cell, its padding and
// its border.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PEX-3 (BL-266, BL-284) BR-02 — the period's ordered quantity, with a hover
 * that explains it. PEX-3 BR-02 (BL-284) adds the note's own terms per period:
 * the LTP (planned use), PTI stock on hand and the gap between them — but the
 * SOH and the gap are shown ONLY for a material PTI has granted this supplier
 * stock access to (Q-W3, PEX-D24); without the grant the supplier keeps the
 * heads-up sentence and the ordered quantity alone, and the service has already
 * cleared `ptiSoh` (`canSeePtiStock`).
 * @type {React.FC<{ l: ForecastCommitmentLine; label: string; className?: string }>}
 */
export const DemandCell = ({ l, label, className = '' }) => {
  const { t, i18n } = useTranslation();
  // The LTP is the forecast quantity the supplier commits against; the fallback
  // keeps a hand-built line (no `ltpQty`) rendering the same figure.
  const ltp = typeof l.ltpQty === 'number' ? l.ltpQty : l.forecastQty;
  const gap = ltpSohGap(ltp, l.ptiSoh);
  const shared = l.ptiStockShared !== false && gap !== null;
  const vars = {
    period: label,
    qty: qtyText(l.forecastQty),
    uom: l.uom,
    ltp: qtyText(ltp),
    soh: typeof l.ptiSoh === 'number' ? qtyText(l.ptiSoh) : '',
    gap: gap === null ? '' : qtyText(gap)
  };
  const en = i18n.getFixedT('en');
  const id = i18n.getFixedT('id');
  const name = t('fc.sup.demandHoverName', { period: label });
  const hover = shared ? 'fc.sup.demandHover' : 'fc.sup.demandHoverNoAccess';
  return (
    // BL-307 (UL-09) — left-aligned like every other row and its week header,
    // so the figure no longer sits against the next week's column.
    <div className={className || undefined} data-testid={`fc-demand-${l.key}`}>
      <TermTip
        entry={{
          label: { en: name, id: name },
          en: en(hover, vars),
          id: id(hover, vars)
        }}
        name={name}
        slugId={`demand-${l.materialCode}-${l.periodBucket}`}
      >
        <Data>{qtyText(l.forecastQty)}</Data>
      </TermTip>
      {l.previousQty !== null && l.previousQty !== l.forecastQty && (
        <div className="text-xs text-text-tertiary">
          {t('fc.was')} <Data>{qtyText(l.previousQty)}</Data>
        </div>
      )}
    </div>
  );
};

/**
 * PEX-10 (BL-273) — "Fulfil by <date> (lead time n days)": the confirmation
 * date (the standing submitted response) + the pair's lead time (DRC-6).
 * Before a submission it states the lead time and that the date comes on
 * submission; with no lead time on record it says so.
 * @type {React.FC<{ l: ForecastCommitmentLine; className?: string }>}
 */
export const FulfilByCell = ({ l, className = '' }) => {
  const { t } = useTranslation();
  const days = l.leadTimeDays ?? null;
  const by = fulfilByDay(l.response?.submittedAt, days);
  return (
    <div className={`text-xs ${className}`.trim()} data-testid={`fc-fulfil-${l.key}`}>
      {days === null ? (
        <span className="text-text-tertiary">{t('fc.sup.fulfilNoLeadTime')}</span>
      ) : by ? (
        t('fc.sup.fulfilBy', { date: formatDate(by), days })
      ) : (
        <span className="text-text-tertiary">{t('fc.sup.fulfilPending', { days })}</span>
      )}
    </div>
  );
};
