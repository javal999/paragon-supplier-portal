# SC Hub Material build plan: architecture, review, epics and tasks

| Field | Value |
|---|---|
| Date | 2026-09-29 |
| Builds | `SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`: MR-1 to MR-10 |
| Decisions | The owner accepted every recommendation in section 13 of the requirements (MAT-D1 to MAT-D15) on 2026-09-29 |
| Code read | `main` at `6b26e09` |
| Delivery | 1 PR per task. Tasks in one lane run in order. Lanes run in parallel and merge one at a time, each re-checked against `main` before its merge |
| Prompts | `docs/supplier-hub/prompts/mat-build-*.md`. Every task prompt reads `mat-build-00-brief.md` first |
| Status | **Built, 2026-09-29.** Tasks A1–A3, B1–B3, C1–C5, C1b, D1–D3, E1–E2, F1, G1–G2 merged (section 4.2); B4 and I1 in progress at the time of this commit. Owner rulings during the build are in section 4.1 |

---

## 1. Architecture decisions

The hub is a React prototype on in-browser mock stores, with one command dispatcher (`src/services/transitions/dispatcher.ts`) and no backend (`CLAUDE.md`, "Backend is greenfield"). So most decisions here concern where a fact lives and where a rule is calculated. Transport is a question only for the 3 items that wait on Stage F.

### 1.1 Inputs

| # | Input | Value | Source |
|---|---|---|---|
| 1 | Volume and peak | Suppliers in the hub, materials per supplier, API-connected suppliers: not known. The fixture has 42 materials. The peak is the Thursday cutoff, when all manual suppliers upload | `[OPEN — real counts of suppliers, materials and API suppliers at go-live — Material Planning — before Stage F sizing of the 2-hour pull]` |
| 2 | Latency the user sees | Planner opens the simulation and alert pages interactively. No target set | `[OPEN — acceptable load time for the simulation page at real volume — owner (Levi) — before E2 ships]` |
| 3 | Retention and growth | Stock records are append-only. MR-2 needs 13 weeks plus a 4-week grace period. Retention policy not set | `[OPEN — how long stock records and exception records are kept — owner with Quality — before Stage F]` |
| 4 | Who controls the counterparty | Supplier ERPs (API pull): the supplier. SAP material master (MRP controller, minimum remaining shelf life, material group): PTI IT and MDM (`FORECAST-ENGINE-FEED-SPEC.md`, BL-103) | [S: requirements MR-1, MR-5, MR-6] |
| 5 | Reversibility | ASN submit leads to goods shipped. An award leads to a PO in SAP. A qualification refusal stops a bid. All 3 are real-world and hard to undo | [S: requirements MR-6, MR-2, MR-10] |
| 6 | Team capability | The build team ships React + TypeScript on the mock seam with the 4 gates (`CLAUDE.md`). No backend in production. Stage F is the SE team's | [S: `CLAUDE.md`] |
| 7 | Cost ceiling | Not stated | `[OPEN — budget line for Stage F integration work — owner — before BL rows for epic H are sized]` |
| 8 | Who reads under obligation | BPOM CPKB audit (shelf life, supplier qualification), BPJPH halal from 17 Oct 2026, ISO 22716 supplier evaluation | [S: requirements section 13.2, MAT-D6, MAT-D15] |

### 1.2 Decisions

**AD-1 · Derived, not stored: compliance, qualification, freshness, simulation, call-off warnings**
Decision: store only the inputs (stock records, sync attempts, ASNs, documents, overrides). Compute update compliance, qualification level, staleness, the simulation and call-off warnings in pure functions at read time, as the hub already does for risk class and delivery status (`inventoryRules.ts:182`, `callOffRules.ts:658`).
Why: a derived value cannot drift from its inputs. The page and the verb call the same function (MAT-R2).
Escape not taken: store the result when read-time compute is too slow at real volume (input 1). Not fired, because there is no volume figure and the fixture is small.
Reversal cost: low. Adding a cache later is additive.
Wrong if: the simulation page takes over 2 seconds at the real supplier × material count, or 2 screens show different compliance figures for one supplier.

**AD-2 · Qualification history is replayed from document events, not written on read**
Decision: `qualificationFor(supplierId, onDate)` is pure. The change history (MR-10 "logged with the document that caused it") is derived by replaying the supplier's document transitions in date order. No write happens during a read.
Why: rule 7 fired (an auditor reads the result). An append-only audit trail is needed, and the document transitions already are one (`supplierDocument.flow.ts:79-158`). Writing a ledger row inside a read would be a hidden side effect.
Escape not taken: a stored `QualificationChange` ledger, if replay proves slow or document history is purged. Neither is true in the mock.
Reversal cost: medium. A stored ledger later needs a backfill from the same replay.
Wrong if: a document history is ever edited or purged, because then the replay gives a different past.

**AD-3 · Fields per owning system**

| Field | Owner | Hub role |
|---|---|---|
| `stockUpdateMode` | Hub (admin) | Master |
| Trade name, supplier material number | Hub (supplier enters, Material Planning approves) | Master |
| MRP controller code | SAP (MARC-DISPO, per plant) | Copy; fixture labelled simulated until the feed runs |
| MRP controller → hub users | Hub (admin) | Master |
| Minimum remaining shelf life | SAP where maintained; hub default 6 months | Copy with fallback |
| `shelfLifeRelevant` | Hub (admin), per material | Master |
| Planning group | Hub now; SAP later with MDM (MAT-D12) | Master |
| Capacity per supplier × planning group | Supplier | Master (hub is where it is entered) |
| Principal lead time (ETA fallback) | Hub (admin) | Master |
| Qualification rules, sourcing-type map | Hub (Procurement with Quality) | Master |
| Qualification level | Hub | Derived (AD-1) |

Why: each field has one writer. SAP fields are copies with a simulated label until the feed runs (MAT-R14).
Wrong if: MDM moves planning groups into SAP. The hub then becomes a copy, and C5's verbs are turned off.

**AD-4 · Immutable masters get an overlay store, not an edit to the fixture**
Decision: the supplier master (`data/mockSuppliers.ts:63`) and the material master (`MATERIAL_MASTER = Object.freeze`, `sdc/fixtures.ts:135`) stay frozen. Hub-mastered fields live in overlay stores, and each master is read through 1 resolver: `materialEntry` (`sdc/materialMaster.ts:65`) and a new `supplierEntry`.
Why: 16 non-test modules import the material master. A resolver keeps them unchanged, and the fixture stays the "SAP" base the feed will replace.
Escape not taken: none. Editing a frozen fixture is not a choice.
Reversal cost: low. When the backend lands, the overlay becomes a table.
Wrong if: a reader bypasses the resolver and reads the fixture directly. AR-05 lists the known readers.

**AD-5 · New targets in their own modules, 1 line in `TARGETS`**
Decision: each new `CommandTarget` and its policy hooks sit in a new file under `src/services/data/mock/targets/`. `MockCommandService.ts` gains only an import and 1 `TARGETS` line.
Why: `MockCommandService.ts` has 5,273 lines, and 61 commits touched it since 2026-09-01. Parallel tasks collide at the `TARGETS` literal (`:4863-4931`) (AR-01).
Escape not taken: keep everything in 1 file if only 1 lane runs at a time. Not fired: the plan runs 3 to 4 lanes.
Reversal cost: low.
Wrong if: a moved target needs private helpers from the big file. The task then imports them; it does not copy them.

**AD-6 · The 2-hour pull and the SAP feeds wait on Stage F, behind the same seam**
Decision: the prototype builds the schedule and settings (MR-1 BR-01), and the pull stays button-triggered. The scheduled job, supplier API contracts and SAP master feeds are epic H and have no prompts. Transport per supplier is not chosen here.
Why: the counterparties (supplier ERPs, SAP) are outside the team's control (rule 7), and inputs 1 and 7 are open.
Wrong if: a pilot supplier's API is ready before Stage F. Then a narrow pull for that supplier is justified.

**AD-7 · Second attempt**
Decision: every new verb goes through the dispatcher's idempotency and expected-state gates (`dispatcher.ts:4-12`). A resent stock upload is a new append-only record, and the latest `declaredAt` wins (`inventoryDeclarationStore.ts:64`). Bulk trade-name load upserts by (supplier, material): a second load of the same file changes nothing.
Wrong if: a supplier's ERP resends an older snapshot after a newer one. Then order by the supplier's snapshot time, not the arrival time.

**AD-8 · Failure containment**

| Dependency fails | What degrades | What stops |
|---|---|---|
| Supplier API pull | Figure goes stale after 24 h (MAT-D8); week non-compliant | Nothing else |
| SAP material feed absent | Fixture values shown with a simulated label | Nothing |
| Qualification lists not provided (MAT-D15) | Placeholder lists, labelled | MR-10 go-live only. Enforcement stays on with placeholders. It never falls open |
| Capacity not confirmed for a week | No cap; the row says so | Nothing |

Rule 7 fired for the qualification row: an auditor reads the result, so it fails closed.

### 1.3 Blocked

| Choice point | Missing input | Owner | Needed by |
|---|---|---|---|
| Stage F sizing of the 2-hour pull | Input 1 (API supplier count, materials) | Material Planning | Before epic H |
| Store or compute the simulation | Inputs 1 and 2 | Material Planning; owner | Before E2 ships |
| Record retention | Input 3 | Owner with Quality | Before Stage F |
| Transport per supplier API | Supplier API contracts (RSK-02) | Supplier onboarding | Epic H |

### 1.4 Hand off
AD-1 to AD-5 go into the TRD Design section. AD-2 (replay vs ledger) and AD-4 (overlays) go into Other options considered. AD-2 and AD-3 need an ADR, because the planning-group owner (MAT-D12) and the audit trail will be re-argued when MDM and Quality review.

---

## 2. Architecture and implementation review

Severity: **High** means a task breaks or duplicates behaviour unless it handles the finding. **Medium** adds cost or risk. **Low** is a tidy-up.

### 2.1 What is sound, and what the tasks keep
- **One path for state changes.** Every change runs through the dispatcher's ordered gates (`dispatcher.ts:4-12`). New verbs use it and nothing else.
- **Settings and reason codes are already governed.** New keys go into `DEFS` (`hubSettings.ts:64-203`) and new lists into `REASON_LISTS` (`reasonCodes.ts:38`). The admin screens loop over them (`AdminRuleValues.tsx:138`, `AdminReasonCodes.tsx:75`).
- **"Reason, with a note when Other" exists.** `capacityRules.ts:176-178` uses `NOTE_REQUIRED_CODE` (`reasonCodes.ts:65`), and the alert close reason copies it.
- **Invariants are tests.** Role atoms, surfaceable, purpose rows, the C1 contract, owner-less scope, stored fields, liveness and EN/ID parity all fail the gates when a verb or field is added without its bookkeeping (MAT-R5).

### 2.2 Findings

**AR-01 · High · `MockCommandService.ts` is the merge bottleneck**
The file has 5,273 lines. Every new verb edits its imports, a `bindPolicyHook` section and the `TARGETS` literal (`:4863-4931`).
*Fix:* AD-5, applied in every task that adds a target.

**AR-02 · High · The atom name in the requirements is invalid**
`ROLE_RE` (`services/transitions/validate.ts:17`) allows only lowercase and dashes after the colon. `asn:approveShelfLife` makes `assertValidFlow` throw, the flow never registers, and the suite reports "no tests".
*Fix, task D2:* use `asn:approve-shelf-life`. Every atom in this plan is written in that form.

**AR-03 · High · No supplier write path**
The supplier master is a plain array (`data/mockSuppliers.ts:63`). It has no store, no target and no verb (reads only: `MockSupplierService.ts:15-33`). MR-1 BR-02 needs `stockUpdateMode`.
*Fix, task A1:* a supplier overlay store and target (AD-4), modelled on `threePlStore.ts`.

**AR-04 · Medium · "Hub administrator only" cannot be expressed**
`admin` is the derived union of every lane (`businessRoles.ts:546`), and governance atoms live in `compliance` (`:237-297`). MR-1 AC-06 cannot be met literally.
*Fix, task A1:* put `supplier:set-update-mode` in `compliance`, and record the difference in task I1.

**AR-05 · High · The material master is frozen and imported widely**
`MATERIAL_MASTER` is `Object.freeze` (`sdc/fixtures.ts:135`), with 16 non-test importers. `materialMasterAuthoring.test.ts:407` pins the exact key set of `PK-PETB-8825`, so a new required field breaks it.
*Fix, task A2:* new fields are optional on `MaterialMasterEntry`. The SAP-copied ones are filled in the fixture. The hub-mastered ones go in an overlay resolved through `materialEntry` (AD-4). Each new stored field gets a reader or an `allowlist.ts` row (`storedFieldGate.test.ts`).

**AR-06 · Medium · 2 places decide "API-connected"**
`isApiConnected` (`inventoryReadModel.ts:58`) is read at `inventoryRules.ts:351,391`, `inventoryReadModel.ts:108`, `BuyerInventory.tsx:92`, `SupplierSyncPanel.tsx:47-110` and the `STOCK_SYNC_CONNECTED` hook (`MockCommandService.ts:2590-2594`). The sync target reads `API_CONNECTIONS[supplierId]` directly (`:2555`). A supplier set to API but absent from the fixture silently records `failed/timeout`.
*Fix, task A1:* 1 resolver, used at every reader including `:2555`.

**AR-07 · Medium · Freshness cannot see the mode or the calendar**
`stockFreshness` (`inventoryRules.ts:284-293`) works in days only. Its 7 callers pass `(position, now)`: `BuyerInventory.tsx:76,79,106`, `SupplierInventory.tsx:83`, `SupplierHome.tsx:120`, `AdminRuleValues.tsx:595`, `inventoryDisplay.tsx:100` and `inventoryAlertRules.ts:120`.
*Fix, task B1:* compute a `staleAt` instant in `buildInventoryPositions` (`inventoryRules.ts:388-391`) from mode, cycle and calendar. Keep the signature.

**AR-08 · Medium · Setting types do not fit MR-1**
`HubSettingValue = number | boolean | null` (`hubSettings.ts:260`). `HubSettingUnit` (`:33`) has no hours, weekday or time. `hubSettingFlag` is typed to 1 key (`hubSettingsStore.ts:235`). `hubSettings.bl32.test.ts:592` fails any key without a `FLIPS` entry.
*Fix, task A3:* add the `hours`, `weekday` and `time` units (time as minutes after midnight), and format them in `AdminRuleValues.tsx:76-86`. Add an ordering rule so that `compliance.warnPct` stays above `compliance.flagPct` (`ORDER_RULES`, `:317`).

**AR-09 · Medium · The score is built on 2 paths**
`PerformanceInput` (`performanceRules.ts:312`) is built by the mock (`supplierMeasureReadModel.ts:18`) and again on the client (`pages-v2/performance/performanceDisplay.ts:60-80`). CR-23 and CR-15 read OTIF only (`complianceGate` via `rfxSupplierOtif`, `reliabilityScoreFor`), so the compliance weight moves grade and band but not the gate or CR-15 — corrected by B3 (#105) from source; the original text here said it moved both.
*Fix, task B3:* `assessmentScore` takes compliance % as a 4th argument, computed once in `supplierMeasure` (`:329`). Both paths call it. The PR lists every supplier whose grade changes (MR-2 edge case 5).

**AR-10 · Medium · "Is a reason owed" is written 3 times**
The rule is written in the award panel (`AwardPanel.tsx:429-430`), the RFQ hook (`MockCommandService.ts:4031-4040`) and the RFP hook (`:4153-4156`).
*Fix, task B4:* `awardReasonOwed(...)` in `services/sourcing/awardShape.ts`, next to `awardItemsDepartingBest` (`:427`), called from all 3. Add `AWARD_REASON_COMPLIANCE_FLAG` to `AwardRefusalCode` (`:184`) and `awardRefusalText` (`:214`).

**AR-11 · High · ASN submit cannot see expiry or ETA**
`ASN_LINES_WITHIN_OPEN` passes only `{materialCode, shippedQty}` to `asnLineRefusal` (`MockCommandService.ts:637-640`). `ASN_SUBMIT_COMPLETE` checks the batch by hand (`:681`). The wizard re-derives the checks itself (`SupplierShipments.tsx:175-197, 1027-1034`). A shelf-life refusal added to `asnLineRefusal` would never fire.
*Fix, task D1:* pass `lotNumber`, `expiryDate` and `eta`. The submit hook calls `asnLineRefusal` with `requireBatch`, and the wizard's `readLines` calls it too.

**AR-12 · Medium · A new ASN state touches many unions**
`'Awaiting exception'` touches the following, and the first 2 fail `tsc`:
- `STATUS_VARIANT` and `counts` (`SupplierShipments.tsx:76, 802`)
- flow states (`advanceShipNotice.flow.ts:29`)
- `ASN_CANCELLABLE_STATES` (`fulfilmentRules.ts:44`), together with `t_asn_cancel.from` (`advanceShipNotice.flow.ts:94`)
- `SHIPPED_ASN_STATES` (`callOffRules.ts:423`)
- `buyerDerivations.ts:84,87`
- `RECEIVABLE_ASN_STATUSES` (`GRInspectionWizard.tsx:232`)
- `shipmentAxes.test.ts:30`
- `statusTone.ts:91` and `statusLabel.ts:84` (`statusLabel.test.ts:14`)
- `sdc/shipment.ts:74,107`

`IN_TRANSIT_ASN_STATES` (`inventoryRules.ts:216`) already excludes it correctly. The approve verb (→ Submitted) must also carry `ASN_SUBMIT_COMPLETE` and `ASN_LINES_WITHIN_OPEN` (`advanceShipNotice.flow.ts:83-84`).
*Fix, task D2:* every site in one PR, each decided and listed.

**AR-13 · Medium · Alert sort is undone by grouping, and the new rule has no input**
`alertsFromLedger` sorts at `inventoryAlertRules.ts:180-185`. `BuyerAlerts.tsx:74` then re-groups with `groupAlertsBySupplier` (`:211-224`), which sorts by supplier name. `AlertCondition` has no `daysToImpact`. `deriveAlertConditions` (`:89`, called at `inventoryReadModel.ts:132`) takes no call-offs.
*Fix:* task F1 adds `daysToImpact` and sorts groups by their most urgent alert. Task D3 adds a call-off subjects argument, as `commitmentShortfalls` does.

**AR-14 · Medium · The close verb requires a note**
`requiredFields: ['actionNote']` (`inventoryAlert.flow.ts:29-30`) makes the dispatcher refuse an empty note (`dispatcher.ts:624`).
*Fix, task F1:* `closeReason` becomes required, `actionNote` becomes optional, and hook `ALERT_CLOSE_REASON_GIVEN` requires the note for `other`.

**AR-15 · High · Capacity group names come from i18n**
Capacity labels come from `t('inv.group.${materialGroup}')` (`BuyerCapacity.tsx:258`, `SupplierCapacity.tsx:171`). A planning group named by Material Planning has no key. Grouping keys on `entry.materialGroup` (`capacityRules.ts:73-74`). Its other readers and writers:
- `capacityRules.ts:43-46, 131-137`
- `types.ts:556, 633, 642`
- `capacitySubmission.flow.ts:32`
- `MockCommandService.ts:2657-2684`
- `commandHooks.ts:2042, 2101`
- `CAPACITY_SEED` (`fixtures/inventoryHub.ts:209-225`)
- `capacityFilters.ts:27-84`
- `inventoryAlertRules.ts:134`

`forecastRules`, the engine and `MockProcurementService.ts:547` use `materialGroup` for a different concept and must not change.
*Fix, task C5:* key capacity on `planningGroupId`, take names from store data, and migrate the seed to each SAP group's default planning group.

**AR-16 · High · RFQ publish has no invitee gate**
`t_rfq_publish` has `policyHooks: []` (`rfq.flow.ts:124`). `RFX_PUBLISH_HAS_INVITEES` reads `event.invitees` (`MockCommandService.ts:3535-3551`), while the RFQ uses `invitedSupplierIds`, so attaching the hook as is refuses every RFQ.
*Fix, task G2:* a new hook `RFX_INVITEES_QUALIFIED`, reading the right field per event type, on RFI, RFP and RFQ publish. Do not add qualification to `GATE_CRITERIA` (`complianceGate.ts:44`), because CR-23 also gates scoring and MR-10 BR-07 lets a dropped supplier respond.

**AR-17 · Medium · Category mapping lives in a page, over 3 vocabularies**
`CATEGORY_TO_SUPPLIER_CATEGORY` is in `pages-v2/BuyerSourcing.tsx:236`. Categories come from `RFQCategory` (`data/mockRfqs.ts:34`; RFQs have no `purchasingGroup`), from RFI and RFP `materialCategory: string` plus `purchasingGroup?` (`sourcing/types.ts:258, 431`), and from `Supplier.category`.
*Fix, task G2:* move the map to `services/sourcing/`. The sourcing-type map is keyed by `RFQCategory` values and by purchasing group, and resolves per event type.

**AR-18 · Medium · Document expiry window is 180 days, not 90**
Supplier documents use `documentExpiry` with `DOCUMENT_EXPIRING_WINDOW_DAYS = 180` (`dayProjection.ts:134, 201`). The 90 days in `complianceProjection.ts:29` belong to the certificate registry. MR-10 section b says "90 days". `certType` exists only on the optional `declaration` (`types.ts:1097-1106`), and no fixture document has one.
*Fix, task G1:* use `documentExpiry`, and match rules by `category` with an optional `certType`. Task I1 corrects the requirement's wording.

**AR-19 · Low · Liveness labels are per page**
A capability pill (`liveness/registry.ts:53, 100`; `registry.test.ts:173-200`) labels a page. An MRP-controller column on inventory pages needs its own capability and a pill beside the column header.
*Fix, tasks A2 and C4.*

**AR-20 · Low · Creation-only targets need an owner-less scope row**
`ownerlessScope.test.ts:446` pins the `unprobeable` list. `SimulationOverride` and the trade-name bulk load are creation-only.
*Fix:* tasks E1 and C2 extend the list.

### 2.3 Out of reach of this plan
- **No backend.** The 2-hour scheduled pull, the SAP feeds and email reminders are epic H.
- **No named person.** The actor is `UNATTRIBUTED: NO_PERSON_IN_SESSION` (`CLAUDE.md`). Every new record keeps an actor field.

---

## 3. Epics and tasks

1 task is 1 PR and 1 prompt. "Needs" lists the tasks that must be merged first.

### Epic A · Foundations

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| A1 | Supplier overlay store and target; `stockUpdateMode` with verb `t_supplier_set_update_mode` (atom `supplier:set-update-mode` in `compliance`); 1 API-connected resolver at every reader (AR-03, AR-04, AR-06; MR-1 BR-02, AC-06) | none | `mat-build-A1-supplier-overlay.md` |
| A2 | Material master fields (`mrpController`, `minRemainingShelfLifeMonths`, `shelfLifeRelevant`, `planningGroupId`) as optional fields plus an overlay resolved through `materialEntry`; fixture values; liveness capability for SAP-copied fields (AR-05, AR-19; MR-5 BR-01, MR-6 BR-06/07) | none | `mat-build-A2-material-master.md` |
| A3 | Setting units `hours`, `weekday`, `time`; new keys for MR-1, MR-2 and MR-6; ordering rules; reason list `alertClose` (AR-08; MR-1 f, MR-2 BR-04/05, MR-6 f, MR-9 BR-05) | none | `mat-build-A3-settings-reasons.md` |

### Epic B · Update discipline (MR-1, MR-2)

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| B1 | `updateCycleFor`, `cycleStatus`, staleness by mode through `staleAt` (AR-07; MR-1 BR-03 to BR-05) | A1, A3 | `mat-build-B1-update-cycle.md` |
| B2 | Supplier weekly-update panel, in-hub reminders, Last and Next sync, SOP note (MR-1 d, BR-06, BR-07, AC-01) | B1 | `mat-build-B2-update-panel.md` |
| B3 | `updateCompliance`; `assessmentScore` with compliance on both paths; compliance on performance and scorecard pages (AR-09; MR-2 BR-01 to BR-05) | B1 | `mat-build-B3-compliance-score.md` |
| B4 | `awardReasonOwed` in 1 place; compliance pill on RFQ and RFP award panels; `AWARD_REASON_COMPLIANCE_FLAG`; `complianceAtAward` snapshot (AR-10; MR-2 BR-06, BR-07) | B3 | `mat-build-B4-award-compliance.md` |

### Epic C · Master data (MR-3, MR-4, MR-5, MR-8)

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| C1 | Template headers mark optional columns; the parser ignores the suffix; the upload panel shows the column table; E required (0 allowed) and F required when E > 0 (MR-4, MAT-D4) | none | `mat-build-C1-template.md` |
| C2 | Trade names: entity, flow, target, verbs; supplier "My materials" tab; Material Planning approval page; bulk load (MR-3 BR-01 to BR-03, BR-05, BR-06) | none | `mat-build-C2-trade-names.md` |
| C3 | `MaterialSearch` and `matchMaterial`, used on inventory, stock entry, ASN line, call-offs, alerts (MR-3 BR-04, AC-02, AC-04) | C2 | `mat-build-C3-material-search.md` |
| C4 | MRP controller mapping (admin), column and "My materials" filter on 5 surfaces; supplier sees the name only (MR-5 BR-02 to BR-04) | A2 | `mat-build-C4-mrp-controller.md` |
| C5 | Planning groups: store, flow, verbs, admin page; capacity keyed on `planningGroupId`, names from data; seed migration; "Needs re-entry" (AR-15; MR-8) | A2 | `mat-build-C5-planning-groups.md` |

### Epic D · ASN (MR-6)

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| D1 | 1 line rule carrying batch, expiry and ETA, used by submit and wizard; batch dropdown from declared stock with available quantity; `batchSource` (AR-11; MR-6 BR-01 to BR-04) | none | `mat-build-D1-asn-batch.md` |
| D2 | Shelf-life rule; `Awaiting exception` state across every union; request, approve and reject verbs (atom `asn:approve-shelf-life` in `compliance`); blocked-stock marker (AR-02, AR-12; MR-6 BR-05 to BR-09) | A2, A3, D1 | `mat-build-D2-shelf-life.md` |
| D3 | Call-off warnings and the unlinked warning on the ASN; planner "Mismatch" marker; alert rule `callOffNotCovered` (AR-13; MR-6 BR-10 to BR-13) | D1, F1 | `mat-build-D3-calloff-check.md` |

### Epic E · Stock simulation (MR-7)

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| E1 | `simulateSupplierStock` (supplier available, free to call off, PTI inbound, weekly series, capacity cap, ETA fallback); `SimulationOverride` store, target and verb (AR-20; MR-7 BR-01 to BR-09) | A2, C5 | `mat-build-E1-simulation-engine.md` |
| E2 | Stock simulation page, route, menu, filters, planner input, "Create call-off" link (MR-7 e, AC-01 to AC-06) | E1, C4 | `mat-build-E2-simulation-page.md` |

### Epic F · Alerts (MR-9)

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| F1 | `daysToImpact`, sort within class and groups by most urgent; close reason required, note optional unless Other; closed-tab reason filter and counts (AR-13, AR-14; MR-9) | A3 | `mat-build-F1-alerts.md` |

### Epic G · Vendor qualification (MR-10)

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| G1 | Qualification rules store and admin screen; `qualificationFor` and a replayed history; supplier profile panel; scorecard strings replaced; "Application accepted" label (AD-2, AR-18; MR-10 BR-01 to BR-04, BR-08 to BR-10) | A1 | `mat-build-G1-qualification.md` |
| G2 | Sourcing-type map in `services/sourcing`; invitee filter; `RFX_INVITEES_QUALIFIED` on RFI, RFP and RFQ publish; award refusal after CR-23 (AR-16, AR-17; MR-10 BR-05 to BR-07) | G1 | `mat-build-G2-bidding-eligibility.md` |

### Epic H · Blocked on a backend (no prompts)

| Item | Blocked on |
|---|---|
| Scheduled 2-hour pull per API supplier (MR-1 BR-01) | Stage F1, supplier API contracts (RSK-02) |
| SAP feed for MRP controller, minimum remaining shelf life, material group (MR-5 BR-05, MR-6 BR-06) | MDM feed (BL-103) |
| Email reminders for the Thursday cutoff | Email service (as BL-120) |

### Epic I · Documentation

| Task | Deliverable | Needs | Prompt |
|---|---|---|---|
| I1 | Fold MR-1 to MR-10 as built into `SUPPLIER-HUB-REQUIREMENTS.md`, `BUILD-GAP.md`, `BACKLOG.md` and `DECISION-GUIDE.md`; record MAT-D1 to MAT-D15; correct the requirement text for AR-02, AR-04 and AR-18; epic H as backlog rows | all of A to G | `mat-build-I1-docs-sync.md` |

### 3.1 Order and lanes

```
Lane 1  A1 ─► B1 ─┬► B2
                  └► B3 ─► B4
        A1 ─► G1 ─► G2
Lane 2  A2 ─┬► C4 ──────────┐
            └► C5 ─► E1 ─────┴► E2
Lane 3  A3 ─► F1 ─┐
        D1 ───────┼► D3
        D1 + A2 + A3 ─► D2
Lane 4  C1     C2 ─► C3
Last    I1 (after every task in A to G)
```

- A1, A2, A3, C1, C2 and D1 need nothing and can start together.
- Run at most 3 builders at once. Suggested waves:
  1. A1, A2, A3
  2. B1, C5, D1
  3. B3, E1, F1
  4. G1, D2, C4
  5. B2, B4, D3
  6. E2, G2, C2
  7. C1, C3
- Merge one PR at a time. The next PR merges `main` in and re-runs the gates before it merges. The most likely conflicts are `TARGETS` (AD-5 limits this to 1 line), `businessRoles.ts`, `docs/contracts/C1-methods.md` and `scripts/floor.json` (take the higher value per field).

---

## 4. Found during the build

### 4.1 Owner rulings during the build

| Date | Found in | Ruling |
|---|---|---|
| 2026-09-29 | B1 (#88) | **API staleness: 24 hours wins.** An API supplier's figure is stale only when its last successful pull is older than `stale.apiHours` (24 h). A failed pull shows "Last pull failed <time>" on the row but does not make the figure stale. Supersedes the REQ-E08-02 edge case "flag them as stale" on a failed sync |
| 2026-09-29 | G1 (#91) | **Qualification lists are edited by Procurement and Quality.** Atom `qualification:manage` sits in both `procurement` and `compliance` |
| 2026-09-29 | G1/G2 | **Warn-only while any qualification list is a placeholder.** G2's invite filter, publish hook and award refusal show "Not qualified: <missing documents>" and require a reason instead of refusing, as long as a list for the needed level has `placeholder: true`. Enforcement (fail-closed, AD-8) switches on by itself once Procurement and Quality save a real list |
| 2026-09-29 | C5 (#92) | **BL-133's LTP-to-capacity join follows planning groups.** Accepted: the BL-133 tests change keys only (`materialGroup` → `planningGroupId` / material lists); no expected number, level or refusal changed |
| 2026-09-29 | C1 (#104) | **In-production (column E) is enforced by the verb too, except for API sync.** `INV_DECLARE_DETAIL_VALID` refuses a blank in-production quantity, and a quantity above 0 without a completion date, on `manual`, `template` and `pti` records; `api` pulls are exempt (the supplier ERP may not send it; the simulation shows it as Missing). Follow-up task C1b |
| 2026-09-29 | A2 (#84) | **Raw materials default to the shelf-life check.** `shelfLifeRelevant` defaults to true for every `ROH` material and for any material with a minimum remaining shelf life in master data; packaging without one defaults to false. An admin can switch any material off or on. This widens MAT-D6's wording ("by master data, never by material type"): task I1 corrects MAT-D6 and MR-6 BR-07 |

### 4.2 Merged

| Task | PR | Merge commit |
|---|---|---|
| A3 | #85 | `4cfb5ba` |
| A1 | #86 | `bdf60ae` |
| D1 | #89 | `122aa2c` |
| C4 | #90 | `d63051b` |
| F1 | #87 | `664acfc` (combined gate run fully green) |
| E2 | #108 | `1a7cf1f` (combined with #99 from another session: fully green, 7898/507; worked-example sample row visible on screen) |
| C1b | #107 | `3e370e2` (owner ruling: verb enforces in-production on manual/template/pti, API exempt; combined run fully green, 7862/503) |
| B2 | #106 | `94bda09` (combined run fully green, 7849/503) |
| B3 | #105 | `0273d87` (combined run fully green, 7834/502; no supplier changes grade) |
| C1 | #104 | `47318e7` (combined run fully green, 7815/501) |
| E1 | #103 | `86d1965` (combined run fully green, 7806/501; worked example asserted exactly) |
| C3 | #102 | `0777652` (combined run fully green, 7764/499) |
| G1 | #91 | `5e00304` (combined run fully green, 7742/497) |
| D3 | #101 | `d29ca60` (combined tree first failed tsc-specs: D3's hand-built InventoryPosition lacked B1's new required `staleAt`/`lastPullFailedAt` — fixed in 32744e3; then only 3 timeouts, those 2 files 25/25 with a longer timeout) |
| B1 | #88 | `94c2786` (combined with BL-111 #100: fully green, 7651/489) |
| C5 | #92 | `27b5501` (combined run fully green, 7601/486) |
| C2 | #97 | `fd7d35c` (combined run: 28 timeouts at load ~288; those 10 files 177/177 with a longer timeout) |
| D2 | #93 | `9b4a449` (combined run: 15 timeouts at load ~374; those 6 files 86/86 with a longer timeout) |
| A2 | #84 | `5cf38fd` (combined gate run: 1 page test timed out at load average 235; that file passed 8/8 alone) |

### 4.3 Open follow-ups

| # | Item | Why it matters | Suggested owner |
|---|---|---|---|
| FU-1 | A3's `FLIPS` rows for the 8 new keys check only the value in force | Weakens "every value flips a rule outcome" until the readers land | B1, B3, D2, F1 (added to their prompts) |
| FU-2 | `services/sdc/materialMaster.ts` imports a mock store (`materialOverlayStore`) directly (A2) | The SDC module now depends on the mock layer; needs a seam when `httpDataService` lands | Stage F1 |
| FU-3 | `supplier:set-update-mode` is held by the whole `compliance` lane and by `buyer_all` (A1), following the `setting:set` precedent (BL-70 open) | "Hub administrator only" (MR-1 AC-06) is not literal | I1 records it; BL-70 decides |
| FU-5 | D1 (#89): the "above available" batch warning shows on the wizard's confirm step only; the Submit drawer on a draft ASN (a second submit path) shows none. Verified in the browser: 6,000 shipped against a 5,000 batch submitted with no warning | MR-6 BR-03 says the supplier sees it before submitting | D3 (added to its prompt) |
| FU-6 | F1 (#87): a closed alert shows its reason as "Other (note required)", repeating the form label | Cosmetic | Any task touching `BuyerAlerts.tsx` |
| FU-7 | D1 (#89): the planner's "Not in declared stock" marker shows only where ASN lines show today (the `/buyer/shipments` drill-through with 1 ASN on the PO) | Planners may miss typed batches | D3 (planner Mismatch marker work) |
| FU-8 | C4 (#90): a mapped MRP controller code cannot be unmapped | Admin cannot undo a mapping | Later polish |
| FU-9 | G1 (#91): no verb lets a supplier file a "Tax & Legal" document | Under placeholder lists almost no vendor can reach Approved | Owner decision pending (G2 enforcement mode) |
| FU-10 | C2 (#97): on PTI screens the approved trade name reads "Your name: …" (the supplier's wording) | Misleading label for planners | C3 (added to its brief) |
| FU-11 | E1 (#103): `IncomingShipment` has no principal id, so the ETA fallback uses the supplier's shortest principal lead time rather than the leg's own | ETA fallback can be early for multi-principal distributors | Data model change when the feed carries the principal |
| FU-12 | B3 (#105): every fixture supplier with materials reads 0% update compliance (the seed has ~1 stock record per material and no successful pulls), so the demo shows all red | Demo cannot show green/amber/red | B4 (added to its prompt): seed a realistic weekly history for 3 suppliers |
| FU-13 | Plural wording: two i18n tests disagree on plural keys (`InventoryCapacity`/`CallOffs` tests want identical EN/ID key sets; `fragments.test` wants ID without `_other`), so B2 and D3 avoided plurals and B2 reads "Missed: 1 materials were not updated" | Grammar slip on screen; the two tests need one agreed plural rule | A small test-infrastructure task |
| FU-14 | G2 (#109): under the placeholder lists 21 of 22 vendors are Registered, so almost every award in the demo asks for a reason (consequence of the warn-only ruling). Stored `qualificationWarnings` are not yet displayed on the event or award record; RFI/RFP invitee tables have no marker | Ends when Procurement and Quality save real lists (MAT-D15) | Owner (lists); a small UI task for the display gaps |
| FU-4 | A1 edited `docs/contracts/C5-seams.md` (method count) — not in MAT-R5's list | Brief should name it | I1 adds it to MAT-R5 |
