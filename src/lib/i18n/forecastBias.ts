// ─────────────────────────────────────────────────────────────────────────────
// FORECAST BIAS — REQ-E14-11 (BL-114). Namespace: fb.*
// The built-in override reason codes live under `fb.reason.` (BL-32 prefix).
// Plurals: none — every count is shown as "label: {{count}}" or a bare figure.
// ─────────────────────────────────────────────────────────────────────────────

export const forecastBiasEn: Record<string, string> = {
  'fb.title': 'Forecast bias',
  'fb.subtitle':
    'Whether the demand forecast runs one way — too high fills the warehouse, too low causes shortage — per SKU and material, the Material Planning team’s overrides, and whether each kind of override makes the forecast better.',
  'fb.meta.origins': 'Tracking signal over {{count}} past weeks, from the week of',
  'fb.meta.to': 'to',
  'fb.synthetic':
    'Measured on synthetic sales history and SAP plan snapshots built to reproduce PTI’s current measures. It proves the calculation, not the business answer.',
  'fb.source':
    'Overrides change the demand forecast shown here and on Forecast quality. They do not drive material planning: Material requirement, What to order, Publish to suppliers and Make warehouse room still run on SAP’s plan.',

  'fb.alarm.under': 'Bias alarm · runs low',
  'fb.alarm.over': 'Bias alarm · runs high',
  'fb.signal.few': 'too few weeks to alarm',
  'fb.signal.ok': 'no alarm',
  'fb.signal.meanError': 'Mean error',

  'fb.kpi.skus': 'SKUs in bias alarm · engine',
  'fb.kpi.sap': 'SAP’s plan: {{count}} ({{under}} low, {{over}} high)',
  'fb.kpi.materials': 'Materials in bias alarm · engine',
  'fb.kpi.overrides': 'Override weeks in force',
  'fb.kpi.overrides.sub': 'Overrides recorded: {{count}}',
  'fb.kpi.value': 'Override value (FVA)',
  'fb.kpi.value.month': 'Month {{month}}; positive means the overrides helped',
  'fb.kpi.value.none': 'Nothing to measure yet: no override has reached a week that has sold',

  'fb.skus.title': 'Tracking signal per SKU',
  'fb.skus.intro':
    'The engine’s forecast and SAP’s plan, each for the week it was made in, against what sold, on the same weeks. A signal near +1 means the forecast keeps running low; near −1, high.',
  'fb.filter.all': 'All',
  'fb.filter.engine': 'Engine alarms',
  'fb.filter.sap': 'SAP’s plan alarms',
  'fb.filter.alarms': 'Any alarm',
  'fb.skus.col.sku': 'SKU',
  'fb.skus.col.brand': 'Brand',
  'fb.skus.col.weeks': 'Weeks counted',
  'fb.skus.col.engine': 'Engine forecast',
  'fb.skus.col.sap': 'SAP’s plan',
  'fb.skus.newSku': 'New SKU: the engine used SAP’s plan',
  'fb.skus.discontinued': 'Discontinued now',
  'fb.skus.none': 'No SKU matches this filter.',

  'fb.materials.title': 'Tracking signal per material',
  'fb.materials.intro':
    'The same weeks through the bill of materials: the requirement each forecast implied against the requirement the sales caused, in the same week.',
  'fb.materials.col.material': 'Material',
  'fb.materials.col.skus': 'SKUs using it',

  'fb.override.title': 'Override the forecast',
  'fb.override.intro':
    'The Material Planning team reviews the forecast before it drives material plans. An override sets one SKU’s forecast for one week; its brand and the total move by the same amount. Raising the forecast above the engine’s needs a reason code.',
  'fb.form.noSku': 'No SKU can be overridden in this forecast.',
  'fb.form.sku': 'SKU',
  'fb.form.week': 'Week',
  'fb.form.newValue': 'New forecast (units)',
  'fb.form.engine': 'Engine:',
  'fb.form.inForce': 'In force:',
  'fb.form.reason': 'Reason',
  'fb.form.reason.none': 'No reason given',
  'fb.form.reason.hint': 'Required when the new forecast is above the engine’s. "Other" needs a note.',
  'fb.form.note': 'Note',
  'fb.form.submit': 'Record override',
  'fb.form.attribution': 'Recorded without a name: sign-in is not built yet, so the override shows as not attributed.',
  'fb.toast.refused': 'Override not recorded',
  'fb.toast.recorded': 'Override recorded',

  'fb.ledger.title': 'Overrides recorded',
  'fb.ledger.empty': 'No override recorded. The synthetic data carries no override history.',
  'fb.ledger.col.when': 'Recorded',
  'fb.ledger.col.sku': 'SKU and week',
  'fb.ledger.col.values': 'Old → new',
  'fb.ledger.col.direction': 'Against the engine',
  'fb.ledger.col.reason': 'Reason',
  'fb.ledger.unattributed': 'Not attributed (no user directory)',
  'fb.ledger.week': 'Week of',
  'fb.ledger.engine': 'Engine',
  'fb.direction.up': 'Up',
  'fb.direction.down': 'Down',
  'fb.direction.none': 'Back to engine',
  'fb.reason.none': 'No reason given',

  'fb.fva.title': 'Override value by month',
  'fb.fva.intro':
    'For weeks that have sold: the engine’s error against the error after the override, per SKU, combined as a geometric mean (FVA). Positive means the overrides made the forecast better. By direction, reason and size.',
  'fb.fva.service':
    'Judging overrides by service, not accuracy alone, needs the backtest’s replay of PTI’s ordering, which is built separately. It is added here when that lands.',
  'fb.fva.empty':
    'Nothing measured yet. The synthetic data carries no override history and none is invented: this report fills as overrides are entered and their weeks sell. Waiting for their week: {{waiting}}. Past weeks with no usable sales figure: {{unmeasurable}}.',
  'fb.fva.all': 'All overrides',
  'fb.fva.col.group': 'Group',
  'fb.fva.col.cells': 'Weeks · SKUs',
  'fb.fva.col.mae': 'Error: engine → after',
  'fb.fva.col.improved': 'Weeks improved',
  'fb.fva.col.fva': 'Value (FVA)',
  'fb.fva.skus': 'SKUs: {{count}}',
  'fb.fva.notComparable': 'Not comparable (zero error): {{count}}',
  'fb.band.lt10': 'Size under 10%',
  'fb.band.10to25': 'Size 10% to 25%',
  'fb.band.25to50': 'Size 25% to 50%',
  'fb.band.50to100': 'Size 50% to 100%',
  'fb.band.gt100': 'Size over 100%',

  'fb.review.title': 'Override types to review',
  'fb.review.intro': 'Direction and reason over the last {{weeks}} weeks that have sold, from',
  'fb.review.empty': 'No override type has a sold week in this window.',
  'fb.review.flagged': 'Review with the planner’s lead',
  'fb.review.ok': 'no review needed',
  'fb.review.action': 'Override types made the forecast worse over the window and are flagged for review: {{count}}.',

  'fb.def.title': 'How this is calculated',
  'fb.def.signal':
    'Tracking signal: each week, smoothed error = {{alpha}} × this week’s error + the rest of last week’s; the same for the error’s size; the signal is the first divided by the second. Above {{limit}} either way is a bias alarm, once at least {{min}} weeks are counted.',
  'fb.def.origins':
    'Past weeks: on each of the last {{count}} Mondays the engine is run as if it were that day, and its forecast for that week is compared with what sold. SAP’s plan made that Monday is compared the same way. Out-of-stock weeks are not demand and are left out.',
  'fb.def.materials':
    'Materials: the weeks counted for the SKUs are passed through the bill of materials with scrap and yield, the same way the material requirement is.',
  'fb.def.override':
    'Overrides: the latest override of a week is the one in force. Old value is what was in force before; the engine’s value is kept beside it, and direction is judged against the engine’s.',
  'fb.def.fva':
    'Override value: per SKU, mean error after the override ÷ mean error of the engine; the geometric mean across SKUs is subtracted from 1. −15% means the overrides made the error 15% larger.',
  'fb.def.link': 'Open Forecast quality',

  // Override reason codes (starter list, ENG-B104)
  'fb.reason.promotion': 'Promotion or activity not in the history',
  'fb.reason.customer-order': 'Known distributor or customer order',
  'fb.reason.listing-gain': 'New listing or distribution gain',
  'fb.reason.listing-loss': 'Lost listing or range cut',
  'fb.reason.market-info': 'Market or competitor information',
  'fb.reason.data-correction': 'Correcting a history error',
  'fb.reason.other': 'Other (note required)',

  // Demand forecast page — the link and the override marker (small, BL-114)
  'fb.df.overrides': 'Weeks with a planner override in force: {{count}}. The forecast shown includes them; the engine’s own values stay in the SKU detail.',
  'fb.df.link': 'Review bias and overrides',
  'fb.df.overridden': 'Overridden',
  'fb.df.engineCol': 'Engine',
};

export const forecastBiasId: Record<string, string> = {
  'fb.title': 'Bias prakiraan',
  'fb.subtitle':
    'Apakah prakiraan permintaan condong ke satu arah — terlalu tinggi memenuhi gudang, terlalu rendah menyebabkan kekurangan — per SKU dan material, penyesuaian oleh tim Perencanaan Material, dan apakah tiap jenis penyesuaian membuat prakiraan lebih baik.',
  'fb.meta.origins': 'Sinyal pelacakan atas {{count}} minggu lalu, dari minggu',
  'fb.meta.to': 'sampai',
  'fb.synthetic':
    'Diukur pada riwayat penjualan dan cuplikan rencana SAP sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'fb.source':
    'Penyesuaian mengubah prakiraan permintaan yang ditampilkan di sini dan di Kualitas prakiraan. Penyesuaian tidak menggerakkan perencanaan material: Kebutuhan material, Apa yang dipesan, Terbitkan ke pemasok, serta Kosongkan ruang gudang tetap memakai rencana SAP.',

  'fb.alarm.under': 'Alarm bias · terlalu rendah',
  'fb.alarm.over': 'Alarm bias · terlalu tinggi',
  'fb.signal.few': 'minggu terlalu sedikit untuk alarm',
  'fb.signal.ok': 'tidak ada alarm',
  'fb.signal.meanError': 'Rata-rata galat',

  'fb.kpi.skus': 'SKU dengan alarm bias · mesin',
  'fb.kpi.sap': 'Rencana SAP: {{count}} ({{under}} rendah, {{over}} tinggi)',
  'fb.kpi.materials': 'Material dengan alarm bias · mesin',
  'fb.kpi.overrides': 'Minggu dengan penyesuaian berlaku',
  'fb.kpi.overrides.sub': 'Penyesuaian tercatat: {{count}}',
  'fb.kpi.value': 'Nilai penyesuaian (FVA)',
  'fb.kpi.value.month': 'Bulan {{month}}; positif berarti penyesuaian membantu',
  'fb.kpi.value.none': 'Belum ada yang diukur: belum ada penyesuaian yang minggunya sudah terjual',

  'fb.skus.title': 'Sinyal pelacakan per SKU',
  'fb.skus.intro':
    'Prakiraan mesin dan rencana SAP, masing-masing untuk minggu saat dibuat, dibandingkan dengan yang terjual, pada minggu yang sama. Sinyal mendekati +1 berarti prakiraan terus terlalu rendah; mendekati −1, terlalu tinggi.',
  'fb.filter.all': 'Semua',
  'fb.filter.engine': 'Alarm mesin',
  'fb.filter.sap': 'Alarm rencana SAP',
  'fb.filter.alarms': 'Ada alarm',
  'fb.skus.col.sku': 'SKU',
  'fb.skus.col.brand': 'Merek',
  'fb.skus.col.weeks': 'Minggu dihitung',
  'fb.skus.col.engine': 'Prakiraan mesin',
  'fb.skus.col.sap': 'Rencana SAP',
  'fb.skus.newSku': 'SKU baru: mesin memakai rencana SAP',
  'fb.skus.discontinued': 'Kini dihentikan',
  'fb.skus.none': 'Tidak ada SKU yang cocok dengan filter ini.',

  'fb.materials.title': 'Sinyal pelacakan per material',
  'fb.materials.intro':
    'Minggu yang sama melalui daftar bahan: kebutuhan yang tersirat dari tiap prakiraan dibandingkan dengan kebutuhan yang ditimbulkan penjualan, pada minggu yang sama.',
  'fb.materials.col.material': 'Material',
  'fb.materials.col.skus': 'SKU pemakai',

  'fb.override.title': 'Sesuaikan prakiraan',
  'fb.override.intro':
    'Tim Perencanaan Material meninjau prakiraan sebelum dipakai untuk rencana material. Penyesuaian menetapkan prakiraan satu SKU untuk satu minggu; merek dan totalnya bergerak sebesar jumlah yang sama. Menaikkan prakiraan di atas prakiraan mesin memerlukan kode alasan.',
  'fb.form.noSku': 'Tidak ada SKU yang dapat disesuaikan pada prakiraan ini.',
  'fb.form.sku': 'SKU',
  'fb.form.week': 'Minggu',
  'fb.form.newValue': 'Prakiraan baru (unit)',
  'fb.form.engine': 'Mesin:',
  'fb.form.inForce': 'Berlaku:',
  'fb.form.reason': 'Alasan',
  'fb.form.reason.none': 'Tanpa alasan',
  'fb.form.reason.hint': 'Wajib bila prakiraan baru di atas prakiraan mesin. "Lainnya" memerlukan catatan.',
  'fb.form.note': 'Catatan',
  'fb.form.submit': 'Catat penyesuaian',
  'fb.form.attribution': 'Dicatat tanpa nama: fitur masuk belum dibangun, sehingga penyesuaian tampil tanpa atribusi.',
  'fb.toast.refused': 'Penyesuaian tidak dicatat',
  'fb.toast.recorded': 'Penyesuaian dicatat',

  'fb.ledger.title': 'Penyesuaian tercatat',
  'fb.ledger.empty': 'Belum ada penyesuaian. Data sintetis tidak membawa riwayat penyesuaian.',
  'fb.ledger.col.when': 'Dicatat',
  'fb.ledger.col.sku': 'SKU dan minggu',
  'fb.ledger.col.values': 'Lama → baru',
  'fb.ledger.col.direction': 'Terhadap mesin',
  'fb.ledger.col.reason': 'Alasan',
  'fb.ledger.unattributed': 'Tanpa atribusi (belum ada direktori pengguna)',
  'fb.ledger.week': 'Minggu',
  'fb.ledger.engine': 'Mesin',
  'fb.direction.up': 'Naik',
  'fb.direction.down': 'Turun',
  'fb.direction.none': 'Kembali ke mesin',
  'fb.reason.none': 'Tanpa alasan',

  'fb.fva.title': 'Nilai penyesuaian per bulan',
  'fb.fva.intro':
    'Untuk minggu yang sudah terjual: galat mesin dibandingkan galat setelah penyesuaian, per SKU, digabung sebagai rata-rata geometris (FVA). Positif berarti penyesuaian membuat prakiraan lebih baik. Menurut arah, alasan, dan besarnya.',
  'fb.fva.service':
    'Menilai penyesuaian berdasarkan layanan, bukan hanya akurasi, memerlukan simulasi ulang pemesanan PTI dari backtest, yang dibangun terpisah. Penilaian itu ditambahkan di sini begitu tersedia.',
  'fb.fva.empty':
    'Belum ada yang diukur. Data sintetis tidak membawa riwayat penyesuaian dan tidak ada yang dikarang: laporan ini terisi saat penyesuaian dimasukkan dan minggunya terjual. Menunggu minggunya: {{waiting}}. Minggu lalu tanpa angka penjualan yang dapat dipakai: {{unmeasurable}}.',
  'fb.fva.all': 'Semua penyesuaian',
  'fb.fva.col.group': 'Kelompok',
  'fb.fva.col.cells': 'Minggu · SKU',
  'fb.fva.col.mae': 'Galat: mesin → sesudah',
  'fb.fva.col.improved': 'Minggu membaik',
  'fb.fva.col.fva': 'Nilai (FVA)',
  'fb.fva.skus': 'SKU: {{count}}',
  'fb.fva.notComparable': 'Tidak dapat dibandingkan (galat nol): {{count}}',
  'fb.band.lt10': 'Besar di bawah 10%',
  'fb.band.10to25': 'Besar 10% sampai 25%',
  'fb.band.25to50': 'Besar 25% sampai 50%',
  'fb.band.50to100': 'Besar 50% sampai 100%',
  'fb.band.gt100': 'Besar di atas 100%',

  'fb.review.title': 'Jenis penyesuaian yang perlu ditinjau',
  'fb.review.intro': 'Arah dan alasan selama {{weeks}} minggu terakhir yang sudah terjual, dari',
  'fb.review.empty': 'Belum ada jenis penyesuaian dengan minggu terjual dalam rentang ini.',
  'fb.review.flagged': 'Tinjau dengan atasan perencana',
  'fb.review.ok': 'tidak perlu ditinjau',
  'fb.review.action': 'Jenis penyesuaian yang membuat prakiraan lebih buruk selama rentang ini dan ditandai untuk ditinjau: {{count}}.',

  'fb.def.title': 'Cara menghitung',
  'fb.def.signal':
    'Sinyal pelacakan: tiap minggu, galat terhaluskan = {{alpha}} × galat minggu ini + sisanya dari minggu lalu; hal yang sama untuk besar galat; sinyal adalah yang pertama dibagi yang kedua. Di atas {{limit}} ke arah mana pun adalah alarm bias, setelah paling sedikit {{min}} minggu dihitung.',
  'fb.def.origins':
    'Minggu lalu: pada tiap {{count}} Senin terakhir, mesin dijalankan seolah-olah hari itu, dan prakiraannya untuk minggu itu dibandingkan dengan yang terjual. Rencana SAP yang dibuat Senin itu dibandingkan dengan cara yang sama. Minggu kehabisan stok bukan permintaan dan tidak dihitung.',
  'fb.def.materials':
    'Material: minggu yang dihitung untuk SKU dilewatkan melalui daftar bahan dengan susut dan rendemen, sama seperti kebutuhan material.',
  'fb.def.override':
    'Penyesuaian: penyesuaian terakhir pada suatu minggu adalah yang berlaku. Nilai lama adalah yang berlaku sebelumnya; nilai mesin disimpan di sampingnya, dan arah dinilai terhadap nilai mesin.',
  'fb.def.fva':
    'Nilai penyesuaian: per SKU, rata-rata galat setelah penyesuaian ÷ rata-rata galat mesin; rata-rata geometris antar-SKU dikurangkan dari 1. −15% berarti penyesuaian membuat galat 15% lebih besar.',
  'fb.def.link': 'Buka Kualitas prakiraan',

  'fb.reason.promotion': 'Promosi atau aktivitas yang tidak ada di riwayat',
  'fb.reason.customer-order': 'Pesanan distributor atau pelanggan yang sudah diketahui',
  'fb.reason.listing-gain': 'Listing baru atau perluasan distribusi',
  'fb.reason.listing-loss': 'Listing hilang atau range dipangkas',
  'fb.reason.market-info': 'Informasi pasar atau pesaing',
  'fb.reason.data-correction': 'Mengoreksi kesalahan riwayat',
  'fb.reason.other': 'Lainnya (catatan wajib)',

  'fb.df.overrides': 'Minggu dengan penyesuaian perencana yang berlaku: {{count}}. Prakiraan yang ditampilkan sudah memuatnya; nilai mesin sendiri tetap ada di rincian SKU.',
  'fb.df.link': 'Tinjau bias dan penyesuaian',
  'fb.df.overridden': 'Disesuaikan',
  'fb.df.engineCol': 'Mesin',
};
