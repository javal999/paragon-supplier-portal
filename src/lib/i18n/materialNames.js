// Supplier trade names i18n fragment. Namespace: matName.* — the supplier's
// "My materials" tab on the stock page, Materials → Trade names for Material
// Planning, and the approved name beside PTI's description on stock rows.
// matSearch.* (Material C3) — the one material search and its match reason.
//
// Material C2 — MR-3 BR-01 to BR-06. A trade name itself is data, never a key.
// Business language only (SC-04). Indonesian plurals carry `_other` only.

/** @type {Record<string, string>} */
export const materialNamesEn = {
  'matName.tab.stock': 'Stock',
  'matName.tab.myMaterials': 'My materials',
  'matName.beside': 'Your name: {{name}}',
  'matName.besideSupplier': "Supplier's name: {{name}}",

  // Material C3 — the one material search (MR-3 BR-04).
  'matSearch.placeholder': 'Search code, description or trade name',
  'matSearch.label': 'Search materials by code, description or trade name',
  'matSearch.reason.code': 'matched code',
  'matSearch.reason.description': 'matched description',
  'matSearch.reason.tradeName': "matched trade name '{{name}}' ({{supplier}})",
  'matSearch.reason.ownTradeName': "matched your trade name '{{name}}'",
  'matSearch.noMatch': 'No material matches "{{query}}"',
  'matName.loading': 'Loading your materials…',

  'matName.state.awaiting': 'Awaiting approval',
  'matName.state.approved': 'Approved',
  'matName.state.rejected': 'Rejected',
  'matName.state.replaced': 'Replaced',
  'matName.state.none': 'No name yet',

  'matName.refusal.NOT_ASSIGNED': 'This material is not assigned to this supplier.',
  'matName.refusal.NAME_LENGTH': 'A trade name must be 2 to 80 characters.',
  'matName.refusal.SUPPLIER_NO_LENGTH': 'Your material number can be at most 40 characters.',
  'matName.refusal.REASON_REQUIRED': 'Give a reason for the rejection. The supplier sees it.',

  'matName.sup.intro':
    'The PTI materials assigned to you. Enter the name you use for each one, and your own material number if you like. Material Planning approves each name; once approved, it shows beside PTI’s description.',
  'matName.sup.empty': 'No materials are assigned to you yet.',
  'matName.none': 'No name yet',
  'matName.newName': 'New name awaiting approval: {{name}}',
  'matName.submittedName': 'Your name: {{name}}',
  'matName.rejectedBecause': 'Rejected: {{reason}}',

  'matName.col.material': 'PTI material',
  'matName.col.tradeName': 'Trade name',
  'matName.col.supplierNo': 'Supplier material no.',
  'matName.col.state': 'Status',
  'matName.col.action': 'Action',
  'matName.col.supplier': 'Supplier',
  'matName.col.submitted': 'Submitted',

  'matName.action.enter': 'Enter name',
  'matName.action.change': 'Change name',
  'matName.action.approve': 'Approve',
  'matName.action.reject': 'Reject',

  'matName.form.title': 'Your trade name for',
  'matName.form.pti': 'PTI description: {{label}}',
  'matName.form.tradeName': 'Trade name',
  'matName.form.supplierNo': 'Your material number (optional)',
  'matName.form.note':
    'The name goes to Material Planning for approval. A name already approved stays in use until the new one is approved.',
  'matName.form.submit': 'Submit for approval',
  'matName.form.cancel': 'Cancel',

  'matName.toast.submitted': 'Trade name for {{code}} sent for approval',
  'matName.toast.approved': '"{{name}}" approved',
  'matName.toast.rejected': '"{{name}}" rejected',
  'matName.toast.refused': 'Not saved: {{reason}}',

  'matName.pti.crumb': 'Trade names',
  'matName.pti.title': 'Supplier trade names',
  'matName.pti.subtitle':
    'The names suppliers use for PTI materials. Approve a name and it shows beside PTI’s description for that supplier; each supplier has at most one approved name per material. A rejection needs a reason, which the supplier sees.',
  'matName.pti.meta_one': '{{count}} name on record',
  'matName.pti.meta_other': '{{count}} names on record',
  'matName.pti.empty': 'No trade names in this view.',
  'matName.filter.all': 'All',
  'matName.loadedByPti': 'Loaded by PTI',

  'matName.reject.reason': 'Reason for rejecting the name for {{code}}',
  'matName.reject.placeholder': 'Why is this name not accepted? The supplier sees this.',
  'matName.reject.confirm': 'Reject name',

  'matName.load.title': 'Load approved names',
  'matName.load.intro':
    'Choose or paste a CSV with four columns: PTI code, supplier ID, trade name, supplier material number (optional). Names are approved on load and marked "Loaded by PTI". A row that matches the approved name changes nothing.',
  'matName.load.file': 'CSV file of trade names',
  'matName.load.paste': 'Trade names as CSV',
  'matName.load.placeholder': 'PK-PETB-8810,sup-007,ClearForm PET 100,SPP-PB-100',
  'matName.load.count_one': '{{count}} row ready',
  'matName.load.count_other': '{{count}} rows ready',
  'matName.load.badLines': 'lines skipped (need 3 or 4 columns): {{lines}}',
  'matName.load.run': 'Load names',
  'matName.load.summary': '{{done}} loaded, {{unchanged}} unchanged, {{failed}} refused',
  'matName.load.lineRefused': 'Line {{line}}: {{reason}}',
  'matName.load.otherRefusal': 'refused ({{reason}})'
};

/** @type {Record<string, string>} */
export const materialNamesId = {
  'matName.tab.stock': 'Stok',
  'matName.tab.myMaterials': 'Material saya',
  'matName.beside': 'Nama Anda: {{name}}',
  'matName.besideSupplier': 'Nama pemasok: {{name}}',

  // Material C3 — pencarian material tunggal (MR-3 BR-04).
  'matSearch.placeholder': 'Cari kode, deskripsi, atau nama dagang',
  'matSearch.label': 'Cari material berdasarkan kode, deskripsi, atau nama dagang',
  'matSearch.reason.code': 'cocok dengan kode',
  'matSearch.reason.description': 'cocok dengan deskripsi',
  'matSearch.reason.tradeName': "cocok dengan nama dagang '{{name}}' ({{supplier}})",
  'matSearch.reason.ownTradeName': "cocok dengan nama dagang Anda '{{name}}'",
  'matSearch.noMatch': 'Tidak ada material yang cocok dengan "{{query}}"',
  'matName.loading': 'Memuat material Anda…',

  'matName.state.awaiting': 'Menunggu persetujuan',
  'matName.state.approved': 'Disetujui',
  'matName.state.rejected': 'Ditolak',
  'matName.state.replaced': 'Digantikan',
  'matName.state.none': 'Belum ada nama',

  'matName.refusal.NOT_ASSIGNED': 'Material ini tidak ditugaskan kepada pemasok ini.',
  'matName.refusal.NAME_LENGTH': 'Nama dagang harus 2 sampai 80 karakter.',
  'matName.refusal.SUPPLIER_NO_LENGTH': 'Nomor material Anda paling banyak 40 karakter.',
  'matName.refusal.REASON_REQUIRED': 'Berikan alasan penolakan. Pemasok akan melihatnya.',

  'matName.sup.intro':
    'Material PTI yang ditugaskan kepada Anda. Isi nama yang Anda pakai untuk setiap material, dan nomor material Anda bila perlu. Material Planning menyetujui setiap nama; setelah disetujui, nama itu tampil di samping deskripsi PTI.',
  'matName.sup.empty': 'Belum ada material yang ditugaskan kepada Anda.',
  'matName.none': 'Belum ada nama',
  'matName.newName': 'Nama baru menunggu persetujuan: {{name}}',
  'matName.submittedName': 'Nama Anda: {{name}}',
  'matName.rejectedBecause': 'Ditolak: {{reason}}',

  'matName.col.material': 'Material PTI',
  'matName.col.tradeName': 'Nama dagang',
  'matName.col.supplierNo': 'No. material pemasok',
  'matName.col.state': 'Status',
  'matName.col.action': 'Tindakan',
  'matName.col.supplier': 'Pemasok',
  'matName.col.submitted': 'Diajukan',

  'matName.action.enter': 'Isi nama',
  'matName.action.change': 'Ubah nama',
  'matName.action.approve': 'Setujui',
  'matName.action.reject': 'Tolak',

  'matName.form.title': 'Nama dagang Anda untuk',
  'matName.form.pti': 'Deskripsi PTI: {{label}}',
  'matName.form.tradeName': 'Nama dagang',
  'matName.form.supplierNo': 'Nomor material Anda (opsional)',
  'matName.form.note':
    'Nama ini dikirim ke Material Planning untuk disetujui. Nama yang sudah disetujui tetap dipakai sampai nama baru disetujui.',
  'matName.form.submit': 'Ajukan untuk persetujuan',
  'matName.form.cancel': 'Batal',

  'matName.toast.submitted': 'Nama dagang untuk {{code}} dikirim untuk persetujuan',
  'matName.toast.approved': '"{{name}}" disetujui',
  'matName.toast.rejected': '"{{name}}" ditolak',
  'matName.toast.refused': 'Tidak tersimpan: {{reason}}',

  'matName.pti.crumb': 'Nama dagang',
  'matName.pti.title': 'Nama dagang pemasok',
  'matName.pti.subtitle':
    'Nama yang dipakai pemasok untuk material PTI. Setujui sebuah nama dan nama itu tampil di samping deskripsi PTI untuk pemasok tersebut; setiap pemasok memiliki paling banyak satu nama yang disetujui per material. Penolakan memerlukan alasan, yang dilihat pemasok.',
  'matName.pti.meta_other': '{{count}} nama tercatat',
  'matName.pti.empty': 'Tidak ada nama dagang pada tampilan ini.',
  'matName.filter.all': 'Semua',
  'matName.loadedByPti': 'Dimuat oleh PTI',

  'matName.reject.reason': 'Alasan menolak nama untuk {{code}}',
  'matName.reject.placeholder': 'Mengapa nama ini tidak diterima? Pemasok akan melihatnya.',
  'matName.reject.confirm': 'Tolak nama',

  'matName.load.title': 'Muat nama yang disetujui',
  'matName.load.intro':
    'Pilih atau tempel CSV dengan empat kolom: kode PTI, ID pemasok, nama dagang, nomor material pemasok (opsional). Nama langsung disetujui dan ditandai "Dimuat oleh PTI". Baris yang sama dengan nama yang disetujui tidak mengubah apa pun.',
  'matName.load.file': 'Berkas CSV nama dagang',
  'matName.load.paste': 'Nama dagang dalam CSV',
  'matName.load.placeholder': 'PK-PETB-8810,sup-007,ClearForm PET 100,SPP-PB-100',
  'matName.load.count_other': '{{count}} baris siap',
  'matName.load.badLines': 'baris dilewati (perlu 3 atau 4 kolom): {{lines}}',
  'matName.load.run': 'Muat nama',
  'matName.load.summary': '{{done}} dimuat, {{unchanged}} tidak berubah, {{failed}} ditolak',
  'matName.load.lineRefused': 'Baris {{line}}: {{reason}}',
  'matName.load.otherRefusal': 'ditolak ({{reason}})'
};
