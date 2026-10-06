// SupplierRFQs — module-scope constants: the channel icons, the refusal-key maps
// the quote form and its submit gate share, the form's input classes, the empty
// quote form, and the CR-15 evaluation weights every card shows.
//
// `EVAL_SEGMENTS` is NOT here on purpose: it lives beside `EvalBar`, the one
// component that `.map()`s it, because the module-scope-literal gate
// (`src/lib/moduleScopeLiteralGate`) only sees a const consumed by `.map()` in
// its OWN file, and its grandfathered row must keep naming a live const.

import { Send, Mail, MessageCircle, Globe } from 'lucide-react';
/** @import { LucideIcon } from 'lucide-react' */
import { BASE_CURRENCY } from '@lib/currencyPolicy';
/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { CRITERIA_WEIGHTS } from '@lib/quoteScore';
/** @import { DocumentDraft } from '../rfx/ResponseDocumentsSection' */
/** @import { PriceRefusalReason } from '../rfqs/quotationPrice' */
/** @import { LeadTimeRefusalReason, LeadTimeUnit } from '../rfqs/quotationLeadTime' */
/** @import { MoqRefusalReason } from '../rfqs/quotationMoq' */
/** @import { OpenRFQ } from './utils' */

/** @typedef {'open' | 'quotes' | 'history'} TabKey */

/** @type {Record<string, LucideIcon>} */
export const CHANNEL_ICON = {
  'Web Portal': Globe,
  Web: Globe,
  Email: Mail,
  WhatsApp: MessageCircle,
  API: Send
};

// CP-0 · W1 · 2e-a — each bid-price refusal names its own rule. A supplier who
// typed something unreadable, a supplier who typed nothing, and a supplier who
// typed 0 have made three different mistakes and need three different answers.
/** @type {Record<PriceRefusalReason, string>} */
export const PRICE_REFUSAL_KEY = {
  EMPTY_QTY: 'rfqs.panel.price.refused.empty',
  NOT_NUMERIC: 'rfqs.panel.price.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.price.refused.ambiguous',
  ZERO_PRICE: 'rfqs.panel.price.refused.zero'
};

// CP-0 · W1 · 2e-b-1a — the lead-time refusals. `EMPTY_QTY` is BACK: a blank is
// a refusal again, because a bid with no delivery promise is incomplete.
/** @type {Record<LeadTimeRefusalReason, string>} */
export const LEAD_TIME_REFUSAL_KEY = {
  EMPTY_QTY: 'rfqs.panel.leadTime.refused.empty',
  NOT_NUMERIC: 'rfqs.panel.leadTime.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.leadTime.refused.ambiguous',
  FRACTIONAL_DAYS: 'rfqs.panel.leadTime.refused.fractional'
};

// CP-0 · W1 · 2e-b-2 — the minimum-order-quantity refusals. There is no
// `EMPTY_QTY` entry because the type has no such member: a blank is this field's
// documented default ("same as RFQ qty"), so it is answered, not refused.
/** @type {Record<MoqRefusalReason, string>} */
export const MOQ_REFUSAL_KEY = {
  NOT_NUMERIC: 'rfqs.panel.moq.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.moq.refused.ambiguous',
  ZERO_MOQ: 'rfqs.panel.moq.refused.zero'
};

export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/**
 * @typedef {object} QuoteForm
 * @property {string} unitPrice
 * @property {BidCurrency} currency 2e-c-1 — narrowed from `string`. It was wider than the three options the
 *   select actually renders, so the type permitted currencies the UI never
 *   offered and the entity could never hold. It is now the same `BidCurrency`
 *   the options are generated from and the Quotation field is typed as: one
 *   list, one type, three places that cannot disagree.
 * @property {string} leadTimeNum
 * @property {LeadTimeUnit} leadTimeUnit The unit is half of what the typed lead-time number means, so the parse
 *   boundary takes it as a closed type rather than free text.
 * @property {boolean} sameDayAck -  The same-day (0-day) acknowledgement — see `requiresSameDayAck`.
 * @property {string} validUntil
 * @property {string} moq
 * @property {string} notes
 * @property {boolean | null} canSample -  RFx spec — the offer is saved now. `null` = not answered.
 * @property {string} sampleReadyDate
 * @property {string} paymentTermsOffered
 * @property {readonly DocumentDraft[]} documents -  NR-1 — the Documents section: the requested slots and "Other documents".
 */

/** @type {QuoteForm} */
export const emptyQuoteForm = {
  unitPrice: '',
  currency: BASE_CURRENCY,
  leadTimeNum: '',
  leadTimeUnit: 'days',
  sameDayAck: false,
  validUntil: '',
  moq: '',
  notes: '',
  canSample: null,
  sampleReadyDate: '',
  paymentTermsOffered: '',
  documents: []
};

/**
 * CR-15's weights as percentages — read from the policy, never restated.
 * @type {OpenRFQ['evaluationCriteria']}
 */
export const EVAL_WEIGHTS = {
  price: Math.round(CRITERIA_WEIGHTS.price * 100),
  leadTime: Math.round(CRITERIA_WEIGHTS.leadTime * 100),
  reliability: Math.round(CRITERIA_WEIGHTS.reliability * 100)
};
