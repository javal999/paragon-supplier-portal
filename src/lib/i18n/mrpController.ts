// MRP controller (PIC) i18n fragment. Namespaces: pic.* (the column, filter and
// seat choice on material surfaces) and mrpc.* (Administration → MRP controllers).
//
// Material C4 — MR-5 BR-01 to BR-04: who handles each material in planning,
// shown on inventory, alerts, call-offs and the ASN line; suppliers see the
// name, never the code. Business language only (SC-04). Indonesian plurals
// carry `_other` only.

export const mrpControllerEn: Record<string, string> = {
  'pic.col': 'PIC',
  'pic.filter.label': 'PIC',
  'pic.filter.all': 'All PICs',
  'pic.filter.mine': 'My materials ({{code}})',
  'pic.filter.mineUnset': 'My materials (choose your code first)',
  'pic.filter.mineUnsetHint': 'Choose your MRP controller code in your profile menu to use My materials.',
  'pic.filter.empty': 'No agreement lines for this PIC.',
  'pic.seat.title': 'My MRP controller code',
  'pic.seat.none': 'None',
  'pic.seat.hint': 'Used by the My materials filter. It does not change what you are allowed to do.',

  'mrpc.crumb.administration': 'Administration',
  'mrpc.crumb.page': 'MRP controllers',
  'mrpc.title': 'MRP controllers (PIC)',
  'mrpc.subtitle':
    'SAP gives each material an MRP controller code. Here the hub keeps who that code is: a name suppliers can ask for, and the hub users behind it. A code with no mapping shows as the code only.',
  'mrpc.meta.count_one': '{{count}} code',
  'mrpc.meta.count_other': '{{count}} codes',
  'mrpc.meta.mapped_one': '{{count}} mapped',
  'mrpc.meta.mapped_other': '{{count}} mapped',

  'mrpc.form.title': 'Map an MRP controller code',
  'mrpc.form.intro':
    'Enter the SAP code, the name suppliers will see, and one or more hub users, one per line. The change applies at once and is kept on record with who made it and when.',
  'mrpc.form.code': 'MRP controller code',
  'mrpc.form.codePlaceholder': 'e.g. P12',
  'mrpc.form.name': 'Name shown to suppliers',
  'mrpc.form.namePlaceholder': 'e.g. Packaging planning desk',
  'mrpc.form.users': 'Hub users (one per line)',
  'mrpc.form.usersPlaceholder': 'e.g. Material Planner, packaging',
  'mrpc.form.supplierSees': 'Suppliers see the name only, never the code.',
  'mrpc.form.attribution':
    'Recorded as not attributed: the portal has no named person in session yet.',
  'mrpc.form.submit': 'Save mapping',
  'mrpc.form.cancel': 'Cancel',

  'mrpc.gate.title': 'Only the Hub administrator maps MRP controller codes',
  'mrpc.gate.body': 'You can read every code and its mapping here.',

  'mrpc.list.title': 'Codes',
  'mrpc.list.note':
    'Every code a material carries, and every code on the list. The codes are copied from SAP; the names are sample data.',
  'mrpc.col.code': 'Code',
  'mrpc.col.name': 'Name',
  'mrpc.col.users': 'Hub users',
  'mrpc.col.action': 'Action',
  'mrpc.unmapped': 'Not mapped (code only)',
  'mrpc.action.edit': 'Change',
  'mrpc.action.map': 'Map',

  'mrpc.history.title': 'Changes on record',
  'mrpc.history.empty': 'No changes yet. The list is the sample list.',
  'mrpc.history.col.change': 'Mapping',
  'mrpc.history.col.by': 'By',
  'mrpc.history.col.at': 'When',
  'mrpc.history.by.unattributed': 'Not attributed (no named person in session)',

  'mrpc.toast.saved': 'Mapping saved for {{code}}',
  'mrpc.toast.refused': 'Not saved: {{reason}}',
};

export const mrpControllerId: Record<string, string> = {
  'pic.col': 'PIC',
  'pic.filter.label': 'PIC',
  'pic.filter.all': 'Semua PIC',
  'pic.filter.mine': 'Material saya ({{code}})',
  'pic.filter.mineUnset': 'Material saya (pilih kode Anda dahulu)',
  'pic.filter.mineUnsetHint': 'Pilih kode MRP controller Anda di menu profil untuk memakai Material saya.',
  'pic.filter.empty': 'Tidak ada baris perjanjian untuk PIC ini.',
  'pic.seat.title': 'Kode MRP controller saya',
  'pic.seat.none': 'Tidak ada',
  'pic.seat.hint': 'Dipakai oleh filter Material saya. Tidak mengubah apa yang boleh Anda lakukan.',

  'mrpc.crumb.administration': 'Administrasi',
  'mrpc.crumb.page': 'MRP controller',
  'mrpc.title': 'MRP controller (PIC)',
  'mrpc.subtitle':
    'SAP memberi setiap material kode MRP controller. Di sini hub menyimpan siapa pemilik kode itu: nama yang dapat dihubungi pemasok, dan pengguna hub di baliknya. Kode tanpa pemetaan tampil sebagai kodenya saja.',
  'mrpc.meta.count_other': '{{count}} kode',
  'mrpc.meta.mapped_other': '{{count}} terpetakan',

  'mrpc.form.title': 'Petakan kode MRP controller',
  'mrpc.form.intro':
    'Isi kode SAP, nama yang akan dilihat pemasok, dan satu atau lebih pengguna hub, satu per baris. Perubahan langsung berlaku dan tercatat beserta siapa dan kapan.',
  'mrpc.form.code': 'Kode MRP controller',
  'mrpc.form.codePlaceholder': 'mis. P12',
  'mrpc.form.name': 'Nama yang dilihat pemasok',
  'mrpc.form.namePlaceholder': 'mis. Meja perencanaan kemasan',
  'mrpc.form.users': 'Pengguna hub (satu per baris)',
  'mrpc.form.usersPlaceholder': 'mis. Material Planner, kemasan',
  'mrpc.form.supplierSees': 'Pemasok hanya melihat nama, tidak pernah kodenya.',
  'mrpc.form.attribution':
    'Dicatat tanpa nama: portal belum memiliki orang bernama dalam sesi.',
  'mrpc.form.submit': 'Simpan pemetaan',
  'mrpc.form.cancel': 'Batal',

  'mrpc.gate.title': 'Hanya administrator hub yang memetakan kode MRP controller',
  'mrpc.gate.body': 'Anda dapat membaca setiap kode dan pemetaannya di sini.',

  'mrpc.list.title': 'Kode',
  'mrpc.list.note':
    'Setiap kode yang dibawa material, dan setiap kode di daftar. Kode disalin dari SAP; namanya adalah data contoh.',
  'mrpc.col.code': 'Kode',
  'mrpc.col.name': 'Nama',
  'mrpc.col.users': 'Pengguna hub',
  'mrpc.col.action': 'Tindakan',
  'mrpc.unmapped': 'Belum dipetakan (kode saja)',
  'mrpc.action.edit': 'Ubah',
  'mrpc.action.map': 'Petakan',

  'mrpc.history.title': 'Perubahan tercatat',
  'mrpc.history.empty': 'Belum ada perubahan. Daftar ini adalah daftar contoh.',
  'mrpc.history.col.change': 'Pemetaan',
  'mrpc.history.col.by': 'Oleh',
  'mrpc.history.col.at': 'Kapan',
  'mrpc.history.by.unattributed': 'Tanpa nama (tidak ada orang bernama dalam sesi)',

  'mrpc.toast.saved': 'Pemetaan disimpan untuk {{code}}',
  'mrpc.toast.refused': 'Tidak disimpan: {{reason}}',
};
