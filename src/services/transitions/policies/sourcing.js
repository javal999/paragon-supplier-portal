// ────────────────────────────────────────────────────────────────────────────
// policies/sourcing.js — the quotation and RFQ policy hooks.
//
// Holds the bid-currency check, the FX-pin well-formedness check and the RFQ
// create binding. Separate because all three guard the sourcing documents and
// share the currency policy (`@lib/currencyPolicy`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { PolicyHookFn } from '../dispatcher' */
import { POLICY_HOOKS } from '../policyHooks';
import { BASE_CURRENCY, BID_CURRENCIES, isBidCurrency } from '@lib/currencyPolicy';
import { isUsableRate } from '@lib/fxPin';
import { rfqCreateRefusal } from '../../sourcing/rfqModel';
import { bindPolicyHook } from './bindings';

// — Quotation submit: the bid currency must be one the platform PERMITS
//   (CP-0 · 2e-c-2). ————————————————————————————————————————————————————————
//
// `requiredFields` proves the field is non-empty; it says nothing about what is
// IN it. Without this, 'CNY' / 'Rp' / 'usd' / 'gold' all clear the floor and get
// stored as the denomination of a real bid.
//
// Reads `payload` only — no entity exists yet on a creation verb, and the answer
// depends on nothing but the token and the policy list.
//
// It shares `isBidCurrency` with the supplier's quote form, on the
// `confirmedQtyWithinBounds` precedent (2f-c): ONE expression of the rule, two
// consumers — the policy is the LAW and refuses any dispatch that skips the UI,
// while the form is a courtesy mirror that never offers an off-list option in
// the first place. Sharing the expression is what stops the mirror from drifting
// away from the law.
//
// REFUSES BY NAME. The rejected token is quoted back verbatim and the permitted
// set is spelled out, because "invalid currency" tells a supplier neither what
// they sent nor what they may send. Deliberately NOT a coercion to the base
// currency: silently making a foreign bid domestic is the exact defect 2e-c-2
// exists to close, and doing it in the policy layer would be the same lie with
// better manners.
/** @type {PolicyHookFn} */
const quotationSubmitCurrencyPermitted = ({ payload }) => {
  const currency = payload.currency;
  if (typeof currency !== 'string') {
    return { ok: false, reason: `currency must be a string, got ${typeof currency}` };
  }
  return isBidCurrency(currency)
    ? { ok: true }
    : {
        ok: false,
        reason: `currency '${currency}' is not permitted (${BID_CURRENCIES.join(', ')})`
      };
};

bindPolicyHook(POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED, quotationSubmitCurrencyPermitted);

// — RFQ FX pin: the recorded basis must be WELL-FORMED (CP-0 · 2e-c-3) ————————
//
// An ABSENT pin is safe — the engine refuses `FX_UNPINNED` and says so. A
// MALFORMED pin is not: it is a basis a comparison would happily be ranked on,
// producing a plausible number and the wrong winner. So the gate sits here, at
// the moment the fact is recorded, rather than being re-litigated by every
// reader.
//
// Reads `payload` only — the RFQ's own state does not bear on whether a rate is
// well-formed, and a pin is legal from every state the verb is legal from.
//
// It shares `isUsableRate` and `isBidCurrency` with the scoring engine, on the
// `confirmedQtyWithinBounds` precedent: one expression of the rule, policy as
// law, engine as the reader that must never see a value this refused.
/** @type {PolicyHookFn} */
const rfqFxPinWellFormed = ({ payload }) => {
  const quote = payload.quote;
  if (typeof quote !== 'string' || !isBidCurrency(quote)) {
    return {
      ok: false,
      reason: `quote currency '${String(quote)}' is not permitted (${BID_CURRENCIES.join(', ')})`
    };
  }
  // Pinning the base to itself is not a harmless no-op: it would put a rate on
  // the ledger for a currency whose rate is 1 BY DEFINITION, and any value other
  // than 1 would silently re-denominate every domestic bid on the RFQ.
  if (quote === BASE_CURRENCY) {
    return { ok: false, reason: `${BASE_CURRENCY} is the comparison base — it has no rate to pin` };
  }
  if (!isUsableRate(payload.rate)) {
    // Names the value: '0', 'NaN' and a missing rate are different mistakes.
    return {
      ok: false,
      reason: `rate must be a finite number greater than 0, got ${String(payload.rate)}`
    };
  }
  const asOf = payload.asOf;
  if (typeof asOf !== 'string' || !Number.isFinite(new Date(asOf).getTime())) {
    return { ok: false, reason: `asOf must be a readable date, got ${String(asOf)}` };
  }
  if (payload.source !== 'MANUAL' && payload.source !== 'SAP_EXHGRATE') {
    // Provenance is part of the fact. A pin whose source cannot be named is a
    // number nobody is accountable for.
    return {
      ok: false,
      reason: `source must be MANUAL or SAP_EXHGRATE, got ${String(payload.source)}`
    };
  }
  return { ok: true };
};

bindPolicyHook(POLICY_HOOKS.RFQ_FX_PIN_WELL_FORMED, rfqFxPinWellFormed);

// — RFQ create: the rebuilt shape is SOUND when it is sent (RFx spec 2026-09-21)
//
// Items (at least one; a known type; a description; at least one variant; every
// required buyer field filled), quantity breaks (1 to 8, positive, strictly
// increasing), typed questions, a well-formed sample request, and a currency in
// `BID_CURRENCIES`. Each arm refuses BY NAME (`NO_ITEMS`, `TIER_COUNT`,
// `TIERS_NOT_INCREASING`, `ITEM_SPEC_MISSING`, `CURRENCY_NOT_PERMITTED`, …).
//
// The rule itself lives in `rfqModel.js` so the wizard's step gate and the
// template store call the SAME judgement; this is only its binding. Every arm is
// conditional on its key being present: a legacy single-item dispatch carries
// none of them and is not refused for that (the versioning rule).
bindPolicyHook(POLICY_HOOKS.RFQ_CREATE_VALID, ({ payload }) => {
  const reason = rfqCreateRefusal(payload);
  return reason ? { ok: false, reason } : { ok: true };
});
