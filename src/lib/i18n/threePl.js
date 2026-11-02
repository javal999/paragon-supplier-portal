// 3PL tracking link i18n fragment. Namespace: tpl.*
//
// BL-51 — REQUIREMENTS REQ-E07-04 BR-05 (D-03 decided 2026-09-21): the ASN
// names its 3PL, and the tracking number links to the 3PL's public tracking
// page. The hub never reads a status from that page. Business language only
// (SC-04). Indonesian plurals carry `_other` only.

/** @type {Record<string, string>} */
export const threePlEn = {
  // The link on every ASN surface
  'tpl.link.title': 'Open the tracking page of {{name}} in a new tab',
  'tpl.link.newTab': '(opens the tracking page of {{name}} in a new tab)',
  'tpl.col.tracking': 'Tracking',

  // The ASN form
  'tpl.form.threePl': '3PL',
  'tpl.form.choose': 'Choose a 3PL…',
  'tpl.form.other': 'Another carrier (enter the name)',
  'tpl.form.otherName': 'Carrier name',
  'tpl.form.linkHint': 'The tracking number will link to this 3PL’s public tracking page.',
  'tpl.form.noLinkHint':
    'A carrier that is not on the 3PL list shows its tracking number without a link.',

  // The administration page
  'tpl.crumb.administration': 'Administration',
  'tpl.crumb.page': '3PL tracking links',
  'tpl.title': '3PL tracking links',
  'tpl.subtitle':
    'The logistics providers a supplier can name on an ASN, and the public page each one’s tracking numbers open. The hub only links to that page; it never reads a status from it.',
  'tpl.meta.count_one': '{{count}} 3PL on the list',
  'tpl.meta.count_other': '{{count}} 3PLs on the list',
  'tpl.meta.offered_one': '{{count}} offered on new ASNs',
  'tpl.meta.offered_other': '{{count}} offered on new ASNs',
  'tpl.list.title': 'The list',
  'tpl.col.name': '3PL',
  'tpl.col.pattern': 'Public tracking address',
  'tpl.col.try': 'Example link',
  'tpl.col.action': 'Change',
  'tpl.offered.yes': 'Offered',
  'tpl.offered.no': 'Not offered',
  'tpl.offered.noHint': 'ASNs that already name it keep their link.',
  'tpl.action.edit': 'Edit',
  'tpl.example.number': 'SAMPLE123',
  'tpl.form.title.add': 'Add a 3PL',
  'tpl.form.title.edit': 'Change {{name}}',
  'tpl.form.intro':
    'Write the tracking address with {tracking} where the tracking number goes. It must start with https://. The tracking number is inserted exactly as the supplier typed it and cannot change the rest of the address.',
  'tpl.form.name': 'Name',
  'tpl.form.pattern': 'Public tracking address',
  'tpl.form.patternPlaceholder': 'https://tracking.example.com/{tracking}',
  'tpl.form.offered': 'Offer on new ASNs',
  'tpl.form.preview': 'Example: {{url}}',
  'tpl.form.submit.add': 'Add 3PL',
  'tpl.form.submit.edit': 'Save changes',
  'tpl.form.cancel': 'Cancel',
  'tpl.form.attribution':
    'Recorded as not attributed to a named person: this hub cannot yet identify who is signed in.',
  'tpl.gate.title': 'Only the hub administrator changes this list',
  'tpl.gate.body':
    'You can read the list and try every link. Adding or changing a 3PL is the hub administrator’s act.',
  'tpl.history.title': 'Changes on record',
  'tpl.history.empty': 'No changes yet. The list is the sample list.',
  'tpl.history.col.threePl': '3PL',
  'tpl.history.col.change': 'Recorded as',
  'tpl.history.col.by': 'By',
  'tpl.history.col.at': 'When',
  'tpl.history.by.unattributed': 'Not attributed',
  'tpl.toast.added': '{{name}} added to the 3PL list',
  'tpl.toast.saved': '{{name}} saved',
  'tpl.toast.refused': 'Not saved: {{reason}}',
  'tpl.sample.note':
    'The 3PLs and their addresses are illustrative; the addresses cannot be opened.'
};

/** @type {Record<string, string>} */
export const threePlId = {
  'tpl.link.title': 'Buka halaman pelacakan {{name}} di tab baru',
  'tpl.link.newTab': '(membuka halaman pelacakan {{name}} di tab baru)',
  'tpl.col.tracking': 'Pelacakan',

  'tpl.form.threePl': '3PL',
  'tpl.form.choose': 'Pilih 3PL…',
  'tpl.form.other': 'Pengangkut lain (isi namanya)',
  'tpl.form.otherName': 'Nama pengangkut',
  'tpl.form.linkHint': 'Nomor pelacakan akan menaut ke halaman pelacakan publik 3PL ini.',
  'tpl.form.noLinkHint':
    'Pengangkut yang tidak ada di daftar 3PL menampilkan nomor pelacakannya tanpa tautan.',

  'tpl.crumb.administration': 'Administrasi',
  'tpl.crumb.page': 'Tautan pelacakan 3PL',
  'tpl.title': 'Tautan pelacakan 3PL',
  'tpl.subtitle':
    'Penyedia logistik yang dapat disebut pemasok pada ASN, dan halaman publik yang dibuka oleh nomor pelacakan masing-masing. Hub hanya menautkan ke halaman itu; hub tidak pernah membaca status darinya.',
  'tpl.meta.count_other': '{{count}} 3PL dalam daftar',
  'tpl.meta.offered_other': '{{count}} ditawarkan pada ASN baru',
  'tpl.list.title': 'Daftar',
  'tpl.col.name': '3PL',
  'tpl.col.pattern': 'Alamat pelacakan publik',
  'tpl.col.try': 'Contoh tautan',
  'tpl.col.action': 'Ubah',
  'tpl.offered.yes': 'Ditawarkan',
  'tpl.offered.no': 'Tidak ditawarkan',
  'tpl.offered.noHint': 'ASN yang sudah menyebutnya tetap memiliki tautan.',
  'tpl.action.edit': 'Ubah',
  'tpl.example.number': 'SAMPLE123',
  'tpl.form.title.add': 'Tambah 3PL',
  'tpl.form.title.edit': 'Ubah {{name}}',
  'tpl.form.intro':
    'Tulis alamat pelacakan dengan {tracking} di tempat nomor pelacakan. Alamat harus diawali https://. Nomor pelacakan dimasukkan persis seperti yang diketik pemasok dan tidak dapat mengubah bagian lain dari alamat.',
  'tpl.form.name': 'Nama',
  'tpl.form.pattern': 'Alamat pelacakan publik',
  'tpl.form.patternPlaceholder': 'https://tracking.example.com/{tracking}',
  'tpl.form.offered': 'Tawarkan pada ASN baru',
  'tpl.form.preview': 'Contoh: {{url}}',
  'tpl.form.submit.add': 'Tambah 3PL',
  'tpl.form.submit.edit': 'Simpan perubahan',
  'tpl.form.cancel': 'Batal',
  'tpl.form.attribution':
    'Dicatat tanpa nama orang: hub ini belum dapat mengenali siapa yang masuk.',
  'tpl.gate.title': 'Hanya administrator hub yang mengubah daftar ini',
  'tpl.gate.body':
    'Anda dapat membaca daftar dan mencoba setiap tautan. Menambah atau mengubah 3PL adalah tindakan administrator hub.',
  'tpl.history.title': 'Perubahan yang tercatat',
  'tpl.history.empty': 'Belum ada perubahan. Daftar ini adalah daftar contoh.',
  'tpl.history.col.threePl': '3PL',
  'tpl.history.col.change': 'Dicatat sebagai',
  'tpl.history.col.by': 'Oleh',
  'tpl.history.col.at': 'Waktu',
  'tpl.history.by.unattributed': 'Tanpa nama',
  'tpl.toast.added': '{{name}} ditambahkan ke daftar 3PL',
  'tpl.toast.saved': '{{name}} disimpan',
  'tpl.toast.refused': 'Tidak disimpan: {{reason}}',
  'tpl.sample.note': '3PL dan alamatnya bersifat ilustratif; alamat tersebut tidak dapat dibuka.'
};
