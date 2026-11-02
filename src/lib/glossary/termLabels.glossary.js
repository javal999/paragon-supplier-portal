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
// ─────────────────────────────────────────────────────────────────────────────
/** @import { GlossaryOf, TermEntry } from './types' */

/**
 * The terms a page labels through `TermLabel`.
 * @typedef {'demandAnticipation' | 'ltp' | 'fgDemand' | 'ltpLessFgDemand' | 'consumptionAverage' | 'safetyOrder' | 'carryOver' | 'wouldBe' | 'surplusAbsorbed' | 'recordedConsumption' | 'openSupply' | 'supplyGap' | 'daAfterCheck' | 'ospo' | 'additionalPo' | 'callOffsThisWeek' | 'remainder' | 'notCarried' | 'supplierAgreedOutside' | 'gapProposal' | 'alertPtiBelowRop' | 'alertSupplierBelowRop' | 'alertProjectedStockOut' | 'alertCapacityBelowDemand' | 'alertStaleData' | 'alertCoverage' | 'alertCommitmentBelowForecast' | 'alertLeadTimeMissing' | 'alertCallOffNotCovered' | 'alertSupplyDiscontinued' | 'alertBlanketPoRunOut' | 'alertDemandAnticipationUnabsorbed' | 'supplierCover' | 'supplierStock' | 'ptiStockRop' | 'incoming' | 'incomingStatus' | 'supplierAvailable' | 'calledOffNotShipped' | 'freeToCallOff' | 'ptiInbound' | 'simulationBasis' | 'simulationFlags' | 'supplierOwnRop' | 'ptiStock' | 'ptiRop' | 'daysOfSupply' | 'feedstockLatest' | 'feedstockThisWeek' | 'tradeNameStatus' | 'capacityLtp' | 'allocatedCapacity' | 'productionLimit' | 'additionalCapacity' | 'capacityBe' | 'ltpAgainstCapacity' | 'capacityShortBy' | 'ptiCapacityDecision' | 'runOutRemaining' | 'runsOut' | 'newPoNeededBy' | 'poLeadTime' | 'spaceFreed' | 'materialsPerTier' | 'onSapValue' | 'sltGroupDefault' | 'tierTarget' | 'safetyOrderRopOrder' | 'ropFisikSafety' | 'demandCv' | 'osipLevel' | 'ropOrder' | 'ropFisik' | 'maxStock' | 'engineSafetyStock' | 'sapSafetyStock' | 'freed' | 'safetyLeadTime' | 'engineReorderPoint' | 'forecastShortfall' | 'ropSupplier' | 'ropToPrincipal' | 'replenishmentCycle' | 'pullAgreement' | 'bottleneckLeadTime' | 'monthLtp' | 'protectionBaseline' | 'uplift' | 'protectionBuffer' | 'strategicBaseline' | 'strategicBuffer' | 'poOrdered' | 'reconcileCalledOff' | 'asnRequested' | 'notYetCalledOff' | 'calledOffNotYetShipped' | 'maxStockSupplier' | 'whatIfMax' | 'daOverLeadTime' | 'prGenerated' | 'planCheckPr' | 'triggerCallOffs' | 'triggerPr' | 'whatIfRemainder' | 'whatIfCarryOver' | 'firstShortageWeek' | 'weeksAboveMax' | 'whatIfLtp' | 'daCurrentPlan' | 'daScenario' | 'callOffsDrafted' | 'whatIfIncoming' | 'prRecommendedWeek' | 'projectedSohPlan' | 'projectedSohScenario' | 'engineValue' | 'lastPublished' | 'firstPublished' | 'dampedValue' | 'allowedRange' | 'toPublish' | 'stabiliseRule' | 'ruleNew' | 'ruleUnchanged' | 'ruleFirmFrozen' | 'ruleForecast' | 'ruleDamped' | 'ruleBandHeld' | 'ruleCumulativeHeld' | 'ruleOverride' | 'planMovement' | 'weeksChangedInLeadTime' | 'tradeOffWithinLimits' | 'weeksHeld' | 'seriesHeld' | 'seriesMasc' | 'forecastZone' | 'publishedForecast' | 'commitmentDue' | 'commitment' | 'commitmentUpside' | 'grPendingInspection' | 'grQualityHold' | 'grApprovedToday' | 'grRejectionRate' | 'grDisposition' | 'grExpected' | 'grReceived' | 'grAccepted' | 'grRejectedLine' | 'grChecks' | 'poOpenTotal' | 'poPendingConfirmation' | 'poInTransit' | 'poOverdue' | 'orderedQty' | 'counterQty' | 'counterDate' | 'summaryResponse' | 'summaryAsns' | 'summaryCallOffs' | 'summaryConfirmations' | 'summaryReceipts' | 'summaryInvoices' | 'prDraft' | 'prPendingApproval' | 'prApproved' | 'prSourcingEvent' | 'prPoCreated' | 'prSource' | 'supShipped' | 'supReceived' | 'supRejected' | 'supQualityResult' | 'supDiscrepancy' | 'supDifference' | 'supOpenOrders' | 'supInProgress' | 'supValuePending' | 'supDelivered' | 'supConfirmed' | 'invPendingApproval' | 'invReleased' | 'invDisputed' | 'invOverdue' | 'invThreeWayMatch' | 'agingBucket' | 'agingPctAp' | 'agingRisk' | 'invLineQuantity' | 'invUnitPrice' | 'invLineValue' | 'shipInTransit' | 'shipAtDock' | 'shipDelayed' | 'shipArrivingToday' | 'shelfLifeLeftAtEta' | 'supPaymentsReceived' | 'supPendingPayment' | 'supInvDisputed' | 'supThreeWayMatch' | 'asnDraft' | 'asnSubmitted' | 'asnInTransit' | 'asnDelivered' | 'asnDiscrepancy' | 'asnLineOrdered' | 'asnLineShipped' | 'asnOpenQuantity' | 'asnShippedQuantity' | 'deliveryAgreed' | 'deliveryReleased' | 'deliveryDelivered' | 'deliveryRemaining' | 'releasePlanned' | 'releaseFulfillment' | 'releaseDrawnDown' | 'certExpired' | 'certExpiring' | 'certMissing' | 'certUnderReview' | 'certValid' | 'certInSap' | 'certActionRequired' | 'contractsActive' | 'contractsExpiring' | 'obligationsOverdue' | 'contractsActiveValue' | 'contractPerformance'} TermLabelId
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
      labelKeys: ['daHist.csv.ltp']
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
      en: 'Raised when the supplier committed less than the forecast by more than the tolerance. High risk in the Firm zone, Medium in the Trade-off zone.',
      id: 'Muncul bila pemasok berkomitmen lebih sedikit dari prakiraan melebihi toleransi. Risiko Tinggi di zona Firm, Sedang di zona Trade-off.',
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
        id: 'Minggu habis − waktu tunggu PO.'
      }
    },
    poLeadTime: {
      label: { en: 'PO lead time', id: 'Waktu tunggu PO' },
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
        id: 'Waktu tunggu pengaman dari nilai bawaan grup'
      },
      en: 'Materials whose supplier has too few receipts, so their safety lead time is the material group’s pooled figure.',
      id: 'Material yang pemasoknya punya terlalu sedikit penerimaan, sehingga waktu tunggu pengamannya adalah angka gabungan grup material.'
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
      }
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
      }
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
      label: { en: 'Safety lead time', id: 'Waktu tunggu pengaman' },
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
        id: 'Permintaan × waktu tunggu produksi bottleneck pemasok, termasuk antrean.'
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
        id: 'Waktu tunggu produksi bottleneck (ROP Supplier)'
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
    calledOffNotYetShipped: {
      label: { en: 'Called off, not yet shipped', id: 'Di-call-off, belum dikirim' },
      en: 'Called-off quantity that no shipping notice covers yet.',
      id: 'Kuantitas yang sudah di-call-off tetapi belum ditutup pemberitahuan pengiriman.',
      formula: {
        en: 'Called off − ASN requested, never below 0.',
        id: 'Di-call-off − diminta di ASN, tidak pernah di bawah 0.'
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
    daOverLeadTime: {
      label: {
        en: 'Demand anticipation (DA) over the lead time',
        id: 'Demand anticipation (DA) sepanjang lead time'
      },
      en: 'The sum of the weekly demand anticipation (DA) across the lead-time horizon.',
      id: 'Jumlah demand anticipation (DA) mingguan sepanjang horizon lead time.',
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
    daCurrentPlan: {
      label: {
        en: 'Demand anticipation (DA), current plan',
        id: 'Demand anticipation (DA), rencana saat ini'
      },
      en: 'The weekly demand anticipation (DA) the live plan gives, for comparison.',
      id: 'Demand anticipation (DA) mingguan dari rencana yang berjalan, sebagai pembanding.',
      notToConfuse: NOT_DELIVERY_AGREEMENT
    },
    daScenario: {
      label: {
        en: 'Demand anticipation (DA), this scenario',
        id: 'Demand anticipation (DA), skenario ini'
      },
      en: 'The weekly demand anticipation (DA) under the inputs and rules of this scenario.',
      id: 'Demand anticipation (DA) mingguan dengan input dan aturan skenario ini.',
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
      en: 'A Trade-off week’s new value blended with its last published value, so the plan moves less.',
      id: 'Nilai baru minggu Trade-off yang dicampur dengan nilai terakhir yang diterbitkan, agar rencana tidak banyak bergerak.',
      formula: {
        en: 'Weight × last published + (1 − weight) × engine value; weight 0.5 in Trade-off, 0 in Forecast.',
        id: 'Bobot × terakhir diterbitkan + (1 − bobot) × nilai mesin; bobot 0,5 di Trade-off, 0 di Forecast.'
      }
    },
    allowedRange: {
      label: { en: 'Allowed range', id: 'Rentang yang diizinkan' },
      en: 'How far a Trade-off week may move without the planner’s reason: ±10% from the last published value, and ±20% from the first.',
      id: 'Seberapa jauh minggu Trade-off boleh bergerak tanpa alasan perencana: ±10% dari nilai terakhir yang diterbitkan, dan ±20% dari nilai pertama.',
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
      label: { en: 'Firm — kept as published', id: 'Firm — tetap seperti yang diterbitkan' },
      en: 'A Firm week never changes once published.',
      id: 'Minggu Firm tidak pernah berubah setelah diterbitkan.',
      labelKeys: ['stb.rule.firmFrozen']
    },
    ruleForecast: {
      label: { en: 'Forecast — as calculated', id: 'Forecast — apa adanya' },
      en: 'A Forecast-zone week is not damped or held: the engine value is published.',
      id: 'Minggu zona Forecast tidak diredam atau ditahan: nilai mesin diterbitkan.',
      labelKeys: ['stb.rule.forecast']
    },
    ruleDamped: {
      label: { en: 'Trade-off — damped', id: 'Trade-off — diredam' },
      en: 'A Trade-off week’s value is blended with its last published value, and the result is within the allowed range.',
      id: 'Nilai minggu Trade-off dicampur dengan nilai terakhir yang diterbitkan, dan hasilnya berada dalam rentang yang diizinkan.',
      labelKeys: ['stb.rule.damped']
    },
    ruleBandHeld: {
      label: {
        en: 'Trade-off — held at ±10% a version',
        id: 'Trade-off — ditahan pada ±10% per versi'
      },
      en: 'The damped value moved more than 10% from the last published value, so it is held at that edge.',
      id: 'Nilai yang diredam bergerak lebih dari 10% dari nilai terakhir yang diterbitkan, sehingga ditahan di batas itu.',
      labelKeys: ['stb.rule.bandHeld']
    },
    ruleCumulativeHeld: {
      label: {
        en: 'Trade-off — held at ±20% from the first value',
        id: 'Trade-off — ditahan pada ±20% dari nilai pertama'
      },
      en: 'The value moved more than 20% from the first value the supplier saw, so it is held at that edge.',
      id: 'Nilai bergerak lebih dari 20% dari nilai pertama yang dilihat pemasok, sehingga ditahan di batas itu.',
      labelKeys: ['stb.rule.cumulativeHeld']
    },
    ruleOverride: {
      label: {
        en: 'Trade-off — beyond the band, with the planner’s reason',
        id: 'Trade-off — di luar batas, dengan alasan perencana'
      },
      en: 'The planner published a value outside the band and gave a reason. The supplier sees the reason, and the week asks for a new commitment.',
      id: 'Perencana menerbitkan nilai di luar batas dan memberi alasan. Pemasok melihat alasannya, dan minggu itu meminta komitmen baru.',
      labelKeys: ['stb.rule.override']
    },
    planMovement: {
      label: { en: 'Plan movement (MASC)', id: 'Pergerakan rencana (MASC)' },
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
        en: 'Weeks changed inside the lead time',
        id: 'Minggu yang berubah dalam waktu tunggu'
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
      label: { en: 'Trade-off weeks within limits', id: 'Minggu Trade-off dalam batas' },
      en: 'The share of Trade-off weeks whose quantity to publish stays within the allowed range.',
      id: 'Porsi minggu Trade-off yang kuantitas terbitnya tetap dalam rentang yang diizinkan.',
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
      en: 'Weeks whose quantity to publish differs from the engine value: Firm weeks kept, weeks held at the band, and damped weeks.',
      id: 'Minggu yang kuantitas terbitnya berbeda dari nilai mesin: minggu Firm yang dipertahankan, minggu yang ditahan di batas, dan minggu yang diredam.'
    },
    seriesHeld: {
      label: { en: 'Held (Firm · band · damped)', id: 'Ditahan (Firm · batas · diredam)' },
      en: 'For the series, how many weeks are held, split into Firm weeks kept, weeks held at the band, and damped weeks.',
      id: 'Untuk seri itu, berapa minggu yang ditahan, dipisah menjadi minggu Firm yang dipertahankan, minggu yang ditahan di batas, dan minggu yang diredam.'
    },
    seriesMasc: {
      label: { en: 'MASC raw → stabilised', id: 'MASC mentah → distabilkan' },
      en: 'The series’ plan movement (MASC) before stabilising and after it. Lower means a steadier plan for the supplier.',
      id: 'Pergerakan rencana (MASC) seri itu sebelum dan sesudah distabilkan. Makin rendah, makin stabil rencana bagi pemasok.'
    },
    forecastZone: {
      label: { en: 'Zone', id: 'Zona' },
      en: 'Firm: inside the firm lead time, quantities never change once published. Trade-off: up to the raw-material lead time, moves are limited. Forecast: beyond, for planning only.',
      id: 'Firm: di dalam lead time firm, kuantitas tidak berubah setelah diterbitkan. Trade-off: sampai lead time bahan baku, pergerakan dibatasi. Forecast: setelahnya, hanya untuk perencanaan.',
      labelKeys: ['fc.col.zone']
    },
    publishedForecast: {
      label: { en: 'Forecast ({{uom}})', id: 'Prakiraan ({{uom}})' },
      en: 'The quantity PTI published for the period in this forecast version.',
      id: 'Kuantitas yang diterbitkan PTI untuk periode itu pada versi prakiraan ini.'
    },
    commitmentDue: {
      label: { en: 'Commitment due', id: 'Tenggat komitmen' },
      en: 'When the commitment for the period is due: 1 working day after publication for Firm periods, 3 working days for Trade-off and Forecast periods.',
      id: 'Kapan komitmen untuk periode itu jatuh tempo: 1 hari kerja setelah penerbitan untuk periode Firm, 3 hari kerja untuk periode Trade-off dan Forecast.',
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
      label: { en: 'Exp', id: 'Eksp' },
      en: 'Expected: the quantity the shipping notice said would arrive on the line.',
      id: 'Diharapkan: kuantitas yang menurut pemberitahuan pengiriman akan tiba pada baris itu.',
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
      label: { en: 'Pending Confirmation', id: 'Menunggu Konfirmasi' },
      en: 'POs sent to the supplier that it has not answered yet: Sent or Viewed.',
      id: 'PO yang dikirim ke pemasok dan belum dijawab: Terkirim atau Dilihat.'
    },
    poInTransit: {
      label: { en: 'In Transit', id: 'Dalam Perjalanan' },
      en: 'POs the supplier confirmed or has partly delivered.',
      id: 'PO yang sudah dikonfirmasi pemasok atau sudah dikirim sebagian.'
    },
    poOverdue: {
      label: { en: 'Overdue', id: 'Jatuh Tempo' },
      en: 'Open POs past their requested delivery date.',
      id: 'PO terbuka yang melewati tanggal pengiriman yang diminta.'
    },
    orderedQty: {
      label: { en: 'Ordered', id: 'Dipesan' },
      en: 'The quantity ordered on the PO line.',
      id: 'Kuantitas yang dipesan pada baris PO.'
    },
    counterQty: {
      label: { en: 'Can supply', id: 'Sanggup dipasok' },
      en: 'The quantity the supplier offers for the line, when it cannot supply all of it: above 0 and at most the ordered quantity.',
      id: 'Kuantitas yang ditawarkan pemasok untuk baris itu, bila tidak sanggup memasok semuanya: di atas 0 dan paling banyak kuantitas yang dipesan.'
    },
    counterDate: {
      label: { en: 'Can deliver', id: 'Sanggup dikirim' },
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
      label: { en: 'Receipts', id: 'Penerimaan barang' },
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
      en: 'POs you confirmed or have partly delivered.',
      id: 'PO yang sudah Anda konfirmasi atau sudah dikirim sebagian.'
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
      en: 'The value of invoices returned to the supplier with a reason, for it to correct and resubmit.',
      id: 'Nilai faktur yang dikembalikan ke pemasok dengan alasan, untuk diperbaiki dan diajukan ulang.'
    },
    invOverdue: {
      label: { en: 'Overdue', id: 'Jatuh Tempo' },
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
      label: { en: 'Value', id: 'Nilai' },
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
      label: { en: 'Disputed', id: 'Disengketakan' },
      en: 'The value of your invoices PTI returned with a reason, for you to correct and resubmit.',
      id: 'Nilai faktur Anda yang dikembalikan PTI dengan alasan, untuk Anda perbaiki dan ajukan ulang.'
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
    }
  });
