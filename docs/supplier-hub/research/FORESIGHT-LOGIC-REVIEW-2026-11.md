# Foresight logic review (2026-11): every formula and term, for the Material Planning team

| | |
|---|---|
| Reviewed | GitLab `main` at `eaf82ab0`, rules version `osip-2026-10-28.1`, hub clock 31 Aug 2026 |
| For | Levi, then Septiana and Ary (Material Planning). Each entry ends in one question the team answers with yes, no, or a value |
| Companion | `FORESIGHT-E2E-REVIEW-2026-11.md` (the walk and the findings U-nn, C-nn); `BACKLOG.md` section 4d |
| Materials used as examples | PK-PETB-8801 (PT Sample Packaging Indonesia, share 70%) and RM-STEAR-7300 (PT Sample Specialty Fats) |

## 1. HOW TO READ THIS

1. Sources rank as DRC-D9 and TL-R1 BR-01 set them: (1) the MoM and the team's own material, newest first (the 2026-10-28 answers, then the 2026-10-14 MoM, the OSIP deck, the sheet); (2) the accepted requirement and decision documents; (3) the method spec and the research. The code is never a source.
2. Tags: [Team, date, Qn] the team's answer; [Owner, date, decision] an owner ruling; [Code `path:line`] what runs, relative to `src/`; [Proposed] a reading nobody has confirmed. "Newest wins" when sources disagree, and the disagreement is itself the gap.
3. Each L entry has 8 parts: where shown, what the screen explains, what the code computes, what the newest source says, the gap, the user impact, the recommendation with its alternative, and the question in English and Indonesian.
4. Gap values: **none** (code = newest source, please sign off in section 5), **differs**, **source silent**, **sources conflict**.
5. Every question appears once more in section 4, the list Levi takes to the team; the last column names the open PERTANYAAN (Q-file, 2026-10-16), FOLLOWUP (2026-10-26) or team-answers question it continues.

## 2. FORMULAS

**L-01 · Finished-goods demand forecast and range**
- Shown: Forecast quality, Forecast vs plan (SKU rows, P50/P90); Demand anticipation (DA) grid row "FG demand".
- Screen: "Plan source: material planning uses SAP's finished-goods plan. This page measures the engine's forecast against it."; P90 "a figure sales exceed in about 1 week in 10".
- Code: Comb fallback with the demand-event index per SKU, MinT-shrink reconciliation [Code `services/engine/demandForecast.js:1-50`]; P50/P90 as empirical ratio quantiles per horizon with weekly quantile tracking, step 5% [Code `services/engine/demandRange.js:169-209`]; FG demand on the DA grid = engine gross requirement × supplier share [Code `services/transitions/ltpFgDemandRules.js:134-163`].
- Source: REQ-E14-07 BR-02, REQ-E14-09 BR-02/03 [Owner, 2026-09-29, ENG-B61 to B74, B90 to B99]; DRC-18 [Owner, 2026-10-19].
- Gap: none.
- Impact: none; the figure is read-only beside the LTP.
- Recommendation: keep; the switch to the engine stays with the owner (ENG-B89). Alternative: none.
- Question (EN): Is "FG demand" (the engine's material requirement × your share) the figure you want beside LTP, as A11 asked? (ID): Apakah "FG demand" (kebutuhan material dari mesin × porsi pemasok) angka yang Anda inginkan di samping LTP, sesuai pertanyaan A11?

**L-02 · DA per week and the horizon**
- Shown: DA card and grid; what-if "Demand anticipation (DA), current plan".
- Screen: "Each week of the horizon is the LTP plus any remainder carried into it; the first week also carries the safety order"; "Horizon (lead time) 2 weeks · W36–W37".
- Code: DA(w) = LTP(w) + carried in + safety order in week 1 [Code `services/transitions/osipRules.js:595-686`]; horizon = lead time days ÷ 7 rounded up [Code `osipRules.js:196`, `services/engine/leadTimeSteps.js:91-101`]; no lead time = 4 weeks, flagged [Code `demandAnticipationRules.js:314`]. 14 days → 2 weeks; 45 days → 7.
- Source: DRC-2 BR-01/02 [Owner, 2026-10-16, A3]; [Team, 2026-10-28, A1].
- Gap: source silent on rounding a lead time that is not whole weeks (45 days reads as 7 weeks of DA).
- Impact: a 6.4-week lead time carries a 7th week of DA.
- Recommendation: keep rounding up. Alternative: nearest week.
- Question (EN): Lead time 45 days: is the DA horizon 7 weeks (rounded up) or 6? (ID): Lead time 45 hari: apakah horizon DA 7 minggu (dibulatkan ke atas) atau 6?

**L-03 · LTP per week for a raw material**
- Shown: DA grid row LTP (RM-STEAR-7300 W36 2,520, then 2,940); Capacity "LTP, current forecast".
- Screen: LTP tip: "The current forecast quantity of the material for the week, for this supplier."
- Code: a monthly LTP period is spread evenly over its days and each week takes the days it holds [Code `services/transitions/capacityRules.js:397-406`]; W36 holds one August day and six September days.
- Source: CAP-D11 [Owner, 2026-10-13]; REQ-E06-01 BR-03 (raw material monthly).
- Gap: none.
- Impact: the first week of a month looks like a data error (U-08).
- Recommendation: keep; say so in the LTP definition (BL-246). Alternative: give the whole month's LTP to the week its first Monday falls in.
- Question (EN): A monthly raw-material LTP is spread evenly over the month's days; is that how you read a month's LTP into weeks? (ID): LTP bahan baku bulanan dibagi rata per hari dalam bulan itu; apakah begitu cara Anda membaca LTP bulanan ke minggu?

**L-04 · Recorded consumption and its split**
- Shown: DA tab "Record consumption"; grid rows "Recorded consumption" and "Moving average consumption".
- Screen: "A material's consumption is shared across its suppliers by their share of the material's LTP"; "Recorded consumption of the last 13 weeks ÷ the weeks with a record, × the supplier's share".
- Code: record per material × week, latest wins; split by LTP share over the 4-week share window [Code `services/transitions/consumptionRules.js:134-140`, `demandAnticipationRules.js:97-106`]; moving average over the 13 weeks ending at the week, weeks without a record left out [Code `ltpFgDemandRules.js:73-93`]. No consumption is recorded on the sample, so every ROP Fisik demand uses the NPD branch.
- Source: CAP-D14 [Owner, 2026-10-13]; DRC-D21 [Owner, 2026-10-19]; [Team, 2026-10-28, A11].
- Gap: none.
- Impact: none until the goods-issue feed exists.
- Recommendation: keep. Alternative: split by that week's DA (CAP-D14, kept as a variant).
- Question (EN): Consumption = goods issue 261 per material and week; is sharing it across suppliers by their LTP share right? (ID): Konsumsi = goods issue 261 per material per minggu; apakah pembagiannya ke pemasok menurut porsi LTP sudah benar?

**L-05 · Carry-over and its limit**
- Shown: DA card "remainder 4,300 · 4,300 carried to W37"; publish dialog; DA history.
- Screen: "Remainder = DA − the week's call-offs. It moves to the last week of the horizon, or to the first week outside it when the supplier agreed."
- Code: remainder = DA(week 1) − released call-offs, carried to the last horizon week or outside with the recorded agreement; the limit is never applied (no sales-order quantity per pair, flagged) [Code `osipRules.js:595-686`, `demandAnticipationRules.js:339`, DRC-B16]; a carry counts from the next planning week (DRC-B22).
- Source: DRC-2 BR-03/04 [Owner, 2026-10-16, A8]; A8b [Default].
- Gap: source silent (A8b blank).
- Impact: no limit caps a carry.
- Recommendation: keep the unit, ask for the value. Alternative: a count of carries.
- Question (EN): The carry-over limit "last 4 weeks of sales orders": which quantity per supplier × material, and who maintains it? (ID): Batas carry-over "4 minggu terakhir sales order": kuantitas mana per pemasok × material, dan siapa yang memeliharanya?

**L-06 · Supply gap and carry-forward**
- Shown: What to order "Below demand anticipation (DA)" (RM-EMUL-9410 W39: DA 980, open supply 0, gap 940); DA grid rows "Open supply", "Gap".
- Screen: "Supply above a week's demand anticipation counts against the next weeks' gaps, never an earlier week's"; gap tip "max(0, DA − (open supply + supply carried from earlier weeks))".
- Code: open supply = released call-offs by need-date week; gap carried forward only, within the horizon [Code `services/transitions/supplyBelowDemandRules.js:87-108`]; proposals walk the oldest blanket line first, then "New PO needed" [Code `:181-212`].
- Source: CAP-12 [Owner, 2026-10-13, CAP-D15]; BL-228 CAP-D18 to D21 [Owner, 2026-10-27].
- Gap: none.
- Impact: none.
- Recommendation: keep. Alternative: per-week gap without carry.
- Question (EN): A call-off of 2,000 in W37 against a DA of 980 covers W38 as well; is that right, and how many weeks forward may it cover? (ID): Call-off 2.000 di W37 untuk DA 980 ikut menutup W38; apakah benar, dan sampai berapa minggu ke depan boleh dipakai? (continues FOLLOWUP B1)

**L-07 · Plan vs execution check, OSPO, Additional PO and PR**
- Shown: DA card (PK-PETB-8801: Total DA 73,600, Total OSPO 122,000, gap −48,400; RM-STEAR-7300: "PR 5,197" beside "recommend a PR of 6,097").
- Screen: "Supply above the total is absorbed in the last week."
- Code: gap = Total DA − Total OSPO; a surplus cuts the last week's DA to 0 at most [Code `osipRules.js:689-717`]; OSPO starts from the whole blanket balance [Code `demandAnticipationRules.js:349-353`]; PR generated [Code `osipRules.js:273`].
- Source: [Team, 2026-10-28, A2]; [Owner, 2026-10-16, A4]; A9 [Default].
- Gap: sources conflict: a blanket balance exceeds a 2-week DA, so W37's DA is zeroed (C-04) while CAP-9 says it runs out in W36 (C-05); two PR figures (U-17).
- Impact: DA 0 against a Firm 34,300.
- Recommendation: count as OSPO only what the horizon can call off.
- Question (EN): Is OSPO the whole blanket balance or only this horizon's PO, and may a surplus cut a week's DA below its LTP? (ID): Apakah OSPO seluruh sisa PO induk atau hanya PO horizon ini, dan bolehkah kelebihan menurunkan DA di bawah LTP? (A9; team answers 4 Q1)

**L-08 · Material requirement, gross to net, and which safety figure nets it**
- Shown: What to order "Why this quantity" (PK-PETB-8801 W51: gross 9,897 + safety stock 16,404 − stock 20,545 = net 5,756); Material requirement.
- Screen: "Safety stock 16,404 · Reorder point 56,935"; Safety stock targets: "The OSIP figures are the default rule … the challenger."
- Code: NR = max(0, GR + SS − (POH + SR)), SS the engine's fill-rate safety stock [Code `services/engine/requirement.js:453-525`, `safetyStock.js:192-219`, `services/data/mock/MockProcurementService.js:385`].
- Source: REQ-E14-03 BR-04; REQ-E14-04 amendment [Owner, 2026-10-19]: OSIP default, fill-rate challenger.
- Gap: sources conflict: the netting adds the challenger; none says what nets the requirement.
- Impact: every recommended order is sized on the challenger (C-02).
- Recommendation: the OSIP safety order nets What to order [Owner, 2026-11-03, FSR-D1]; the team confirms. Alternative: the engine figure, labelled "challenger".
- Question (EN): Which safety figure does PTI's net requirement add: the engine's (16,404), Safety ROP Fisik (6,000), the safety order (5,000), or none? (ID): Angka pengaman mana yang ditambahkan ke kebutuhan bersih PTI: mesin (16.404), Safety ROP Fisik (6.000), safety order (5.000), atau tidak ada?

**L-09 · Safety order**
- Shown: Safety stock targets "Safety order" (PK-PETB-8801 5,000; RM-STEAR-7300 950); DA grid; sandbox.
- Screen: tip "Z × √lead time × standard deviation of the LTP over the next 13 weeks, rounded up to a multiple of the MPQ. Z is 1.65 unless set per material."
- Code: z × √(whole weeks) × sample SD of the next 13 weeks' LTP, rounded up to the order multiple as MPQ [Code `osipRules.js:220-262`, `demandAnticipationRules.js:321-333`, DRC-B2, B15]; Z per material [Code `osipParams.js:176-183`].
- Source: [Team, 2026-10-28, B2, B3]; B4 [Default, blank]; DRC-7 BR-01.
- Gap: source silent on the rounding unit (B4) and on whole weeks under the root.
- Impact: the rounding sets the whole week-1 DA.
- Recommendation: keep MPQ and the sample SD. Alternative: koli or MOQ.
- Question (EN): Safety order rounds up to a multiple of the MPQ, and √lead time uses whole weeks (14 days → √2): confirm both? (ID): Safety order dibulatkan ke atas ke kelipatan MPQ, dan √lead time memakai minggu bulat (14 hari → √2): benar keduanya? (continues PERTANYAAN B4)

**L-10 · Safety ROP Fisik**
- Shown: Safety stock targets "Safety ROP Fisik" (PK-PETB-8801 6,000; RM-STEAR-7300 425).
- Screen: "ROP Fisik safety = 1 day × the lowest of the highest daily consumption of the last 3 months and the daily LTP, rounded up to the MPQ."
- Code: CEILING(g × min(a, c), MPQ), capacity left out; a = highest week of the last 13 ÷ 7, c = mean weekly LTP ÷ 7; NPD: next 13 weeks' highest LTP ÷ 7 [Code `osipRules.js:335-371`, `osipSafetyRules.js:237-302`].
- Source: PPT 11 [Default B1]; [Team, 2026-10-28, B5, B7].
- Gap: sources conflict (B1 unanswered); silent on the daily reading of a.
- Impact: ROP Fisik, Max and the trigger rest on it.
- Recommendation: keep the deck formula. Alternative: the sheet formula.
- Question (EN): Safety ROP Fisik = g × min(a, b, c) rounded to the MPQ, with a = the highest week of the last 13 ÷ 7? (ID): Safety ROP Fisik = g × min(a, b, c) dibulatkan ke MPQ, dengan a = minggu tertinggi dari 13 minggu terakhir ÷ 7? (continues PERTANYAAN B1)

**L-11 · ROP Fisik by level**
- Shown: Safety stock targets "ROP Fisik" (12,000; 1,275); sandbox.
- Screen: "levels 3 and 4 = the daily demand × f rounded up to the MPQ, + safety; … level 6 (JIT) = 1 day of LTP rounded up to a pallet, no safety."
- Code: CEILING(demand per day × f, MPQ) + safety; MDQ = MOQ for level 5; level 6 = CEILING(daily LTP, pallet); [Code `osipRules.js:389-407`, `osipRopRules.js:231-277`].
- Source: DRC-10 [PPT 11] "ceiling(demand × f) × MPQ + safety"; [Team, 2026-10-28, B5, B6]; level 6 held.
- Gap: differs in wording (the deck's "× MPQ" read as rounding, DRC-B3); level 6 unconfirmed.
- Impact: read literally, the deck multiplies by the MPQ twice.
- Recommendation: keep DRC-B3. Alternative: the literal product.
- Question (EN): Is "ceiling(demand × f) × MPQ" the f-day demand rounded up to the MPQ, and for level 6 which demand replaces LTP? (ID): Apakah "ceiling(demand × f) × MPQ" berarti permintaan f hari dibulatkan ke atas ke MPQ, dan untuk level 6 permintaan apa yang menggantikan LTP? (continues team answers 4 Q6)

**L-12 · ROP Order**
- Shown: Safety stock targets "ROP Order" (73,600; 21,097); DA card "ROP Order 73,600 (cycle stock 68,600 + safety order 5,000)".
- Screen: tip "LTP × lead time PO→ETA + safety order"; page: "ROP Order = cycle stock (the LTP over the lead time) + safety order: the input to ZPE007, which the hub does not run."
- Code: Σ LTP over the horizon weeks + safety order [Code `osipRules.js:208-215`, `:263`].
- Source: [Default B9], PPT 7 (516,992 + 244,896 = 761,888, a sum over weeks).
- Gap: none (the tip's product equals the sum for a flat LTP; PPT 7 sums).
- Impact: none.
- Recommendation: keep; make the tip say "the LTP summed over the lead-time weeks". Alternative: none.
- Question (EN): ROP Order = the LTP summed over the lead-time weeks + safety order, as PPT 7 does: confirm? (ID): ROP Order = jumlah LTP selama minggu-minggu lead time + safety order, seperti PPT 7: benar? (continues PERTANYAAN B9)

**L-13 · ROP Supplier and ROP order to principal**
- Shown: Safety stock targets row detail ("Not available: no bottleneck production lead time set"; "no order-to-principal lead time on this route").
- Screen: "ROP Supplier is the supplier's physical maximum stock: the ROP Fisik demand times its bottleneck production lead time, queueing included, rounded up to the MPQ."
- Code: CEILING(demand per day × bottleneck days, MPQ), no default, planner-set; ROP to principal = CEILING(demand per day × order-to-principal days, MPQ), imported raw-material route only [Code `osipRopRules.js:307-332`, DRC-B31, B51].
- Source: [Team, 2026-10-28, B10]; ROP to principal unanswered.
- Gap: source silent on the rounding and on ROP to principal.
- Impact: the supplier-below-ROP alert stays quiet until the lead time is typed.
- Recommendation: keep the rounding. Alternative: none.
- Question (EN): ROP Supplier = demand × bottleneck production lead time, rounded up to the MPQ: right, and what is ROP order to principal? (ID): ROP Supplier = demand × bottleneck production lead time, dibulatkan ke atas ke MPQ: benar, dan apa itu ROP order to principal? (continues team answers 4 Q4)

**L-14 · Max Stock**
- Shown: Safety stock targets "Max Stock" (15,200; 1,400); sandbox.
- Screen: "Max = ROP Fisik rounded up to a koli (units per pallet) for a local supplier, or to the MOQ for an import. It caps call-offs only."
- Code: deck variant CEILING(ROP Fisik, koli or MOQ by supply area); sheet variant kept [Code `osipRules.js:419-440`]; a minimum delivery that does not fit is called off anyway, flagged [Owner, 2026-10-28, BL-230].
- Source: PPT 11 [Default B8]; [Owner, 2026-10-16, A7]; BL-230.
- Gap: source silent (B8 blank: koli = pallet or pack size).
- Impact: Max and every trigger call-off round to the same unit.
- Recommendation: keep pallet for "Non stc", pack size for "stc". Alternative: ROP + cycle stock.
- Question (EN): Max = ROP Fisik rounded up to the koli (pallet for non-sticker, pack size for sticker) locally and to the MOQ for imports: confirm? (ID): Max = ROP Fisik dibulatkan ke atas ke koli (palet untuk non-stc, pack size untuk stc) lokal dan ke MOQ untuk impor: benar? (continues PERTANYAAN B8)

**L-15 · Call-off trigger: quantity, re-arm and call-offs per drop**
- Shown: what-if "Call-offs the trigger would draft 22,800", "Trigger: create a PR in SAP for 0", projected SOH −24,095 … −746,093.
- Screen: "what no open PO covers is a PR recommendation."
- Code: at SOH ≤ ROP Fisik one draft = the minimum delivery rounded like Max [Code `callOffTriggerRules.js:342-401`]; re-arms only once SOH is above ROP Fisik [Code `:534-546`, DRC-B37; `whatIfSandboxRules.js:701-725`]. No second call-off or PR follows.
- Source: DRC-13 BR-01/04 [Owner, 2026-10-16, F2]; [Team, 2026-10-28, F5].
- Gap: source silent on the re-arm and on call-offs per drop.
- Impact: a 22-week shortage, "PR 0" (U-01).
- Recommendation: re-arm on every check while at or below ROP Fisik [Owner, 2026-11-03, FSR-D6, supersedes DRC-B37; BL-261]; the team confirms. Alternative: DRC-B37.
- Question (EN): Does the next call-off fire only once stock rises above ROP Fisik again, or on every check while it stays at or below? (ID): Apakah call-off berikutnya dibuat hanya setelah stok naik lagi di atas ROP Fisik, atau pada setiap pemeriksaan selama stok tetap di/di bawahnya? (continues PERTANYAAN F2)

**L-16 · Order sizing (MOQ, multiple, warehouse space)**
- Shown: What to order "Recommended orders" (PK-PETB-8801 W51 20,000 "Ordering against holding cost · Rp 36.779 less than 35,000"; W53 42,000).
- Screen: "Each order with the constraint that bound it and the cost it saved"; "Minimum order quantity 6,000 · Order multiple 1,000 · Warehouse space used 5.3 pallets".
- Code: per-material dynamic program plus coordinate descent across the warehouse; MOQ, multiple, rented space under a 25% cap [Code `services/engine/orderSizing.js:274-342`, `:531-615`, ENG-B14, B55].
- Source: REQ-E14-05 BR-01/02 [Owner, 2026-09-23, ENG-D6, D7]; lots are not published, DA carries the LTP (ENG-B29).
- Gap: none.
- Impact: none.
- Recommendation: keep. Alternative: the interim round-up (101 orders instead of 65).
- Question (EN): The recommended order is the engine's lot (MOQ, multiple, warehouse space) and becomes a call-off, while the DA sent to the supplier carries the LTP: is that the split you expect? (ID): Pesanan yang disarankan adalah lot dari mesin (MOQ, kelipatan, ruang gudang) dan menjadi call-off, sedangkan DA ke pemasok memuat LTP: apakah pembagian ini sesuai harapan Anda?

**L-17 · Reschedule proposal**
- Shown: Make warehouse room (PK-PETB-8801 SYN-PO-00231/40, 12,000 due 19 Sept → 18 Jan 2027, "Needed from W3").
- Screen: "Ranked by net saving: the rented space it saves in weeks over capacity, less the change penalty … Proposals inside the supplier's lead time or its Firm zone come last and need the supplier's agreement."
- Code: need week = first week projected stock without the line falls below safety stock; reschedule out when due ≥ 1 week before it; zones by days ahead [Code `services/engine/reschedule.js:313-366`].
- Source: REQ-E14-13 BR-02 to BR-06 [Owner, 2026-09-24, ENG-D15 to D17].
- Gap: none.
- Impact: none; the need date comes from the engine stock (C-01).
- Recommendation: keep. Alternative: none.
- Question (EN): A PO line due 19 Sept that the engine says is not needed before W3 2027 is proposed to move to January; is "needed from" the right test for moving a line? (ID): Baris PO jatuh tempo 19 Sep yang menurut mesin belum dibutuhkan sebelum W3 2027 diusulkan dipindah ke Januari; apakah "dibutuhkan mulai" ukuran yang tepat untuk memindahkan baris?

**L-18 · Plan stability and change cost**
- Shown: Publish to suppliers (MASC 0.176 → 0.175; "Trade-off — held at ±10% a version 2"); Make warehouse room "Change cost".
- Screen: "each week is damped (weight × last value + the rest × new value) and may move at most ±10% from the last published value and ±20% from the first".
- Code: damped = w × previous + (1 − w) × new, w 50% Trade-off, 0 Forecast; band ±10% a version, ±20% from the value when the week entered Trade-off [Code `services/engine/stabilise.js:167-253`, ENG-B31]; MASC [Code `reliability.js:430-471`]; change penalty per pallet inside the lead time [Code `orderSizing.js:223`].
- Source: REQ-E14-06 BR-04/05 [Owner, 2026-09-23, ENG-D8, D8a, D9].
- Gap: none.
- Impact: none.
- Recommendation: keep. Alternative: none.
- Question (EN): A Trade-off week may move ±10% a version and ±20% from the first value the supplier committed against, damped 50/50: confirm for your suppliers? (ID): Minggu Trade-off boleh bergeser ±10% per versi dan ±20% dari nilai pertama yang dikomitmenkan pemasok, diredam 50/50: benar untuk pemasok Anda?

**L-19 · Bias and tracking signal**
- Shown: Forecast quality, Bias and overrides (PK-PETB-8801 material +0.51 "Bias alarm · runs low").
- Screen: "0 = no bias; beyond ±0.51 the forecast is flagged as biased."
- Code: Trigg signal, α 0.1, alarm above 0.51 after at least 13 counted weeks [Code `services/engine/forecastBias.js:46-91`].
- Source: REQ-E14-11 BR-01 [Owner, 2026-09-29, ENG-B101].
- Gap: none.
- Impact: none.
- Recommendation: keep. Alternative: none.
- Question (EN): Bias alarm at |tracking signal| > 0.51 with weight 0.1, after 13 weeks: confirm? (ID): Alarm bias pada |tracking signal| > 0,51 dengan bobot 0,1, setelah 13 minggu: benar?

**L-20 · Supplier reliability measures and CFOT**
- Shown: Supplier reliability (sup-007: confirmation rate 88%, commitment reliability 63%, CFOT by PO line 46%); supplier "Your reliability" (same); Supplier performance (CFOT, by PO 40%).
- Screen: "Confirmed by the deadline …; Delivered as committed …; Confirmed-date lines delivered …".
- Code: lines confirmed by the deadline ÷ lines due; quantity received by the committed date ÷ committed; one miss class per line [Code `services/engine/reliability.js:200-412`]; CFOT by PO line = mean of per-PO rates [Code `cfot.js:127-175`]; CFOT by PO = Σ on time ÷ Σ ordered over 90 days [Code `services/data/performanceRules.js:228-307`]; both use the 7-day early window.
- Source: REQ-E14-02 BR-01 to BR-06; KPI-1 to KPI-4, KPI-2 amended [Owner, 2026-11-02] (BL-234 open); TL-D34.
- Gap: none.
- Impact: none.
- Recommendation: keep both, named by basis. Alternative: one CFOT.
- Question (EN): Two CFOTs, by PO line (26 weeks) and by PO (90 days): do you want both, or one? (ID): Dua CFOT, per baris PO (26 minggu) dan per PO (90 hari): keduanya, atau satu?

**L-21 · Capacity gap**
- Shown: Capacity (both personas): "LTP against capacity", "Short by 12,800" (sup-007 W38), "Cannot be supplied".
- Screen: "Above your capacity it needs the additional capacity; above BE (capacity + additional capacity) it cannot be supplied."
- Code: within when LTP ≤ allocated; needs additional when ≤ BE; cannot supply above BE; short by = LTP − allocated [Code `services/transitions/capacityRules.js:322-336`].
- Source: CAP-3 [Owner, 2026-10-12, CAP-D1]; ENG-D18 [team review, 2026-09-28].
- Gap: none.
- Impact: none.
- Recommendation: keep. Alternative: none.
- Question (EN): "Short by" = LTP − allocated capacity (not LTP − BE): confirm? (ID): "Kurang" = LTP − kapasitas yang dialokasikan (bukan LTP − BE): benar?

**L-22 · Strategic and protection buffers**
- Shown: Capacity "Strategic buffer, festive windows" (PK-PETB-8801 2027-02: LTP 137,200, baseline 150,266.67, buffer 0); "Protection buffer, OSIP levels 5 to 7".
- Screen: "Strategic buffer = LTP − baseline, the baseline the average LTP of the 3 months before the festive window; never below 0. Read only."
- Code: baseline = mean monthly LTP of the 3 months before Ramadan; buffer = max(0, LTP − baseline) [Code `services/transitions/drcBufferRules.js:282-319`, `osipRules.js:514-517`]; protection = CEILING(max(0, LTP − 3-month average), production MPQ), display only [Code `drcBufferRules.js:392-520`, BL-205].
- Source: PPT 12 [Default C4]; C3, C4 "TBC" [Team, 2026-10-28].
- Gap: source silent.
- Impact: none; read only.
- Recommendation: keep as display. Alternative: feed ROP Fisik or Max.
- Question (EN): Strategic buffer = festive-month LTP − average LTP of the 3 months before: right, and should it feed ROP Fisik or Max? (ID): Strategic buffer = LTP bulan festive − rata-rata LTP 3 bulan sebelumnya: benar, dan apakah masuk ke ROP Fisik atau Max? (continues PERTANYAAN C3, C4)

**L-23 · What-if sandbox versus the live plan**
- Shown: what-if "Against the current plan" (identical figures to the Safety stock and DA pages at zero changes).
- Screen: "Change the inputs of one material and see what the live plan's own rules make of them."
- Code: the same functions (`rollingDaFigure`, `osipSafety`, `osipRops`, `allocateCallOffs`) on the scenario's inputs; the week loop and the per-pair trigger are the sandbox's own [Code `whatIfSandboxRules.js:549-770`, DRC-B42, B43].
- Source: DRC-17 [Owner, 2026-10-16].
- Gap: none in the formulas; the display mixes before- and after-check totals (U-10).
- Impact: none.
- Recommendation: keep. Alternative: none.
- Question (EN): In the sandbox a call-off arrives f days after the trigger, approved; is that the projection you want to test your numbers on? (ID): Di sandbox, call-off tiba f hari setelah pemicu, dianggap disetujui; apakah proyeksi seperti itu yang Anda inginkan untuk menguji angka Anda?

**L-24 · Feedstock reconcile remainder**
- Shown: Feedstock reconcile, both personas (sup-007 PK-PETB-8801: PO ordered 470,000, called off 208,000, not yet called off 262,000 "Liability, not priced … Proposed: awaiting owner review (BL-207)").
- Screen: "of what is not yet called off, the part up to the max stock is flagged as a liability, not priced … With no max stock agreed, the whole remainder is flagged."
- Code: not yet called off = PO ordered − called off; leftover rule `flagLiability`, capped at the supplier's max stock [Code `services/transitions/feedstockReconcile.js:70-110`].
- Source: DRC-15a BR-02 "shown only" [Owner, 2026-10-16, F4]; DRC-15b proposal (BL-207); F3 unanswered.
- Gap: source silent ("discussed later").
- Impact: the supplier reads a liability nobody ruled (U-18).
- Recommendation: show the remainder only to suppliers until ruled. Alternative: carry it into the next PO.
- Question (EN): At PO end, the quantity ordered but never called off: PTI's liability, carried into the next PO, or nothing? (ID): Di akhir PO, kuantitas yang dipesan tetapi tidak pernah di-call-off: liabilitas PTI, dibawa ke PO berikutnya, atau tidak ada? (continues PERTANYAAN F3)

**L-25 · Demand CV**
- Shown: Safety stock targets "Demand CV" (PK-PETB-8801 0.17 Stable; RM-STEAR-7300 0.1); row detail "Suggested: level 4 (Periodic Review), because CV 0.17 is below 0.5".
- Screen: "CV = standard deviation ÷ average of each finished good's monthly demand over the last 6 full calendar months … Stable below 0.5."
- Code: 6 full calendar months, weeks spread by day, sample SD ÷ mean per SKU, demand-weighted per component; threshold 0.5 [Code `osipRules.js:447-511`, `osipSafetyRules.js:364-409`].
- Source: [Team, 2026-10-28, C1].
- Gap: none.
- Impact: none; every sample material reads stable.
- Recommendation: keep. Alternative: 26 weekly buckets.
- Question (EN): CV on the last 6 full calendar months, threshold 0.5, per finished-good variant: confirm? (ID): CV atas 6 bulan kalender penuh terakhir, ambang 0,5, per varian barang jadi: benar?

**L-26 · Lead time by step and the DA horizon**
- Shown: Material requirement "Lead time by step: Local · 2 weeks · Machine queue 4 · Production 7 · Delivery 3"; RM-STEAR-7300 "Local · 7 weeks · 11 + 23 + 11".
- Screen: as above; the DA card "Horizon (lead time) 2 weeks".
- Code: total = Σ step days; horizon weeks = total ÷ 7 rounded up [Code `services/engine/leadTimeSteps.js:75-101`]; sample splits keep each source's existing total (DRC-B9).
- Source: DRC-6 [XLS Guidance].
- Gap: none.
- Impact: none.
- Recommendation: keep. Alternative: none.
- Question (EN): Local lead time = machine queue + production + delivery; import adds ordering material and shipment; imported raw material adds order to principal: confirm the steps? (ID): Lead time lokal = antrean mesin + produksi + pengiriman; impor menambah pemesanan material dan shipment; bahan baku impor menambah order ke prinsipal: apakah tahapannya benar?

## 3. WORDING

| ID | Term | Where used | Usages found | Source wording | Problem | [Proposed] fix | Question (EN / ID) |
|---|---|---|---|---|---|---|---|
| W-01 | Safety order; Safety ROP Fisik; Z and g | Safety stock targets "How it is calculated" | "Safety order (ROP Order) = 1.65 × …"; "ROP Fisik safety = 1 day × …" | TL-D20, TL-D21, TL-D15; Z, g per material [Team, 2026-10-28, B3, B7] | The form TL-D15 ruled against; 1.65 and 1 day fixed | "Safety order = Z × √lead time × …", "Safety ROP Fisik = g × …" (sentences, TL-D33) | Is "Safety order" alone the name, never with ROP Order in brackets? / Apakah "Safety order" saja namanya, tanpa ROP Order dalam kurung? |
| W-02 | Confirmation rate; Commitment reliability; CFOT, by PO line | Supplier reliability "How these are calculated"; supplier "Your reliability" | "Confirmed by the deadline …", "Delivered as committed …", "Confirmed-date lines delivered …" (`/buyer/reliability`; ID "Dikonfirmasi sebelum tenggat", "Dikirim sesuai komitmen", "Baris tepat tanggal konfirmasi") | Labels per TL-D31 and TL-D34 | The explanations open with names no label carries | Open each explanation with its label (sentences, TL-D33) | Are "Confirmation rate", "Commitment reliability" and "CFOT, by PO line" the names you use? / Apakah "Confirmation rate", "Commitment reliability" dan "CFOT, by PO line" nama yang Anda pakai? |
| W-03 | Firm, Trade-off, Forecast (zones) in ID | Foresight commitments (both personas) vs Publish to suppliers and the glossary | ID "Pasti / Kompromi / Prakiraan" (`lib/i18n/forecastCollaboration.js:310-311`) against "Firm / Trade-off / Forecast" on `/buyer/stabilise` (ID) and in the glossary | TL-D11 keeps Firm in English; F-20 question 6 | One zone, two Indonesian names | Keep the English on the commitment pages | "Firm / Trade-off / Forecast" or "Pasti / Kompromi / Prakiraan"? / Zona: "Firm / Trade-off / Forecast" atau "Pasti / Kompromi / Prakiraan"? |
| W-04 | Call-off in ID | DA card (ID) | "Panggilan W36 · 0 dipanggil" (`/buyer/demand-anticipation`, ID) against "Call-off", "di-call-off" on Call-offs and Feedstock reconcile | TL-D11 lists call-off as a term kept in English | Two Indonesian forms for one term | "Call-off W36 · 0 di-call-off" (apply TL-D17; backlog BL-256) | Is "call-off" the word you use in Indonesian too, never "panggilan"? / Apakah "call-off" juga kata yang Anda pakai dalam bahasa Indonesia, bukan "panggilan"? |
| W-05 | Cycle stock, Max, ROP Supplier, ROP order to principal, Strategic buffer, Protection buffer in ID | Safety stock targets and Capacity sentences (ID) | "stok siklus", "Maks", "ROP Pemasok dan ROP ke prinsipal", "Buffer strategis", "Buffer proteksi" while the labels keep the English (TL-D12, TL-D22, TL-D11) | TL-D11, TL-D17 | Sentences translate what the labels keep | Apply TL-D17 to the OSIP sentences (BL-256) | "Cycle stock" and "Max" in Indonesian text, or "stok siklus" and "Maks"? / Dalam teks Indonesia: "cycle stock" dan "Max", atau "stok siklus" dan "Maks"? |
| W-06 | Total DA | DA card "Total demand anticipation"; sandbox "Demand anticipation (DA) over the lead time"; glossary "Also called: Total DA" | Three forms for one figure (`/buyer/demand-anticipation`, `/buyer/what-if`, `lib/glossary/termLabels.glossary.js` daOverLeadTime) | Q-file A2 and PPT 7: "Total DA" | The team's word is the one form the screen never leads with | Label both "Total DA", keep the long form in the tip | Is "Total DA" the name for the DA summed over the lead time? / Apakah "Total DA" nama untuk DA yang dijumlahkan sepanjang lead time? |
| W-07 | Incoming | Sandbox grid row "Incoming" (call-offs arriving); Inventory "Incoming" (stock in transit, TL-D12 "Not Incoming DA") | `/buyer/what-if` row "Incoming · PCS 35,000 15,200 7,600"; `/buyer/inventory` column "Incoming" | TL-D12 kept "Incoming" for stock; the Q-file uses "incoming DA" for the DA figure | One word, three PTI meanings (arriving call-offs, in-transit stock, incoming DA) | Name the sandbox row "Call-offs arriving" | Which word do you use for call-offs that arrive in a week: "incoming", or something else? / Kata apa yang Anda pakai untuk call-off yang tiba dalam satu minggu: "incoming", atau yang lain? |

## 4. QUESTION LIST

Rows 8 (L-08) and 15 (L-15) were ruled by the owner on 2026-11-03 (FSR-D1, FSR-D6 in `DECISION-GUIDE.md`) and stay here as confirmations: the team's answer either confirms the ruling or flips it.

| # | ID | Question (EN) | Pertanyaan (ID) | If yes | If no | Continues |
|---|---|---|---|---|---|---|
| 1 | L-01 | Is "FG demand" (engine material requirement × your share) the figure you want beside LTP, as A11 asked? | Apakah "FG demand" (kebutuhan material mesin × porsi pemasok) angka yang Anda inginkan di samping LTP, sesuai A11? | Row stays | Row changes to the figure named | A11 |
| 2 | L-02 | Lead time 45 days: is the DA horizon 7 weeks (rounded up) or 6? | Lead time 45 hari: horizon DA 7 minggu (dibulatkan ke atas) atau 6? | Nothing | `horizonWeeksOf` rounds to nearest | A3 |
| 3 | L-03 | A monthly raw-material LTP is spread evenly over the month's days: is that how you read it into weeks? | LTP bahan baku bulanan dibagi rata per hari: begitukah Anda membacanya ke minggu? | Nothing | `groupWeekLtp` assigns whole months | — |
| 4 | L-04 | Consumption = goods issue 261 per material and week, shared by LTP share: right? | Konsumsi = goods issue 261 per material per minggu, dibagi menurut porsi LTP: benar? | Nothing | `consumptionSplit` variant changes | A11, B5 |
| 5 | L-05 | The carry-over limit "last 4 weeks of sales orders": which quantity per supplier × material, and who maintains it? | Batas carry-over "4 minggu terakhir sales order": kuantitas mana per pemasok × material, dan siapa yang memeliharanya? | A value: the limit is applied | Limit stays unapplied | A8b |
| 6 | L-06 | A 2,000 call-off in W37 against DA 980 covers W38 too: right, and how many weeks forward? | Call-off 2.000 di W37 untuk DA 980 ikut menutup W38: benar, dan sampai berapa minggu? | Nothing (add a cap if a number is given) | Per-week gap without carry | FOLLOWUP B1 |
| 7 | L-07 | Is OSPO the whole blanket balance or only this horizon's PO, and may a surplus cut a week's DA below its LTP? | Apakah OSPO seluruh sisa PO induk atau hanya PO horizon ini, dan bolehkah kelebihan menurunkan DA di bawah LTP? | Whole balance: nothing changes | OSPO capped per horizon; absorption no longer zeroes W37 | A9, team answers 4 Q1 |
| 8 | L-08 | Which safety figure does PTI's net requirement add: the engine's (16,404), Safety ROP Fisik (6,000), the safety order (5,000), or none? | Angka pengaman mana yang ditambahkan ke kebutuhan bersih PTI: mesin (16.404), Safety ROP Fisik (6.000), safety order (5.000), atau tidak ada? | Engine: label the panel "challenger" | Netting switches to the figure named; every recommended order moves | — |
| 9 | L-09 | Safety order rounds up to the MPQ and √lead time uses whole weeks: confirm both? | Safety order dibulatkan ke MPQ dan √lead time memakai minggu bulat: benar keduanya? | Provisional label drops | `safetyRounding` or the root's input changes | B4 |
| 10 | L-10 | Safety ROP Fisik = g × min(a, b, c) rounded to the MPQ, with a = the highest week of the last 13 ÷ 7? | Safety ROP Fisik = g × min(a, b, c) dibulatkan ke MPQ, dengan a = minggu tertinggi dari 13 minggu terakhir ÷ 7? | Provisional label drops | `fisikSafety: 'sheet'` or a new reading of a | B1 |
| 11 | L-11 | Is "ceiling(demand × f) × MPQ" the f-day demand rounded up to the MPQ, and for level 6 which demand replaces LTP? | Apakah "ceiling(demand × f) × MPQ" berarti permintaan f hari dibulatkan ke atas ke MPQ, dan untuk level 6 permintaan apa yang menggantikan LTP? | Nothing; level 6 built on the demand named | Literal product; level 6 stays held | team answers 4 Q6 |
| 12 | L-12 | ROP Order = LTP summed over the lead-time weeks + safety order, as PPT 7: confirm? | ROP Order = jumlah LTP selama minggu lead time + safety order, seperti PPT 7: benar? | Provisional B9 drops | Formula changes | B9 |
| 13 | L-13 | ROP Supplier rounds up to the MPQ: right, and what is ROP order to principal? | ROP Supplier dibulatkan ke MPQ: benar, dan apa itu ROP order to principal? | Nothing | Rounding removed; principal ROP rebuilt | B10, team answers 4 Q4 |
| 14 | L-14 | Max = ROP Fisik to the koli (pallet non-stc, pack size stc) locally, MOQ for imports: confirm? | Max = ROP Fisik ke koli (palet non-stc, pack size stc) lokal, MOQ impor: benar? | Provisional B8 drops | `maxRule` or koli source changes | B8 |
| 15 | L-15 | Does the next call-off fire only once stock rises above ROP Fisik again, or on every check while it stays at or below? | Apakah call-off berikutnya dibuat hanya setelah stok naik lagi di atas ROP Fisik, atau pada setiap pemeriksaan selama stok tetap di/di bawahnya? | Re-arm stays (sandbox shortage stands) | `triggerStep` re-arms per check; sandbox shows repeated call-offs and a PR | F2 |
| 16 | L-16 | The recommended order is the engine's lot and becomes a call-off while DA carries the LTP: the split you expect? | Pesanan yang disarankan lot mesin dan menjadi call-off, DA memuat LTP: sesuai harapan? | Nothing | DA or orders change basis | — |
| 17 | L-17 | A line not needed before W3 2027 is proposed to move to January: is "needed from" the right test? | Baris yang belum dibutuhkan sebelum W3 2027 diusulkan pindah ke Januari: "dibutuhkan mulai" ukuran yang tepat? | Nothing | Need-date rule changes | — |
| 18 | L-18 | Trade-off ±10% a version, ±20% from the first committed value, damped 50/50: confirm? | Trade-off ±10% per versi, ±20% dari nilai pertama, diredam 50/50: benar? | Nothing | Admin values change | — |
| 19 | L-19 | Bias alarm at |signal| > 0.51, weight 0.1, after 13 weeks: confirm? | Alarm bias pada |sinyal| > 0,51, bobot 0,1, setelah 13 minggu: benar? | Nothing | Constants change | — |
| 20 | L-20 | Two CFOTs, by PO line (26 weeks) and by PO (90 days): do you want both, or one? | Dua CFOT, per baris PO (26 minggu) dan per PO (90 hari): keduanya, atau satu? | Nothing | One page's measure retires | — |
| 21 | L-21 | "Short by" = LTP − allocated (not LTP − BE): confirm? | "Kurang" = LTP − dialokasikan (bukan LTP − BE): benar? | Nothing | Formula changes | — |
| 22 | L-22 | Strategic buffer = festive-month LTP − average LTP of the 3 months before: right, and should it feed ROP Fisik or Max? | Strategic buffer = LTP bulan festive − rata-rata LTP 3 bulan sebelumnya: benar, dan apakah masuk ke ROP Fisik atau Max? | Baseline stays; feed built if named | Baseline changes | C3, C4 |
| 23 | L-23 | Sandbox: a call-off arrives f days after the trigger, approved: the projection you want? | Sandbox: call-off tiba f hari setelah pemicu, disetujui: proyeksi yang Anda inginkan? | Nothing | Loop changes | A12 |
| 24 | L-24 | At PO end, the quantity ordered but never called off: PTI's liability, carried into the next PO, or nothing? | Di akhir PO, kuantitas yang dipesan tetapi tidak pernah di-call-off: liabilitas PTI, dibawa ke PO berikutnya, atau tidak ada? | `leftoverRule` set; supplier view follows | Remainder shown only | F3 |
| 25 | L-25 | CV on the last 6 full calendar months, threshold 0.5, per variant: confirm? | CV atas 6 bulan kalender penuh terakhir, ambang 0,5, per varian: benar? | Sign-off | Buckets change | C1 |
| 26 | L-26 | Local = queue + production + delivery; import adds ordering and shipment; imported raw adds order to principal: confirm? | Lokal = antrean + produksi + pengiriman; impor menambah pemesanan dan shipment; bahan baku impor menambah order ke prinsipal: benar? | Sign-off | Steps change | — |
| 27 | W-01 | Is "Safety order" alone the name, never with ROP Order in brackets? | "Safety order" saja namanya, tanpa ROP Order dalam kurung? | Sentences rewritten | Sentence stays | TL-D15 |
| 28 | W-02 | Are "Confirmation rate", "Commitment reliability", "CFOT, by PO line" your names for the three measures? | Apakah "Confirmation rate", "Commitment reliability", "CFOT, by PO line" nama Anda untuk ketiga ukuran? | Explanations open with the labels | Labels change (ruling) | TL-D31, TL-D34 |
| 29 | W-03 | Zones: "Firm / Trade-off / Forecast" or "Pasti / Kompromi / Prakiraan"? | Zona: "Firm / Trade-off / Forecast" atau "Pasti / Kompromi / Prakiraan"? | ID keeps English on the commitment pages | Publish page and glossary take the Indonesian words | F-20 Q6 |
| 30 | W-04 | "Call-off" in Indonesian too, never "panggilan"? | "Call-off" juga dalam bahasa Indonesia, bukan "panggilan"? | BL-256 applies | DA card keeps "panggilan" | TL-D11 |
| 31 | W-05 | "Cycle stock" and "Max" in Indonesian text, or "stok siklus" and "Maks"? | "Cycle stock" dan "Max" dalam teks Indonesia, atau "stok siklus" dan "Maks"? | BL-256 applies | Sentences stay | TL-D17 |
| 32 | W-06 | Is "Total DA" the name for the DA summed over the lead time? | "Total DA" nama untuk DA yang dijumlahkan sepanjang lead time? | Both labels become "Total DA" | Labels stay | A2 |
| 33 | W-07 | Your word for call-offs arriving in a week: "incoming", or something else? | Kata Anda untuk call-off yang tiba dalam satu minggu: "incoming", atau lainnya? | Row renamed "Call-offs arriving" or the word given | Row stays "Incoming" | — |

## 5. CONFIRMED AS BUILT

Gap "none"; one yes each signs them off.

- L-01 FG demand forecast and range: engine Comb per SKU, P50/P90 by replayed ratios, FG demand = gross requirement × share.
- L-03 Raw-material LTP per week: the month spread evenly over its days.
- L-04 Recorded consumption: latest record wins, split by LTP share, 13-week moving average over recorded weeks.
- L-06 Supply gap: DA − (released call-offs + surplus carried forward), never backward, within the horizon.
- L-12 ROP Order: LTP summed over the lead-time weeks + safety order.
- L-16 Order sizing: MOQ, multiple and warehouse space, lots become call-offs.
- L-17 Reschedule: need week from the projection without the line; out when ≥ 1 week early.
- L-18 Plan stability: damping 50% Trade-off, band ±10% a version and ±20% from the first committed value.
- L-19 Bias: tracking signal α 0.1, alarm > 0.51 after 13 weeks.
- L-20 Reliability: confirmation rate, commitment reliability, one miss class per line, CFOT by PO line and by PO.
- L-21 Capacity gap: within ≤ allocated, needs additional ≤ BE, cannot supply above BE; short by = LTP − allocated.
- L-23 Sandbox: the live functions on the scenario's inputs.
- L-25 CV: 6 full calendar months, 0.5, per variant, demand-weighted per component.
- L-26 Lead time by step: local, import and imported raw-material routes; horizon = total ÷ 7 rounded up.
