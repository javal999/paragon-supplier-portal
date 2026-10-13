// Demand anticipation i18n fragment (CAP-10, SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10).
// Namespace: demandAnt.*
//
// CAP-D10 — the figure is always written out as "Demand anticipation" /
// "Antisipasi permintaan". No string here abbreviates it: "DA" already labels
// Delivery Agreements on the contract pages.

/** @type {Record<string, string>} */
export const demandAnticipationEn = {
  'demandAnt.subtitle':
    'What PTI expects to call off from each supplier, per material and week. Publishing freezes the 4 weeks from the current week; a frozen week keeps its figure.',
  'demandAnt.asOf': 'As of',
  'demandAnt.howItWorks':
    'Week 1 is the LTP plus the supplier’s share of the gap up to PTI’s reorder point, or less its share of the stock above it (used up week by week). Later weeks are the LTP. Shares follow each supplier’s LTP over the 4 frozen weeks.',
  // The publication in force.
  'demandAnt.pub.label': 'Frozen weeks',
  'demandAnt.pub.none': 'Nothing is frozen yet.',
  'demandAnt.pub.sampleSeed': 'Sample publication, computed from the sample data on {{date}}',
  'demandAnt.pub.published': 'Last published {{date}}',
  'demandAnt.pub.unattributed': 'not attributed to a person (no one is signed in by name)',
  // The publish act.
  'demandAnt.publish.button': 'Publish demand anticipation · {{range}}',
  'demandAnt.publish.allFrozen':
    '{{range}} are frozen. The next horizon can be published when the hub week moves on.',
  'demandAnt.publish.confirmTitle': 'Publish demand anticipation',
  'demandAnt.publish.confirmBody':
    'This freezes the demand anticipation of {{range}} ({{dates}}) at today’s figures.',
  'demandAnt.publish.confirmNew_one': '{{count}} supplier × material × week freezes now.',
  'demandAnt.publish.confirmNew_other': '{{count}} supplier × material × weeks freeze now.',
  'demandAnt.publish.confirmKept':
    'Weeks frozen by an earlier publication keep their figure. Nothing is sent to SAP or a supplier.',
  'demandAnt.publish.cancel': 'Cancel',
  'demandAnt.publish.confirm': 'Publish',
  'demandAnt.publish.done': 'Demand anticipation published: {{range}} frozen',
  'demandAnt.publish.failed': 'Could not publish demand anticipation',
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
  'demandAnt.card.noStock': 'No PTI stock record in SAP: the figure is the LTP.',
  'demandAnt.grid.corner': 'Week',
  // The rows. Consumption, absorbed, open supply and gap come with CAP-11 and CAP-12.
  'demandAnt.row.ltp': 'LTP',
  'demandAnt.row.stockShare': 'PTI stock share',
  'demandAnt.row.ropShare': 'Reorder point share',
  'demandAnt.row.figure': 'Demand anticipation',
  'demandAnt.row.wouldBe': 'Would be',
  'demandAnt.row.onceNote': 'Counted once, in the current week.',
  'demandAnt.frozen': 'Frozen',
  'demandAnt.frozenInputs':
    'Frozen {{date}} from LTP {{ltp}}, stock share {{stock}}, reorder point share {{rop}}',
  'demandAnt.noChange': 'no change',
  'demandAnt.wouldBeHelp': 'Would be: today’s figure for a frozen week, for information only.'
};

/** @type {Record<string, string>} */
export const demandAnticipationId = {
  'demandAnt.subtitle':
    'Jumlah yang PTI perkirakan akan dipanggil dari tiap pemasok, per material dan minggu. Publikasi membekukan 4 minggu mulai minggu ini; minggu yang dibekukan mempertahankan angkanya.',
  'demandAnt.asOf': 'Per',
  'demandAnt.howItWorks':
    'Minggu 1 adalah LTP ditambah bagian pemasok atas kekurangan hingga titik pemesanan ulang PTI, atau dikurangi bagiannya atas stok di atasnya (dipakai minggu demi minggu). Minggu berikutnya adalah LTP. Bagian mengikuti LTP tiap pemasok selama 4 minggu yang dibekukan.',
  'demandAnt.pub.label': 'Minggu dibekukan',
  'demandAnt.pub.none': 'Belum ada yang dibekukan.',
  'demandAnt.pub.sampleSeed': 'Publikasi contoh, dihitung dari data contoh pada {{date}}',
  'demandAnt.pub.published': 'Terakhir dipublikasikan {{date}}',
  'demandAnt.pub.unattributed':
    'tidak tercatat atas nama seseorang (tidak ada yang masuk dengan nama)',
  'demandAnt.publish.button': 'Publikasikan antisipasi permintaan · {{range}}',
  'demandAnt.publish.allFrozen':
    '{{range}} sudah dibekukan. Horizon berikutnya dapat dipublikasikan saat minggu hub berganti.',
  'demandAnt.publish.confirmTitle': 'Publikasikan antisipasi permintaan',
  'demandAnt.publish.confirmBody':
    'Ini membekukan antisipasi permintaan {{range}} ({{dates}}) pada angka hari ini.',
  'demandAnt.publish.confirmNew_other': '{{count}} pemasok × material × minggu dibekukan sekarang.',
  'demandAnt.publish.confirmKept':
    'Minggu yang dibekukan publikasi sebelumnya mempertahankan angkanya. Tidak ada yang dikirim ke SAP atau pemasok.',
  'demandAnt.publish.cancel': 'Batal',
  'demandAnt.publish.confirm': 'Publikasikan',
  'demandAnt.publish.done': 'Antisipasi permintaan dipublikasikan: {{range}} dibekukan',
  'demandAnt.publish.failed': 'Antisipasi permintaan tidak dapat dipublikasikan',
  'demandAnt.filter.supplier': 'Pemasok',
  'demandAnt.filter.material': 'Material',
  'demandAnt.filter.all': 'Semua',
  'demandAnt.filter.clear': 'Hapus filter',
  'demandAnt.empty.title': 'Tidak ada antisipasi permintaan untuk ditampilkan',
  'demandAnt.empty.body': 'Tidak ada pemasok dengan LTP pada versi prakiraan saat ini.',
  'demandAnt.empty.filtered': 'Tidak ada pemasok × material yang cocok dengan filter ini.',
  'demandAnt.card.share': 'Bagian {{pct}}',
  'demandAnt.card.noStock': 'Tidak ada catatan stok PTI di SAP: angkanya adalah LTP.',
  'demandAnt.grid.corner': 'Minggu',
  'demandAnt.row.ltp': 'LTP',
  'demandAnt.row.stockShare': 'Bagian stok PTI',
  'demandAnt.row.ropShare': 'Bagian titik pemesanan ulang',
  'demandAnt.row.figure': 'Antisipasi permintaan',
  'demandAnt.row.wouldBe': 'Jika dihitung ulang',
  'demandAnt.row.onceNote': 'Dihitung sekali, pada minggu ini.',
  'demandAnt.frozen': 'Dibekukan',
  'demandAnt.frozenInputs':
    'Dibekukan {{date}} dari LTP {{ltp}}, bagian stok {{stock}}, bagian titik pemesanan ulang {{rop}}',
  'demandAnt.noChange': 'tidak berubah',
  'demandAnt.wouldBeHelp':
    'Jika dihitung ulang: angka hari ini untuk minggu yang dibekukan, sebagai informasi saja.'
};
