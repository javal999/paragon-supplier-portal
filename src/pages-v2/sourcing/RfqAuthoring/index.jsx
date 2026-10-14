// ────────────────────────────────────────────────────────────────────────────
// THE RFQ WIZARD'S AUTHORING STEPS — items, quantity breaks, questions and
// options — and the two dialogs around them: the template picker ("Start from
// template" / "Copy a past RFQ") and "Save as template" (RFx spec 2026-09-21).
//
// Kept out of `BuyerSourcing.jsx` so the page owns the flow (draft, step gate,
// dispatch) and this file owns the controls. Every rule a control enforces is
// the model's (`rfqDraft.js` → `rfqModel.js`), so a step that lets the buyer
// through is a step the create verb will accept.
//
// Phase 5 split (PAGE-SPLIT-GUIDE): this folder replaces the one-file module.
// It is not a routed page (no `AppShellV2`). `index.jsx` keeps every name
// the importers use (`BuyerSourcing/index.jsx`, `components/RfqWizardModal.jsx`,
// `hooks/useRfqWizard.js`) and re-exports it from the file it now lives in.
// ────────────────────────────────────────────────────────────────────────────

export { refusalMessage } from './utils';
export { StepRefusal } from './components/StepRefusal';
export { TierEditor } from './components/TierEditor';
export { ItemsStep } from './components/ItemsStep';
export { QuestionsOptionsStep } from './components/QuestionsOptionsStep';
export { authoringReviewRows } from './reviewRows';
export { SaveTemplateDialog } from './components/SaveTemplateDialog';
export { TemplatePicker } from './components/TemplatePicker';
