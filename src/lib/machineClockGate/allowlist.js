// ─────────────────────────────────────────────────────────────────────────────
// THE MACHINE-CLOCK ALLOWLIST — every read of the machine clock that is HONEST.
//
// Everything else in `src/` reads the hub clock (`sdcClock.now()` and its lane
// aliases `rfxNow` / `ordersNow` / `forecastNow` / `inventoryNow`). A row here
// says why THIS read must be the machine's:
//
//   · unique-id    — the value is an id, never shown as a date. The hub clock is
//                    a CONSTANT, so an id minted from it would collide across
//                    reloads (the saved-template stores persist to localStorage)
//                    and across two clicks in one session.
//   · time-of-day  — a live local wall-clock reading. The hub clock declares a
//                    DATE; its time of day is a fixed 12:00Z artefact, so
//                    reading it would pin every supplier's "local time" at one
//                    minute forever.
//   · test-harness — the value lives only inside a conformance spec harness.
//   · contract-pinned — a ratified contract names this exact value; moving it is a
//                    contract amendment, not a code change.
//
// ⚠️ **BILATERAL, SO IT CAN ONLY SHRINK TRUTHFULLY.** `machineClockGate.test.js`
// fails on a live site with no row, on a row naming no live site, and on a row
// whose count no longer matches. Keyed by `file::owner::kind` (the enclosing
// declaration chain), never by line, so an edit above a site does not move it.
//
// ⚠️ **NO COUNT IS WRITTEN IN THIS COMMENT** (`FLOOR-IN-PROSE-01`). The rows are
// the count.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { AllowRow } from './derive' */

/** @type {readonly AllowRow[]} */
export const MACHINE_CLOCK_ALLOWLIST = [
  {
    key: 'src/context/AdaptiveContext.jsx::getLocalTimeStr::new Date()',
    count: 1,
    why: 'time-of-day',
    reason:
      "A supplier's live local time (HH:MM) on their storefront; the hub clock carries a date, not a moving time of day."
  },
  {
    key: 'src/context/AdaptiveContext.jsx::getLocalDateObj.parts::new Date()',
    count: 1,
    why: 'time-of-day',
    reason:
      "The 'open now' business-hours flag reads the supplier's live local hour; a fixed 12:00Z instant would freeze it."
  },
  {
    key: 'src/hooks/useToast.js::generateId::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Toast id fallback when crypto.randomUUID is unavailable; never rendered.'
  },
  {
    key: 'src/pages-v2/BuyerChannelTriage.jsx::BuyerChannelTriage.runParse.cm.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Channel-message id suffix; receivedAt beside it reads the hub clock.'
  },
  {
    key: 'src/pages-v2/BuyerChannelTriage.jsx::BuyerChannelTriage.onSubmitted::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Submission-session id suffix; its openedAt reads the hub clock.'
  },
  {
    key: 'src/pages-v2/CommHubInbound.jsx::CommHubInbound.runParse.cm.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Channel-message id suffix; receivedAt beside it reads the hub clock.'
  },
  {
    key: 'src/pages-v2/CommHubInbound.jsx::CommHubInbound.onSubmitted::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Submission-session id suffix; its openedAt reads the hub clock.'
  },
  {
    key: 'src/pages-v2/SupplierForecasts/index.jsx::ForecastWorkspace.recordAttempt::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Submission-session id suffix; its openedAt reads the hub clock.'
  },
  {
    key: 'src/pages-v2/SupplierMyStorefront.jsx::StorefrontEditor.submitNewMaterial.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Catalogue-row id for a material added in the session; never rendered.'
  },
  {
    key: 'src/pages-v2/SupplierWhatsApp/components/WhatsAppPanel.jsx::WhatsAppPanel.addMessage.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: "Simulator message id (React key); the message's shown time reads the hub clock."
  },
  {
    key: 'src/pages-v2/sourcing/RfqAuthoring.jsx::QuestionsOptionsStep.addQuestion.question.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Id for a buyer-authored RFQ question; never rendered.'
  },
  {
    key: 'src/services/attachments/sessionAttachments.js::sessionAttachments.add.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason: 'Attachment id; addedAt beside it reads the hub clock.'
  },
  {
    key: 'src/services/contracts/conformance/dispatch.js::describeDispatchConformance.freshKey::Date.now()',
    count: 1,
    why: 'test-harness',
    reason:
      'An idempotency key unique to one conformance-spec run, so no prior ledger entry can satisfy it.'
  },
  {
    key: 'src/services/data/mock/MockCommandService.js::dispatcher.now::new Date()',
    count: 1,
    why: 'contract-pinned',
    reason:
      'The audit event `ts`. C3 (docs/contracts/C3-events.md) rules it the wall clock on purpose: the hub clock is a constant, so every event in a session would carry one instant and the ledger would lose its time order. c3Events.contract.test.js pins the exact value.'
  },
  {
    key: 'src/services/sourcing/rfqTemplates.js::rfqTemplateStore.save.template.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason:
      'Saved-template id persisted to localStorage; must not collide across reloads. createdAt reads the hub clock.'
  },
  {
    key: 'src/services/sourcing/rfxTemplates.js::makeStore.save.id::Date.now()',
    count: 1,
    why: 'unique-id',
    reason:
      'Saved RFI/RFP template id persisted to localStorage; savedAt is passed in on the hub clock by the caller.'
  }
];
