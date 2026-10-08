// ────────────────────────────────────────────────────────────────────────────
// BuyerContracts — module-scope constants and the shared typedefs.
//
// Moved out of `BuyerContracts.jsx` by the Phase 5 page split (no behaviour
// change). Two kinds of constant deliberately do NOT live here, because a
// guard reads them in the file that uses them:
//   · the reason→key message maps (`CONTRACT_VALUE_REFUSAL_KEY`,
//     `CONTRACT_NOTICE_REFUSAL_KEY`) sit beside their render sites in
//     `components/WizardTermsStep.jsx` — GL-1's chip-coverage guard pairs a
//     map's uses with its declaration in ONE file;
//   · the mapped option lists (`TYPE_OPTIONS`, `CATEGORY_OPTIONS`,
//     `BRAND_OPTIONS`, `PAYMENT_TERMS_OPTIONS`, `INCOTERMS_OPTIONS`,
//     `OBLIGATION_SUGGESTIONS`) sit in the wizard step that `.map()`s them —
//     the module-scope-literal gate keys them `file::CONST`.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ContractStatus, ContractType } from '@data/mockContracts' */
import { seedContractNumber } from '../contracts/contractCreateModel';

/**
 * @typedef {| 'all'
 *   | 'active'
 *   | 'expiring'
 *   | 'expired'
 *   | 'renewed'
 *   | 'draft'
 *   | 'terminated'} GroupTab
 */

/** @type {Record< ContractStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral' >} */
export const STATUS_VARIANT = {
  Draft: 'neutral',
  Active: 'success',
  Expiring: 'warning',
  Expired: 'danger',
  Renewed: 'info',
  Terminated: 'neutral'
};

/** @type {Record<string, string>} */
export const COUNTRY_FLAG = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN'
};

// Display-label maps: the underlying value stays the English enum literal
// (used for logic / storage / round-trip); only the visible label localizes.
/** @type {Record<ContractType, string>} */
export const TYPE_LABEL_KEY = {
  Supply: 'contracts.type.supply',
  Service: 'contracts.type.service',
  Framework: 'contracts.type.framework',
  NDA: 'contracts.type.nda',
  Quality: 'contracts.type.quality',
  Pricing: 'contracts.type.pricing'
};

/** @type {Record<string, string>} */
export const OWNER_LABEL_KEY = {
  Buyer: 'contracts.owner.buyer',
  Supplier: 'contracts.owner.supplier',
  Both: 'contracts.owner.both'
};

/** @type {Record<string, string>} */
export const CATEGORY_LABEL_KEY = {
  'Raw Material': 'contracts.category.rawMaterial',
  'Active Ingredient': 'contracts.category.activeIngredient',
  Fragrance: 'contracts.category.fragrance',
  Packaging: 'contracts.category.packaging',
  Other: 'contracts.category.other'
};

/**
 * @typedef {object} DraftObligation
 * @property {string} id Row identity, used as the React key. Minted once when the row is added
 *   (`newObligationId`), never derived from content: a custom obligation can
 *   repeat a title, and rows are removed from the middle of the list.
 * @property {string} title
 * @property {'Buyer' | 'Supplier' | 'Both'} owner
 * @property {string} dueDate
 */

/**
 * @typedef {object} DraftContract
 * @property {string} title
 * @property {ContractType | ''} type
 * @property {string} supplierId
 * @property {string} category
 * @property {string[]} brands
 * @property {string} startDate
 * @property {string} endDate
 * @property {boolean} autoRenewal
 * @property {string} noticeRequiredDays
 * @property {string} value
 * @property {string} paymentTerms
 * @property {string} incoterms
 * @property {DraftObligation[]} obligations
 */

/** The wizard's default notice period. A NUMBER, seeded through
 *  `seedContractNumber` — see that function's note on why a display formatter
 *  must never seed a parsed field. */
const DEFAULT_NOTICE_DAYS = 90;

/** @type {DraftContract} */
export const EMPTY_DRAFT = {
  title: '',
  type: '',
  supplierId: '',
  category: '',
  brands: [],
  startDate: '',
  endDate: '',
  autoRenewal: false,
  noticeRequiredDays: seedContractNumber(DEFAULT_NOTICE_DAYS),
  value: '',
  paymentTerms: 'Net 30',
  incoterms: 'CIF Jakarta',
  obligations: []
};
