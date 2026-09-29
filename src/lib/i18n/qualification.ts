// ─────────────────────────────────────────────────────────────────────────────
// VENDOR QUALIFICATION — Material G1 (MR-10 BR-01 to BR-04, AC-01, AC-06).
//
// The level labels, the qualification panel (supplier profile and buyer
// supplier detail) and Administration → Vendor qualification. The requirement
// wording Procurement and Quality type in is data and is not keyed here.
// ─────────────────────────────────────────────────────────────────────────────

export const qualificationEn: Record<string, string> = {
  // — Levels (BR-01) —
  'qualification.level.registered': 'Registered',
  'qualification.level.approved': 'Approved',
  'qualification.level.preferred': 'Preferred',
  'qualification.placeholder': 'Placeholder, awaiting Procurement and Quality',
  // — The panel —
  'qualification.panel.title': 'Qualification',
  'qualification.panel.computed':
    'Worked out from your valid documents against the lists Procurement and Quality set. It changes by itself when a document is verified or expires.',
  'qualification.panel.stillNeeded': 'For {{level}}, still needed:',
  'qualification.panel.complete': 'Every document the highest level requires is valid.',
  'qualification.panel.declare': 'Declare document',
  'qualification.panel.sendToProcurement': 'Send this document to Procurement; it cannot be declared on this page yet.',
  'qualification.panel.expiring': 'Expiring soon — renew these to stay {{level}}:',
  'qualification.panel.expiresOn': 'expires',
  // — History —
  'qualification.history.title': 'Level history',
  'qualification.history.replayed': 'Replayed from the documents and the lists; nothing here is entered by hand.',
  'qualification.history.empty': 'The level has not changed.',
  'qualification.history.col.at': 'Date',
  'qualification.history.col.change': 'Change',
  'qualification.history.col.cause': 'Cause',
  'qualification.history.cause.document': 'Document',
  'qualification.history.cause.rule': 'The {{level}} list changed',
  // — Administration → Vendor qualification —
  'adminQual.crumb.administration': 'ADMINISTRATION',
  'adminQual.crumb.page': 'VENDOR QUALIFICATION',
  'adminQual.title': 'Vendor qualification',
  'adminQual.subtitle':
    'The documents a vendor needs to be Approved or Preferred. Every vendor’s level is worked out from these lists and its valid documents.',
  'adminQual.list.intro.approved': 'The initial documents. An Approved vendor may bid on indirect materials.',
  'adminQual.list.intro.preferred':
    'Every Approved document and the rest. A Preferred vendor may bid on direct and indirect materials.',
  'adminQual.action.change': 'Change list',
  'adminQual.form.title': 'Change a list',
  'adminQual.form.intro':
    'Pick the level, then the documents it requires. The Preferred list must include every Approved document, so add a document to Preferred before adding it to Approved.',
  'adminQual.form.level': 'Level',
  'adminQual.form.choose': 'Choose a level',
  'adminQual.form.category': 'Document category',
  'adminQual.form.certType': 'Certificate type',
  'adminQual.form.anyCert': 'Any',
  'adminQual.form.label': 'Requirement',
  'adminQual.form.labelPlaceholder': 'e.g. ISO 9001 certificate',
  'adminQual.form.remove': 'Remove document',
  'adminQual.form.add': 'Add document',
  'adminQual.form.impact': 'If saved: {{down}} vendor(s) move down and {{up}} move up, at once.',
  'adminQual.form.attribution': 'The change is recorded with who made it and when.',
  'adminQual.form.submit': 'Save list',
  'adminQual.form.cancel': 'Cancel',
  'adminQual.refusal.QUALIFICATION_LEVEL_UNKNOWN': 'Choose Approved or Preferred.',
  'adminQual.refusal.QUALIFICATION_RULE_INVALID':
    'Every document needs a requirement, the list cannot be empty, and a document cannot be listed twice.',
  'adminQual.refusal.PREFERRED_MISSING_APPROVED': 'The Preferred list must include every Approved document.',
  'adminQual.toast.saved': 'The {{level}} list is saved',
  'adminQual.toast.refused': 'Not saved: {{reason}}',
  'adminQual.gate.title': 'Procurement and Quality set these lists',
  'adminQual.gate.body': 'You can read the lists and every vendor’s level; changing a list is theirs.',
  'adminQual.history.title': 'Changes on record',
  'adminQual.history.empty': 'No list has been changed; the placeholder lists apply.',
  'adminQual.history.col.level': 'Level',
  'adminQual.history.col.documents': 'Documents required',
  'adminQual.history.col.by': 'By',
  'adminQual.history.col.at': 'When',
  'adminQual.history.by.unattributed': 'Not attributed (no person in session)',
  // — Scorecard (BR-09) —
  'qualification.scorecard.label': 'Qualification: {{level}}',
};

export const qualificationId: Record<string, string> = {
  'qualification.level.registered': 'Terdaftar',
  'qualification.level.approved': 'Approved',
  'qualification.level.preferred': 'Preferred',
  'qualification.placeholder': 'Sementara, menunggu Procurement dan Quality',
  'qualification.panel.title': 'Kualifikasi',
  'qualification.panel.computed':
    'Dihitung dari dokumen Anda yang sah terhadap daftar yang ditetapkan Procurement dan Quality. Berubah sendiri saat dokumen diverifikasi atau kedaluwarsa.',
  'qualification.panel.stillNeeded': 'Untuk {{level}}, masih diperlukan:',
  'qualification.panel.complete': 'Semua dokumen yang diwajibkan level tertinggi sudah sah.',
  'qualification.panel.declare': 'Nyatakan dokumen',
  'qualification.panel.sendToProcurement': 'Kirim dokumen ini ke Procurement; dokumen ini belum dapat dinyatakan di halaman ini.',
  'qualification.panel.expiring': 'Segera kedaluwarsa — perbarui agar tetap {{level}}:',
  'qualification.panel.expiresOn': 'kedaluwarsa',
  'qualification.history.title': 'Riwayat level',
  'qualification.history.replayed': 'Diputar ulang dari dokumen dan daftar; tidak ada yang diisi secara manual.',
  'qualification.history.empty': 'Level belum pernah berubah.',
  'qualification.history.col.at': 'Tanggal',
  'qualification.history.col.change': 'Perubahan',
  'qualification.history.col.cause': 'Penyebab',
  'qualification.history.cause.document': 'Dokumen',
  'qualification.history.cause.rule': 'Daftar {{level}} berubah',
  'adminQual.crumb.administration': 'ADMINISTRASI',
  'adminQual.crumb.page': 'KUALIFIKASI VENDOR',
  'adminQual.title': 'Kualifikasi vendor',
  'adminQual.subtitle':
    'Dokumen yang diperlukan vendor agar berstatus Approved atau Preferred. Level setiap vendor dihitung dari daftar ini dan dokumennya yang sah.',
  'adminQual.list.intro.approved': 'Dokumen awal. Vendor Approved boleh menawar material tidak langsung.',
  'adminQual.list.intro.preferred':
    'Semua dokumen Approved ditambah sisanya. Vendor Preferred boleh menawar material langsung dan tidak langsung.',
  'adminQual.action.change': 'Ubah daftar',
  'adminQual.form.title': 'Ubah daftar',
  'adminQual.form.intro':
    'Pilih level, lalu dokumen yang diwajibkan. Daftar Preferred harus memuat setiap dokumen Approved, jadi tambahkan dokumen ke Preferred sebelum ke Approved.',
  'adminQual.form.level': 'Level',
  'adminQual.form.choose': 'Pilih level',
  'adminQual.form.category': 'Kategori dokumen',
  'adminQual.form.certType': 'Jenis sertifikat',
  'adminQual.form.anyCert': 'Apa saja',
  'adminQual.form.label': 'Persyaratan',
  'adminQual.form.labelPlaceholder': 'mis. sertifikat ISO 9001',
  'adminQual.form.remove': 'Hapus dokumen',
  'adminQual.form.add': 'Tambah dokumen',
  'adminQual.form.impact': 'Jika disimpan: {{down}} vendor turun dan {{up}} naik, seketika.',
  'adminQual.form.attribution': 'Perubahan dicatat beserta siapa dan kapan.',
  'adminQual.form.submit': 'Simpan daftar',
  'adminQual.form.cancel': 'Batal',
  'adminQual.refusal.QUALIFICATION_LEVEL_UNKNOWN': 'Pilih Approved atau Preferred.',
  'adminQual.refusal.QUALIFICATION_RULE_INVALID':
    'Setiap dokumen memerlukan persyaratan, daftar tidak boleh kosong, dan dokumen tidak boleh tercantum dua kali.',
  'adminQual.refusal.PREFERRED_MISSING_APPROVED': 'Daftar Preferred harus memuat setiap dokumen Approved.',
  'adminQual.toast.saved': 'Daftar {{level}} tersimpan',
  'adminQual.toast.refused': 'Tidak tersimpan: {{reason}}',
  'adminQual.gate.title': 'Procurement dan Quality menetapkan daftar ini',
  'adminQual.gate.body': 'Anda dapat membaca daftar dan level setiap vendor; mengubah daftar adalah wewenang mereka.',
  'adminQual.history.title': 'Perubahan tercatat',
  'adminQual.history.empty': 'Belum ada daftar yang diubah; daftar sementara berlaku.',
  'adminQual.history.col.level': 'Level',
  'adminQual.history.col.documents': 'Dokumen yang diwajibkan',
  'adminQual.history.col.by': 'Oleh',
  'adminQual.history.col.at': 'Kapan',
  'adminQual.history.by.unattributed': 'Tanpa atribusi (tidak ada orang dalam sesi)',
  'qualification.scorecard.label': 'Kualifikasi: {{level}}',
};
