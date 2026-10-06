// Stabilise and publish the plan i18n fragment (REQ-E14-06). Namespace: stb.*
//
// Business language only: what the supplier would see, what each rule held,
// and why nothing is published while the data is simulated. Mono data
// (quantities, weeks, dates, codes, ratios) is rendered through <Data> and
// never keyed.

/** @type {Record<string, string>} */
export const stabiliseEn = {
  'stb.title': 'Stabilise and publish',
  'stb.subtitle':
    'The plan suppliers would see, before and after it is stabilised: Firm weeks kept as published, Trade-off weeks damped and held to the tolerance band, and what that does to how much the plan moves.',
  'stb.meta.plan': 'Finished-goods plan made',
  'stb.meta.noPlan': 'No finished-goods plan',
  'stb.meta.versions':
    'Versions replayed: packaging {{packaging}} (weekly), raw material {{raw}} (monthly), from {{from}}',
  'stb.synthetic':
    'Calculated on synthetic data built to reproduce PTI’s current measures. It proves the calculations, not the business answer.',
  'stb.withheld':
    'Nothing on this page is shown to a supplier: the plan is calculated on simulated data. It can be published once the Master Data Management team’s SAP feed is live and SOMO has ratified the engine producing the totals.',
  'stb.range':
    'The demand range (P50 and P90) now exists on the Forecast quality page, per SKU, brand and material. It is not published here: the quantities below are material net requirements from SAP’s plan, and publishing from the engine is refused while its data is simulated. Suppliers see the quantity only.',
  'stb.range.link': 'Open the demand range',
  'stb.replay':
    'No engine plan has been published yet, so the versions a supplier would have seen are replayed: the engine is run as of each past publication day on today’s record, and each version is stabilised against what the one before it published.',

  'stb.settings.title': 'Values in use',
  'stb.settings.weight': 'Damping weight, Trade-off zone',
  'stb.settings.weightNote':
    'Share of the value the supplier saw last time. Set on Administration → Tolerances.',
  'stb.settings.forecastWeight': 'Damping weight, Forecast zone',
  'stb.settings.forecastWeightNote': 'Not damped',
  'stb.settings.band': 'Tolerance band, Trade-off zone',
  'stb.settings.bandValue': '±{{perVersion}}% a version · ±{{cumulative}}% from the first value',
  'stb.settings.bandNote':
    'The cumulative cap is still to be agreed with the pilot suppliers; it runs on ±20% meanwhile.',

  'stb.source.engine': 'Engine plan',
  'stb.source.sapHistory': 'SAP’s published plan',
  'stb.source.engine.intro':
    'The engine’s net material requirement per week, split by each supplier’s share. The version to publish now is shown below; the measures compare the replayed versions.',
  'stb.source.sapHistory.intro':
    'The plan versions SAP already published to suppliers (the history the reliability measures read). This shows what stabilising would have done to the plan suppliers actually saw.',

  'stb.kpi.masc': 'Plan movement (MASC)',
  'stb.kpi.masc.sub': 'Raw → stabilised, mean over {{count}} version pairs',
  'stb.kpi.share': 'Weeks changed inside the lead time',
  'stb.kpi.share.sub_one': 'Raw → stabilised, of {{count}} week inside the lead time',
  'stb.kpi.share.sub_other': 'Raw → stabilised, of {{count}} weeks inside the lead time',
  'stb.kpi.band': 'Trade-off weeks within limits',
  'stb.kpi.band.value': '{{n}} of {{m}}',
  'stb.kpi.band.sub': 'after stabilising (before: {{n}} of {{m}})',
  'stb.kpi.held': 'Weeks held in the version to publish',
  'stb.kpi.held.sub': 'Firm {{firm}} · band {{band}} · damped {{damped}}',
  'stb.kpi.reason_one': '{{count}} week needs a reason to publish beyond the band',
  'stb.kpi.reason_other': '{{count}} weeks need a reason to publish beyond the band',

  'stb.rules.title': 'Which rule set each week',
  'stb.rules.intro':
    'The version to publish now, and every replayed version after the first (the first has nothing before it).',
  'stb.rules.col.rule': 'Rule',
  'stb.rules.col.latest': 'Version to publish',
  'stb.rules.col.replay': 'All replayed versions',
  'stb.rule.new': 'New week — published as calculated',
  'stb.rule.unchanged': 'No change',
  'stb.rule.firmFrozen': 'Firm — kept as published',
  'stb.rule.forecast': 'Forecast — as calculated',
  'stb.rule.damped': 'Trade-off — damped',
  'stb.rule.bandHeld': 'Trade-off — held at ±10% a version',
  'stb.rule.cumulativeHeld': 'Trade-off — held at ±20% from the first value',
  'stb.rule.override': 'Trade-off — beyond the band, with the planner’s reason',

  'stb.series.title': 'Per supplier and material',
  'stb.series.intro': 'Choose a row to see each week of the version to publish.',
  'stb.series.col.material': 'Material',
  'stb.series.col.supplier': 'Supplier',
  'stb.series.col.zones': 'Firm · Trade-off',
  'stb.series.col.held': 'Held (Firm · band · damped)',
  'stb.series.col.masc': 'MASC raw → stabilised',
  'stb.series.col.open': 'Weeks',
  'stb.series.days': '{{firm}} d · {{tradeOff}} d',
  'stb.series.show': 'Show weeks',
  'stb.series.hide': 'Hide weeks',
  'stb.series.onlyMoving': 'Only rows where a rule held a week',
  'stb.series.all': 'All rows',
  'stb.series.empty': 'No row had a week held by a rule.',

  'stb.detail.title': 'Weeks of the version to publish · {{material}} · {{supplier}}',
  'stb.detail.col.week': 'Week',
  'stb.detail.col.zone': 'Zone',
  'stb.detail.col.raw': 'Engine value',
  'stb.detail.col.previous': 'Last published',
  'stb.detail.col.first': 'First published',
  'stb.detail.col.damped': 'Damped',
  'stb.detail.col.range': 'Allowed range',
  'stb.detail.col.published': 'To publish',
  'stb.detail.col.rule': 'Rule',
  'stb.detail.reasonNeeded': 'Beyond the band: needs a reason to publish the damped value',
  'stb.detail.recommit': 'Asks the supplier for a new commitment',
  'stb.zone.firm': 'Firm',
  'stb.zone.tradeOff': 'Trade-off',
  'stb.zone.forecast': 'Forecast',

  'stb.publish.title': 'Publish this version',
  'stb.publish.intro':
    'Publishing sends the stabilised quantities as a new forecast version through the existing publication, with the reasons for any week beyond the band.',
  'stb.publish.packaging': 'Publish packaging',
  'stb.publish.rawMaterial': 'Publish raw material',
  'stb.publish.withheld':
    'Nothing can be published until real data arrives: the plan is calculated on simulated data, which is never shown to a supplier. This is the only place a plan is published to suppliers.',
  'stb.publish.last': 'Last published ({{stream}}):',
  'stb.publish.lastNone': 'No version has been published yet.',
  'stb.publish.versionsLink': 'Published versions',
  // FUX phase 2 B2 (F-01, F-13) — the two tabs and the checklist before the act.
  'stb.tab.publish': 'Version to publish',
  'stb.tab.versions': 'Published versions',
  'stb.check.title': 'Before you publish',
  'stb.check.intro':
    'Read from the pages that resolve each item. The checklist does not change what can be published.',
  'stb.check.inputs': 'Inputs pass',
  'stb.check.orders': 'Orders reviewed',
  'stb.check.warehouse': 'Warehouse weeks resolved',
  'stb.check.held': 'Held weeks have reasons',
  'stb.check.held.state_one': '{{count}} held week without a reason',
  'stb.check.held.state_other': '{{count}} held weeks without a reason',
  'stb.check.held.link': 'See the weeks per supplier and material',
  'stb.check.unknown': 'Not read yet',
  'stb.toast.refused': 'Not published',
  'stb.refusal.simulated':
    'The plan is calculated on simulated data, which is never shown to a supplier.',
  'stb.refusal.c8':
    'A published forecast names SOMO as the source of its totals. The engine can publish once SOMO ratifies the engine as that source.',

  'stb.def.title': 'How it works',
  'stb.def.quantity':
    'The quantity is the material’s net requirement week by week — gross requirement plus safety stock, less stock and confirmed open orders — split by each supplier’s share. Order lots from What to order are not published here: they become call-offs.',
  'stb.def.zones':
    'Firm runs for at least the supplier’s lead time and never changes once published. Trade-off runs from there for the Trade-off length; each week is damped (weight × last value + the rest × new value) and may move at most ±10% from the last published value and ±20% from the first. A move beyond that is held at the edge unless the planner gives a reason. Forecast weeks are published as calculated.',
  'stb.def.masc':
    'MASC is the mean absolute change between two versions over the weeks both carry, divided by the material’s usual week-to-week movement (the same measure as Supplier reliability). Lower is steadier.',
  'stb.def.share':
    'Weeks changed inside the lead time: of the weeks that sat inside the supplier’s lead time in a later version, the share whose quantity changed there.'
};

/** @type {Record<string, string>} */
export const stabiliseId = {
  'stb.title': 'Stabilkan dan terbitkan',
  'stb.subtitle':
    'Rencana yang akan dilihat pemasok, sebelum dan sesudah distabilkan: minggu Firm tetap seperti yang diterbitkan, minggu Trade-off diredam dan ditahan dalam batas toleransi, dan dampaknya pada seberapa besar rencana bergerak.',
  'stb.meta.plan': 'Rencana barang jadi dibuat',
  'stb.meta.noPlan': 'Tidak ada rencana barang jadi',
  'stb.meta.versions':
    'Versi yang diputar ulang: kemasan {{packaging}} (mingguan), bahan baku {{raw}} (bulanan), sejak {{from}}',
  'stb.synthetic':
    'Dihitung pada data sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'stb.withheld':
    'Tidak ada isi halaman ini yang ditampilkan ke pemasok: rencana dihitung pada data simulasi. Rencana dapat diterbitkan setelah feed SAP dari tim Master Data Management aktif dan SOMO mengesahkan mesin sebagai penghasil total.',
  'stb.range':
    'Rentang permintaan (P50 dan P90) kini ada di halaman Kualitas prakiraan, per SKU, merek, dan material. Rentang ini tidak diterbitkan di sini: kuantitas di bawah adalah kebutuhan bersih material dari rencana SAP, dan penerbitan dari mesin ditolak selama datanya simulasi. Pemasok hanya melihat kuantitas.',
  'stb.range.link': 'Buka rentang permintaan',
  'stb.replay':
    'Belum ada rencana mesin yang pernah diterbitkan, jadi versi yang akan dilihat pemasok diputar ulang: mesin dijalankan per setiap hari penerbitan yang lalu pada catatan hari ini, dan setiap versi distabilkan terhadap apa yang diterbitkan versi sebelumnya.',

  'stb.settings.title': 'Nilai yang dipakai',
  'stb.settings.weight': 'Bobot peredaman, zona Trade-off',
  'stb.settings.weightNote':
    'Bagian dari nilai yang terakhir dilihat pemasok. Diatur di Administrasi → Toleransi.',
  'stb.settings.forecastWeight': 'Bobot peredaman, zona Forecast',
  'stb.settings.forecastWeightNote': 'Tidak diredam',
  'stb.settings.band': 'Batas toleransi, zona Trade-off',
  'stb.settings.bandValue': '±{{perVersion}}% per versi · ±{{cumulative}}% dari nilai pertama',
  'stb.settings.bandNote':
    'Batas kumulatif masih harus disepakati dengan pemasok pilot; sementara ini berjalan pada ±20%.',

  'stb.source.engine': 'Rencana mesin',
  'stb.source.sapHistory': 'Rencana SAP yang sudah diterbitkan',
  'stb.source.engine.intro':
    'Kebutuhan bersih material per minggu dari mesin, dibagi menurut porsi setiap pemasok. Versi yang akan diterbitkan sekarang ditampilkan di bawah; ukurannya membandingkan versi yang diputar ulang.',
  'stb.source.sapHistory.intro':
    'Versi rencana yang sudah diterbitkan SAP ke pemasok (riwayat yang dibaca ukuran keandalan). Ini menunjukkan apa yang akan terjadi pada rencana yang benar-benar dilihat pemasok bila distabilkan.',

  'stb.kpi.masc': 'Pergerakan rencana (MASC)',
  'stb.kpi.masc.sub': 'Mentah → distabilkan, rata-rata atas {{count}} pasangan versi',
  'stb.kpi.share': 'Minggu yang berubah dalam waktu tunggu',
  'stb.kpi.share.sub_other': 'Mentah → distabilkan, dari {{count}} minggu dalam waktu tunggu',
  'stb.kpi.band': 'Minggu Trade-off dalam batas',
  'stb.kpi.band.value': '{{n}} dari {{m}}',
  'stb.kpi.band.sub': 'setelah distabilkan (sebelum: {{n}} dari {{m}})',
  'stb.kpi.held': 'Minggu yang ditahan pada versi yang akan diterbitkan',
  'stb.kpi.held.sub': 'Firm {{firm}} · batas {{band}} · diredam {{damped}}',
  'stb.kpi.reason_other': '{{count}} minggu memerlukan alasan untuk diterbitkan di luar batas',

  'stb.rules.title': 'Aturan yang menentukan setiap minggu',
  'stb.rules.intro':
    'Versi yang akan diterbitkan sekarang, dan setiap versi yang diputar ulang setelah yang pertama (yang pertama tidak punya pendahulu).',
  'stb.rules.col.rule': 'Aturan',
  'stb.rules.col.latest': 'Versi yang akan diterbitkan',
  'stb.rules.col.replay': 'Semua versi yang diputar ulang',
  'stb.rule.new': 'Minggu baru — diterbitkan apa adanya',
  'stb.rule.unchanged': 'Tidak berubah',
  'stb.rule.firmFrozen': 'Firm — tetap seperti yang diterbitkan',
  'stb.rule.forecast': 'Forecast — apa adanya',
  'stb.rule.damped': 'Trade-off — diredam',
  'stb.rule.bandHeld': 'Trade-off — ditahan pada ±10% per versi',
  'stb.rule.cumulativeHeld': 'Trade-off — ditahan pada ±20% dari nilai pertama',
  'stb.rule.override': 'Trade-off — di luar batas, dengan alasan perencana',

  'stb.series.title': 'Per pemasok dan material',
  'stb.series.intro':
    'Pilih satu baris untuk melihat setiap minggu dari versi yang akan diterbitkan.',
  'stb.series.col.material': 'Material',
  'stb.series.col.supplier': 'Pemasok',
  'stb.series.col.zones': 'Firm · Trade-off',
  'stb.series.col.held': 'Ditahan (Firm · batas · diredam)',
  'stb.series.col.masc': 'MASC mentah → distabilkan',
  'stb.series.col.open': 'Minggu',
  'stb.series.days': '{{firm}} hr · {{tradeOff}} hr',
  'stb.series.show': 'Tampilkan minggu',
  'stb.series.hide': 'Sembunyikan minggu',
  'stb.series.onlyMoving': 'Hanya baris yang minggunya ditahan aturan',
  'stb.series.all': 'Semua baris',
  'stb.series.empty': 'Tidak ada baris yang minggunya ditahan aturan.',

  'stb.detail.title': 'Minggu dari versi yang akan diterbitkan · {{material}} · {{supplier}}',
  'stb.detail.col.week': 'Minggu',
  'stb.detail.col.zone': 'Zona',
  'stb.detail.col.raw': 'Nilai mesin',
  'stb.detail.col.previous': 'Terakhir diterbitkan',
  'stb.detail.col.first': 'Pertama diterbitkan',
  'stb.detail.col.damped': 'Diredam',
  'stb.detail.col.range': 'Rentang yang diizinkan',
  'stb.detail.col.published': 'Akan diterbitkan',
  'stb.detail.col.rule': 'Aturan',
  'stb.detail.reasonNeeded': 'Di luar batas: perlu alasan untuk menerbitkan nilai yang diredam',
  'stb.detail.recommit': 'Meminta komitmen baru dari pemasok',
  'stb.zone.firm': 'Firm',
  'stb.zone.tradeOff': 'Trade-off',
  'stb.zone.forecast': 'Forecast',

  'stb.publish.title': 'Terbitkan versi ini',
  'stb.publish.intro':
    'Penerbitan mengirim kuantitas yang sudah distabilkan sebagai versi prakiraan baru melalui penerbitan yang sudah ada, beserta alasan untuk setiap minggu di luar batas.',
  'stb.publish.packaging': 'Terbitkan kemasan',
  'stb.publish.rawMaterial': 'Terbitkan bahan baku',
  'stb.publish.withheld':
    'Belum ada yang dapat diterbitkan sampai data nyata tersedia: rencana dihitung pada data simulasi, yang tidak pernah ditampilkan ke pemasok. Ini satu-satunya tempat rencana diterbitkan ke pemasok.',
  'stb.publish.last': 'Terakhir diterbitkan ({{stream}}):',
  'stb.publish.lastNone': 'Belum ada versi yang diterbitkan.',
  'stb.publish.versionsLink': 'Versi terbit',
  // FUX phase 2 B2 (F-01, F-13) — dua tab dan daftar periksa sebelum penerbitan.
  'stb.tab.publish': 'Versi untuk diterbitkan',
  'stb.tab.versions': 'Versi terbit',
  'stb.check.title': 'Sebelum Anda menerbitkan',
  'stb.check.intro':
    'Dibaca dari halaman yang menyelesaikan setiap butir. Daftar periksa ini tidak mengubah apa yang dapat diterbitkan.',
  'stb.check.inputs': 'Masukan lolos',
  'stb.check.orders': 'Pesanan ditinjau',
  'stb.check.warehouse': 'Minggu gudang diselesaikan',
  'stb.check.held': 'Minggu tertahan punya alasan',
  'stb.check.held.state_other': '{{count}} minggu tertahan tanpa alasan',
  'stb.check.held.link': 'Lihat minggu per pemasok dan material',
  'stb.check.unknown': 'Belum terbaca',
  'stb.toast.refused': 'Tidak diterbitkan',
  'stb.refusal.simulated':
    'Rencana dihitung pada data simulasi, yang tidak pernah ditampilkan ke pemasok.',
  'stb.refusal.c8':
    'Prakiraan yang diterbitkan menyebut SOMO sebagai sumber totalnya. Mesin dapat menerbitkan setelah SOMO mengesahkan mesin sebagai sumber itu.',

  'stb.def.title': 'Cara kerjanya',
  'stb.def.quantity':
    'Kuantitasnya adalah kebutuhan bersih material minggu demi minggu — kebutuhan kotor ditambah stok pengaman, dikurangi stok dan pesanan terbuka yang sudah dikonfirmasi — dibagi menurut porsi setiap pemasok. Lot pesanan dari Apa yang dipesan tidak diterbitkan di sini: lot itu menjadi call-off.',
  'stb.def.zones':
    'Firm berlangsung sedikitnya sepanjang waktu tunggu pemasok dan tidak pernah berubah setelah diterbitkan. Trade-off berlanjut dari sana sepanjang durasi Trade-off; setiap minggu diredam (bobot × nilai terakhir + sisanya × nilai baru) dan boleh bergerak paling banyak ±10% dari nilai terakhir yang diterbitkan dan ±20% dari nilai pertama. Perubahan di luar itu ditahan di tepi batas kecuali perencana memberi alasan. Minggu Forecast diterbitkan apa adanya.',
  'stb.def.masc':
    'MASC adalah rata-rata perubahan absolut antara dua versi pada minggu yang dimuat keduanya, dibagi pergerakan mingguan material yang biasa (ukuran yang sama dengan Keandalan pemasok). Makin rendah makin stabil.',
  'stb.def.share':
    'Minggu yang berubah dalam waktu tunggu: dari minggu yang berada dalam waktu tunggu pemasok pada versi berikutnya, bagian yang kuantitasnya berubah di sana.'
};
