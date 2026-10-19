// ────────────────────────────────────────────────────────────────────────────
// The recorded FX basis, per foreign currency bid on the RFQ (CP-0 · 2e-c-4).
// Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour
// change), then to the event page by RFx UX B-02 (owner ruling 2026-10-19).
// The block comment on the basis's purpose is in `BuyerSourcing/const.js`
// beside `PinDraft`.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { BidCurrency } from '@lib/currencyPolicy' */
/** @import { FxPin, FxPinSource } from '@lib/fxPin' */
import Data from '@components/ui-v2/Data';
import LivenessPill from '@components/ui-v2/LivenessPill';
import Button from '@components/ui-v2/Button';
import { formatDate, formatMoney } from '@lib/format';
import { effectivePin, isStalePin, pinHistory } from '@lib/fxPin';

/** @type {Record<FxPinSource, string>} */
export const FX_PIN_SOURCE_KEY = {
  MANUAL: 'sourcing.cmp.fx.basis.source.MANUAL',
  SAP_EXHGRATE: 'sourcing.cmp.fx.basis.source.SAP_EXHGRATE'
};

/**
 * Per currency: the rate in force, its vintage and source, how many superseded
 * pins are kept, and the act to record or supersede one (`onPin`).
 * @type {React.FC<{ currencies: readonly BidCurrency[]; pins: readonly FxPin[] | undefined; onPin: (c: BidCurrency) => void; t: TFunction; }>}
 */
const FxBasisPanel = ({ currencies, pins, onPin, t }) => (
  <div className="mb-3 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-label uppercase text-text-tertiary">
        {t('sourcing.cmp.fx.basis.title')}
      </span>
      <LivenessPill capability="commodityIntel" />
    </div>
    <ul className="flex flex-col gap-1.5">
      {currencies.map((c) => {
        const pin = effectivePin(pins, c);
        const history = pinHistory(pins, c);
        const stale = pin ? isStalePin(pin) : false;
        return (
          <li key={c} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <Data as="span" className="font-semibold">
              1 {c}
            </Data>
            {pin ? (
              <>
                <span className="text-text-tertiary">=</span>
                <Data as="span" className="font-semibold">
                  {formatMoney(pin.rate, pin.base)}
                </Data>
                {/* The vintage, never optional — see the block comment. */}
                <span
                  className={stale ? 'text-warning-hover font-medium' : 'text-text-secondary'}
                  data-testid={`fx-vintage-${c}`}
                >
                  {t('sourcing.cmp.fx.basis.asOf', { date: formatDate(pin.asOf) })}
                </span>
                <span className="text-text-tertiary">
                  {t(FX_PIN_SOURCE_KEY[pin.source])}
                  {pin.rateType ? ` · ${pin.rateType}` : ''}
                </span>
                {/* Superseded pins are KEPT (D-1). Saying how many exist is what
                    makes "the prior basis is preserved" a visible property
                    rather than a claim in a comment. */}
                {history.length > 1 && (
                  <span className="text-text-tertiary" data-testid={`fx-history-${c}`}>
                    {t(
                      history.length === 2
                        ? 'sourcing.cmp.fx.basis.superseded.one'
                        : 'sourcing.cmp.fx.basis.superseded.other',
                      { count: history.length - 1 }
                    )}
                  </span>
                )}
              </>
            ) : (
              <span className="text-warning-hover" data-testid={`fx-missing-${c}`}>
                {t('sourcing.cmp.fx.basis.none')}
              </span>
            )}
            <Button variant="outline" onClick={() => onPin(c)}>
              {/* A supersede is a NEW RECORDED ACT, not an edit, and the label
                  says so — "Edit rate" would describe a mutation that cannot
                  happen and would misrepresent what lands in the audit trail. */}
              {t(pin ? 'sourcing.cmp.fx.basis.supersede' : 'sourcing.cmp.fx.basis.record', {
                currency: c
              })}
            </Button>
          </li>
        );
      })}
    </ul>
  </div>
);

export default FxBasisPanel;
