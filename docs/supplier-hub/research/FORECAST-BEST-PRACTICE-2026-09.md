# Forecasting for material planning: what would raise Scheduled Confirmed and CFOT and bring the warehouses back to target

> **Update 2026-09-23 (owner decision):** PTI will build its own demand and material forecast engine, in the Hub first and later in SOMO. External planning engines, SAP IBP included, are out. Option B in section 8 is therefore replaced by `FORECAST-METHOD-SPEC.md`, which specifies each calculation with its paper and newest evidence. The problem analysis and the Hub as-built review below still stand.

Prepared 2026-09-23 as input to Forecast Collaboration (epic E06) for PT Paragon Technology and Innovation (Wardah, Emina, Make Over; packaging and raw material).

**The question.** What forecast capability would raise Scheduled Confirmed (67% against a 100% target) and CFOT (36.4% against 100%), and bring warehouse utilisation (packaging 121% to 142%, raw material about 106%, both against 80%) back toward target?

**The short answer.** The Hub does not create the forecast. It passes on what SAP planning produces. So a better forecast model alone will not move these four measures much. The biggest levers are, in order:
1. A stable, time-fenced plan that suppliers can trust
2. A demand range rather than a single number, used to size buffers
3. Measuring PTI's own forecast changes next to the suppliers' confirmation record
4. Supplier stock and capacity fed back into the plan

Items 1 and 3 belong in the Hub. Item 2 belongs upstream in SAP planning. Several named gaps are not forecasting problems at all: stock accuracy, late ASNs and manual PR review. Section 2 says what fixes each of those.

---

## 1. How to read this

- **Evidence grades.** Every external claim carries one:
  - **A**: vendor product documentation, help portals, API guides
  - **B**: peer-reviewed papers, competition results, arXiv papers with benchmarks
  - **C**: analyst reports, practitioner or customer material
  - **D**: vendor marketing and press, which are claims, not proof
- **As-built evidence.** Every as-built claim cites `path:line` at `main` (`6e6079b`). Each is labelled **real** (wired and working), **simulated** (fixture data) or **documented only**.
- **Where sources were weak:**
  - Kinaxis, o9, Blue Yonder and RELEX keep product documentation behind a login, so their verdicts rest on marketing (D).
  - help.sap.com pages were read in a browser because direct fetches returned empty shells.
  - No vendor has a graded, *realised* result from a cosmetics customer.
  - The two main foundation-model benchmarks were written by the model makers.
- **What I spot-checked myself.** I re-checked 2 of the load-bearing sources at the source: Terwiesch et al. 2005 and Chin et al. 2026. A third, the company-reported DDMRP results in Miclo et al., was blocked on re-fetch, so it stays at the research pass's reading.
- **The PTI figures in section 2** are the owner's figures from the "Challenge & Gaps" slides. They were not verified from a system.

---

## 2. The problem and its causes

**The 4 measures (owner's slides):**

| Measure | Now | Target | Where it is measured |
|---|---|---|---|
| Scheduled Confirmed | 67% (average of the last 3 months) | 100% | Share of scheduled supply the supplier has confirmed |
| CFOT (Casefill On-Time) | 36.4% (average of the last 3 months) | 100% | Per PO and supplier, like OTIF at PO level (`KICKOFF-MEETING-NOTES.md:179`) |
| Packaging warehouse utilisation | 121% to 142% excluding rented space, weeks 25 to 37 | 80% | Owner's chart |
| Raw material warehouse utilisation | 105.9% to 107.3%, weeks 35 to 37 | 80% | Owner's chart |

**Why shortage and excess coexist.** Five mechanisms have evidence:

1. **Mix error hides inside a correct total.** Forecasts are easy at the top of the product hierarchy and hard at item level. In M5 the winner's gain over Croston fell from 77.9% at the top level to 4.7% at product-store level (B, [M5 accuracy paper](https://statmodeling.stat.columbia.edu/wp-content/uploads/2021/10/M5_accuracy_competition.pdf)). A plan can be right in total and wrong by material, which leaves some materials short and others in excess. This is my inference from the data; the paper does not state it.
2. **Plan nervousness is passed to suppliers.** In one simulation, "information updates lead to disturbances in the production orders for the MRP standard" (B, [Seiringer et al.](https://arxiv.org/abs/2403.11010)). Bullwhip also amplifies variability upstream, "leading to excess inventories" (B, [Petropoulos et al. 2022](https://arxiv.org/abs/2012.03854)).
3. **Suppliers discount unreliable plans.** "Suppliers penalize buyers for unreliable forecasts by providing lower service levels" (B, [Terwiesch et al. 2005](https://ideas.repec.org/a/inm/ormnsc/v51y2005i2p208-220.html), checked at source). PTI's own forecast volatility is therefore a plausible cause of the below-50% confirmation reliability, not only supplier behaviour.
4. **Single-number forecasts misprice buffers.** "Unbiased forecasts will not necessarily lead to achievement, on average, of target cycle service levels or fill rates", and the usual lead-time safety-stock variance estimator "is unsound" (B, Petropoulos et al. 2022).
5. **Accuracy is not service.** On 20,330 real multi-item orders, "forecast-accuracy rank and order-service rank are negatively correlated … at -0.555". Correcting forecast bias lifted a per-material fill proxy "from 77.5% to 92.0%" (B, [Chin, Cheng, Gunawan 2026](https://arxiv.org/abs/2609.13840), preprint, checked at source). The direction of cumulative bias mattered more than point accuracy.

**Which causes a forecast capability can reach:**

| Named gap (owner's slides) | Can forecasting reach it? | What fixes it |
|---|---|---|
| Material shortage and excess together | Partly: a demand range, bias control and correct buffers | Probabilistic forecast and inventory optimisation upstream (section 4, topics 5 and 6) |
| Supplier confirmation reliability below 50% | Partly: a stable firm zone makes the plan worth confirming | Time fences, commit deadlines, PTI's own volatility measured (section 8, option A) |
| Capacity, supply and delivery confirmation done by hand | No | Structured commit workflow; already in the Hub (section 3) |
| Limited visibility of supplier stock, WIP, feedstock, incoming | No | Supplier stock and capacity feedback (REQ-E08) |
| Call-offs do not match how production uses supply | Partly | Split forecast (weeks/months) and just-in-time (days) releases on SAP scheduling agreements (section 5, SAP) |
| Warehouse buffer undefined | Partly | Buffer positioning and sizing (DDMRP-style or inventory optimisation) |
| Low stock accuracy | No | Cycle counting and inventory record control. A bad stock figure makes MRP reorder what is already there |
| ASNs late and inconsistent; material not ready for production | No | ASN compliance and supplier OTIF management (REQ-E07, E10) |
| Daily manual PR review | No | PR automation and guided intake (Arc 2 in `CLAUDE.md`) |

---

## 3. Forecasting in the Hub today

**Actors.**
- **Upstream planning owner (SOMO) and SAP:** produce the demand.
- **Material Planner:** publishes and manages exceptions.
- **Supplier:** views, commits or acknowledges.
- **Hub administrator:** owns the rule values.

**Data flow, as documented:**
1. SAP planning produces net material requirements: MRP for weeks 1 to 13 and IBP for months 4 to 6. "The hub does not calculate demand" (`docs/supplier-hub/SUPPLIER-HUB-REQUIREMENTS.md:1295`, documented only). Which SAP source applies is still open as PQ-07 (`:1321`).
2. SOMO emits a material × period total with no vendor split, and the Hub owns the allocation to suppliers (`docs/contracts/C8-forecast-publication.md:94-107`, ratified). No type in the code represents SOMO's emission (`C8-forecast-publication.md:127-131`, documented only).
3. The supplier's confirmation is to be written back to the Snowflake commons for SOMO's replan. That write-back is spec only, with zero code (`C8-forecast-publication.md:559-576`, documented only).

**What the code does (all in `src/services/transitions/`):**

| Behaviour | Where | Label |
|---|---|---|
| Two streams: packaging published weekly, raw material monthly | `forecastConfig.ts:24-27` | real (rules); simulated (data) |
| Period grid: packaging 13 weekly periods then monthly to 6 months; raw material 6 monthly periods | `forecastConfig.ts:42-46`, `forecastRules.ts:117-139` | real |
| Zones by days from publication. Firm = supplier lead time for the material group (sample values), Trade-off 42 days (packaging) or 60 days (raw material), Forecast after that | `forecastConfig.ts:56-83`, `forecastRules.ts:144-149` | real rule, simulated lead times |
| Allocation: each supplier's share of the material total, rounded to 100 | `forecastRules.ts:170, 188-227` | real |
| Re-publication: Firm quantities never change; every third later period moves 5% "as a deterministic stand-in for the planning run" | `forecastRules.ts:239-275` | simulated |
| Planner moves one period's demand to another qualified supplier, as a new version with a note | `forecastRules.ts:282-312`; verb at `services/data/mock/MockCommandService.ts:2577-2590` | real (in-memory) |
| Version comparison: changed, added and removed periods | `forecastRules.ts:332-355` | real |
| Commit below forecast needs a reason code, and "other" needs a note | `forecastRules.ts:368-377` | real |
| CR-21 tolerance: Firm accepts no shortfall; Trade-off accepts up to 10%; Forecast needs acknowledgement only | `forecastRules.ts:386-392`; values `forecastConfig.ts:95-100` | real, admin-editable |
| CR-26 deadline: Firm 1 working day, others 3, on the Hub calendar; one reminder at half the deadline | `forecastRules.ts:399-413`; `forecastConfig.ts:113-125` | real |
| Carry-forward: a commitment stands if the period's quantity did not change, otherwise the period returns to awaiting | `forecastRules.ts:523-531` | real |
| States derived at read: awaiting, acknowledged, accepted, exception, accepted by planner, revision requested | `forecastRules.ts:465-472` | real |
| CR-22 gap colour: Green ≥ 1.0, Amber ≥ 0.8, Red below | `forecastRules.ts:594-622` | real |
| Cumulative forecast against cumulative commitment (Firm and Trade-off only) | `forecastRules.ts:625-645` | real |
| Exceptions ranked: overdue, then Firm, then lowest days of supply (CR-01), then earliest period | `forecastRules.ts:656-672` | real; days of supply uses simulated stock |
| Forecast CSV download; commitment template and row-by-row upload check (EN/ID headers, ambiguous numbers refused) | `forecastRules.ts:708-890` | real |
| Commitment gaps feed the Order summary "foresight" column and the alert rules | `forecastRules.ts:675-701` | real |

**Where the numbers come from today.**
- The demand is a flat daily rate per material multiplied by the days in the period: for example 7,000 a day for `PK-PETB-8801` (`services/data/mock/fixtures/forecastHub.ts:94-106`).
- Supplier shares are fixed fixture values (`forecastHub.ts:72-79`).
- 4 seeded versions show every state (`forecastHub.ts:124-141`).
- The liveness registry holds `forecastPublications` as waiting on the "SOMO C8" feed (`services/liveness/registry.ts:241-248`, simulated).
- By rule, a simulated publication is never shown to a real supplier (`services/sdc/types.ts:287`).

**Pages.**
- Planner: `/buyer/forecasts` (versions) and `/buyer/collaboration` (commitments and gaps).
- Supplier: `/supplier/forecasts` (commitments) and `/supplier/forecasts/responses` (`src/router/AppRouter.tsx:137-219`).

**3 tensions worth knowing:**
- **The zone rule in the code is not the one in the contract.** The code sets Firm from the supplier's lead time, as REQ-E06-01 BR-05 says (`SUPPLIER-HUB-REQUIREMENTS.md:1302`). C8 says the zone class should be projected from SOMO's `lockState` and `approvalState`, and that projection is still unratified pending named owners in procurement and finance (`C8-forecast-publication.md:193-230`). Section 5 shows that SAP S/4HANA scheduling agreements already carry firm and trade-off zones with cost liability, which is a third candidate source.
- **The reminder rule is only half built.** REQ-E06-03 BR-06 asks for reminders at half the deadline *and* at the deadline (`SUPPLIER-HUB-REQUIREMENTS.md:1395`). The code sends only the first reminder; after the deadline the line becomes overdue (`forecastRules.ts:410-430`).
- **The requirement status is stated two ways.** The requirement index lists REQ-E06-01 to 03 as "Validated (owner, E06-R)" (`SUPPLIER-HUB-REQUIREMENTS.md:253-255`). Each requirement's own header says "Proposed" (`:1279`).

**What is absent from `src/`.** I searched and found nothing for forecast accuracy, bias, value added, quantiles or prediction intervals, safety stock calculation, or BOM explosion. The only BOM references are comments about SOMO's formulation master (`services/sdc/materialGroups.ts:54`). Nothing links a forecast commitment to the later PO's CFOT result. CFOT is calculated separately per PO (`docs/supplier-hub/BUILD-GAP.md:48`).

**The Hub does not generate forecasts. It allocates SAP's material totals to suppliers, publishes them in zoned periods, and collects and polices supplier commitments.**

---

## 4. State of the art in forecasting for material planning

Each block names the PTI symptom the method addresses and how strong the evidence is.

**4.1 Statistical baselines (ETS, ARIMA, Theta, combinations)**
- **What it is:** per-series methods; still the benchmark to beat.
- **Symptom addressed:** shortage and excess, indirectly. The evidence is strong for accuracy and silent on inventory outcomes.
- **Evidence (B):**
  - In M4, "12 were 'combinations' of mostly statistical approaches" among the 17 most accurate methods. "None" of the 6 pure machine-learning methods beat the combination benchmark ([M4 results](https://doi.org/10.1016/j.ijforecast.2018.06.001)).
  - "The theta method should be considered as a critical benchmark" (Petropoulos et al. 2022).
- **Fit for PTI:** stable monthly raw-material series. These methods cannot use promotion or launch information.
- **Common practice:** ETS or ARIMA per item inside the ERP or planning tool.
- **Leading edge:** automatic combinations used as the benchmark for any machine-learning model.

**4.2 Intermittent and lumpy demand (Croston, SBA, TSB, ADIDA)**
- **Symptom addressed:** excess and obsolete stock of tail materials. The evidence is moderate and none of it comes from cosmetics.
- **Evidence (B):**
  - Croston "is positively biased" and is "unsuitable for dealing with obsolescence". TSB "updates the demand probability … in every period" ([Teunter, Syntetos, Babai 2011](https://doi.org/10.1016/j.ejor.2011.05.018), simulation).
  - SBA was tested on "3000 real intermittent demand data series from the automotive industry" ([Syntetos & Boylan 2005](https://doi.org/10.1016/j.ijforecast.2004.10.001)).
  - ADIDA aggregates demand into time buckets equal to the lead time "and may lead to substantial improvements" ([Nikolopoulos et al., preprint](https://purehost.bath.ac.uk/ws/files/147092667/JORS_2011_pre_print_.pdf)).
  - A 2026 study of more than 40,000 series found a simple global neural model (TiDE) best, while large global models were "less accurate" ([Damato et al., preprint](https://arxiv.org/abs/2601.14031)).
- **Fit for PTI:** tail shades and end-of-life packaging. TSB matters because PTI retires SKUs often.
- **Common practice:** Croston or SBA, chosen by demand classification.
- **Leading edge:** probabilistic intermittent models and small global models.

**4.3 Machine learning and M5**
- **Symptom addressed:** shortage and excess caused by missed promotion uplift. The evidence is strong, but it comes from retail sales, not material orders.
- **Evidence (B):**
  - In M5, all top methods were "'pure' ML ones and significantly better than all statistical benchmarks". The winner was "22.4%" better, and "all top 50 performing methods … utilized 'cross-learning'" (M5 paper).
  - Limits from the same paper: gains shrink at item level (see section 2), results "cannot be generalized beyond the specific area covered by the data", and "many teams failed to choose the best method developed".
- **Fit for PTI:** finished-goods forecasting driven by promotion and price, then exploded through the BOM to materials. Weak for thin material series.
- **Common practice:** per-item statistical models.
- **Leading edge:** a global LightGBM or neural model with promotion, price and calendar inputs, reconciled across the product hierarchy.

**4.4 Time-series foundation models (Chronos-2, TimesFM-2.5, TiRex, Moirai, TimeGPT)**
- **Symptom addressed:** shortage and excess, but this is unproven for materials. The evidence is weak to moderate, and the model makers wrote the benchmarks.
- **Evidence (B, model-maker authored):**
  - On fev-bench (AWS), win rates against Seasonal Naive were Chronos-2 91.4%, TiRex 83.3%, TimesFM-2.5 79.6% and a statistical ensemble 45.5%. The authors note "existing TSFMs often miss accuracy by ignoring covariates" ([fev-bench](https://arxiv.org/abs/2509.26468)).
  - GIFT-Eval (Salesforce) warns of "partial data leakage", and says the models "may struggle" on lumpy series and decline over longer horizons ([GIFT-Eval](https://arxiv.org/abs/2410.10393)).
  - On drugstore sales, Chronos-2 without inputs was "nearly flat with high uncertainty". With inputs it "leverages … promotion and holiday information" ([Chronos-2 report](https://arxiv.org/abs/2510.15821)).
  - The independent Chin et al. 2026 study found bias correction on Chronos-2 mattered more than its accuracy rank (section 2).
- **Fit for PTI:** fast baselines, short-history launch items, and promotions only if covariates are used.
- **Common practice:** pilots.
- **Leading edge:** Chronos-2 with covariates plus bias correction, judged on service outcomes rather than accuracy.

**4.5 Probabilistic forecasting (quantiles, intervals, conformal)**
- **Symptom addressed:** shortage and excess together, through buffers sized to a chosen service level. It also gives Scheduled Confirmed a defensible basis, because a supplier can commit to a quantile. The evidence is moderate to strong.
- **Evidence (B):**
  - "Inventory policies require probabilistic forecasts to establish safety levels" (Damato et al.).
  - M5 Uncertainty asked for "nine different quantiles" ([M5 Uncertainty](https://ideas.repec.org/a/eee/intfor/v38y2022i4p1365-1385.html)).
  - Accuracy "does not always lead to better inventory performance" ([Kourentzes, Trapero, Barrow 2020](https://kourentzes.com/forecasting/wp-content/uploads/2020/05/Kourentzes_2019_Optimising_forecasting_models_for_inventory_planning.pdf)).
  - Conformal intervals (EnbPI) do "not require data exchangeability" ([EnbPI](https://arxiv.org/abs/2010.09107)).
- **Fit for PTI:** high. SAP IBP already produces prediction intervals (section 5).
- **Common practice:** a single-number forecast plus a safety-stock formula.
- **Leading edge:** quantile forecasts feeding multi-stage inventory optimisation.

**4.6 Demand-driven planning (DDMRP)**
- **Symptom addressed:** shortage and excess together, undefined buffers, and nervousness passed to suppliers. The evidence is moderate: simulation (B) plus company-reported cases (C).
- **Evidence for:**
  - "DDMRP does represent a superior approach" to MRP II and Kanban (B, [Miclo et al. 2019](https://hal-mines-albi.archives-ouvertes.fr/hal-01968744/file/demand-driven-mrp.pdf), simulation).
  - With a bottleneck, "DDMRP and OPT perform the best, with DDMRP realising lower inventory levels" (B, [Thürer et al. 2022](https://ideas.repec.org/a/taf/tprsxx/v60y2022i3p1036-1050.html)).
  - Company-reported cases reproduced by Miclo et al. (C, not re-checked by me):
    - Michelin: service 89.3% to 98.6% with 10% less stock.
    - PZ Cussons, a personal-care maker: 25% to 30% less inventory, with service reported at 100%.
- **Evidence against:**
  - "Not sufficiently studied". Its parameters "are defined empirically", and there are no studies in continuous-process industries (B, [Azzamouri et al. 2021](https://www.jiem.org/index.php/jiem/article/download/3331/973)). PTI's bulk and formulation stages are partly process-type.
- **Fit for PTI:** packaging buffers at chosen decoupling points.
- **Common practice:** MRP with fixed safety stock.
- **Leading edge:** DDMRP or hybrids with parameters set from data.

**4.7 Forecast value added, bias and accuracy metrics**
- **Symptom addressed:** exposes the bias behind excess (over-forecast) and shortage (under-forecast). It moves no measure on its own. The evidence is strong on judgmental adjustment.
- **Evidence:**
  - Across more than 60,000 forecasts, "positive adjustments … were much less likely to improve accuracy than negative adjustments", and "smaller adjustments often damaged accuracy" (B, [Fildes et al. 2009](https://durham-repository.worktribe.com/output/1259596)).
  - MAPE is "infinite or undefined if y_t=0" (C, [FPP3](https://otexts.com/fpp3/accuracy.html)).
  - FVA is "the change in a forecasting performance metric … attributed to each particular step" (D, [SAS](https://www.sas.com/content/dam/SAS/en_us/doc/whitepaper1/forecast-value-added-analysis-106186.pdf)).
- **Fit for PTI:** high, as governance of planner overrides and daily PR edits.
- **Common practice:** MAPE.
- **Leading edge:** FVA plus a bias trend plus service-linked metrics.

**4.8 Dependent demand: BOM explosion, forecast consumption, time fences, collaborative planning (CPFR)**
- **Symptom addressed:** low confirmation and late delivery, through a stable shared plan; excess, through no double counting. The documentation is strong (A). Quantified results are few.
- **Evidence:**
  - Forecast consumption exists "to avoid duplication of demand" (A, [SAP](https://help.sap.com/doc/saphelpiis_hc_b1_image_repository_consultant_training_additional_b1_90_mrp_forecast_pdf/9.0/en-US/B1_90_MRP_Forecast.pdf)).
  - Time fences "minimize costly disruption to shop floor and supplier schedules" (A, [Oracle](https://docs.oracle.com/cd/A60725_05/html/comnls/us/mrp/tfover.htm)).
  - For CPFR, "case study evidence is still scarce" and "a lack of trust" is a barrier (B, Petropoulos et al. 2022).
  - Freezing parameters "have a significant impact on total cost, schedule instability and the service level" (B, [Xie, Zhao, Lee 2003](https://www.mcm.edu.cn/jxie/papers/IJPE2003.pdf)).
- **Fit for PTI:** central. An unfrozen near-term plan is the mechanism that passes PTI's volatility to suppliers.
- **Common practice:** SAP consumption plus time fences.
- **Leading edge:** share the plan *and its range*, with liability-backed zones.

**4.9 New-product and promotion forecasting**
- **Symptom addressed:** shortage at launch or promotion, and obsolete excess after them. The evidence is moderate and none of it comes from cosmetics.
- **Evidence (B):**
  - For new products, "management judgment is the most used approach". A pooled promotion model "pools examples of promotions across SKUs" and can estimate uplift "even for new SKUs" (Petropoulos et al. 2022).
  - At Dell, life-cycle curves built from analogue products gave errors "approximately 2%–3% below Dell's forecasts" ([Hu et al.](https://pure.psu.edu/en/publications/forecasting-new-product-life-cycle-curves-practical-approach-and-/)).
- **Fit for PTI:** very high, given the launch and promotion rate.
- **Common practice:** judgment.
- **Leading edge:** clustered analogue curves plus pooled promotion models with covariates.

---

## 5. Market solutions

Vendors are listed alphabetically. "Planning" means the vendor creates the forecast; "collaboration" means it publishes the forecast to suppliers and collects commits.

**Anaplan (planning).** PlanIQ runs ARIMA, CNN-QR, DeepAR+, ETS and Prophet, and "algorithms produce a distribution of possible values, rather than a single point forecast" (A, help.anaplan.com). It reports MAPE, MASE and MAAPE (A). Its SAP connector names SAP HANA, BW and ECC, not S/4HANA (A). I found no supplier collaboration, BOM or capacity documentation. Agents were announced in December 2025 (D).

**Blue Yonder (planning, some collaboration).** It claims a probabilistic "range of potential forecasts", Croston or SBA for slow movers, a certified S/4HANA adapter, and PO-level accept or counter-propose (all D, info.blueyonder.com). A widely quoted "5-10% improvement in supplier OTIF" has no named customer and the page returned 404. **Do not use it.**

**Coupa (collaboration).** Forecast commit and "flag differences between forecasted demand and available supply" are marketing only (D, [coupa.com](https://www.coupa.com/products/supply-chain-collaboration/forecast-collaboration/)). Supplier-managed inventory is documented: a buyer-set minimum and maximum, alerts below the minimum, and a shortage/surplus figure (A, [Compass](https://compass.coupa.com/en-us/products/product-documentation/supplier-resources/for-suppliers/coupa-supplier-portal/set-up-the-csp/inventory-collaboration/manage-inventories)).

**E2open (collaboration).** A customer's supplier training deck (Jabil, C) documents:
- a commit date and quantity per forecast date, by portal or Excel
- no over-commit on POs
- a mandatory reason code on "No Commit"
- missing-response and quantity-mismatch alerts
- supplier on-hand shared for scheduling agreements
- responses written back into the buyer's SAP

P&G runs a supplier material planning portal on E2open (D, no detail).

**Kinaxis (planning).** Concurrent planning with a probabilistic multi-echelon inventory engine from Wahupa: "probability distributions of lead times and demands" (D). It also offers "shadow planning" of contract manufacturers (D, case study) and an API-based S/4HANA option (D). Documentation is gated. Agents launched in October 2025 (D).

**Lokad (planning, addition).** Programmatic probabilistic forecasts as full distributions (A, docs.lokad.com). It has no supplier portal. Its M5 Uncertainty ranking is self-reported (D).

**Logility / Aptean (planning, addition).** Aptean acquired Logility in 2025 (D). All criteria are unverified.

**o9 Solutions (planning and collaboration).** Its marketing (D) claims:
- suppliers "respond with capacity commitments"
- mismatches open "triage rooms"
- buyers see supplier "inventory positions, safety stock, and weeks of cover"
- alignment "across production plans, Bills of Material, and supplier capacity"

Estée Lauder uses o9 for constrained supply planning, but the release gives **no figures** (D).

**Oracle Fusion SCM (planning and collaboration).** Documented at grade A ([26B guide](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26b/faucc/using-supply-chain-collaboration.pdf)):
- Order forecasts go out through the portal, B2B messaging or REST.
- The supplier commits per time bucket.
- A **Commit SLA in days** applies: "If the supplier doesn't provide commit an exception is thrown".
- Optional auto-commit either carries over the previous cycle's commit or commits a percentage of the forecast.
- Exceptions cover past-due commits, forecast changes between cycles, and commit mismatches.
- Commits flow into planning "as supplier capacity".
- Demand Management has intermittent-demand profiles and MAPE and bias measures (A).

I found no native SAP connector.

**RELEX (planning, some collaboration).** It shares forecasts and takes supplier "availability, constraints, and lead-time information" (D). Its SAP connector covers S/4HANA on-prem, RISE and ECC, but not the S/4 public cloud (D). Nucleus Research reports "RELEX customers cut inventory costs by 20 percent on average" across 4 organisations (C; not beauty; commissioning unknown).

**SAP IBP + SAP Business Network + S/4HANA (planning and collaboration).** This is the only stack with grade A evidence on all 9 criteria. Planning (IBP):
- Prediction intervals; Croston and Croston TSB for intermittent demand.
- Forecast error and bias; value added itself is not found.
- Multi-level BOM supply planning.
- Safety stock from a multi-stage inventory operator.
- Storage resources as a capacity constraint, but only in the optimizer: "the finite heuristic doesn't support storage resources". This matters for a warehouse at 121% to 142%.

Collaboration (Business Network):
- It receives net demand after MRP.
- It highlights zones by lead time.
- It shows previous forecast, forecast change and cumulative forecast.
- Suppliers commit in any time-series view, with a **commit lock horizon** and upside commits.
- Alerts fire on commit shortage and on decommits "regardless of whether the decommit creates a shortage".
- Suppliers can share projected stock; there are supplier-managed-inventory minimum and maximum targets and a finished-good-to-component view.
- IBP pulls commits back as a constraint and publishes constrained demand.

S/4HANA scheduling agreements carry **firm, trade-off and planning zones with cost liability**. One example quote: "If you cancel a schedule line within this semi-firm zone, the vendor is only entitled to charge you the material costs". A "Binding for Materials Planning" setting stops MRP changing lines inside those zones. Releases split into forecast (weeks and months) and just-in-time (days) types. Sources are help.sap.com IBP 2608, the Business Network supplier and configuration guides, and the S/4HANA scheduling agreement pages.

Two notes:
- I found no commit deadline or pre-deadline reminder in the SAP pages read.
- SAP says its SDI integration "will be sunset end of 2027".

**SupplyOn (collaboration, addition).** Demand-against-capacity comparison with alerts (D). It claims "10–40% inventory reduction" (D). Its SAP link is through EDI and APIs, not native (D).

**ToolsGroup, now Decion (planning, some collaboration).** Probabilistic forecasting and inventory optimisation, strong on long tails (D). A 2019 brief describes weekly buckets with a minimum-maximum "tunnel" and supplier confirmations or variations (D). Its SAP certification dates from 2015 and covers ERP 6.0, not S/4HANA (D).
- **Belcorp (beauty):** "fill rate maintained at over 95%" with a **projected** 10% to 15% inventory cut (D). That is a projection, not a result.
- **L'Oréal:** a widely repeated "15% reduction" appears only on an unsourced third-party blog and is excluded.

**Beauty and consumer-goods outcomes, overall.**
- The closest graded analogue is the 1996–97 Wal-Mart and Warner-Lambert CPFR pilot on Listerine: in-stock "from 87% to 98%" with inventory "about 20%" lower (C/D, [trade press](https://www.supermarketnews.com/archive/wal-mart-cpfr-pilot-charts-course-stock-growth)).
- Nothing comparable and recent was found for cosmetics.

---

## 6. Comparison matrix

Criteria:
1. Publishes a rolling forecast to suppliers by period, with firm and flexible zones
2. Supplier commits per material and period
3. Alerts on the forecast-commit gap
4. Probabilistic or ranged forecast
5. Dedicated intermittent-demand method
6. Material demand from finished goods through the BOM
7. Native SAP S/4HANA or IBP integration
8. Accuracy, bias or FVA measured
9. Supplier capacity fed back into the plan

**M** = met, **U** = unverified, followed by the grade. No cell is "not met": no source showed a capability to be absent.

| Vendor | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| Anaplan | U | U | U | M-A | U | U | U (ECC/BW/HANA only, A) | M-A | U |
| Blue Yonder | U | U (PO-level only, D) | U | M-D | M-D | U | M-D | U | U |
| Coupa | U | M-D | M-D | U | U | U | U | U | M-D |
| E2open | U (per-date forecast C; zones U) | M-C | M-C | U | U | U | U | U | M-C (inventory only) |
| Kinaxis | U | U | U | M-D (inventory engine) | U | U | M-D | U | M-D |
| Lokad | U | U | U | M-A | U | U | U | U | U |
| Logility / Aptean | U | U | U | U | U | U | U | U | U |
| o9 | U (sharing D) | M-D | M-D | U | U | M-D | M-D | U | M-D |
| Oracle Fusion | M-A (horizons; no explicit zone split) | M-A | M-A | U | M-A | U* | U | M-A | M-A |
| RELEX | U (sharing D) | U | U | U (disputed by a competitor) | U | U | M-D | U | M-D |
| SAP IBP + BN + S/4 | M-A | M-A | M-A | M-A | M-A | M-A | M-A | M-A (FVA U) | M-A |
| SupplyOn | U | M-D | M-D | U | U | U | U (EDI/API, D) | U | M-D |
| ToolsGroup / Decion | M-D (min-max tunnel) | M-D | U | M-D | M-D | M-D | U (ERP 6.0 only) | M-D | M-D |

\* The two research passes disagreed on Oracle criterion 6. One read a project-specific inheritance of work-order component demand as indirect evidence (A). The other found no BOM-derived supplier demand. It stays unverified. On criterion 1, one pass read Oracle's forecast and commit horizons as an equivalent of zones and the other did not. Both readings are shown.

---

## 7. Gap table

"Moves" names which of the 4 measures a gap affects: SC = Scheduled Confirmed, CFOT, SH = shortage, WH = warehouse utilisation.

| # | Hub today | Common practice | Leading edge | Moves | Requirement |
|---|---|---|---|---|---|
| G1 | Firm zone = supplier lead time; the zone source is unratified in C8 | Firm and trade-off zones on scheduling agreements | Zones with cost liability, plus MRP barred from changing lines inside them (SAP S/4, A) | SC, CFOT, WH | REQ-E06-01 BR-04, BR-05 |
| G2 | Version comparison per period; no measure of PTI's own volatility | Forecast change shown per period | Buyer forecast-change key figures and exceptions (SAP, Oracle, A); Firm-zone change tracked as a lagging metric | SC, CFOT | REQ-E06-01 (metric at `SUPPLIER-HUB-REQUIREMENTS.md:1319` names Firm-zone change, not built) |
| G3 | Commit deadline plus 1 reminder at half the deadline; overdue escalates | Missing-response alert (E2open, C) | Commit SLA exception plus optional auto-commit, reported apart from real commits (Oracle, A) | SC | REQ-E06-02 BR-07; REQ-E06-03 BR-06 (second reminder missing) |
| G4 | No link from forecast commitment to delivered result | Commit and delivery tracked separately | Commit reliability = committed quantity against later receipt, per supplier, beside CFOT | CFOT | no requirement yet |
| G5 | Single-number quantity per period | Single number | Range (P50/P90) published in the Trade-off and Forecast zones; commits against a chosen quantile | SC, SH, WH | no requirement yet (upstream in IBP) |
| G6 | No buffer policy; days of supply is used only to rank exceptions | Fixed safety stock in MRP | Multi-stage inventory optimisation (IBP, A) or DDMRP buffers | SH, WH | no requirement yet (upstream) |
| G7 | No storage-capacity check on published quantities | None | Storage resources as a planning constraint (IBP optimizer only, A) | WH | no requirement yet (upstream) |
| G8 | Commits carried forward when quantity unchanged; decommit not flagged separately | Shortage alert | Decommit alerts even without a shortage; commit lock horizon (SAP BN, A) | SC, CFOT | REQ-E06-03 |
| G9 | Cumulative forecast against cumulative commitment built | Same | Same (SAP BN, A). Parity reached | SC | REQ-E06-03 BR-03 |
| G10 | Supplier stock and capacity sit on separate pages, not joined to the forecast | Supplier-managed inventory with minimum/maximum (Coupa, Oracle, A) | Supplier projected stock and capacity inside the forecast view, fed into the constrained plan (SAP BN, IBP, A) | SC, CFOT, SH | REQ-E08-02, REQ-E08-04 (not joined to E06) |
| G11 | Forecast releases only; call-offs are a separate epic | Scheduling agreement releases | Split forecast (weeks/months) and just-in-time (days) releases so the near term follows consumption (SAP S/4, A) | CFOT, WH | REQ-E09 (call-off), not tied to E06 |
| G12 | No accuracy, bias or FVA | MAPE | FVA plus bias trend plus service-linked metric (Chin et al. 2026) | SH, WH | no requirement yet (upstream) |
| G13 | Demand is a simulated flat daily rate; C8 feed not wired | Live MRP/IBP feed | Live feed with plan version and lock state | all 4 | REQ-E06-01 BR-01; C8 §4.5; PQ-07 |

---

## 8. Recommendation

**Option A: Make the published plan worth confirming (in the Hub).**
- **What:**
  - Take the Firm and Trade-off boundaries from SAP scheduling agreement zones, closing the C8 open decision (G1).
  - Add PTI's own forecast-change measures beside each supplier's commitment: Firm-zone change, share of periods changed per version, and the direction of change (G2).
  - Add a commit-reliability measure that compares commitments to what arrived, shown next to CFOT (G4).
  - Add the second reminder the requirement already asks for (G3), and flag decommits (G8).
- **Measures moved and how:**
  - **Scheduled Confirmed**, through fewer changed periods returning to awaiting, and fewer late answers.
  - **CFOT**, through the Terwiesch mechanism: suppliers serve buyers whose forecasts they trust.
  - It also creates the first evidence of whether PTI or the supplier causes each miss.
- **Tradeoffs:** Needs the live C8 feed (G13) and a ruling on zones by procurement and finance. Measuring PTI's volatility openly may be uncomfortable internally.
- **Confidence: high.** The mechanism has peer-reviewed support (B), and SAP and Oracle both ship the equivalent (A). Most of the rules exist in `forecastRules.ts` already.
- **Strongest argument against:** Suppliers at below 50% reliability may be capacity-bound, not trust-bound. In that case a stable plan changes little, and capacity booking (option C) matters more (Sari 2008, B).

**Option B: A demand range and buffers sized to it (upstream, in SAP IBP).**
- **What:**
  - Use IBP's prediction intervals and multi-stage safety stock.
  - Add bias and value-added governance of overrides.
  - Run the storage constraint through the optimizer for packaging (G5, G6, G7, G12).
- **The Hub's part:** publish the range to suppliers in the Trade-off and Forecast zones, and accept commits against it. This is display plus the C8 fields.
- **Measures moved and how:**
  - **Shortage and warehouse utilisation**, through buffers sized to a service level instead of an unsound formula, and bias caught before it becomes stock.
  - **Scheduled Confirmed**, indirectly: a supplier can commit to a quantile.
- **Tradeoffs:** PTI already runs IBP, so this is configuration and planning-process work more than licences. It belongs to the planning owner, not the Hub. PQ-07 must be settled first.
- **Confidence: medium.** The method evidence is B and the SAP capability is A, but no cosmetics outcome is graded. The storage constraint works only in the optimizer, not the heuristic.
- **Strongest argument against:** Low stock accuracy undermines any buffer calculation. If on-hand is wrong, a correctly sized buffer is still reordered. Fix stock accuracy first, or run the two in parallel.

**Option C: Buffer placement and consumption-led release for packaging (Hub and SAP together).**
- **What:**
  - Define decoupling buffers for high-volume packaging, DDMRP-style or from option B's optimisation.
  - Hold part of them at the supplier, visible through the supplier's projected stock.
  - Call them off with just-in-time releases against consumption (G10, G11).
- **Measures moved and how:**
  - **Warehouse utilisation**, the only option aimed at it directly: stock moves physically to the supplier until needed.
  - **CFOT**, through smaller, predictable just-in-time releases.
- **Tradeoffs:** Vendor-managed and consignment stock moves ownership, not floor space. Space falls only if stock is physically held at the supplier. That is an inference. Suppliers will price the holding cost, and it needs the call-off epic (REQ-E09) joined to E06.
- **Confidence: low to medium.** DDMRP has simulation support (B) and company-reported cases (C, including one personal-care maker), but no process-industry evidence.
- **Strongest argument against:** It adds a second planning logic beside MRP. With a live IBP and MRP stack, option B may reach the same buffers with one system.

**Where each capability belongs:**
- **Hub:** zones, publication, commits, deadlines, reliability and volatility measures, the supplier's stock and capacity view, and publishing the range.
- **Upstream in SAP planning:** demand generation, the range, buffer sizing, the storage constraint, BOM explosion, and forecast value added.
- **Outside forecasting:**
  - Stock accuracy: cycle counting.
  - ASN timeliness and material readiness: supplier OTIF and ASN compliance under E07 and E10.
  - Manual PR review: Arc 2.

These will cap CFOT whatever the forecast does.

**On buying rather than building collaboration.** SAP Business Network is the only product with grade A evidence of the full loop on PTI's SAP stack. The Hub has already built most of its forecast-collaboration mechanics (section 3). The open choice for the product owner is whether the Hub keeps this module or hands it to Business Network, and it should be decided on:
- supplier adoption in Indonesia
- licence cost, which is not researched here
- whether one portal for all supplier work outweighs Business Network's native S/4 and IBP loop

Do not decide it on features alone.

---

## 9. What I could not verify

- The PTI figures in section 2: taken from the owner's slides, not from a system.
- Company-reported DDMRP results (Michelin, PZ Cussons): the source PDF blocked a re-fetch.
- Gated documentation for Kinaxis, o9, Blue Yonder and RELEX: every D verdict needs confirming in a demo or RFP.
- SAP: forecast value added, a commit deadline or pre-deadline reminder, and whether S/4 scheduling agreement zones pass through Business Network to suppliers.
- Oracle: firm/flexible zone split, BOM-derived supplier demand (disputed), and SAP integration.
- Coupa: forecast commit mechanics. No Compass page was found.
- E2open: zones and native SAP integration.
- Blue Yonder's "5-10% OTIF" claim: page 404.
- The L'Oréal–ToolsGroup claim: unsourced, so excluded.
- o9 cosmetics case study: HTTP 403.
- Probabilistic forecasting at RELEX, o9 and Oracle.
- M4 "8.4%" figure and the classification cut-offs for intermittent demand (ADI 1.32, CV² 0.49): search snippets only.
- Inventory record inaccuracy as a joint cause of stockout and excess (DeHoratius and Raman): snippet only.
- MOQ-driven excess: only vendor blogs found.
- Lag-Llama and parts of Chin et al.: read through summaries. The two Chin et al. figures quoted above were checked at source.
- Gartner Magic Quadrant 2025 and 2026 placements: seen only in vendors' own announcements.
- Fetched pages containing instructions: one Nixtla page asked the reader to fetch another file. It was ignored.

---

## 10. Sources

**A (vendor documentation)**
- SAP IBP 2608 on help.sap.com: Croston TSB, probabilistic forecasting, forecast error and bias, time-series supply planning, storage resources, safety stock, Business Network collaboration, AI-assisted scenario planning
- SAP Business Network supplier and configuration guides: forecast workflow, committing, viewing, key figures, forecast alerts, deviation approval; Product Activity Message
- SAP S/4HANA: scheduling agreement zones (help.sap.com/docs/SAP_S4HANA_ON-PREMISE/f340785101c548c9beeda9284efd18a0/2d7fb65334e6b54ce10000000a174cb4.html) and release types
- SAP forecast consumption PDF
- Oracle SCM Collaboration 26B guide; order forecast REST API; forecast accuracy (26b); Demand 24B; time fences
- Anaplan PlanIQ quantiles, metrics, SAP import
- Coupa Compass: manage inventories
- Lokad ranvars
- Chronos GitHub
- Nixtla intermittent tutorial

**B (peer-reviewed, competitions, arXiv with benchmarks)**
- Competitions: M4 results; M5 accuracy; M5 uncertainty
- Reviews: Petropoulos et al. 2022; Azzamouri et al. 2021
- Intermittent demand: Teunter, Syntetos, Babai 2011; Syntetos & Boylan 2005; Nikolopoulos et al. (ADIDA); Damato et al. 2026
- Inventory and service: Chin, Cheng, Gunawan 2026; Kourentzes, Trapero, Barrow 2020; Fildes et al. 2009
- Foundation models: GIFT-Eval; fev-bench; Chronos-2; Chronos; TimesFM; Moirai; TimeGPT; Lag-Llama; EnbPI
- DDMRP: Miclo et al. 2019; Thürer et al. 2022
- MRP and freezing: Seiringer et al.; Xie, Zhao, Lee 2003; Sridharan, Berry, Udayabhanu 1987; Godinho Filho & Fernandes 2006
- Supplier collaboration: Terwiesch et al. 2005; Özer, Zheng, Chen 2011; Claassen, van Weele, van Raaij 2008; Sari 2008; Lee, Padmanabhan, Whang 1997
- New products: Hu et al. (Dell)

**C (practitioner, analyst, customer)**
- Nucleus Research, RELEX note (2024)
- Jabil E2open supplier training deck
- Kinaxis audio-manufacturer case study
- FPP3 textbook
- Svetunkov, "SBC is not for you"
- Supermarket News CPFR pilot (1997)
- Company-reported DDMRP cases in Miclo et al.

**D (vendor marketing and press)**
- Blue Yonder FAQ pages and ICON 2025
- Coupa product pages
- E2open product page; P&G supplier page
- Kinaxis product and press pages
- o9 supplier collaboration and Estée Lauder release
- Oracle agent releases (2025, 2026)
- RELEX collaboration and SAP connector pages
- SupplyOn forecast and capacity pages
- ToolsGroup brief, SO99+/Decion page, Belcorp blog
- Anaplan and Aptean releases
- SAS forecast value added white paper
- Lokad self-reported M5 claim
