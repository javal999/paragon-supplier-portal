// Strategic buffer and production limit i18n fragment (DRC-9a, DRC-9b, BL-195).
// Namespace: buffers.*
//
// Read-only figures on the PTI Capacity page. "LTP" and "Lebaran" are kept in
// both languages. Quantities and months are mono data, rendered through
// <Data>, never keyed.

/** @type {Record<string, string>} */
export const drcBuffersEn = {
  'buffers.provisional': 'Provisional: rule awaiting Material Planning ({{question}})',
  'buffers.strategic.title': 'Strategic buffer, festive windows',
  'buffers.strategic.subtitle':
    'Strategic buffer = LTP − baseline, the baseline the average LTP of the {{months}} months before the festive window; never below 0. Read only: nothing is ordered from it.',
  'buffers.strategic.calendarNote':
    'Festive windows come from PTI’s demand-event calendar: Ramadan to Lebaran, by month. The calendar has no Chinese New Year yet, so CNY is not shown.',
  'buffers.strategic.window': 'Ramadan {{year}} H: {{start}} to Lebaran {{eid}}',
  'buffers.strategic.col.supplier': 'Supplier',
  'buffers.strategic.col.material': 'Material',
  'buffers.strategic.col.month': 'Month',
  'buffers.strategic.baselineOf': 'Average of {{months}}',
  'buffers.strategic.noLtp': 'No LTP',
  'buffers.strategic.partial': 'LTP covers {{covered}} of {{days}} days',
  'buffers.strategic.baselineIncomplete':
    'Baseline incomplete: a month before the window has no LTP',
  'buffers.strategic.noWindow': 'No festive window in the LTP months',
  'buffers.strategic.loading': 'Loading the LTP…',
  'buffers.strategic.error': 'The LTP could not be loaded.',
  'buffers.strategic.empty': 'No supplier × material with LTP matches the filters.',
  // DRC-9c (BL-205) — protection buffer, [Proposed].
  'buffers.proposed': 'Proposed: awaiting owner review (BL-205, {{question}})',
  'buffers.protection.title': 'Protection buffer, OSIP levels 5 to 7',
  'buffers.protection.subtitle':
    'Protection buffer = CEILING(uplift, production MPQ), uplift = LTP − average LTP of the {{months}} months before; never below 0. Levels 5, 6 and 7 only: level 4 has none, levels 1 to 3 take the strategic buffer. Read only: ROP Fisik and Max do not include it.',
  'buffers.protection.absorbed': 'Planned stock: PTI absorbs it even if demand does not rise',
  'buffers.protection.col.supplier': 'Supplier',
  'buffers.protection.col.material': 'Material',
  'buffers.protection.col.month': 'Month',
  'buffers.protection.levelDefault': 'Level {{level}} (default)',
  'buffers.protection.level': 'Level {{level}}',
  'buffers.protection.mpq': 'MPQ {{mpq}}',
  'buffers.protection.noMpq': 'No MPQ',
  'buffers.protection.reason.level4': 'Level 4: no protection buffer',
  'buffers.protection.reason.strategicLevel': 'Level {{level}}: strategic buffer instead',
  'buffers.protection.reason.otherLevel': 'Level {{level}}: no protection buffer',
  'buffers.protection.reason.switchedOff': 'Switched off',
  'buffers.protection.baselineIncomplete': 'Baseline incomplete',
  'buffers.protection.loading': 'Loading the protection buffer…',
  'buffers.protection.error': 'The protection buffer could not be loaded.',
  'buffers.protection.empty': 'No supplier × material with LTP matches the filters.'
};

/** @type {Record<string, string>} */
export const drcBuffersId = {
  'buffers.provisional': 'Sementara: aturan menunggu Material Planning ({{question}})',
  'buffers.strategic.title': 'Strategic buffer, periode hari raya',
  'buffers.strategic.subtitle':
    'Strategic buffer = LTP − baseline, baseline adalah rata-rata LTP {{months}} bulan sebelum periode hari raya; tidak pernah di bawah 0. Hanya baca: tidak ada pesanan dari angka ini.',
  'buffers.strategic.calendarNote':
    'Periode hari raya diambil dari kalender event permintaan PTI: Ramadan sampai Lebaran, per bulan. Kalender belum memuat Imlek, jadi Imlek tidak ditampilkan.',
  'buffers.strategic.window': 'Ramadan {{year}} H: {{start}} sampai Lebaran {{eid}}',
  'buffers.strategic.col.supplier': 'Pemasok',
  'buffers.strategic.col.material': 'Material',
  'buffers.strategic.col.month': 'Bulan',
  'buffers.strategic.baselineOf': 'Rata-rata {{months}}',
  'buffers.strategic.noLtp': 'Tidak ada LTP',
  'buffers.strategic.partial': 'LTP mencakup {{covered}} dari {{days}} hari',
  'buffers.strategic.baselineIncomplete':
    'Baseline tidak lengkap: ada bulan sebelum periode tanpa LTP',
  'buffers.strategic.noWindow': 'Tidak ada periode hari raya dalam bulan LTP',
  'buffers.strategic.loading': 'Memuat LTP…',
  'buffers.strategic.error': 'LTP tidak dapat dimuat.',
  'buffers.strategic.empty': 'Tidak ada pemasok × material dengan LTP yang sesuai filter.',
  // DRC-9c (BL-205) — protection buffer, [Proposed].
  'buffers.proposed': 'Usulan: menunggu tinjauan pemilik (BL-205, {{question}})',
  'buffers.protection.title': 'Protection buffer, level OSIP 5 sampai 7',
  'buffers.protection.subtitle':
    'Protection buffer = CEILING(kenaikan, MPQ produksi), kenaikan = LTP − rata-rata LTP {{months}} bulan sebelumnya; tidak pernah di bawah 0. Hanya level 5, 6 dan 7: level 4 tanpa protection buffer, level 1 sampai 3 memakai strategic buffer. Hanya baca: ROP Fisik dan Max tidak memasukkannya.',
  'buffers.protection.absorbed': 'Stok terencana: PTI menyerapnya walaupun permintaan tidak naik',
  'buffers.protection.col.supplier': 'Pemasok',
  'buffers.protection.col.material': 'Material',
  'buffers.protection.col.month': 'Bulan',
  'buffers.protection.levelDefault': 'Level {{level}} (bawaan)',
  'buffers.protection.level': 'Level {{level}}',
  'buffers.protection.mpq': 'MPQ {{mpq}}',
  'buffers.protection.noMpq': 'Tidak ada MPQ',
  'buffers.protection.reason.level4': 'Level 4: tanpa protection buffer',
  'buffers.protection.reason.strategicLevel': 'Level {{level}}: memakai strategic buffer',
  'buffers.protection.reason.otherLevel': 'Level {{level}}: tanpa protection buffer',
  'buffers.protection.reason.switchedOff': 'Dimatikan',
  'buffers.protection.baselineIncomplete': 'Baseline tidak lengkap',
  'buffers.protection.loading': 'Memuat protection buffer…',
  'buffers.protection.error': 'Protection buffer tidak dapat dimuat.',
  'buffers.protection.empty': 'Tidak ada pemasok × material dengan LTP yang sesuai filter.'
};
