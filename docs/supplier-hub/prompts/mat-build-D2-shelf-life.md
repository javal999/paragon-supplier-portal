# Prompt: Material D2 · Shelf-life rule and the ASN exception

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with A2, A3 and D1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D6 is accepted (owner, 2026-09-29):
  - the rule applies to every material with `shelfLifeRelevant`, raw material and packaging alike
  - only Quality (`compliance`) approves an exception
  - approved goods are received into blocked stock
- The receipt date is the ASN's `eta`.
- Months are calendar months. Expiry equal to ETA + minimum passes.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AR-02 and AR-12.
- In the requirements: MR-6 section d steps 4 and 6, the approver flow, BR-05 to BR-09, edge cases 1 and 3, AC-03 and AC-04.

Then read these files:
- every site listed in AR-12, before writing any code
- `advanceShipNotice.flow.ts:29, 56-195`
- D1's `asnLineRefusal`
- A2's `materialEntry`, and A3's `shelfLife.defaultMonths`
- `src/components/grn/GRInspectionWizard.tsx:232`, for where the blocked-stock marker shows

## OBJECTIVE

Stop an ASN whose goods arrive with less than the minimum shelf life, unless Quality approves an exception, and carry that approval to receipt.

## STANDARD

Rule
- In `asnLineRefusal`, when `shelfLifeRelevant`:
  - expiry is required (`expiryRequired`)
  - expiry must be at or after ETA + the minimum (`shelfLife`)
- The minimum is `minRemainingShelfLifeMonths`, or `shelfLife.defaultMonths` when unset.
- The wizard shows "Expiry <date> · <n> months left at ETA" on each line. [MR-6 BR-05 to BR-07]

State
- Add `Awaiting exception` to `AsnStatus`, and to every site in AR-12. Decide each list explicitly:
  - it is not in transit
  - it is cancellable
  - it is not receivable

  Give it a tone and an ID label. [AR-12]

Verbs
- `t_asn_request_exception` (Draft → Awaiting exception): supplier, atom `asn:submit`, required `reason`. It is allowed only when the only refusal is `shelfLife`.
- `t_asn_approve_exception` (Awaiting exception → Submitted): atom `asn:approve-shelf-life` in `compliance`. It also carries `ASN_SUBMIT_COMPLETE` and `ASN_LINES_WITHIN_OPEN`, with `shelfLife` waived for the approved lines.
- `t_asn_reject_exception` (Awaiting exception → Draft): same atom, required `reason`.
- The atom name must match `ROLE_RE`. [AR-02, MR-6 BR-08]

Record
- `ASN.shelfLifeException` is appended with request and decision (who, when, reason). [MAT-R3, MR-6 BR-09]

Receipt
- The GR wizard and ASN detail show "Shelf-life exception approved: receive to blocked stock" on the approved lines.

ETA change
- An ETA later than the approved one sends the ASN back to Awaiting exception, with the earlier approval kept in history (edge case 1).

Strings
- EN and ID for every string. Pay the bill (MAT-R5).

## FLIPS

- A3 left a placeholder `FLIPS` row in `hubSettings.bl32.test.ts` for each setting key this task reads: it checks only the value in force. Replace each of your keys' rows with a real rule outcome that flips when the setting changes.

## CONSTRAINTS

- Out of scope: posting blocked stock into SAP (no SAP seam), and call-off checks (D3).

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - a packaging line with `shelfLifeRelevant` and expiry 5 months after ETA is refused by the verb (AC-03)
  - expiry exactly ETA + 6 months passes (edge case 3)
  - request, then approve, moves the ASN to Submitted and counts it in transit, while Awaiting exception does not count (AC-04)
  - a `planning` seat cannot approve
  - reject returns it to Draft with the reason
  - a later ETA after approval returns it to Awaiting exception
  - a material with `shelfLifeRelevant` false needs no expiry
- `statusLabel.test.ts` and `shipmentAxes.test.ts` pass.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines, listing each AR-12 site and the decision taken there.

Build the rule, state, verbs, receipt marker and tests, run the gates and open the PR now.
