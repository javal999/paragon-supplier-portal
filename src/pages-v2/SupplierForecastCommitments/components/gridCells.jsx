/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import TermTip from '@components/forecast/TermTip';
import { formatDate } from '@lib/format';
import { fulfilByDay } from '@services/transitions/forecastRules';
import { qtyText } from '../../forecasts/forecastDisplay';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// PEX-2 (BL-265) — the cells of the supplier commitments grid. The grid has one
// column per period and one row per field (`GRID_ROWS`), so every period
// column renders its cells in that order.
// ─────────────────────────────────────────────────────────────────────────────

/** The grid's rows, top to bottom; a period column renders one cell per row. */
export const GRID_ROWS = 10;

/** A body cell. */
export const CELL = 'px-3 py-2 border-b border-border-subtle text-sm';

/** The period header cell. */
export const HEAD =
  'px-3 py-2 border-b border-border-subtle bg-bg-hover text-label text-text-tertiary uppercase whitespace-nowrap';

/**
 * PEX-3 (BL-266) BR-02 — the period's ordered quantity, with a hover that
 * explains it. The per-week LTP and PTI stock on hand are not in this page's
 * read (the Foresight line carries the ordered quantity only), so the hover
 * says so instead of showing a gap it cannot compute.
 * @type {React.FC<{ l: ForecastCommitmentLine; label: string; className?: string }>}
 */
export const DemandCell = ({ l, label, className = '' }) => {
  const { t, i18n } = useTranslation();
  const vars = { period: label, qty: qtyText(l.forecastQty), uom: l.uom };
  const en = i18n.getFixedT('en');
  const id = i18n.getFixedT('id');
  const name = t('fc.sup.demandHoverName', { period: label });
  return (
    <div className={`${CELL} text-right ${className}`} data-testid={`fc-demand-${l.key}`}>
      <TermTip
        entry={{
          label: { en: name, id: name },
          en: en('fc.sup.demandHover', vars),
          id: id('fc.sup.demandHover', vars)
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
    <div className={`${CELL} text-xs ${className}`} data-testid={`fc-fulfil-${l.key}`}>
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
