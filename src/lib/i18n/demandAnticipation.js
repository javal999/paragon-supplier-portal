// Demand anticipation i18n fragment (CAP-10, reworked by DRC-2 / BL-188 and
// DRC-4 / BL-190, SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10).
// Namespace: demandAnt.*
//
// CAP-D10 — the figure is always written out as "Demand anticipation" /
// "Antisipasi permintaan". No string here abbreviates it: "DA" already labels
// Delivery Agreements on the contract pages. ROP, SOH, OSPO, OSPR and PR are
// the planners' own abbreviations and are kept in both languages.

/** @type {Record<string, string>} */
export const demandAnticipationEn = {
  'demandAnt.subtitle':
    'What PTI expects to call off from each supplier, per material and week, over the lead time. The horizon rolls weekly: each planning week is published on its own, and the next one rolls forward.',
  'demandAnt.asOf': 'As of',
  'demandAnt.howItWorks':
    'Each week of the horizon is the LTP plus any remainder carried into it; the first week also carries the safety order. What the first week’s call-offs leave goes to the last week of the horizon, or to the first week outside it when the supplier agreed. Supply above the total is absorbed in the last week; a shortfall is a PR recommendation to raise in SAP. Nothing is sent to SAP or a supplier.',
  // The planning week and its publication.
  'demandAnt.pub.label': 'Planning week',
  'demandAnt.pub.none': 'not published yet',
  'demandAnt.pub.publishedSame': 'published; today’s figures match',
  'demandAnt.pub.publishedChanged_one':
    'published; {{count}} supplier × material differs from today’s figures',
  'demandAnt.pub.publishedChanged_other':
    'published; {{count}} supplier × materials differ from today’s figures',
  'demandAnt.pub.sampleSeed': 'Sample publication, computed from the sample data on {{date}}',
  'demandAnt.pub.published': 'Last published {{date}}',
  'demandAnt.pub.unattributed': 'not attributed to a person (no one is signed in by name)',
  // The publish act.
  'demandAnt.publish.button': 'Publish demand anticipation · {{week}}',
  'demandAnt.publish.confirmTitle': 'Publish demand anticipation',
  'demandAnt.publish.confirmBody':
    'This records the demand anticipation of planning week {{week}} ({{dates}}) at today’s figures, for every supplier × material.',
  'demandAnt.publish.confirmChanged_one':
    '{{count}} supplier × material differs from the figures published for this week.',
  'demandAnt.publish.confirmChanged_other':
    '{{count}} supplier × materials differ from the figures published for this week.',
  'demandAnt.publish.confirmKept':
    'An earlier publication of this week stays on record; the new one is the one in force. Nothing is sent to SAP or a supplier.',
  'demandAnt.publish.cancel': 'Cancel',
  'demandAnt.publish.confirm': 'Publish',
  'demandAnt.publish.done': 'Demand anticipation published for {{week}}',
  'demandAnt.publish.failed': 'Could not publish demand anticipation',
  // The supplier's agreement to take a remainder outside the horizon [Owner A8].
  'demandAnt.agree.legend': 'Supplier agreed to take the remainder after the horizon',
  'demandAnt.agree.help':
    'Tick only where the supplier agreed. Without it the remainder goes to the last week of the horizon.',
  'demandAnt.agree.option': '{{qty}} to {{outside}} instead of {{last}}',
  // The filters.
  'demandAnt.filter.supplier': 'Supplier',
  'demandAnt.filter.material': 'Material',
  'demandAnt.filter.all': 'All',
  'demandAnt.filter.clear': 'Clear filters',
  'demandAnt.empty.title': 'No demand anticipation to show',
  'demandAnt.empty.body': 'No supplier has an LTP in the current forecast versions.',
  'demandAnt.empty.filtered': 'No supplier × material matches these filters.',
  // One supplier × material.
  'demandAnt.card.share': 'Share {{pct}}',
  'demandAnt.card.noStock': 'No PTI stock record in SAP: the check counts no stock on hand.',
  'demandAnt.grid.corner': 'Week',
  // The grid rows.
  'demandAnt.row.ltp': 'LTP',
  'demandAnt.row.safety': 'Safety order',
  'demandAnt.row.carriedIn': 'Carried in',
  'demandAnt.row.carriedFrom': '{{qty}} from {{week}}',
  'demandAnt.row.figure': 'Demand anticipation',
  'demandAnt.row.wouldBe': 'Would be',
  'demandAnt.row.absorbed': 'Surplus absorbed',
  'demandAnt.row.absorbedCell': '−{{qty}} supply above demand anticipation',
  'demandAnt.published': 'Published',
  'demandAnt.horizon': 'Horizon',
  'demandAnt.publishedParts':
    'Published {{date}}: LTP {{ltp}}, safety order {{safety}}, carried in {{carried}}',
  'demandAnt.noChange': 'no change',
  'demandAnt.wouldBeHelp': 'Would be: today’s figure beside a published one, for information only.',
  // The plan vs execution check (DRC-4).
  'demandAnt.check.title': 'Plan vs execution',
  'demandAnt.check.sourceSample': '{{week}} · sample publication of {{date}}',
  'demandAnt.check.sourcePublished': '{{week}} · published {{date}}',
  'demandAnt.check.sourceToday': '{{week}} · today’s figures, not published',
  'demandAnt.check.horizon': 'Horizon (lead time)',
  'demandAnt.check.horizonWeeks_one': '{{count}} week',
  'demandAnt.check.horizonWeeks_other': '{{count}} weeks',
  'demandAnt.check.totalDa': 'Total demand anticipation',
  'demandAnt.check.ropOrder': 'ROP Order',
  'demandAnt.check.ropParts': '(cycle stock {{cycle}} + safety order {{safety}})',
  'demandAnt.check.supply': 'SOH + OSPO + OSPR + PR',
  'demandAnt.check.supplyParts': '({{soh}} + {{ospo}} + {{ospr}} + {{pr}})',
  'demandAnt.check.gap': 'Gap',
  'demandAnt.check.result': 'Result',
  'demandAnt.check.balanced': 'Balanced',
  'demandAnt.check.surplus': 'Surplus: {{qty}} absorbed in {{week}}',
  'demandAnt.check.surplusPartly':
    'Surplus: {{qty}} absorbed in {{week}}; {{left}} more than that week can take',
  'demandAnt.check.shortfall': 'Shortfall: recommend a PR of {{qty}} (raise it in SAP)',
  'demandAnt.check.additionalPo': 'Additional PO',
  // The planning week's carry-over (DRC-2 BR-03).
  'demandAnt.carry.label': 'Call-off {{week}}',
  'demandAnt.carry.parts': '{{callOff}} called off, remainder {{remainder}}',
  'demandAnt.carry.none': 'nothing to carry',
  'demandAnt.carry.lastWeek': '{{qty}} carried to {{week}} (last week of the horizon)',
  'demandAnt.carry.firstOutside':
    '{{qty}} carried to {{week}} (first week after the horizon, supplier agreed)',
  // What a figure could not read (the read's flags).
  'demandAnt.flag.LEAD_TIME_MISSING':
    'No lead time on record for this supplier × material: the horizon is {{weeks}} weeks until one is.',
  'demandAnt.flag.NO_STOCK_RECORD': 'No PTI stock record: SOH counts 0.',
  'demandAnt.flag.OSPO_FROM_STORE':
    'The previous week is not published: OSPO starts from the open PO quantity not yet called off.',
  'demandAnt.flag.OSPR_NOT_AVAILABLE':
    'OSPR counts 0: the hub’s purchase requisitions carry no material code.',
  'demandAnt.flag.CARRY_LIMIT_NO_SALES_ORDERS':
    'No carry-over limit applied: the hub holds no sales-order quantity per supplier × material (A8b).',
  'demandAnt.flag.CARRY_OVER_LIMIT': '{{qty}} above the carry-over limit was not carried.'
};

/** @type {Record<string, string>} */
export const demandAnticipationId = {
  'demandAnt.subtitle':
    'Jumlah yang PTI perkirakan akan dipanggil dari tiap pemasok, per material dan minggu, sepanjang waktu tunggu. Horizon bergulir setiap minggu: tiap minggu perencanaan dipublikasikan tersendiri, dan minggu berikutnya bergulir maju.',
  'demandAnt.asOf': 'Per',
  'demandAnt.howItWorks':
    'Tiap minggu dalam horizon adalah LTP ditambah sisa yang dibawa ke minggu itu; minggu pertama juga memuat safety order. Sisa setelah panggilan minggu pertama dipindah ke minggu terakhir horizon, atau ke minggu pertama setelah horizon bila pemasok setuju. Pasokan di atas total diserap di minggu terakhir; kekurangan menjadi rekomendasi PR untuk dibuat di SAP. Tidak ada yang dikirim ke SAP atau pemasok.',
  'demandAnt.pub.label': 'Minggu perencanaan',
  'demandAnt.pub.none': 'belum dipublikasikan',
  'demandAnt.pub.publishedSame': 'dipublikasikan; angka hari ini sama',
  'demandAnt.pub.publishedChanged_other':
    'dipublikasikan; {{count}} pemasok × material berbeda dari angka hari ini',
  'demandAnt.pub.sampleSeed': 'Publikasi contoh, dihitung dari data contoh pada {{date}}',
  'demandAnt.pub.published': 'Terakhir dipublikasikan {{date}}',
  'demandAnt.pub.unattributed':
    'tidak tercatat atas nama seseorang (tidak ada yang masuk dengan nama)',
  'demandAnt.publish.button': 'Publikasikan antisipasi permintaan · {{week}}',
  'demandAnt.publish.confirmTitle': 'Publikasikan antisipasi permintaan',
  'demandAnt.publish.confirmBody':
    'Ini mencatat antisipasi permintaan minggu perencanaan {{week}} ({{dates}}) pada angka hari ini, untuk setiap pemasok × material.',
  'demandAnt.publish.confirmChanged_other':
    '{{count}} pemasok × material berbeda dari angka yang dipublikasikan untuk minggu ini.',
  'demandAnt.publish.confirmKept':
    'Publikasi sebelumnya untuk minggu ini tetap tercatat; yang baru yang berlaku. Tidak ada yang dikirim ke SAP atau pemasok.',
  'demandAnt.publish.cancel': 'Batal',
  'demandAnt.publish.confirm': 'Publikasikan',
  'demandAnt.publish.done': 'Antisipasi permintaan dipublikasikan untuk {{week}}',
  'demandAnt.publish.failed': 'Antisipasi permintaan tidak dapat dipublikasikan',
  'demandAnt.agree.legend': 'Pemasok setuju menerima sisa setelah horizon',
  'demandAnt.agree.help':
    'Centang hanya bila pemasok setuju. Tanpa itu sisa dipindah ke minggu terakhir horizon.',
  'demandAnt.agree.option': '{{qty}} ke {{outside}}, bukan {{last}}',
  'demandAnt.filter.supplier': 'Pemasok',
  'demandAnt.filter.material': 'Material',
  'demandAnt.filter.all': 'Semua',
  'demandAnt.filter.clear': 'Hapus filter',
  'demandAnt.empty.title': 'Tidak ada antisipasi permintaan untuk ditampilkan',
  'demandAnt.empty.body': 'Tidak ada pemasok dengan LTP pada versi prakiraan saat ini.',
  'demandAnt.empty.filtered': 'Tidak ada pemasok × material yang cocok dengan filter ini.',
  'demandAnt.card.share': 'Bagian {{pct}}',
  'demandAnt.card.noStock': 'Tidak ada catatan stok PTI di SAP: pemeriksaan menghitung stok 0.',
  'demandAnt.grid.corner': 'Minggu',
  'demandAnt.row.ltp': 'LTP',
  'demandAnt.row.safety': 'Safety order',
  'demandAnt.row.carriedIn': 'Sisa dibawa masuk',
  'demandAnt.row.carriedFrom': '{{qty}} dari {{week}}',
  'demandAnt.row.figure': 'Antisipasi permintaan',
  'demandAnt.row.wouldBe': 'Jika dihitung ulang',
  'demandAnt.row.absorbed': 'Kelebihan diserap',
  'demandAnt.row.absorbedCell': '−{{qty}} pasokan di atas antisipasi permintaan',
  'demandAnt.published': 'Dipublikasikan',
  'demandAnt.horizon': 'Horizon',
  'demandAnt.publishedParts':
    'Dipublikasikan {{date}}: LTP {{ltp}}, safety order {{safety}}, sisa dibawa masuk {{carried}}',
  'demandAnt.noChange': 'tidak berubah',
  'demandAnt.wouldBeHelp':
    'Jika dihitung ulang: angka hari ini di samping angka yang dipublikasikan, sebagai informasi saja.',
  'demandAnt.check.title': 'Rencana vs eksekusi',
  'demandAnt.check.sourceSample': '{{week}} · publikasi contoh {{date}}',
  'demandAnt.check.sourcePublished': '{{week}} · dipublikasikan {{date}}',
  'demandAnt.check.sourceToday': '{{week}} · angka hari ini, belum dipublikasikan',
  'demandAnt.check.horizon': 'Horizon (waktu tunggu)',
  'demandAnt.check.horizonWeeks_other': '{{count}} minggu',
  'demandAnt.check.totalDa': 'Total antisipasi permintaan',
  'demandAnt.check.ropOrder': 'ROP Order',
  'demandAnt.check.ropParts': '(cycle stock {{cycle}} + safety order {{safety}})',
  'demandAnt.check.supply': 'SOH + OSPO + OSPR + PR',
  'demandAnt.check.supplyParts': '({{soh}} + {{ospo}} + {{ospr}} + {{pr}})',
  'demandAnt.check.gap': 'Selisih',
  'demandAnt.check.result': 'Hasil',
  'demandAnt.check.balanced': 'Seimbang',
  'demandAnt.check.surplus': 'Kelebihan: {{qty}} diserap di {{week}}',
  'demandAnt.check.surplusPartly':
    'Kelebihan: {{qty}} diserap di {{week}}; {{left}} melebihi yang dapat ditampung minggu itu',
  'demandAnt.check.shortfall': 'Kekurangan: rekomendasikan PR sebesar {{qty}} (buat di SAP)',
  'demandAnt.check.additionalPo': 'PO tambahan',
  'demandAnt.carry.label': 'Panggilan {{week}}',
  'demandAnt.carry.parts': '{{callOff}} dipanggil, sisa {{remainder}}',
  'demandAnt.carry.none': 'tidak ada sisa untuk dipindah',
  'demandAnt.carry.lastWeek': '{{qty}} dipindah ke {{week}} (minggu terakhir horizon)',
  'demandAnt.carry.firstOutside':
    '{{qty}} dipindah ke {{week}} (minggu pertama setelah horizon, pemasok setuju)',
  'demandAnt.flag.LEAD_TIME_MISSING':
    'Tidak ada waktu tunggu tercatat untuk pemasok × material ini: horizon {{weeks}} minggu sampai ada.',
  'demandAnt.flag.NO_STOCK_RECORD': 'Tidak ada catatan stok PTI: SOH dihitung 0.',
  'demandAnt.flag.OSPO_FROM_STORE':
    'Minggu sebelumnya belum dipublikasikan: OSPO dimulai dari kuantitas PO terbuka yang belum dipanggil.',
  'demandAnt.flag.OSPR_NOT_AVAILABLE':
    'OSPR dihitung 0: permintaan pembelian di hub tidak memuat kode material.',
  'demandAnt.flag.CARRY_LIMIT_NO_SALES_ORDERS':
    'Batas pemindahan sisa tidak diterapkan: hub tidak menyimpan kuantitas pesanan penjualan per pemasok × material (A8b).',
  'demandAnt.flag.CARRY_OVER_LIMIT': '{{qty}} di atas batas pemindahan sisa tidak dipindah.'
};
