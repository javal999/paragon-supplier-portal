# Forecast engine: method spec

Prepared 2026-09-23 for PT Paragon Technology and Innovation (Wardah, Emina, Make Over).

**What this is.** A calculation spec for the demand and material forecast engine PTI will build itself. For each step it gives:
- the method to implement, with its formula written out
- the paper it comes from, plus the newest work that re-tested it
- open-source code to follow
- the inputs it needs
- which of the 4 problem measures it moves

**Decisions this spec follows (owner, 2026-09-23):**
- PTI builds the engine in-house. External planning engines, including SAP IBP, are out.
- The engine goes into the Supplier Hub first and is merged into SOMO later. Every step here is written as a pure calculation (data in, result out), so it can run in either system.

**The problem the engine must move** (owner's "Challenge & Gaps" slides):
- **Scheduled Confirmed** is 67% against a 100% target.
- **CFOT** is 36.4% against 100%.
- **Warehouse utilisation** is too high: packaging 121% to 142% and raw material about 106%, both against 80%.
- **Shortage and excess** happen at the same time.

**Companion doc.** The market and as-built review is `FORECAST-BEST-PRACTICE-2026-09.md`. Its SAP IBP recommendation (option B) is replaced by this spec.

---

## How to read this

- **Evidence grades:**
  - **A**: library or vendor documentation and source code
  - **B**: peer-reviewed papers, competition results, arXiv papers with results
  - **C**: textbooks, standards bodies, practitioner material
  - **D**: marketing
- **"Newer work" line on every method.** It names the most recent paper found (2022 to 2026 where one exists) and gives a verdict: **default holds**, **superseded**, or **extend**. An old paper stays as the anchor only where newer work confirms it or nothing newer beats it.
- **"Proposal" tag.** It marks a formula written for PTI from standard practice, not quoted from a source. Section 5 lists these separately.
- **Measure tags:** SC = Scheduled Confirmed, CFOT, SH = shortage, WH = warehouse utilisation.
- **What I checked myself at the source:**
  - the SBA-versus-Croston rule (Kostenko and Hyndman 2006)
  - the title and approach of Godahewa et al. (forecast stability)
  - the two Chin et al. 2026 figures
  - Terwiesch et al. 2005

  All other formulas come from 3 research passes that read papers, library code or documentation. Where a formula was not read at its primary source, section 5 says so.

---

## 1. The chain at a glance

| # | Step | Default method | Anchor reference | Newest work checked | Verdict | Moves |
|---|---|---|---|---|---|---|
| D1 | Finished-goods demand per SKU | Global LightGBM, Tweedie loss, price/promo/calendar features | M5 winner (Makridakis et al., IJF 2022) | Sprangers et al., IJF 2024; VN2 winner 2026; Chronos-2 2025 | Default holds; foundation models as challenger | SH, WH |
| D2 | Statistical fallback | Comb (SES+Holt+Damped), Theta, AutoETS | M4 benchmark code | Sprangers 2024 | Default holds as benchmark | SH |
| D3 | Intermittent SKUs and materials | SBA; TSB where discontinuation is likely | Syntetos & Boylan 2005; Teunter et al. 2011; Kostenko & Hyndman 2006 | Damato et al. 2026; TSB-HB 2025 | Superseded on accuracy by global probabilistic models; kept as fallback and service benchmark | SH, WH |
| D4 | Hierarchy (SKU → brand → total) | MinT-shrink, non-negative | Wickramasuriya et al., JASA 2019 | Athanasopoulos et al. review, IJF 2024; Sprangers 2024 | Default holds | SH |
| D5 | Demand range | Quantile LightGBM + split-conformal per horizon + online quantile tracking | M5 Uncertainty 2022; Gibbs & Candès 2021 | Angelopoulos et al. 2023 (conformal PID) | Extend: use quantile tracking | SH, WH, SC |
| D6 | Launches and promotions | Analogue life-cycle curves; promo features in D1 plus pooled promo benchmark | Hu et al., MSOM 2019; Trapero et al., JORS 2015 | Hewage et al. 2026; diffusion cold-start 2026 | Default holds | SH, WH |
| M1 | Forecast consumption | Backward/forward consumption window | SAP/Oracle documentation | none newer | Default holds | WH |
| M2 | Finished goods to materials | MRP gross-to-net with low-level codes, yield, scrap | Standard MRP (Orlicky; open text by Gardner) | Seiringer et al. 2024–2026 | Default holds; tune parameters | SH, WH, CFOT |
| M3 | Safety stock | Empirical quantile of cumulative lead-time forecast error | Saoud, Kourentzes, Boylan, Omega 2022 | Babai et al., EJOR 2022; Saldanha et al., POMS 2022 | **Classic formula superseded** | SH, WH |
| M4 | Where to hold buffers | Guaranteed-service model, with MOQ extension | Graves & Willems 2000 | Achkar et al., EJOR 2023 | Extend | WH |
| M5 | Order sizing with MOQ and warehouse space | Multi-item MILP with storage constraint; Wagner–Whitin fallback | Wagner & Whitin 1958; Atamtürk & Küçükyavuz 2005 | Boonphakdee et al. 2025; van Hezewijk et al. 2022 | Default holds | WH |
| M6 | Plan stability to suppliers | Time fences + change cost + forecast interpolation | Sridharan et al. 1987; Xie et al. 2003 | Godahewa et al., IJF 2025; Zanotti 2026; Van Belle et al. 2026 | Extend with interpolation | SC, CFOT |
| M7 | Unreliable supplier timing | Safety lead time per supplier | van Kampen et al., IJPR 2010 | none that overturns it | Default holds | CFOT, SH |
| G1 | Plan-change measures | MASC(V), MASC-I, % schedules changed within lead time | Godahewa et al. 2025; SCOR RL.3.27 | Ma et al. 2026 | Default holds | SC, CFOT |
| G2 | Bias and override value | Trigg tracking signal; FVA as AvgRelMAE | Trigg; Fildes & Goodwin, IJF 2021 | Kesavan et al., Mgmt Sci 2026 | Extend: judge overrides by outcome | SH, WH |
| G3 | Supplier measures and miss attribution | Commitment reliability; buyer/supplier/unconfirmed split | SCOR v11; Terwiesch et al. 2005 | none re-tests Terwiesch | Default holds, stated as not re-tested | SC, CFOT |
| G4 | Trade-off tolerance band | Quantity-flexibility band per revision | Tsay 1999; Tsay & Lovejoy 1999 | none newer | Default holds; 10% is a policy choice | SC |
| G5 | Share ranges with suppliers | Publish P50 and an upper quantile | Özer & Wei 2006 | Lu & Tomlin, Mgmt Sci 2025 | Extend | SC |
| E | Choosing models | Rolling-origin backtest judged on simulated service and warehouse space | Kourentzes et al. 2020 | Chin et al. 2026; Theodorou et al. 2025 | Extend | all 4 |

---

## 2. Demand side

### D1. Finished-goods demand per SKU: global gradient-boosted trees

**Method.** One LightGBM model trained across many SKUs at once, so SKUs learn from each other. Following the M5 winner, average a *direct* variant (one model per horizon block, features lagged at least the horizon) and a *recursive* variant (rolling features rebuilt from its own predictions). The recursive variant is more accurate but less stable, so the average balances the two.

**Loss.** Tweedie negative log-likelihood, with `tweedie_variance_power` in [1.0, 2.0). The M5 winner used 1.1.

**Settings used by the M5 winner** (from its code):

| Setting | Value |
|---|---|
| `objective` | `tweedie` |
| `tweedie_variance_power` | 1.1 |
| `learning_rate` | 0.015 |
| `num_leaves` | 2047 |
| `min_data_in_leaf` | 4095 |
| `feature_fraction` | 0.5 |
| `subsample` | 0.5 |
| `max_bin` | 100 |
| `n_estimators` | 3000 |

The leaf sizes suit tens of thousands of series; scale them down for PTI.

**Features:**

| Group | Features |
|---|---|
| Lags | Sales lagged by at least the horizon |
| Rolling | Rolling mean and standard deviation over 7, 14, 30, 60 and 180 days, shifted by the horizon |
| Price | Maximum, minimum, standard deviation and mean; price ÷ maximum; number of distinct prices; price momentum (÷ last period, ÷ monthly mean) |
| Calendar | Day, week, month, week-of-month, day-of-week, weekend |
| Events | Ramadan and Lebaran, 11.11, payday |
| Promotion | Promotion flags |
| Target encoding | Mean and standard deviation of sales by SKU, brand and category |

**Weekly adaptation for PTI.** For a weekly planning grain, the "days" windows become 4, 8, 13 and 26 weeks. Group models by brand or category, as the winner grouped by store and department.

**Evidence (B).**
- In M5, all top methods were pure machine learning and beat every statistical benchmark. The winner was 22.4% better than the best benchmark.
- The gain is uneven by level: 77.9% over Croston at the top level but only **4.7% at product-store level**. The engine earns most of its value in brand and total plans, and D3 remains a close competitor at SKU level.
- Source: Makridakis, Spiliotis, Assimakopoulos, IJF 38(4), 2022 ([paper](https://www.sciencedirect.com/science/article/pii/S0169207021001874)); winner code at [Mcompetitions/M5-methods](https://github.com/Mcompetitions/M5-methods).

**Inputs.**
- Weekly sell-in per SKU (and channel if planned), plus price history
- The promotion calendar, launch dates, and the SKU → brand → category map
- Stock-out flags, so zero sales during a stock-out are not read as zero demand. The VN2 winner used stock-out-aware features.

**Use when:** many related SKUs with price and promotion drivers.
**Do not use for:** SKUs with under about 1 season of history (use D6), or where a leak-free validation cannot be built.

**Code.** [LightGBM](https://lightgbm.readthedocs.io) (A); [Nixtla mlforecast](https://nixtlaverse.nixtla.io/mlforecast/) (A), which handles lags, rolling features and direct or recursive forecasting.

**Newer work:**
- Sprangers et al., IJF 40(4), 2024 ([arXiv 2310.12809](https://arxiv.org/abs/2310.12809)) (B). A LightGBM with a sparse hierarchical loss beat squared-error and Tweedie baselines by about 5% to 10% on M5. In production it improved product-level MAE by about 10%.
- VN2 winner 2026 ([arXiv 2601.18919](https://arxiv.org/abs/2601.18919)) (B, competition report). A single global CatBoost with stock-out-aware features and time-based weights, followed by a cost-aware ordering policy.
- Chronos-2 2025 ([arXiv 2510.15821](https://arxiv.org/abs/2510.15821)) (B). A zero-shot foundation model that uses covariates. It was compared only with other foundation models, not with a tuned tree model.
- Damato et al. 2026 ([arXiv 2601.14031](https://arxiv.org/abs/2601.14031)) (B). On intermittent data, LightGBM varied a lot between training runs.
- **Verdict: default holds.** Benchmark Chronos-2 on short-history SKUs as a challenger. Try the hierarchical loss (Sprangers) as a second challenger.

### D2. Statistical fallback and benchmark

**Methods.** These come from the official M4 benchmark code ([Mcompetitions/M4-methods](https://github.com/Mcompetitions/M4-methods), A/B).

- **Seasonality test.** A series is seasonal if |r_m| > 1.645/√n · √(1 + 2·Σ_{k<m} r_k²). Here r_m is the autocorrelation at lag m and m is the number of periods per year.
  - If it is seasonal, deseasonalise with classical multiplicative decomposition, forecast, then put the seasonality back.
- **Comb** = (SES + Holt + Damped Holt) / 3, fitted on the deseasonalised series.
- **Theta (classic).** Forecast = 0.5·L0 + 0.5·SES(L2).
  - L0 is a linear regression on time.
  - L2 = 2·y_t − L0.

**Role.** Every D1 model must beat Comb in the backtest (section E). Use D2 as the production forecast for any SKU where D1 fails that test, and at brand and total level if D1 is unstable there.

**Evidence.** The M5 paper records that the M4 winners were only "similarly accurate to a simple combination" of statistical methods (B). ES with promotion regressors was about 6% better than plain ES in M5 (B).

**Code.** statsforecast `AutoETS`, `AutoTheta`, `DynamicOptimizedTheta` ([docs](https://nixtlaverse.nixtla.io/statsforecast/), A). R `fable`.

**Newer work.** No 2022 to 2026 result replaces these as benchmarks. Sprangers 2024 shows them well behind LightGBM on M5. **Verdict: default holds as the benchmark and fallback.**

### D3. Intermittent and lumpy demand

**Methods.** Equations are from the M5 guide and statsforecast source code (A/B). Let y_t be demand in period t, z the size of a non-zero demand, and p the interval between non-zero demands.

- **Croston.** Update only in periods with demand:
  - ẑ ← ẑ + α(y_t − ẑ)
  - p̂ ← p̂ + α(q − p̂), where q is the current interval
  - Forecast = ẑ / p̂. Default α = 0.1.
- **SBA (Syntetos–Boylan approximation).** Forecast = (1 − α/2)·ẑ/p̂, which is 0.95·ẑ/p̂ at α = 0.1. This removes Croston's upward bias.
- **TSB (Teunter, Syntetos, Babai 2011).** Update every period:
  - D̂ is the probability of demand and Ẑ the size.
  - If y_t > 0: D̂ ← D̂ + β(1 − D̂) and Ẑ ← Ẑ + α(y_t − Ẑ).
  - If y_t = 0: D̂ ← D̂ + β(0 − D̂), and Ẑ is unchanged.
  - Forecast = D̂·Ẑ. Because D̂ decays when demand stops, the forecast falls toward zero for dying SKUs. Croston does not do this.
- **ADIDA.**
  - Aggregation level A = round(mean interval between demands).
  - Sum demand into non-overlapping buckets of A periods, forecast the bucket totals with SES, then divide by A.
  - Setting A to the supplier lead time is a natural choice for material ordering.

**Choosing between Croston and SBA.** Kostenko and Hyndman (JORS 2006, [PDF](https://robjhyndman.com/papers/idcat.pdf), B, checked at source) derived the exact boundary. Their practical rule:
- Use SBA whenever v > 2 − 3p/2, where v is the squared coefficient of variation of the demand sizes and p is the mean interval.
- The popular cut-offs of 1.32 and 0.49 are wrong. The correct limits are 4/3 and 0.5.

For PTI, the choice becomes:
- SBA by default.
- TSB for SKUs flagged for discontinuation or a shade or pack change.
- Croston only where the rule says it wins.

**Evidence.**
- In M5, Croston beat seasonal naive by 13% to 27% at the 3 lowest levels (B).
- Croston "is positively biased" and unsuitable for obsolescence (Teunter et al. 2011, [DOI](https://doi.org/10.1016/j.ejor.2011.05.018), B, abstract).

**Code.** statsforecast `CrostonClassic`, `CrostonOptimized`, `CrostonSBA`, `TSB`, `ADIDA`, `IMAPA` (A). Each is a few lines, so it ports to TypeScript directly.
- Note: statsforecast's TSB parameter names (`alpha_p` for probability, `alpha_d` for size) are the reverse of Nixtla's docs page. Follow the source code.

**Newer work:**
- Damato et al. 2026 ([arXiv 2601.14031](https://arxiv.org/abs/2601.14031), B, more than 40,000 series). A small global neural model (TiDE) with negative-binomial or Tweedie output beat local methods. The best local models were iETS and TweedieGP.
- Bai and Chu 2025 ([arXiv 2511.12749](https://arxiv.org/abs/2511.12749), B-). A hierarchical Bayesian TSB beat TSB and SBA modestly.
- Chin et al. 2026 (section E). Croston, SBA and ADIDA gave the *best order-level service* because of their upward bias.
- **Verdict: superseded on accuracy by global probabilistic models, kept as the fallback and service benchmark.**

### D4. Keeping SKU, brand and total plans consistent (reconciliation)

**Method.** MinT (Wickramasuriya, Athanasopoulos, Hyndman, JASA 2019, [PDF](https://robjhyndman.com/papers/mint.pdf), B).

**The terms:**
- ŷ_h is the vector of independent base forecasts at every level.
- S is the summing matrix that maps SKUs to every level.
- W_h is the forecast-error covariance.

**The calculation:**
- Reconciled forecast ỹ_h = S·P·ŷ_h, with P = (S′W_h⁻¹S)⁻¹S′W_h⁻¹.
- A cheaper equivalent inverts only a matrix the size of the aggregate levels: P = J − J·W_h·U(U′W_hU)⁻¹U′.
- **Default W: MinT-shrink.** Shrink the in-sample residual covariance toward its diagonal: W* = λ·diag(Ŵ₁) + (1−λ)·Ŵ₁. The intensity λ̂ = Σ_{i≠j} Var̂(r̂_ij) / Σ_{i≠j} r̂_ij², where r̂_ij are residual correlations (Schäfer–Strimmer).
- **Fallback: WLS_struct.** W = diag(S·1), which needs no residuals.

**Use when:** base forecasts are unbiased and made independently per level.
**Do not use** unconstrained on mostly-zero series: it can return negative values, so set non-negative.

**Code.** Nixtla hierarchicalforecast `MinTrace(method='mint_shrink', nonnegative=True)` ([repo](https://github.com/Nixtla/hierarchicalforecast), A). R `fable::reconcile(min_trace(...))`. PTI's hierarchy (a few brands) is small enough to port to TypeScript with a small matrix library.

**Newer work:**
- Athanasopoulos, Hyndman, Kourentzes, Panagiotelis, "Forecast reconciliation: a review", IJF 40(2), 2024 ([PDF](https://robjhyndman.com/papers/hf_review.pdf), B). For intermittent series, judge reconciliation on decision metrics or the predictive distribution.
- Sprangers 2024. MinT-shrink and WLS_var were the best post-hoc methods at scale. A hierarchical training loss did better still.
- **Verdict: default holds.**

### D5. The demand range (quantiles and calibration)

**Method, 3 layers:**

1. **Quantile forecasts from D1.** Train LightGBM with `objective='quantile', alpha=u` for each required level u. At minimum: P50, P80 or P90, and P95.
   - Score them with pinball loss: L_u(y, Q) = u·(y − Q) if Q ≤ y, else (1 − u)·(Q − y).
   - M5 scaled this into SPL by dividing by the mean absolute one-step change of the series (M5 guide, B).
2. **Split-conformal calibration per horizon.** On rolling backtest windows, collect errors per horizon step. Widen or narrow each quantile until its historical coverage matches its level. This is the mlforecast/statsforecast `ConformalIntervals(n_windows, h)` method (A).
3. **Online correction as actuals arrive.** Use quantile tracking: q_{t+1} = q_t + η·(err_t − α), where err_t = 1 if the actual fell outside the band and α is the target miss rate. This comes from conformal PID (Angelopoulos, Candès, Tibshirani, NeurIPS 2023, [arXiv 2307.16895](https://arxiv.org/abs/2307.16895), B).
   - It refines adaptive conformal inference (ACI: α_{t+1} = α_t + γ(α − err_t), with γ = 0.005 in Gibbs and Candès 2021, [arXiv 2106.00170](https://arxiv.org/abs/2106.00170)).
   - Unlike ACI it "does not return infinite sets".

**Why it matters for the problem.** M3 sizes safety stock from these errors. G5 publishes the upper quantile to suppliers. Both depend on a calibrated range.

**Code.** LightGBM quantile objective; MAPIE `TimeSeriesRegressor(method="enbpi"|"aci")` ([docs](https://mapie.readthedocs.io/en/stable/generated/mapie.regression.TimeSeriesRegressor.html), A); mlforecast prediction intervals (A).

**Newer work.**
- EnbPI (Xu and Xie 2021) works but needs many bootstrap models, with no clear edge.
- Damato 2026 found Tweedie output heads gave the best upper quantiles.
- **Verdict: extend.** Use quantile tracking for the online layer.

### D6. Launches and promotions

**Launches: analogue life-cycle curves** (Hu, Acimovic, Erize, Thomas, Van Mieghem, MSOM 21(1), 2019, [DOI](https://doi.org/10.1287/msom.2017.0691), B, abstract only).

Method:
1. Fit a life-cycle curve to each past SKU.
2. Cluster similar SKUs by attributes: brand, category, price tier, shade family.
3. For a new SKU, take its cluster's representative curve and scale it by the launch volume plan.

At Dell, clustered triangle and trapezoid curves had errors about 2% to 3% below Dell's own forecasts.

- **Proposal:** a piecewise-linear shape of ramp-up to a peak, flat maturity, then decline to end of life. PTI fits the 3 breakpoints and the peak from its own past launches. The paper's exact curve formulas were not read.
- **Alternative:** the Bass model. f(t)/(1 − F(t)) = p + q·F(t), and sales S(t) = m·f(t) (C, not read at the primary source).

**Promotions.** Put promotion features inside D1; all M5 winners used price and promotion features. Keep an explainable benchmark: the pooled regression of Trapero, Kourentzes, Fildes (JORS 66, 2015, [postprint](https://eprints.lancs.ac.uk/id/eprint/67669/1/identpromo83.pdf), B).
- **Per SKU:** y_t = β₀ + Σ_j β_j·X̂_{j,t} + e_t, where X̂ are the principal components of the promotion variables and their lags 1 to 3 (carry-over).
- **Pooled model:** y_t^i = α₀ + Σ_j α_j·X_{j,t}^i + e_t^i, fitted across all SKUs on normalised data. Use it for SKUs with fewer than 5 past promoted weeks.
- The error term is ARIMA (orders up to 3, chosen by the Schwarz criterion). Non-promoted weeks use SES.
- The paper reports up to 30% lower error on promoted sales than expert and statistical benchmarks.

**Newer work.**
- Hewage, Perera, Bandara, J. Forecasting 45(1), 2026 ([abstract](https://ideas.repec.org/a/wly/jforec/v45y2026i1p293-315.html), B). Machine learning handles promotion volatility; the base-lift model was comparable but needed more data preparation.
- A 2026 diffusion-model cold-start forecaster ([arXiv 2604.20370](https://arxiv.org/abs/2604.20370)) is research-stage.
- **Verdict: default holds.**

---

## 3. Material side

### M1. Forecast consumption

Sales orders replace the forecast they fall inside, so orders and forecast are not counted twice.
- Demand_t = orders_t + max(0, F_t − consumed_t).
- `consumed` is taken from a window of B buckets backward, then F buckets forward (Oracle SCM documentation, A).

**Inputs:** the finished-goods forecast from D1 to D6, open sales and replenishment orders, and window sizes per SKU group.

**Verdict: standard, default holds.**

### M2. Finished goods to materials: MRP gross-to-net

**Algorithm.** From Gardner's open MRP text (C) and standard practice. Items are processed in low-level-code order, one weekly bucket t at a time.

1. **Low-level code.** Each item's deepest position in any bill of materials, found by a topological sort of the BOM graph. Plan items with code 0 first, then code 1, and so on.
2. **Gross requirement.** GR_c,t = independent demand_c,t + Σ over parents p of (planned order release_p,t × quantity-per_p,c × (1 + scrap%_p,c)). *Proposal:* the exact form, with the scrap multiplier, is standard practice written out for PTI.
3. **Projected on hand.** POH_t = POH_{t−1} + scheduled receipts_t + planned receipts_t − GR_t.
4. **Net requirement.** NR_t = max(0, GR_t + safety stock − (POH_{t−1} + scheduled receipts_t)). Safety stock comes from M3.
5. **Planned order receipt.** Apply M5 (lot sizing, MOQ, multiples) to NR_t. For yield losses, divide by the yield: quantity ÷ yield%. Where yield is carried on the BOM line (as in the Hub's feed spec), apply it in step 2 on each component instead (qty per × (1 + scrap) ÷ yield); for a made item the result is the same.
6. **Planned order release.** The receipt at t is released at t − lead time. Where M7 applies, use lead time plus the safety lead time.

**Inputs:**
- Bills of materials with quantity-per, scrap and yield
- Lead time per item and supplier
- On-hand stock
- Open POs at the **supplier-confirmed** date, not the requested date. This links the engine to Scheduled Confirmed.

**Prerequisite.** Low stock accuracy breaks step 4 directly, because netting subtracts on-hand as recorded. Run cycle counting and reconciliation before trusting net requirements. The owner's slides name low stock accuracy as a gap.

**Newer work:**
- Seiringer, Altendorfer et al. 2024 to 2026 ([arXiv 2403.11010](https://arxiv.org/abs/2403.11010), [2503.01862](https://arxiv.org/abs/2503.01862)) (B, simulation). Under rolling forecast updates, fixed order quantities beat fixed order periods. A safety-stock exploitation rule and capacity-aware release dates improved cost and backorders.
- Seiringer, Bokor, Altendorfer 2024 ([arXiv 2405.02015](https://arxiv.org/abs/2405.02015)) (B). "MRP and ConWIP generally outperform" reorder-point planning.
- **Verdict: default holds.** The newer work tunes MRP rather than replacing it.

### M3. Safety stock from actual forecast errors

**The classic formula is superseded.** The textbook formula is SS = k·√(E[L]·σ_D² + E[D]²·σ_L²).
- Its lead-time variance estimator "is unsound, even if demand is independent and identically distributed" (Petropoulos et al., IJF 2022, B).
- Babai et al. (EJOR 2022, [abstract](https://ideas.repec.org/a/eee/ejores/v296y2022i3p846-861.html), B) found "the classical strategy presented in textbooks appears to be the least accurate one".
- With random lead times, the standard procedure "can yield results that are far from the desired result" (Eppen and Martin, Management Science 1988, B).

**Default method** (Saoud, Kourentzes, Boylan, Omega 2022, [eprint](https://eprints.lancs.ac.uk/id/eprint/169200/), B):
1. At each backtest origin, compute the cumulative lead-time error: E_t = Σ_{i=1}^{L} (y_{t+i} − ŷ_{t+i|t}).
2. **Normal-based version:** SS = k_α · sd(E_t) over rolling origins.
3. **Distribution-free version** (Trapero, Cardós, Kourentzes, Omega 2019, [PDF](https://kourentzes.com/forecasting/wp-content/uploads/2018/06/Trapero_empirical-safety-stock.pdf), B): SS = the α-quantile of E_t, smoothed by kernel density. Use GARCH instead of kernel density for long lead times.
4. **Where supplier lead times vary:** SS = the α-quantile of a multivariate bootstrap of lead-time demand (Saldanha, Price, Thomas, POMS 2022, B).
5. **Proposal:** the order-up-to level is S = the upper quantile of (L+R) demand from D5, and SS = S − mean demand over (L+R).

**Choosing the service target.**
- Use a **fill-rate** target for packaging, not a cycle-service target.
- With large MOQ-driven lots, fill rate is already high at low safety stock (β = 1 − σ·G(k)/Q grows with Q). A cycle-service target therefore over-buffers, which feeds the warehouse overload. This follows from the formula; the recommendation is a proposal.

**Newer work:**
- Deep reinforcement learning for inventory (Madeka et al., Amazon, 2022, [arXiv 2210.03137](https://arxiv.org/abs/2210.03137), B) and end-to-end learning at JD.com ([arXiv 2509.12183](https://arxiv.org/abs/2509.12183)) show gains at retail scale. Neither has been tested with bills of materials and MOQs, and both are hard to explain to planners.
- **Verdict: classic formula superseded; the empirical error-quantile method is the default.**

### M4. Where to hold buffers: guaranteed-service model

**Method** (Graves and Willems, MSOM 2000, [DOI](https://pubsonline.informs.org/doi/10.1287/msom.2.1.68.23267), B; formulas read in stockpyl source code, A). Each stage j (finished good, bulk, component) quotes a service time. The model picks the service times that minimise total holding cost.

- Net lead time: NLT_j = SI_j + T_j − S_j.
  - SI_j is the inbound service time the stage receives.
  - T_j is its processing time.
  - S_j is the outbound service time it promises.
- Safety stock SS_j = z·σ_j·√NLT_j. Base stock = μ_j·NLT_j + SS_j.
- Minimise Σ_j h_j·SS_j, subject to:
  - SI_j ≥ S_i for every upstream stage i
  - 0 ≤ S_j ≤ SI_j + T_j
  - the finished-good S at or below the customer service time

**For PTI.**
- Packaging shared across many finished goods makes the network a general graph, not a tree, so solve it as a mixed-integer program (M5's solver) rather than the tree algorithm. Proposal.
- Replace the √NLT normal term with M3's empirical quantile where history allows. Proposal.

**Code.** stockpyl `gsm_tree.optimize_committed_service_times` ([repo](https://github.com/LarrySnyder/stockpyl), A, MIT licence; trees only).

**Newer work:**
- Achkar, Grossmann et al., EJOR 2023 ([arXiv 2306.10961](https://arxiv.org/abs/2306.10961)) (B). Adds MOQs, review periods and fill-rate targets, with a much faster reformulation.
- Humair et al., Interfaces 2013 (B). Adds random lead times.
- **Verdict: extend with Achkar's MOQ version.**

### M5. Order sizing with MOQ, multiples and warehouse space

**Default: a multi-item mixed-integer program.** *Proposal:* this is the standard capacitated formulation written out for PTI.

- Minimise Σ_{i,t} (K_i·y_it + h_i·I_it) + Σ_t p·O_t
- Subject to:
  - I_i,t−1 + x_it − d_it = I_it (stock balance, with d_it from M2's net requirements)
  - x_it ≥ MOQ_i·y_it (minimum order quantity)
  - x_it ≤ M·y_it (order only when ordering)
  - x_it = m_i·n_it, with n_it an integer (order multiple)
  - Σ_i v_i·I_it ≤ Cap_t + O_t (warehouse space)
- The terms:
  - y_it is 1 when item i is ordered in week t.
  - v_i is pallets or cubic metres per unit.
  - Cap_t is owned warehouse capacity.
  - O_t is overflow priced at the rented-warehouse rate p.
- **Why this form.** PTI's warehouse is over capacity. This makes rented space a visible cost the plan must trade against holding and ordering costs, instead of an unplanned overflow.
- **Proposal:** add a change penalty λ·|x_it − x_it^previous| (linearised) inside the supplier lead time to link M5 to M6.

**Single-item fallback: Wagner–Whitin (1958).**
- θ_t = min over t < s ≤ T+1 of { K + h·Σ_{i=t}^{s−1} (i − t)·d_i + θ_s }, where θ_t is the lowest cost of covering demand from period t onward.
- There is an optimal plan that orders only when stock is zero. After lot sizing, round up to MOQ and multiples.
- With a stock limit per item, use Atamtürk and Küçükyavuz's O(T²) algorithm (B).

**Heuristic alternative.** Boonphakdee et al., Computation 2025 ([paper](https://www.mdpi.com/2079-3197/13/6/148), B): single-item plans, then push quantities later or pull them earlier until warehouse capacity holds. Close to optimal.

**Code.**
- TypeScript: [highs-js](https://github.com/lovasoa/highs-js), the HiGHS solver compiled to WebAssembly with TypeScript declarations (A), so the program runs inside the Hub.
- Python: HiGHS, OR-Tools, Pyomo.
- Wagner–Whitin: `stockpyl.wagner_whitin()` (A).

**Newer work:**
- Deep reinforcement learning on stochastic capacitated lot sizing (van Hezewijk et al., IJPR 2022, B) is near-optimal on small cases but hard to explain.
- Ma, Rossi, Archibald (IJPE 2026, [arXiv 2410.23480](https://arxiv.org/abs/2410.23480), B) offer a heuristic for uncertain demand.
- **Verdict: the explicit program stays the default.**

### M6. A plan suppliers can rely on: time fences, change cost, interpolation

**Time fences.**
- Freezing "up to 50% of the planning horizon has a marginal effect on production and inventory cost". Freezing by order beats freezing by period (Sridharan, Berry, Udayabhanu, Management Science 1987, B).
- Change costs or freezing dominate safety stock as a cure for nervousness (Blackburn, Kropp, Millen 1986, B).
- Under a capacity limit, the longest replanning interval did best, and the frozen share trades service against inventory (Xie, Zhao, Lee, IJPE 2003, [PDF](https://www.mcm.edu.cn/jxie/papers/IJPE2003.pdf), B).

**Proposal for PTI's zones:**
- Firm zone ≥ the supplier's firm lead time. For packaging this is usually the print-and-convert lead time.
- Trade-off zone runs from the end of Firm to the supplier's raw-material lead time.
- Forecast zone beyond that.

This matches the Hub's current rule (Firm = supplier lead time, `forecastConfig.ts:76-83`) and gives the Trade-off zone a physical basis.

**Forecast interpolation** (Godahewa, Bergmeir et al., "On Forecast Stability", IJF 2025, [arXiv 2310.17332](https://arxiv.org/abs/2310.17332), B; approach checked at source). Before publishing, blend each new forecast with the previous version for the same week:
- SF_new(week) = w_s·F_previous(week) + (1 − w_s)·F_new(week), with 0 ≤ w_s ≤ 1.
- The full-interpolation variant blends with the previous *stabilised* forecast instead.
- Tune w_s per zone: high in Trade-off, zero beyond it.
- Code: [rakshitha123/StableForecasting](https://github.com/rakshitha123/StableForecasting) (R; no licence shown, so reimplement rather than copy).

**Newer work:**
- Zanotti 2026 ([arXiv 2506.05776](https://arxiv.org/abs/2506.05776), B): retraining global models less often "preserves but often improves forecast stability". Test retraining about every 8 weeks.
- Van Belle, Wen, Verbeke, Pinson 2026 ([arXiv 2605.28531](https://arxiv.org/abs/2605.28531), B): stabilises *quantile* forecasts "without a substantial loss in forecast quality".
- Schlenkrich et al. 2024 ([arXiv 2402.14506](https://arxiv.org/abs/2402.14506), B): with safety stock in place, deterministic planning dominates stochastic planning.
- **Verdict: extend** the classic time fences with interpolation and less frequent retraining.

### M7. Suppliers who deliver late: safety lead time

**Evidence.** "Utilising a safety lead time results in a higher delivery performance where there is a variable supply." Safety stock suits demand noise with steady lead times (van Kampen, van Donk, van der Zee, IJPR 2010, [record](https://research.rug.nl/en/publications/safety-stock-or-safety-lead-time-coping-with-unreliability-in-dem/), B).

**Proposal:**
- Safety lead time per supplier and material group = the p-quantile of (actual receipt date − confirmed date) over the last N receipts.
- Apply it in M2 step 6.
- Quantity shortfalls stay covered by M3.

**Data.** The Hub already records confirmed dates and goods receipts, which are the inputs.

**Newer work.** No 2022 to 2026 paper found that overturns this. **Verdict: default holds.**

---

## 4. Governance and supplier measures

### G1. How much the published plan changes

**Metrics:**
- **MASC(V)**, vertical change between consecutive versions (Godahewa et al. 2025, B). It is scaled like MASE, so SKUs can be compared:
  - MASC(V) = [(1/(h−1)) Σ_{i=1}^{h−1} |ŷ_{t+i|t} − ŷ_{t+i|t−1}|] / [(1/(t−m−1)) Σ_{i=m+1}^{t−1} |y_i − y_{i−m}|]
- **MASC-I.** The same, but compared with the *first* forecast ever published for that week. It measures total drift since the supplier first saw the week.
- **% schedules changed within the supplier lead time.** SCOR RL.3.27: schedules changed within the supplier's lead time ÷ all schedules generated in the period (SCOR v11, C).
- **Weighted instability**, near-term changes weighted most. I = 100·Σ_i Σ_t W_t·|Q_{i,t}^{new} − Q_{i,t}^{old}| / B, with W_t = e^{1/t} − 1 and B = total planned quantity.
  - Read from Schuster, Unahabhokha, Allen (C), reproducing Sridharan et al. 1988; the original was not read.
  - The same source reports schedule instability "more than doubles" as positive forecast bias rises from 5% to 60%.

**Why it matters.** Terwiesch et al. 2005 (Management Science, B, checked at source): "suppliers penalize buyers for unreliable forecasts by providing lower service levels".
- They measured this with the sum of due-date changes an order went through before becoming firm.
- Each month of due-date change added about a quarter-month of lead time.

**Newer work.** Ma et al. 2026 ([arXiv 2601.10863](https://arxiv.org/abs/2601.10863), B) trained on accuracy plus stability: 15.8% less variance for the same target week, at 3.9% worse one-step error. No newer field study re-tests Terwiesch. **Verdict: default holds**, and the Terwiesch evidence is stated as not re-tested since 2005.

### G2. Bias and the value of planner overrides

**Tracking signal.**
- Trigg's smoothed signal: T_t = smoothed error ÷ smoothed absolute error.
- With β = 0.1, |T_t| > 0.51 flags bias (C, citing Nahmias; SAP uses the same signal, A).
- Simpler cumulative form: Σ(actual − forecast) ÷ MAD.

**Forecast value added across SKUs** (Fildes and Goodwin, IJF 2021, [eprint](https://eprints.lancs.ac.uk/id/eprint/150963/1/Case_study_paper_on_FSS_revised_Jan2021.pdf), B):
- FVA = (1 − AvgRelMAE) × 100%.
- AvgRelMAE is the geometric mean over SKUs of MAE(final) ÷ MAE(statistical).
- Report it by override direction (up or down) and size band.

**Evidence:**
- In a 15-year pharmaceutical case, 62.3% of forecasts were adjusted and only 51.3% of adjustments improved accuracy. Upward adjustments of 50% to 100% had FVA of −26.3%. This confirms Fildes et al. 2009.
- Kesavan, Kushwaha, Steele (Management Science 72(1), 2026, [abstract](https://ideas.repec.org/a/inm/ormnsc/v72y2026i1p119-127.html), B): letting merchants adjust inputs raised profit about 4.92%, and "forecast performance need not translate to profit performance".

**Verdict: extend.**
- Require a reason code on upward overrides.
- Retire any override step with negative FVA over 13 weeks.
- Judge overrides by service outcome (section E), not by accuracy alone.

### G3. Supplier measures and who caused the miss

**Standard definitions (SCOR v11, C):**
- Orders delivered in full ÷ orders delivered (RL.2.1).
- Orders delivered on the original commit date ÷ orders delivered (RL.2.2).
- Customer-initiated changes the supplier accepts "supersede initial commitments and form a new comparative basis".
- For schedule achievement, "over-shipments do not make up for under-shipments" (RL.3.49).

**CFOT definition choice.** A consumer-goods working definition of OTIF is case quantity delivered by the requested date as a share of quantity ordered, with a one-day window (McKinsey for the Consumer Brands Association, 2019, C). PTI's CFOT must state which date it measures against, requested or committed. BL-66 already records differences in the current calculation.

**Proposal: commitment reliability and miss attribution.** For every PO line and forecast period:
- **Commitment reliability** = quantity received on or before the committed date ÷ committed quantity.
- **Buyer-caused miss:** PTI changed the quantity or date inside the supplier lead time, or revised the Trade-off zone beyond the G4 band, and the supplier had not re-confirmed.
- **Supplier-caused miss:** there was no PTI change inside the lead time, the supplier confirmed, and the receipt was short or late against the commitment.
- **Unconfirmed:** the supplier never confirmed. This is the population behind Scheduled Confirmed at 67%.

Report CFOT against both the requested and the committed date. The gap between them is itself the attribution signal.

**Verdict: default holds**, built from SCOR plus Terwiesch.

### G4. The Trade-off tolerance band

**Mechanism.**
- In a quantity-flexibility contract, the buyer commits to at least (1 − α)·F and the supplier guarantees up to (1 + ω)·F.
- The contract "can allocate the costs of market demand uncertainty" to reach the system-wide optimum (Tsay, Management Science 1999, B).
- Tsay and Lovejoy (MSOM 1999, B, abstract via snippet) apply it to rolling schedules: each period's quantity may move at most a set percentage per planning iteration. The Hub's Firm (0%), Trade-off (±10%) and Forecast (open) zones are an instance of this "funnel".

**Decision the owner must make.** Is PTI's 10% per revision, or cumulative from the first version the supplier saw? Per revision can drift 3 × 10% over 3 versions. MASC-I (G1) measures the cumulative case.

**Verdict.** No newer paper replaces this. **10% is a policy choice; no paper derives it as optimal.**

### G5. Publishing the range, not just a number

**Evidence:**
- A buyer can share its forecast credibly through capacity reservation or advance purchase (Özer and Wei, Management Science 2006, B).
- Newer: Lu and Tomlin (Management Science 72(2), 2025, B, abstract via snippet) find that when the buyer shares forecast *accuracy* along with the mean, "credible and informative communication emerges in equilibrium under very general conditions".

**Proposal:**
- Publish P50 and the D5 upper quantile (for example P90) per period in the Trade-off and Forecast zones.
- Ask suppliers to commit at P50 and state their upside capacity up to the upper quantile. The Hub's commitment template already has an upside quantity field (`forecastRules.ts:753`).

**Verdict: extend.**

---

## E. Choosing and monitoring models: judge by service, not accuracy

**Backtest design.** Rolling origin, one origin per weekly Hub publication. Replay the versions suppliers actually saw.
- Horizon = supplier lead time + review period.
- At least 6 monthly origins covering Ramadan and Lebaran and 11.11 (fpp3, A/C; Tashman 2000, B).

**Per origin, per SKU or material, compute:**

| Group | Measure | Definition or source |
|---|---|---|
| Accuracy | MASE | mean\|e\| ÷ mean seasonal-naive in-sample error |
| Accuracy | RMSSE | M5's squared version, from the first non-zero sale |
| Accuracy | WAPE | Σ\|y−ŷ\| ÷ Σ\|y\| |
| Bias | Signed bias | mean(ŷ − y) |
| Bias | Cumulative error | Fix the sign convention in PTI's code: utilsforecast's docstring and code disagree |
| Bias | Trigg T | G2 |
| Range | Scaled pinball loss | D5 |
| Stability | MASC(V) and MASC-I | Against the previous publication (G1) |
| **Service** | Fill proxy and complete-order fill | Replay stock under PTI's ordering policy (method below) |
| **Warehouse** | Simulated average on hand ÷ warehouse capacity | Same replay |

**Service replay method** (Chin, Cheng, Gunawan, "Accuracy Is Not Service", arXiv 2609.13840, 2026, B; figures checked at source; code at [sfcheng-research/icdm-2026-reproduction](https://github.com/sfcheng-research/icdm-2026-reproduction), MIT):
- Order-up-to level S = μ̂(L+R) + z·σ̂·√(L+R), with one shared z, reviewed each period.
- Order max(0, S − inventory position). Orders arrive after lead time L.
- **Fill proxy:** the share of periods with demand that were fully served.
- **Complete-order fill:** an order counts only if every line is filled. This is the analogue of CFOT at PO level.
- **Their finding:** accuracy rank and service rank correlated at −0.555. Correcting bias lifted fill from 77.5% to 92.0%.
- **Their caveat:** they "do not claim the negative correlation transfers to fast-moving demand", and it weakens when each method gets its own cost-optimal z.

**Selection rule (proposal):**
1. Choose the model per SKU group with the best simulated fill and warehouse result, subject to a cap on MASC(V).
2. Use accuracy and bias as diagnostics, not as the selection criterion.
3. D2 is the floor every model must beat.

**Supporting evidence (B):**
- Kourentzes, Trapero, Barrow (IJPE 2020) tuned forecasts on inventory outcomes for 229 household and personal-care SKUs. Accuracy was up to 9% worse, bias up to 62% better, and service hit its target.
- Theodorou, Spiliotis, Assimakopoulos (EJOR 2025, abstract via snippet): when lost-sales cost exceeds holding cost, the best method "may not be the most accurate one".

---

## 5. Build notes

**Portability (Hub now, SOMO later).**
- Write every step as a pure function (inputs in, result out, clock passed in), the same shape as `src/services/transitions/forecastRules.ts`.
- Steps with closed forms port directly to TypeScript: D2, D3, D4, D5 calibration, M1, M2, M3, M6, M7, and all of G.
- **D1 training** runs in Python (mlforecast, LightGBM). Training on a schedule and scoring from a saved model file keeps the engine portable. How to run LightGBM inference inside Node was not checked.
- **M4 and M5 optimisation** runs in HiGHS, which has a WebAssembly build for TypeScript.

**Data the engine needs:**

| Data | Needed for | Status |
|---|---|---|
| 2 to 3 years of weekly sell-in per SKU | D1–D5 | Not in the Hub |
| Price and promotion history, promotion and launch calendar | D1, D6 | Not in the Hub |
| SKU → brand → category map | D1, D4 | Not in the Hub |
| Bills of materials with quantity-per, scrap and yield | M2 | SOMO's formulation master: C8 open decision on identity |
| Item lead times | M2, M6 | Sample values in `forecastConfig.ts:56-64` |
| On-hand stock | M2 | REQ-E08 |
| Open POs at confirmed dates, goods-receipt history | M2, M7, G3 | In the Hub |
| MOQs and multiples | M5 | Not in the Hub |
| Pallet or volume per unit, owned warehouse capacity | M5 | Not in the Hub |
| Holding, ordering and overflow costs | M5 | Not in the Hub |

**Suggested build order (proposal).** Governance first, because it needs no new model and it identifies who causes misses:
1. **Measures the Hub can already compute from its own data:** G1, G3, G4.
2. **Material-side calculation on SAP's forecast:** M2, M3, M7.
3. **Warehouse-aware ordering and plan stability:** M5, M6.
4. **The demand model:** D1 to D6 with E, replacing SAP's forecast as input.
5. **Buffer placement:** M4.

**Documents this reverses.** The owner's 2026-09-23 decision needs 2 updates, which this spec does not make:
- REQ-E06-01 BR-01 says "The hub does not calculate demand" (`SUPPLIER-HUB-REQUIREMENTS.md:1295`).
- C8 §1 rules that SOMO emits the plan and the portal only allocates (`docs/contracts/C8-forecast-publication.md:96-109`).

---

## 6. What I could not verify

- **Written as proposals, not quoted from a source.** These need owner or planner review:
  - the gross-requirement equation with scrap
  - the multi-item warehouse program
  - the change penalty
  - the firm-zone derivation
  - safety lead time as a quantile
  - quantile-based order-up-to
  - the fill-rate recommendation
  - the miss-attribution rules
  - the model selection rule
  - the weekly feature windows
- **Primary papers not read (abstract, search snippet or secondary source only):**
  - Teunter et al. 2011 (TSB typical parameter values)
  - Hu et al. 2019 (curve formulas)
  - M4 and M5 Uncertainty paper texts
  - Tsay and Lovejoy 1999
  - Lu and Tomlin 2025
  - Theodorou et al. 2025
  - Sridharan et al. 1988 (weighted instability, read through Schuster et al.)
  - Kadipasaoglu and Sridharan 1997
  - Humair et al. 2013 and Achkar et al. 2023 (abstracts)
  - Whybark and Williams 1976
  - Ptak and Smith's DDMRP book (formulas read through Microsoft and OCA code)
  - Orlicky and Vollmann originals (MRP from Gardner's open text)
- **Formulas not read at a primary source:**
  - the explicit Tweedie likelihood
  - the SBA factor (1 − α/2)
  - the Wagner–Whitin index form in the stockpyl docs (the first sum may be misprinted)
  - the fill-rate formula with Q in the denominator
- **Chin et al. 2026** is a preprint. Its ICDM 2026 acceptance is stated in its repository and was not confirmed.
- **Godahewa et al.:** the IJF 2025 venue comes from the research pass. The arXiv page I read did not state it.
- **The ±4 tracking-signal limit** appeared only in search snippets and is not used here.
- **VN1 competition findings** come from practitioner write-ups only.

---

## 7. Sources

**A: documentation and code**
- [LightGBM parameters](https://lightgbm.readthedocs.io/en/latest/Parameters.html)
- Nixtla: [statsforecast](https://github.com/Nixtla/statsforecast), [mlforecast](https://nixtlaverse.nixtla.io/mlforecast/), [hierarchicalforecast](https://github.com/Nixtla/hierarchicalforecast), [utilsforecast](https://github.com/Nixtla/utilsforecast)
- [MAPIE](https://mapie.readthedocs.io/en/stable/generated/mapie.regression.TimeSeriesRegressor.html)
- [BayesReconPy](https://github.com/supsi-dacd-isaac/BayesReconPy)
- Competition code: [M4 benchmark code](https://github.com/Mcompetitions/M4-methods), [M5 methods](https://github.com/Mcompetitions/M5-methods)
- [stockpyl](https://github.com/LarrySnyder/stockpyl)
- [highs-js](https://github.com/lovasoa/highs-js)
- DDMRP buffers: [Microsoft DDMRP buffers](https://learn.microsoft.com/en-us/dynamics365/supply-chain/master-planning/planning-optimization/ddmrp-buffer-profile-and-levels), [OCA ddmrp](https://github.com/OCA/ddmrp)
- [Oracle forecast consumption](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25d/faupc/forecast-consumption.html)
- [SAP tracking signal](https://help.sap.com/SAPHELP_SCM700_EHP02/helpdata/EN/47/c4c9f558a53020e10000000a42189d/content.htm)
- Research repositories: [Chin et al. reproduction](https://github.com/sfcheng-research/icdm-2026-reproduction), [StableForecasting](https://github.com/rakshitha123/StableForecasting)

**B: peer-reviewed, competitions, arXiv with results**

*Demand forecasting (D1 to D6)*
- Makridakis et al. 2022 (M5)
- M5 special issue introduction
- Sprangers et al. 2024
- VN2 winner 2026
- Chronos-2 2025
- fev-bench 2025
- Damato et al. 2026
- Kostenko & Hyndman 2006
- Teunter et al. 2011
- Syntetos & Boylan 2005
- Bai & Chu 2025
- Wickramasuriya et al. 2019 (MinT)
- Athanasopoulos et al. 2024
- Gibbs & Candès 2021
- Angelopoulos et al. 2023
- Xu & Xie 2021 (EnbPI)
- Hu et al. 2019
- Trapero et al. 2015
- Hewage et al. 2026

*Material planning and inventory (M1 to M7)*
- Petropoulos et al. 2022
- Saoud et al. 2022
- Trapero et al. 2019
- Babai et al. 2022
- Saldanha et al. 2022
- Eppen & Martin 1988
- Graves & Willems 2000
- Achkar et al. 2023
- Humair et al. 2013
- Wagner & Whitin 1958
- Atamtürk & Küçükyavuz 2005
- Boonphakdee et al. 2025
- van Hezewijk et al. 2022
- Ma, Rossi, Archibald 2026
- Seiringer et al. 2024, 2025, 2026
- Schlenkrich et al. 2024
- Madeka et al. 2022
- JD.com 2025
- Sridharan et al. 1987
- Blackburn et al. 1986
- Xie et al. 2003
- van Kampen et al. 2010

*Governance, supplier measures and evaluation (G, E)*
- Godahewa et al. 2025
- Zanotti 2026
- Van Belle et al. 2026
- Ma et al. 2026
- Terwiesch et al. 2005
- Fildes et al. 2009
- Fildes & Goodwin 2021
- Kesavan et al. 2026
- Tsay 1999
- Tsay & Lovejoy 1999
- Cachon & Lariviere 2001
- Özer & Wei 2006
- Özer, Zheng, Chen 2011 (replicated)
- Lu & Tomlin 2025
- Kourentzes, Trapero, Barrow 2020
- Theodorou et al. 2025
- Chin, Cheng, Gunawan 2026

**C: textbooks, standards, practitioner**
- [fpp3](https://otexts.com/fpp3/)
- [Gardner MRP chapter](https://www.bauer.uh.edu/egardner/3301H%20Operations%20Management/OM%20Text/4MRP-1.pdf)
- [MIT CTL.SC1x safety stock](https://courses.edx.org/asset-v1:MITx+CTL.SC1x_1+2T2015+type@asset+block/KeyConcept_Week7Lesson1.pdf)
- [SCOR v11](https://economia.uniroma2.it/public/ba/files/SCOR11PDF_(1).pdf)
- [McKinsey / Consumer Brands OTIF](https://consumerbrandsassociation.org/wp-content/uploads/2019/02/TPA_Defining-OTIF-in-the-Consumer-Sector.pdf)
- [Gilliland FVA](https://www.sas.com/content/dam/SAS/en_us/doc/whitepaper1/forecast-value-added-analysis-106186.pdf)
- [Schuster et al.](http://web.mit.edu/edmund_w/www/LEC20054-14-05R1.pdf)
- Wikipedia: Bass model, tracking signal, dynamic lot-size model
- VN1 practitioner write-ups
