// ────────────────────────────────────────────────────────────────────────────
// The quote-comparison table's building blocks: a row, a cell, a score that
// may be honestly absent, and the should-cost spread cell. Moved out of
// `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { QuoteSpread, SilentReason } from '@lib/shouldCostSpread' */
import { ArrowLeftRight } from 'lucide-react';
import ScoreBadge from '@components/ui-v2/ScoreBadge';
import LivenessPill from '@components/ui-v2/LivenessPill';
import ModelMarker from '@components/ui-v2/ModelMarker';
import { formatMoney } from '@lib/format';
import { fmtSignedPct } from '../utils';

/** Honest silence on the should-cost cell — one key per named cause. The
 * @type {Record<SilentReason, string>}
 *  `currency-unsupported` member is D-4's fourth reason (2e-c-5). */
export const SPREAD_SILENT_KEY = {
  unmapped: 'sourcing.cmp.spread.silent.unmapped',
  tail: 'sourcing.cmp.spread.silent.tail',
  'unit-mismatch': 'sourcing.cmp.spread.silent.unit-mismatch',
  'currency-unsupported': 'sourcing.cmp.spread.silent.currency-unsupported'
};

// A score axis, or honest silence (2e-c-3). The score cells used to read
// `scoreById.get(id)?.priceScore ?? 0`, which was harmless while the engine
// always scored — the map was never missing an entry. Now that a comparison can
// be REFUSED the map is legitimately empty, and `?? 0` would render every axis
// as a real score of 0: the WORST value on each bar, for quotes the engine
// explicitly declined to rank. An absent score is not a bad score.
/**
 * A score bar, or an em dash when the engine declined to score.
 * @type {React.FC<{ score: number | undefined }>}
 */
export const ScoreOrSilence = ({ score }) =>
  score === undefined ? (
    <span className="text-text-tertiary">—</span>
  ) : (
    <ScoreBadge score={score} size="sm" variant="bar" />
  );

/**
 * One comparison row: a row header with an optional honesty tag, then a cell per quote.
 *
 * `tag`: An honest-marker tag on the row label, with a tooltip explaining it. Two
 * `tag`: DIFFERENT qualifiers use it, and they must not be conflated:
 * `tag`:   · "Simulated" — the axis has no live data source yet (compliance /
 * `tag`:     reliability / the composite that inherits their weakest link);
 * `tag`:   · "Estimated" — the data is REAL supplier input, but it is indicative at
 * `tag`:     this stage rather than a commitment (lead time, 2e-b-1a).
 * `tag`: Generalised from the old `sim`/`simLabel`/`simTitle` triple so the second
 * `tag`: qualifier reuses the grammar instead of inventing a rival one. Rows with no
 * `tag`: qualifier render plain.
 * @type {React.FC<{ label: string; tag?: string; tagTitle?: string; children: React.ReactNode; }>}
 */
export const ComparisonRow = ({ label, tag, tagTitle, children }) => (
  <tr className="border-t border-border-subtle">
    <th
      scope="row"
      className="text-left px-2 py-2 font-medium text-text-tertiary uppercase tracking-wider text-[length:var(--fs-caption-1)] w-36 min-w-[9rem] align-middle"
    >
      {label}
      {tag && (
        <span
          title={tagTitle}
          className="ml-1.5 inline-block normal-case tracking-normal text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px align-middle"
        >
          {tag}
        </span>
      )}
    </th>
    {children}
  </tr>
);

// The CI-2 spread cell: a MODELED, banded reference the buyer READS beside the
// quote — never a verdict, never into the score. A spread vs a SIMULATED basket
// is a rehearsal, so it wears BOTH honesty axes (feed = LivenessPill "Sample",
// epistemic = ModelMarker "Model") and honest silence when there is no reference.
/**
 * The should-cost spread for one quote, or its named silence.
 * @type {React.FC<{ result: QuoteSpread; t: TFunction }>}
 */
export const SpreadCell = ({ result, t }) => {
  if (result.kind === 'silent') {
    // Honest silence — a specific reason, never a fabricated percentage.
    return (
      <span className="text-[length:var(--fs-caption-1)] text-text-tertiary whitespace-normal">
        {t(SPREAD_SILENT_KEY[result.reason])}
      </span>
    );
  }
  const { spread, shouldCost, currency, basis } = result;
  return (
    <div className="flex flex-col items-start gap-1">
      {/* The spread RANGE — deliberately plain sans, NOT <Data>: the DP-3
          mono + data-navy grammar is reserved for OBSERVED data, and a modeled
          figure must never wear it (build-plan §2). Neutral tone, no semantic
          red/green — a spread vs a SIMULATED basket informs, it does not judge. */}
      <span className="text-xs font-semibold text-text-primary tabular-nums whitespace-nowrap">
        {t('sourcing.cmp.spread.range', {
          low: fmtSignedPct(spread.lowPct),
          high: fmtSignedPct(spread.highPct)
        })}
      </span>
      {/* The modeled anchor renders in the QUOTE's own currency — IDR is never
          shown as the basis for a USD deal (CI-2 currency-leg ruling). */}
      <span className="text-[length:var(--fs-caption-1)] text-text-tertiary whitespace-nowrap">
        {t('sourcing.cmp.spread.vsModel', {
          value: formatMoney(shouldCost.midPerKg, currency)
        })}
      </span>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <LivenessPill capability="commodityIntel" />
        <ModelMarker label={t('sourcing.cmp.model')} title={t('sourcing.cmp.modelTitle')} />
        {/* FX-converted marker — ONLY the FX_CONVERTED branch, where the
            should-cost was pushed through the FX pair (the more-modeled path).
            ENGINE_NATIVE reads the FX-free basis and carries no FX marker.
            2e-c-5: reads the BRANCH the engine took, not a boolean that meant
            "not the other branch" and would have claimed an FX conversion for a
            currency with no FX pair at all. */}
        {basis === 'FX_CONVERTED' && (
          <span
            title={t('sourcing.cmp.fxTitle')}
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary border border-dashed border-border-input rounded px-1 py-px"
          >
            <ArrowLeftRight size={9} aria-hidden="true" />
            {t('sourcing.cmp.fx')}
          </span>
        )}
      </span>
    </div>
  );
};

/**
 * One comparison cell; `highlight` marks the top-ranked (or awarded) column.
 * @type {React.FC<{ highlight?: boolean; children: React.ReactNode; }>}
 */
export const ComparisonCell = ({ highlight, children }) => (
  <td
    className={`px-2 py-2 align-middle ${
      highlight ? 'border-x-2 border-action bg-action-soft/40' : ''
    }`}
  >
    {children}
  </td>
);
