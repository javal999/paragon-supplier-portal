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
  'supDa.empty.body': 'PTI has not published demand anticipation for any of your materials yet.',
  // PSC-1 (BL-336) — the one-time weekly confirmation.
  'supDa.confirm.title': 'Weekly confirmation',
  'supDa.confirm.published': 'Published for planning week {{week}} on {{date}}',
  'supDa.confirm.zones':
    'Zone Liability is the published demand anticipation inside the lead time; Zone Capacity is the demand after it. Both read the same Friday publication.',
  'supDa.confirm.deadline.confirmation': 'Confirmation due (Wednesday 23:59 WIB)',
  'supDa.confirm.deadline.stock': 'New stock data cutoff (Thursday 23:59 WIB)',
  'supDa.confirm.badge.notConfirmed': 'First confirmation due',
  'supDa.confirm.badge.carriedForward': 'Carried forward',
  'supDa.confirm.badge.confirmed': 'Confirmed',
  'supDa.confirm.badge.changed': 'Changed',
  'supDa.confirm.status.notConfirmed':
    'Confirm this week once. Later weeks carry it forward and need no submit.',
  'supDa.confirm.status.carriedForward':
    'Carried forward from {{week}}: no submit needed unless something changed.',
  'supDa.confirm.status.confirmed': 'Confirmed on {{date}}: the last figures stay in force.',
  'supDa.confirm.status.changed':
    'Changed on {{date}}: your changes are recorded against week {{week}}.',
  'supDa.confirm.col.material': 'Material',
  'supDa.confirm.col.published': 'Published demand anticipation',
  'supDa.confirm.col.soh': 'Stock on hand',
  'supDa.confirm.sohFor': 'Stock on hand for {{material}}',
  'supDa.confirm.fromStock': 'From the stock record',
  'supDa.confirm.fromConfirmation': 'Pre-filled from your last confirmation',
  'supDa.confirm.noSoh': 'Not confirmed yet',
  'supDa.confirm.sohHint':
    'This figure pre-fills the Stock page. The Stock page is the one place to confirm or edit it.',
  'supDa.confirm.openStock': 'Open the Stock page',
  'supDa.confirm.submitFirst': 'Confirm the week',
  'supDa.confirm.submitChange': 'Submit the change',
  'supDa.confirm.refused': 'The confirmation was refused',
  'supDa.confirm.done': 'Week {{week}} confirmed',
  'supDa.confirm.refusal.SUPPLIER_UNKNOWN': 'Your supplier record could not be found.',
  'supDa.confirm.refusal.WEEK_INVALID': 'The planning week is missing or not a date.',
  'supDa.confirm.refusal.NO_PUBLICATION':
    'Nothing has been published for these materials this week.',
  'supDa.confirm.refusal.NO_MATERIALS': 'Enter the stock on hand for at least one material.',
  'supDa.confirm.refusal.NOT_ASSIGNED': 'A material is not assigned to you.',
  'supDa.confirm.refusal.SOH_INVALID': 'Stock on hand must be a number of 0 or more.',
  'supDa.confirm.covers.pos': 'Purchase orders due a response',
  'supDa.confirm.covers.count': '{{count}} open',
  'supDa.confirm.covers.due': 'due',
  'supDa.confirm.covers.openOrders': 'Open purchase orders',
  'supDa.confirm.covers.capacity': 'Capacity groups',
  'supDa.confirm.covers.capacityCount': '{{count}} of {{total}} still to confirm',
  'supDa.confirm.covers.openCapacity': 'Open capacity',
  'supDa.confirm.covers.foresight': 'Foresight commitments',
  'supDa.confirm.covers.foresightNone': 'Not published this week',
  'supDa.confirm.covers.foresightCount': '{{count}} periods published this week',
  'supDa.confirm.covers.openForesight': 'Open Foresight commitments',
  'supDa.confirm.covers.feedstock': 'Feedstock',
  'supDa.confirm.covers.feedstockNone': 'Not confirmed yet',
  'supDa.confirm.covers.openFeedstock': 'Enter feedstock in the stock table',
  'supDa.confirm.notices.title': 'Shipping notice (read only)',
  'supDa.confirm.notices.expected': 'expected',
  'supDa.confirm.notices.readOnly': 'Included from your first ASN. Read only here.'
};

/** @type {Record<string, string>} */
export const supplierDemandAnticipationId = {
  'supDa.subtitle':
    'Demand anticipation yang diterbitkan PTI untuk material Anda, per minggu selama lead time. Hanya baca.',
  'supDa.asOf': 'Per',
  'supDa.off.title': 'Belum tersedia',
  'supDa.off.body':
    'Demand anticipation akan ditampilkan di sini setelah Material Planning mengonfirmasi aturan perhitungannya.',
  'supDa.card.published': 'Diterbitkan untuk minggu perencanaan {{week}} pada {{date}}',
  'supDa.card.total': 'Total',
  'supDa.empty.title': 'Belum ada demand anticipation yang diterbitkan untuk Anda',
  'supDa.empty.body': 'PTI belum menerbitkan demand anticipation untuk material Anda.',
  // PSC-1 (BL-336) — konfirmasi mingguan sekali.
  'supDa.confirm.title': 'Konfirmasi mingguan',
  'supDa.confirm.published': 'Diterbitkan untuk minggu perencanaan {{week}} pada {{date}}',
  'supDa.confirm.zones':
    'Zone Liability adalah demand anticipation yang diterbitkan di dalam lead time; Zone Capacity adalah permintaan setelahnya. Keduanya membaca publikasi Jumat yang sama.',
  'supDa.confirm.deadline.confirmation': 'Batas konfirmasi (Rabu 23:59 WIB)',
  'supDa.confirm.deadline.stock': 'Batas data stok baru (Kamis 23:59 WIB)',
  'supDa.confirm.badge.notConfirmed': 'Konfirmasi pertama jatuh tempo',
  'supDa.confirm.badge.carriedForward': 'Diteruskan',
  'supDa.confirm.badge.confirmed': 'Dikonfirmasi',
  'supDa.confirm.badge.changed': 'Diubah',
  'supDa.confirm.status.notConfirmed':
    'Konfirmasi minggu ini satu kali. Minggu berikutnya diteruskan dan tidak perlu dikirim ulang.',
  'supDa.confirm.status.carriedForward':
    'Diteruskan dari {{week}}: tidak perlu dikirim ulang kecuali ada perubahan.',
  'supDa.confirm.status.confirmed': 'Dikonfirmasi pada {{date}}: angka terakhir tetap berlaku.',
  'supDa.confirm.status.changed':
    'Diubah pada {{date}}: perubahan Anda tercatat pada minggu {{week}}.',
  'supDa.confirm.col.material': 'Material',
  'supDa.confirm.col.published': 'Demand anticipation terbit',
  'supDa.confirm.col.soh': 'Stok on hand',
  'supDa.confirm.sohFor': 'Stok on hand untuk {{material}}',
  'supDa.confirm.fromStock': 'Dari catatan stok',
  'supDa.confirm.fromConfirmation': 'Terisi dari konfirmasi terakhir Anda',
  'supDa.confirm.noSoh': 'Belum dikonfirmasi',
  'supDa.confirm.sohHint':
    'Angka ini mengisi awal halaman Stock. Halaman Stock adalah satu-satunya tempat mengonfirmasi atau mengubahnya.',
  'supDa.confirm.openStock': 'Buka halaman Stock',
  'supDa.confirm.submitFirst': 'Konfirmasi minggu ini',
  'supDa.confirm.submitChange': 'Kirim perubahan',
  'supDa.confirm.refused': 'Konfirmasi ditolak',
  'supDa.confirm.done': 'Minggu {{week}} dikonfirmasi',
  'supDa.confirm.refusal.SUPPLIER_UNKNOWN': 'Data pemasok Anda tidak ditemukan.',
  'supDa.confirm.refusal.WEEK_INVALID': 'Minggu perencanaan tidak ada atau bukan tanggal.',
  'supDa.confirm.refusal.NO_PUBLICATION':
    'Belum ada yang diterbitkan untuk material ini minggu ini.',
  'supDa.confirm.refusal.NO_MATERIALS': 'Isi stok on hand untuk setidaknya satu material.',
  'supDa.confirm.refusal.NOT_ASSIGNED': 'Ada material yang tidak ditugaskan kepada Anda.',
  'supDa.confirm.refusal.SOH_INVALID': 'Stok on hand harus angka 0 atau lebih.',
  'supDa.confirm.covers.pos': 'Purchase order yang menunggu respons',
  'supDa.confirm.covers.count': '{{count}} terbuka',
  'supDa.confirm.covers.due': 'jatuh tempo',
  'supDa.confirm.covers.openOrders': 'Buka purchase order',
  'supDa.confirm.covers.capacity': 'Grup kapasitas',
  'supDa.confirm.covers.capacityCount': '{{count}} dari {{total}} masih harus dikonfirmasi',
  'supDa.confirm.covers.openCapacity': 'Buka kapasitas',
  'supDa.confirm.covers.foresight': 'Komitmen Foresight',
  'supDa.confirm.covers.foresightNone': 'Tidak terbit minggu ini',
  'supDa.confirm.covers.foresightCount': '{{count}} periode terbit minggu ini',
  'supDa.confirm.covers.openForesight': 'Buka komitmen Foresight',
  'supDa.confirm.covers.feedstock': 'Feedstock',
  'supDa.confirm.covers.feedstockNone': 'Belum dikonfirmasi',
  'supDa.confirm.covers.openFeedstock': 'Isi feedstock di tabel stok',
  'supDa.confirm.notices.title': 'Pemberitahuan pengiriman (hanya baca)',
  'supDa.confirm.notices.expected': 'perkiraan',
  'supDa.confirm.notices.readOnly': 'Disertakan sejak ASN pertama. Hanya baca di sini.'
};
