// Strategic buffer and production limit i18n fragment (DRC-9a, DRC-9b, BL-195).
// Namespace: buffers.*
//
// Read-only figures on the PTI Capacity page. "LTP" and "Lebaran" are kept in
// both languages. Quantities and months are mono data, rendered through
// <Data>, never keyed.

/** @type {Record<string, string>} */
export const drcBuffersEn = {
  'buffers.provisional': 'Provisional: rule awaiting Material Planning ({{question}})',
  'buffers.productionLimit.row': 'Production limit (allocated capacity)',
  'buffers.strategic.title': 'Strategic buffer, festive windows',
  'buffers.strategic.subtitle':
    'Strategic buffer = LTP − baseline, the baseline the average LTP of the {{months}} months before the festive window; never below 0. Read only: nothing is ordered from it.',
  'buffers.strategic.calendarNote':
    'Festive windows come from PTI’s demand-event calendar: Ramadan to Lebaran, by month. The calendar has no Chinese New Year yet, so CNY is not shown.',
  'buffers.strategic.window': 'Ramadan {{year}} H: {{start}} to Lebaran {{eid}}',
  'buffers.strategic.col.supplier': 'Supplier',
  'buffers.strategic.col.material': 'Material',
  'buffers.strategic.col.month': 'Month',
  'buffers.strategic.col.ltp': 'LTP',
  'buffers.strategic.col.baseline': 'Baseline',
  'buffers.strategic.col.buffer': 'Strategic buffer',
  'buffers.strategic.baselineOf': 'Average of {{months}}',
  'buffers.strategic.noLtp': 'No LTP',
  'buffers.strategic.partial': 'LTP covers {{covered}} of {{days}} days',
  'buffers.strategic.baselineIncomplete':
    'Baseline incomplete: a month before the window has no LTP',
  'buffers.strategic.noWindow': 'No festive window in the LTP months',
  'buffers.strategic.loading': 'Loading the LTP…',
  'buffers.strategic.error': 'The LTP could not be loaded.',
  'buffers.strategic.empty': 'No supplier × material with LTP matches the filters.'
};

/** @type {Record<string, string>} */
export const drcBuffersId = {
  'buffers.provisional': 'Sementara: aturan menunggu Material Planning ({{question}})',
  'buffers.productionLimit.row': 'Batas produksi (kapasitas dialokasikan)',
  'buffers.strategic.title': 'Buffer strategis, periode hari raya',
  'buffers.strategic.subtitle':
    'Buffer strategis = LTP − baseline, baseline adalah rata-rata LTP {{months}} bulan sebelum periode hari raya; tidak pernah di bawah 0. Hanya baca: tidak ada pesanan dari angka ini.',
  'buffers.strategic.calendarNote':
    'Periode hari raya diambil dari kalender event permintaan PTI: Ramadan sampai Lebaran, per bulan. Kalender belum memuat Imlek, jadi Imlek tidak ditampilkan.',
  'buffers.strategic.window': 'Ramadan {{year}} H: {{start}} sampai Lebaran {{eid}}',
  'buffers.strategic.col.supplier': 'Pemasok',
  'buffers.strategic.col.material': 'Material',
  'buffers.strategic.col.month': 'Bulan',
  'buffers.strategic.col.ltp': 'LTP',
  'buffers.strategic.col.baseline': 'Baseline',
  'buffers.strategic.col.buffer': 'Buffer strategis',
  'buffers.strategic.baselineOf': 'Rata-rata {{months}}',
  'buffers.strategic.noLtp': 'Tidak ada LTP',
  'buffers.strategic.partial': 'LTP mencakup {{covered}} dari {{days}} hari',
  'buffers.strategic.baselineIncomplete':
    'Baseline tidak lengkap: ada bulan sebelum periode tanpa LTP',
  'buffers.strategic.noWindow': 'Tidak ada periode hari raya dalam bulan LTP',
  'buffers.strategic.loading': 'Memuat LTP…',
  'buffers.strategic.error': 'LTP tidak dapat dimuat.',
  'buffers.strategic.empty': 'Tidak ada pemasok × material dengan LTP yang sesuai filter.'
};
