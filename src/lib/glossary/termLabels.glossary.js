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
// ─────────────────────────────────────────────────────────────────────────────
/** @import { GlossaryOf, TermEntry } from './types' */

/**
 * The terms a page labels through `TermLabel`.
 * @typedef {'demandAnticipation' | 'ltp' | 'fgDemand' | 'ltpLessFgDemand' | 'consumptionAverage' | 'safetyOrder' | 'carryOver' | 'wouldBe' | 'surplusAbsorbed' | 'recordedConsumption' | 'openSupply' | 'supplyGap' | 'daAfterCheck' | 'ospo' | 'additionalPo' | 'callOffsThisWeek' | 'remainder' | 'notCarried' | 'supplierAgreedOutside' | 'gapProposal' | 'alertPtiBelowRop' | 'alertSupplierBelowRop' | 'alertProjectedStockOut' | 'alertCapacityBelowDemand' | 'alertStaleData' | 'alertCoverage' | 'alertCommitmentBelowForecast' | 'alertLeadTimeMissing' | 'alertCallOffNotCovered' | 'alertSupplyDiscontinued' | 'alertBlanketPoRunOut' | 'alertDemandAnticipationUnabsorbed'} TermLabelId
 */

const TEAM_OSIP = {
  en: 'Material Planning team, OSIP playbook',
  id: 'Tim Material Planning, OSIP playbook'
};
const NOT_DELIVERY_AGREEMENT = {
  en: 'Delivery Agreement (also DA, on the contract pages).',
  id: 'Delivery Agreement (juga DA, di halaman kontrak).'
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
    consumptionAverage: {
      label: {
        en: 'Consumption, {{weeks}}-week average',
        id: 'Konsumsi, rata-rata {{weeks}} minggu'
      },
      en: 'The material’s average weekly consumption over the recent weeks that have consumption recorded, times this supplier’s share.',
      id: 'Rata-rata konsumsi mingguan material selama minggu-minggu terakhir yang konsumsinya tercatat, dikali porsi pemasok ini.',
      formula: {
        en: 'Recorded consumption of the last 13 weeks ÷ the weeks with a record, × the supplier’s share.',
        id: 'Konsumsi tercatat 13 minggu terakhir ÷ jumlah minggu yang tercatat, × porsi pemasok.'
      },
      alsoCalled: [
        {
          name: 'moving average consumption',
          source: {
            en: 'Material Planning team, Q-file A11',
            id: 'Tim Material Planning, Q-file A11'
          }
        }
      ]
    },
    safetyOrder: {
      label: { en: 'Safety order', id: 'Safety order' },
      en: 'An extra quantity in week 1 of the demand anticipation (DA). The supplier keeps it as feedstock against demand above the LTP.',
      id: 'Kuantitas tambahan di minggu 1 demand anticipation (DA). Pemasok menyimpannya sebagai feedstock untuk menutup permintaan di atas LTP.',
      formula: {
        en: 'Z × √lead time × standard deviation of the LTP over the next 13 weeks, rounded up to a multiple of the MPQ. Z is 1.65 unless set per material.',
        id: 'Z × √lead time × simpangan baku LTP 13 minggu ke depan, dibulatkan ke atas ke kelipatan MPQ. Z bernilai 1,65 kecuali diatur per material.'
      },
      notToConfuse: {
        en: 'Safety stock (stock PTI keeps on hand, on the forecast pages).',
        id: 'Safety stock (stok yang disimpan PTI, di halaman prakiraan).'
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
    }
  });
