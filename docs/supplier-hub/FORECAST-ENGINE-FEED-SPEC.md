# Supplier Hub: Forecast engine feed specification (BL-103)

| | |
|---|---|
| Version | 0.2 draft, 2026-09-23 |
| For | The Master Data Management team, who own the engine's input data and its SAP integration (ENG-D1) |
| What this is | Every input the in-house forecast engine reads: fields, key, grain, refresh, freshness limit, quality checks, and the likely SAP source |
| What this is not | An interface design. How the data travels (API, events, files) is open under BL-11 (PQ-06) and belongs to IT |
| Status | **Proposed.** Field names and types match the engine's data contract in the code (`src/services/engine/types.ts`, built with BL-102 on branch `feat/forecast-engine-step1`), checked on 2026-09-23. The SAP sources are the analyst's reading of standard SAP objects and need MDM confirmation |
| Related | `FORECAST-ENGINE-REQUIREMENTS.md` (E14-01 defines the inputs); PRD integration point I14; backlog BL-100 (the data in the hub), BL-102 (synthetic dataset) |

## 1. How this works

- **One contract, two sources.** Until MDM connects SAP, the engine reads a synthetic dataset built to this same contract (BL-102, ENG-D1). When a feed goes live, it replaces the synthetic data for that entity only. The engine code does not change.
- **Honest labels per feed.** Every result the engine shows says whether it came from live or synthetic data (E14 rule X-03). A result built from any synthetic input is labelled simulated and never shown to a supplier.
- **Quality checks run on arrival.** A record that fails a check is kept out of the calculation and listed on the engine's Data health page. The engine never silently repairs a record or uses a default value in its place. This follows the platform's existing rule for unknown materials: refuse by name, never assume (`src/services/sdc/materialMaster.ts`, ruling D-OPS-MASTERMISS).
- **Material codes.** Every material code must resolve in the Hub's declared material master (contract C8 §4.0). A code the master cannot resolve is refused, not mapped.

### 1.1 Conventions for every feed

| Topic | Rule |
|---|---|
| Dates | `YYYY-MM-DD` in Jakarta time (WIB, UTC+7). Weeks are named by their Monday |
| Timestamps | ISO 8601 with offset |
| Quantities | In the material's base unit of measure as held in the material master. No unit conversion in transit |
| Identifiers | Stable. A record keeps its key for life; a correction updates the record, not a new key |
| Deletions | Sent as an explicit deletion, never by omission |
| Completeness | Each delivery states the period it covers, so a missing day reads as missing, not as zero |

---

## 2. The feeds

The order below is the build order: section 2.1 feeds the first engine step (E14-02), section 2.2 the material calculation (E14-03, E14-04), section 2.3 order sizing (E14-05), and section 2.4 the demand model (E14-07).

### 2.1 Purchase orders, changes, confirmations and receipts (first build: E14-02)

**PoLine: one line of a purchase order or call-off**

| Field | Type | Meaning | Required |
|---|---|---|---|
| poNumber | text | PO or call-off number | yes |
| line | number | Line number within the PO | yes |
| supplierId | text | Supplier, as held in the Hub supplier master | yes |
| materialCode | text | Resolves in the material master | yes |
| orderedQty | number | Ordered quantity, base unit | yes |
| uom | text | Base unit; must equal the master's unit | yes |
| requestedDate | date | Date PTI asked for delivery | yes |
| createdAt | timestamp | When the line was created | yes |
| confirmDeadline | timestamp | When the supplier's confirmation is due (REQ-E07-02, CR-26) | yes |

- **Key:** poNumber + line. **Grain:** one record per line.
- **Refresh:** at least daily. **Freshness limit:** 1 day.
- **Checks:** material resolves; unit equals master unit; orderedQty > 0; the supplier is an approved source for the material (see MaterialSource).
- **Likely SAP source:** PO header and item (EKKO, EKPO) and schedule lines (EKET, delivery date EINDT). Call-offs are held in the Hub, not SAP (PQ-01), so call-off lines come from the Hub itself.

**ScheduleChange: every change to quantity or date after creation**

| Field | Type | Meaning | Required |
|---|---|---|---|
| poNumber, line | text, number | The changed line | yes |
| at | timestamp | When the change was made | yes |
| field | `quantity` or `date` | What changed | yes |
| from, to | number or date | Old and new value | yes |
| by | `PTI` or `SUPPLIER` | Who made the change | yes |
| reason | text | Reason code, where one was given | no |

- **Key:** poNumber + line + at + field. **Grain:** one record per change.
- **Refresh:** daily. **Freshness limit:** 1 day.
- **Checks:** the line exists; `from` differs from `to`; `at` is after the line's createdAt. A quantity change to 0 is a cancellation.
- **Why it matters:** this feed decides whether a missed delivery is PTI-caused or supplier-caused (E14-02 BR-03). Without it, every PTI change looks like a supplier failure.
- **Likely SAP source:** change documents on the PO item and schedule line (CDHDR, CDPOS for EKPO and EKET). Changes made in the Hub are recorded by the Hub.

**Confirmation: the supplier's answer to a line**

| Field | Type | Meaning | Required |
|---|---|---|---|
| poNumber, line | text, number | The confirmed line | yes |
| confirmedQty | number | Quantity the supplier commits to | yes |
| confirmedDate | date | Date the supplier commits to | yes |
| confirmedAt | timestamp | When the supplier answered | yes |

- **Key:** poNumber + line + confirmedAt. A later confirmation supersedes an earlier one.
- **Source:** **the Hub.** The Hub is the system of record for supplier responses (contract C8 §6). This feed flows from the Hub to the engine and, later, to SAP. SAP's vendor confirmation table (EKES) is only a secondary check.

**Receipt: a goods receipt against a line**

| Field | Type | Meaning | Required |
|---|---|---|---|
| grNumber | text | Goods receipt document | yes |
| poNumber, line | text, number | The received line | yes |
| receivedQty | number | Quantity received, base unit | yes |
| receivedDate | date | Posting date | yes |

- **Key:** grNumber + poNumber + line. **Grain:** one record per receipt; several receipts per line are normal.
- **Refresh:** daily. **Freshness limit:** 1 day.
- **Checks:** the line exists; receivedQty ≠ 0 (a reversal is a negative receipt with its own grNumber).
- **Likely SAP source:** material documents for goods receipt against a PO (MATDOC in S/4HANA, movement type 101; reversals 102).

**PlanVersion: what the supplier saw in each published forecast**

| Field | Type | Meaning | Required |
|---|---|---|---|
| supplierId | text | Supplier the version was published to | yes |
| materialCode | text | Resolves in the master | yes |
| periodBucket | date | Monday of the week the quantity is for | yes |
| versionNo | number | Version number of the publication | yes |
| publishedAt | timestamp | When the version was published | yes |
| quantity | number | Quantity the supplier saw for that week | yes |

- **Key:** supplierId + materialCode + periodBucket + versionNo.
- **Source:** **the Hub.** Forecast versions are already stored by the Hub (REQ-E06-01). No SAP feed is needed.
- Used for the plan-change measures (MASC, MASC-I) and the cumulative ±20% cap (ENG-D8).

### 2.2 Material master, sourcing, bills of materials and stock (E14-03, E14-04)

**MaterialSource: who supplies a material, and on what terms**

| Field | Type | Meaning | Required |
|---|---|---|---|
| materialCode | text | Resolves in the material master | yes |
| supplierId | text | Supplier | yes |
| leadTimeDays | number | Planned delivery time in calendar days | yes |
| moq | number | Minimum order quantity, base unit | yes (0 if none) |
| orderMultiple | number | Rounding value, base unit | yes (1 if none) |
| share | number 0–1 | Share of the material's demand given to this supplier | yes |

- **Key:** materialCode + supplierId. **Refresh:** weekly. **Freshness limit:** 7 days.
- **Checks:** leadTimeDays > 0; moq ≥ 0; orderMultiple ≥ 1; the shares of one material add up to 1 (within 0.001).
- **Likely SAP source:** purchasing info record (EINA, EINE: planned delivery time APLFZ, minimum quantity MINBM), source list (EORD), quota arrangement (EQUK, EQUP) for the shares, rounding value in plant data (MARC-BSTRF).

**BomLine: one component of a bill of materials**

| Field | Type | Meaning | Required |
|---|---|---|---|
| parentCode | text | Finished good or bulk | yes |
| componentCode | text | Bulk or material; materials resolve in the master | yes |
| qtyPer | number | Component quantity per 1 parent unit | yes |
| uom | text | Component base unit | yes |
| scrapPct | number | Component scrap, percent | yes (0 if none) |
| validFrom | date | First valid day | yes |
| validTo | date | Last valid day | no |

- **Key:** parentCode + componentCode + validFrom. **Refresh:** weekly, and on every formula change. **Freshness limit:** 7 days.
- **Checks:** qtyPer > 0; validity periods for one parent–component pair do not overlap; every active finished good has a bill of materials; no parent is its own component at any depth.
- **Likely SAP source:** BOM header and items (STKO, STPO, linked through MAST); component scrap STPO-AUSCH; assembly scrap MARC-AUSSS. The owner has named the Master Data Management team as owner of the breakdown from forecast into the bill of materials (ENG-D1). Whether SOMO's formulation master or SAP is the source of formula BOMs is open (contract C8 §4.4, C8-IDENTITY-GRAIN).

**StockSnapshot: stock on hand at a warehouse on a day**

| Field | Type | Meaning | Required |
|---|---|---|---|
| materialCode | text | Resolves in the master | yes |
| warehouseId | text | Warehouse, as in the Warehouse feed | yes |
| date | date | Snapshot day | yes |
| onHandQty | number | Unrestricted stock, base unit | yes |

- **Key:** materialCode + warehouseId + date. **Refresh:** daily. **Freshness limit:** 1 day.
- **Checks:** onHandQty ≥ 0; warehouse exists.
- **Note:** SAP holds current stock only, so the daily snapshot has to be taken and kept. The history is what the warehouse-utilisation trend and the backtest (E14-10) need.
- **Likely SAP source:** storage location stock (MARD, or its S/4HANA compatibility view NSDM_V_MARD), or the warehouse system if stock is managed in EWM.

**CycleCount: a physical count**

| Field | Type | Meaning | Required |
|---|---|---|---|
| materialCode, warehouseId | text | What was counted, where | yes |
| countDate | date | Count day | yes |
| systemQty | number | System stock at the count | yes |
| countedQty | number | Counted stock | yes |

- **Key:** materialCode + warehouseId + countDate. **Refresh:** as counted.
- **Use:** the stock-accuracy check, |countedQty − systemQty| ÷ systemQty against the 2% tolerance (ENG-D2, E14-01 BR-03).
- **Likely SAP source:** physical inventory documents (IKPF, ISEG).

### 2.3 Warehouse space (E14-05)

**Warehouse**

| Field | Type | Meaning | Required |
|---|---|---|---|
| warehouseId | text | Physical warehouse | yes |
| kind | `packaging` or `rawMaterial` | What it holds | yes |
| capacityPallets | number | Owned capacity in pallet positions | yes |

- **Key:** warehouseId. **Refresh:** on change.
- **Checks:** capacityPallets > 0.
- **Likely source:** not a standard SAP purchasing field. It is maintained by the warehouse team, or taken from bin capacity if warehouse management runs in EWM. Rented space is not included; its cost comes with ENG-D6.

**MaterialVolume**

| Field | Type | Meaning | Required |
|---|---|---|---|
| materialCode | text | Resolves in the master | yes |
| unitsPerPallet | number | Base units that fill one pallet position | yes |

- **Key:** materialCode. **Refresh:** on change.
- **Checks:** unitsPerPallet > 0; every material with stock has a value.
- **Likely SAP source:** alternative units of measure (MARM) with a pallet unit, or packing instructions.

**MaterialValue: what one unit of a material is worth** (added with the E14-05 build)

| Field | Type | Meaning | Required |
|---|---|---|---|
| materialCode | text | Resolves in the master | yes |
| unitValueIdr | number | Rupiah per one base unit | yes |

- **Key:** materialCode. **Refresh:** monthly, and on a price change.
- **Use:** holding cost = value × the holding rate per year (ENG-D6, set by Finance). A material with no value cannot be weighed for holding cost; order sizing then keeps the interim round-up for it and marks it.
- **Checks:** unitValueIdr > 0; every purchased material has a value.
- **Likely SAP source:** material valuation (MBEW: standard price STPRS or moving average price VERPR, divided by the price unit PEINH).
- **Until the feed exists** the synthetic dataset carries an invented value per material, by BOM slot (for example a closure a few hundred rupiah, a kilogram of an active several hundred thousand).

### 2.4 Finished goods and sales history (E14-07)

**FinishedGood**

| Field | Type | Meaning | Required |
|---|---|---|---|
| skuCode | text | Finished-good code | yes |
| name | text | Description | yes |
| brand | text | Wardah, Emina or Make Over | yes |
| category | text | Product category | yes |
| launchDate | date | First sale day | yes |
| discontinueDate | date | Last planned sale day | no |

- **Key:** skuCode. **Refresh:** weekly. **Freshness limit:** 7 days.
- **Checks:** brand is one of the three; launchDate ≤ discontinueDate.
- **Likely SAP source:** material master for finished goods (MARA with a finished-goods material type, MAKT for the description). Brand and category from the material group or classification; which one is the MDM team's call.

**SalesWeek: weekly sell-in per finished good**

| Field | Type | Meaning | Required |
|---|---|---|---|
| skuCode | text | Finished good | yes |
| weekStart | date | Monday of the week | yes |
| quantity | number | Units shipped in the week | yes |
| stockout | boolean | The SKU was out of stock for part of the week | yes |

- **Key:** skuCode + weekStart. **Grain:** one record per SKU per week, zeros included. **History:** 2 to 3 years at the first load. **Refresh:** weekly. **Freshness limit:** 7 days.
- **Checks:** quantity ≥ 0; no gaps in the weekly series.
- **Stock-out flag:** SAP has no such field. It has to be derived, for example from days with zero stock at the distribution centre. The rule is MDM's to propose. Without it, a week of zero sales during a stock-out is read as zero demand, and the forecast learns to under-forecast (E14-01 BR-02).
- **Likely SAP source:** billing or outbound delivery documents (VBRK, VBRP or LIKP, LIPS). Sell-in or sell-out is still open (ENG-D10).

**FgPlanSnapshot: SAP's finished-goods plan as it stood each week** (added for E14-03, E14-04)

| Field | Type | Meaning | Required |
|---|---|---|---|
| skuCode | text | Finished good | yes |
| madeAt | date | Monday the plan was made | yes |
| weekStart | date | Monday of the planned week | yes |
| quantity | number | Planned quantity | yes |

- **Key:** skuCode + madeAt + weekStart. **History:** at least 30 past plans, each covering the lead time plus review period, so safety stock can be learned from the plan's errors (E14-04 BR-05). **Refresh:** weekly.
- **Why:** until PTI's own demand model (E14-07) is live, material requirements are calculated from SAP's plan, and safety stock from that plan's errors.
- **Likely SAP source:** the demand plan (planned independent requirements, PBIM/PBED) or the IBP consensus plan, snapshotted weekly. To confirm with MDM.

**SalesOrderWeek: open sales orders per finished good and week** (added for E14-03 forecast consumption)

| Field | Type | Meaning | Required |
|---|---|---|---|
| skuCode | text | Finished good | yes |
| weekStart | date | Monday of the delivery week | yes |
| quantity | number | Open order quantity | yes |

- **Key:** skuCode + weekStart. **Refresh:** daily. **Likely SAP source:** sales order schedule lines (VBAK, VBAP, VBEP). To confirm with MDM.

**SapSafetyStock: SAP's current safety stock per material** (added for E14-04)

| Field | Type | Meaning | Required |
|---|---|---|---|
| materialCode | text | Resolves in the master | yes |
| quantity | number | Safety stock, base unit | yes |

- **Key:** materialCode. **Refresh:** weekly. **Use:** the fallback where the engine has too little history, and the comparison on the Safety stock page. **Likely SAP source:** plant data (MARC-EISBE). To confirm with MDM.

**Later feeds (not in the first build).** The engine will also need these when E14-07 and E14-08 are built. They will be specified then:
- price history
- the promotion calendar (ENG-D12)
- the launch plan

---

## 3. What the Master Data Management team is asked to confirm

1. **Source.** The SAP source of each feed, replacing the "likely" readings above.
2. **Owner and delivery.** A named owner, the refresh time and the delivery window per feed.
3. **Stock-out rule.** The rule for the stock-out flag on sales history.
4. **Warehouse capacity.** Where capacity and pallet conversion are held.
5. **Formula BOMs.** Whether formula bills of materials come from SAP or from SOMO's formulation master (C8 §4.4).
6. **Priority.** The feeds in section 2.1 come first, because they unblock the first engine step.

## 4. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-23 | First draft for the Master Data Management team (BL-103) |
| 0.2 | 2026-09-23 | Added FgPlanSnapshot, SalesOrderWeek and SapSafetyStock, from the E14-03 and E14-04 build (PR #39) |
| 0.3 | 2026-09-23 | Added MaterialValue (value per unit, for holding cost), from the E14-05 build |
