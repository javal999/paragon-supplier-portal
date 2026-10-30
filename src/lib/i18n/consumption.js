// Recorded consumption i18n fragment (CAP-11, SC-HUB-DEMAND-ANTICIPATION-BRIEF-2026-10 §5).
// Namespace: consumption.*
//
// TL-D1 (BL-233, supersedes CAP-D10) — the figure's label is "Demand
// anticipation (DA)" in EN and ID; sentences here keep "demand anticipation"
// once the page's label has introduced "(DA)".

/** @type {Record<string, string>} */
export const consumptionEn = {
  'consumption.title': 'Record consumption',
  'consumption.marker': 'Consumption recorded by the planner · awaiting SAP goods-issue feed',
  'consumption.howItWorks':
    'Record what a material actually used in a week, up to the current one. It shows on the grid and feeds the consumption average. A material’s consumption is shared across its suppliers by their share of the material’s LTP (the share shown on each card), the same split the safety figures use. A later record for the same material and week replaces the earlier one.',
  'consumption.noWeeks':
    'No material has demand anticipation, so there is nothing to record consumption for.',
  'consumption.field.material': 'Material',
  'consumption.field.week': 'Week',
  'consumption.field.qty': 'Consumption ({{uom}})',
  'consumption.record.button': 'Record consumption',
  'consumption.record.done': 'Consumption recorded: {{material}}, {{week}}',
  'consumption.record.failed': 'Could not record consumption',
  'consumption.record.inForce': 'Recorded for this week: {{qty}} {{uom}} ({{source}}).',
  'consumption.source.manual': 'typed',
  'consumption.source.upload': 'uploaded',
  'consumption.source.sap': 'SAP goods issue',
  'consumption.upload.download': 'Download consumption template',
  'consumption.upload.choose': 'Upload consumption file',
  'consumption.upload.columns': 'CSV or XLSX with the columns {{columns}}.',
  'consumption.upload.checking': 'Checking the file…',
  'consumption.upload.error.unreadable':
    'This file cannot be read. Upload the consumption template as CSV or XLSX.',
  'consumption.upload.error.notTemplate':
    'This is not the consumption template: it has no column {{columns}}. Download the template and fill it in.',
  'consumption.upload.error.empty': 'The file has no consumption filled in.',
  'consumption.upload.saved_one': '{{count}} week recorded.',
  'consumption.upload.saved_other': '{{count}} weeks recorded.',
  'consumption.upload.refusedRow': 'Row {{row}} · {{material}}: {{reason}}',
  'consumption.upload.reason.unknownMaterial': 'not a material on this page',
  'consumption.upload.reason.notAWeek': 'the week is not a date',
  'consumption.upload.reason.futureWeek': 'the week is after the current week',
  'consumption.upload.reason.notANumber': 'the consumption is not a number',
  'consumption.upload.reason.ambiguousNumber':
    'the number reads differently in English and Indonesian; write it without a thousands separator',
  'consumption.upload.reason.unitMismatch': 'the unit is not the material’s unit',
  'consumption.upload.reason.duplicateRow': 'the file has another row for this material and week',
  // The grid rows (CAP-11 BR-05).
  'consumption.row.recordedTitle':
    '{{share}} of the material’s {{material}}, {{source}} on {{date}} ({{id}})',
  // The alert (CAP-11 BR-04).
  'consumption.alert.detail':
    '{{qty}} {{uom}} of the supply above demand anticipation over {{from}} cannot be absorbed in {{by}}.'
};

/** @type {Record<string, string>} */
export const consumptionId = {
  'consumption.title': 'Catat pemakaian',
  'consumption.marker': 'Pemakaian dicatat oleh perencana · menunggu umpan pengeluaran barang SAP',
  'consumption.howItWorks':
    'Catat pemakaian aktual material pada suatu minggu, sampai minggu ini. Pemakaian tampil di grid dan masuk ke rata-rata pemakaian. Pemakaian material dibagi ke pemasoknya menurut bagian masing-masing atas LTP material (bagian yang tampil di tiap kartu), pembagian yang sama dengan angka pengaman. Catatan yang lebih baru untuk material dan minggu yang sama menggantikan yang lebih lama.',
  'consumption.noWeeks':
    'Tidak ada material dengan antisipasi permintaan, jadi tidak ada pemakaian untuk dicatat.',
  'consumption.field.material': 'Material',
  'consumption.field.week': 'Minggu',
  'consumption.field.qty': 'Pemakaian ({{uom}})',
  'consumption.record.button': 'Catat pemakaian',
  'consumption.record.done': 'Pemakaian dicatat: {{material}}, {{week}}',
  'consumption.record.failed': 'Pemakaian tidak dapat dicatat',
  'consumption.record.inForce': 'Tercatat untuk minggu ini: {{qty}} {{uom}} ({{source}}).',
  'consumption.source.manual': 'diketik',
  'consumption.source.upload': 'diunggah',
  'consumption.source.sap': 'pengeluaran barang SAP',
  'consumption.upload.download': 'Unduh templat pemakaian',
  'consumption.upload.choose': 'Unggah berkas pemakaian',
  'consumption.upload.columns': 'CSV atau XLSX dengan kolom {{columns}}.',
  'consumption.upload.checking': 'Memeriksa berkas…',
  'consumption.upload.error.unreadable':
    'Berkas ini tidak dapat dibaca. Unggah templat pemakaian sebagai CSV atau XLSX.',
  'consumption.upload.error.notTemplate':
    'Ini bukan templat pemakaian: tidak ada kolom {{columns}}. Unduh templat lalu isi.',
  'consumption.upload.error.empty': 'Berkas tidak berisi pemakaian.',
  'consumption.upload.saved_other': '{{count}} minggu dicatat.',
  'consumption.upload.refusedRow': 'Baris {{row}} · {{material}}: {{reason}}',
  'consumption.upload.reason.unknownMaterial': 'bukan material di halaman ini',
  'consumption.upload.reason.notAWeek': 'minggu bukan tanggal',
  'consumption.upload.reason.futureWeek': 'minggu sesudah minggu ini',
  'consumption.upload.reason.notANumber': 'pemakaian bukan angka',
  'consumption.upload.reason.ambiguousNumber':
    'angka terbaca berbeda dalam bahasa Inggris dan Indonesia; tulis tanpa pemisah ribuan',
  'consumption.upload.reason.unitMismatch': 'satuan bukan satuan material',
  'consumption.upload.reason.duplicateRow': 'berkas punya baris lain untuk material dan minggu ini',
  'consumption.row.recordedTitle':
    '{{share}} dari {{material}} material, {{source}} pada {{date}} ({{id}})',
  'consumption.alert.detail':
    '{{qty}} {{uom}} dari pasokan di atas antisipasi permintaan selama {{from}} tidak dapat diserap pada {{by}}.'
};
