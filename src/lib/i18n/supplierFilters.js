// Supplier filters i18n fragment. Namespace: supFilter.*
//
// BL-52 — REQUIREMENTS REQ-E03-01 BR-05 (A-02 decided 2026-09-21): certificate
// validity, then performance band, then country, on the buyer supplier list and
// every invitee search. Business language only (SC-04). Indonesian plurals
// carry `_other` only.

/** @type {Record<string, string>} */
export const supplierFiltersEn = {
  'supFilter.group': 'More filters',
  'supFilter.cert.label': 'Certificates',
  'supFilter.cert.all': 'Any certificate state',
  'supFilter.cert.valid': 'Valid',
  'supFilter.cert.expiring': 'Expiring within {{days}} days',
  'supFilter.cert.expiredOrMissing': 'Expired or missing',
  'supFilter.cert.hint':
    'Halal and BPOM certificates on file. "Expired or missing" includes a certificate not yet verified, and a supplier with none on file.',
  'supFilter.band.label': 'Performance band',
  'supFilter.band.all': 'Any band',
  'supFilter.band.grade': 'Grade {{grade}}',
  'supFilter.band.noHistory': 'No history',
  'supFilter.country.label': 'Country',
  'supFilter.country.all': 'Any country',
  'supFilter.clear': 'Clear these filters',
  'supFilter.col.certificates': 'Certificates',
  'supFilter.col.band': 'Performance band',
  'supFilter.active': 'Also filtered by: {{filters}}'
};

/** @type {Record<string, string>} */
export const supplierFiltersId = {
  'supFilter.group': 'Filter lainnya',
  'supFilter.cert.label': 'Sertifikat',
  'supFilter.cert.all': 'Semua status sertifikat',
  'supFilter.cert.valid': 'Berlaku',
  'supFilter.cert.expiring': 'Berakhir dalam {{days}} hari',
  'supFilter.cert.expiredOrMissing': 'Kedaluwarsa atau tidak ada',
  'supFilter.cert.hint':
    'Sertifikat halal dan BPOM yang tercatat. "Kedaluwarsa atau tidak ada" mencakup sertifikat yang belum diverifikasi, dan pemasok yang tidak memiliki sertifikat tercatat.',
  'supFilter.band.label': 'Kelompok kinerja',
  'supFilter.band.all': 'Semua kelompok',
  'supFilter.band.grade': 'Peringkat {{grade}}',
  'supFilter.band.noHistory': 'Belum ada riwayat',
  'supFilter.country.label': 'Negara',
  'supFilter.country.all': 'Semua negara',
  'supFilter.clear': 'Hapus filter ini',
  'supFilter.col.certificates': 'Sertifikat',
  'supFilter.col.band': 'Kelompok kinerja',
  'supFilter.active': 'Juga difilter menurut: {{filters}}'
};
