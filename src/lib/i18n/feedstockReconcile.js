// Feedstock (FS) reconcile i18n fragment (DRC-15a, BL-201; replaced the fixed
// stock reconcile of REQ-E06-04, DRC-D14). Namespace: fsr.* (FS now reads
// "feedstock", so the namespace is kept).
//
// Business language only (SC-04). Mono data (quantities, dates, codes) is
// rendered through <Data> and never keyed.

/** @type {Record<string, string>} */
export const feedstockReconcileEn = {
  'fsr.title': 'Feedstock reconcile',
  'fsr.subtitle.pti':
    'Each day, per supplier and material: what PTI ordered on POs, what it called off, and what the supplier shipped on ASNs against those call-offs.',
  'fsr.subtitle.sup':
    'Each day, per material: what PTI ordered from you on POs, what it called off, and what you shipped on ASNs against those call-offs.',
  'fsr.asOf': 'As of',
  'fsr.empty': 'Nothing to reconcile yet: no standing PO line and no released call-off.',

  'fsr.col.supplier': 'Supplier',
  'fsr.col.material': 'Material',

  'fsr.poCount_one': 'on {{count}} PO',
  'fsr.poCount_other': 'on {{count}} POs',
  'fsr.valueOnly_one': '{{count}} value-only PO line, no quantity',
  'fsr.valueOnly_other': '{{count}} value-only PO lines, no quantity',
  'fsr.callOffCount_one': 'on {{count}} call-off',
  'fsr.callOffCount_other': 'on {{count}} call-offs',
  'fsr.asnCount_one': 'on {{count}} ASN',
  'fsr.asnCount_other': 'on {{count}} ASNs',
  'fsr.calledBeyond': 'Called off beyond the PO:',
  'fsr.shippedBeyond': 'Shipped beyond the call-offs:',
  'fsr.noMax': 'No max stock agreed',
  'fsr.max': 'Max:',
  'fsr.max.notAssigned': 'Not an assigned material, so no max stock can be set',
  'fsr.max.set': 'Set max stock',
  'fsr.max.change': 'Change max stock',
  'fsr.max.editFor': 'Max stock for {{material}} from {{supplier}}',
  'fsr.max.panelTitle': 'Max stock · {{material}}',
  'fsr.max.panelHint':
    'The most this supplier may hold for PTI of this material, as agreed with the supplier. Every change is kept with the value before it.',
  'fsr.max.input': 'Max stock ({{uom}})',
  'fsr.max.invalid': 'Enter a whole number above zero, or clear the value.',
  'fsr.max.save': 'Save',
  'fsr.max.clear': 'Clear — no max stock agreed',
  'fsr.max.saved': 'Max stock for {{material}} set to {{qty}} {{uom}}',
  'fsr.max.cleared': 'Max stock for {{material}} cleared',
  'fsr.max.refused': 'The max stock was not saved: {{reason}}',

  'fsr.rules.title': 'How the reconcile works',
  'fsr.rules.daily':
    'The reconcile is read each day, from the POs, call-offs and ASNs as they stand today.',
  'fsr.rules.figures':
    'PO ordered is the quantity on the supplier’s PO lines for the material, except POs the supplier rejected; a value-only line carries no quantity. Called off is the quantity on the call-offs PTI released, from Awaiting Confirmation onward; drafts, dismissed and rejected call-offs count nothing. ASN requested is the quantity shipped on ASNs against those call-offs that are submitted, in transit, delivered or under discrepancy.',
  'fsr.rules.remainders':
    'Not yet called off = PO ordered − called off. It never goes below zero; an excess shows as a note. What happens to a remainder is decided on its PO On Hold line, linked from the figure. Procurement maintains the max stock.'
};

/** @type {Record<string, string>} */
export const feedstockReconcileId = {
  'fsr.title': 'Rekonsiliasi feedstock',
  'fsr.subtitle.pti':
    'Setiap hari, per pemasok dan material: apa yang dipesan PTI pada PO, apa yang di-call-off, dan apa yang dikirim pemasok pada ASN atas call-off tersebut.',
  'fsr.subtitle.sup':
    'Setiap hari, per material: apa yang dipesan PTI dari Anda pada PO, apa yang di-call-off, dan apa yang Anda kirim pada ASN atas call-off tersebut.',
  'fsr.asOf': 'Per',
  'fsr.empty':
    'Belum ada yang direkonsiliasi: tidak ada baris PO yang berlaku dan tidak ada call-off yang dirilis.',

  'fsr.col.supplier': 'Pemasok',
  'fsr.col.material': 'Material',

  'fsr.poCount_other': 'pada {{count}} PO',
  'fsr.valueOnly_other': '{{count}} baris PO berbasis nilai, tanpa kuantitas',
  'fsr.callOffCount_other': 'pada {{count}} call-off',
  'fsr.asnCount_other': 'pada {{count}} ASN',
  'fsr.calledBeyond': 'Call-off melebihi PO:',
  'fsr.shippedBeyond': 'Dikirim melebihi call-off:',
  'fsr.noMax': 'Belum ada stok maksimum yang disepakati',
  'fsr.max': 'Max:',
  'fsr.max.notAssigned':
    'Bukan material yang ditugaskan, jadi stok maksimum tidak dapat ditetapkan',
  'fsr.max.set': 'Tetapkan stok maksimum',
  'fsr.max.change': 'Ubah stok maksimum',
  'fsr.max.editFor': 'Stok maksimum {{material}} dari {{supplier}}',
  'fsr.max.panelTitle': 'Stok maksimum · {{material}}',
  'fsr.max.panelHint':
    'Jumlah terbanyak yang boleh dipegang pemasok ini untuk PTI atas material ini, sesuai kesepakatan dengan pemasok. Setiap perubahan disimpan beserta nilai sebelumnya.',
  'fsr.max.input': 'Stok maksimum ({{uom}})',
  'fsr.max.invalid': 'Masukkan bilangan bulat di atas nol, atau kosongkan nilainya.',
  'fsr.max.save': 'Simpan',
  'fsr.max.clear': 'Hapus — belum ada stok maksimum yang disepakati',
  'fsr.max.saved': 'Stok maksimum {{material}} ditetapkan {{qty}} {{uom}}',
  'fsr.max.cleared': 'Stok maksimum {{material}} dihapus',
  'fsr.max.refused': 'Stok maksimum tidak disimpan: {{reason}}',

  'fsr.rules.title': 'Cara kerja rekonsiliasi',
  'fsr.rules.daily':
    'Rekonsiliasi dibaca setiap hari, dari PO, call-off, dan ASN sebagaimana adanya hari ini.',
  'fsr.rules.figures':
    'Dipesan di PO adalah kuantitas pada baris PO pemasok untuk material tersebut, kecuali PO yang ditolak pemasok; baris berbasis nilai tidak membawa kuantitas. Di-call-off adalah kuantitas pada call-off yang dirilis PTI, mulai dari Menunggu Konfirmasi; draf, call-off yang dibatalkan, dan yang ditolak tidak dihitung. Diminta di ASN adalah kuantitas yang dikirim pada ASN atas call-off tersebut yang sudah dikirim, dalam perjalanan, diterima, atau dalam selisih.',
  'fsr.rules.remainders':
    'Belum di-call-off = dipesan di PO − di-call-off. Nilainya tidak pernah di bawah nol; kelebihan ditampilkan sebagai catatan. Apa yang terjadi pada sisa diputuskan pada baris PO On Hold-nya, yang ditautkan dari angka itu. Procurement mengelola stok maksimum.'
};
