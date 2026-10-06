// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · REASON CODES (BL-32, §3.6 starter lists). Namespace: adminRsn.*
// Plurals: none — every count is shown as "label: {{count}}".
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
export const adminReasonsEn = {
  'adminRsn.crumb': 'Reason codes',
  'adminRsn.title': 'Reason codes',
  'adminRsn.subtitle':
    'The reasons a supplier chooses from when it adjusts or rejects a purchase order, or commits below forecast or demand, and the reasons a planner gives when closing an alert or overriding the demand forecast. Add a code, rename it, or retire it. A code is never deleted, so an old answer keeps its label.',
  'adminRsn.meta.offered': 'Offered: {{count}}',
  'adminRsn.meta.retired': 'Retired: {{count}}',
  'adminRsn.meta.freeText':
    'Call-off rejections and changes, and goods-receipt disputes, take a written reason rather than a code, so they have no list here.',

  'adminRsn.list.poAdjust': 'Purchase order — adjust a line',
  'adminRsn.list.poAdjust.hint':
    'REQ-E07-02 · the reason for a counter-offer. "Other" needs a note.',
  'adminRsn.list.poReject': 'Purchase order — reject',
  'adminRsn.list.poReject.hint':
    'REQ-E07-02 BR-06 · what the rejection is about. At least one is required.',
  'adminRsn.list.capacityShortfall': 'Capacity below demand',
  'adminRsn.list.capacityShortfall.hint':
    'REQ-E08-04 · why allocated capacity is below demand in a week. "Other" needs a note.',
  'adminRsn.list.commitmentShortfall': 'Commitment below forecast',
  'adminRsn.list.commitmentShortfall.hint':
    'REQ-E06-02 · why a commitment is below the forecast. "Other" needs a note.',
  'adminRsn.list.alertClose': 'Alert — close',
  'adminRsn.list.alertClose.hint':
    'MR-9 BR-04 · why a planner closes a stock alert. "Other" needs a note.',
  'adminRsn.list.forecastOverride': 'Demand forecast — override',
  'adminRsn.list.forecastOverride.hint':
    'REQ-E14-11 · why a Material Planning team member overrides the demand forecast. Required when the override raises it. "Other" needs a note.',

  'adminRsn.col.code': 'Code',
  'adminRsn.col.labelEn': 'English label',
  'adminRsn.col.labelId': 'Indonesian label',
  'adminRsn.col.status': 'Status',
  'adminRsn.col.source': 'Source',
  'adminRsn.col.action': 'Action',
  'adminRsn.status.offered': 'Offered',
  'adminRsn.status.retired': 'Retired',
  'adminRsn.source.starter': 'Starter list',
  'adminRsn.source.renamed': 'Starter list, renamed',
  'adminRsn.source.added': 'Added by the administrator',
  'adminRsn.action.rename': 'Rename',
  'adminRsn.action.retire': 'Retire',
  'adminRsn.action.offer': 'Offer again',
  'adminRsn.retiredLabel': '{{label}} (retired)',

  'adminRsn.form.title': 'Add or change a reason code',
  'adminRsn.form.intro':
    'Both labels are required. A retired code stays on the list and on every answer that already carries it; it is only no longer offered. The last offered code of a list cannot be retired.',
  'adminRsn.form.list': 'List',
  'adminRsn.form.code': 'Code',
  'adminRsn.form.newCode': 'New code',
  'adminRsn.form.codeHint':
    'A new code is made from the English label. It never changes once recorded.',
  'adminRsn.form.labelEn': 'English label',
  'adminRsn.form.labelId': 'Indonesian label',
  'adminRsn.form.active': 'Offered on new answers',
  'adminRsn.form.submit': 'Record',
  'adminRsn.form.cancel': 'Cancel',
  'adminRsn.form.attribution':
    'Kept in this browser and survives a reload; not shared with anyone and not stored on a server. Recorded as done by a person the platform cannot name yet, because no user directory is connected.',
  'adminRsn.toast.saved': '{{label}} ({{code}}) recorded.',
  'adminRsn.toast.refused': 'Refused: {{reason}}',

  'adminRsn.history.title': 'Changes on record',
  'adminRsn.history.empty': 'No changes yet. Every list is the starter list.',
  'adminRsn.history.col.code': 'Code',
  'adminRsn.history.col.change': 'Old → new',
  'adminRsn.history.col.by': 'By',
  'adminRsn.history.col.at': 'Recorded',
  'adminRsn.history.added': 'added',
  'adminRsn.by.unattributed': 'Not attributed (no user directory)',

  'adminRsn.gate.title': 'Changing the reason lists',
  'adminRsn.gate.body':
    'The lists are what a supplier must choose from and what a planner judges, so only the Hub administrator and Compliance can change them. You can read them.',

  'adminRsn.store.unreadableTitle': 'Saved changes could not be read',
  'adminRsn.store.unreadableBody':
    'This browser holds reason-code data that cannot be parsed, so no saved changes were loaded and every list shows its starter codes. That is not the same as having none. Recording a change will replace the unreadable data.',
  'adminRsn.store.rejectedTitle': 'Some saved changes were not loaded',
  'adminRsn.store.rejectedBody':
    'Saved changes are checked again when they are read, in order, by the same rules that checked them when they were made. These were refused:'
};

/** @type {Record<string, string>} */
export const adminReasonsId = {
  'adminRsn.crumb': 'Kode alasan',
  'adminRsn.title': 'Kode alasan',
  'adminRsn.subtitle':
    'Alasan yang dipilih pemasok saat menyesuaikan atau menolak pesanan pembelian, atau berkomitmen di bawah prakiraan atau kebutuhan, serta alasan yang diberikan perencana saat menutup peringatan atau menyesuaikan prakiraan permintaan. Tambahkan kode, ganti namanya, atau hentikan. Kode tidak pernah dihapus, sehingga jawaban lama tetap berlabel.',
  'adminRsn.meta.offered': 'Ditawarkan: {{count}}',
  'adminRsn.meta.retired': 'Dihentikan: {{count}}',
  'adminRsn.meta.freeText':
    'Penolakan dan perubahan call-off, serta sanggahan penerimaan barang, memakai alasan tertulis, bukan kode, sehingga tidak punya daftar di sini.',

  'adminRsn.list.poAdjust': 'Pesanan pembelian — sesuaikan baris',
  'adminRsn.list.poAdjust.hint':
    'REQ-E07-02 · alasan penawaran balik. "Lainnya" memerlukan catatan.',
  'adminRsn.list.poReject': 'Pesanan pembelian — tolak',
  'adminRsn.list.poReject.hint': 'REQ-E07-02 BR-06 · hal yang ditolak. Minimal satu wajib dipilih.',
  'adminRsn.list.capacityShortfall': 'Kapasitas di bawah kebutuhan',
  'adminRsn.list.capacityShortfall.hint':
    'REQ-E08-04 · mengapa kapasitas yang dialokasikan di bawah kebutuhan pada suatu minggu. "Lainnya" memerlukan catatan.',
  'adminRsn.list.commitmentShortfall': 'Komitmen di bawah prakiraan',
  'adminRsn.list.commitmentShortfall.hint':
    'REQ-E06-02 · mengapa komitmen di bawah prakiraan. "Lainnya" memerlukan catatan.',
  'adminRsn.list.alertClose': 'Peringatan — tutup',
  'adminRsn.list.alertClose.hint':
    'MR-9 BR-04 · mengapa perencana menutup peringatan stok. "Lainnya" memerlukan catatan.',
  'adminRsn.list.forecastOverride': 'Prakiraan permintaan — penyesuaian',
  'adminRsn.list.forecastOverride.hint':
    'REQ-E14-11 · mengapa anggota tim Perencanaan Material menyesuaikan prakiraan permintaan. Wajib bila penyesuaian menaikkannya. "Lainnya" memerlukan catatan.',

  'adminRsn.col.code': 'Kode',
  'adminRsn.col.labelEn': 'Label bahasa Inggris',
  'adminRsn.col.labelId': 'Label bahasa Indonesia',
  'adminRsn.col.status': 'Status',
  'adminRsn.col.source': 'Sumber',
  'adminRsn.col.action': 'Tindakan',
  'adminRsn.status.offered': 'Ditawarkan',
  'adminRsn.status.retired': 'Dihentikan',
  'adminRsn.source.starter': 'Daftar awal',
  'adminRsn.source.renamed': 'Daftar awal, namanya diganti',
  'adminRsn.source.added': 'Ditambahkan administrator',
  'adminRsn.action.rename': 'Ganti nama',
  'adminRsn.action.retire': 'Hentikan',
  'adminRsn.action.offer': 'Tawarkan lagi',
  'adminRsn.retiredLabel': '{{label}} (dihentikan)',

  'adminRsn.form.title': 'Tambah atau ubah kode alasan',
  'adminRsn.form.intro':
    'Kedua label wajib diisi. Kode yang dihentikan tetap ada di daftar dan pada setiap jawaban yang sudah memakainya; kode itu hanya tidak ditawarkan lagi. Kode terakhir yang ditawarkan dalam satu daftar tidak dapat dihentikan.',
  'adminRsn.form.list': 'Daftar',
  'adminRsn.form.code': 'Kode',
  'adminRsn.form.newCode': 'Kode baru',
  'adminRsn.form.codeHint':
    'Kode baru dibuat dari label bahasa Inggris. Kode tidak pernah berubah setelah dicatat.',
  'adminRsn.form.labelEn': 'Label bahasa Inggris',
  'adminRsn.form.labelId': 'Label bahasa Indonesia',
  'adminRsn.form.active': 'Ditawarkan pada jawaban baru',
  'adminRsn.form.submit': 'Catat',
  'adminRsn.form.cancel': 'Batal',
  'adminRsn.form.attribution':
    'Disimpan di peramban ini dan tetap ada setelah dimuat ulang; tidak dibagikan kepada siapa pun dan tidak disimpan di server. Dicatat sebagai dilakukan oleh orang yang belum dapat disebut namanya oleh platform, karena belum ada direktori pengguna yang terhubung.',
  'adminRsn.toast.saved': '{{label}} ({{code}}) dicatat.',
  'adminRsn.toast.refused': 'Ditolak: {{reason}}',

  'adminRsn.history.title': 'Perubahan yang tercatat',
  'adminRsn.history.empty': 'Belum ada perubahan. Setiap daftar masih daftar awal.',
  'adminRsn.history.col.code': 'Kode',
  'adminRsn.history.col.change': 'Lama → baru',
  'adminRsn.history.col.by': 'Oleh',
  'adminRsn.history.col.at': 'Dicatat',
  'adminRsn.history.added': 'ditambahkan',
  'adminRsn.by.unattributed': 'Tanpa atribusi (belum ada direktori pengguna)',

  'adminRsn.gate.title': 'Mengubah daftar alasan',
  'adminRsn.gate.body':
    'Daftar ini yang harus dipilih pemasok dan yang dinilai perencana, sehingga hanya administrator hub dan Kepatuhan yang dapat mengubahnya. Anda dapat membacanya.',

  'adminRsn.store.unreadableTitle': 'Perubahan tersimpan tidak dapat dibaca',
  'adminRsn.store.unreadableBody':
    'Peramban ini menyimpan data kode alasan yang tidak dapat diurai, sehingga tidak ada perubahan tersimpan yang dimuat dan setiap daftar menampilkan kode awalnya. Itu tidak sama dengan tidak ada perubahan. Mencatat perubahan akan menggantikan data yang tidak terbaca.',
  'adminRsn.store.rejectedTitle': 'Sebagian perubahan tersimpan tidak dimuat',
  'adminRsn.store.rejectedBody':
    'Perubahan tersimpan diperiksa ulang saat dibaca, berurutan, dengan aturan yang sama yang memeriksanya saat dibuat. Yang berikut ditolak:'
};
