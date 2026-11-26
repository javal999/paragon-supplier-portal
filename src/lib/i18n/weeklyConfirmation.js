// UCX-P4 v2 (BL-365) — the supplier's one weekly page. Namespace: wk.*
//
// One confirmation per material each week (stock on hand, in production and
// feedstock), capacity with its "Last changed" date and its own page, and a
// week-level confirmation that carries ONLY the demand anticipation, the due
// POs and the Foresight periods (UCX-D17). The DA is never shown as a figure
// (DRC-D10): it is carried as an item and named by week.
//
// [Proposed] labels, pending Levi: "Confirm", "Confirm the new figures",
// "Confirm the week", "Last confirmed", "Last changed", "Open capacity".

/** @type {Record<string, string>} */
export const weeklyConfirmationEn = {
  'wk.title': 'Weekly confirmation',
  'wk.subtitle': 'Confirm each material once, then confirm the week.',
  'wk.published': 'Published for planning week {{week}} on {{date}}',
  'wk.noPublication': 'No demand anticipation publication holds this week.',
  'wk.due.confirmation': 'Confirmation due (Wednesday 23:59 WIB)',
  'wk.due.stock': 'New stock data cutoff (Thursday 23:59 WIB)',
  'wk.count': '{{confirmed}} of {{total}} materials confirmed',
  'wk.table.title': 'Stock and feedstock',
  'wk.col.material': 'Material',
  'wk.col.group': 'Planning group',
  'wk.col.soh': 'Stock on hand',
  'wk.col.inProduction': 'In production',
  'wk.col.feedstock': 'Feedstock',
  'wk.col.lastConfirmed': 'Last confirmed',
  'wk.col.status': 'Status',
  'wk.col.action': 'Action',
  'wk.field.sohFor': '{{material}} stock on hand',
  'wk.field.inProductionFor': '{{material}} in production',
  'wk.field.feedstockFor': '{{material}} feedstock',
  'wk.field.completionFor': '{{material}} production completion date',
  'wk.field.completion': 'Completion date',
  'wk.hint.completion': 'A completion date is required when in production is above 0.',
  'wk.hint.runs_one':
    '{{count}} production run is on record; changing the in-production figure replaces it with one.',
  'wk.hint.runs_other':
    '{{count}} production runs are on record; changing the in-production figure replaces them with one.',
  'wk.hint.feedstockRaw': 'A raw material has no feedstock figure.',
  'wk.status.toConfirm': 'To confirm',
  'wk.status.changed': 'Changed',
  'wk.status.confirmed': 'Confirmed',
  'wk.action.confirm': 'Confirm',
  'wk.action.confirmChanged': 'Confirm the new figures',
  'wk.action.confirmFor': 'Confirm {{material}}',
  'wk.hint.prefill':
    'Pre-filled from your last confirmation. Check each material against your stock record. Type over a figure to change it, then confirm the material.',
  'wk.hint.feedstock':
    'Feedstock is entered here once, not on a second tab. It is never added to stock on hand.',
  'wk.hint.invalid': 'Enter a quantity of 0 or more.',
  'wk.hint.feedstockMissing': 'Enter the feedstock figure before confirming.',
  'wk.last.never': 'Never',
  'wk.capacity.title': 'Capacity groups',
  'wk.capacity.still': '{{count}} still to confirm',
  'wk.capacity.weeks': '13 weeks',
  'wk.capacity.same': 'Same weekly allocation as your last confirmation',
  'wk.capacity.notStarted': 'Not started',
  'wk.capacity.lastChanged': 'Last changed',
  'wk.capacity.open': 'Open capacity',
  'wk.capacity.notYet': 'not yet',
  'wk.capacity.note':
    'Capacity stays on its own page because it holds 13 weeks per group. This page shows its status and the date of its last change, and opens it in one click. It is never carried forward.',
  'wk.carry.title': 'Carried forward when you confirm the week',
  'wk.carry.hint':
    'Nothing to type for these. PTI sees them as carried forward, with who confirmed the week and when.',
  'wk.carry.da': 'Demand anticipation',
  'wk.carry.daValue': 'The published figures for {{week}}',
  'wk.carry.daNone': 'No publication holds this week',
  'wk.carry.pos': 'Purchase orders',
  'wk.carry.posValue': '{{count}} open, due a response',
  'wk.carry.openOrders': 'Open purchase orders',
  'wk.carry.foresight': 'Foresight commitments',
  'wk.carry.foresightCount_one': '{{count}} period published this week',
  'wk.carry.foresightCount_other': '{{count}} periods published this week',
  'wk.carry.foresightNone': 'No period published this week',
  'wk.carry.openForesight': 'Open Foresight commitments',
  'wk.week.confirm': 'Confirm the week',
  'wk.week.blocked': 'Confirm each material above, then confirm the week.',
  'wk.week.ready': 'All materials confirmed. Confirm the week.',
  'wk.week.noPublication':
    'The week cannot be confirmed until a demand anticipation publication holds it.',
  'wk.week.done': 'Week {{week}} confirmed',
  'wk.week.sees':
    'PTI sees stock, in production and feedstock confirmed today for each material, and the demand anticipation, purchase orders and Foresight periods carried forward.',
  'wk.week.failed': 'The week was not confirmed.',
  'wk.api.title': 'Your stock comes from your system',
  'wk.api.body':
    'Your figures arrive by API sync, so this page is not used. The Stock page shows the last sync and the next one.',
  'wk.refusal.row': 'Not confirmed: {{reason}}'
};

/** @type {Record<string, string>} */
export const weeklyConfirmationId = {
  'wk.title': 'Konfirmasi mingguan',
  'wk.subtitle': 'Konfirmasi setiap material satu kali, lalu konfirmasi minggunya.',
  'wk.published': 'Diterbitkan untuk minggu perencanaan {{week}} pada {{date}}',
  'wk.noPublication': 'Tidak ada publikasi antisipasi permintaan yang berlaku minggu ini.',
  'wk.due.confirmation': 'Konfirmasi jatuh tempo (Rabu 23.59 WIB)',
  'wk.due.stock': 'Batas data stok baru (Kamis 23.59 WIB)',
  'wk.count': '{{confirmed}} dari {{total}} material terkonfirmasi',
  'wk.table.title': 'Stok dan bahan baku',
  'wk.col.material': 'Material',
  'wk.col.group': 'Grup perencanaan',
  'wk.col.soh': 'Stok di tangan',
  'wk.col.inProduction': 'Dalam produksi',
  'wk.col.feedstock': 'Bahan baku',
  'wk.col.lastConfirmed': 'Terakhir dikonfirmasi',
  'wk.col.status': 'Status',
  'wk.col.action': 'Tindakan',
  'wk.field.sohFor': 'Stok di tangan {{material}}',
  'wk.field.inProductionFor': 'Dalam produksi {{material}}',
  'wk.field.feedstockFor': 'Bahan baku {{material}}',
  'wk.field.completionFor': 'Tanggal selesai produksi {{material}}',
  'wk.field.completion': 'Tanggal selesai',
  'wk.hint.completion': 'Tanggal selesai wajib diisi bila dalam produksi di atas 0.',
  'wk.hint.runs_other':
    '{{count}} jalur produksi tercatat; mengubah angka dalam produksi akan menggantinya dengan satu jalur.',
  'wk.hint.feedstockRaw': 'Bahan baku mentah tidak memiliki angka bahan baku.',
  'wk.status.toConfirm': 'Perlu dikonfirmasi',
  'wk.status.changed': 'Berubah',
  'wk.status.confirmed': 'Terkonfirmasi',
  'wk.action.confirm': 'Konfirmasi',
  'wk.action.confirmChanged': 'Konfirmasi angka baru',
  'wk.action.confirmFor': 'Konfirmasi {{material}}',
  'wk.hint.prefill':
    'Terisi dari konfirmasi terakhir Anda. Periksa setiap material terhadap catatan stok Anda. Ketik ulang angka untuk mengubahnya, lalu konfirmasi materialnya.',
  'wk.hint.feedstock':
    'Bahan baku diisi di sini sekali, bukan di tab kedua. Angka ini tidak pernah ditambahkan ke stok di tangan.',
  'wk.hint.invalid': 'Masukkan jumlah 0 atau lebih.',
  'wk.hint.feedstockMissing': 'Isi angka bahan baku sebelum mengonfirmasi.',
  'wk.last.never': 'Belum pernah',
  'wk.capacity.title': 'Grup kapasitas',
  'wk.capacity.still': '{{count}} masih perlu dikonfirmasi',
  'wk.capacity.weeks': '13 minggu',
  'wk.capacity.same': 'Alokasi mingguan yang sama dengan konfirmasi terakhir Anda',
  'wk.capacity.notStarted': 'Belum dimulai',
  'wk.capacity.lastChanged': 'Terakhir diubah',
  'wk.capacity.open': 'Buka kapasitas',
  'wk.capacity.notYet': 'belum',
  'wk.capacity.note':
    'Kapasitas tetap di halamannya sendiri karena memuat 13 minggu per grup. Halaman ini menampilkan status dan tanggal perubahan terakhirnya, dan membukanya dalam satu klik. Kapasitas tidak pernah dibawa otomatis.',
  'wk.carry.title': 'Dibawa saat Anda mengonfirmasi minggu',
  'wk.carry.hint':
    'Tidak ada yang perlu diketik untuk ini. PTI melihatnya sebagai dibawa, beserta siapa yang mengonfirmasi minggu dan kapan.',
  'wk.carry.da': 'Antisipasi permintaan',
  'wk.carry.daValue': 'Angka terbitan untuk {{week}}',
  'wk.carry.daNone': 'Tidak ada publikasi yang berlaku minggu ini',
  'wk.carry.pos': 'Pesanan pembelian',
  'wk.carry.posValue': '{{count}} terbuka, menunggu respons',
  'wk.carry.openOrders': 'Buka pesanan pembelian',
  'wk.carry.foresight': 'Komitmen Foresight',
  'wk.carry.foresightCount_other': '{{count}} periode terbit minggu ini',
  'wk.carry.foresightNone': 'Tidak ada periode yang terbit minggu ini',
  'wk.carry.openForesight': 'Buka komitmen Foresight',
  'wk.week.confirm': 'Konfirmasi minggu',
  'wk.week.blocked': 'Konfirmasi setiap material di atas, lalu konfirmasi minggunya.',
  'wk.week.ready': 'Semua material terkonfirmasi. Konfirmasi minggunya.',
  'wk.week.noPublication':
    'Minggu ini belum dapat dikonfirmasi sampai ada publikasi antisipasi permintaan yang berlaku.',
  'wk.week.done': 'Minggu {{week}} terkonfirmasi',
  'wk.week.sees':
    'PTI melihat stok, dalam produksi, dan bahan baku terkonfirmasi hari ini untuk setiap material, serta antisipasi permintaan, pesanan pembelian, dan periode Foresight dibawa.',
  'wk.week.failed': 'Minggu ini tidak terkonfirmasi.',
  'wk.api.title': 'Stok Anda berasal dari sistem Anda',
  'wk.api.body':
    'Angka Anda masuk lewat sinkronisasi API, jadi halaman ini tidak digunakan. Halaman Stok menampilkan sinkronisasi terakhir dan berikutnya.',
  'wk.refusal.row': 'Tidak terkonfirmasi: {{reason}}'
};
