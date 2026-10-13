// Supply below demand anticipation i18n fragment (CAP-12, BL-181,
// SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §6). Namespace: supplyGap.*
//
// Two rows on the Demand anticipation page (Open supply, Gap) and the
// "Below demand anticipation" section on What to order. CAP-D10 — the figure is
// always written out as "demand anticipation" / "antisipasi permintaan"; no
// string abbreviates it, because "DA" labels Delivery Agreements.

/** @type {Record<string, string>} */
export const supplyGapEn = {
  // The Demand anticipation grid.
  'supplyGap.row.openSupply': 'Open supply',
  'supplyGap.row.gap': 'Gap',
  // What to order — the section.
  'supplyGap.title': 'Below demand anticipation',
  'supplyGap.intro':
    'Weeks where released call-offs fall short of the demand anticipation, per supplier and material. A call-off on the oldest blanket PO line with balance comes first, then the next line; what no line covers needs a new PO, which the planner raises in SAP. This list is separate from the recommended orders: it reads the hub’s own call-offs, which the engine does not net.',
  'supplyGap.sample':
    'From the hub’s sample data: the sample LTP, SAP stock and the hub’s own POs and call-offs, not the engine’s dataset.',
  'supplyGap.basis':
    'Open supply is call-offs awaiting confirmation or confirmed, in the week of their need date. Drafts, rejected and dismissed call-offs are not supply, and a blanket balance not yet called off is not dated supply.',
  'supplyGap.count_one': '{{count}} supplier × material × week below demand anticipation',
  'supplyGap.count_other': '{{count}} supplier × material × weeks below demand anticipation',
  'supplyGap.empty': 'No week falls below the demand anticipation.',
  'supplyGap.col.supplier': 'Supplier',
  'supplyGap.col.material': 'Material',
  'supplyGap.col.week': 'Week',
  'supplyGap.col.demandAnticipation': 'Demand anticipation',
  'supplyGap.col.openSupply': 'Open supply',
  'supplyGap.col.gap': 'Gap',
  'supplyGap.col.proposal': 'Proposal',
  'supplyGap.open': 'Open {{material}} for {{supplier}} in Demand anticipation',
  // The proposal.
  'supplyGap.proposal.callOff': 'Call off {{qty}} on {{po}}',
  'supplyGap.proposal.oldest': 'oldest blanket line with balance',
  'supplyGap.proposal.next': 'next blanket line with balance',
  'supplyGap.proposal.newPo': 'New PO needed: {{qty}} {{uom}}',
  'supplyGap.proposal.newPoHint':
    'No blanket line has balance left for this. The hub recommends it; the planner raises the PO in SAP.',
  'supplyGap.action.draft': 'Create draft call-off',
  'supplyGap.action.drafted': 'Draft created',
  'supplyGap.action.needDate': 'Need date {{date}}',
  'supplyGap.action.releaseNote':
    'Release it from the Call-offs page, which checks the blanket balance again.',
  'supplyGap.toast.drafted': 'Draft call-off created',
  'supplyGap.toast.draftedDesc':
    'It is not supply until it is released. Release it from the Call-offs page.',
  'supplyGap.toast.refused': 'The draft was not created'
};

/** @type {Record<string, string>} */
export const supplyGapId = {
  'supplyGap.row.openSupply': 'Pasokan terbuka',
  'supplyGap.row.gap': 'Kekurangan',
  'supplyGap.title': 'Di bawah antisipasi permintaan',
  'supplyGap.intro':
    'Minggu-minggu ketika call-off yang dirilis kurang dari antisipasi permintaan, per pemasok dan material. Call-off pada baris PO induk tertua yang masih bersaldo didahulukan, lalu baris berikutnya; yang tidak tertutup baris mana pun memerlukan PO baru, yang dibuat perencana di SAP. Daftar ini terpisah dari pesanan yang direkomendasikan: daftar ini membaca call-off hub sendiri, yang tidak diperhitungkan oleh mesin.',
  'supplyGap.sample':
    'Dari data contoh hub: LTP contoh, stok SAP, serta PO dan call-off hub sendiri, bukan dataset mesin.',
  'supplyGap.basis':
    'Pasokan terbuka adalah call-off yang menunggu konfirmasi atau sudah dikonfirmasi, pada minggu tanggal kebutuhannya. Draf, call-off yang ditolak dan yang dibatalkan bukan pasokan, dan saldo PO induk yang belum di-call-off bukan pasokan bertanggal.',
  'supplyGap.count_other': '{{count}} pemasok × material × minggu di bawah antisipasi permintaan',
  'supplyGap.empty': 'Tidak ada minggu di bawah antisipasi permintaan.',
  'supplyGap.col.supplier': 'Pemasok',
  'supplyGap.col.material': 'Material',
  'supplyGap.col.week': 'Minggu',
  'supplyGap.col.demandAnticipation': 'Antisipasi permintaan',
  'supplyGap.col.openSupply': 'Pasokan terbuka',
  'supplyGap.col.gap': 'Kekurangan',
  'supplyGap.col.proposal': 'Usulan',
  'supplyGap.open': 'Buka {{material}} untuk {{supplier}} di Antisipasi permintaan',
  'supplyGap.proposal.callOff': 'Call-off {{qty}} pada {{po}}',
  'supplyGap.proposal.oldest': 'baris PO induk tertua yang masih bersaldo',
  'supplyGap.proposal.next': 'baris PO induk berikutnya yang masih bersaldo',
  'supplyGap.proposal.newPo': 'Perlu PO baru: {{qty}} {{uom}}',
  'supplyGap.proposal.newPoHint':
    'Tidak ada baris PO induk yang masih bersaldo untuk ini. Hub merekomendasikannya; perencana membuat PO di SAP.',
  'supplyGap.action.draft': 'Buat draf call-off',
  'supplyGap.action.drafted': 'Draf dibuat',
  'supplyGap.action.needDate': 'Tanggal kebutuhan {{date}}',
  'supplyGap.action.releaseNote':
    'Rilis dari halaman Call-off, yang memeriksa saldo PO induk sekali lagi.',
  'supplyGap.toast.drafted': 'Draf call-off dibuat',
  'supplyGap.toast.draftedDesc':
    'Draf belum menjadi pasokan sampai dirilis. Rilis dari halaman Call-off.',
  'supplyGap.toast.refused': 'Draf tidak dibuat'
};
