# Prompt: Material B2 · Supplier weekly-update panel and reminders

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main` with B1 merged. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `mat-build-00-brief.md`
**Assumptions made:**
- Reminders are in-hub only. Email waits on epic H.
- "Weekly supplier confirmation" is not in the code (requirements section 16). The panel shows the stock deadline and leaves room for a second deadline once the owner names it.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/mat-build-00-brief.md` first, and follow MAT-R1 to MAT-R15. Then read these:
- In the requirements: MR-1 section d, BR-06, BR-07, and AC-01.

Then read these files:
- `src/pages-v2/SupplierHome.tsx` and `src/pages-v2/SupplierInventory.tsx`
- `src/pages-v2/inventory/SupplierSyncPanel.tsx`
- B1's `updateCycleFor` and `cycleStatus`
- the existing in-hub reminder pattern for the forecast commitment (`forecastRules.ts:410`, `commitmentReminderAt`)

## OBJECTIVE

Show each supplier when its next update is due and what is still missing, and remind it before the cutoff.

## STANDARD

Manual supplier panel
- On `SupplierHome` and at the top of `SupplierInventory`:
  - "Weekly stock update due <day> <time> WIB", with time left
  - "<n> of <m> updated"
  - the list of materials still missing this cycle, each linking to the stock entry form pre-filled with that material
- After the cutoff, the panel reads "Missed: <n> materials were not updated" until the next update.

Reminders
- In-hub reminders at 09:00 WIB, 1 working day before the cutoff and on the cutoff day.
- They are derived, never stored, the same way as `commitmentReminderAt`.

API supplier panel
- "Last sync <time> · Next sync <time>". Next sync = last attempt + `stockSync.intervalHours`.
- The note "Scheduled sync: not active in the prototype" appears with a liveness pill (MAT-R14).

SOP
- A short line: "Weekly update is part of the supplier SOP set by Material Planning." No link until a document exists. [MR-1 BR-06]

PTI view
- `BuyerInventory` gets a per-supplier "This cycle" column: "12 of 15", or "API".

Strings
- EN and ID for every string. [MAT-R6]

## Carried over from B1

- Admin → Alert thresholds and stale periods still labels each supplier × material row "Stale period · default" from `updateSla`, but since B1 freshness follows the update mode (`staleAt`), not `stale.defaultDays`, for any row without an override. Change that row's label to show what actually applies: "Weekly cutoff (manual)" or "24 h after last successful pull (API)", from `stockUpdateModeOf`, and keep the override wording where an override exists.

## CONSTRAINTS

- Read-only. No new verb.
- Out of scope: compliance percentages (B3).

## DONE WHEN

- `npm run gates` passes on Node 22.
- Page tests cover:
  - a manual supplier with 2 of 3 updated sees the missing material and a due time
  - after the cutoff, the missed state shows
  - an API supplier sees Last and Next sync and the not-active note
  - the reminder appears 1 working day before the cutoff and not 2
- A PR is open per MAT-R11.

## OUTPUT

Report in the brief's format, at most 25 lines.

Build the panels, reminders, column and tests, run the gates and open the PR now.
