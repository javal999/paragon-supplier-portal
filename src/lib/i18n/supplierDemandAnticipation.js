// Supplier demand anticipation i18n fragment (BL-204, DRC-1). Namespace: supDa.*
//
// The supplier's read-only view of its own published demand anticipation,
// built ahead and switched off (DRC-D10, `SUPPLIER_DA_VIEW_ENABLED`). The grid
// rows reuse the planner page's `demandAnt.row.*` labels, so both pages name
// the same figures the same way; the Provisional label reuses `ltpFg.provisional`.
// On screen the figure is never "DA" (CAP-D10). Figures and dates are mono
// data, rendered through <Data>, never keyed.

/** @type {Record<string, string>} */
export const supplierDemandAnticipationEn = {
  'supDa.subtitle':
    'What PTI published as demand anticipation for your materials, per week over the lead time. Read only.',
  'supDa.asOf': 'As of',
  'supDa.off.title': 'Not available yet',
  'supDa.off.body':
    'Demand anticipation will be shown here once Material Planning confirms the rules it is calculated by.',
  'supDa.card.published': 'Published for planning week {{week}} on {{date}}',
  'supDa.card.total': 'Total',
  'supDa.empty.title': 'No demand anticipation published for you',
  'supDa.empty.body': 'PTI has not published demand anticipation for any of your materials yet.'
};

/** @type {Record<string, string>} */
export const supplierDemandAnticipationId = {
  'supDa.subtitle':
    'Antisipasi permintaan yang diterbitkan PTI untuk material Anda, per minggu selama lead time. Hanya baca.',
  'supDa.asOf': 'Per',
  'supDa.off.title': 'Belum tersedia',
  'supDa.off.body':
    'Antisipasi permintaan akan ditampilkan di sini setelah Material Planning mengonfirmasi aturan perhitungannya.',
  'supDa.card.published': 'Diterbitkan untuk minggu perencanaan {{week}} pada {{date}}',
  'supDa.card.total': 'Total',
  'supDa.empty.title': 'Belum ada antisipasi permintaan yang diterbitkan untuk Anda',
  'supDa.empty.body': 'PTI belum menerbitkan antisipasi permintaan untuk material Anda.'
};
