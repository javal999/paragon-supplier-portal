# Prompt: Material A2 · Material master fields and overlay

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- MAT-D6 (shelf life applies by master data, raw material and packaging alike) and MAT-D12 (planning groups are hub master data) are accepted (owner, 2026-09-29).
- The SAP-copied fields are fixture data until the MDM feed runs (plan AD-3, epic H).
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the plan: AD-3, AD-4, AR-05 and AR-19.
- In the requirements: MR-5 BR-01 and BR-05, MR-6 BR-06 and BR-07, MR-8 BR-01 and BR-02.

Then read these files:
- `src/services/sdc/types.ts:164-237` and `src/services/sdc/fixtures.ts:135` (`MATERIAL_MASTER`)
- `src/services/sdc/materialMaster.ts:65` (`materialEntry`)
- `src/services/sdc/materialGroups.ts:80`
- `materialMasterAuthoring.test.ts:407`, which pins the key set of `PK-PETB-8825`
- `src/lib/storedFieldGate/` (`allowlist.ts`)
- `src/services/liveness/registry.ts:53-170` and `registry.test.ts:173-200`

## OBJECTIVE

Add the material fields the other tasks need. The SAP-copied ones go in the fixture with a simulated label, and the hub-mastered ones are resolved through an overlay, so no reader of `MATERIAL_MASTER` changes.

## STANDARD

Fields
- Add these optional fields to `MaterialMasterEntry`: `mrpController?: string`, `minRemainingShelfLifeMonths?: number`, `shelfLifeRelevant?: boolean`, `planningGroupId?: string`.
- They are optional, so the pinned key set in `materialMasterAuthoring.test.ts:407` still holds for entries that do not set them. If a fixture entry you fill is pinned, update the pin and list it in the PR. [AR-05]

Fixture values (SAP copies)
- Fill `mrpController` on every entry, with 3 or 4 plausible codes spread across raw material and packaging.
- Fill `minRemainingShelfLifeMonths` on some entries only, so the 6-month default is also exercised.

Overlay (hub-mastered)
- `materialOverlayStore` holds rows `{materialCode, shelfLifeRelevant?, planningGroupId?, setAt, setBy}`.
- `materialEntry` returns the fixture entry merged with the latest overlay row.
- Defaults when unset:
  - `shelfLifeRelevant` = true when the entry has a `minRemainingShelfLifeMonths` or `materialType === 'ROH'`, otherwise false. The admin can change it for packaging (MAT-D6).
  - `planningGroupId` = the default planning group of its `materialGroup` (C5 creates the groups; until then, the id `pg-<materialGroup>`).

  No verb is added in this task. C5 and C4 add the verbs that write the overlay. [MAT-R15, AD-4]

Liveness
- Add capability `materialMasterSap` with `CAPABILITY_BACKING: null`, and a harvest-gated entry that names the MDM feed (model: `engineDataset`, `registry.ts:135-170`). [MAT-R14, AR-19]

Stored fields
- Each new field gets a reader or an `allowlist.ts` row with its reason. The reader can be the resolver itself if the gate counts it. Check how `storedFieldGate` defines a reader.

## CONSTRAINTS

- No screen changes (C4, D2 and C5 show these fields).
- Do not change `materialGroup` or any reader of it.

## DONE WHEN

- `npm run gates` passes on Node 22.
- `materialMasterOverlay.test.ts` covers:
  - `materialEntry` returns the fixture value when no overlay exists
  - an overlay row wins over the fixture for `shelfLifeRelevant`
  - the `shelfLifeRelevant` default is true for ROH and for any entry with a minimum shelf life, and false otherwise
  - the `planningGroupId` default is `pg-<materialGroup>`
- `registry.test.ts` passes with the new capability.
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Add the fields, fixture values, overlay, liveness entry and tests, run the gates and open the PR now.

---

## Notes on design decisions

- Optional fields keep the 16 importers and the pinned test unchanged, which is the point of AD-4.
- The `shelfLifeRelevant` default follows CPKB. A material with a shelf life in master data is checked whatever its type. Packaging without one is not, until the admin says so.
