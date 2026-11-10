// ─────────────────────────────────────────────────────────────────────────────
// BL-233 — TERM LABELS, DEFINED. EN + ID, exhaustiveness-pinned.
//
// `docs/supplier-hub/SC-HUB-TERM-LABELS-REQUIREMENTS-2026-10.md`. Each entry is
// one table column header, grid row label or KPI card title (BR-05) together
// with the text of its (i): the definition, the calculation, "Also called" and
// "Not" (BR-07). `TermLabel` (`components/ui-v2/TermLabel.jsx`) renders both
// from here, so a label cannot drift from its definition (BR-08).
//
// The wording rule (TL-R1). A label is the source's word: the MoM and the
// Material Planning team's own material first, then the hub's accepted
// requirement documents, never the code (BR-01, TL-D2). A label changes only by
// an owner ruling with a decision ID (BR-03, TL-D3); the rulings applied here
// are TL-D1 ("Demand anticipation (DA)"), TL-D8 ("Carry-over"), TL-D6 and
// TL-D11 (the team's English words stay English in ID). "Would be", "Surplus
// absorbed" and "After the check" wait on the team's own names (TL-D9,
// TL-D13) and are kept as they are.
//
// "Also called" lists only names a source gives, each with that source
// (BR-10). Sources: Q-file = `analysis/osip/PERTANYAAN-TIM-MATERIAL-2026-10-16.md`
// (the team's questions, citing the MoM and the OSIP playbook PPT).
//
// Wave 1 (spec §6 step 2): the Demand anticipation pages, What to order's
// "Below demand anticipation" section and the alert rules.
// Wave 2 (Goal A, Inventory): /buyer/inventory, /buyer/stock-simulation,
// /supplier/inventory and the trade-name tables. Hub sources: SHR =
// `SUPPLIER-HUB-REQUIREMENTS.md`, MAT = `SC-HUB-MATERIAL-REQUIREMENTS-2026-09.md`,
// DG = `DECISION-GUIDE.md`, all under `docs/supplier-hub/`.
// Wave 3 (Goal C, Foresight MoM 1 and 2): /buyer/capacity and /supplier/capacity
// (with the buffers), /buyer/safety-stock, the call-off run-out list and the
// feedstock reconcile. DRC-n = `SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10.md`,
// E14-04 = `FORECAST-ENGINE-REQUIREMENTS.md`, CAP-9 = `SC-HUB-CAPACITY-REQUIREMENTS-2026-10.md`.
// Wave 4 (Goal C, Foresight): /buyer/what-if, /buyer/stabilise and
// /supplier/forecasts. The tips name no requirement code (F-18).
// Wave 5 (order collaboration): /buyer/orders and /supplier/orders, the order
// summary, /buyer/purchase-requisition and both goods-receipt pages.
// Wave 6: /buyer/invoices and /supplier/invoices (with the invoice lines),
// /buyer/shipments (with shelf-life exceptions) and /supplier/shipments.
// Wave 7: /buyer/contracts (KPIs, list, delivery agreements tab),
// /buyer/delivery-agreements and /buyer/compliance.
// Wave 8: /buyer/suppliers and the supplier profile, /buyer/supplier-access,
// /buyer/scorecard, /supplier/performance, /buyer/reliability, /supplier/documents.
// Wave 9: the admin pages (not the rule-value rows, TL-D10), /buyer/process-flows,
// /buyer/roles, /buyer/demand-forecast and its bias tab.
// Wave 10: /buyer/material-requirement and /buyer/model-backtest.
// Wave 11: /buyer/order-plan, /buyer/reschedule, /buyer/collaboration and
// /buyer/data-health.
// ─────────────────────────────────────────────────────────────────────────────
/** @import { GlossaryOf, TermEntry } from './types' */

/**
 * The terms a page labels through `TermLabel`.
 * @typedef {'demandAnticipation' | 'ltp' | 'ltpA' | 'ltpFestive' | 'ltpB' | 'fgDemand' | 'ltpLessFgDemand' | 'consumptionAverage' | 'safetyOrder' | 'carryOver' | 'wouldBe' | 'surplusAbsorbed' | 'recordedConsumption' | 'openSupply' | 'supplyGap' | 'daAfterCheck' | 'ospo' | 'additionalPo' | 'callOffsThisWeek' | 'remainder' | 'notCarried' | 'supplierAgreedOutside' | 'gapProposal' | 'alertPtiBelowRop' | 'alertSupplierBelowRop' | 'alertProjectedStockOut' | 'alertCapacityBelowDemand' | 'alertStaleData' | 'alertCoverage' | 'alertCommitmentBelowForecast' | 'alertLeadTimeMissing' | 'alertCallOffNotCovered' | 'alertSupplyDiscontinued' | 'alertBlanketPoRunOut' | 'alertDemandAnticipationUnabsorbed' | 'supplierCover' | 'supplierStock' | 'ptiStockRop' | 'incoming' | 'incomingStatus' | 'supplierAvailable' | 'calledOffNotShipped' | 'freeToCallOff' | 'ptiInbound' | 'simulationBasis' | 'simulationFlags' | 'supplierOwnRop' | 'ptiStock' | 'ptiRop' | 'daysOfSupply' | 'feedstockLatest' | 'feedstockThisWeek' | 'tradeNameStatus' | 'capacityLtp' | 'allocatedCapacity' | 'productionLimit' | 'additionalCapacity' | 'capacityBe' | 'ltpAgainstCapacity' | 'capacityShortBy' | 'ptiCapacityDecision' | 'runOutRemaining' | 'runsOut' | 'newPoNeededBy' | 'poLeadTime' | 'spaceFreed' | 'materialsPerTier' | 'onSapValue' | 'sltGroupDefault' | 'tierTarget' | 'safetyOrderRopOrder' | 'ropFisikSafety' | 'demandCv' | 'osipLevel' | 'ropOrder' | 'ropFisik' | 'maxStock' | 'engineSafetyStock' | 'sapSafetyStock' | 'freed' | 'safetyLeadTime' | 'engineReorderPoint' | 'forecastShortfall' | 'ropSupplier' | 'ropToPrincipal' | 'replenishmentCycle' | 'pullAgreement' | 'bottleneckLeadTime' | 'monthLtp' | 'protectionBaseline' | 'uplift' | 'protectionBuffer' | 'strategicBaseline' | 'strategicBuffer' | 'poOrdered' | 'reconcileCalledOff' | 'asnRequested' | 'notYetCalledOff' | 'maxStockSupplier' | 'whatIfMax' | 'daOverLeadTime' | 'prGenerated' | 'planCheckPr' | 'triggerCallOffs' | 'triggerPr' | 'whatIfRemainder' | 'whatIfCarryOver' | 'firstShortageWeek' | 'weeksAboveMax' | 'whatIfLtp' | 'daCurrentPlan' | 'daScenario' | 'callOffsDrafted' | 'whatIfIncoming' | 'prRecommendedWeek' | 'projectedSohPlan' | 'projectedSohScenario' | 'engineValue' | 'lastPublished' | 'firstPublished' | 'dampedValue' | 'allowedRange' | 'toPublish' | 'stabiliseRule' | 'ruleNew' | 'ruleUnchanged' | 'ruleFirmFrozen' | 'ruleForecast' | 'ruleDamped' | 'ruleBandHeld' | 'ruleCumulativeHeld' | 'ruleOverride' | 'planMovement' | 'weeksChangedInLeadTime' | 'tradeOffWithinLimits' | 'weeksHeld' | 'seriesHeld' | 'seriesMasc' | 'forecastZone' | 'publishedForecast' | 'commitmentDue' | 'commitment' | 'commitmentUpside' | 'grPendingInspection' | 'grQualityHold' | 'grApprovedToday' | 'grRejectionRate' | 'grDisposition' | 'grExpected' | 'grReceived' | 'grAccepted' | 'grRejectedLine' | 'grChecks' | 'poOpenTotal' | 'poPendingConfirmation' | 'poInTransit' | 'poOverdue' | 'orderedQty' | 'counterQty' | 'counterDate' | 'summaryResponse' | 'summaryAsns' | 'summaryCallOffs' | 'summaryConfirmations' | 'summaryReceipts' | 'summaryInvoices' | 'prDraft' | 'prPendingApproval' | 'prApproved' | 'prSourcingEvent' | 'prPoCreated' | 'prSource' | 'supShipped' | 'supReceived' | 'supRejected' | 'supQualityResult' | 'supDiscrepancy' | 'supDifference' | 'supOpenOrders' | 'supInProgress' | 'supValuePending' | 'supDelivered' | 'supConfirmed' | 'invPendingApproval' | 'invReleased' | 'invDisputed' | 'invOverdue' | 'invThreeWayMatch' | 'agingBucket' | 'agingPctAp' | 'agingRisk' | 'invLineQuantity' | 'invUnitPrice' | 'invLineValue' | 'shipInTransit' | 'shipAtDock' | 'shipDelayed' | 'shipArrivingToday' | 'shelfLifeLeftAtEta' | 'supPaymentsReceived' | 'supPendingPayment' | 'supInvDisputed' | 'supThreeWayMatch' | 'asnDraft' | 'asnSubmitted' | 'asnInTransit' | 'asnDelivered' | 'asnDiscrepancy' | 'asnLineOrdered' | 'asnLineShipped' | 'asnOpenQuantity' | 'asnShippedQuantity' | 'deliveryAgreed' | 'deliveryReleased' | 'deliveryDelivered' | 'deliveryRemaining' | 'releasePlanned' | 'releaseFulfillment' | 'releaseDrawnDown' | 'certExpired' | 'certExpiring' | 'certMissing' | 'certUnderReview' | 'certValid' | 'certInSap' | 'certActionRequired' | 'contractsActive' | 'contractsExpiring' | 'obligationsOverdue' | 'contractsActiveValue' | 'contractPerformance' | 'relConfirmation' | 'relCommitment' | 'relCfot' | 'relMisses' | 'relPlanChangeKpi' | 'relPlanChangeCol' | 'relMasc' | 'relMascI' | 'perfOtif' | 'perfCfot' | 'perfRejections' | 'perfScore' | 'stockAccess' | 'otif' | 'scorecardGrade' | 'catalogMoq' | 'catalogLeadTime' | 'catalogCapacity' | 'supplierChannel' | 'supplierCompliance' | 'performanceBand' | 'docValid' | 'docExpiring' | 'docExpired' | 'docNeedsAction' | 'poOnTime' | 'poLate' | 'poAvgOverdue' | 'dfFallbackShare' | 'dfTotal26' | 'dfReconciledLevels' | 'dfOwnForecast26' | 'dfReconciled26' | 'dfSapPlan26' | 'dfAgainstSap' | 'dfMethod' | 'dfForecast26' | 'sapPlan' | 'dfMethodForecast' | 'dfReconciled' | 'dfTheta' | 'dfEventsTotal' | 'rangeAboveP90' | 'rangeAboveP50' | 'rangeUncorrected' | 'rangeWidthTotal' | 'rangeForecast' | 'rangeWidth' | 'rangeAbovePast' | 'rangeSource' | 'rangeNeed' | 'fbSkusAlarm' | 'fbMaterialsAlarm' | 'fbOverrides' | 'fbValue' | 'fbEngine' | 'fbSap' | 'fbDirection' | 'fvaError' | 'fvaImproved' | 'fvaValue' | 'sourcingType' | 'requiredRole' | 'roleReach' | 'qualLevel' | 'qualDocuments' | 'ruleInForce' | 'ruleDefault' | 'groupValue' | 'globalValue' | 'staleAfter' | 'stockFigureNow' | 'stockUpdateMode' | 'modeSet' | 'tplOnNewAsns' | 'mrqNetMaterials' | 'mrqPlannedOrdersKpi' | 'mrqLateKpi' | 'mrqReview' | 'mrpLeadTime' | 'mrpSafetyStock' | 'mrpStockOnHand' | 'mrpNet' | 'mrpPlannedOrders' | 'mrpLate' | 'mrpGross' | 'mrpStockStart' | 'mrpReceipts' | 'mrpPlannedOrder' | 'mrpRelease' | 'mrpStockEnd' | 'pegFgQty' | 'pegScrap' | 'pegYield' | 'pegRequirement' | 'mbBeats' | 'mbMaterials' | 'mbLimit' | 'mbFillRate' | 'mbOrderComplete' | 'mbPalletWeeks' | 'mbMascMedian' | 'mbWapeMedian' | 'mbUnitsServed' | 'mbPeakPackaging' | 'mbPeakRaw' | 'mbOrigin' | 'mbVsSap' | 'mbMaterialLead' | 'mbChosenVsSap' | 'mbMasc' | 'mbWape' | 'mbBias' | 'mbSelection' | 'candMain' | 'candComb' | 'candTheta' | 'candSba' | 'candCroston' | 'candTsb' | 'candSapPlan' | 'scenarioSapPlan' | 'scenarioFloor' | 'moveHeadroom' | 'excForecast' | 'excCommitment' | 'commitmentGap' | 'excDaysOfSupply' | 'firmDemand' | 'supplierCoverage' | 'principalLeadTime' | 'triggerSoh' | 'orderReason' | 'orderSizedBy' | 'fillOrderPlan' | 'fillInterim' | 'fillLowest' | 'fillAgainst80' | 'fillRented' | 'rentCost' | 'peakFill' | 'rentedPalletWeeks' | 'fillNow' | 'fillWithSelection' | 'fillWithAll' | 'fillOnHand' | 'fillStatus' | 'rsProposed' | 'rsFreed' | 'rsSaving' | 'rsChangeCost' | 'rsPosition' | 'rsOver' | 'rsRelief' | 'rsOnHandLoad' | 'dhStale' | 'dhChecks' | 'dhRecords' | 'dhFreshness' | 'dhChecksCol' | 'dhSeverity' | 'dhAffects' | 'dhWhMaterials'} TermLabelId
 */

// TL-D23: an "Also called" source names only the team; where in the team's
// material each name was found is the spec's trace table (§8), not the tip.
const TEAM = { en: 'Material Planning team', id: 'Tim Material Planning' };
const NOT_DELIVERY_AGREEMENT = {
  en: 'Delivery Agreement (also DA, on the contract pages).',
  id: 'Delivery Agreement (juga DA, di halaman kontrak).'
};
const MAT_ALERTS = {
  en: 'hub Material requirements, alert rules',
  id: 'kebutuhan Material hub, aturan peringatan'
};
const NOT_TEAM_ROPS = {
  en: 'ROP Order or ROP Fisik (the Material Planning team’s ROPs, on the Safety stock page).',
  id: 'ROP Order atau ROP Fisik (ROP tim Material Planning, di halaman Safety stock).'
};

export const TERM_LABEL_GLOSSARY =
  /** @satisfies {GlossaryOf<TermLabelId> & Record<TermLabelId, TermEntry>} */ ({
    // ── The Demand anticipation grid (spec §3) ────────────────────────────────
    demandAnticipation: {
      label: { en: 'Demand anticipation (DA)', id: 'Demand anticipation (DA)' },
      en: 'The weekly quantity PTI signals to the supplier for a material over its lead time, so the supplier can prepare it. A planning signal to the supplier, not a delivery.',
      id: 'Kuantitas mingguan yang diisyaratkan PTI kepada pemasok untuk suatu material sepanjang lead time-nya, agar pemasok dapat menyiapkannya. Sinyal perencanaan bagi pemasok, bukan pengiriman.',
      formula: {
        en: 'LTP of the week; week 1 also carries the safety order; plus carry-over moved into the week.',
        id: 'LTP minggu itu; minggu 1 juga memuat safety order; ditambah carry-over yang dipindahkan ke minggu itu.'
      },
      alsoCalled: [{ name: 'DA', source: TEAM }],
      notToConfuse: NOT_DELIVERY_AGREEMENT,
      labelKeys: ['daHist.csv.demandAnticipation']
    },
    ltp: {
      label: { en: 'LTP', id: 'LTP' },
      en: 'The current forecast quantity of the material for the week, for this supplier. Each week’s demand anticipation (DA) starts from it.',
      id: 'Kuantitas prakiraan terkini material untuk minggu itu, untuk pemasok ini. Demand anticipation (DA) tiap minggu berangkat darinya.',
      // U-08 (BL-246): the spreading is `groupWeekLtp` (capacityRules.js, CAP-D11). On
      // the formula line, as the definition is held to 40 words (BR-07).
      formula: {
        en: 'A monthly LTP (raw material) is spread evenly over the month’s days; a week that straddles two months takes each month’s share.',
        id: 'LTP bulanan (bahan baku) dibagi rata ke hari-hari dalam bulan itu; minggu yang melintasi dua bulan mengambil bagian dari masing-masing bulan.'
      },
      labelKeys: ['daHist.csv.ltp']
    },
    // PEX-5 (BL-267): the three LTP series the planner uploads; the demand
    // anticipation reads the one chosen per material. Words are the PEX doc's.
    ltpA: {
      label: { en: 'LTP A', id: 'LTP A' },
      en: 'The base LTP of the material for the week. Until it is uploaded, the forecast quantity stands in for it.',
      id: 'LTP dasar material untuk minggu itu. Sebelum diunggah, kuantitas prakiraan menggantikannya.'
    },
    ltpFestive: {
      label: { en: 'LTP Festive', id: 'LTP Festive' },
      en: 'The LTP of the material for the week when a festive window applies. The strategic buffer is this minus LTP A.',
      id: 'LTP material untuk minggu itu bila ada periode festive. Strategic buffer adalah ini dikurangi LTP A.',
      formula: {
        en: 'Strategic buffer = LTP Festive − LTP A.',
        id: 'Strategic buffer = LTP Festive − LTP A.'
      }
    },
    ltpB: {
      label: { en: 'LTP B', id: 'LTP B' },
      en: 'The LTP of the material for the week with extra protection. The protection buffer for orders is this minus LTP A.',
      id: 'LTP material untuk minggu itu dengan perlindungan tambahan. Protection buffer untuk pesanan adalah ini dikurangi LTP A.',
      formula: {
        en: 'Protection buffer = LTP B − LTP A.',
        id: 'Protection buffer = LTP B − LTP A.'
      }
    },
    fgDemand: {
      label: { en: 'FG demand', id: 'FG demand' },
      en: 'The material quantity the finished-goods plan and sales orders need in the week, through the bill of materials, times this supplier’s share.',
      id: 'Kuantitas material yang dibutuhkan rencana barang jadi dan pesanan penjualan pada minggu itu, melalui BOM, dikali porsi pemasok ini.'
    },
    ltpLessFgDemand: {
      label: { en: 'LTP − FG demand', id: 'LTP − FG demand' },
      en: 'How far the week’s LTP sits above (positive) or below (negative) the FG demand. Read only, for comparing the two plans.',
      id: 'Seberapa jauh LTP minggu itu di atas (positif) atau di bawah (negatif) FG demand. Hanya baca, untuk membandingkan kedua rencana.',
      formula: { en: 'LTP − FG demand.', id: 'LTP − FG demand.' }
    },
    // TL-D14 (owner, 2026-10-30): the team's name, "moving average consumption"
    // (Q-file A11), replaces "Consumption, 13-week average"; English in ID too (TL-D11).
    consumptionAverage: {
      label: {
        en: 'Moving average consumption',
        id: 'Moving average consumption'
      },
      en: 'The material’s average weekly consumption over the recent weeks that have consumption recorded, times this supplier’s share.',
      id: 'Rata-rata konsumsi mingguan material selama minggu-minggu terakhir yang konsumsinya tercatat, dikali porsi pemasok ini.',
      formula: {
        en: 'Recorded consumption of the last 13 weeks ÷ the weeks with a record, × the supplier’s share.',
        id: 'Konsumsi tercatat 13 minggu terakhir ÷ jumlah minggu yang tercatat, × porsi pemasok.'
      }
    },
    safetyOrder: {
      label: { en: 'Safety order', id: 'Safety order' },
      en: 'An extra quantity in week 1 of the demand anticipation (DA). The supplier keeps it as feedstock against demand above the LTP.',
      id: 'Kuantitas tambahan di minggu 1 demand anticipation (DA). Pemasok menyimpannya sebagai feedstock untuk menutup permintaan di atas LTP.',
      formula: {
        en: 'Z × √lead time × standard deviation of the LTP over the next 13 weeks, rounded up to a multiple of the MPQ. Z is 1.65 unless set per material.',
        id: 'Z × √lead time × simpangan baku LTP 13 minggu ke depan, dibulatkan ke atas ke kelipatan MPQ. Z bernilai 1,65 kecuali diatur per material.'
      },
      // TL-D15 (owner, 2026-10-30): ROP Order is not another name for the safety
      // order; it contains it (DRC-10: LTP × lead time + safety order).
      notToConfuse: {
        en: 'Safety stock (stock PTI keeps on hand, on the forecast pages). ROP Order (LTP × lead time + safety order).',
        id: 'Safety stock (stok yang disimpan PTI, di halaman prakiraan). ROP Order (LTP × lead time + safety order).'
      },
      labelKeys: ['daHist.csv.safety']
    },
    carryOver: {
      label: { en: 'Carry-over', id: 'Carry-over' },
      en: 'The part of an earlier week’s demand anticipation (DA) that its call-offs did not take, moved into this week.',
      id: 'Bagian demand anticipation (DA) minggu sebelumnya yang tidak terambil oleh call-off-nya, dipindahkan ke minggu ini.',
      formula: {
        en: 'Remainder = DA − the week’s call-offs. It moves to the last week of the horizon, or to the first week outside it when the supplier agreed.',
        id: 'Sisa = DA − call-off minggu itu. Sisa dipindah ke minggu terakhir horizon, atau ke minggu pertama di luar horizon bila pemasok setuju.'
      },
      alsoCalled: [
        {
          name: 'sisa DA',
          source: TEAM
        }
      ],
      labelKeys: ['daHist.csv.carriedIn']
    },
    wouldBe: {
      label: { en: 'Would be', id: 'Jika dihitung ulang' },
      en: 'Today’s recalculated figure beside a published week, with the change in brackets. For information only: the published figure stays in force.',
      id: 'Angka hasil hitung ulang hari ini di samping minggu yang sudah dipublikasikan, dengan perubahannya dalam kurung. Hanya informasi: angka yang dipublikasikan tetap berlaku.'
    },
    surplusAbsorbed: {
      label: { en: 'Surplus absorbed', id: 'Kelebihan diserap' },
      en: 'Supply above the horizon’s total demand anticipation (DA), taken off the last week of the horizon by the plan check.',
      id: 'Pasokan di atas total demand anticipation (DA) sepanjang horizon, dikurangkan dari minggu terakhir horizon oleh pemeriksaan rencana.'
    },
    recordedConsumption: {
      label: { en: 'Recorded consumption', id: 'Pemakaian tercatat' },
      en: 'How much of the material the planner recorded as used in the week, typed in or uploaded, until the SAP goods-issue feed exists.',
      id: 'Berapa banyak material yang dicatat perencana sebagai terpakai pada minggu itu, diketik atau diunggah, sampai umpan goods issue SAP tersedia.'
    },
    openSupply: {
      label: { en: 'Open supply', id: 'Pasokan terbuka' },
      en: 'Call-offs awaiting confirmation or confirmed, in the week of their need date. Drafts, rejected and dismissed call-offs, and blanket balance not yet called off, are not supply.',
      id: 'Call-off yang menunggu konfirmasi atau sudah dikonfirmasi, pada minggu tanggal kebutuhannya. Draf, call-off yang ditolak dan dibatalkan, serta saldo PO induk yang belum di-call-off, bukan pasokan.',
      notToConfuse: {
        en: 'OSPO (the open PO quantity not yet called off).',
        id: 'OSPO (kuantitas PO terbuka yang belum di-call-off).'
      }
    },
    supplyGap: {
      label: { en: 'Gap', id: 'Kekurangan' },
      en: 'How much of the week’s demand anticipation (DA) released call-offs do not cover, after supply left over from earlier weeks.',
      id: 'Berapa banyak demand anticipation (DA) minggu itu yang tidak tertutup call-off yang dirilis, setelah pasokan sisa dari minggu-minggu sebelumnya.',
      formula: {
        en: 'max(0, DA − (open supply + supply carried from earlier weeks)).',
        id: 'max(0, DA − (pasokan terbuka + pasokan yang terbawa dari minggu sebelumnya)).'
      },
      notToConfuse: {
        en: 'The capacity gap on Capacity, or the plan-check gap (Total DA − Total OSPO).',
        id: 'Kekurangan kapasitas di halaman Kapasitas, atau selisih pemeriksaan rencana (Total DA − Total OSPO).'
      }
    },
    gapProposal: {
      label: { en: 'Proposal', id: 'Usulan' },
      en: 'How to cover the gap: a call-off on the oldest blanket PO line with balance, then the next line. With no balance left, “New PO needed” with the quantity.',
      id: 'Cara menutup kekurangan: call-off pada baris PO induk tertua yang masih bersaldo, lalu baris berikutnya. Bila saldo habis, “Perlu PO baru” dengan kuantitasnya.'
    },

    // ── The history page (DRC-3) ──────────────────────────────────────────────
    daAfterCheck: {
      label: { en: 'After the check', id: 'Setelah pemeriksaan' },
      en: 'The demand anticipation (DA) in force after the plan check absorbed any surplus in the horizon’s last week.',
      id: 'Demand anticipation (DA) yang berlaku setelah pemeriksaan rencana menyerap kelebihan di minggu terakhir horizon.'
    },
    ospo: {
      label: { en: 'OSPO', id: 'OSPO' },
      en: 'The open PO quantity for this supplier and material that is not yet called off.',
      id: 'Kuantitas PO terbuka untuk pemasok dan material ini yang belum di-call-off.',
      formula: {
        en: 'Last week’s OSPO − last week’s call-offs + the PO placed this week.',
        id: 'OSPO minggu lalu − call-off minggu lalu + PO yang dibuat minggu ini.'
      },
      notToConfuse: {
        en: 'Open supply (released call-offs, by need week).',
        id: 'Pasokan terbuka (call-off yang dirilis, per minggu kebutuhan).'
      },
      labelKeys: ['daHist.csv.ospo']
    },
    additionalPo: {
      label: { en: 'Additional PO', id: 'PO tambahan' },
      en: 'The PO quantity still needed so that open POs cover the demand anticipation (DA) over the horizon.',
      id: 'Kuantitas PO yang masih diperlukan agar PO terbuka menutup demand anticipation (DA) sepanjang horizon.',
      formula: { en: 'Σ DA over the horizon − OSPO.', id: 'Σ DA sepanjang horizon − OSPO.' },
      alsoCalled: [
        {
          name: 'PO tambahan',
          source: TEAM
        }
      ],
      labelKeys: ['daHist.csv.additionalPo']
    },
    callOffsThisWeek: {
      label: { en: 'Call-offs this week', id: 'Call-off minggu ini' },
      en: 'The quantity called off for this supplier and material in the planning week of the publication. It is taken off that week’s demand anticipation (DA).',
      id: 'Kuantitas yang di-call-off untuk pemasok dan material ini pada minggu perencanaan publikasi. Kuantitas ini dikurangkan dari demand anticipation (DA) minggu itu.',
      labelKeys: ['daHist.csv.callOff']
    },
    remainder: {
      label: { en: 'Remainder', id: 'Sisa' },
      en: 'What the week’s demand anticipation (DA) left after its call-offs. It becomes carry-over in a later week.',
      id: 'Bagian demand anticipation (DA) minggu itu yang tersisa setelah call-off-nya. Sisa ini menjadi carry-over di minggu berikutnya.',
      formula: { en: 'DA − the week’s call-offs.', id: 'DA − call-off minggu itu.' },
      alsoCalled: [
        {
          name: 'sisa',
          source: TEAM
        }
      ],
      labelKeys: ['daHist.csv.remainder']
    },
    notCarried: {
      label: { en: 'Not carried (over the limit)', id: 'Tidak dipindahkan (melebihi batas)' },
      en: 'The part of the remainder above the supplier’s carry-over limit. It is not moved to a later week.',
      id: 'Bagian sisa yang melebihi batas carry-over pemasok. Bagian ini tidak dipindahkan ke minggu berikutnya.',
      formula: {
        en: 'The limit is the quantity of the last 4 weeks of sales orders unless set per supplier.',
        id: 'Batasnya adalah kuantitas pesanan penjualan 4 minggu terakhir kecuali diatur per pemasok.'
      }
    },
    supplierAgreedOutside: {
      label: {
        en: 'Supplier agreed to carry outside the horizon',
        id: 'Pemasok setuju memindahkan ke luar horizon'
      },
      en: 'Whether the supplier agreed that this remainder goes to the first week outside the horizon, instead of the horizon’s last week.',
      id: 'Apakah pemasok setuju sisa ini dipindah ke minggu pertama di luar horizon, alih-alih ke minggu terakhir horizon.'
    },

    // ── Alert rule names (TL-D10, question 6: every rule name gets an (i)) ─────
    alertPtiBelowRop: {
      label: {
        en: 'PTI stock is below the PTI reorder point',
        id: 'Stok PTI di bawah titik pemesanan ulang PTI'
      },
      en: 'Raised when PTI’s stock on hand of the material is below PTI’s reorder point for it.',
      id: 'Muncul bila stok PTI untuk material itu di bawah titik pemesanan ulang PTI untuknya.',
      formula: { en: 'PTI SOH < PTI ROP.', id: 'SOH PTI < ROP PTI.' },
      labelKeys: ['inv.alerts.rule.ptiBelowRop']
    },
    alertSupplierBelowRop: {
      label: {
        en: 'Supplier stock is below the system-calculated supplier reorder point (ROP Supplier)',
        id: 'Stok pemasok di bawah titik pemesanan ulang pemasok hasil hitung sistem (ROP Supplier)'
      },
      en: 'Raised when the supplier’s stock is below the ROP Supplier the hub calculates. The ROP the supplier types in is shown only, never compared.',
      id: 'Muncul bila stok pemasok di bawah ROP Supplier yang dihitung hub. ROP yang diketik pemasok hanya ditampilkan, tidak pernah dibandingkan.',
      formula: {
        en: 'Supplier SOH < ROP Supplier (system-calculated).',
        id: 'SOH pemasok < ROP Supplier (hasil hitung sistem).'
      },
      labelKeys: ['inv.alerts.rule.supplierBelowRop']
    },
    alertProjectedStockOut: {
      label: {
        en: 'PTI stock runs out before the next incoming delivery',
        id: 'Stok PTI habis sebelum kedatangan berikutnya'
      },
      en: 'Raised when, at the material’s daily demand across all its suppliers, PTI’s stock lasts fewer days than until this supplier’s next incoming quantity.',
      id: 'Muncul bila, pada permintaan harian material dari semua pemasoknya, stok PTI bertahan lebih sedikit hari daripada sampai kedatangan berikutnya dari pemasok ini.',
      formula: {
        en: 'PTI SOH ÷ daily demand < days until the next incoming date.',
        id: 'SOH PTI ÷ permintaan harian < hari sampai tanggal kedatangan berikutnya.'
      },
      labelKeys: ['inv.alerts.rule.projectedStockOut']
    },
    alertCapacityBelowDemand: {
      label: {
        en: 'Allocated capacity is below the LTP',
        id: 'Kapasitas yang dialokasikan di bawah LTP'
      },
      en: 'Raised when the capacity the supplier allocated for a week is below the LTP of that week, on the Capacity page.',
      id: 'Muncul bila kapasitas yang dialokasikan pemasok untuk suatu minggu di bawah LTP minggu itu, di halaman Kapasitas.',
      labelKeys: ['inv.alerts.rule.capacityBelowDemand']
    },
    alertStaleData: {
      label: { en: 'Supplier stock figures are out of date', id: 'Angka stok pemasok kedaluwarsa' },
      en: 'Raised when the supplier last updated its stock figures longer ago than its agreed update interval. Always Low risk.',
      id: 'Muncul bila pemasok terakhir memperbarui angka stoknya lebih lama dari interval pembaruan yang disepakati. Selalu berisiko Rendah.',
      labelKeys: ['inv.alerts.rule.staleData']
    },
    alertCoverage: {
      label: {
        en: 'Supplier stock and incoming do not cover the next 30 days of demand',
        id: 'Stok dan kedatangan pemasok tidak menutup kebutuhan 30 hari ke depan'
      },
      en: 'Raised when the supplier’s stock plus its incoming quantities fall short of the material’s demand over the next 30 days.',
      id: 'Muncul bila stok pemasok ditambah kuantitas kedatangannya kurang dari permintaan material selama 30 hari ke depan.',
      formula: {
        en: '(Supplier SOH + incoming) ÷ 30 days of demand, against the coverage thresholds.',
        id: '(SOH pemasok + kedatangan) ÷ permintaan 30 hari, terhadap ambang cakupan.'
      },
      labelKeys: ['inv.alerts.rule.coverage']
    },
    alertCommitmentBelowForecast: {
      label: {
        en: 'Committed quantity below forecast beyond tolerance',
        id: 'Kuantitas komitmen di bawah prakiraan melebihi toleransi'
      },
      en: 'Raised when the supplier committed less than the forecast by more than the tolerance. High risk in Zone Liability, Medium in the damped weeks of Zone Capacity.',
      id: 'Muncul bila pemasok berkomitmen lebih sedikit dari prakiraan melebihi toleransi. Risiko Tinggi di Zone Liability, Sedang di minggu diredam Zone Capacity.',
      labelKeys: ['inv.alerts.rule.commitmentBelowForecast']
    },
    alertLeadTimeMissing: {
      label: {
        en: 'No supplier lead time on record: risk uses the day bands until the master data is fixed',
        id: 'Lead time pemasok belum tercatat: risiko memakai pita hari sampai data induk diperbaiki'
      },
      en: 'Raised when the material has no supplier lead time in the master data. Until it is added, the risk class comes from fixed day bands.',
      id: 'Muncul bila material tidak punya lead time pemasok di data induk. Sampai ditambahkan, kelas risiko diambil dari pita hari tetap.',
      labelKeys: ['inv.alerts.rule.leadTimeMissing']
    },
    alertCallOffNotCovered: {
      label: {
        en: 'A confirmed call-off due within the lead time is larger than the supplier stock plus production due before the need date',
        id: 'Call-off terkonfirmasi yang jatuh tempo dalam lead time melebihi stok pemasok ditambah produksi yang selesai sebelum tanggal kebutuhan'
      },
      en: 'Raised when the supplier cannot have a confirmed call-off ready by its need date from its stock and the production it finishes before then.',
      id: 'Muncul bila pemasok tidak dapat menyiapkan call-off terkonfirmasi pada tanggal kebutuhannya dari stok dan produksi yang selesai sebelum tanggal itu.',
      labelKeys: ['inv.alerts.rule.callOffNotCovered']
    },
    alertSupplyDiscontinued: {
      label: {
        en: 'The supplier marked this material Discontinued: it needs another source',
        id: 'Pemasok menandai material ini Dihentikan: perlu sumber lain'
      },
      en: 'Raised when the supplier gives Discontinued as the shortfall reason on its capacity or a commitment: the material will not come from it any more.',
      id: 'Muncul bila pemasok memberi alasan Dihentikan untuk kekurangan pada kapasitas atau komitmennya: material tidak akan lagi datang darinya.',
      labelKeys: ['inv.alerts.rule.supplyDiscontinued']
    },
    alertBlanketPoRunOut: {
      label: {
        en: 'A blanket PO runs out soon: raise the next PO by its "new PO needed by" week',
        id: 'PO induk akan segera habis: buat PO berikutnya sebelum minggu "PO baru diperlukan paling lambat"'
      },
      en: 'Raised when a blanket PO’s “new PO needed by” week is within 4 weeks or has passed. High risk from that week on, Medium before it.',
      id: 'Muncul bila minggu “PO baru diperlukan paling lambat” sebuah PO induk tinggal 4 minggu lagi atau sudah lewat. Risiko Tinggi sejak minggu itu, Sedang sebelumnya.',
      labelKeys: ['inv.alerts.rule.blanketPoRunOut']
    },
    alertDemandAnticipationUnabsorbed: {
      label: {
        en: 'Supply above demand anticipation (DA) is more than the last week of the horizon can absorb',
        id: 'Pasokan di atas demand anticipation (DA) melebihi yang dapat diserap minggu terakhir horizon'
      },
      en: 'Raised when the plan check finds more supply above the demand anticipation (DA) than the horizon’s last week can take. The alert carries the amount left.',
      id: 'Muncul bila pemeriksaan rencana menemukan pasokan di atas demand anticipation (DA) lebih besar dari yang dapat diambil minggu terakhir horizon. Peringatan memuat jumlah sisanya.',
      notToConfuse: NOT_DELIVERY_AGREEMENT,
      labelKeys: ['inv.alerts.rule.demandAnticipationUnabsorbed']
    },
    // ── Wave 2: Inventory (Goal A) ────────────────────────────────────────────
    supplierCover: {
      label: { en: 'Risk · supplier cover', id: 'Risiko · cakupan stok pemasok' },
      en: 'The material’s risk class, from how many days the supplier’s stock covers, against the supplier’s lead time for it.',
      id: 'Kelas risiko material, dari berapa hari stok pemasok mencukupi, dibandingkan lead time pemasok untuk material itu.',
      formula: {
        en: 'Days of cover = supplier stock ÷ demand. High below the lead time, Medium below 1.5 × lead time, else Low.',
        id: 'Hari cakupan = stok pemasok ÷ permintaan. Tinggi di bawah lead time, Sedang di bawah 1,5 × lead time, selain itu Rendah.'
      },
      alsoCalled: [
        {
          name: 'days of cover',
          source: { en: 'hub requirements', id: 'kebutuhan hub' }
        }
      ],
      notToConfuse: {
        en: 'PTI cover (PTI stock ÷ demand).',
        id: 'Cakupan PTI (stok PTI ÷ permintaan).'
      }
    },
    supplierStock: {
      label: { en: 'Supplier stock', id: 'Stok pemasok' },
      en: 'The supplier’s stock on hand of the material, from its latest stock update.',
      id: 'Stok on hand pemasok untuk material itu, dari pembaruan stok terakhirnya.',
      alsoCalled: [{ name: 'supplier SOH', source: MAT_ALERTS }],
      labelKeys: ['inv.col.supplierSoh']
    },
    ptiStockRop: {
      label: { en: 'PTI stock / ROP', id: 'Stok PTI / ROP' },
      en: 'PTI’s own stock on hand of the material, with PTI’s reorder point under it. Stock below the reorder point raises an alert.',
      id: 'Stok on hand PTI sendiri untuk material itu, dengan titik pemesanan ulang PTI di bawahnya. Stok di bawah titik itu memunculkan peringatan.',
      alsoCalled: [
        { name: 'PTI SOH', source: MAT_ALERTS },
        { name: 'PTI ROP', source: MAT_ALERTS }
      ],
      notToConfuse: NOT_TEAM_ROPS
    },
    incoming: {
      label: { en: 'Incoming', id: 'Akan datang' },
      en: 'The quantity of the material on its way from the supplier to PTI, split into in production and in transit.',
      id: 'Kuantitas material yang sedang menuju PTI dari pemasok, dipisah menjadi dalam produksi dan dalam perjalanan.',
      formula: {
        en: 'In production + in transit (shipping notices and dispatched call-offs).',
        id: 'Dalam produksi + dalam perjalanan (pemberitahuan pengiriman dan call-off yang dikirim).'
      },
      notToConfuse: {
        en: 'Incoming DA (the quantity the supplier confirms against the demand anticipation).',
        id: 'Incoming DA (kuantitas yang dikonfirmasi pemasok terhadap demand anticipation).'
      }
    },
    incomingStatus: {
      label: { en: 'Status', id: 'Status' },
      en: 'Whether the quantity is still in production or already in transit, and for transit, on which document: a shipping notice (ASN) or a call-off dispatch.',
      id: 'Apakah kuantitas masih dalam produksi atau sudah dalam perjalanan, dan untuk perjalanan, dengan dokumen apa: pemberitahuan pengiriman (ASN) atau pengiriman call-off.'
    },
    supplierAvailable: {
      label: { en: 'Supplier available stock', id: 'Tersedia di pemasok' },
      en: 'The estimated stock at the supplier on the check date: its last stock update, moved forward by what it shipped, received and finished since.',
      id: 'Perkiraan stok di pemasok pada tanggal cek: pembaruan stok terakhirnya, digeser oleh yang dikirim, diterima, dan selesai diproduksi sejak itu.',
      formula: {
        en: 'Stock at the last update − ASNs shipped since + to-distributor arrivals + production finished, capped by capacity.',
        id: 'Stok pada pembaruan terakhir − ASN yang dikirim sejak itu + kedatangan ke distributor + produksi selesai, dibatasi kapasitas.'
      },
      notToConfuse: {
        en: 'PTI inbound (already left the supplier; the two are never added).',
        id: 'Masuk ke PTI (sudah keluar dari pemasok; keduanya tidak pernah dijumlahkan).'
      }
    },
    calledOffNotShipped: {
      label: { en: 'Already called off, not shipped', id: 'Sudah di-call-off, belum dikirim' },
      en: 'Confirmed call-offs for the material from this supplier that no shipping notice covers yet.',
      id: 'Call-off terkonfirmasi untuk material dari pemasok ini yang belum ditutup pemberitahuan pengiriman.'
    },
    freeToCallOff: {
      label: { en: 'Free to call off', id: 'Bebas untuk call-off' },
      en: 'What PTI can still call off from the supplier’s estimated stock, after the call-offs already confirmed.',
      id: 'Yang masih dapat di-call-off PTI dari perkiraan stok pemasok, setelah call-off yang sudah dikonfirmasi.',
      formula: {
        en: 'Supplier available − already called off, not shipped.',
        id: 'Tersedia di pemasok − sudah di-call-off, belum dikirim.'
      }
    },
    ptiInbound: {
      label: { en: 'PTI inbound', id: 'Masuk ke PTI' },
      en: 'The quantity already shipped to PTI and not yet arrived on the check date.',
      id: 'Kuantitas yang sudah dikirim ke PTI dan belum tiba pada tanggal cek.',
      formula: {
        en: 'Open shipping notices and dispatched call-offs with an ETA on or after the check date.',
        id: 'Pemberitahuan pengiriman terbuka dan call-off yang dikirim dengan ETA pada atau setelah tanggal cek.'
      },
      notToConfuse: {
        en: 'Supplier available (stock still at the supplier; the two are never added).',
        id: 'Tersedia di pemasok (stok yang masih di pemasok; keduanya tidak pernah dijumlahkan).'
      }
    },
    simulationBasis: {
      label: { en: 'Basis', id: 'Dasar' },
      en: 'Whether the row is worked out from the supplier’s data only, or also from a figure the planner entered for this simulation.',
      id: 'Apakah baris dihitung dari data pemasok saja, atau juga dari angka yang dimasukkan perencana untuk simulasi ini.'
    },
    simulationFlags: {
      label: { en: 'Flags', id: 'Tanda' },
      en: 'Inputs missing or adjusted in the row’s calculation, such as a missing ETA or production capped by capacity.',
      id: 'Input yang tidak ada atau disesuaikan dalam perhitungan baris, misalnya ETA belum ada atau produksi dibatasi kapasitas.'
    },
    supplierOwnRop: {
      label: { en: 'Your reorder point', id: 'Titik pemesanan ulang Anda' },
      en: 'The reorder point you entered in the stock template. It is shown only: alerts compare your stock with the ROP Supplier the hub calculates.',
      id: 'Titik pemesanan ulang yang Anda isi di template stok. Hanya ditampilkan: peringatan membandingkan stok Anda dengan ROP Supplier yang dihitung hub.',
      alsoCalled: [
        {
          name: 'ROP PM in Supplier',
          source: TEAM
        }
      ],
      notToConfuse: {
        en: 'ROP Supplier (the figure the hub calculates).',
        id: 'ROP Supplier (angka yang dihitung hub).'
      }
    },
    ptiStock: {
      label: { en: 'PTI stock', id: 'Stok PTI' },
      en: 'PTI’s own stock on hand of the material, shown when PTI shares it with you.',
      id: 'Stok on hand PTI sendiri untuk material itu, ditampilkan bila PTI membagikannya kepada Anda.',
      alsoCalled: [{ name: 'PTI SOH', source: MAT_ALERTS }],
      labelKeys: ['inv.col.ptiSoh']
    },
    ptiRop: {
      label: { en: 'PTI ROP', id: 'ROP PTI' },
      en: 'The stock level at which PTI reorders the material. It comes from SAP until PTI’s forecast engine calculates it.',
      id: 'Tingkat stok saat PTI memesan ulang material itu. Diambil dari SAP sampai mesin prakiraan PTI menghitungnya.',
      notToConfuse: NOT_TEAM_ROPS
    },
    daysOfSupply: {
      label: { en: 'Days of supply', id: 'Hari persediaan' },
      en: 'How many days the stock lasts at the material’s average daily demand.',
      id: 'Berapa hari stok bertahan pada rata-rata permintaan harian material.',
      formula: {
        en: 'Stock ÷ average daily demand, where average daily demand = the forecast for the next 30 days ÷ 30.',
        id: 'Stok ÷ rata-rata permintaan harian, dengan rata-rata permintaan harian = prakiraan 30 hari ke depan ÷ 30.'
      }
    },
    feedstockLatest: {
      label: { en: 'Latest confirmation', id: 'Konfirmasi terakhir' },
      en: 'The feedstock quantity last confirmed for the material, with the date it is confirmed as of.',
      id: 'Kuantitas feedstock yang terakhir dikonfirmasi untuk material itu, beserta tanggal konfirmasinya.'
    },
    feedstockThisWeek: {
      label: { en: 'This week', id: 'Minggu ini' },
      en: 'Whether this cycle’s feedstock confirmation is done: Confirmed, Due or Missed. The cycle is daily on a pull agreement, else weekly with the stock update.',
      id: 'Apakah konfirmasi feedstock siklus ini sudah dilakukan: Dikonfirmasi, Jatuh tempo, atau Terlewat. Siklusnya harian untuk perjanjian pull, selain itu mingguan bersama pembaruan stok.'
    },
    tradeNameStatus: {
      label: { en: 'Status', id: 'Status' },
      en: 'Where the supplier’s trade name for the material stands: awaiting PTI’s approval, approved, rejected, replaced, or no name yet.',
      id: 'Posisi nama dagang pemasok untuk material itu: menunggu persetujuan PTI, disetujui, ditolak, digantikan, atau belum ada nama.'
    },
    // ── Wave 3: Foresight, MoM 1 and 2 (Goal C): capacity, safety stock and
    // ROPs, call-offs, feedstock reconcile ───────────────────────────────────
    capacityLtp: {
      label: { en: 'LTP, current forecast', id: 'LTP, prakiraan saat ini' },
      en: 'The LTP of the week for the planning group: the current forecast the supplier commits against.',
      id: 'LTP minggu itu untuk grup perencanaan: prakiraan terkini yang menjadi dasar komitmen pemasok.',
      formula: {
        en: 'The sum of the supplier’s LTP for every material of the group, each period spread evenly over its days.',
        id: 'Jumlah LTP pemasok untuk setiap material grup, tiap periode dibagi rata ke hari-harinya.'
      }
    },
    allocatedCapacity: {
      label: { en: 'Allocated', id: 'Dialokasikan' },
      en: 'The production capacity the supplier allocates to PTI for the planning group in the week.',
      id: 'Kapasitas produksi yang dialokasikan pemasok untuk PTI bagi grup perencanaan pada minggu itu.',
      notToConfuse: {
        en: 'Additional capacity (more the supplier could give on request).',
        id: 'Kapasitas tambahan (lebih yang dapat diberikan pemasok bila diminta).'
      },
      labelKeys: ['inv.capacity.row.allocated']
    },
    productionLimit: {
      label: {
        en: 'Production limit (allocated capacity)',
        id: 'Batas produksi (kapasitas dialokasikan)'
      },
      en: 'The most the supplier can produce for PTI in the week. Until the team names its source, it is the supplier’s allocated capacity.',
      id: 'Jumlah terbanyak yang dapat diproduksi pemasok untuk PTI pada minggu itu. Sampai tim menyebut sumbernya, nilainya adalah kapasitas yang dialokasikan pemasok.'
    },
    additionalCapacity: {
      label: { en: 'Additional capacity', id: 'Kapasitas tambahan' },
      en: 'Extra capacity the supplier could give PTI on request, above its allocation.',
      id: 'Kapasitas lebih yang dapat diberikan pemasok kepada PTI bila diminta, di atas alokasinya.',
      labelKeys: ['inv.capacity.row.upside']
    },
    capacityBe: {
      label: { en: 'BE = capacity + additional', id: 'BE = kapasitas + tambahan' },
      en: 'The supplier’s total for the week. It is worked out, never entered.',
      id: 'Total pemasok untuk minggu itu. Dihitung, tidak pernah diisi.',
      formula: {
        en: 'Allocated + additional capacity.',
        id: 'Dialokasikan + kapasitas tambahan.'
      }
    },
    ltpAgainstCapacity: {
      label: { en: 'LTP against capacity', id: 'LTP terhadap kapasitas' },
      en: 'Whether the week’s LTP fits: Within capacity; Needs additional capacity when it is above capacity up to BE; Cannot be supplied when it is above BE.',
      id: 'Apakah LTP minggu itu muat: Dalam kapasitas; Perlu kapasitas tambahan bila di atas kapasitas sampai BE; Tidak dapat dipasok bila di atas BE.'
    },
    capacityShortBy: {
      label: { en: 'Short by', id: 'Kurang' },
      en: 'How much the week’s LTP is above the allocated capacity, on a gap week.',
      id: 'Seberapa besar LTP minggu itu di atas kapasitas yang dialokasikan, pada minggu yang kurang.',
      formula: { en: 'LTP − allocated.', id: 'LTP − dialokasikan.' },
      notToConfuse: {
        en: 'Gap on the Demand anticipation grid (demand anticipation (DA) − open supply).',
        id: 'Kekurangan di grid Demand anticipation (demand anticipation (DA) − pasokan terbuka).'
      }
    },
    ptiCapacityDecision: {
      label: { en: 'PTI’s decision', id: 'Keputusan PTI' },
      en: 'What PTI recorded on a gap week: accept the additional capacity, or ask the supplier. An accepted week inside BE no longer raises the capacity alert.',
      id: 'Yang dicatat PTI pada minggu yang kurang: menerima kapasitas tambahan, atau bertanya ke pemasok. Minggu yang diterima di dalam BE tidak lagi memunculkan peringatan kapasitas.'
    },
    runOutRemaining: {
      label: { en: 'Remaining', id: 'Sisa' },
      en: 'What is left on the blanket PO line: its quantity, or its value for a value-only line.',
      id: 'Yang tersisa di baris PO induk: kuantitasnya, atau nilainya untuk baris yang hanya bernilai.',
      formula: {
        en: 'PO quantity − released call-off quantity.',
        id: 'Kuantitas PO − kuantitas call-off yang dirilis.'
      },
      notToConfuse: {
        en: 'Carry-over (also called sisa DA, on the Demand anticipation grid).',
        id: 'Carry-over (disebut juga sisa DA, di grid Demand anticipation).'
      }
    },
    runsOut: {
      label: { en: 'Runs out', id: 'Habis' },
      en: 'The first week the blanket PO’s projected balance goes below zero, if call-offs follow the LTP.',
      id: 'Minggu pertama saldo proyeksi PO induk turun di bawah nol, bila call-off mengikuti LTP.',
      formula: {
        en: 'Remaining − the LTP of each week in turn, oldest PO line first.',
        id: 'Sisa − LTP tiap minggu berurutan, baris PO tertua lebih dulu.'
      }
    },
    newPoNeededBy: {
      label: { en: 'New PO needed by', id: 'PO baru diperlukan paling lambat' },
      en: 'The week by which the next PO must be raised so it arrives before the blanket PO runs out.',
      id: 'Minggu paling lambat PO berikutnya harus dibuat agar tiba sebelum PO induk habis.',
      formula: {
        en: 'Run-out week − the PO lead time.',
        id: 'Minggu habis − lead time PO.'
      }
    },
    poLeadTime: {
      label: { en: 'PO lead time', id: 'Lead time PO' },
      en: 'The time from raising a PO to its arrival, from the material master; 2 weeks where it is missing.',
      id: 'Waktu dari pembuatan PO sampai kedatangannya, dari data induk material; 2 minggu bila tidak ada.'
    },
    spaceFreed: {
      label: {
        en: 'Warehouse space freed against SAP',
        id: 'Ruang gudang yang dibebaskan dibanding SAP'
      },
      en: 'How many fewer pallets the engine’s safety stock needs than SAP’s safety stock, over the materials shown.',
      id: 'Berapa palet lebih sedikit yang dibutuhkan stok pengaman mesin dibanding stok pengaman SAP, pada material yang ditampilkan.',
      formula: {
        en: 'SAP safety stock in pallets − engine safety stock in pallets.',
        id: 'Stok pengaman SAP dalam palet − stok pengaman mesin dalam palet.'
      }
    },
    materialsPerTier: {
      label: { en: 'Materials per tier', id: 'Material per tingkat' },
      en: 'How many materials sit in each service tier: 95% high volume, 90% standard, 85% slow moving.',
      id: 'Berapa material di tiap tingkat layanan: 95% volume tinggi, 90% standar, 85% lambat bergerak.'
    },
    onSapValue: {
      label: { en: 'On SAP’s value', id: 'Memakai nilai SAP' },
      en: 'Materials with too little history for the engine, which keep SAP’s safety stock until they have enough.',
      id: 'Material dengan riwayat yang belum cukup bagi mesin, yang memakai stok pengaman SAP sampai cukup.'
    },
    sltGroupDefault: {
      label: {
        en: 'Safety lead time from the group default',
        id: 'Safety lead time dari nilai bawaan grup'
      },
      en: 'Materials whose supplier has too few receipts, so their safety lead time is the material group’s pooled figure.',
      id: 'Material yang pemasoknya punya terlalu sedikit penerimaan, sehingga safety lead time-nya adalah angka gabungan grup material.'
    },
    tierTarget: {
      label: { en: 'Tier and target', id: 'Tingkat dan target' },
      en: 'The material’s service tier and its fill-rate target: the share of demand to fill from stock.',
      id: 'Tingkat layanan material dan target fill rate-nya: porsi permintaan yang dipenuhi dari stok.'
    },
    safetyOrderRopOrder: {
      label: { en: 'Safety order', id: 'Safety order' },
      en: 'The safety part of ROP Order: extra quantity against demand above the LTP.',
      id: 'Bagian pengaman dari ROP Order: kuantitas tambahan untuk permintaan di atas LTP.',
      formula: {
        en: 'Z × √lead time × SD of the LTP over the next 13 weeks, rounded up to the MPQ.',
        id: 'Z × √lead time × SD LTP 13 minggu ke depan, dibulatkan ke atas ke MPQ.'
      },
      notToConfuse: {
        en: 'ROP Order itself (LTP × lead time + safety order). Safety stock (the engine’s figure, same table).',
        id: 'ROP Order itu sendiri (LTP × lead time + safety order). Safety stock (angka mesin, tabel yang sama).'
      }
    },
    ropFisikSafety: {
      label: { en: 'Safety ROP Fisik', id: 'Safety ROP Fisik' },
      en: 'The safety part of ROP Fisik, in days of demand.',
      id: 'Bagian pengaman dari ROP Fisik, dalam hari permintaan.',
      formula: {
        en: 'Ceiling(g × min(highest recent consumption, capacity, LTP), MPQ); g is 1 day unless set per material.',
        id: 'Ceiling(g × min(konsumsi tertinggi terakhir, kapasitas, LTP), MPQ); g 1 hari kecuali diatur per material.'
      }
    },
    demandCv: {
      label: { en: 'Demand CV', id: 'CV permintaan' },
      en: 'How much demand varies: below 0.5 is stable, 0.5 or more is fluctuative.',
      id: 'Seberapa besar permintaan bervariasi: di bawah 0,5 stabil, 0,5 atau lebih fluktuatif.',
      formula: {
        en: 'SD ÷ average of demand over the last 6 full months, per FG variant.',
        id: 'SD ÷ rata-rata permintaan 6 bulan penuh terakhir, per varian FG.'
      },
      alsoCalled: [
        {
          name: 'CV',
          source: TEAM
        }
      ]
    },
    osipLevel: {
      label: { en: 'OSIP level', id: 'Level OSIP' },
      en: 'The material’s supply model, which sets how its ROPs are worked out: levels 3–4 modal sharing, then fixed order, then JIT. Level 4 unless the planner sets it.',
      id: 'Model pasokan material, yang menentukan cara ROP-nya dihitung: level 3–4 modal sharing, lalu fixed order, lalu JIT. Level 4 kecuali diatur perencana.',
      alsoCalled: [
        {
          name: 'Level OSIP',
          source: TEAM
        }
      ],
      notToConfuse: {
        en: 'Forecast level (the hierarchy level on the Demand forecast page).',
        id: 'Level prakiraan (level hierarki di halaman Demand forecast).'
      }
    },
    ropOrder: {
      label: { en: 'ROP Order', id: 'ROP Order' },
      en: 'The reorder point for ordering: the input to ZPE007, the SAP MRP step that works out PRs. The hub does not run ZPE007.',
      id: 'Titik pemesanan ulang untuk pemesanan: input bagi ZPE007, langkah MRP SAP yang menghitung PR. Hub tidak menjalankan ZPE007.',
      formula: {
        en: 'LTP × lead time PO→ETA + safety order.',
        id: 'LTP × lead time PO→ETA + safety order.'
      },
      notToConfuse: {
        en: 'ROP Fisik (the call-off trigger). Reorder point (the engine’s figure, same table).',
        id: 'ROP Fisik (pemicu call-off). Titik pesan ulang (angka mesin, tabel yang sama).'
      }
    },
    ropFisik: {
      label: { en: 'ROP Fisik', id: 'ROP Fisik' },
      en: 'The physical reorder point: when stock on hand reaches it, the hub drafts a call-off.',
      id: 'Titik pemesanan ulang fisik: bila stok on hand mencapainya, hub menyusun draf call-off.',
      formula: {
        en: 'Ceiling(demand × f) × MPQ + ROP Fisik safety.',
        id: 'Ceiling(permintaan × f) × MPQ + ROP Fisik safety.'
      },
      notToConfuse: {
        en: 'ROP Order (the input to SAP MRP).',
        id: 'ROP Order (input untuk MRP SAP).'
      },
      labelKeys: ['co.trigger.ropFisik']
    },
    maxStock: {
      label: { en: 'Max Stock', id: 'Max Stock' },
      en: 'The most PTI holds of the material: no call-off takes projected stock above it.',
      id: 'Jumlah terbanyak material yang disimpan PTI: tidak ada call-off yang membawa proyeksi stok di atasnya.',
      formula: {
        en: 'Local: ROP Fisik rounded up to the koli. Import: rounded up to the MOQ.',
        id: 'Lokal: ROP Fisik dibulatkan ke atas ke koli. Impor: dibulatkan ke atas ke MOQ.'
      },
      notToConfuse: {
        en: 'Max Stock Supplier (what the supplier may hold, on the Feedstock reconcile page).',
        id: 'Max Stock Supplier (yang boleh disimpan pemasok, di halaman Feedstock reconcile).'
      },
      labelKeys: ['co.trigger.max']
    },
    engineSafetyStock: {
      label: { en: 'Safety stock', id: 'Stok pengaman' },
      en: 'The engine’s challenger figure: the forecast error PTI’s own history exceeds only as often as the tier’s fill rate allows.',
      id: 'Angka penantang dari mesin: kesalahan prakiraan yang dilampaui riwayat PTI sendiri hanya sesering yang diizinkan fill rate tingkatnya.',
      formula: {
        en: 'The shortfalls (actual − forecast) over lead time + review at past points, taken at the fill-rate percentile.',
        id: 'Kekurangan (aktual − prakiraan) selama lead time + tinjauan di titik-titik lampau, diambil pada persentil fill rate.'
      },
      notToConfuse: {
        en: 'Safety order (the team’s rule, the default, same table).',
        id: 'Safety order (aturan tim, nilai bawaan, tabel yang sama).'
      }
    },
    sapSafetyStock: {
      label: { en: 'SAP safety stock', id: 'Stok pengaman SAP' },
      en: 'The safety stock set in SAP today, shown for comparison.',
      id: 'Stok pengaman yang diatur di SAP saat ini, ditampilkan sebagai pembanding.'
    },
    freed: {
      label: { en: 'Freed', id: 'Dibebaskan' },
      en: 'How much less stock the engine’s safety stock asks for than SAP’s.',
      id: 'Seberapa sedikit stok yang diminta stok pengaman mesin dibanding SAP.',
      formula: { en: 'SAP safety stock − safety stock.', id: 'Stok pengaman SAP − stok pengaman.' }
    },
    safetyLeadTime: {
      label: { en: 'Safety lead time', id: 'Safety lead time' },
      en: 'Extra time added for a supplier that delivers late, instead of extra stock.',
      id: 'Waktu tambahan untuk pemasok yang terlambat mengirim, sebagai pengganti stok tambahan.',
      formula: {
        en: 'The delay between confirmed and actual receipt date that is exceeded only as often as allowed, per supplier and material group.',
        id: 'Keterlambatan antara tanggal konfirmasi dan tanggal terima aktual yang dilampaui hanya sesering yang diizinkan, per pemasok dan grup material.'
      }
    },
    engineReorderPoint: {
      label: { en: 'Reorder point', id: 'Titik pesan ulang' },
      en: 'The engine’s challenger stock level at which a new order should be released.',
      id: 'Tingkat stok penantang dari mesin saat pesanan baru sebaiknya dirilis.',
      formula: {
        en: 'Expected demand over the lead time and the review week + safety stock.',
        id: 'Perkiraan permintaan selama lead time dan minggu tinjauan + stok pengaman.'
      },
      notToConfuse: {
        en: 'ROP Order or ROP Fisik (the team’s ROPs, the default, same table).',
        id: 'ROP Order atau ROP Fisik (ROP tim, nilai bawaan, tabel yang sama).'
      }
    },
    forecastShortfall: {
      label: { en: 'Shortfall', id: 'Kekurangan' },
      en: 'At one past point, how much actual demand over the lead time and review exceeded the forecast. The safety stock is read from these.',
      id: 'Pada satu titik lampau, seberapa besar permintaan aktual selama lead time dan tinjauan melebihi prakiraan. Stok pengaman dibaca dari angka-angka ini.',
      formula: { en: 'Actual − forecast.', id: 'Aktual − prakiraan.' }
    },
    ropSupplier: {
      label: { en: 'ROP Supplier', id: 'ROP Supplier' },
      en: 'The supplier’s total physical maximum stock of the material, worked out by the hub.',
      id: 'Total stok fisik maksimum pemasok untuk material itu, dihitung oleh hub.',
      formula: {
        en: 'Demand × the supplier’s bottleneck production lead time, queueing included.',
        id: 'Permintaan × lead time produksi bottleneck pemasok, termasuk antrean.'
      },
      notToConfuse: {
        en: 'The reorder point the supplier types in its stock template (shown only).',
        id: 'Titik pemesanan ulang yang diketik pemasok di template stoknya (hanya ditampilkan).'
      }
    },
    ropToPrincipal: {
      label: { en: 'ROP order to principal', id: 'ROP order to principal' },
      en: 'A distributor’s reorder point for ordering from its principal, as the team’s sheet works it out. The team has not answered how it is set.',
      id: 'Titik pemesanan ulang distributor untuk memesan ke prinsipalnya, sebagaimana dihitung sheet tim. Tim belum menjawab cara penetapannya.'
    },
    replenishmentCycle: {
      label: { en: 'Cycle replenishment (f)', id: 'Cycle replenishment (f)' },
      en: 'How often the supplier replenishes PTI, which sizes ROP Fisik. The slide values are assumptions to treat as data.',
      id: 'Seberapa sering pemasok mengisi ulang PTI, yang menentukan besar ROP Fisik. Nilai di slide adalah asumsi yang diperlakukan sebagai data.',
      alsoCalled: [{ name: 'call-off lead time', source: TEAM }]
    },
    pullAgreement: {
      label: { en: 'Pull agreement', id: 'Perjanjian tarik' },
      en: 'Whether the supplier works on a pull agreement. A supplier on one updates stock and confirms feedstock daily; others weekly.',
      id: 'Apakah pemasok bekerja dengan perjanjian pull. Pemasok dengan perjanjian ini memperbarui stok dan mengonfirmasi feedstock setiap hari; lainnya mingguan.'
    },
    bottleneckLeadTime: {
      label: {
        en: 'Bottleneck production lead time (ROP Supplier)',
        id: 'Lead time produksi bottleneck (ROP Supplier)'
      },
      en: 'The time the supplier’s slowest production step takes, queueing included. It sizes ROP Supplier and has no default.',
      id: 'Waktu yang dibutuhkan langkah produksi paling lambat pemasok, termasuk antrean. Menentukan besar ROP Supplier dan tidak punya nilai bawaan.'
    },
    monthLtp: {
      label: { en: 'LTP', id: 'LTP' },
      en: 'The material’s LTP for the month, for this supplier.',
      id: 'LTP material untuk bulan itu, untuk pemasok ini.'
    },
    protectionBaseline: {
      label: { en: 'Baseline', id: 'Baseline' },
      en: 'The normal monthly LTP the protection buffer is measured from.',
      id: 'LTP bulanan normal yang menjadi dasar protection buffer.',
      formula: {
        en: 'Average LTP of the 3 previous months.',
        id: 'Rata-rata LTP 3 bulan sebelumnya.'
      }
    },
    uplift: {
      label: { en: 'Uplift', id: 'Uplift' },
      en: 'How far the month’s LTP is above the baseline.',
      id: 'Seberapa jauh LTP bulan itu di atas baseline.',
      formula: { en: 'max(0, LTP − baseline).', id: 'max(0, LTP − baseline).' }
    },
    protectionBuffer: {
      label: { en: 'Protection buffer', id: 'Protection buffer' },
      en: 'A buffer against a jump in demand, for materials at levels 5 to 7. Proposed and shown only: nothing is ordered from it.',
      id: 'Buffer untuk lonjakan permintaan, bagi material level 5 sampai 7. Usulan dan hanya ditampilkan: tidak ada yang dipesan darinya.',
      formula: {
        en: 'Ceiling(uplift, production MPQ).',
        id: 'Ceiling(uplift, MPQ produksi).'
      },
      alsoCalled: [
        {
          name: 'risk protection',
          source: TEAM
        }
      ]
    },
    strategicBaseline: {
      label: { en: 'Baseline', id: 'Baseline' },
      en: 'The normal monthly LTP before a festive window, which the strategic buffer is measured from.',
      id: 'LTP bulanan normal sebelum periode festive, yang menjadi dasar strategic buffer.',
      formula: {
        en: 'Average LTP of the 3 months before the festive window.',
        id: 'Rata-rata LTP 3 bulan sebelum periode festive.'
      }
    },
    strategicBuffer: {
      label: { en: 'Strategic buffer', id: 'Strategic buffer' },
      en: 'Stock built up for a festive window such as CNY. Shown only: nothing is ordered from it.',
      id: 'Stok yang dibangun untuk periode festive seperti CNY. Hanya ditampilkan: tidak ada yang dipesan darinya.',
      formula: { en: 'LTP − baseline.', id: 'LTP − baseline.' }
    },
    poOrdered: {
      label: { en: 'PO ordered', id: 'Dipesan di PO' },
      en: 'The quantity on the supplier’s PO lines for the material, rejected POs left out.',
      id: 'Kuantitas pada baris PO pemasok untuk material itu, tanpa PO yang ditolak.'
    },
    reconcileCalledOff: {
      label: { en: 'Called off', id: 'Di-call-off' },
      en: 'The quantity requested on released call-offs.',
      id: 'Kuantitas yang diminta pada call-off yang dirilis.'
    },
    asnRequested: {
      label: { en: 'ASN requested', id: 'Diminta di ASN' },
      en: 'The quantity on the supplier’s shipping notices: Submitted, In Transit, Delivered or Discrepancy.',
      id: 'Kuantitas pada pemberitahuan pengiriman pemasok: Submitted, In Transit, Delivered, atau Discrepancy.'
    },
    notYetCalledOff: {
      label: { en: 'Not yet called off', id: 'Belum di-call-off' },
      en: 'What is left on the PO that no call-off has asked for yet: the remainder.',
      id: 'Sisa di PO yang belum diminta call-off mana pun.',
      formula: {
        en: 'PO ordered − called off, never below 0.',
        id: 'Dipesan di PO − di-call-off, tidak pernah di bawah 0.'
      }
    },
    maxStockSupplier: {
      label: { en: 'Max Stock Supplier', id: 'Max Stock Supplier' },
      en: 'The most the supplier may hold for PTI of the material, set by Procurement. Shown only: it caps nothing.',
      id: 'Jumlah terbanyak material yang boleh disimpan pemasok untuk PTI, diatur Procurement. Hanya ditampilkan: tidak membatasi apa pun.',
      notToConfuse: {
        en: 'Max Stock (what PTI holds, on the Safety stock page).',
        id: 'Max Stock (yang disimpan PTI, di halaman Safety stock).'
      }
    },
    // ── Wave 4: Foresight (Goal C): what-if, stabilise, supplier forecasts ────
    whatIfMax: {
      label: { en: 'Max Stock', id: 'Max Stock' },
      en: 'The most PTI should hold of the material; the call-off trigger and "weeks above Max" use it. A typed value replaces the system’s.',
      id: 'Jumlah terbanyak material yang sebaiknya disimpan PTI; pemicu call-off dan "minggu di atas Max" memakainya. Nilai yang diketik menggantikan nilai sistem.',
      formula: {
        en: 'Local: ROP Fisik rounded up to the koli. Import: rounded up to the MOQ.',
        id: 'Lokal: ROP Fisik dibulatkan ke atas ke koli. Impor: dibulatkan ke atas ke MOQ.'
      }
    },
    // BL-249 (U-10): the headline is the total before the plan check, the weeks
    // grid the DA after it, so both labels name their side of the check. TL-D1's
    // "Demand anticipation (DA) over the lead time" stays; the qualifier is added.
    daOverLeadTime: {
      label: {
        en: 'Demand anticipation (DA) over the lead time, before the check',
        id: 'Demand anticipation (DA) sepanjang lead time, sebelum pemeriksaan'
      },
      en: 'The sum of the weekly demand anticipation (DA) across the lead-time horizon, before the plan check absorbs any surplus in the last week. The weekly rows below are after the check and can add up to less.',
      id: 'Jumlah demand anticipation (DA) mingguan sepanjang horizon lead time, sebelum pemeriksaan rencana menyerap kelebihan di minggu terakhir. Baris mingguan di bawah adalah setelah pemeriksaan dan jumlahnya bisa lebih kecil.',
      alsoCalled: [
        {
          name: 'Total DA',
          source: TEAM
        }
      ],
      notToConfuse: NOT_DELIVERY_AGREEMENT
    },
    prGenerated: {
      label: { en: 'PR Generated', id: 'PR Generated' },
      en: 'The PR quantity SAP’s ZPE007 would raise from ROP Order. Shown as a positive quantity; the team’s slide writes the same need as a negative number.',
      id: 'Kuantitas PR yang akan dibuat ZPE007 SAP dari ROP Order. Ditampilkan sebagai kuantitas positif; slide tim menulis kebutuhan yang sama sebagai angka negatif.',
      formula: {
        en: 'ROP Order − SOH − OSPO − OSPR, never below 0.',
        id: 'ROP Order − SOH − OSPO − OSPR, tidak pernah di bawah 0.'
      }
    },
    planCheckPr: {
      label: { en: 'Plan check: PR recommendation', id: 'Pemeriksaan rencana: rekomendasi PR' },
      en: 'What the plan check recommends raising as a PR when supply falls short of the demand anticipation (DA). A surplus is absorbed in the last week instead.',
      id: 'Yang direkomendasikan pemeriksaan rencana untuk dibuat sebagai PR bila pasokan kurang dari demand anticipation (DA). Kelebihan diserap di minggu terakhir.',
      formula: {
        en: 'Total DA − Total OSPO, never below 0 (the default supply basis).',
        id: 'Total DA − Total OSPO, tidak pernah di bawah 0 (dasar pasokan bawaan).'
      }
    },
    triggerCallOffs: {
      label: { en: 'Call-offs the trigger would draft', id: 'Call-off yang akan dibuat pemicu' },
      en: 'The total of the call-offs the hub would draft over the horizon: one each time projected stock reaches ROP Fisik, never above Max.',
      id: 'Total call-off yang akan disusun hub sepanjang horizon: satu setiap kali proyeksi stok mencapai ROP Fisik, tidak pernah di atas Max.'
    },
    triggerPr: {
      label: { en: 'Trigger: create a PR in SAP for', id: 'Pemicu: buat PR di SAP sebesar' },
      en: 'The quantity the trigger could not call off because no blanket PO balance is left, so it recommends a PR in SAP.',
      id: 'Kuantitas yang tidak dapat di-call-off pemicu karena saldo PO induk sudah habis, sehingga ia merekomendasikan PR di SAP.'
    },
    whatIfRemainder: {
      label: { en: 'Remainder this week', id: 'Sisa minggu ini' },
      en: 'What this week’s demand anticipation (DA) leaves after its call-offs.',
      id: 'Yang tersisa dari demand anticipation (DA) minggu ini setelah call-off-nya.',
      formula: {
        en: 'DA of the week − call-offs of the week.',
        id: 'DA minggu itu − call-off minggu itu.'
      },
      alsoCalled: [
        {
          name: 'sisa',
          source: TEAM
        }
      ],
      notToConfuse: {
        en: 'Carry-over (the part of a remainder moved to a later week).',
        id: 'Carry-over (bagian sisa yang dipindahkan ke minggu berikutnya).'
      }
    },
    whatIfCarryOver: {
      label: { en: 'Carry-over', id: 'Carry-over' },
      en: 'The part of this week’s remainder moved to a later week: the last week of the horizon, or the first week after it when the supplier agrees.',
      id: 'Bagian sisa minggu ini yang dipindahkan ke minggu berikutnya: minggu terakhir horizon, atau minggu pertama setelahnya bila pemasok setuju.',
      alsoCalled: [
        {
          name: 'sisa DA',
          source: TEAM
        }
      ]
    },
    firstShortageWeek: {
      label: { en: 'First shortage week', id: 'Minggu kekurangan pertama' },
      en: 'The first week projected stock on hand falls below the shortage level, if any.',
      id: 'Minggu pertama proyeksi stok on hand turun di bawah tingkat kekurangan, bila ada.'
    },
    weeksAboveMax: {
      label: { en: 'Weeks above Max', id: 'Minggu di atas Max' },
      en: 'The weeks projected stock on hand is above Max.',
      id: 'Minggu-minggu proyeksi stok on hand di atas Max.'
    },
    whatIfLtp: {
      label: { en: 'LTP (edit)', id: 'LTP (ubah)' },
      en: 'The current forecast quantity of the material for the week, for this supplier. Type another value to try it; the plan does not change.',
      id: 'Kuantitas prakiraan terkini material untuk minggu itu, untuk pemasok ini. Ketik nilai lain untuk mencobanya; rencana tidak berubah.'
    },
    // BL-249 (U-10): "after the check" as on the history page (TL-D13).
    daCurrentPlan: {
      label: {
        en: 'Demand anticipation (DA) after the check, current plan',
        id: 'Demand anticipation (DA) setelah pemeriksaan, rencana saat ini'
      },
      en: 'The weekly demand anticipation (DA) the live plan gives after the plan check absorbed any surplus in the horizon’s last week, for comparison. The total before the check is in the results above.',
      id: 'Demand anticipation (DA) mingguan dari rencana yang berjalan setelah pemeriksaan rencana menyerap kelebihan di minggu terakhir horizon, sebagai pembanding. Total sebelum pemeriksaan ada di hasil di atas.',
      notToConfuse: NOT_DELIVERY_AGREEMENT
    },
    daScenario: {
      label: {
        en: 'Demand anticipation (DA) after the check, this scenario',
        id: 'Demand anticipation (DA) setelah pemeriksaan, skenario ini'
      },
      en: 'The weekly demand anticipation (DA) under the inputs and rules of this scenario, after the plan check absorbed any surplus in the horizon’s last week. The total before the check is in the results above.',
      id: 'Demand anticipation (DA) mingguan dengan input dan aturan skenario ini, setelah pemeriksaan rencana menyerap kelebihan di minggu terakhir horizon. Total sebelum pemeriksaan ada di hasil di atas.',
      notToConfuse: NOT_DELIVERY_AGREEMENT
    },
    callOffsDrafted: {
      label: { en: 'Call-offs drafted', id: 'Call-off dibuat' },
      en: 'The call-off quantity the trigger would draft in the week.',
      id: 'Kuantitas call-off yang akan disusun pemicu pada minggu itu.'
    },
    whatIfIncoming: {
      label: { en: 'Incoming', id: 'Incoming' },
      en: 'What arrives at PTI in the week: released call-offs plus the call-offs the trigger drafts.',
      id: 'Yang tiba di PTI pada minggu itu: call-off yang dirilis ditambah call-off yang disusun pemicu.',
      notToConfuse: {
        en: 'Incoming DA (the supplier-confirmed figure).',
        id: 'Incoming DA (angka yang dikonfirmasi pemasok).'
      }
    },
    prRecommendedWeek: {
      label: { en: 'PR recommended', id: 'PR direkomendasikan' },
      en: 'The PR quantity the trigger recommends in the week, where no blanket PO balance is left to call off.',
      id: 'Kuantitas PR yang direkomendasikan pemicu pada minggu itu, bila saldo PO induk tidak tersisa untuk di-call-off.'
    },
    projectedSohPlan: {
      label: { en: 'Projected SOH, current plan', id: 'Proyeksi SOH, rencana saat ini' },
      en: 'PTI’s stock on hand projected to the end of the week under the live plan.',
      id: 'Stok on hand PTI yang diproyeksikan sampai akhir minggu dengan rencana yang berjalan.'
    },
    projectedSohScenario: {
      label: { en: 'Projected SOH, this scenario', id: 'Proyeksi SOH, skenario ini' },
      en: 'PTI’s stock on hand projected to the end of the week under this scenario.',
      id: 'Stok on hand PTI yang diproyeksikan sampai akhir minggu dengan skenario ini.',
      formula: {
        en: 'Last week’s projected SOH + incoming − LTP of the week.',
        id: 'Proyeksi SOH minggu lalu + incoming − LTP minggu itu.'
      }
    },
    engineValue: {
      label: { en: 'Engine value', id: 'Nilai mesin' },
      en: 'The quantity the forecast engine calculated for the week, before stabilising.',
      id: 'Kuantitas yang dihitung mesin prakiraan untuk minggu itu, sebelum distabilkan.'
    },
    lastPublished: {
      label: { en: 'Last published', id: 'Terakhir diterbitkan' },
      en: 'The quantity the supplier saw for the week in the last published version.',
      id: 'Kuantitas yang dilihat pemasok untuk minggu itu pada versi terakhir yang diterbitkan.'
    },
    firstPublished: {
      label: { en: 'First published', id: 'Pertama diterbitkan' },
      en: 'The first quantity the supplier saw for the week. The ±20% limit is measured from it.',
      id: 'Kuantitas pertama yang dilihat pemasok untuk minggu itu. Batas ±20% diukur darinya.'
    },
    dampedValue: {
      label: { en: 'Damped', id: 'Diredam' },
      en: 'A damped Zone Capacity week’s new value blended with its last published value, so the plan moves less.',
      id: 'Nilai baru minggu diredam Zone Capacity yang dicampur dengan nilai terakhir yang diterbitkan, agar rencana tidak banyak bergerak.',
      formula: {
        en: 'Weight × last published + (1 − weight) × engine value; weight 0.5 in the damped weeks of Zone Capacity, 0 in its later weeks.',
        id: 'Bobot × terakhir diterbitkan + (1 − bobot) × nilai mesin; bobot 0,5 di minggu diredam Zone Capacity, 0 di minggu berikutnya.'
      }
    },
    allowedRange: {
      label: { en: 'Allowed range', id: 'Rentang yang diizinkan' },
      en: 'How far a damped Zone Capacity week may move without the planner’s reason: ±10% from the last published value, and ±20% from the first.',
      id: 'Seberapa jauh minggu diredam Zone Capacity boleh bergerak tanpa alasan perencana: ±10% dari nilai terakhir yang diterbitkan, dan ±20% dari nilai pertama.',
      formula: { en: 'Last published × (1 ± band).', id: 'Terakhir diterbitkan × (1 ± batas).' }
    },
    toPublish: {
      label: { en: 'To publish', id: 'Akan diterbitkan' },
      en: 'The quantity the next version will publish for the week, after the stabilising rules.',
      id: 'Kuantitas yang akan diterbitkan versi berikutnya untuk minggu itu, setelah aturan stabilisasi.'
    },
    stabiliseRule: {
      label: { en: 'Rule', id: 'Aturan' },
      en: 'Which stabilising rule set the week’s quantity to publish.',
      id: 'Aturan stabilisasi mana yang menetapkan kuantitas minggu itu yang akan diterbitkan.'
    },
    ruleNew: {
      label: {
        en: 'New week — published as calculated',
        id: 'Minggu baru — diterbitkan apa adanya'
      },
      en: 'A week entering the horizon has nothing published to compare with, so the engine value is published as it is.',
      id: 'Minggu yang baru masuk horizon belum punya nilai terbit untuk dibandingkan, sehingga nilai mesin diterbitkan apa adanya.',
      labelKeys: ['stb.rule.new']
    },
    ruleUnchanged: {
      label: { en: 'No change', id: 'Tidak berubah' },
      en: 'The engine value equals the last published value, so nothing moves.',
      id: 'Nilai mesin sama dengan nilai terakhir yang diterbitkan, sehingga tidak ada yang bergerak.',
      labelKeys: ['stb.rule.unchanged']
    },
    ruleFirmFrozen: {
      label: {
        en: 'Zone Liability — kept as published',
        id: 'Zone Liability — tetap seperti yang diterbitkan'
      },
      en: 'A Zone Liability week never changes once published.',
      id: 'Minggu Zone Liability tidak pernah berubah setelah diterbitkan.',
      labelKeys: ['stb.rule.firmFrozen']
    },
    ruleForecast: {
      label: {
        en: 'Zone Capacity — as calculated',
        id: 'Zone Capacity — apa adanya'
      },
      en: 'A later Zone Capacity week is not damped or held: the engine value is published.',
      id: 'Minggu Zone Capacity berikutnya tidak diredam atau ditahan: nilai mesin diterbitkan.',
      labelKeys: ['stb.rule.forecast']
    },
    ruleDamped: {
      label: { en: 'Zone Capacity — damped', id: 'Zone Capacity — diredam' },
      en: 'A damped Zone Capacity week’s value is blended with its last published value, and the result is within the allowed range.',
      id: 'Nilai minggu diredam Zone Capacity dicampur dengan nilai terakhir yang diterbitkan, dan hasilnya berada dalam rentang yang diizinkan.',
      labelKeys: ['stb.rule.damped']
    },
    ruleBandHeld: {
      label: {
        en: 'Zone Capacity — held at ±10% a version',
        id: 'Zone Capacity — ditahan pada ±10% per versi'
      },
      en: 'The damped value moved more than 10% from the last published value, so it is held at that edge.',
      id: 'Nilai yang diredam bergerak lebih dari 10% dari nilai terakhir yang diterbitkan, sehingga ditahan di batas itu.',
      labelKeys: ['stb.rule.bandHeld']
    },
    ruleCumulativeHeld: {
      label: {
        en: 'Zone Capacity — held at ±20% from the first value',
        id: 'Zone Capacity — ditahan pada ±20% dari nilai pertama'
      },
      en: 'The value moved more than 20% from the first value the supplier saw, so it is held at that edge.',
      id: 'Nilai bergerak lebih dari 20% dari nilai pertama yang dilihat pemasok, sehingga ditahan di batas itu.',
      labelKeys: ['stb.rule.cumulativeHeld']
    },
    ruleOverride: {
      label: {
        en: 'Zone Capacity — beyond the band, with the planner’s reason',
        id: 'Zone Capacity — di luar batas, dengan alasan perencana'
      },
      en: 'The planner published a value outside the band and gave a reason. The supplier sees the reason, and the week asks for a new commitment.',
      id: 'Perencana menerbitkan nilai di luar batas dan memberi alasan. Pemasok melihat alasannya, dan minggu itu meminta komitmen baru.',
      labelKeys: ['stb.rule.override']
    },
    planMovement: {
      label: { en: 'Size of changes (MASC)', id: 'Besar perubahan (MASC)' },
      en: 'How much the plan moves between versions, scaled to the product’s normal week-to-week movement so products of different sizes compare fairly.',
      id: 'Seberapa besar rencana bergerak antar versi, diskalakan ke pergerakan normal produk dari minggu ke minggu agar produk berbeda ukuran dapat dibandingkan.',
      formula: {
        en: 'Average change between two versions for the same weeks ÷ the product’s normal week-to-week movement.',
        id: 'Rata-rata perubahan antar dua versi untuk minggu yang sama ÷ pergerakan normal produk dari minggu ke minggu.'
      },
      alsoCalled: [
        {
          name: 'Size of changes',
          source: { en: 'forecast engine requirements', id: 'kebutuhan mesin prakiraan' }
        }
      ]
    },
    weeksChangedInLeadTime: {
      label: {
        en: 'Share of schedules changed inside lead time',
        id: 'Porsi jadwal yang berubah dalam waktu tunggu'
      },
      en: 'The share of published weeks that changed inside the supplier’s lead time.',
      id: 'Porsi minggu terbit yang berubah di dalam lead time pemasok.',
      formula: {
        en: 'Weeks changed inside the lead time ÷ all weeks published.',
        id: 'Minggu yang berubah dalam lead time ÷ semua minggu yang diterbitkan.'
      },
      alsoCalled: [
        {
          name: 'Share of schedules changed inside lead time',
          source: { en: 'forecast engine requirements', id: 'kebutuhan mesin prakiraan' }
        }
      ]
    },
    tradeOffWithinLimits: {
      label: {
        en: 'Zone Capacity within the tolerance band',
        id: 'Zone Capacity dalam rentang toleransi'
      },
      en: 'The share of damped Zone Capacity weeks whose quantity to publish stays within the allowed range.',
      id: 'Porsi minggu diredam Zone Capacity yang kuantitas terbitnya tetap dalam rentang yang diizinkan.',
      alsoCalled: [
        {
          name: 'tolerance band',
          source: { en: 'forecast engine requirements', id: 'kebutuhan mesin prakiraan' }
        }
      ]
    },
    weeksHeld: {
      label: {
        en: 'Weeks held in the version to publish',
        id: 'Minggu yang ditahan pada versi yang akan diterbitkan'
      },
      en: 'Weeks whose quantity to publish differs from the engine value: Zone Liability weeks kept, weeks held at the band, and damped weeks.',
      id: 'Minggu yang kuantitas terbitnya berbeda dari nilai mesin: minggu Zone Liability yang dipertahankan, minggu yang ditahan di batas, dan minggu yang diredam.'
    },
    seriesHeld: {
      label: {
        en: 'Held (Zone Liability · band · damped)',
        id: 'Ditahan (Zone Liability · batas · diredam)'
      },
      en: 'For the series, how many weeks are held, split into Zone Liability weeks kept, weeks held at the band, and damped weeks.',
      id: 'Untuk seri itu, berapa minggu yang ditahan, dipisah menjadi minggu Zone Liability yang dipertahankan, minggu yang ditahan di batas, dan minggu yang diredam.'
    },
    seriesMasc: {
      label: { en: 'MASC raw → stabilised', id: 'MASC mentah → distabilkan' },
      en: 'The series’ plan movement (MASC) before stabilising and after it. Lower means a steadier plan for the supplier.',
      id: 'Pergerakan rencana (MASC) seri itu sebelum dan sesudah distabilkan. Makin rendah, makin stabil rencana bagi pemasok.'
    },
    forecastZone: {
      label: { en: 'Zone', id: 'Zona' },
      en: 'Zone Liability: the weeks inside the supplier’s lead time; the supplier commits to PTI’s demand, which never changes once published. Zone Capacity: the weeks after; the first need a commitment and are damped, later ones only an acknowledgement.',
      id: 'Zone Liability: minggu di dalam lead time pemasok; pemasok berkomitmen pada kebutuhan PTI dan tidak berubah setelah diterbitkan. Zone Capacity: minggu sesudahnya; minggu pertama diredam dan perlu komitmen, minggu berikutnya cukup ditandai diterima.',
      labelKeys: ['fc.col.zone']
    },
    publishedForecast: {
      label: { en: 'Forecast ({{uom}})', id: 'Prakiraan ({{uom}})' },
      en: 'The quantity PTI published for the period in this forecast version.',
      id: 'Kuantitas yang diterbitkan PTI untuk periode itu pada versi prakiraan ini.'
    },
    commitmentDue: {
      label: { en: 'Commitment due', id: 'Tenggat komitmen' },
      en: 'When the commitment for the period is due: 1 working day after publication for Zone Liability periods, 3 working days for Zone Capacity periods.',
      id: 'Kapan komitmen untuk periode itu jatuh tempo: 1 hari kerja setelah penerbitan untuk periode Zone Liability, 3 hari kerja untuk periode Zone Capacity.',
      labelKeys: ['fc.col.due']
    },
    commitment: {
      label: { en: 'Commitment ({{uom}})', id: 'Komitmen ({{uom}})' },
      en: 'The quantity the supplier commits to supply for the period. It starts at the forecast; below it needs a reason.',
      id: 'Kuantitas yang dikomitmenkan pemasok untuk periode itu. Diawali dengan prakiraan; di bawahnya perlu alasan.'
    },
    commitmentUpside: {
      label: { en: 'Upside ({{uom}})', id: 'Tambahan ({{uom}})' },
      en: 'An optional quantity above the forecast that the supplier could also supply if PTI asks.',
      id: 'Kuantitas opsional di atas prakiraan yang juga dapat dipasok pemasok bila PTI meminta.',
      notToConfuse: {
        en: 'Uplift (the rise of a month’s LTP above its baseline, on the Capacity page).',
        id: 'Uplift (kenaikan LTP bulanan di atas baseline-nya, di halaman Kapasitas).'
      }
    },
    // ── Wave 5: order collaboration (orders, requisitions, goods receipts) ─────
    grPendingInspection: {
      label: { en: 'Pending Inspection', id: 'Menunggu Inspeksi' },
      en: 'Goods receipts waiting for PTI’s quality inspection to start.',
      id: 'Penerimaan barang yang menunggu inspeksi mutu PTI dimulai.'
    },
    grQualityHold: {
      label: { en: 'On Quality Hold', id: 'Ditahan Kualitas' },
      en: 'Goods receipts PTI’s quality inspection has put on hold: the goods may not be used until the hold is lifted.',
      id: 'Penerimaan barang yang ditahan inspeksi mutu PTI: barang tidak boleh dipakai sampai penahanan dicabut.'
    },
    grApprovedToday: {
      label: { en: 'Approved Today', id: 'Disetujui Hari Ini' },
      en: 'Goods receipts received today whose result is Approved or Partially approved.',
      id: 'Penerimaan barang yang diterima hari ini dengan hasil Disetujui atau Disetujui sebagian.'
    },
    grRejectionRate: {
      label: { en: 'Rejection Rate (30d)', id: 'Tingkat Penolakan (30h)' },
      en: 'The share of the quantity received in the last 30 days that inspection rejected.',
      id: 'Porsi kuantitas yang diterima dalam 30 hari terakhir yang ditolak inspeksi.',
      formula: {
        en: 'Rejected quantity ÷ received quantity, over receipts of the last 30 days.',
        id: 'Kuantitas ditolak ÷ kuantitas diterima, atas penerimaan 30 hari terakhir.'
      }
    },
    grDisposition: {
      label: { en: 'Disposition', id: 'Disposisi' },
      en: 'What happens to the received goods: accepted into stock, rejected, kept in quarantine, returned to the supplier, or not decided yet.',
      id: 'Apa yang terjadi pada barang yang diterima: diterima ke stok, ditolak, dikarantina, dikembalikan ke pemasok, atau belum diputuskan.'
    },
    grExpected: {
      label: { en: 'Shipped', id: 'Dikirim' },
      en: 'The quantity the shipping notice said would arrive on the line.',
      id: 'Kuantitas yang menurut pemberitahuan pengiriman akan tiba pada baris itu.',
      notToConfuse: { en: 'Expiry date.', id: 'Tanggal kedaluwarsa.' }
    },
    grReceived: {
      label: { en: 'Recv', id: 'Diterima' },
      en: 'Received: the quantity that physically arrived on the line.',
      id: 'Diterima: kuantitas yang benar-benar tiba pada baris itu.'
    },
    grAccepted: {
      label: { en: 'Accepted', id: 'Diterima' },
      en: 'The received quantity that passed inspection.',
      id: 'Kuantitas diterima yang lolos inspeksi.',
      notToConfuse: {
        en: 'Approved (the result of the whole receipt).',
        id: 'Disetujui (hasil seluruh penerimaan).'
      }
    },
    grRejectedLine: {
      label: { en: 'Rej', id: 'Ditolak' },
      en: 'Rejected: the received quantity that failed inspection.',
      id: 'Ditolak: kuantitas diterima yang tidak lolos inspeksi.',
      formula: { en: 'Received − accepted.', id: 'Diterima − lolos inspeksi.' }
    },
    grChecks: {
      label: { en: 'Checks', id: 'Pemeriksaan' },
      en: 'The checks on the line at receipt: visual, packaging, halal seal and BPOM lot.',
      id: 'Pemeriksaan pada baris saat penerimaan: visual, kemasan, segel halal, dan lot BPOM.'
    },
    poOpenTotal: {
      label: { en: 'Total Open POs', id: 'Total PO Terbuka' },
      en: 'POs not yet delivered, closed or rejected. A count of POs, not a quantity.',
      id: 'PO yang belum terkirim, ditutup, atau ditolak. Jumlah PO, bukan kuantitas.',
      notToConfuse: {
        en: 'OSPO (the open PO quantity not yet called off).',
        id: 'OSPO (kuantitas PO terbuka yang belum di-call-off).'
      }
    },
    poPendingConfirmation: {
      label: { en: 'Awaiting response', id: 'Menunggu tanggapan' },
      en: 'POs sent to the supplier that it has not answered yet: Sent or Viewed.',
      id: 'PO yang dikirim ke pemasok dan belum dijawab: Terkirim atau Dilihat.'
    },
    poInTransit: {
      label: { en: 'In Transit', id: 'Dalam Perjalanan' },
      en: 'POs in delivery and not yet fully delivered: partly delivered. A PO that is only confirmed has not started delivery.',
      id: 'PO yang sedang dikirim dan belum terkirim penuh: terkirim sebagian. PO yang baru dikonfirmasi belum mulai dikirim.'
    },
    poOverdue: {
      label: { en: 'Overdue', id: 'Lewat jatuh tempo' },
      en: 'Open POs past their requested delivery date.',
      id: 'PO terbuka yang melewati tanggal pengiriman yang diminta.'
    },
    orderedQty: {
      label: { en: 'Ordered', id: 'Dipesan' },
      en: 'The quantity ordered on the PO line.',
      id: 'Kuantitas yang dipesan pada baris PO.'
    },
    counterQty: {
      label: { en: 'Counter-offer quantity', id: 'Kuantitas penawaran balik' },
      en: 'The quantity the supplier offers for the line, when it cannot supply all of it: above 0 and at most the ordered quantity.',
      id: 'Kuantitas yang ditawarkan pemasok untuk baris itu, bila tidak sanggup memasok semuanya: di atas 0 dan paling banyak kuantitas yang dipesan.'
    },
    counterDate: {
      label: { en: 'Counter-offer date', id: 'Tanggal penawaran balik' },
      en: 'The date the supplier offers instead of the requested delivery date.',
      id: 'Tanggal yang ditawarkan pemasok sebagai ganti tanggal pengiriman yang diminta.'
    },
    summaryResponse: {
      label: { en: 'Response', id: 'Tanggapan' },
      en: 'The supplier’s answer to the PO: accepted, a counter-offer, or rejected. "Awaiting response" until it answers.',
      id: 'Jawaban pemasok atas PO: diterima, penawaran balik, atau ditolak. "Menunggu tanggapan" sampai pemasok menjawab.',
      labelKeys: ['oc.summary.col.response']
    },
    summaryAsns: {
      label: { en: 'ASNs', id: 'ASN' },
      en: 'The shipping notices (ASNs) the supplier sent against the PO.',
      id: 'Pemberitahuan pengiriman (ASN) yang dikirim pemasok untuk PO itu.'
    },
    summaryCallOffs: {
      label: { en: 'Call-offs', id: 'Call-off' },
      en: 'The call-offs released against the PO, when its deliveries are managed as call-offs.',
      id: 'Call-off yang dirilis untuk PO itu, bila pengirimannya dikelola sebagai call-off.'
    },
    summaryConfirmations: {
      label: { en: 'Confirmations', id: 'Konfirmasi' },
      en: 'The 3 confirmations the supplier gives on the PO: capacity, foresight or fixed stock, and the shipping notice.',
      id: '3 konfirmasi yang diberikan pemasok pada PO: kapasitas, foresight atau fixed stock, dan pemberitahuan pengiriman.'
    },
    summaryReceipts: {
      label: { en: 'Goods receipts', id: 'Penerimaan barang' },
      en: 'The goods receipts recorded against the PO.',
      id: 'Penerimaan barang yang tercatat untuk PO itu.'
    },
    summaryInvoices: {
      label: { en: 'Invoices', id: 'Faktur' },
      en: 'The supplier invoices against the PO.',
      id: 'Faktur pemasok untuk PO itu.'
    },
    prDraft: {
      label: { en: 'Draft', id: 'Draf' },
      en: 'Purchase requisitions still being written, not yet submitted.',
      id: 'Permintaan pembelian yang masih disusun, belum diajukan.'
    },
    prPendingApproval: {
      label: { en: 'Pending Approval', id: 'Menunggu Persetujuan' },
      en: 'Purchase requisitions submitted and waiting for Procurement’s decision.',
      id: 'Permintaan pembelian yang sudah diajukan dan menunggu keputusan Procurement.'
    },
    prApproved: {
      label: { en: 'Approved', id: 'Disetujui' },
      en: 'Purchase requisitions approved and not yet turned into a PO or a sourcing event.',
      id: 'Permintaan pembelian yang disetujui dan belum menjadi PO atau acara sourcing.'
    },
    prSourcingEvent: {
      label: { en: 'Sourcing Event', id: 'Acara Sourcing' },
      en: 'Purchase requisitions that need a sourcing event, because no purchasing info record or agreement exists for the material.',
      id: 'Permintaan pembelian yang memerlukan acara sourcing, karena belum ada info record pembelian atau perjanjian untuk material itu.'
    },
    prPoCreated: {
      label: { en: 'PO Created', id: 'PO Dibuat' },
      en: 'Purchase requisitions that became a PO.',
      id: 'Permintaan pembelian yang sudah menjadi PO.'
    },
    prSource: {
      label: { en: 'Source', id: 'Sumber' },
      en: 'Whether a purchasing info record (PIR) exists for the material. With one, a PO can be created directly; without, a sourcing event is needed.',
      id: 'Apakah ada info record pembelian (PIR) untuk material itu. Bila ada, PO dapat langsung dibuat; bila tidak, perlu acara sourcing.'
    },
    supShipped: {
      label: { en: 'Shipped', id: 'Dikirim' },
      en: 'The quantity your shipping notice (ASN) said you shipped.',
      id: 'Kuantitas yang menurut pemberitahuan pengiriman (ASN) Anda telah dikirim.'
    },
    supReceived: {
      label: { en: 'Received', id: 'Diterima' },
      en: 'The quantity PTI received.',
      id: 'Kuantitas yang diterima PTI.'
    },
    supRejected: {
      label: { en: 'Rejected', id: 'Ditolak' },
      en: 'The received quantity PTI’s quality inspection rejected.',
      id: 'Kuantitas diterima yang ditolak inspeksi mutu PTI.',
      formula: { en: 'Received − accepted.', id: 'Diterima − lolos inspeksi.' },
      labelKeys: ['fc.gr.col.rejected']
    },
    supQualityResult: {
      label: { en: 'Quality result', id: 'Hasil mutu' },
      en: 'PTI’s quality inspection result for the receipt, such as a quality hold or a retest. You see the result, not PTI’s internal checklist.',
      id: 'Hasil inspeksi mutu PTI untuk penerimaan itu, misalnya penahanan mutu atau uji ulang. Anda melihat hasilnya, bukan daftar periksa internal PTI.'
    },
    supDiscrepancy: {
      label: { en: 'Discrepancy', id: 'Ketidaksesuaian' },
      en: 'Flagged when the receipt differs from your shipping notice beyond the tolerance, or when PTI rejected some quantity.',
      id: 'Ditandai bila penerimaan berbeda dari pemberitahuan pengiriman Anda melewati toleransi, atau bila PTI menolak sebagian kuantitas.',
      formula: {
        en: 'Any quantity above the order, or a shortfall above 2%.',
        id: 'Kuantitas apa pun di atas pesanan, atau kekurangan di atas 2%.'
      },
      notToConfuse: {
        en: 'Difference (the plain quantity gap on a line).',
        id: 'Selisih (beda kuantitas pada satu baris).'
      }
    },
    supDifference: {
      label: { en: 'Difference', id: 'Selisih' },
      en: 'On a line, how far the received quantity is from the shipped quantity.',
      id: 'Pada satu baris, seberapa jauh kuantitas diterima dari kuantitas dikirim.',
      formula: { en: 'Received − shipped.', id: 'Diterima − dikirim.' },
      notToConfuse: {
        en: 'Discrepancy (a difference beyond the tolerance, on the receipt).',
        id: 'Ketidaksesuaian (beda yang melewati toleransi, pada penerimaan).'
      }
    },
    supOpenOrders: {
      label: { en: 'Open Orders', id: 'Pesanan Terbuka' },
      en: 'POs waiting for your response: sent to you, or acknowledged and not yet confirmed.',
      id: 'PO yang menunggu tanggapan Anda: dikirim kepada Anda, atau sudah diterima dan belum dikonfirmasi.'
    },
    supInProgress: {
      label: { en: 'In Progress', id: 'Sedang Berjalan' },
      en: 'Your POs in delivery and not yet fully delivered: partly delivered. A PO that is only confirmed has not started delivery.',
      id: 'PO Anda yang sedang dikirim dan belum terkirim penuh: terkirim sebagian. PO yang baru dikonfirmasi belum mulai dikirim.'
    },
    supValuePending: {
      label: { en: 'Total Value Pending', id: 'Total Nilai Tertunda' },
      en: 'The total value of your POs that are not yet delivered or closed.',
      id: 'Total nilai PO Anda yang belum terkirim atau ditutup.'
    },
    supDelivered: {
      label: { en: 'Delivered', id: 'Terkirim' },
      en: 'Your POs that are delivered or closed.',
      id: 'PO Anda yang sudah terkirim atau ditutup.'
    },
    supConfirmed: {
      label: { en: 'Confirmed', id: 'Dikonfirmasi' },
      en: 'The quantity you confirm you will supply for the line: above 0 and at most the ordered quantity. Less than ordered is a counter-offer.',
      id: 'Kuantitas yang Anda konfirmasi akan dipasok untuk baris itu: di atas 0 dan paling banyak kuantitas yang dipesan. Kurang dari pesanan adalah penawaran balik.',
      labelKeys: ['supplierOrders.panel.col.confirmed']
    },
    // ── Wave 6: invoices and shipments ────────────────────────────────────────
    invPendingApproval: {
      label: { en: 'Pending Approval', id: 'Menunggu Persetujuan' },
      en: 'The value of invoices still to be paid: waiting for the 3-way match, or approved and not yet paid.',
      id: 'Nilai faktur yang belum dibayar: menunggu pencocokan 3 arah, atau sudah disetujui dan belum dibayar.'
    },
    invReleased: {
      label: { en: 'Payments Released', id: 'Pembayaran Dirilis' },
      en: 'The value of invoices whose payment PTI has released.',
      id: 'Nilai faktur yang pembayarannya sudah dirilis PTI.'
    },
    invDisputed: {
      label: { en: 'Disputed', id: 'Disengketakan' },
      en: 'The value of invoices in dispute before payment, over a price or quantity difference or a credit note that is needed.',
      id: 'Nilai faktur yang disengketakan sebelum pembayaran, karena selisih harga atau kuantitas atau nota kredit yang diperlukan.',
      notToConfuse: {
        en: 'Returned (sent back to the supplier to correct and resubmit).',
        id: 'Dikembalikan (dikirim kembali ke pemasok untuk diperbaiki dan diajukan ulang).'
      }
    },
    invOverdue: {
      label: { en: 'Overdue', id: 'Lewat jatuh tempo' },
      en: 'The value of invoices past their due date and not yet paid.',
      id: 'Nilai faktur yang melewati tanggal jatuh tempo dan belum dibayar.',
      formula: {
        en: 'Due date = submission date + 30 days, unless the PO’s payment terms say otherwise.',
        id: 'Tanggal jatuh tempo = tanggal pengajuan + 30 hari, kecuali syarat pembayaran PO berkata lain.'
      }
    },
    invThreeWayMatch: {
      label: { en: '3-way match', id: 'Pencocokan 3 arah' },
      en: 'Whether the invoice agrees with its PO and goods receipts: Matched, or an exception (price variance or quantity mismatch).',
      id: 'Apakah faktur sesuai dengan PO dan penerimaan barangnya: Cocok, atau pengecualian (selisih harga atau ketidaksesuaian kuantitas).',
      formula: {
        en: 'Expected value = invoiced quantity × PO unit price; matched within 2% and Finance’s rupiah cap, or 0% where a contract price exists.',
        id: 'Nilai yang diharapkan = kuantitas yang ditagih × harga satuan PO; cocok dalam 2% dan batas rupiah Finance, atau 0% bila ada harga kontrak.'
      }
    },
    agingBucket: {
      label: { en: 'Aging bucket', id: 'Rentang umur' },
      en: 'How many days past its due date an unpaid invoice is.',
      id: 'Berapa hari faktur yang belum dibayar melewati tanggal jatuh temponya.'
    },
    agingPctAp: {
      label: { en: '% of AP', id: '% dari AP' },
      en: 'The bucket’s share of all accounts payable (AP): what PTI owes its suppliers.',
      id: 'Porsi rentang itu dari seluruh utang usaha (AP): yang terutang PTI kepada pemasoknya.'
    },
    agingRisk: {
      label: { en: 'Risk', id: 'Risiko' },
      en: 'The risk the bucket carries: Low when not yet due, Medium up to 30 days overdue, High beyond.',
      id: 'Risiko rentang itu: Rendah bila belum jatuh tempo, Sedang sampai 30 hari lewat, Tinggi setelahnya.'
    },
    invLineQuantity: {
      label: { en: 'Quantity', id: 'Kuantitas' },
      en: 'The quantity invoiced on the line. It cannot exceed what was received less what is already invoiced.',
      id: 'Kuantitas yang ditagih pada baris itu. Tidak boleh melebihi yang diterima dikurangi yang sudah ditagih.'
    },
    invUnitPrice: {
      label: { en: 'PO unit price', id: 'Harga satuan PO' },
      en: 'The unit price on the PO line, which the invoice is matched against.',
      id: 'Harga satuan pada baris PO, yang menjadi dasar pencocokan faktur.'
    },
    invLineValue: {
      label: { en: 'Expected value', id: 'Nilai yang diharapkan' },
      en: 'The value the line should have, beside what the supplier billed.',
      id: 'Nilai yang seharusnya untuk baris itu, di samping yang ditagih pemasok.',
      formula: {
        en: 'Invoiced quantity × PO unit price.',
        id: 'Kuantitas yang ditagih × harga satuan PO.'
      }
    },
    shipInTransit: {
      label: { en: 'In Transit', id: 'Dalam Perjalanan' },
      en: 'Shipments on their way: in transit, arrived at port, or in customs clearance.',
      id: 'Pengiriman dalam perjalanan: dalam transit, tiba di pelabuhan, atau dalam proses bea cukai.'
    },
    shipAtDock: {
      label: { en: 'At Dock / Unloading', id: 'Di Dok / Bongkar Muat' },
      en: 'Shipments at PTI’s dock or being unloaded.',
      id: 'Pengiriman yang ada di dok PTI atau sedang dibongkar.'
    },
    shipDelayed: {
      label: { en: 'Delayed', id: 'Terlambat' },
      en: 'Shipments past their expected arrival with no arrival recorded.',
      id: 'Pengiriman yang melewati perkiraan kedatangan tanpa kedatangan tercatat.',
      notToConfuse: {
        en: 'A call-off delayed by an LTP drop (a need date the supplier agreed to move).',
        id: 'Call-off yang ditunda karena LTP turun (tanggal kebutuhan yang disetujui pemasok untuk dipindah).'
      }
    },
    shipArrivingToday: {
      label: { en: 'Arriving Today', id: 'Tiba Hari Ini' },
      en: 'Shipments whose expected arrival is today.',
      id: 'Pengiriman yang perkiraan kedatangannya hari ini.'
    },
    shelfLifeLeftAtEta: {
      label: { en: 'Left at ETA', id: 'Sisa saat ETA' },
      en: 'The shelf life the batch will have left when it arrives. Below the material’s minimum, the shipping notice needs an approved exception.',
      id: 'Sisa umur simpan batch saat tiba. Di bawah batas minimum material, pemberitahuan pengiriman memerlukan pengecualian yang disetujui.',
      formula: {
        en: 'Months from the expected arrival to the expiry date; the minimum is 6 months unless SAP sets one for the material.',
        id: 'Bulan dari perkiraan kedatangan sampai tanggal kedaluwarsa; minimumnya 6 bulan kecuali SAP menetapkan untuk material itu.'
      }
    },
    supPaymentsReceived: {
      label: { en: 'Payments Received', id: 'Pembayaran Diterima' },
      en: 'The value of your invoices PTI has paid.',
      id: 'Nilai faktur Anda yang sudah dibayar PTI.'
    },
    supPendingPayment: {
      label: { en: 'Pending Payment', id: 'Menunggu Pembayaran' },
      en: 'The value of your invoices not yet paid: submitted, verified, or scheduled for payment.',
      id: 'Nilai faktur Anda yang belum dibayar: diajukan, diverifikasi, atau dijadwalkan untuk dibayar.'
    },
    supInvDisputed: {
      label: { en: 'Returned', id: 'Dikembalikan' },
      en: 'The value of your invoices PTI returned with a reason, for you to correct and resubmit.',
      id: 'Nilai faktur Anda yang dikembalikan PTI dengan alasan, untuk Anda perbaiki dan ajukan ulang.',
      notToConfuse: {
        en: 'Disputed (an invoice in dispute over a price or quantity difference).',
        id: 'Disengketakan (faktur yang disengketakan karena selisih harga atau kuantitas).'
      }
    },
    supThreeWayMatch: {
      label: { en: '3-way match', id: 'Pencocokan 3 arah' },
      en: 'Whether your invoice agrees with its PO and goods receipts: Matched, or an exception PTI’s Finance reviews.',
      id: 'Apakah faktur Anda sesuai dengan PO dan penerimaan barangnya: Cocok, atau pengecualian yang ditinjau Finance PTI.'
    },
    asnDraft: {
      label: { en: 'Draft', id: 'Draf' },
      en: 'Shipping notices you saved and have not submitted.',
      id: 'Pemberitahuan pengiriman yang Anda simpan dan belum diajukan.'
    },
    asnSubmitted: {
      label: { en: 'Submitted', id: 'Diajukan' },
      en: 'Shipping notices you submitted that have not left yet.',
      id: 'Pemberitahuan pengiriman yang sudah Anda ajukan dan belum berangkat.'
    },
    asnInTransit: {
      label: { en: 'In Transit', id: 'Dalam Perjalanan' },
      en: 'Shipping notices whose goods are on their way to PTI.',
      id: 'Pemberitahuan pengiriman yang barangnya sedang menuju PTI.'
    },
    asnDelivered: {
      label: { en: 'Delivered', id: 'Terkirim' },
      en: 'Shipping notices whose goods PTI received.',
      id: 'Pemberitahuan pengiriman yang barangnya sudah diterima PTI.'
    },
    asnDiscrepancy: {
      label: { en: 'Discrepancy', id: 'Ketidaksesuaian' },
      en: 'Shipping notices whose receipt differs from what you shipped beyond the tolerance.',
      id: 'Pemberitahuan pengiriman yang penerimaannya berbeda dari yang Anda kirim melewati toleransi.',
      formula: {
        en: 'Any quantity above the order, or a shortfall above 2%.',
        id: 'Kuantitas apa pun di atas pesanan, atau kekurangan di atas 2%.'
      }
    },
    asnLineOrdered: {
      label: { en: 'Ordered', id: 'Dipesan' },
      en: 'The quantity ordered on the PO line.',
      id: 'Kuantitas yang dipesan pada baris PO.'
    },
    asnLineShipped: {
      label: { en: 'Shipped', id: 'Dikirim' },
      en: 'The quantity this shipping notice ships on the line.',
      id: 'Kuantitas yang dikirim pemberitahuan pengiriman ini pada baris itu.'
    },
    asnOpenQuantity: {
      label: { en: 'Open quantity', id: 'Kuantitas terbuka' },
      en: 'What is still open on the call-off or PO line: ordered less what earlier shipping notices already ship.',
      id: 'Yang masih terbuka pada call-off atau baris PO: yang dipesan dikurangi yang sudah dikirim pemberitahuan pengiriman sebelumnya.'
    },
    asnShippedQuantity: {
      label: { en: 'Shipped quantity', id: 'Kuantitas dikirim' },
      en: 'The quantity you ship on the line. Above the open quantity needs a reason.',
      id: 'Kuantitas yang Anda kirim pada baris itu. Di atas kuantitas terbuka perlu alasan.'
    },
    // ── Wave 7: contracts, delivery agreements, compliance ──────────────────────
    deliveryAgreed: {
      label: { en: 'Agreed', id: 'Disepakati' },
      en: 'The total quantity the delivery agreement commits for the item.',
      id: 'Total kuantitas yang dijanjikan perjanjian pengiriman untuk item itu.',
      labelKeys: ['delivery.kpi.agreed']
    },
    deliveryReleased: {
      label: { en: 'Released', id: 'Dirilis' },
      en: 'The quantity released so far: schedule lines sent to the supplier to deliver.',
      id: 'Kuantitas yang sudah dirilis: baris jadwal yang dikirim ke pemasok untuk dikirimkan.',
      labelKeys: ['delivery.kpi.released', 'delivery.rollup.col.released']
    },
    deliveryDelivered: {
      label: { en: 'Delivered', id: 'Terkirim' },
      en: 'The quantity delivered against the released lines, tracked apart from what is released.',
      id: 'Kuantitas yang sudah dikirim untuk baris yang dirilis, dicatat terpisah dari yang dirilis.',
      labelKeys: ['delivery.kpi.delivered']
    },
    deliveryRemaining: {
      label: { en: 'Remaining', id: 'Sisa kuantitas' },
      en: 'The agreed quantity not yet released.',
      id: 'Kuantitas yang disepakati dan belum dirilis.',
      formula: { en: 'Agreed − released.', id: 'Disepakati − dirilis.' },
      notToConfuse: {
        en: 'Carry-over (also called sisa DA, on the Demand anticipation grid).',
        id: 'Carry-over (disebut juga sisa DA, di grid Demand anticipation).'
      },
      labelKeys: ['delivery.kpi.remaining']
    },
    releasePlanned: {
      label: { en: 'Planned', id: 'Direncanakan' },
      en: 'The quantity planned on the release line.',
      id: 'Kuantitas yang direncanakan pada baris rilis.',
      labelKeys: ['delivery.calendar.planned']
    },
    releaseFulfillment: {
      label: { en: 'Fulfillment', id: 'Pemenuhan' },
      en: 'How the release line was delivered: on time, late, missed, or pending until its date.',
      id: 'Bagaimana baris rilis dikirim: tepat waktu, terlambat, terlewat, atau menunggu sampai tanggalnya.',
      labelKeys: ['delivery.calendar.fulfillment']
    },
    releaseDrawnDown: {
      label: { en: 'Drawn down', id: 'Ditarik' },
      en: 'The quantity delivered against the release line, with its difference from the planned quantity.',
      id: 'Kuantitas yang dikirim untuk baris rilis, dengan selisihnya dari kuantitas yang direncanakan.',
      labelKeys: ['delivery.calendar.drawdownCol']
    },
    certExpired: {
      label: { en: 'Expired', id: 'Kedaluwarsa' },
      en: 'Certificates past their expiry date. An expired certificate blocks new POs.',
      id: 'Sertifikat yang melewati tanggal kedaluwarsa. Sertifikat kedaluwarsa memblokir PO baru.'
    },
    certExpiring: {
      label: { en: 'Expiring ≤90d', id: 'Akan Kedaluwarsa ≤90 hari' },
      en: 'Certificates that expire within 90 days: their renewal window is open.',
      id: 'Sertifikat yang kedaluwarsa dalam 90 hari: jendela pembaruannya terbuka.'
    },
    certMissing: {
      label: { en: 'Missing', id: 'Hilang' },
      en: 'Required certificates whose application has not started.',
      id: 'Sertifikat wajib yang permohonannya belum dimulai.'
    },
    certUnderReview: {
      label: { en: 'Under Review', id: 'Sedang Ditinjau' },
      en: 'Certificates the supplier submitted that wait for PTI’s verification.',
      id: 'Sertifikat yang diajukan pemasok dan menunggu verifikasi PTI.'
    },
    certValid: {
      label: { en: 'Valid', id: 'Berlaku' },
      en: 'Certificates in force and more than 90 days from expiry.',
      id: 'Sertifikat yang berlaku dan lebih dari 90 hari dari kedaluwarsa.'
    },
    certInSap: {
      label: { en: 'In SAP', id: 'Di SAP' },
      en: 'Whether the certificate has been handed to SAP S/4HANA. None has yet: the portal cannot transmit one.',
      id: 'Apakah sertifikat sudah diserahkan ke SAP S/4HANA. Belum ada: portal belum dapat mengirimkannya.'
    },
    certActionRequired: {
      label: { en: 'Action required', id: 'Tindakan diperlukan' },
      en: 'What has to happen next for the certificate, such as renewing or verifying it.',
      id: 'Apa yang harus dilakukan berikutnya untuk sertifikat itu, misalnya memperbarui atau memverifikasinya.'
    },
    contractsActive: {
      label: { en: 'Active Contracts', id: 'Kontrak Aktif' },
      en: 'Contracts currently in force.',
      id: 'Kontrak yang sedang berlaku.'
    },
    contractsExpiring: {
      label: { en: 'Expiring Soon', id: 'Segera Kedaluwarsa' },
      en: 'Contracts in force whose renewal notice is due.',
      id: 'Kontrak berlaku yang pemberitahuan perpanjangannya jatuh tempo.'
    },
    obligationsOverdue: {
      label: { en: 'Overdue Obligations', id: 'Kewajiban Jatuh Tempo' },
      en: 'Contract obligations past their due date and not met, across all contracts.',
      id: 'Kewajiban kontrak yang melewati tanggal jatuh tempo dan belum dipenuhi, di semua kontrak.'
    },
    contractsActiveValue: {
      label: { en: 'Total Active Value', id: 'Total Nilai Aktif' },
      en: 'The total value of the contracts in force.',
      id: 'Total nilai kontrak yang sedang berlaku.'
    },
    contractPerformance: {
      label: { en: 'Performance', id: 'Kinerja' },
      en: 'The supplier’s performance score on the contract, out of 100.',
      id: 'Skor kinerja pemasok pada kontrak itu, dari 100.'
    },
    // ── Wave 8: suppliers, performance and reliability ────────────────────────
    relConfirmation: {
      label: { en: 'Confirmation rate', id: 'Tingkat konfirmasi' },
      en: 'The share of PO lines and forecast periods the supplier confirmed by their deadline.',
      id: 'Porsi baris PO dan periode prakiraan yang dikonfirmasi pemasok sebelum tenggatnya.',
      formula: {
        en: 'Lines and periods confirmed by the deadline ÷ all due in the window.',
        id: 'Baris dan periode yang dikonfirmasi sebelum tenggat ÷ semua yang jatuh tempo dalam jendela.'
      },
      labelKeys: ['rel.col.confirmation']
    },
    relCommitment: {
      label: { en: 'Commitment reliability', id: 'Keandalan komitmen' },
      en: 'The share of the committed quantity that arrived on or before the committed date.',
      id: 'Porsi kuantitas yang dikomitmenkan yang tiba pada atau sebelum tanggal komitmen.',
      formula: {
        en: 'Quantity received on or before the committed date ÷ committed quantity.',
        id: 'Kuantitas diterima pada atau sebelum tanggal komitmen ÷ kuantitas yang dikomitmenkan.'
      }
    },
    relCfot: {
      label: { en: 'CFOT, by PO line', id: 'CFOT, per baris PO' },
      en: 'Casefill On-Time by PO line: the share of PO lines delivered in full on the date the supplier confirmed.',
      id: 'Casefill On-Time per baris PO: porsi baris PO yang dikirim lengkap pada tanggal yang dikonfirmasi pemasok.',
      notToConfuse: {
        en: 'The same measure against the requested date (shown beside it).',
        id: 'Ukuran yang sama terhadap tanggal yang diminta (ditampilkan di sampingnya).'
      }
    },
    relMisses: {
      label: { en: 'Missed lines', id: 'Baris yang meleset' },
      en: 'Lines that arrived short or late, each in one class: never confirmed, PTI-caused (PTI changed it inside the lead time), or supplier-caused.',
      id: 'Baris yang tiba kurang atau terlambat, masing-masing satu kelas: tidak pernah dikonfirmasi, karena PTI (PTI mengubahnya dalam lead time), atau karena pemasok.'
    },
    relPlanChangeKpi: {
      label: { en: 'PTI changes inside lead time', id: 'Perubahan PTI di dalam lead time' },
      en: 'The share of PTI’s schedules that PTI changed inside the supplier’s lead time.',
      id: 'Porsi jadwal PTI yang diubah PTI di dalam lead time pemasok.',
      formula: {
        en: 'Schedules changed inside the lead time ÷ all schedules published in the window.',
        id: 'Jadwal yang diubah dalam lead time ÷ semua jadwal yang diterbitkan dalam jendela.'
      }
    },
    relPlanChangeCol: {
      label: { en: 'PTI changed inside lead time', id: 'Diubah PTI di dalam lead time' },
      en: 'For the supplier, the share of PTI’s schedules that PTI changed inside its lead time.',
      id: 'Untuk pemasok itu, porsi jadwal PTI yang diubah PTI di dalam lead time-nya.',
      formula: {
        en: 'Schedules changed inside the lead time ÷ all schedules published in the window.',
        id: 'Jadwal yang diubah dalam lead time ÷ semua jadwal yang diterbitkan dalam jendela.'
      }
    },
    relMasc: {
      label: { en: 'Size of PTI’s changes', id: 'Besar perubahan PTI' },
      en: 'How much PTI’s plan moved between versions for the supplier’s materials, scaled to their normal week-to-week movement (MASC).',
      id: 'Seberapa besar rencana PTI bergerak antar versi untuk material pemasok, diskalakan ke pergerakan normal mingguannya (MASC).',
      labelKeys: ['rel.col.masc']
    },
    relMascI: {
      label: { en: 'Drift since first seen', id: 'Pergeseran sejak pertama dilihat' },
      en: 'The same measure against the first version the supplier ever saw for each week: the total drift, not only the last step (MASC-I).',
      id: 'Ukuran yang sama terhadap versi pertama yang dilihat pemasok untuk tiap minggu: total pergeseran, bukan hanya langkah terakhir (MASC-I).',
      labelKeys: ['rel.col.mascI']
    },
    perfOtif: {
      label: { en: 'On time and in full', id: 'Tepat waktu dan tepat jumlah' },
      en: 'The share of call-offs delivered on time and in full. The target is 90%.',
      id: 'Porsi call-off yang dikirim tepat waktu dan tepat jumlah. Targetnya 90%.',
      labelKeys: ['perf.otif']
    },
    perfCfot: {
      label: { en: 'CFOT, by PO', id: 'CFOT, per PO' },
      en: 'Casefill On-Time by PO: the share of POs delivered in full on the date the supplier confirmed.',
      id: 'Casefill On-Time per PO: porsi PO yang dikirim lengkap pada tanggal yang dikonfirmasi pemasok.',
      notToConfuse: {
        en: 'CFOT, by PO line (the same measure per PO line, on Supplier reliability).',
        id: 'CFOT, per baris PO (ukuran yang sama per baris PO, di Keandalan pemasok).'
      },
      labelKeys: ['perf.cfot']
    },
    perfRejections: {
      label: { en: 'Rejections', id: 'Penolakan' },
      en: 'How many PTI orders and call-offs the supplier rejected. Each costs 5 points in the overall score.',
      id: 'Berapa banyak pesanan dan call-off PTI yang ditolak pemasok. Masing-masing mengurangi 5 poin dari skor keseluruhan.'
    },
    perfScore: {
      label: { en: 'Overall score', id: 'Skor keseluruhan' },
      en: 'The supplier’s assessment score, 0 to 100, with its grade: A at 90 or more, B at 80, C at 70, else D.',
      id: 'Skor penilaian pemasok, 0 sampai 100, dengan grade-nya: A pada 90 atau lebih, B pada 80, C pada 70, selain itu D.',
      formula: {
        en: 'Average of the two delivery measures − 5 points per rejection.',
        id: 'Rata-rata kedua ukuran pengiriman − 5 poin per penolakan.'
      }
    },
    stockAccess: {
      label: { en: 'Access to PTI stock', id: 'Akses ke stok PTI' },
      en: 'Whether the supplier may see PTI’s own stock of the materials it supplies.',
      id: 'Apakah pemasok boleh melihat stok PTI sendiri untuk material yang dipasoknya.',
      labelKeys: ['inv.access.col.access']
    },
    otif: {
      label: { en: 'OTIF', id: 'OTIF' },
      en: 'On time and in full: the share of call-offs delivered on time and in full. The target is 90%.',
      id: 'On time and in full: porsi call-off yang dikirim tepat waktu dan tepat jumlah. Targetnya 90%.',
      labelKeys: ['buyerSupplierProfile.kpi.otif.eyebrow', 'buyerSuppliers.col.otif']
    },
    scorecardGrade: {
      label: { en: 'Scorecard Grade', id: 'Grade Kartu Skor' },
      en: 'The grade of the supplier’s overall score: A at 90 or more, B at 80, C at 70, else D.',
      id: 'Grade dari skor keseluruhan pemasok: A pada 90 atau lebih, B pada 80, C pada 70, selain itu D.',
      labelKeys: ['buyerSupplierProfile.kpi.scorecard.eyebrow']
    },
    catalogMoq: {
      label: { en: 'MOQ', id: 'MOQ' },
      en: 'The minimum order quantity the supplier accepts for the item.',
      id: 'Kuantitas pesanan minimum yang diterima pemasok untuk item itu.'
    },
    catalogLeadTime: {
      label: { en: 'Lead time', id: 'Lead time' },
      en: 'The time from order to delivery the supplier quotes for the item.',
      id: 'Waktu dari pesanan sampai pengiriman yang ditawarkan pemasok untuk item itu.'
    },
    catalogCapacity: {
      label: { en: 'Capacity', id: 'Kapasitas' },
      en: 'How much of the item the supplier can produce for PTI.',
      id: 'Berapa banyak item itu yang dapat diproduksi pemasok untuk PTI.'
    },
    supplierChannel: {
      label: { en: 'Channel', id: 'Kanal' },
      en: 'How the supplier works with the hub: WhatsApp, the web portal, or an API.',
      id: 'Cara pemasok bekerja dengan hub: WhatsApp, portal web, atau API.'
    },
    supplierCompliance: {
      label: { en: 'Compliance', id: 'Kepatuhan' },
      en: 'Whether the supplier passes PTI’s compliance gate: valid halal and BPOM papers where needed, GMP for cosmetic raw material, an active status, and OTIF at target.',
      id: 'Apakah pemasok lolos gerbang kepatuhan PTI: dokumen halal dan BPOM yang berlaku bila perlu, GMP untuk bahan baku kosmetik, status aktif, dan OTIF sesuai target.'
    },
    performanceBand: {
      label: { en: 'Performance band', id: 'Kelompok kinerja' },
      en: 'The supplier’s performance band, from its scorecard grade.',
      id: 'Kelompok kinerja pemasok, dari grade kartu skornya.',
      labelKeys: ['supFilter.col.band']
    },
    docValid: {
      label: { en: 'Valid', id: 'Berlaku' },
      en: 'Your documents in force and not within 180 days of expiry.',
      id: 'Dokumen Anda yang berlaku dan tidak dalam 180 hari menjelang kedaluwarsa.'
    },
    docExpiring: {
      label: { en: 'Expiring ≤180d', id: 'Akan Kedaluwarsa ≤180h' },
      en: 'Your documents that expire within 180 days.',
      id: 'Dokumen Anda yang kedaluwarsa dalam 180 hari.',
      notToConfuse: {
        en: 'The certificate registry’s 90-day window, on PTI’s Compliance page.',
        id: 'Jendela 90 hari di registri sertifikat, di halaman Kepatuhan PTI.'
      }
    },
    docExpired: {
      label: { en: 'Expired', id: 'Kedaluwarsa' },
      en: 'Your documents past their expiry date.',
      id: 'Dokumen Anda yang melewati tanggal kedaluwarsa.'
    },
    docNeedsAction: {
      label: { en: 'Needs Action', id: 'Perlu Tindakan' },
      en: 'Documents PTI asked for that you have not uploaded yet.',
      id: 'Dokumen yang diminta PTI dan belum Anda unggah.'
    },
    poOnTime: {
      label: { en: 'On Time', id: 'Tepat Waktu' },
      en: 'Your POs that are not past their requested delivery date.',
      id: 'PO Anda yang tidak melewati tanggal pengiriman yang diminta.',
      labelKeys: ['supplierPerformance.poMetric.onTime']
    },
    poLate: {
      label: { en: 'Late', id: 'Terlambat' },
      en: 'Your POs past their requested delivery date.',
      id: 'PO Anda yang melewati tanggal pengiriman yang diminta.',
      labelKeys: ['supplierPerformance.poMetric.late']
    },
    poAvgOverdue: {
      label: { en: 'Avg Overdue', id: 'Rata-rata Terlambat' },
      en: 'How many days, on average, your late POs are past their requested delivery date.',
      id: 'Rata-rata berapa hari PO Anda yang terlambat melewati tanggal pengiriman yang diminta.',
      formula: {
        en: 'Days overdue of the late POs ÷ the number of late POs.',
        id: 'Hari terlambat PO yang terlambat ÷ jumlah PO yang terlambat.'
      },
      labelKeys: ['supplierPerformance.poMetric.avgOverdue']
    },
    // ── Wave 9: admin, demand forecast and forecast bias ──────────────────────
    dfFallbackShare: {
      label: { en: 'Forecast by the fallback (Comb)', id: 'Diprakirakan metode cadangan (Comb)' },
      en: 'SKUs forecast by the fallback method, an average of three smoothing methods (the "Comb" benchmark), because the main model does not cover them.',
      id: 'SKU yang diprakirakan dengan metode cadangan, rata-rata tiga metode pemulusan (tolok ukur "Comb"), karena model utama tidak mencakupnya.'
    },
    dfTotal26: {
      label: { en: 'Next 26 weeks, all SKUs', id: '26 minggu ke depan, semua SKU' },
      en: 'The engine’s forecast of weekly sell-in for all SKUs over the next 26 weeks, beside SAP’s plan.',
      id: 'Prakiraan mesin untuk sell-in mingguan semua SKU selama 26 minggu ke depan, di samping rencana SAP.'
    },
    dfReconciledLevels: {
      label: { en: 'SKU, brand and total', id: 'SKU, merek, dan total' },
      en: 'Whether the SKU, brand and total forecasts add up. They are reconciled so they do, and never go negative.',
      id: 'Apakah prakiraan SKU, merek, dan total saling menjumlah. Prakiraan direkonsiliasi agar sesuai, dan tidak pernah negatif.'
    },
    dfOwnForecast26: {
      label: { en: 'Own forecast, 26 weeks', id: 'Prakiraan sendiri, 26 minggu' },
      en: 'The level’s own forecast over 26 weeks, before the levels are reconciled.',
      id: 'Prakiraan level itu sendiri selama 26 minggu, sebelum level-level direkonsiliasi.'
    },
    dfReconciled26: {
      label: { en: 'Reconciled, 26 weeks', id: 'Hasil rekonsiliasi, 26 minggu' },
      en: 'The level’s forecast over 26 weeks after reconciling, so SKUs add up to brands and brands to the total.',
      id: 'Prakiraan level itu selama 26 minggu setelah rekonsiliasi, agar SKU menjumlah ke merek dan merek ke total.'
    },
    dfSapPlan26: {
      label: { en: 'SAP’s plan, 26 weeks', id: 'Rencana SAP, 26 minggu' },
      en: 'The demand plan in SAP over the same 26 weeks, which material planning still runs on.',
      id: 'Rencana permintaan di SAP selama 26 minggu yang sama, yang masih menjadi dasar perencanaan material.'
    },
    dfAgainstSap: {
      label: { en: 'Against SAP', id: 'Terhadap SAP' },
      en: 'How far the reconciled forecast is from SAP’s plan.',
      id: 'Seberapa jauh prakiraan hasil rekonsiliasi dari rencana SAP.',
      formula: {
        en: 'Reconciled forecast − SAP’s plan, as a share of SAP’s plan.',
        id: 'Prakiraan hasil rekonsiliasi − rencana SAP, sebagai porsi dari rencana SAP.'
      }
    },
    dfMethod: {
      label: { en: 'Method', id: 'Metode' },
      en: 'The forecast method used for the SKU: the fallback (Comb), SAP’s plan for a new SKU, or none for a discontinued one.',
      id: 'Metode prakiraan yang dipakai untuk SKU itu: metode cadangan (Comb), rencana SAP untuk SKU baru, atau tidak ada untuk SKU yang dihentikan.'
    },
    dfForecast26: {
      label: { en: '26 weeks', id: '26 minggu' },
      en: 'The SKU’s reconciled forecast over the next 26 weeks.',
      id: 'Prakiraan SKU hasil rekonsiliasi selama 26 minggu ke depan.'
    },
    sapPlan: {
      label: { en: 'SAP’s plan', id: 'Rencana SAP' },
      en: 'The demand plan in SAP for the same weeks, which material planning still runs on.',
      id: 'Rencana permintaan di SAP untuk minggu yang sama, yang masih menjadi dasar perencanaan material.'
    },
    dfMethodForecast: {
      label: { en: 'Method’s forecast', id: 'Prakiraan metode' },
      en: 'The week’s forecast from the SKU’s method, before reconciling.',
      id: 'Prakiraan minggu itu dari metode SKU, sebelum rekonsiliasi.'
    },
    dfReconciled: {
      label: { en: 'Reconciled', id: 'Hasil rekonsiliasi' },
      en: 'The week’s forecast after reconciling with the brand and total.',
      id: 'Prakiraan minggu itu setelah direkonsiliasi dengan merek dan total.'
    },
    dfTheta: {
      label: { en: 'Theta (alternative)', id: 'Theta (alternatif)' },
      en: 'The forecast of the Theta method, shown beside the fallback for comparison.',
      id: 'Prakiraan metode Theta, ditampilkan di samping metode cadangan sebagai pembanding.'
    },
    dfEventsTotal: {
      label: { en: 'Total', id: 'Total' },
      en: 'How much the demand event lifts or lowers the total forecast, as a factor.',
      id: 'Seberapa besar acara permintaan menaikkan atau menurunkan prakiraan total, sebagai faktor.',
      labelKeys: ['df.events.col.level']
    },
    rangeAboveP90: {
      label: { en: 'Sold above P90', id: 'Terjual di atas P90' },
      en: 'The share of past weeks in which sales went above the P90 the range gave them. About 10% is expected.',
      id: 'Porsi minggu lampau saat penjualan melebihi P90 dari rentangnya. Sekitar 10% adalah wajar.'
    },
    rangeAboveP50: {
      label: { en: 'Sold above P50', id: 'Terjual di atas P50' },
      en: 'The share of past weeks in which sales went above the P50. About half is expected.',
      id: 'Porsi minggu lampau saat penjualan melebihi P50. Sekitar separuh adalah wajar.'
    },
    rangeUncorrected: {
      label: {
        en: 'Above P90 without the weekly correction',
        id: 'Di atas P90 tanpa koreksi mingguan'
      },
      en: 'The same check without the weekly adjustment of P90, to show what the correction adds.',
      id: 'Pemeriksaan yang sama tanpa penyesuaian mingguan P90, untuk menunjukkan apa yang ditambahkan koreksi.'
    },
    rangeWidthTotal: {
      label: { en: 'P90 above P50, total', id: 'P90 di atas P50, total' },
      en: 'How much P90 sits above P50, added over the weeks shown: the extra stock the upper figure asks for.',
      id: 'Seberapa jauh P90 di atas P50, dijumlahkan selama minggu yang ditampilkan: stok tambahan yang diminta angka atas.'
    },
    rangeForecast: {
      label: { en: 'Forecast', id: 'Prakiraan' },
      en: 'The forecast the range is built around.',
      id: 'Prakiraan yang menjadi pusat rentang.'
    },
    rangeWidth: {
      label: { en: 'P90 above P50', id: 'P90 di atas P50' },
      en: 'How much P90 sits above P50 over the weeks shown.',
      id: 'Seberapa jauh P90 di atas P50 selama minggu yang ditampilkan.'
    },
    rangeAbovePast: {
      label: { en: 'Sold above P90 (past)', id: 'Terjual di atas P90 (lalu)' },
      en: 'The share of past weeks in which sales went above P90.',
      id: 'Porsi minggu lampau saat penjualan melebihi P90.'
    },
    rangeSource: {
      label: { en: 'Range from', id: 'Rentang dari' },
      en: 'Whose past errors the range is built from: the engine’s forecast, or SAP’s plan for a new SKU.',
      id: 'Galat lampau siapa yang menjadi dasar rentang: prakiraan mesin, atau rencana SAP untuk SKU baru.'
    },
    rangeNeed: {
      label: { en: 'Forecast need', id: 'Kebutuhan prakiraan' },
      en: 'The material’s need from the SKU forecasts through the bill of materials.',
      id: 'Kebutuhan material dari prakiraan SKU melalui daftar bahan.'
    },
    fbSkusAlarm: {
      label: { en: 'SKUs in bias alarm · engine', id: 'SKU dengan alarm bias · mesin' },
      en: 'SKUs whose engine forecast keeps missing in one direction: the tracking signal is past 0.51 either way.',
      id: 'SKU yang prakiraan mesinnya terus meleset ke satu arah: tracking signal melewati 0,51 ke salah satu arah.'
    },
    fbMaterialsAlarm: {
      label: { en: 'Materials in bias alarm · engine', id: 'Material dengan alarm bias · mesin' },
      en: 'Materials whose engine forecast keeps missing in one direction: the tracking signal is past 0.51 either way.',
      id: 'Material yang prakiraan mesinnya terus meleset ke satu arah: tracking signal melewati 0,51 ke salah satu arah.'
    },
    fbOverrides: {
      label: { en: 'Override weeks in force', id: 'Minggu dengan penyesuaian berlaku' },
      en: 'Forecast weeks where a planner’s override replaces the engine’s figure.',
      id: 'Minggu prakiraan saat penyesuaian perencana menggantikan angka mesin.'
    },
    fbValue: {
      label: { en: 'Override value (FVA)', id: 'Nilai penyesuaian (FVA)' },
      en: 'Whether overrides made the forecast better: the error after overrides compared with the engine’s error before them.',
      id: 'Apakah penyesuaian membuat prakiraan lebih baik: galat setelah penyesuaian dibanding galat mesin sebelumnya.'
    },
    fbEngine: {
      label: { en: 'Engine forecast', id: 'Prakiraan mesin' },
      en: 'The tracking signal of the engine’s forecast: how steadily it missed in one direction.',
      id: 'Tracking signal prakiraan mesin: seberapa konsisten ia meleset ke satu arah.'
    },
    fbSap: {
      label: { en: 'SAP’s plan', id: 'Rencana SAP' },
      en: 'The tracking signal of SAP’s plan, for comparison with the engine’s.',
      id: 'Tracking signal rencana SAP, sebagai pembanding dengan milik mesin.'
    },
    fbDirection: {
      label: { en: 'Against the engine', id: 'Terhadap mesin' },
      en: 'Whether the override raised or lowered the engine’s forecast, and by how much.',
      id: 'Apakah penyesuaian menaikkan atau menurunkan prakiraan mesin, dan seberapa banyak.'
    },
    fvaError: {
      label: { en: 'Error: engine → after', id: 'Galat: mesin → sesudah' },
      en: 'The forecast error before overrides, then after them.',
      id: 'Galat prakiraan sebelum penyesuaian, lalu sesudahnya.'
    },
    fvaImproved: {
      label: { en: 'Weeks improved', id: 'Minggu membaik' },
      en: 'The overridden weeks whose error went down.',
      id: 'Minggu yang disesuaikan dan galatnya turun.'
    },
    fvaValue: {
      label: { en: 'Value (FVA)', id: 'Nilai (FVA)' },
      en: 'How much the overrides reduced the error. Below zero, they made the forecast worse.',
      id: 'Seberapa besar penyesuaian mengurangi galat. Di bawah nol, penyesuaian memperburuk prakiraan.',
      formula: {
        en: 'Error before overrides − error after.',
        id: 'Galat sebelum penyesuaian − galat sesudahnya.'
      }
    },
    sourcingType: {
      label: { en: 'Sourcing type', id: 'Jenis sourcing' },
      en: 'Whether the category or purchasing group is Direct or Indirect. An event inherits it from its category, which sets who may be invited.',
      id: 'Apakah kategori atau grup pembelian itu Direct atau Indirect. Acara mewarisinya dari kategorinya, yang menentukan siapa yang boleh diundang.',
      labelKeys: ['adminSourcing.col.type']
    },
    requiredRole: {
      label: { en: 'Required role', id: 'Peran wajib' },
      en: 'The role a person must hold to make this step happen.',
      id: 'Peran yang harus dimiliki seseorang untuk menjalankan langkah ini.'
    },
    roleReach: {
      label: { en: 'Reach', id: 'Jangkauan' },
      en: 'Which side and which records the role can act on.',
      id: 'Sisi dan catatan mana yang dapat ditindaklanjuti peran itu.'
    },
    qualLevel: {
      label: { en: 'Level', id: 'Level' },
      en: 'The qualification level the rule sets: Registered, Approved or Preferred.',
      id: 'Level kualifikasi yang diatur aturan itu: Terdaftar, Disetujui, atau Diutamakan.'
    },
    qualDocuments: {
      label: { en: 'Documents required', id: 'Dokumen yang diwajibkan' },
      en: 'The document types a supplier must hold, valid, to reach the level.',
      id: 'Jenis dokumen yang harus dimiliki pemasok, dalam keadaan berlaku, untuk mencapai level itu.'
    },
    ruleInForce: {
      label: { en: 'In force', id: 'Berlaku' },
      en: 'The value the hub uses now.',
      id: 'Nilai yang dipakai hub saat ini.'
    },
    ruleDefault: {
      label: { en: 'Default', id: 'Bawaan' },
      en: 'The value the hub would use if nobody had changed it.',
      id: 'Nilai yang akan dipakai hub bila tidak ada yang mengubahnya.'
    },
    groupValue: {
      label: { en: 'Group value', id: 'Nilai kelompok' },
      en: 'The value set for this material group, which replaces the global value for it.',
      id: 'Nilai yang diatur untuk kelompok material ini, menggantikan nilai global untuknya.'
    },
    globalValue: {
      label: { en: 'Global value', id: 'Nilai global' },
      en: 'The value every material group uses unless it has its own.',
      id: 'Nilai yang dipakai semua kelompok material kecuali yang punya nilainya sendiri.'
    },
    staleAfter: {
      label: { en: 'Stale period', id: 'Periode usang' },
      en: 'How long after its last update a supplier’s stock figure counts as out of date.',
      id: 'Berapa lama setelah pembaruan terakhir angka stok pemasok dianggap kedaluwarsa.'
    },
    stockFigureNow: {
      label: { en: 'Stock figure now', id: 'Angka stok sekarang' },
      en: 'Whether the supplier’s stock figure is current, out of date or missing today.',
      id: 'Apakah angka stok pemasok terkini, kedaluwarsa, atau tidak ada hari ini.'
    },
    stockUpdateMode: {
      label: { en: 'Stock update mode', id: 'Cara pembaruan stok' },
      en: 'How the supplier sends its stock: the weekly template upload or an API, which sets when its figures count as out of date.',
      id: 'Cara pemasok mengirim stoknya: unggah templat mingguan atau API, yang menentukan kapan angkanya dianggap kedaluwarsa.'
    },
    modeSet: {
      label: { en: 'Mode set', id: 'Cara yang ditetapkan' },
      en: 'The stock update mode chosen in this change.',
      id: 'Cara pembaruan stok yang dipilih pada perubahan ini.'
    },
    tplOnNewAsns: {
      label: { en: 'On new ASNs', id: 'Pada ASN baru' },
      en: 'Whether suppliers can pick this 3PL when they create a shipping notice.',
      id: 'Apakah pemasok dapat memilih 3PL ini saat membuat pemberitahuan pengiriman.'
    },
    // ── Wave 10: material requirement and model backtest ──────────────────────
    mrqNetMaterials: {
      label: { en: 'Materials with a net requirement', id: 'Material dengan kebutuhan bersih' },
      en: 'Materials the plan needs more of than stock and confirmed receipts cover in some week.',
      id: 'Material yang dibutuhkan rencana lebih banyak dari yang ditutup stok dan penerimaan terkonfirmasi pada suatu minggu.'
    },
    mrqPlannedOrdersKpi: {
      label: { en: 'Planned orders', id: 'Pesanan terencana' },
      en: 'The orders the plan proposes to cover the net requirements.',
      id: 'Pesanan yang diusulkan rencana untuk menutup kebutuhan bersih.'
    },
    mrqLateKpi: {
      label: { en: 'Late to release', id: 'Terlambat dirilis' },
      en: 'Planned orders whose release week has already passed, so they arrive late unless rushed.',
      id: 'Pesanan terencana yang minggu rilisnya sudah lewat, sehingga terlambat tiba kecuali dipercepat.'
    },
    mrqReview: {
      label: { en: 'Marked for review', id: 'Ditandai untuk ditinjau' },
      en: 'Materials whose stock count is off by more than the tolerance, so their plan needs a check.',
      id: 'Material yang hitungan stoknya meleset melebihi toleransi, sehingga rencananya perlu diperiksa.'
    },
    mrpLeadTime: {
      label: { en: 'Lead time', id: 'Lead time' },
      en: 'The time from releasing an order to receiving it. The release week is the need week minus it.',
      id: 'Waktu dari merilis pesanan sampai menerimanya. Minggu rilis adalah minggu kebutuhan dikurangi waktu ini.'
    },
    mrpSafetyStock: {
      label: { en: 'Safety stock', id: 'Stok pengaman' },
      en: 'Stock the plan keeps on hand against demand above the forecast; the net requirement includes it.',
      id: 'Stok yang dijaga rencana untuk permintaan di atas prakiraan; kebutuhan bersih memperhitungkannya.',
      notToConfuse: {
        en: 'Safety order (the team’s rule, part of ROP Order).',
        id: 'Safety order (aturan tim, bagian dari ROP Order).'
      }
    },
    mrpStockOnHand: {
      label: { en: 'Stock on hand', id: 'Stok tersedia' },
      en: 'PTI’s stock of the material now.',
      id: 'Stok PTI untuk material itu saat ini.'
    },
    mrpNet: {
      label: { en: 'Net requirement', id: 'Kebutuhan bersih' },
      en: 'What the plan still needs once stock and confirmed receipts are used.',
      id: 'Yang masih dibutuhkan rencana setelah stok dan penerimaan terkonfirmasi dipakai.',
      formula: {
        en: 'Gross requirement + safety stock − (stock at start + confirmed receipts), never below 0.',
        id: 'Kebutuhan kotor + stok pengaman − (stok awal + penerimaan terkonfirmasi), tidak pernah di bawah 0.'
      }
    },
    mrpPlannedOrders: {
      label: { en: 'Planned orders', id: 'Pesanan terencana' },
      en: 'The orders the plan proposes for the material, sized to the order rules.',
      id: 'Pesanan yang diusulkan rencana untuk material itu, disesuaikan dengan aturan pemesanan.'
    },
    mrpLate: {
      label: { en: 'Late', id: 'Terlambat' },
      en: 'Planned orders for the material whose release week has passed.',
      id: 'Pesanan terencana material itu yang minggu rilisnya sudah lewat.'
    },
    mrpGross: {
      label: { en: 'Gross requirement', id: 'Kebutuhan kotor' },
      en: 'The material needed for the finished goods planned in the week.',
      id: 'Material yang dibutuhkan untuk barang jadi yang direncanakan minggu itu.',
      formula: {
        en: 'Finished-goods quantity × quantity per × (1 + scrap) ÷ yield.',
        id: 'Kuantitas barang jadi × kuantitas per × (1 + scrap) ÷ yield.'
      }
    },
    mrpStockStart: {
      label: { en: 'Stock at start', id: 'Stok awal' },
      en: 'The projected stock at the start of the week.',
      id: 'Proyeksi stok di awal minggu.'
    },
    mrpReceipts: {
      label: { en: 'Confirmed receipts', id: 'Penerimaan terkonfirmasi' },
      en: 'Quantities suppliers confirmed for arrival in the week.',
      id: 'Kuantitas yang dikonfirmasi pemasok untuk tiba minggu itu.'
    },
    mrpPlannedOrder: {
      label: { en: 'Planned order', id: 'Pesanan terencana' },
      en: 'The order the plan proposes to arrive in the week.',
      id: 'Pesanan yang diusulkan rencana untuk tiba minggu itu.'
    },
    mrpRelease: {
      label: { en: 'Release week', id: 'Minggu rilis' },
      en: 'The week the planned order must be released to arrive in time.',
      id: 'Minggu pesanan terencana harus dirilis agar tiba tepat waktu.',
      formula: { en: 'Need week − lead time.', id: 'Minggu kebutuhan − lead time.' }
    },
    mrpStockEnd: {
      label: { en: 'Stock at end', id: 'Stok akhir' },
      en: 'The projected stock at the end of the week.',
      id: 'Proyeksi stok di akhir minggu.',
      formula: {
        en: 'Stock at start + receipts + planned receipt − gross requirement.',
        id: 'Stok awal + penerimaan + penerimaan terencana − kebutuhan kotor.'
      }
    },
    pegFgQty: {
      label: { en: 'Finished-good quantity', id: 'Jumlah barang jadi' },
      en: 'The quantity of the finished good planned in the week.',
      id: 'Kuantitas barang jadi yang direncanakan minggu itu.'
    },
    pegScrap: {
      label: { en: 'Scrap', id: 'Susut' },
      en: 'The share of the component expected to be lost in making the finished good.',
      id: 'Porsi komponen yang diperkirakan hilang saat membuat barang jadi.'
    },
    pegYield: {
      label: { en: 'Yield', id: 'Hasil (yield)' },
      en: 'The share of the parent’s process output that comes out good.',
      id: 'Porsi keluaran proses induk yang hasilnya baik.'
    },
    pegRequirement: {
      label: { en: 'Requirement', id: 'Kebutuhan' },
      en: 'This finished good’s part of the material’s gross requirement.',
      id: 'Bagian barang jadi ini dari kebutuhan kotor material.',
      formula: {
        en: 'Finished-good quantity × quantity per × (1 + scrap) ÷ yield.',
        id: 'Kuantitas barang jadi × kuantitas per × (1 + scrap) ÷ yield.'
      }
    },
    mbBeats: {
      label: { en: 'Engine beats SAP’s plan', id: 'Mesin mengungguli rencana SAP' },
      en: 'SKUs where the engine’s chosen model served demand better than SAP’s plan in the backtest.',
      id: 'SKU yang model pilihan mesinnya melayani permintaan lebih baik daripada rencana SAP dalam backtest.'
    },
    mbMaterials: {
      label: { en: 'Materials, engine vs SAP’s plan', id: 'Material, mesin vs rencana SAP' },
      en: 'Materials better off on fill rate and warehouse space when every SKU uses its chosen model.',
      id: 'Material yang lebih baik pada fill rate dan ruang gudang bila setiap SKU memakai model pilihannya.'
    },
    mbLimit: {
      label: { en: 'Plan-stability limit', id: 'Batas stabilitas rencana' },
      en: 'The most plan movement (MASC) a model may cause and still be chosen. Not enforced until the Material Planner sets it.',
      id: 'Pergerakan rencana (MASC) terbesar yang boleh ditimbulkan model agar tetap dipilih. Belum diberlakukan sampai Material Planner menetapkannya.'
    },
    mbFillRate: {
      label: { en: 'Fill rate', id: 'Tingkat pemenuhan' },
      en: 'The share of weeks with demand that stock served in full, when PTI’s ordering is replayed on the model’s forecast.',
      id: 'Porsi minggu berpermintaan yang dilayani penuh oleh stok, saat cara pesan PTI diputar ulang pada prakiraan model.',
      formula: {
        en: 'Weeks fully served ÷ weeks with demand.',
        id: 'Minggu terlayani penuh ÷ minggu berpermintaan.'
      }
    },
    mbOrderComplete: {
      label: { en: 'Order-complete', id: 'Pesanan lengkap' },
      en: 'The share of orders with every line filled.',
      id: 'Porsi pesanan yang semua barisnya terpenuhi.'
    },
    mbPalletWeeks: {
      label: { en: 'Pallet-weeks', id: 'Palet-minggu' },
      en: 'The warehouse space the replayed plan uses: pallets held, added over the weeks.',
      id: 'Ruang gudang yang dipakai rencana yang diputar ulang: palet yang disimpan, dijumlahkan selama minggu-minggu itu.'
    },
    mbMascMedian: {
      label: { en: 'MASC, median', id: 'MASC, median' },
      en: 'The middle value of plan movement (MASC) across SKUs: how much the model moves the plan between versions.',
      id: 'Nilai tengah pergerakan rencana (MASC) antar SKU: seberapa besar model menggeser rencana antar versi.'
    },
    mbWapeMedian: {
      label: { en: 'WAPE, median', id: 'WAPE, median' },
      en: 'The middle value across SKUs of the forecast error, as a share of actual demand. Shown as a diagnostic, not used to choose.',
      id: 'Nilai tengah antar SKU dari galat prakiraan, sebagai porsi dari permintaan aktual. Ditampilkan sebagai diagnosis, tidak dipakai untuk memilih.'
    },
    mbUnitsServed: {
      label: { en: 'Units served', id: 'Unit terlayani' },
      en: 'The share of demanded units that stock served.',
      id: 'Porsi unit yang diminta yang dilayani stok.'
    },
    mbPeakPackaging: {
      label: { en: 'Packaging: peak pallets', id: 'Kemasan: puncak palet' },
      en: 'The most pallets of packaging the replayed plan holds in any one week.',
      id: 'Palet kemasan terbanyak yang disimpan rencana yang diputar ulang dalam satu minggu.'
    },
    mbPeakRaw: {
      label: { en: 'Raw material: peak pallets', id: 'Bahan baku: puncak palet' },
      en: 'The most pallets of raw material the replayed plan holds in any one week.',
      id: 'Palet bahan baku terbanyak yang disimpan rencana yang diputar ulang dalam satu minggu.'
    },
    mbOrigin: {
      label: { en: 'Origin', id: 'Titik awal' },
      en: 'A past date the backtest forecasts from, as if it were that day.',
      id: 'Tanggal lampau yang menjadi titik awal prakiraan backtest, seolah-olah hari itu.'
    },
    mbVsSap: {
      label: { en: 'Against SAP’s plan', id: 'Terhadap rencana SAP' },
      en: 'Whether the chosen model served the SKU better or worse than SAP’s plan in the backtest.',
      id: 'Apakah model pilihan melayani SKU lebih baik atau lebih buruk daripada rencana SAP dalam backtest.'
    },
    mbMaterialLead: {
      label: { en: 'Lead time', id: 'Lead time' },
      en: 'The material’s lead time, which the replayed ordering uses.',
      id: 'Lead time material, yang dipakai cara pesan yang diputar ulang.'
    },
    mbChosenVsSap: {
      label: { en: 'Chosen against SAP’s plan', id: 'Terpilih terhadap rencana SAP' },
      en: 'Whether the material is better or worse off when its SKUs use their chosen models instead of SAP’s plan.',
      id: 'Apakah material lebih baik atau lebih buruk bila SKU-nya memakai model pilihan, bukan rencana SAP.'
    },
    mbMasc: {
      label: { en: 'MASC', id: 'MASC' },
      en: 'How much the candidate moves the plan between versions, scaled to the SKU’s normal week-to-week movement.',
      id: 'Seberapa besar kandidat menggeser rencana antar versi, diskalakan ke pergerakan mingguan normal SKU.'
    },
    mbWape: {
      label: { en: 'WAPE', id: 'WAPE' },
      en: 'The candidate’s forecast error, as a share of actual demand. A diagnostic, not used to choose.',
      id: 'Galat prakiraan kandidat, sebagai porsi dari permintaan aktual. Diagnosis, tidak dipakai untuk memilih.'
    },
    mbBias: {
      label: { en: 'Bias', id: 'Bias' },
      en: 'Whether the candidate’s forecast runs high or low on average. A diagnostic, not used to choose.',
      id: 'Apakah prakiraan kandidat rata-rata terlalu tinggi atau rendah. Diagnosis, tidak dipakai untuk memilih.'
    },
    mbSelection: {
      label: { en: 'Selection', id: 'Pemilihan' },
      en: 'Whether the candidate was chosen, failed the floor or the stability limit, or was eligible but not chosen.',
      id: 'Apakah kandidat dipilih, gagal di batas bawah atau batas stabilitas, atau layak tetapi tidak dipilih.'
    },
    candMain: {
      label: { en: 'Main model', id: 'Model utama' },
      en: 'The main forecasting model, when the run has one.',
      id: 'Model prakiraan utama, bila run memilikinya.',
      labelKeys: ['mb.candidate.main']
    },
    candComb: {
      label: { en: 'Comb (fallback)', id: 'Comb (fallback)' },
      en: 'The fallback: an average of three smoothing methods (the "Comb" benchmark). A model that does not beat it is not used.',
      id: 'Fallback: rata-rata tiga metode pemulusan (tolok ukur "Comb"). Model yang tidak mengalahkannya tidak dipakai.',
      labelKeys: ['mb.candidate.comb']
    },
    candTheta: {
      label: { en: 'Theta', id: 'Theta' },
      en: 'The Theta method, an alternative to the fallback.',
      id: 'Metode Theta, alternatif dari fallback.',
      labelKeys: ['mb.candidate.theta']
    },
    candSba: {
      label: { en: 'SBA', id: 'SBA' },
      en: 'A method for slow SKUs whose demand has many zero weeks.',
      id: 'Metode untuk SKU lambat yang permintaannya banyak minggu nol.',
      labelKeys: ['mb.candidate.sba']
    },
    candCroston: {
      label: { en: 'Croston', id: 'Croston' },
      en: 'A method for slow SKUs whose demand has many zero weeks.',
      id: 'Metode untuk SKU lambat yang permintaannya banyak minggu nol.',
      labelKeys: ['mb.candidate.croston']
    },
    candTsb: {
      label: { en: 'TSB', id: 'TSB' },
      en: 'A method for slow SKUs whose demand has many zero weeks, which also follows a SKU that fades out.',
      id: 'Metode untuk SKU lambat yang permintaannya banyak minggu nol, yang juga mengikuti SKU yang memudar.',
      labelKeys: ['mb.candidate.tsb']
    },
    candSapPlan: {
      label: { en: 'SAP’s plan', id: 'Rencana SAP' },
      en: 'SAP’s plan, replayed as a candidate for comparison.',
      id: 'Rencana SAP, diputar ulang sebagai kandidat pembanding.',
      labelKeys: ['mb.candidate.sapPlan']
    },
    scenarioSapPlan: {
      label: { en: 'SAP’s plan', id: 'Rencana SAP' },
      en: 'PTI’s ordering replayed on SAP’s plan from this origin: the benchmark.',
      id: 'Cara pesan PTI diputar ulang pada rencana SAP dari titik awal ini: tolok ukurnya.',
      labelKeys: ['mb.scenario.sapPlan']
    },
    scenarioFloor: {
      label: { en: 'The fallback', id: 'Fallback' },
      en: 'PTI’s ordering replayed on the fallback model from this origin.',
      id: 'Cara pesan PTI diputar ulang pada model fallback dari titik awal ini.',
      labelKeys: ['mb.scenario.floor']
    },
    // ── Wave 11: order plan, reschedule, collaboration, data health ─────────
    moveHeadroom: {
      label: { en: 'Headroom this period', id: 'Sisa kapasitas periode ini' },
      en: 'How much more the target supplier can make in the period before it runs out of capacity. A quantity above it warns but is allowed.',
      id: 'Berapa banyak lagi yang dapat dibuat pemasok tujuan pada periode itu sebelum kapasitasnya habis. Kuantitas di atasnya memberi peringatan tetapi diizinkan.',
      formula: { en: 'BE − LTP.', id: 'BE − LTP.' }
    },
    excForecast: {
      label: { en: 'Forecast', id: 'Prakiraan' },
      en: 'The quantity PTI published for the period.',
      id: 'Kuantitas yang diterbitkan PTI untuk periode itu.',
      labelKeys: ['fc.col.forecastShort']
    },
    excCommitment: {
      label: { en: 'Commitment', id: 'Komitmen' },
      en: 'The quantity the supplier committed for the period.',
      id: 'Kuantitas yang dikomitmenkan pemasok untuk periode itu.',
      labelKeys: ['fc.col.commitmentShort']
    },
    commitmentGap: {
      label: { en: 'Commitment gap', id: 'Selisih komitmen' },
      en: 'How the commitment compares with the forecast: green at 100% or more, amber from 80%, red below 80%.',
      id: 'Perbandingan komitmen dengan prakiraan: hijau pada 100% atau lebih, kuning dari 80%, merah di bawah 80%.',
      formula: { en: 'Commitment ÷ forecast.', id: 'Komitmen ÷ prakiraan.' }
    },
    excDaysOfSupply: {
      label: { en: 'Days of supply', id: 'Hari persediaan' },
      en: 'How many days the supplier’s stock lasts at the material’s average daily demand.',
      id: 'Berapa hari stok pemasok bertahan pada rata-rata permintaan harian material.',
      formula: {
        en: 'Stock ÷ the forecast for the next 30 days ÷ 30.',
        id: 'Stok ÷ prakiraan 30 hari ke depan ÷ 30.'
      }
    },
    firmDemand: {
      label: { en: 'Zone Liability demand', id: 'Kebutuhan Zone Liability' },
      en: 'The demand in Zone Liability, which the supplier’s stock and incoming are measured against.',
      id: 'Permintaan dalam Zone Liability, yang menjadi pembanding stok dan kedatangan pemasok.'
    },
    supplierCoverage: {
      label: { en: 'Coverage', id: 'Cakupan' },
      en: 'Whether the supplier’s stock and incoming cover the Zone Liability demand: Covered at 1.0 or more, At risk from 0.8, Uncovered below.',
      id: 'Apakah stok dan kedatangan pemasok menutup permintaan Zone Liability: Tertutup pada 1,0 atau lebih, Berisiko dari 0,8, Tidak tertutup di bawahnya.',
      formula: {
        en: '(Supplier stock + incoming) ÷ Zone Liability demand.',
        id: '(Stok pemasok + kedatangan) ÷ permintaan Zone Liability.'
      }
    },
    principalLeadTime: {
      label: { en: 'Principal lead time', id: 'Lead time prinsipal' },
      en: 'For a distributor, the time its principal takes to supply it.',
      id: 'Untuk distributor, waktu yang dibutuhkan prinsipalnya untuk memasok.'
    },
    triggerSoh: {
      label: { en: 'PTI stock on hand (SOH), all plants', id: 'Stok PTI (SOH), semua pabrik' },
      en: 'PTI’s stock of the material across all plants. When it reaches ROP Fisik, the hub drafts a call-off.',
      id: 'Stok PTI untuk material itu di semua plant. Bila mencapai ROP Fisik, hub menyusun draf call-off.',
      labelKeys: ['co.trigger.soh']
    },
    orderReason: {
      label: { en: 'Why this size', id: 'Alasan ukuran ini' },
      en: 'Why the order was sized as it is: the cost it saved and the constraint that set it.',
      id: 'Alasan pesanan berukuran seperti itu: biaya yang dihemat dan batasan yang menentukannya.'
    },
    orderSizedBy: {
      label: { en: 'Sized by', id: 'Dihitung dengan' },
      en: 'How the order was sized: jointly across materials, or the single-material fallback (round up to the MOQ and multiple) when the joint sizing cannot run.',
      id: 'Cara pesanan diukur: bersama lintas material, atau fallback satu material (dibulatkan ke MOQ dan kelipatannya) bila pengukuran bersama tidak dapat dijalankan.'
    },
    fillOrderPlan: {
      label: { en: 'Order plan', id: 'Rencana pesanan' },
      en: 'The warehouse fill and pallets in the week under this order plan.',
      id: 'Isi gudang dan palet pada minggu itu dengan rencana pesanan ini.'
    },
    fillInterim: {
      label: { en: 'Interim round-up', id: 'Pembulatan sementara' },
      en: 'The warehouse fill and pallets in the week under the interim round-up, which rounds each order up to the minimum order quantity and its multiple. This order plan replaces it.',
      id: 'Isi gudang dan palet pada minggu itu dengan pembulatan sementara, yang membulatkan tiap pesanan ke atas ke kuantitas pesanan minimum dan kelipatannya. Rencana pesanan ini menggantikannya.',
      // Market practice, not the team's word: SAP keeps this rule as the
      // rounding value in the material master. Accepted by the owner in chat
      // 2026-11-09; its decision ID is still to be assigned in the spec.
      alsoCalled: [
        {
          name: 'rounding value',
          source: { en: 'SAP material master', id: 'data induk material SAP' }
        }
      ],
      labelKeys: ['op.fill.col.interim', 'op.fill.series.interim']
    },
    fillLowest: {
      label: { en: 'Lowest possible', id: 'Terendah yang mungkin' },
      en: 'The lowest stock the week could hold and still serve demand.',
      id: 'Stok terendah yang dapat dimiliki minggu itu dan tetap melayani permintaan.'
    },
    fillAgainst80: {
      label: { en: 'Against 80%', id: 'Terhadap 80%' },
      en: 'Whether the projected warehouse fill stays under the 80% target.',
      id: 'Apakah proyeksi isi gudang tetap di bawah target 80%.'
    },
    fillRented: {
      label: { en: 'Rented pallets', id: 'Palet sewa' },
      en: 'Pallets above the warehouse’s capacity, which need rented space.',
      id: 'Palet di atas kapasitas gudang, yang memerlukan ruang sewa.'
    },
    rentCost: {
      label: { en: 'Rented space cost', id: 'Biaya ruang sewa' },
      en: 'What PTI pays for the space it rents above the warehouse’s capacity.',
      id: 'Yang dibayar PTI untuk ruang yang disewa di atas kapasitas gudang.',
      formula: {
        en: 'Rented pallet-weeks × the rented-space rate.',
        id: 'Palet-minggu sewa × tarif ruang sewa.'
      }
    },
    peakFill: {
      label: { en: 'Highest projected fill', id: 'Isi tertinggi yang diproyeksikan' },
      en: 'The fullest the warehouse is projected to be in any week of the plan.',
      id: 'Isi gudang terpenuh yang diproyeksikan pada minggu mana pun dalam rencana.'
    },
    rentedPalletWeeks: {
      label: { en: 'Rented pallet-weeks', id: 'Palet-minggu sewa' },
      en: 'The pallets above capacity, added over the weeks they stay.',
      id: 'Palet di atas kapasitas, dijumlahkan selama minggu-minggu keberadaannya.'
    },
    fillNow: {
      label: { en: 'Now', id: 'Sekarang' },
      en: 'The projected warehouse fill before any proposal.',
      id: 'Proyeksi isi gudang sebelum usulan apa pun.'
    },
    fillWithSelection: {
      label: { en: 'With the selection', id: 'Dengan pilihan' },
      en: 'The projected warehouse fill after the proposals you selected.',
      id: 'Proyeksi isi gudang setelah usulan yang Anda pilih.'
    },
    fillWithAll: {
      label: { en: 'With every proposal', id: 'Dengan semua usulan' },
      en: 'The projected warehouse fill if every relief proposal were accepted.',
      id: 'Proyeksi isi gudang bila semua usulan pelonggaran diterima.'
    },
    fillOnHand: {
      label: { en: 'Stock on hand', id: 'Stok di tangan' },
      en: 'The warehouse fill from stock already on hand, which no rescheduling can move.',
      id: 'Isi gudang dari stok yang sudah ada, yang tidak dapat digeser penjadwalan ulang.'
    },
    fillStatus: {
      label: { en: 'Status', id: 'Status' },
      en: 'Whether the week is within capacity with the selection.',
      id: 'Apakah minggu itu dalam kapasitas dengan pilihan.'
    },
    rsProposed: {
      label: { en: 'Proposed', id: 'Usulan' },
      en: 'The proposal’s type and its proposed date and quantity.',
      id: 'Jenis usulan serta tanggal dan kuantitas yang diusulkan.'
    },
    rsFreed: {
      label: { en: 'Freed above capacity', id: 'Dibebaskan di atas kapasitas' },
      en: 'The pallet-weeks the move frees in weeks that are over capacity.',
      id: 'Palet-minggu yang dibebaskan pemindahan pada minggu yang melebihi kapasitas.'
    },
    rsSaving: {
      label: { en: 'Rented space saved', id: 'Ruang sewa yang dihemat' },
      en: 'The rented-space cost the move saves.',
      id: 'Biaya ruang sewa yang dihemat pemindahan.',
      formula: {
        en: 'Pallet-weeks freed over capacity × the rented-space rate.',
        id: 'Palet-minggu dibebaskan di atas kapasitas × tarif ruang sewa.'
      }
    },
    rsChangeCost: {
      label: { en: 'Change cost', id: 'Biaya perubahan' },
      en: 'What the move costs: the penalty for changing inside the supplier’s lead time, plus any liability.',
      id: 'Biaya pemindahan: penalti perubahan di dalam lead time pemasok, ditambah kewajiban apa pun.'
    },
    rsPosition: {
      label: { en: 'Zone and lead time', id: 'Zona dan lead time' },
      en: 'Where the delivery sits: its zone (Zone Liability or Zone Capacity), and whether it is inside the supplier’s lead time.',
      id: 'Posisi pengiriman: zonanya (Zone Liability atau Zone Capacity), dan apakah berada di dalam lead time pemasok.'
    },
    rsOver: {
      label: { en: 'Pallet-weeks over capacity', id: 'Palet-minggu di atas kapasitas' },
      en: 'The pallets above warehouse capacity, added over the weeks.',
      id: 'Palet di atas kapasitas gudang, dijumlahkan selama minggu-minggu itu.'
    },
    rsRelief: {
      label: { en: 'Pallet-weeks the proposals free', id: 'Palet-minggu yang dibebaskan usulan' },
      en: 'How many pallet-weeks over capacity the proposals would free.',
      id: 'Berapa palet-minggu di atas kapasitas yang akan dibebaskan usulan.'
    },
    rsOnHandLoad: {
      label: { en: 'Overload that is stock on hand', id: 'Kelebihan yang berupa stok di tangan' },
      en: 'The part of the overload that is stock already on hand, which no rescheduling can move.',
      id: 'Bagian kelebihan yang berupa stok yang sudah ada, yang tidak dapat digeser penjadwalan ulang.'
    },
    dhStale: {
      label: { en: 'Stale or missing feeds', id: 'Umpan usang atau hilang' },
      en: 'Inputs that are older than their freshness limit, or have not arrived.',
      id: 'Input yang lebih tua dari batas kesegarannya, atau belum tiba.'
    },
    dhChecks: {
      label: { en: 'Checks failing', id: 'Pemeriksaan gagal' },
      en: 'Quality checks on the inputs that fail now.',
      id: 'Pemeriksaan mutu pada input yang gagal saat ini.'
    },
    dhRecords: {
      label: { en: 'Records refused', id: 'Catatan ditolak' },
      en: 'Input records a quality check refused on arrival.',
      id: 'Catatan input yang ditolak pemeriksaan mutu saat tiba.'
    },
    dhFreshness: {
      label: { en: 'Freshness', id: 'Kesegaran' },
      en: 'How old the input’s latest data is, against its freshness limit.',
      id: 'Seberapa tua data terbaru input, dibanding batas kesegarannya.'
    },
    dhChecksCol: {
      label: { en: 'Checks', id: 'Pemeriksaan' },
      en: 'The input’s quality checks and how many pass.',
      id: 'Pemeriksaan mutu input dan berapa yang lolos.'
    },
    dhSeverity: {
      label: { en: 'On failure', id: 'Bila gagal' },
      en: 'What happens to a record that fails the check: it is kept out of the calculation, or it is flagged for the planner.',
      id: 'Yang terjadi pada catatan yang gagal pemeriksaan: dikeluarkan dari perhitungan, atau ditandai untuk perencana.',
      labelKeys: ['dh.detail.severity']
    },
    dhAffects: {
      label: { en: 'Affects', id: 'Berdampak ke' },
      en: 'The calculations that need this input, which a failed check blocks.',
      id: 'Perhitungan yang membutuhkan input ini, yang diblokir pemeriksaan yang gagal.'
    },
    dhWhMaterials: {
      label: { en: 'Materials affected if stale', id: 'Material terdampak bila usang' },
      en: 'The materials whose plan uses the warehouse’s stock, so a stale figure affects them.',
      id: 'Material yang rencananya memakai stok gudang itu, sehingga angka usang memengaruhinya.'
    }
  });
