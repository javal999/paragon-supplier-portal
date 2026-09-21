// Calculated-performance i18n fragment. Namespace: perf.*
//
// REQUIREMENTS REQ-E10-01 (CFOT and OTIF), CR-17 (target status) and
// REQ-E07-02 BR-07 (rejections count in the assessment). Business language
// only (SC-04): the screen says what was measured and over how many records,
// never which rule id decided it.

export const performanceEn: Record<string, string> = {
  'perf.otif': 'On time and in full',
  'perf.cfot': 'Delivered on the confirmed date',
  'perf.score': 'Overall score',
  'perf.grade': 'Grade',
  'perf.rejections': 'Rejections',
  'perf.target': 'Target {{target}}%',
  'perf.gradeBands': 'Grades from the score: {{bands}}',
  'perf.sampleColumns': 'On-time delivery rate, reply speed and invoice match are sample figures.',
  'perf.noMeasured': 'Nothing measured in this period yet.',
  // BL-53 — no target is stated while the baseline is measured (BL-19).
  'perf.measuredCallOffs_one': 'From {{count}} delivery due in this period · baseline period, no target',
  'perf.measuredCallOffs_other': 'From {{count}} deliveries due in this period · baseline period, no target',
  'perf.measuredOrders_one': 'From {{count}} order due in this period',
  'perf.measuredOrders_other': 'From {{count}} orders due in this period',
  'perf.rejectionsCount_one': '{{count}} rejection counts against the score',
  'perf.rejectionsCount_other': '{{count}} rejections count against the score',
  'perf.rejectionsSplit': 'Orders rejected: {{orders}} · call-offs rejected: {{callOffs}}',
  'perf.calculated': 'Calculated from deliveries and orders in this hub',
  'perf.period.30d': 'Last 30 days',
  'perf.period.90d': 'Last 90 days',
  'perf.period.ytd': 'This year',
  'perf.periodLabel': 'Period',
  'perf.pendingCount_one': '{{count}} delivery in this period has no result yet',
  'perf.pendingCount_other': '{{count}} deliveries in this period have no result yet',

  // BL-53 — the KPI definitions (BL-19): what the hub computes, not a policy.
  'perf.kpi.title': 'How these measures are calculated',
  'perf.kpi.intro':
    'PTI and the supplier see the same definitions. They state what the hub calculates today, so either side can reproduce a figure.',
  'perf.kpi.col.measure': 'Measure',
  'perf.kpi.q.window': 'Delivery window',
  'perf.kpi.q.early': 'Early deliveries',
  'perf.kpi.q.grain': 'Grain',
  'perf.kpi.q.dateChange': 'When a date changes',
  'perf.kpi.q.inFull': 'In full',
  'perf.kpi.q.target': 'Target',
  'perf.kpi.target.baseline': 'Baseline period — no target yet',
  'perf.kpi.target.baselineHint': 'Targets are set from the baseline after {{months}} months of measurement.',
  'perf.kpi.otif.window':
    'On time: received on or before the agreed date. A goods receipt counts only if it arrives within {{match}} days of that date. Nothing received {{grace}} days after it: missed. Before then: no result yet, and not counted.',
  'perf.kpi.otif.early':
    'Counts as on time, up to {{match}} days early. A receipt earlier than that is not matched to the call-off.',
  'perf.kpi.otif.grain':
    'Per call-off: every delivery of the call-off must be on time and in full. The percentage is of the call-offs due in the period that have a result; a notice of dispatch alone is not a result.',
  'perf.kpi.otif.dateChange':
    'Resets. The date is the one agreed: a new date the supplier confirmed, once accepted (automatically within tolerance, or by the planner). While it waits for the planner, the original date applies. A planner’s change to the need date applies at once.',
  'perf.kpi.otif.inFull':
    'One goods receipt of at least the agreed quantity. Two partial receipts are not added together.',
  'perf.kpi.cfot.window': 'On time: received on or before the confirmed date. There is no earliest date.',
  'perf.kpi.cfot.early': 'Counts, however early.',
  'perf.kpi.cfot.grain':
    'Per purchase order, by quantity: the quantity confirmed and received by the confirmed date, divided by the quantity ordered. A period takes the orders whose confirmed date falls in it.',
  'perf.kpi.cfot.dateChange':
    'Resets as soon as the supplier sends a counter-offer: that line’s new date and quantity apply, while it waits for the planner and once accepted. If the planner rejects it, the order as PTI placed it applies again.',
  'perf.kpi.cfot.inFull':
    'Receipts on or before the date are added together, up to the confirmed quantity.',
};

export const performanceId: Record<string, string> = {
  'perf.otif': 'Tepat waktu dan tepat jumlah',
  'perf.cfot': 'Terkirim pada tanggal yang dikonfirmasi',
  'perf.score': 'Skor keseluruhan',
  'perf.grade': 'Peringkat',
  'perf.rejections': 'Penolakan',
  'perf.target': 'Target {{target}}%',
  'perf.gradeBands': 'Peringkat dari skor: {{bands}}',
  'perf.sampleColumns': 'Tingkat pengiriman tepat waktu, kecepatan balasan, dan kecocokan faktur adalah data contoh.',
  'perf.noMeasured': 'Belum ada yang terukur pada periode ini.',
  'perf.measuredCallOffs_other': 'Dari {{count}} pengiriman yang jatuh tempo pada periode ini · periode dasar, belum ada target',
  'perf.measuredOrders_other': 'Dari {{count}} pesanan yang jatuh tempo pada periode ini',
  'perf.rejectionsCount_other': '{{count}} penolakan mengurangi skor',
  'perf.rejectionsSplit': 'Pesanan ditolak: {{orders}} · call-off ditolak: {{callOffs}}',
  'perf.calculated': 'Dihitung dari pengiriman dan pesanan di hub ini',
  'perf.period.30d': '30 hari terakhir',
  'perf.period.90d': '90 hari terakhir',
  'perf.period.ytd': 'Tahun berjalan',
  'perf.periodLabel': 'Periode',
  'perf.pendingCount_other': '{{count}} pengiriman pada periode ini belum ada hasilnya',

  'perf.kpi.title': 'Cara ukuran ini dihitung',
  'perf.kpi.intro':
    'PTI dan pemasok melihat definisi yang sama. Definisi ini menyatakan apa yang dihitung hub saat ini, sehingga kedua pihak dapat menghitung ulang setiap angka.',
  'perf.kpi.col.measure': 'Ukuran',
  'perf.kpi.q.window': 'Jendela pengiriman',
  'perf.kpi.q.early': 'Pengiriman lebih awal',
  'perf.kpi.q.grain': 'Tingkat pengukuran',
  'perf.kpi.q.dateChange': 'Bila tanggal berubah',
  'perf.kpi.q.inFull': 'Tepat jumlah',
  'perf.kpi.q.target': 'Target',
  'perf.kpi.target.baseline': 'Periode dasar — belum ada target',
  'perf.kpi.target.baselineHint': 'Target ditetapkan dari periode dasar setelah {{months}} bulan pengukuran.',
  'perf.kpi.otif.window':
    'Tepat waktu: diterima pada atau sebelum tanggal yang disepakati. Penerimaan barang dihitung hanya bila tiba dalam {{match}} hari dari tanggal itu. Tidak ada yang diterima {{grace}} hari setelahnya: terlewat. Sebelum itu: belum ada hasil, dan tidak dihitung.',
  'perf.kpi.otif.early':
    'Dihitung tepat waktu, hingga {{match}} hari lebih awal. Penerimaan yang lebih awal dari itu tidak dicocokkan dengan call-off.',
  'perf.kpi.otif.grain':
    'Per call-off: setiap pengiriman call-off harus tepat waktu dan tepat jumlah. Persentasenya dari call-off yang jatuh tempo pada periode ini dan sudah ada hasilnya; pemberitahuan pengiriman saja bukan hasil.',
  'perf.kpi.otif.dateChange':
    'Diatur ulang. Tanggalnya adalah yang disepakati: tanggal baru yang dikonfirmasi pemasok, setelah diterima (otomatis dalam toleransi, atau oleh perencana). Selama menunggu perencana, tanggal semula berlaku. Perubahan tanggal kebutuhan oleh perencana langsung berlaku.',
  'perf.kpi.otif.inFull':
    'Satu penerimaan barang sebanyak minimal jumlah yang disepakati. Dua penerimaan sebagian tidak dijumlahkan.',
  'perf.kpi.cfot.window': 'Tepat waktu: diterima pada atau sebelum tanggal yang dikonfirmasi. Tidak ada tanggal paling awal.',
  'perf.kpi.cfot.early': 'Dihitung, seawal apa pun.',
  'perf.kpi.cfot.grain':
    'Per pesanan pembelian, menurut jumlah: jumlah yang dikonfirmasi dan diterima sampai tanggal yang dikonfirmasi, dibagi jumlah yang dipesan. Suatu periode mencakup pesanan yang tanggal konfirmasinya jatuh di dalamnya.',
  'perf.kpi.cfot.dateChange':
    'Diatur ulang begitu pemasok mengirim penawaran balik: tanggal dan jumlah baru pada baris itu berlaku, selama menunggu perencana maupun setelah diterima. Bila perencana menolaknya, pesanan sebagaimana dibuat PTI berlaku kembali.',
  'perf.kpi.cfot.inFull':
    'Penerimaan pada atau sebelum tanggal itu dijumlahkan, hingga jumlah yang dikonfirmasi.',
};
