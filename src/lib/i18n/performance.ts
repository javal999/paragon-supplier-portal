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
  'perf.measuredCallOffs_one': 'From {{count}} delivery due in this period · target {{target}}%',
  'perf.measuredCallOffs_other': 'From {{count}} deliveries due in this period · target {{target}}%',
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
  'perf.measuredCallOffs_other': 'Dari {{count}} pengiriman yang jatuh tempo pada periode ini · target {{target}}%',
  'perf.measuredOrders_other': 'Dari {{count}} pesanan yang jatuh tempo pada periode ini',
  'perf.rejectionsCount_other': '{{count}} penolakan mengurangi skor',
  'perf.rejectionsSplit': 'Pesanan ditolak: {{orders}} · call-off ditolak: {{callOffs}}',
  'perf.calculated': 'Dihitung dari pengiriman dan pesanan di hub ini',
  'perf.period.30d': '30 hari terakhir',
  'perf.period.90d': '90 hari terakhir',
  'perf.period.ytd': 'Tahun berjalan',
  'perf.periodLabel': 'Periode',
  'perf.pendingCount_other': '{{count}} pengiriman pada periode ini belum ada hasilnya',
};
