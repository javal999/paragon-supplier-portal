// LTP vs finished-goods demand i18n fragment (DRC-18, BL-203). Namespace: ltpFg.*
//
// The three read-only rows on the Demand anticipation grid. "FG" is the
// planners' own abbreviation for finished goods and is kept in both languages.
// Quantities are mono data, rendered through <Data>, never keyed.

/** @type {Record<string, string>} */
export const ltpFgDemandEn = {
  'ltpFg.row.fgDemand': 'FG demand',
  'ltpFg.row.ltpLessFg': 'LTP − FG demand',
  'ltpFg.row.consumptionAverage': 'Consumption, {{weeks}}-week average',
  'ltpFg.notAvailable': 'FG demand not available',
  'ltpFg.provisional': 'Provisional: rule awaiting Material Planning ({{question}})',
  'ltpFg.fgTitle':
    'Material gross requirement {{material}} (finished-goods plan and sales orders through the bill of materials, simulated engine data) × supplier share {{share}}',
  'ltpFg.partial': 'Averages {{count}} of {{weeks}} weeks: only those have consumption recorded',
  'ltpFg.noRecords': 'No consumption recorded in the last {{weeks}} weeks',
  'ltpFg.averageTitle':
    'Material average {{material}} over {{count}} recorded weeks up to {{end}} × supplier share {{share}}'
};

/** @type {Record<string, string>} */
export const ltpFgDemandId = {
  'ltpFg.row.fgDemand': 'Permintaan FG',
  'ltpFg.row.ltpLessFg': 'LTP − permintaan FG',
  'ltpFg.row.consumptionAverage': 'Konsumsi, rata-rata {{weeks}} minggu',
  'ltpFg.notAvailable': 'Permintaan FG tidak tersedia',
  'ltpFg.provisional': 'Sementara: aturan menunggu Material Planning ({{question}})',
  'ltpFg.fgTitle':
    'Kebutuhan kotor material {{material}} (rencana barang jadi dan pesanan penjualan melalui BOM, data mesin simulasi) × porsi pemasok {{share}}',
  'ltpFg.partial':
    'Rata-rata {{count}} dari {{weeks}} minggu: hanya minggu itu yang konsumsinya tercatat',
  'ltpFg.noRecords': 'Tidak ada konsumsi tercatat dalam {{weeks}} minggu terakhir',
  'ltpFg.averageTitle':
    'Rata-rata material {{material}} selama {{count}} minggu tercatat sampai {{end}} × porsi pemasok {{share}}'
};
