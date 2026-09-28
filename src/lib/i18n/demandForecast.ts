// Demand forecast i18n fragment (REQ-E14-07, BL-110). Namespace: df.*
//
// Business language: what PTI will ship per SKU per week, which method made
// each forecast, and whether SKUs, brands and the total add up. Mono data
// (SKU codes, dates, quantities) is rendered through <Data> and never keyed.

export const demandForecastEn: Record<string, string> = {
  'df.title': 'Demand forecast',
  'df.subtitle':
    'Weekly sell-in per finished good for the next 26 weeks, the method that made each forecast, and SKU, brand and total forecasts reconciled so they add up.',
  'df.meta.run': 'Forecast from the week of',
  'df.meta.to': 'to the week of',
  'df.synthetic':
    'Forecast on synthetic sales history built to reproduce PTI’s current measures. It proves the calculation, not the business answer.',
  'df.grain':
    'Sell-in: PTI’s shipments to its DCs and distributors, for PTI’s own brands (ENG-D10). OEM products are not forecast: their demand is the brand’s purchase orders (ENG-D20). The Material Planning team reviews this forecast before it drives material plans (ENG-D11).',
  'df.mainNotBuilt':
    'The main model is not built. The requirement’s main model is gradient-boosted trees (LightGBM) trained across SKUs on price, promotion and calendar effects; there is no price or promotion history to train it on yet, and it may only be used where it beats the fallback in the backtest (E14-10), which is not built either. Every forecast on this page comes from a statistical method, named in its row.',
  'df.source':
    'Not yet feeding material plans: Material requirement, Order plan, Stabilise and publish and Reschedule still run on SAP’s plan (shown here for comparison) until the backtest chooses this forecast by service.',

  'df.kpi.skus': 'SKUs forecast',
  'df.kpi.skus.sub': '{{ended}} discontinued at zero · {{oem}} OEM left out',
  'df.kpi.fallback': 'Forecast by the fallback (Comb)',
  'df.kpi.fallback.sub': '{{slow}} by slow-mover methods · {{launch}} on the launch stand-in',
  'df.kpi.total': 'Next 26 weeks, all SKUs',
  'df.kpi.total.sub': 'SAP’s plan: {{sap}} ({{diff}})',
  'df.kpi.total.noSap': 'No SAP plan to compare',
  'df.kpi.recon': 'SKU, brand and total',
  'df.kpi.recon.value': 'Add up',
  'df.kpi.recon.mint': 'MinT-shrink, λ {{lambda}} · {{clipped}} negative values set to 0',
  'df.kpi.recon.wls': 'Structural weights ({{reason}}) · {{clipped}} negative values set to 0',
  'df.recon.fallback.noResidualVariance': 'a level had no forecast error to weigh',
  'df.recon.fallback.notPositiveDefinite': 'the error covariance could not be inverted',

  'df.levels.title': 'Total and brands',
  'df.levels.intro':
    'Each level is forecast on its own, then reconciled: the reconciled figure is always the sum of the SKUs beneath it.',
  'df.levels.col.level': 'Level',
  'df.levels.col.skus': 'SKUs',
  'df.levels.col.base': 'Own forecast, 26 weeks',
  'df.levels.col.forecast': 'Reconciled, 26 weeks',
  'df.levels.col.sap': 'SAP’s plan, 26 weeks',
  'df.levels.col.diff': 'Against SAP',
  'df.levels.total': 'Total',

  'df.skus.title': 'SKUs',
  'df.skus.intro': 'Select a SKU to see its weeks.',
  'df.skus.all': 'All brands',
  'df.skus.col.sku': 'SKU',
  'df.skus.col.brand': 'Brand',
  'df.skus.col.method': 'Method',
  'df.skus.col.history': 'History',
  'df.skus.col.next4': 'Next 4 weeks',
  'df.skus.col.forecast': '26 weeks',
  'df.skus.col.sap': 'SAP’s plan',
  'df.skus.col.diff': 'Against SAP',
  'df.skus.weeks': '{{count}} weeks',
  'df.skus.stockouts': '{{count}} out of stock',

  'df.method.main': 'Main model',
  'df.method.comb': 'Comb (fallback)',
  'df.method.sba': 'SBA (slow mover)',
  'df.method.croston': 'Croston (slow mover)',
  'df.method.tsb': 'TSB (being discontinued)',
  'df.method.launchStandIn': 'Launch stand-in',
  'df.method.discontinued': 'Discontinued',

  'df.detail.title': 'Weeks',
  'df.detail.col.week': 'Week of',
  'df.detail.col.base': 'Method’s forecast',
  'df.detail.col.forecast': 'Reconciled',
  'df.detail.col.theta': 'Theta (alternative)',
  'df.detail.col.sap': 'SAP’s plan',
  'df.detail.comb':
    'Comb: the average of simple exponential smoothing (α {{sesAlpha}}), Holt’s trend (α {{holtAlpha}}, β {{holtBeta}}) and a damped trend (α {{dampedAlpha}}, β {{dampedBeta}}, φ {{phi}}).',
  'df.detail.seasonal': 'Seasonality found and applied.',
  'df.detail.notSeasonal': 'No seasonality found by the test on this history.',
  'df.detail.launch':
    'Less than 52 weeks of history, so the launch method (E14-08) applies. It is not built; this is the Comb on the short history, without seasonality.',
  'df.detail.slow': 'Sold in fewer than 3 of every 4 in-stock weeks: mean interval between sales {{p}}, variation of sale sizes {{v}}.',
  'df.detail.sba': 'SBA: the typical sale size ÷ the typical gap × 0.95. Chosen by the Kostenko–Hyndman rule.',
  'df.detail.croston': 'Croston: the typical sale size ÷ the typical gap. Chosen by the Kostenko–Hyndman rule.',
  'df.detail.tsb': 'TSB: the chance of a sale in a week × the typical size, falling while sales stay at zero. Used because the SKU is being discontinued.',
  'df.detail.discontinued': 'Discontinued before this forecast starts: zero, and left out of the reconciliation.',
  'df.detail.main': 'The main model beat the fallback for this SKU in the latest backtest.',
  'df.detail.endsOn': 'Discontinued from the week of {{date}}: zero from then.',

  'df.oem.title': 'OEM products left out',
  'df.oem.none': 'No OEM product in this data. An OEM product would be listed here and left out of every level.',

  'df.def.title': 'How the forecast is made',
  'df.def.order':
    'Each SKU gets the first method that applies: OEM products are not forecast; a discontinued SKU is zero; less than 52 weeks of history takes the launch method (not built, stand-in shown); the main model where it beat the fallback (not built); a slow SKU takes SBA, or TSB when it is being discontinued; every other SKU takes the fallback.',
  'df.def.comb':
    'The fallback is the Comb benchmark: the average of three exponential smoothing methods, after a seasonality test. Theta is calculated beside it; choosing between them is the backtest’s job.',
  'df.def.stockout': 'A week flagged out of stock is not read as low demand: it is filled from the weeks around it, or skipped for slow SKUs.',
  'df.def.recon':
    'Reconciliation (MinT-shrink) adjusts the SKU, brand and total forecasts so they add up, weighting each level by how accurate it has been. A negative result is set to zero.',
};

export const demandForecastId: Record<string, string> = {
  'df.title': 'Prakiraan permintaan',
  'df.subtitle':
    'Sell-in mingguan per barang jadi untuk 26 minggu ke depan, metode yang menghasilkan tiap prakiraan, serta prakiraan SKU, merek, dan total yang direkonsiliasi agar jumlahnya cocok.',
  'df.meta.run': 'Prakiraan dari minggu',
  'df.meta.to': 'sampai minggu',
  'df.synthetic':
    'Diprakirakan dari riwayat penjualan sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'df.grain':
    'Sell-in: pengiriman PTI ke DC dan distributornya, untuk merek milik PTI sendiri (ENG-D10). Produk OEM tidak diprakirakan: permintaannya adalah pesanan pembelian dari merek tersebut (ENG-D20). Tim Material Planning meninjau prakiraan ini sebelum dipakai untuk rencana material (ENG-D11).',
  'df.mainNotBuilt':
    'Model utama belum dibangun. Model utama dalam persyaratan adalah gradient-boosted trees (LightGBM) yang dilatih lintas SKU dengan efek harga, promosi, dan kalender; belum ada riwayat harga atau promosi untuk melatihnya, dan model itu hanya boleh dipakai jika mengalahkan metode cadangan dalam backtest (E14-10), yang juga belum dibangun. Setiap prakiraan di halaman ini berasal dari metode statistik yang disebutkan di barisnya.',
  'df.source':
    'Belum dipakai untuk rencana material: Kebutuhan material, Rencana pesanan, Stabilkan dan publikasikan, serta Jadwal ulang masih memakai rencana SAP (ditampilkan di sini sebagai pembanding) sampai backtest memilih prakiraan ini berdasarkan tingkat layanan.',

  'df.kpi.skus': 'SKU yang diprakirakan',
  'df.kpi.skus.sub': '{{ended}} dihentikan (nol) · {{oem}} OEM dikecualikan',
  'df.kpi.fallback': 'Diprakirakan metode cadangan (Comb)',
  'df.kpi.fallback.sub': '{{slow}} dengan metode barang lambat · {{launch}} dengan pengganti peluncuran',
  'df.kpi.total': '26 minggu ke depan, semua SKU',
  'df.kpi.total.sub': 'Rencana SAP: {{sap}} ({{diff}})',
  'df.kpi.total.noSap': 'Tidak ada rencana SAP untuk dibandingkan',
  'df.kpi.recon': 'SKU, merek, dan total',
  'df.kpi.recon.value': 'Jumlahnya cocok',
  'df.kpi.recon.mint': 'MinT-shrink, λ {{lambda}} · {{clipped}} nilai negatif dijadikan 0',
  'df.kpi.recon.wls': 'Bobot struktural ({{reason}}) · {{clipped}} nilai negatif dijadikan 0',
  'df.recon.fallback.noResidualVariance': 'ada level tanpa galat prakiraan untuk ditimbang',
  'df.recon.fallback.notPositiveDefinite': 'kovarians galat tidak dapat dibalik',

  'df.levels.title': 'Total dan merek',
  'df.levels.intro':
    'Setiap level diprakirakan sendiri, lalu direkonsiliasi: angka hasil rekonsiliasi selalu sama dengan jumlah SKU di bawahnya.',
  'df.levels.col.level': 'Level',
  'df.levels.col.skus': 'SKU',
  'df.levels.col.base': 'Prakiraan sendiri, 26 minggu',
  'df.levels.col.forecast': 'Hasil rekonsiliasi, 26 minggu',
  'df.levels.col.sap': 'Rencana SAP, 26 minggu',
  'df.levels.col.diff': 'Terhadap SAP',
  'df.levels.total': 'Total',

  'df.skus.title': 'SKU',
  'df.skus.intro': 'Pilih SKU untuk melihat minggunya.',
  'df.skus.all': 'Semua merek',
  'df.skus.col.sku': 'SKU',
  'df.skus.col.brand': 'Merek',
  'df.skus.col.method': 'Metode',
  'df.skus.col.history': 'Riwayat',
  'df.skus.col.next4': '4 minggu ke depan',
  'df.skus.col.forecast': '26 minggu',
  'df.skus.col.sap': 'Rencana SAP',
  'df.skus.col.diff': 'Terhadap SAP',
  'df.skus.weeks': '{{count}} minggu',
  'df.skus.stockouts': '{{count}} kehabisan stok',

  'df.method.main': 'Model utama',
  'df.method.comb': 'Comb (cadangan)',
  'df.method.sba': 'SBA (barang lambat)',
  'df.method.croston': 'Croston (barang lambat)',
  'df.method.tsb': 'TSB (akan dihentikan)',
  'df.method.launchStandIn': 'Pengganti peluncuran',
  'df.method.discontinued': 'Dihentikan',

  'df.detail.title': 'Minggu',
  'df.detail.col.week': 'Minggu',
  'df.detail.col.base': 'Prakiraan metode',
  'df.detail.col.forecast': 'Hasil rekonsiliasi',
  'df.detail.col.theta': 'Theta (alternatif)',
  'df.detail.col.sap': 'Rencana SAP',
  'df.detail.comb':
    'Comb: rata-rata simple exponential smoothing (α {{sesAlpha}}), tren Holt (α {{holtAlpha}}, β {{holtBeta}}), dan tren teredam (α {{dampedAlpha}}, β {{dampedBeta}}, φ {{phi}}).',
  'df.detail.seasonal': 'Musiman ditemukan dan diterapkan.',
  'df.detail.notSeasonal': 'Uji tidak menemukan pola musiman pada riwayat ini.',
  'df.detail.launch':
    'Riwayat kurang dari 52 minggu, jadi metode peluncuran (E14-08) yang berlaku. Metode itu belum dibangun; ini adalah Comb pada riwayat pendek, tanpa musiman.',
  'df.detail.slow': 'Terjual di kurang dari 3 dari setiap 4 minggu yang ada stok: rata-rata jarak antarpenjualan {{p}}, variasi ukuran penjualan {{v}}.',
  'df.detail.sba': 'SBA: ukuran penjualan biasa ÷ jarak biasa × 0,95. Dipilih dengan aturan Kostenko–Hyndman.',
  'df.detail.croston': 'Croston: ukuran penjualan biasa ÷ jarak biasa. Dipilih dengan aturan Kostenko–Hyndman.',
  'df.detail.tsb': 'TSB: peluang ada penjualan dalam seminggu × ukuran biasa, terus turun selama penjualan nol. Dipakai karena SKU ini akan dihentikan.',
  'df.detail.discontinued': 'Dihentikan sebelum prakiraan ini dimulai: nol, dan dikeluarkan dari rekonsiliasi.',
  'df.detail.main': 'Model utama mengalahkan metode cadangan untuk SKU ini pada backtest terakhir.',
  'df.detail.endsOn': 'Dihentikan mulai minggu {{date}}: nol sejak saat itu.',

  'df.oem.title': 'Produk OEM yang dikecualikan',
  'df.oem.none': 'Tidak ada produk OEM dalam data ini. Produk OEM akan tercantum di sini dan dikeluarkan dari setiap level.',

  'df.def.title': 'Cara prakiraan dibuat',
  'df.def.order':
    'Setiap SKU mendapat metode pertama yang berlaku: produk OEM tidak diprakirakan; SKU yang dihentikan bernilai nol; riwayat kurang dari 52 minggu memakai metode peluncuran (belum dibangun, ditampilkan penggantinya); model utama jika mengalahkan metode cadangan (belum dibangun); SKU lambat memakai SBA, atau TSB bila akan dihentikan; SKU lainnya memakai metode cadangan.',
  'df.def.comb':
    'Metode cadangan adalah tolok ukur Comb: rata-rata tiga metode exponential smoothing, setelah uji musiman. Theta dihitung di sampingnya; memilih di antara keduanya adalah tugas backtest.',
  'df.def.stockout': 'Minggu yang ditandai kehabisan stok tidak dibaca sebagai permintaan rendah: diisi dari minggu-minggu di sekitarnya, atau dilewati untuk SKU lambat.',
  'df.def.recon':
    'Rekonsiliasi (MinT-shrink) menyesuaikan prakiraan SKU, merek, dan total agar jumlahnya cocok, dengan menimbang setiap level menurut ketepatannya selama ini. Hasil negatif dijadikan nol.',
};
