// Forecast UX phase 1 · task A4 i18n fragment. Namespace: fux.*
//
// The shared chrome of the 13 buyer forecast pages: the purpose header (F-05),
// the one simulated-data banner (F-14), the "About this page" section (F-08),
// the one date line (F-26), the term tips (F-09) and the scale hints (F-21).
// Page names in the purpose header's links are read from the menu labels
// (`hub.nav.pti.*`) and the engine pages' own titles, never restated here.

export const forecastUxEn: Record<string, string> = {
  // Purpose header (F-05)
  'fux.purpose.label': 'What this page is for',
  'fux.purpose.decision': 'Decision here',
  'fux.purpose.uses': 'Uses',
  'fux.purpose.next': 'Next',
  'fux.purpose.whatToOrder': 'Which orders to place this week, with which supplier, sized to fit the warehouse.',
  'fux.purpose.makeRoom': 'Which open orders to move later, reduce or cancel when a warehouse week is over capacity.',
  'fux.purpose.publish': 'Whether the stabilised plan is ready for suppliers, and which held weeks need a reason.',
  'fux.purpose.responses': 'Which supplier commitments to accept, send back for revision or move to another supplier.',
  'fux.purpose.forecastQuality': 'Whether the engine’s demand forecast is good enough to trust, compared with SAP’s plan.',
  'fux.purpose.stockCheck': 'Whether each supplier’s committed, called-off and held stock balanced at the end of the cycle.',
  'fux.purpose.materialRequirement': 'How much of each material is needed, after stock, confirmed deliveries and safety stock.',
  'fux.purpose.safetyStock': 'Whether each material’s safety stock and reorder point are right, compared with SAP’s.',
  'fux.purpose.publishedVersions': 'Which plan version each supplier holds, and whether they have opened it.',
  'fux.purpose.forecastBias': 'Whether a forecast runs steadily high or low, and whether to override it.',
  'fux.purpose.dataHealth': 'Whether the input feeds are fresh and clean enough to plan on this week.',
  'fux.purpose.modelBacktest': 'Which forecast method each product should use, and whether planning should switch to the engine.',
  'fux.purpose.reliability': 'How reliably each supplier confirms and delivers, and how much PTI’s own plan changes.',
  // B6 (F-11) — the Supplier scorecard, read by Material Planners (Review) and Procurement (Performance).
  'fux.purpose.performance': 'Which suppliers to follow up this month.',

  // One banner (F-14)
  'fux.banner': 'Sample data. Nothing here reaches suppliers or SAP.',

  // About this page (F-08)
  'fux.about.title': 'About this page',

  // One date line (F-26)
  'fux.asOf': 'Data as of',

  // Term tips (F-09)
  'fux.term.aria': 'What “{{term}}” means',

  // Scale hints (F-21)
  'fux.scale.masc': '1.0 = usual week-to-week movement; lower is steadier.',
  'fux.scale.trackingSignal': '0 = no bias; beyond ±{{limit}} the forecast is flagged as biased.',

  // F-12 — beside the Forecast bias override form.
  'fux.override.noEffect': 'Overrides do not change orders until the engine forecast is switched on.',
};

export const forecastUxId: Record<string, string> = {
  'fux.purpose.label': 'Fungsi halaman ini',
  'fux.purpose.decision': 'Keputusan di sini',
  'fux.purpose.uses': 'Memakai',
  'fux.purpose.next': 'Berikutnya',
  'fux.purpose.whatToOrder': 'Pesanan mana yang dibuat minggu ini, ke pemasok mana, dengan ukuran yang muat di gudang.',
  'fux.purpose.makeRoom': 'Pesanan terbuka mana yang dimundurkan, dikurangi, atau dibatalkan saat satu minggu gudang melebihi kapasitas.',
  'fux.purpose.publish': 'Apakah rencana yang sudah distabilkan siap untuk pemasok, dan minggu tertahan mana yang perlu alasan.',
  'fux.purpose.responses': 'Komitmen pemasok mana yang diterima, dikembalikan untuk revisi, atau dipindahkan ke pemasok lain.',
  'fux.purpose.forecastQuality': 'Apakah prakiraan permintaan mesin cukup baik untuk dipercaya, dibandingkan rencana SAP.',
  'fux.purpose.stockCheck': 'Apakah stok yang dikomitmenkan, di-call-off, dan disimpan setiap pemasok seimbang di akhir siklus.',
  'fux.purpose.materialRequirement': 'Berapa banyak setiap material yang dibutuhkan, setelah stok, pengiriman terkonfirmasi, dan stok pengaman.',
  'fux.purpose.safetyStock': 'Apakah stok pengaman dan titik pemesanan ulang setiap material sudah tepat, dibandingkan milik SAP.',
  'fux.purpose.publishedVersions': 'Versi rencana mana yang dipegang setiap pemasok, dan apakah mereka sudah membukanya.',
  'fux.purpose.forecastBias': 'Apakah sebuah prakiraan terus-menerus terlalu tinggi atau terlalu rendah, dan apakah perlu disesuaikan.',
  'fux.purpose.dataHealth': 'Apakah umpan data masukan cukup baru dan bersih untuk dipakai merencanakan minggu ini.',
  'fux.purpose.modelBacktest': 'Metode prakiraan mana yang dipakai setiap produk, dan apakah perencanaan perlu beralih ke mesin.',
  'fux.purpose.reliability': 'Seberapa andal setiap pemasok mengonfirmasi dan mengirim, dan seberapa sering rencana PTI sendiri berubah.',
  'fux.purpose.performance': 'Pemasok mana yang perlu ditindaklanjuti bulan ini.',

  'fux.banner': 'Data contoh. Tidak ada yang sampai ke pemasok atau SAP.',

  'fux.about.title': 'Tentang halaman ini',

  'fux.asOf': 'Data per',

  'fux.term.aria': 'Arti “{{term}}”',

  'fux.scale.masc': '1,0 = pergerakan biasa dari minggu ke minggu; makin rendah makin stabil.',
  'fux.scale.trackingSignal': '0 = tidak bias; di luar ±{{limit}} prakiraan ditandai bias.',

  'fux.override.noEffect': 'Penyesuaian tidak mengubah pesanan sampai prakiraan mesin diaktifkan.',
};
