// ─────────────────────────────────────────────────────────────────────────────
// S2 · THE GRANDFATHER LIST — the module-scope-literal gate's worklist.
//
// Every module-scope const consumed by `.map()` that carried reader-visible
// literals BEFORE this gate existed, and has not yet been adjudicated.
//
// ── ⚠️ THIS IS A DECOMPOSITION, NOT A DEFERRAL OF CONVENIENCE ───────────────
//   The batch that built the gate fixed shape S1 completely and stopped here on
//   purpose. S2 is not one fix, it is 57 separate rulings on whether a given
//   const is COPY (translate it) or DATA (state why it is not copy) — and a
//   large minority of them are entangled with the central label maps
//   (`statusLabel`, `priorityLabel`, `categoryLabel`), where the remedy is not
//   "add a key" but "route the page through the map". Half-doing that would
//   leave screens where some strings translate and others do not, which teaches
//   the reader that they are different kinds of text. That is the harm, and it
//   is worse than the wait.
//
// ── HOW A ROW LEAVES ────────────────────────────────────────────────────────
//   Adjudicate the const at its own site — `// i18n-defer: <why it is not
//   copy>` — or translate it. Then DELETE the row. The list is asserted
//   BILATERALLY: a row naming no live const fails as loudly as a live const
//   naming no row, so it cannot quietly rot into a list of things that used to
//   be true. **It can only shrink.**
//
// ⚠️ **NO COUNT IS WRITTEN IN THIS COMMENT.** `S2_GRANDFATHERED.length` is the
// count, derived where it cannot drift (§27, `FLOOR-IN-PROSE-01`). The ceiling
// asserted in the spec is the one number, and it is a CEILING precisely so that
// shrinking this list never requires editing a number.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `file::CONST` — see the header. Sorted; append is not expected, ever.
 * @type {readonly string[]}
 */
export const S2_GRANDFATHERED = [
  'src/components/delivery/PolicyEditor.jsx::ENFORCEMENTS',
  'src/components/layout-v2/LanguageMenu.jsx::LANGUAGES',
  'src/pages-v2/BuyerChannelTriage.jsx::CHANNELS',
  'src/pages-v2/BuyerCompliance/components/ComplianceFilters.jsx::CATEGORY_OPTIONS',
  'src/pages-v2/BuyerCompliance/components/ComplianceFilters.jsx::STATUS_OPTIONS',
  'src/pages-v2/BuyerCompliance/components/RequestPanelBody.jsx::REQUEST_CATEGORIES',
  'src/pages-v2/BuyerContracts/components/WizardBasicsStep.jsx::BRAND_OPTIONS',
  'src/pages-v2/BuyerContracts/components/WizardBasicsStep.jsx::CATEGORY_OPTIONS',
  'src/pages-v2/BuyerContracts/components/WizardBasicsStep.jsx::TYPE_OPTIONS',
  'src/pages-v2/BuyerContracts/components/WizardTermsStep.jsx::INCOTERMS_OPTIONS',
  'src/pages-v2/BuyerContracts/components/WizardTermsStep.jsx::PAYMENT_TERMS_OPTIONS',
  'src/pages-v2/BuyerInvoices.jsx::AGING_DATA',
  'src/pages-v2/BuyerInvoices.jsx::STATUS_OPTIONS',
  'src/pages-v2/BuyerRequisitions/components/NewPrItemStep.jsx::UOM_OPTIONS',
  'src/pages-v2/BuyerRequisitions/components/NewPrScheduleStep.jsx::COST_CENTERS',
  'src/pages-v2/BuyerRequisitions/components/NewPrScheduleStep.jsx::PRIORITY_OPTIONS',
  'src/pages-v2/BuyerSourcing/components/WizardScopeStep.jsx::MATERIAL_CATALOG',
  'src/pages-v2/BuyerSourcing/components/WizardTermsStep.jsx::INCOTERMS_OPTIONS',
  'src/pages-v2/BuyerSourcing/components/WizardTermsStep.jsx::PAYMENT_TERMS_OPTIONS',
  'src/pages-v2/BuyerSupplierProfile.jsx::MSG_LOG',
  'src/pages-v2/SupplierDocuments.jsx::CATEGORY_FILTERS',
  'src/pages-v2/SupplierDocuments.jsx::CERT_TYPES',
  'src/pages-v2/SupplierForecasts/components/ShipmentCard.jsx::ADVANCE_VERBS',
  'src/pages-v2/SupplierPerformance.jsx::GRADE_HISTORY',
  'src/pages-v2/SupplierRFQs/components/EvalBar.jsx::EVAL_SEGMENTS',
  'src/pages-v2/SupplierRegistration/components/CategoriesStep.jsx::CHANNELS',
  'src/pages-v2/SupplierRegistration/components/CategoriesStep.jsx::SUPPLY_CATEGORIES',
  'src/pages-v2/SupplierRegistration/components/CompanyInfoStep.jsx::COUNTRIES',
  'src/pages-v2/SupplierRegistration/components/CompanyInfoStep.jsx::INDONESIAN_PROVINCES',
  'src/pages-v2/SupplierRegistration/components/ContactsStep.jsx::CONTACT_ROLES',
  'src/pages-v2/SupplierRegistration/components/DocumentsAndBankStep.jsx::BANKS',
  'src/pages-v2/SupplierRegistration/components/DocumentsAndBankStep.jsx::DOCUMENTS',
  'src/pages-v2/SupplierRegistration/components/RequestTypeSelector.jsx::REQUEST_TYPES',
  'src/pages-v2/process-flows/FlowDiagram.jsx::MARKERS'
];

/** @returns {ReadonlySet<string>} */
export function grandfatheredKeys() {
  return new Set(S2_GRANDFATHERED);
}
