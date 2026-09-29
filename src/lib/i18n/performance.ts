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

  // Material B3 (MR-2) — weekly update compliance and the 13-week strip.
  'perf.compliance.title': 'Update compliance',
  'perf.compliance.value': 'Update compliance {{pct}}%',
  'perf.compliance.definition':
    'Share of the last 13 weekly stock updates made on time: every assigned material updated before the weekly cutoff or, for a supplier whose system is connected, a successful sync on every working day. The first 4 weeks after the first material is assigned are not counted.',
  'perf.compliance.stripLabel': 'Last 13 weeks, oldest first',
  'perf.compliance.weekLabel': 'Week ending {{date}}: {{state}}',
  'perf.compliance.week.compliant': 'Updated on time',
  'perf.compliance.week.missed': 'Missed',
  'perf.compliance.week.notCounted': 'Not counted',
  'perf.compliance.weightPrefix': 'Counts for',
  'perf.compliance.weightSuffix': 'of the overall score.',
  'perf.compliance.notInScore': 'Not part of the overall score until 4 weeks are counted.',

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
    'On time: received on or before the agreed date. A goods receipt counts only if it arrives no more than {{early}} days before that date and no more than {{match}} days after it. Nothing received {{grace}} days after the date: missed, even if the supplier sent a notice of dispatch. Before then: no result yet, and not counted.',
  'perf.kpi.otif.early':
    'Counts as on time, up to {{early}} days early. A receipt earlier than that does not count. Delivered on the confirmed date uses the same rule. The {{early}} days are a proposal until the warehouse sets how early a delivery may arrive.',
  'perf.kpi.otif.grain':
    'Per call-off: every delivery of the call-off must be on time and in full. The percentage is of the call-offs due in the period that have a result. A notice of dispatch alone is not a result, and it does not stop a delivery counting as missed.',
  'perf.kpi.otif.dateChange':
    'Only a date both sides agreed counts. A new date the supplier confirmed applies once it is accepted (automatically within tolerance, or by the planner); while it waits for the planner, the date agreed before applies. A planner’s change to the need date applies only once the supplier confirms it; until then, the date both sides last agreed applies.',
  'perf.kpi.otif.inFull':
    'Every goods receipt counted for the delivery is added together and must reach the agreed quantity. Two partial receipts add up.',
  'perf.kpi.cfot.window':
    'On time: received on or before the confirmed date, and no more than {{early}} days before it.',
  'perf.kpi.cfot.early':
    'Counts as on time, up to {{early}} days early — the same rule as on time and in full. A receipt earlier than that does not count.',
  'perf.kpi.cfot.grain':
    'Per purchase order, by quantity: the quantity confirmed and received by the confirmed date, divided by the quantity ordered. A period takes the orders whose confirmed date falls in it.',
  'perf.kpi.cfot.dateChange':
    'A supplier’s counter-offer applies only once the planner accepts it: then that line’s new date and quantity count. While it waits for the planner, or if the planner rejects it, the order as PTI placed it applies.',
  'perf.kpi.cfot.inFull':
    'Every receipt on time is added together, up to the confirmed quantity.',
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

  // Material B3 (MR-2) — kepatuhan pembaruan mingguan dan strip 13 minggu.
  'perf.compliance.title': 'Kepatuhan pembaruan',
  'perf.compliance.value': 'Kepatuhan pembaruan {{pct}}%',
  'perf.compliance.definition':
    'Porsi dari 13 pembaruan stok mingguan terakhir yang tepat waktu: setiap material yang ditugaskan diperbarui sebelum batas waktu mingguan atau, untuk pemasok yang sistemnya terhubung, sinkronisasi berhasil di setiap hari kerja. 4 minggu pertama setelah material pertama ditugaskan tidak dihitung.',
  'perf.compliance.stripLabel': '13 minggu terakhir, dari yang terlama',
  'perf.compliance.weekLabel': 'Minggu berakhir {{date}}: {{state}}',
  'perf.compliance.week.compliant': 'Diperbarui tepat waktu',
  'perf.compliance.week.missed': 'Terlewat',
  'perf.compliance.week.notCounted': 'Tidak dihitung',
  'perf.compliance.weightPrefix': 'Berbobot',
  'perf.compliance.weightSuffix': 'dari skor keseluruhan.',
  'perf.compliance.notInScore': 'Belum masuk skor keseluruhan sampai 4 minggu terhitung.',

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
    'Tepat waktu: diterima pada atau sebelum tanggal yang disepakati. Penerimaan barang dihitung hanya bila tiba tidak lebih dari {{early}} hari sebelum tanggal itu dan tidak lebih dari {{match}} hari setelahnya. Tidak ada yang diterima {{grace}} hari setelah tanggal itu: terlewat, meskipun pemasok sudah mengirim pemberitahuan pengiriman. Sebelum itu: belum ada hasil, dan tidak dihitung.',
  'perf.kpi.otif.early':
    'Dihitung tepat waktu, hingga {{early}} hari lebih awal. Penerimaan yang lebih awal dari itu tidak dihitung. Terkirim pada tanggal yang dikonfirmasi memakai aturan yang sama. {{early}} hari ini adalah usulan sampai gudang menetapkan seberapa awal pengiriman boleh tiba.',
  'perf.kpi.otif.grain':
    'Per call-off: setiap pengiriman call-off harus tepat waktu dan tepat jumlah. Persentasenya dari call-off yang jatuh tempo pada periode ini dan sudah ada hasilnya. Pemberitahuan pengiriman saja bukan hasil, dan tidak mencegah pengiriman dihitung terlewat.',
  'perf.kpi.otif.dateChange':
    'Hanya tanggal yang disepakati kedua pihak yang dihitung. Tanggal baru yang dikonfirmasi pemasok berlaku setelah diterima (otomatis dalam toleransi, atau oleh perencana); selama menunggu perencana, tanggal yang disepakati sebelumnya berlaku. Perubahan tanggal kebutuhan oleh perencana baru berlaku setelah pemasok mengonfirmasinya; sampai saat itu, tanggal terakhir yang disepakati kedua pihak berlaku.',
  'perf.kpi.otif.inFull':
    'Semua penerimaan barang yang dihitung untuk pengiriman itu dijumlahkan dan harus mencapai jumlah yang disepakati. Dua penerimaan sebagian dijumlahkan.',
  'perf.kpi.cfot.window':
    'Tepat waktu: diterima pada atau sebelum tanggal yang dikonfirmasi, dan tidak lebih dari {{early}} hari sebelumnya.',
  'perf.kpi.cfot.early':
    'Dihitung tepat waktu, hingga {{early}} hari lebih awal — aturan yang sama dengan tepat waktu dan tepat jumlah. Penerimaan yang lebih awal dari itu tidak dihitung.',
  'perf.kpi.cfot.grain':
    'Per pesanan pembelian, menurut jumlah: jumlah yang dikonfirmasi dan diterima sampai tanggal yang dikonfirmasi, dibagi jumlah yang dipesan. Suatu periode mencakup pesanan yang tanggal konfirmasinya jatuh di dalamnya.',
  'perf.kpi.cfot.dateChange':
    'Penawaran balik pemasok baru berlaku setelah diterima perencana: sejak itu tanggal dan jumlah baru pada baris itu yang dihitung. Selama menunggu perencana, atau bila perencana menolaknya, pesanan sebagaimana dibuat PTI berlaku.',
  'perf.kpi.cfot.inFull':
    'Semua penerimaan yang tepat waktu dijumlahkan, hingga jumlah yang dikonfirmasi.',
};
