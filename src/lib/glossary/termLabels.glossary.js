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
// ─────────────────────────────────────────────────────────────────────────────
/** @import { GlossaryOf, TermEntry } from './types' */

/**
 * The terms a page labels through `TermLabel`.
 * @typedef {'demandAnticipation' | 'ltp' | 'fgDemand' | 'ltpLessFgDemand' | 'consumptionAverage' | 'safetyOrder' | 'carryOver' | 'wouldBe' | 'surplusAbsorbed' | 'recordedConsumption' | 'openSupply' | 'supplyGap' | 'daAfterCheck' | 'ospo' | 'additionalPo' | 'callOffsThisWeek' | 'remainder' | 'notCarried' | 'supplierAgreedOutside' | 'gapProposal' | 'alertPtiBelowRop' | 'alertSupplierBelowRop' | 'alertProjectedStockOut' | 'alertCapacityBelowDemand' | 'alertStaleData' | 'alertCoverage' | 'alertCommitmentBelowForecast' | 'alertLeadTimeMissing' | 'alertCallOffNotCovered' | 'alertSupplyDiscontinued' | 'alertBlanketPoRunOut' | 'alertDemandAnticipationUnabsorbed' | 'supplierCover' | 'supplierStock' | 'ptiStockRop' | 'incoming' | 'incomingStatus' | 'supplierAvailable' | 'calledOffNotShipped' | 'freeToCallOff' | 'ptiInbound' | 'simulationBasis' | 'simulationFlags' | 'supplierOwnRop' | 'ptiStock' | 'ptiRop' | 'daysOfSupply' | 'feedstockLatest' | 'feedstockThisWeek' | 'tradeNameStatus' | 'capacityLtp' | 'allocatedCapacity' | 'productionLimit' | 'additionalCapacity' | 'capacityBe' | 'ltpAgainstCapacity' | 'capacityShortBy' | 'ptiCapacityDecision' | 'runOutRemaining' | 'runsOut' | 'newPoNeededBy' | 'poLeadTime' | 'spaceFreed' | 'materialsPerTier' | 'onSapValue' | 'sltGroupDefault' | 'tierTarget' | 'safetyOrderRopOrder' | 'ropFisikSafety' | 'demandCv' | 'osipLevel' | 'ropOrder' | 'ropFisik' | 'maxStock' | 'engineSafetyStock' | 'sapSafetyStock' | 'freed' | 'safetyLeadTime' | 'engineReorderPoint' | 'forecastShortfall' | 'ropSupplier' | 'ropToPrincipal' | 'replenishmentCycle' | 'pullAgreement' | 'bottleneckLeadTime' | 'monthLtp' | 'protectionBaseline' | 'uplift' | 'protectionBuffer' | 'strategicBaseline' | 'strategicBuffer' | 'poOrdered' | 'reconcileCalledOff' | 'asnRequested' | 'notYetCalledOff' | 'calledOffNotYetShipped' | 'maxStockSupplier'} TermLabelId
 */

const TEAM_OSIP = {
  en: 'Material Planning team, OSIP playbook',
  id: 'Tim Material Planning, OSIP playbook'
};
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
      alsoCalled: [{ name: 'DA', source: TEAM_OSIP }],
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
          source: {
            en: 'Material Planning team, Q-file A8',
            id: 'Tim Material Planning, Q-file A8'
          }
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
          source: {
            en: 'Material Planning team, Q-file A9',
            id: 'Tim Material Planning, Q-file A9'
          }
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
          source: {
            en: 'Material Planning team, Q-file A8',
            id: 'Tim Material Planning, Q-file A8'
          }
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
      label: { en: 'Risk · supplier cover', id: 'Risiko · cakupan pemasok' },
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
      label: { en: 'Supplier available', id: 'Tersedia di pemasok' },
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
          source: {
            en: 'Material Planning team’s stock sheet, Q-file B10',
            id: 'Sheet stok tim Material Planning, Q-file B10'
          }
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
      label: { en: 'PTI reorder point', id: 'Titik pemesanan ulang PTI' },
      en: 'The stock level at which PTI reorders the material. It comes from SAP until PTI’s forecast engine calculates it.',
      id: 'Tingkat stok saat PTI memesan ulang material itu. Diambil dari SAP sampai mesin prakiraan PTI menghitungnya.',
      alsoCalled: [{ name: 'PTI ROP', source: MAT_ALERTS }],
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
      label: { en: 'Safety order (ROP Order)', id: 'Safety order (ROP Order)' },
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
      label: { en: 'ROP Fisik safety', id: 'ROP Fisik safety' },
      en: 'The safety part of ROP Fisik, in days of demand.',
      id: 'Bagian pengaman dari ROP Fisik, dalam hari permintaan.',
      formula: {
        en: 'Ceiling(g × min(highest recent consumption, capacity, LTP), MPQ); g is 1 day unless set per material.',
        id: 'Ceiling(g × min(konsumsi tertinggi terakhir, kapasitas, LTP), MPQ); g 1 hari kecuali diatur per material.'
      },
      alsoCalled: [
        {
          name: 'Safety ROP Fisik',
          source: {
            en: 'Material Planning team deck, Q-file B1',
            id: 'Deck tim Material Planning, Q-file B1'
          }
        }
      ]
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
          source: {
            en: 'Material Planning team, Q-file C1',
            id: 'Tim Material Planning, Q-file C1'
          }
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
          source: {
            en: 'Material Planning team, Q-file C2',
            id: 'Tim Material Planning, Q-file C2'
          }
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
      label: { en: 'ROP to principal', id: 'ROP ke prinsipal' },
      en: 'A distributor’s reorder point for ordering from its principal, as the team’s sheet works it out. The team has not answered how it is set.',
      id: 'Titik pemesanan ulang distributor untuk memesan ke prinsipalnya, sebagaimana dihitung sheet tim. Tim belum menjawab cara penetapannya.',
      alsoCalled: [
        {
          name: 'ROP order to principal',
          source: {
            en: 'Material Planning team’s sheet, Q-file B10',
            id: 'Sheet tim Material Planning, Q-file B10'
          }
        }
      ]
    },
    replenishmentCycle: {
      label: { en: 'Replenishment cycle f', id: 'Replenishment cycle f' },
      en: 'How often the supplier replenishes PTI, which sizes ROP Fisik. The slide values are assumptions to treat as data.',
      id: 'Seberapa sering pemasok mengisi ulang PTI, yang menentukan besar ROP Fisik. Nilai di slide adalah asumsi yang diperlakukan sebagai data.',
      alsoCalled: [
        {
          name: 'cycle replenishment',
          source: { en: 'OSIP deck, Q-file B6', id: 'Deck OSIP, Q-file B6' }
        },
        { name: 'call-off lead time', source: { en: 'MoM, Q-file B6', id: 'MoM, Q-file B6' } }
      ]
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
          source: { en: 'team sheet Guidance, Q-file C3', id: 'sheet Guidance tim, Q-file C3' }
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
    }
  });
