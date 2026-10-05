# Prompt: Forecast UX A2 · One publish path, and responses first

**How to use:** Paste into Claude Code opened at the root of `paragon-supplier-portal`, on an up-to-date `main`. Wave 1, runs in parallel with A1 and A3. No slots to fill.
**Target:** paragon-supplier-portal · React 18 + TypeScript strict + Tailwind 3, mock data layer · rules from `portal-fit.md` and `fux-build-00-brief.md`
**Assumptions made:**
- FUX-D1 (owner, 2026-10-05): the SAP-plan publish is removed from the UI. The `forecast:publish` verb and its flow stay unchanged (FUX-R1).
- With the SAP path removed and the engine publish refused on simulated data, no page can publish in the demo. That is intended and must be stated on screen.
- Target model: Claude Opus 5 with thinking on.

---

## CONTEXT

Read `docs/supplier-hub/prompts/fux-build-00-brief.md` first, and follow FUX-R1 to FUX-R10. Then read these:
- In `docs/supplier-hub/research/FORECAST-UX-EVALUATION-2026-10.md`: findings F-01, F-13, F-23, F-24, F-27.
- `src/pages-v2/BuyerForecasts.tsx` (the `republish` function near :54 and the button block near :85-96, which renders `HandoffNotice` with `testId="handoff-forecast-publish"` when not held).
- `src/pages-v2/BuyerStabilise.tsx` (the publish handler near :345 and the withheld state from `isLive('engineDataset')`).
- `src/pages-v2/BuyerCommitments.tsx` (the page behind `/buyer/collaboration`).
- `src/lib/i18n/forecastCollaboration.ts`, `src/lib/i18n/stabilise.ts`, and the Commitments strings file.
- Tests that reference `fc-republish`, `fc-republish-emergency` or `handoff-forecast-publish` (grep), plus any spec that derives handoff sites across surfaces.

## OBJECTIVE

Make Publish to suppliers the only publish point, show on it what was last published and what is due, and put the exceptions table first on Supplier responses.

## STANDARD

Forecasts page (now "Published versions", F-01, F-27)
- Remove the Re-publish and Emergency re-publication buttons, the `republish` function, the `HandoffNotice` for `forecast:publish` on this page, and the strings only they used.
- Change the page title to "Published versions · Versi terbit". Under it, 1 line: "Plans are published from Publish to suppliers." with a link to `/buyer/stabilise`.
- Add a Source column to the version table, showing whether each version came from SAP's plan or the engine, read from the version record. If the record carries no source, stop and report (FUX-R8); do not infer it.

Publish to suppliers page (`BuyerStabilise`, F-13, F-24)
- Above the publish button, show "Last published: <version>, <date>, <source>" and "Next due: <date>", read from the published versions the page can already reach. If there is no reachable next-due date, show only the last-published line and report it.
- Add a link "Published versions" to `/buyer/forecasts`.
- When publish is withheld on simulated data, the refusal text says plainly that nothing can be published until real data arrives, and that this is the only publish point.
- Rephrase the KPI "Trade-off revisions inside the band" as "Trade-off weeks within limits: <n> of <m> after stabilising" (F-24).

Supplier responses page (`BuyerCommitments`, F-23)
- Keep the exceptions table first. Move the heatmap and the cumulative chart into a "Coverage" tab or a collapsed section below it. No data changes.

## CONSTRAINTS

- Touch only `BuyerForecasts.tsx`, `BuyerStabilise.tsx`, `BuyerCommitments.tsx`, their strings files and their tests. Breadcrumbs and page headers are task A4's.
- No change to `forecast:publish`, its flow, its policy hooks or `docs/contracts/` (FUX-R1).

## DONE WHEN

- `npm run gates` passes on Node 22.
- Tests cover:
  - no Re-publish or Emergency button renders on `/buyer/forecasts` for any role
  - the Published versions page links to Publish to suppliers and shows a Source column
  - Publish to suppliers shows the last-published line and the withheld message on simulated data
  - the Trade-off KPI renders in its new wording in EN and ID
  - Supplier responses renders the exceptions table before the coverage content
- On screen, as a Material Planner: the 3 pages show the changes above.
- A PR is open per FUX-R9.

## OUTPUT

Report in the brief's format, at most 25 lines.

Remove the SAP publish, build the publish status lines, reorder Supplier responses, update the tests, run the gates and open the PR now.
