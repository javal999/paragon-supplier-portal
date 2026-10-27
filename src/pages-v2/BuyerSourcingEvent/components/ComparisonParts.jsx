// ────────────────────────────────────────────────────────────────────────────
// The comparison's building blocks: the honest-marker row tag and the
// should-cost spread cell. Moved out of `BuyerSourcing.jsx` by the Phase 5 page
// split, then from the side panel to the event page by RFx UX B-02 (owner
// ruling 2026-10-19); the panel-only row and cell wrappers were retired.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { QuoteSpread, SilentReason } from '@lib/shouldCostSpread' */
import { ArrowLeftRight } from 'lucide-react';
import LivenessPill from '@components/ui-v2/LivenessPill';
import ModelMarker from '@components/ui-v2/ModelMarker';
import { formatMoney } from '@lib/format';
import { fmtSignedPct } from '../../BuyerSourcing/utils';

/** Honest silence on the should-cost cell — one key per named cause. The
 * @type {Record<SilentReason, string>}
 *  `currency-unsupported` member is D-4's fourth reason (2e-c-5). */
export const SPREAD_SILENT_KEY = {
  unmapped: 'sourcing.cmp.spread.silent.unmapped',
  tail: 'sourcing.cmp.spread.silent.tail',
  'unit-mismatch': 'sourcing.cmp.spread.silent.unit-mismatch',
  'currency-unsupported': 'sourcing.cmp.spread.silent.currency-unsupported'
};

/**
 * An honest-marker tag on a comparison row label, with a tooltip explaining it.
 * Two DIFFERENT qualifiers use this grammar and must not be conflated:
 * "Simulated" (the axis has no live data source yet) and "Estimated" (REAL
 * supplier input, indicative at this stage rather than a commitment — the lead
 * time, 2e-b-1a). Was the `tag` / `tagTitle` pair on the side panel's
 * `ComparisonRow`; moved here with the comparison (RFx UX B-02).
 * @type {React.FC<{ tag: string; title: string }>}
 */
export const RowTag = ({ tag, title }) => (
  <span
    title={title}
    className="ml-1.5 inline-block normal-case tracking-normal text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px align-middle"
  >
    {tag}
  </span>
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
