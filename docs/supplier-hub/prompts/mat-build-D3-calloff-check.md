# Prompt: Material D3 · ASN against call-off, and the call-off-not-covered alert

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with D1 and F1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MR-6 BR-10 to BR-13 are accepted (owner, 2026-09-29): warnings never block.
- Warnings are computed when read, from the call-off and its ASNs, never stored as final truth. The ASN stores the warnings shown at submit for the record.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-13.
- In the requirements: MR-6 section d step 5, the planner step, BR-10 to BR-13, edge cases 5 and 6, AC-05 to AC-07.

Then read these files:
- `callOffRules.ts` (`checkTolerance` :314, `headsUpsFor` :430, `SHIPPED_ASN_STATES` :423, derived statuses :658-705)
- `callOffTolerance.ts:41` and `CallOff.agreedDeliveries`
- `SupplierShipments.tsx:1188-1207` (the call-off picker)
- `inventoryAlertRules.ts:22-36, 89` and `inventoryReadModel.ts:132`
- F1's `daysToImpact`

## OBJECTIVE

Warn the supplier and the planner when an ASN does not match its call-off. Raise a PTI alert when a confirmed call-off is larger than the supplier's stock can cover.

## STANDARD

Warnings
- Pure `callOffWarnings(callOff, asns, asn)` → `{kind: 'qtyOver' | 'qtyUnder' | 'early' | 'late' | 'material', detail}[]`.
- Quantity uses the call-off's agreed deliveries when present (edge case 5), with `callOff.overPct`. Under is checked only when the ASN is marked final.
- Dates use `callOff.earlyAllowanceDays` for early, and any day after the agreed date for late. [MR-6 BR-10]

Unlinked
- `unlinkedCallOffWarning(poLine, callOffs, asn)`: "This PO line has an open call-off; link it?" [BR-11]

Wizard
- The confirm step lists the warnings with figures, e.g. "1,200 vs 1,000 called off (+20%)".
- Submit stays allowed. The ASN stores `callOffWarnings` as shown. [BR-12]

Planner
- The ASN list and the call-off page show "Mismatch" with the current comparison, recomputed on read (edge case 6).

Alert
- `callOffNotCovered` is added to `InventoryAlertRule`, `ALERT_RULES` and `PTI_ONLY_RULES`.
- `deriveAlertConditions` gains a call-off subjects argument, as `commitmentShortfalls` does.
- Condition: a confirmed call-off due within the supplier lead time is larger than the supplier's SOH plus in production due before the need date.
- Risk class by CR-24. `daysToImpact` = days to the need date.
- EN and ID alert strings. [AR-13, BR-13]

## Carried over from D1

- D1's "above available" batch warning (`batchAboveAvailable`) shows on the wizard's confirm step but not in the Submit drawer on a draft ASN. Show it, and your call-off warnings, in both places (plan FU-5).
- The planner's "Not in declared stock" marker shows only in the single-ASN drill-through. Show it wherever your planner "Mismatch" marker shows (plan FU-7).

## CONSTRAINTS

- No new verb. Warnings never block.

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - an ASN 10% over with a 5% tolerance submits and shows "Mismatch" with figures (AC-05)
  - a late ETA warns
  - agreed deliveries are used when present
  - an unlinked ASN on a PO line with an open call-off warns (AC-06)
  - a call-off of 1,000 inside the lead time with SOH + in production of 600 raises `callOffNotCovered`, and it is not shown to the supplier (AC-07)
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the warnings, wizard and planner markers, the alert rule and tests, run the gates and open the PR now.
