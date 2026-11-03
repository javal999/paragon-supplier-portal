// Forecast UX phase 1 · task A4 i18n fragment. Namespace: fux.*
//
// The shared chrome of the 13 buyer forecast pages: the purpose header (F-05),
// the one simulated-data banner (F-14), the "About this page" section (F-08),
// the one date line (F-26), the term tips (F-09) and the scale hints (F-21).
// Page names in the purpose header's links are read from the menu labels
// (`hub.nav.pti.*`) and the engine pages' own titles, never restated here.

/** @type {Record<string, string>} */
export const forecastUxEn = {
  // Purpose header (F-05)
  'fux.purpose.label': 'What this page is for',
  'fux.purpose.decision': 'Decision here',
  'fux.purpose.uses': 'Uses',
  'fux.purpose.next': 'Next',
  'fux.purpose.whatToOrder':
    'Which orders to place this week, with which supplier, sized to fit the warehouse.',
  'fux.purpose.makeRoom':
    'Which open orders to move later, reduce or cancel when a warehouse week is over capacity.',
  'fux.purpose.publish':
    'Whether the stabilised plan is ready for suppliers, and which held weeks need a reason.',
  'fux.purpose.responses': 'Which supplier commitments to accept or move to another supplier.',
  // FSR-D3 (BL-251) — step 6, Demand anticipation (DA).
  'fux.purpose.demandAnticipation':
    'Whether this week’s demand anticipation is ready to publish to suppliers.',
  'fux.purpose.forecastQuality':
    'Whether the engine’s demand forecast is good enough to trust, compared with SAP’s plan.',
  'fux.purpose.stockCheck':
    'What PTI ordered from each supplier on POs, against what it called off and what was shipped on ASNs, each day.',
  'fux.purpose.materialRequirement':
    'How much of each material is needed, after stock, confirmed deliveries and safety stock.',
  'fux.purpose.safetyStock':
    'Whether each material’s safety stock and reorder point are right, compared with SAP’s.',
  'fux.purpose.dataHealth':
    'Whether the input feeds are fresh and clean enough to plan on this week.',
  'fux.purpose.modelBacktest':
    'Which forecast method each product should use, and whether planning should switch to the engine.',
  'fux.purpose.reliability':
    'How reliably each supplier confirms and delivers, and how much PTI’s own plan changes.',
  // B6 (F-11) — the Supplier scorecard, read by Material Planners (Review) and Procurement (Performance).
  'fux.purpose.performance': 'Which suppliers to follow up this month.',

  // One banner (F-14)
  'fux.banner': 'Sample data. Nothing here reaches suppliers or SAP.',

  // About this page (F-08)
  'fux.about.title': 'About this page',
  'fux.collapse.show': 'Show details',
  'fux.collapse.hide': 'Hide details',

  // One date line (F-26)
  'fux.asOf': 'Data as of',

  // Term tips (F-09)
  'fux.term.aria': 'What “{{term}}” means',
  // BL-233 BR-07 — the lines of a term label's tip, after the definition.
  'fux.term.formula': 'How it is calculated:',
  'fux.term.alsoCalled': 'Also called:',
  'fux.term.not': 'Not:',

  // Scale hints (F-21)
  'fux.scale.masc': '1.0 = usual week-to-week movement; lower is steadier.',
  'fux.scale.trackingSignal': '0 = no bias; beyond ±{{limit}} the forecast is flagged as biased.',

  // F-12 — beside the Forecast bias override form.
  'fux.override.noEffect':
    'Overrides do not change orders until the engine forecast is switched on.',

  // FUX phase 2 B1 — the "This week" start page and the cycle step bar (F-02,
  // F-03, F-05). Step names are the menu labels (`hub.nav.pti.*`).
  'fux.purpose.thisWeek': 'What to work on first this week.',
  'fux.steps.label': 'Weekly cycle',
  'fux.steps.blocked': 'Blocked',
  'fux.steps.checks_one': '{{count}} input check failing',
  'fux.steps.checks_other': '{{count}} input checks failing',
  'fux.steps.pass': 'Inputs pass',
  'fux.steps.lastPublished': 'Last published {{date}}',
  'fux.steps.noneYet': 'Nothing published yet',
  'fux.count.toOrder_one': '{{count}} recommended order',
  'fux.count.toOrder_other': '{{count}} recommended orders',
  'fux.count.firstRelease': 'First release {{week}} · {{date}}',
  'fux.count.overCapacity_one': '{{count}} week over capacity',
  'fux.count.overCapacity_other': '{{count}} weeks over capacity',
  'fux.count.exceptions_one': '{{count}} open exception',
  'fux.count.exceptions_other': '{{count}} open exceptions',
  // FSR-D3 (BL-251) — the Demand anticipation (DA) step's figure.
  'fux.count.daChanged_one': '{{count}} supplier × material differs from the publication',
  'fux.count.daChanged_other': '{{count}} supplier × materials differ from the publication',
  'fux.thisWeek.input.title': 'Input check',
  'fux.thisWeek.input.intro':
    'The finished-goods plan and the feeds the plan is built on. If a check fails, decide whether to go ahead or hold and alert the MDM team.',
  'fux.thisWeek.input.pass': 'All checks pass',
  'fux.thisWeek.input.failing_one': '{{count}} check failing',
  'fux.thisWeek.input.failing_other': '{{count}} checks failing',
  'fux.thisWeek.input.unknown': 'Not checked',
  'fux.thisWeek.steps.title': 'Steps this week',
  'fux.thisWeek.open': 'Open {{page}}',
  'fux.thisWeek.card.whatToOrder':
    'Orders the plan recommends, both warehouses, and the earliest week one must be released.',
  'fux.thisWeek.card.makeRoom':
    'Warehouse weeks over owned capacity, before any open order is moved.',
  'fux.thisWeek.card.publish': 'The version each supplier holds now.',
  'fux.thisWeek.card.responses': 'Commitments outside tolerance, or missing past the deadline.',
  'fux.thisWeek.publish.withheld': 'Publishing is withheld until real data arrives.',
  'fux.thisWeek.publish.open': 'Publishing is open.',
  'fux.thisWeek.about.counts':
    'Each number is read from the same data as the page it links to, by the same rule, so the two always agree. Nothing on this page is stored: a step is never marked done.',
  'fux.thisWeek.about.blocked':
    'A step reads Blocked only when the data says so: publishing is withheld while the data is sample data. A step whose inputs fail a Data health check shows how many checks fail.'
};

/** @type {Record<string, string>} */
export const forecastUxId = {
  'fux.purpose.label': 'Fungsi halaman ini',
  'fux.purpose.decision': 'Keputusan di sini',
  'fux.purpose.uses': 'Memakai',
  'fux.purpose.next': 'Berikutnya',
  'fux.purpose.whatToOrder':
    'Pesanan mana yang dibuat minggu ini, ke pemasok mana, dengan ukuran yang muat di gudang.',
  'fux.purpose.makeRoom':
    'Pesanan terbuka mana yang dimundurkan, dikurangi, atau dibatalkan saat satu minggu gudang melebihi kapasitas.',
  'fux.purpose.publish':
    'Apakah rencana yang sudah distabilkan siap untuk pemasok, dan minggu tertahan mana yang perlu alasan.',
  'fux.purpose.responses': 'Komitmen pemasok mana yang diterima atau dipindahkan ke pemasok lain.',
  'fux.purpose.demandAnticipation':
    'Apakah demand anticipation minggu ini siap dipublikasikan ke pemasok.',
  'fux.purpose.forecastQuality':
    'Apakah prakiraan permintaan mesin cukup baik untuk dipercaya, dibandingkan rencana SAP.',
  'fux.purpose.stockCheck':
    'Apa yang dipesan PTI dari setiap pemasok pada PO, terhadap apa yang di-call-off dan dikirim pada ASN, setiap hari.',
  'fux.purpose.materialRequirement':
    'Berapa banyak setiap material yang dibutuhkan, setelah stok, pengiriman terkonfirmasi, dan stok pengaman.',
  'fux.purpose.safetyStock':
    'Apakah stok pengaman dan titik pemesanan ulang setiap material sudah tepat, dibandingkan milik SAP.',
  'fux.purpose.dataHealth':
    'Apakah umpan data masukan cukup baru dan bersih untuk dipakai merencanakan minggu ini.',
  'fux.purpose.modelBacktest':
    'Metode prakiraan mana yang dipakai setiap produk, dan apakah perencanaan perlu beralih ke mesin.',
  'fux.purpose.reliability':
    'Seberapa andal setiap pemasok mengonfirmasi dan mengirim, dan seberapa sering rencana PTI sendiri berubah.',
  'fux.purpose.performance': 'Pemasok mana yang perlu ditindaklanjuti bulan ini.',

  'fux.banner': 'Data contoh. Tidak ada yang sampai ke pemasok atau SAP.',

  'fux.about.title': 'Tentang halaman ini',
  'fux.collapse.show': 'Tampilkan rincian',
  'fux.collapse.hide': 'Sembunyikan rincian',

  'fux.asOf': 'Data per',

  'fux.term.aria': 'Arti “{{term}}”',
  'fux.term.formula': 'Cara menghitung:',
  'fux.term.alsoCalled': 'Disebut juga:',
  'fux.term.not': 'Bukan:',

  'fux.scale.masc': '1,0 = pergerakan biasa dari minggu ke minggu; makin rendah makin stabil.',
  'fux.scale.trackingSignal': '0 = tidak bias; di luar ±{{limit}} prakiraan ditandai bias.',

  'fux.override.noEffect': 'Penyesuaian tidak mengubah pesanan sampai prakiraan mesin diaktifkan.',

  'fux.purpose.thisWeek': 'Apa yang dikerjakan lebih dulu minggu ini.',
  'fux.steps.label': 'Siklus mingguan',
  'fux.steps.blocked': 'Terhambat',
  'fux.steps.checks_other': '{{count}} pemeriksaan masukan gagal',
  'fux.steps.pass': 'Masukan lolos',
  'fux.steps.lastPublished': 'Terakhir diterbitkan {{date}}',
  'fux.steps.noneYet': 'Belum ada yang diterbitkan',
  'fux.count.toOrder_other': '{{count}} pesanan yang disarankan',
  'fux.count.firstRelease': 'Rilis pertama {{week}} · {{date}}',
  'fux.count.overCapacity_other': '{{count}} minggu di atas kapasitas',
  'fux.count.exceptions_other': '{{count}} pengecualian terbuka',
  'fux.count.daChanged_other': '{{count}} pemasok × material berbeda dari publikasi',
  'fux.thisWeek.input.title': 'Cek masukan',
  'fux.thisWeek.input.intro':
    'Rencana barang jadi dan umpan data yang menjadi dasar rencana. Jika ada pemeriksaan yang gagal, putuskan apakah lanjut atau tahan dan beri tahu tim MDM.',
  'fux.thisWeek.input.pass': 'Semua pemeriksaan lolos',
  'fux.thisWeek.input.failing_other': '{{count}} pemeriksaan gagal',
  'fux.thisWeek.input.unknown': 'Belum diperiksa',
  'fux.thisWeek.steps.title': 'Langkah minggu ini',
  'fux.thisWeek.open': 'Buka {{page}}',
  'fux.thisWeek.card.whatToOrder':
    'Pesanan yang disarankan rencana, kedua gudang, dan minggu paling awal salah satunya harus dirilis.',
  'fux.thisWeek.card.makeRoom':
    'Minggu gudang di atas kapasitas sendiri, sebelum pesanan terbuka dipindahkan.',
  'fux.thisWeek.card.publish': 'Versi yang dipegang setiap pemasok saat ini.',
  'fux.thisWeek.card.responses': 'Komitmen di luar toleransi, atau belum masuk lewat tenggat.',
  'fux.thisWeek.publish.withheld': 'Penerbitan ditahan sampai data nyata masuk.',
  'fux.thisWeek.publish.open': 'Penerbitan terbuka.',
  'fux.thisWeek.about.counts':
    'Setiap angka dibaca dari data yang sama dengan halaman yang ditautkannya, dengan aturan yang sama, sehingga keduanya selalu sama. Tidak ada yang disimpan di halaman ini: sebuah langkah tidak pernah ditandai selesai.',
  'fux.thisWeek.about.blocked':
    'Sebuah langkah terbaca Terhambat hanya jika datanya menunjukkan demikian: penerbitan ditahan selama datanya data contoh. Langkah yang masukannya gagal dalam pemeriksaan Kesehatan data menunjukkan berapa pemeriksaan yang gagal.'
};
