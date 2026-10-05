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
import type {
  QualificationChange,
  QualificationRuleLevel,
  VendorQualificationStatus,
  SupplierDocument,
  VendorQualification,
} from '../types';
import { qualificationFromDocuments, qualificationHistoryFrom } from '../../transitions/qualificationRules';
import { qualificationRuleStore } from '../../transitions/qualificationRuleStore';
import { sdcClock } from '../../sdc/clock';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { supplierEntry } from './supplierMaster';

const documentsOf = (supplierId: string): SupplierDocument[] =>
  supplierDocumentStore.all().filter((d) => d.supplierId === supplierId);

/** A vendor's level on a date, the documents it lacks per level, and what is about to lapse. */
export function qualificationFor(supplierId: string, onDate: string = sdcClock.now()): VendorQualificationStatus {
  return qualificationFromDocuments(documentsOf(supplierId), qualificationRuleStore.all(), onDate);
}

/** A vendor's level changes, oldest first, replayed from its documents and the lists (AD-2). */
export function qualificationHistory(supplierId: string, nowIso: string = sdcClock.now()): QualificationChange[] {
  return qualificationHistoryFrom(documentsOf(supplierId), qualificationRuleStore.epochs(), nowIso);
}

/**
 * Is the list for this level still the seeded placeholder (MAT-D15)? Owner
 * ruling 2026-09-29: while it is, bidding eligibility (G2) warns instead of
 * refusing, so this is the one place G2 asks.
 */
export function qualificationRulesPlaceholder(level: QualificationRuleLevel): boolean {
  return qualificationRuleStore.get(level).placeholder;
}

/** One vendor's full qualification row, or null for an id the supplier master does not hold. */
export function supplierQualification(supplierId: string, nowIso: string = sdcClock.now()): VendorQualification | null {
  const entry = supplierEntry(supplierId);
  if (!entry) return null;
  return {
    supplierId,
    supplierName: entry.name,
    ...qualificationFor(supplierId, nowIso),
    history: qualificationHistory(supplierId, nowIso),
    placeholderRules: qualificationRuleStore.all().some((r) => r.placeholder),
  };
}

/** Every vendor on the supplier master. */
export function allQualifications(nowIso: string = sdcClock.now()): VendorQualification[] {
  return mockSuppliers.map((s) => supplierQualification(s.id, nowIso)).filter((q): q is VendorQualification => q !== null);
}
