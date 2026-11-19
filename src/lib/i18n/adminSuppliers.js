// Administration · Suppliers i18n fragment. Namespace: adminSup.*
//
// Material A1 — MR-1 BR-02, AC-06: each supplier's stock update mode (API or
// manual), set by the Hub administrator, with who changed it and when.
// Business language only (SC-04). Indonesian plurals carry `_other` only.

/** @type {Record<string, string>} */
export const adminSuppliersEn = {
  'adminSup.crumb.administration': 'Administration',
  // BL-183 (owner ruling 2026-11-19) — the page title and its crumb read the
  // menu label (`hub.nav.util.suppliers`) verbatim; the menu label stays as is.
  'adminSup.crumb.page': 'Supplier stock update mode',
  'adminSup.title': 'Supplier stock update mode',
  'adminSup.subtitle':
    'How each supplier shares its stock with the hub: pulled from its own system, or entered by the supplier by template or by hand. The mode decides how often the stock must be updated and when it counts as out of date.',
  'adminSup.meta.count_one': '{{count}} supplier',
  'adminSup.meta.count_other': '{{count}} suppliers',
  'adminSup.meta.api_one': '{{count}} pulled from its system',
  'adminSup.meta.api_other': '{{count}} pulled from their systems',

  'adminSup.mode.api': 'From supplier system',
  'adminSup.mode.manual': 'Entered by supplier',

  'adminSup.form.title': 'Change a supplier’s stock update mode',
  'adminSup.form.intro':
    'Choose the supplier and how its stock reaches the hub. The change applies at once and is kept on record with who made it and when.',
  'adminSup.form.supplier': 'Supplier',
  'adminSup.form.choose': 'Choose a supplier…',
  'adminSup.form.mode': 'Stock update mode',
  'adminSup.form.reason': 'Reason (optional)',
  'adminSup.form.reasonPlaceholder': 'e.g. the supplier’s system connection is ready',
  'adminSup.form.current': 'Now: {{mode}}',
  'adminSup.form.attribution':
    'Recorded as not attributed to a named person: the hub cannot yet tell who is signed in.',
  'adminSup.form.submit': 'Save mode',
  'adminSup.form.cancel': 'Cancel',

  'adminSup.gate.title': 'Only the Hub administrator can change a supplier’s stock update mode',
  'adminSup.gate.body':
    'You can read every supplier’s mode and its history. Changing one belongs to the Hub administrator, because it decides the update deadline and the out-of-date rule the supplier is measured by.',

  'adminSup.list.title': 'Stock update mode by supplier',
  'adminSup.list.sample':
    'A supplier nobody has set yet follows the sample connection list: pulled from its system if it is on that list, entered by the supplier otherwise.',
  'adminSup.col.supplier': 'Supplier',
  'adminSup.col.source': 'Set by',
  'adminSup.col.lastChange': 'Last change',
  'adminSup.col.action': 'Action',
  'adminSup.source.overlay': 'Hub administrator',
  'adminSup.source.default': 'Sample connection list (not set yet)',
  'adminSup.action.change': 'Change',
  'adminSup.lastChange.none': 'Never changed',

  'adminSup.history.title': 'Changes on record',
  'adminSup.history.empty': 'No supplier’s mode has been changed yet.',
  'adminSup.history.col.supplier': 'Supplier',
  'adminSup.history.col.reason': 'Reason',
  'adminSup.history.col.by': 'Changed by',
  'adminSup.history.col.at': 'When',
  'adminSup.history.noReason': 'No reason given',
  'adminSup.history.by.unattributed': 'Not attributed (no named person in session)',

  'adminSup.toast.saved': '{{name}} now: {{mode}}',
  'adminSup.toast.refused': 'The mode was not changed: {{reason}}'
};

/** @type {Record<string, string>} */
export const adminSuppliersId = {
  'adminSup.crumb.administration': 'Administrasi',
  'adminSup.crumb.page': 'Cara pembaruan stok pemasok',
  'adminSup.title': 'Cara pembaruan stok pemasok',
  'adminSup.subtitle':
    'Cara setiap pemasok berbagi stoknya dengan hub: ditarik dari sistemnya sendiri, atau diisi pemasok lewat templat atau secara manual. Cara ini menentukan seberapa sering stok harus diperbarui dan kapan dianggap usang.',
  'adminSup.meta.count_other': '{{count}} pemasok',
  'adminSup.meta.api_other': '{{count}} ditarik dari sistemnya',

  'adminSup.mode.api': 'Dari sistem pemasok',
  'adminSup.mode.manual': 'Diisi pemasok',

  'adminSup.form.title': 'Ubah cara pembaruan stok pemasok',
  'adminSup.form.intro':
    'Pilih pemasok dan cara stoknya sampai ke hub. Perubahan langsung berlaku dan tercatat beserta siapa yang mengubah dan kapan.',
  'adminSup.form.supplier': 'Pemasok',
  'adminSup.form.choose': 'Pilih pemasok…',
  'adminSup.form.mode': 'Cara pembaruan stok',
  'adminSup.form.reason': 'Alasan (opsional)',
  'adminSup.form.reasonPlaceholder': 'mis. koneksi sistem pemasok sudah siap',
  'adminSup.form.current': 'Saat ini: {{mode}}',
  'adminSup.form.attribution':
    'Dicatat tanpa nama orang: hub belum dapat mengetahui siapa yang masuk.',
  'adminSup.form.submit': 'Simpan cara',
  'adminSup.form.cancel': 'Batal',

  'adminSup.gate.title': 'Hanya administrator hub yang dapat mengubah cara pembaruan stok pemasok',
  'adminSup.gate.body':
    'Anda dapat membaca cara setiap pemasok beserta riwayatnya. Mengubahnya adalah tugas administrator hub, karena cara ini menentukan tenggat pembaruan dan aturan data usang yang menjadi ukuran pemasok.',

  'adminSup.list.title': 'Cara pembaruan stok per pemasok',
  'adminSup.list.sample':
    'Pemasok yang belum pernah diatur mengikuti daftar koneksi contoh: ditarik dari sistemnya bila ada di daftar itu, diisi pemasok bila tidak.',
  'adminSup.col.supplier': 'Pemasok',
  'adminSup.col.source': 'Ditetapkan oleh',
  'adminSup.col.lastChange': 'Perubahan terakhir',
  'adminSup.col.action': 'Tindakan',
  'adminSup.source.overlay': 'Administrator hub',
  'adminSup.source.default': 'Daftar koneksi contoh (belum diatur)',
  'adminSup.action.change': 'Ubah',
  'adminSup.lastChange.none': 'Belum pernah diubah',

  'adminSup.history.title': 'Perubahan tercatat',
  'adminSup.history.empty': 'Belum ada cara pemasok yang diubah.',
  'adminSup.history.col.supplier': 'Pemasok',
  'adminSup.history.col.reason': 'Alasan',
  'adminSup.history.col.by': 'Diubah oleh',
  'adminSup.history.col.at': 'Kapan',
  'adminSup.history.noReason': 'Tanpa alasan',
  'adminSup.history.by.unattributed': 'Tanpa nama (tidak ada orang bernama dalam sesi)',

  'adminSup.toast.saved': '{{name}} sekarang: {{mode}}',
  'adminSup.toast.refused': 'Cara tidak diubah: {{reason}}'
};
