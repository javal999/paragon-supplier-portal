// ────────────────────────────────────────────────────────────────────────────
// VENDOR QUALIFICATION READ MODEL — Material G1 (MR-10 BR-01 to BR-03, BR-08,
// BR-09; plan AD-1, AD-2; MAT-R4, MAT-R15).
//
// The level is COMPUTED here, at read, from the documents the hub holds and the
// lists in force — the hub is its source (BR-08), and nothing about it is
// stored. The history is REPLAYED from the same inputs every time it is read;
// no read writes anything (AD-2).
//
// Suppliers come from the ONE supplier resolver (`supplierEntry`), documents
// from the mutable document store, the lists from their store. The pure halves
// live in `transitions/qualificationRules.js`.
// ────────────────────────────────────────────────────────────────────────────

import { mockSuppliers } from '@data/mockSuppliers';
/** @import { QualificationChange, QualificationRuleLevel, VendorQualificationStatus, SupplierDocument, VendorQualification } from '../types' */
import {
  qualificationFromDocuments,
  qualificationHistoryFrom
} from '../../transitions/qualificationRules';
import { qualificationRuleStore } from '../../transitions/qualificationRuleStore';
import { sdcClock } from '../../sdc/clock';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { supplierEntry } from './supplierMaster';

/**
 * @param {string} supplierId
 * @returns {SupplierDocument[]}
 */
const documentsOf = (supplierId) =>
  supplierDocumentStore.all().filter((d) => d.supplierId === supplierId);

/**
 * A vendor's level on a date, the documents it lacks per level, and what is about to lapse.
 * @param {string} supplierId
 * @param {string} [onDate]
 * @returns {VendorQualificationStatus}
 */
export function qualificationFor(supplierId, onDate = sdcClock.now()) {
  return qualificationFromDocuments(documentsOf(supplierId), qualificationRuleStore.all(), onDate);
}

/**
 * A vendor's level changes, oldest first, replayed from its documents and the lists (AD-2).
 * @param {string} supplierId
 * @param {string} [nowIso]
 * @returns {QualificationChange[]}
 */
export function qualificationHistory(supplierId, nowIso = sdcClock.now()) {
  return qualificationHistoryFrom(documentsOf(supplierId), qualificationRuleStore.epochs(), nowIso);
}

/**
 * Is the list for this level still the seeded placeholder (MAT-D15)? Owner
 * ruling 2026-09-29: while it is, bidding eligibility (G2) warns instead of
 * refusing, so this is the one place G2 asks.
 * @param {QualificationRuleLevel} level
 * @returns {boolean}
 */
export function qualificationRulesPlaceholder(level) {
  return qualificationRuleStore.get(level).placeholder;
}

/**
 * One vendor's full qualification row, or null for an id the supplier master does not hold.
 * @param {string} supplierId
 * @param {string} [nowIso]
 * @returns {VendorQualification | null}
 */
export function supplierQualification(supplierId, nowIso = sdcClock.now()) {
  const entry = supplierEntry(supplierId);
  if (!entry) return null;
  return {
    supplierId,
    supplierName: entry.name,
    ...qualificationFor(supplierId, nowIso),
    history: qualificationHistory(supplierId, nowIso),
    placeholderRules: qualificationRuleStore.all().some((r) => r.placeholder)
  };
}

/**
 * Every vendor on the supplier master.
 * @param {string} [nowIso]
 * @returns {VendorQualification[]}
 */
export function allQualifications(nowIso = sdcClock.now()) {
  return mockSuppliers
    .map((s) => supplierQualification(s.id, nowIso))
    .filter(/** @returns {q is VendorQualification} */ (q) => q !== null);
}
