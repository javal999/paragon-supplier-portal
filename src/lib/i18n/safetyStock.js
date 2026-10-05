// Safety stock, safety lead time and reorder point i18n fragment (REQ-E14-04).
// Namespace: sst.*
//
// Business language only. Mono data (quantities, days, dates, codes, rates)
// is rendered through <Data> and never keyed.

/** @type {Record<string, string>} */
export const safetyStockEn = {
  // F-25 — the title matches the menu label.
  'sst.title': 'Safety stock targets',
  'sst.subtitle':
    'Safety stock sized from the plan’s own forecast errors against a fill-rate target, a safety lead time from each supplier’s late deliveries, and the reorder point — compared with SAP’s safety stock.',
  'sst.meta.plan': 'Plan in use made',
  'sst.meta.method': 'Fill-rate target on the errors as they happened',
  'sst.synthetic':
    'Calculated on synthetic data built to reproduce PTI’s current measures. It proves the calculations, not the business answer.',
  'sst.tierDefault':
    'Tiers are assigned by volume until the Material Planner lists them: the top 20% of materials by volume get the high target, slow movers the slow target, the rest the standard target. Marked “default”.',
  'sst.targets':
    'Targets in force: high-volume {{high}}, other {{standard}}, slow movers {{slow}}. The administrator sets them.',

  'sst.kpi.freed': 'Warehouse space freed against SAP',
  'sst.kpi.freed.sub': '{{sap}} pallets at SAP’s safety stock, {{engine}} at the engine’s',
  'sst.kpi.tiers': 'Materials per tier',
  'sst.kpi.tiers.sub': 'High {{high}} · standard {{standard}} · slow {{slow}}',
  'sst.kpi.fallback': 'On SAP’s value',
  'sst.kpi.fallback.sub': 'Fewer than {{min}} past plans to learn from',
  'sst.kpi.groupDefault': 'Safety lead time from the group default',
  'sst.kpi.groupDefault.sub': 'Supplier with fewer than {{min}} deliveries in the material group',
  'sst.pallets': '{{value}} pallets',

  'sst.col.material': 'Material',
  'sst.col.tier': 'Tier and target',
  'sst.col.safetyStock': 'Safety stock',
  'sst.col.sap': 'SAP safety stock',
  'sst.col.freed': 'Freed',
  'sst.col.slt': 'Safety lead time',
  'sst.col.rop': 'Reorder point',
  'sst.col.history': 'History',
  'sst.col.change': 'Since last run',
  'sst.change.none': 'No change',
  'sst.change.from': 'from {{value}}',
  'sst.change.rop': 'Reorder point',
  'sst.change.lastRun_one': '{{count}} material’s safety stock changed since the last run —',
  'sst.change.lastRun_other': '{{count}} materials’ safety stock changed since the last run —',
  'sst.change.lastRunPackaging': 'packaging (weekly) as of',
  'sst.change.lastRunRaw': 'raw material (monthly) as of',
  'sst.change.recomputed':
    'The last run is recalculated on today’s records at its own date, so a delivery recorded since then is included and the administrator’s current targets are used.',
  'sst.cause.historyReached': 'Enough history now: the engine’s value replaces SAP’s',
  'sst.cause.historyLost': 'Too little history now: SAP’s value is used',
  'sst.cause.tier': 'Tier changed: {{from}} → {{to}}',
  'sst.cause.target': 'Target changed: {{from}} → {{to}}',
  'sst.cause.errors': 'Forecast errors updated: {{added}} past plans added, {{dropped}} dropped',
  'sst.cause.orderLot': 'Expected order per cycle changed: {{from}} → {{to}}',
  'sst.cause.window': 'Lead time window changed: {{from}} → {{to}} weeks',
  'sst.cause.sapValue': 'SAP’s safety stock changed',
  'sst.cause.plan': 'New plan: expected demand over the window changed (reorder point)',
  'sst.cause.new': 'Not in the last run',

  'sst.tier.high': 'High volume',
  'sst.tier.standard': 'Standard',
  'sst.tier.slow': 'Slow mover',
  'sst.tier.default': 'default',
  'sst.source.engine': 'From forecast errors',
  'sst.source.sap': 'SAP value — too little history',
  'sst.slt.days': '{{count}} days',
  'sst.slt.supplier': 'from {{count}} deliveries',
  'sst.slt.groupDefault': 'group default',
  'sst.slt.none': 'no source',
  'sst.history.origins': '{{count}} past plans',
  'sst.history.none': 'No usable past plan',
  'sst.history.fillRate': 'fill rate on history {{value}}',
  'sst.bias': 'Errors all one way: forecast bias',
  'sst.reliesOnLot': 'No safety stock: relies on the order lot (MOQ) — review',

  'sst.detail.title': 'The history behind it',
  'sst.detail.select': 'Select a material to see the errors behind its safety stock.',
  'sst.detail.window':
    'Each error is what was needed minus what the plan said, summed over {{weeks}} weeks (lead time plus the review week).',
  'sst.detail.q': 'Expected order per cycle',
  'sst.detail.fillRate': 'Fill-rate safety stock',
  'sst.detail.quantile': 'Error level exceeded only {{share}} of the time',
  'sst.detail.rop': 'Expected demand over the window',
  'sst.err.origin': 'Plan made',
  'sst.err.planned': 'Planned',
  'sst.err.actual': 'Needed',
  'sst.err.error': 'Shortfall',

  'sst.def.title': 'How it is calculated',
  'sst.def.errors':
    'At every past week a plan was made, the plan is turned into material quantities through the bill of materials and compared with what was actually needed over the lead time plus one review week.',
  'sst.def.fillRate':
    'Safety stock is the smallest stock at which the units expected short per order cycle are no more than (1 − the fill-rate target) of the expected order. A large minimum order already fills most demand, so it needs less safety stock.',
  'sst.def.fallback':
    'With fewer than 30 past plans to learn from, SAP’s safety stock is used, and marked.',
  'sst.def.slt':
    'Safety lead time: of the supplier’s deliveries in the last 26 weeks, the delay after the confirmed date that the set share arrived within. Fewer than 5 deliveries: the material group’s value, marked.',
  'sst.def.rop':
    'Reorder point: expected demand over the lead time plus the review week, plus the safety stock.',
  'sst.def.change':
    'Since last run: each run is compared with the last run of its stream — packaging a week before, raw material four weeks before — and the cause is read from what changed in the inputs: the tier or target, the forecast errors, the expected order per cycle, the lead time window, or, for the reorder point, the plan.'
};

/** @type {Record<string, string>} */
export const safetyStockId = {
  'sst.title': 'Target stok pengaman',
  'sst.subtitle':
    'Stok pengaman yang diukur dari kesalahan prakiraan rencana sendiri terhadap target tingkat pemenuhan, waktu tunggu pengaman dari keterlambatan setiap pemasok, dan titik pesan ulang — dibandingkan dengan stok pengaman SAP.',
  'sst.meta.plan': 'Rencana yang dipakai dibuat',
  'sst.meta.method': 'Target tingkat pemenuhan atas kesalahan yang benar-benar terjadi',
  'sst.synthetic':
    'Dihitung dengan data sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'sst.tierDefault':
    'Tingkat ditetapkan menurut volume sampai Material Planner menetapkannya: 20% material teratas menurut volume mendapat target tinggi, material bergerak lambat target lambat, sisanya target standar. Ditandai “bawaan”.',
  'sst.targets':
    'Target berlaku: volume tinggi {{high}}, lainnya {{standard}}, bergerak lambat {{slow}}. Administrator yang menetapkannya.',

  'sst.kpi.freed': 'Ruang gudang yang dibebaskan dibanding SAP',
  'sst.kpi.freed.sub': '{{sap}} palet pada stok pengaman SAP, {{engine}} pada stok pengaman mesin',
  'sst.kpi.tiers': 'Material per tingkat',
  'sst.kpi.tiers.sub': 'Tinggi {{high}} · standar {{standard}} · lambat {{slow}}',
  'sst.kpi.fallback': 'Memakai nilai SAP',
  'sst.kpi.fallback.sub': 'Kurang dari {{min}} rencana lampau untuk dipelajari',
  'sst.kpi.groupDefault': 'Waktu tunggu pengaman dari nilai bawaan grup',
  'sst.kpi.groupDefault.sub': 'Pemasok dengan kurang dari {{min}} pengiriman dalam grup material',
  'sst.pallets': '{{value}} palet',

  'sst.col.material': 'Material',
  'sst.col.tier': 'Tingkat dan target',
  'sst.col.safetyStock': 'Stok pengaman',
  'sst.col.sap': 'Stok pengaman SAP',
  'sst.col.freed': 'Dibebaskan',
  'sst.col.slt': 'Waktu tunggu pengaman',
  'sst.col.rop': 'Titik pesan ulang',
  'sst.col.history': 'Riwayat',
  'sst.col.change': 'Sejak perhitungan terakhir',
  'sst.change.none': 'Tidak berubah',
  'sst.change.from': 'dari {{value}}',
  'sst.change.rop': 'Titik pesan ulang',
  'sst.change.lastRun_other':
    'Stok pengaman {{count}} material berubah sejak perhitungan terakhir —',
  'sst.change.lastRunPackaging': 'kemasan (mingguan) per',
  'sst.change.lastRunRaw': 'bahan baku (bulanan) per',
  'sst.change.recomputed':
    'Perhitungan terakhir dihitung ulang dengan catatan hari ini pada tanggalnya sendiri, sehingga pengiriman yang tercatat sejak itu ikut dihitung dan target administrator yang berlaku sekarang dipakai.',
  'sst.cause.historyReached': 'Riwayat kini cukup: nilai mesin menggantikan nilai SAP',
  'sst.cause.historyLost': 'Riwayat kini terlalu sedikit: nilai SAP dipakai',
  'sst.cause.tier': 'Tingkat berubah: {{from}} → {{to}}',
  'sst.cause.target': 'Target berubah: {{from}} → {{to}}',
  'sst.cause.errors':
    'Kesalahan prakiraan diperbarui: {{added}} rencana lampau ditambahkan, {{dropped}} dikeluarkan',
  'sst.cause.orderLot': 'Perkiraan pesanan per siklus berubah: {{from}} → {{to}}',
  'sst.cause.window': 'Jendela waktu tunggu berubah: {{from}} → {{to}} minggu',
  'sst.cause.sapValue': 'Stok pengaman SAP berubah',
  'sst.cause.plan': 'Rencana baru: perkiraan permintaan selama jendela berubah (titik pesan ulang)',
  'sst.cause.new': 'Tidak ada pada perhitungan terakhir',

  'sst.tier.high': 'Volume tinggi',
  'sst.tier.standard': 'Standar',
  'sst.tier.slow': 'Bergerak lambat',
  'sst.tier.default': 'bawaan',
  'sst.source.engine': 'Dari kesalahan prakiraan',
  'sst.source.sap': 'Nilai SAP — riwayat terlalu sedikit',
  'sst.slt.days': '{{count}} hari',
  'sst.slt.supplier': 'dari {{count}} pengiriman',
  'sst.slt.groupDefault': 'bawaan grup',
  'sst.slt.none': 'tidak ada pemasok',
  'sst.history.origins': '{{count}} rencana lampau',
  'sst.history.none': 'Tidak ada rencana lampau yang dapat dipakai',
  'sst.history.fillRate': 'tingkat pemenuhan atas riwayat {{value}}',
  'sst.bias': 'Kesalahan selalu satu arah: bias prakiraan',
  'sst.reliesOnLot': 'Tanpa stok pengaman: mengandalkan lot pesanan (MOQ) — tinjau',

  'sst.detail.title': 'Riwayat di baliknya',
  'sst.detail.select': 'Pilih material untuk melihat kesalahan di balik stok pengamannya.',
  'sst.detail.window':
    'Setiap kesalahan adalah kebutuhan dikurangi rencana, dijumlahkan selama {{weeks}} minggu (waktu tunggu ditambah minggu tinjauan).',
  'sst.detail.q': 'Perkiraan pesanan per siklus',
  'sst.detail.fillRate': 'Stok pengaman tingkat pemenuhan',
  'sst.detail.quantile': 'Tingkat kesalahan yang hanya terlampaui {{share}} dari waktu',
  'sst.detail.rop': 'Perkiraan permintaan selama jendela',
  'sst.err.origin': 'Rencana dibuat',
  'sst.err.planned': 'Rencana',
  'sst.err.actual': 'Kebutuhan',
  'sst.err.error': 'Kekurangan',

  'sst.def.title': 'Cara menghitungnya',
  'sst.def.errors':
    'Pada setiap minggu lampau saat rencana dibuat, rencana diubah menjadi jumlah material melalui daftar bahan dan dibandingkan dengan kebutuhan sebenarnya selama waktu tunggu ditambah satu minggu tinjauan.',
  'sst.def.fillRate':
    'Stok pengaman adalah stok terkecil yang membuat perkiraan unit kurang per siklus pesanan tidak lebih dari (1 − target tingkat pemenuhan) dari perkiraan pesanan. Pesanan minimum yang besar sudah memenuhi sebagian besar permintaan, sehingga butuh stok pengaman lebih sedikit.',
  'sst.def.fallback':
    'Dengan kurang dari 30 rencana lampau untuk dipelajari, stok pengaman SAP yang dipakai, dan ditandai.',
  'sst.def.slt':
    'Waktu tunggu pengaman: dari pengiriman pemasok dalam 26 minggu terakhir, keterlambatan setelah tanggal terkonfirmasi yang dicapai porsi yang ditetapkan. Kurang dari 5 pengiriman: nilai grup material, ditandai.',
  'sst.def.rop':
    'Titik pesan ulang: perkiraan permintaan selama waktu tunggu ditambah minggu tinjauan, ditambah stok pengaman.',
  'sst.def.change':
    'Sejak perhitungan terakhir: setiap perhitungan dibandingkan dengan perhitungan terakhir alirannya — kemasan seminggu sebelumnya, bahan baku empat minggu sebelumnya — dan penyebabnya dibaca dari masukan yang berubah: tingkat atau target, kesalahan prakiraan, perkiraan pesanan per siklus, jendela waktu tunggu, atau, untuk titik pesan ulang, rencananya.'
};
