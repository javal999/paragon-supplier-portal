// Reschedule open orders i18n fragment (REQ-E14-13). Namespace: rs.*
//
// Business language only: what each proposal changes, what it frees, what it
// costs with the supplier, and what cannot be sent while the data is
// simulated. Mono data (quantities, weeks, dates, codes, rupiah) is rendered
// through <Data> and never keyed.

export const rescheduleEn: Record<string, string> = {
  'rs.title': 'Reschedule open orders',
  'rs.subtitle':
    'Open PO lines and call-offs that arrive before they are needed, and what moving them later, reducing or cancelling them would free in the warehouse, and cost with the supplier.',
  'rs.meta.plan': 'Finished-goods plan made',
  'rs.meta.horizon': 'Horizon',
  'rs.meta.weeks': '{{count}} weeks',
  'rs.meta.noPlan': 'No finished-goods plan',
  'rs.synthetic':
    'Calculated on synthetic data built to reproduce PTI’s current measures. It proves the calculations, not the business answer.',
  'rs.withheld':
    'Nothing on this page can reach a supplier or SAP until the Master Data Management team’s SAP feed is live: the proposals are calculated on simulated data.',
  'rs.method':
    'Each open line is given the week it is first needed — the first week stock without it, and without every line due after it, would fall below safety stock. Proposals are then valued together per warehouse, so no two claim the same freed space.',

  'rs.settings.title': 'Values in use',
  'rs.settings.threshold': 'Weeks early before a later date is proposed',
  'rs.settings.weeks_one': '{{count}} week',
  'rs.settings.weeks_other': '{{count}} weeks',
  'rs.settings.thresholdNote': 'Decided by the owner',
  'rs.settings.rent': 'Rented space, per pallet a week',
  'rs.settings.penalty': 'Change penalty inside the lead time, per pallet',
  'rs.settings.placeholderFinance': 'Placeholder — Finance to confirm',
  'rs.settings.placeholderPlanner': 'Placeholder — the Material Planner to confirm',
  'rs.settings.where': 'Set on Administration → Tolerances and rule values, beside the cost rates of What to order.',

  'rs.warehouse.packaging': 'Packaging warehouse',
  'rs.warehouse.rawMaterial': 'Raw material warehouse',
  'rs.warehouse.capacity': 'Owned capacity',
  'rs.warehouse.pallets': '{{value}} pallets',

  'rs.kpi.over': 'Pallet-weeks over capacity',
  'rs.kpi.over.sub': 'Over the horizon, with every open order where it is now',
  'rs.kpi.relief': 'Pallet-weeks the proposals free',
  'rs.kpi.relief.sub_one': '{{count}} proposal, {{free}} without supplier agreement',
  'rs.kpi.relief.sub_other': '{{count}} proposals, {{free}} without supplier agreement',
  'rs.kpi.saving': 'Rented space saved',
  'rs.kpi.saving.sub': 'At the placeholder rate; change penalties {{penalty}}',
  'rs.kpi.onHand': 'Overload that is stock on hand',
  'rs.kpi.onHand.sub': 'Pallet-weeks; {{value}} remain over capacity after every proposal',
  'rs.onHand.note_one':
    'In {{count}} week ({{first}}) the stock already on hand is above capacity by itself. No open order can relieve it: what is left is using up the surplus or moving it, which is outside this report.',
  'rs.onHand.note_other':
    'In {{count}} weeks ({{first}} to {{last}}) the stock already on hand is above capacity by itself. No open order can relieve them: what is left is using up the surplus or moving it, which is outside this report.',

  'rs.guard.title': 'Supplier stability',
  'rs.guard.intro':
    'Every change PTI makes inside a supplier’s lead time counts against PTI in the supplier measures and makes the plan less stable. This shows how PTI’s share of schedules changed inside the lead time (last {{weeks}} weeks) would move if the selected proposals were sent.',
  'rs.guard.selected': 'Selected proposals',
  'rs.guard.inside_one': '{{count}} inside the lead time',
  'rs.guard.inside_other': '{{count}} inside the lead time',
  'rs.guard.share': 'Schedules changed inside the lead time',
  'rs.guard.effect': 'Space the selection frees above capacity',
  'rs.guard.penalty': 'Change penalties',
  'rs.guard.callOffs':
    'The measure counts PO lines. A call-off change is not in it yet; it is counted in the selected proposals inside the lead time.',

  'rs.fill.title': 'Projected warehouse fill by week',
  'rs.fill.intro':
    'Stock at the end of each week, in pallets, as a share of owned capacity: now, with the selected proposals, and with every proposal on the list. The last line is stock already on hand — no change to an open order moves it.',
  'rs.fill.basis':
    '“Now” is the projection on What to order, recommended orders included, plus released call-offs not yet received. What to order does not count those call-offs yet, so “Now” can read higher than its fill for the same week.',
  'rs.fill.series.now': 'Now',
  'rs.fill.series.selected': 'With the selection',
  'rs.fill.series.onHand': 'Stock on hand',
  'rs.fill.col.week': 'Week',
  'rs.fill.col.now': 'Now',
  'rs.fill.col.selected': 'With the selection',
  'rs.fill.col.allRelief': 'With every proposal',
  'rs.fill.col.onHand': 'Stock on hand',
  'rs.fill.col.status': 'With the selection',
  'rs.fill.status.onHand': 'Cannot be relieved by open orders',
  'rs.fill.status.over': 'Over capacity',
  'rs.fill.status.above': 'Above 80%',
  'rs.fill.status.within': 'Within 80%',

  'rs.relief.title': 'Warehouse relief, ranked',
  'rs.relief.intro':
    'Ranked by net saving: the rented space it saves in weeks over capacity, less the change penalty. Each is valued after the ones above it, so no two claim the same space. Proposals inside the supplier’s lead time or its Firm zone come last and need the supplier’s agreement. Nothing is sent without your act.',
  'rs.relief.empty': 'No open order in this warehouse can free space in a week over capacity.',
  'rs.relief.selectFree_one': 'Select the {{count}} proposal without supplier agreement',
  'rs.relief.selectFree_other': 'Select the {{count}} proposals without supplier agreement',
  'rs.relief.clear': 'Clear selection',

  'rs.shortage.title': 'Bring in to prevent a shortage',
  'rs.shortage.intro':
    'Lines due after the week they are needed. Bringing them in moves shortage, not space, so they are listed apart and add pallets.',
  'rs.noSaving.title_one': '{{count}} proposal that frees space only in weeks under capacity',
  'rs.noSaving.title_other': '{{count}} proposals that free space only in weeks under capacity',
  'rs.noSaving.intro':
    'These lines are early, or not needed within the horizon, but the space they would free falls in weeks already under capacity — or is already freed by a proposal ranked above. They save no rented space.',
  'rs.info.title': 'Open orders shown for information',
  'rs.info.intro': 'In the projection, but not proposed.',
  'rs.info.reason.dispatched': 'already dispatched',
  'rs.info.reason.awaitingConfirmation': 'awaiting the supplier’s confirmation — change it after the answer',
  'rs.info.reason.changePending': 'a change was sent; nothing counts as moved until the supplier confirms it',
  'rs.info.reason.awaitingApproval': 'a confirmation waits for the planner’s decision',
  'rs.info.reason.multipleDeliveries': 'confirmed as two deliveries; a change would set one',
  'rs.info.reason.noSource': 'no supplier source in the engine data: no lead time or MOQ to judge a change by',
  'rs.info.reason.noVolume': 'no pallet conversion: its space cannot be valued',

  'rs.col.select': 'Select',
  'rs.col.selectOne': 'Select {{order}}',
  'rs.col.rank': 'Rank',
  'rs.col.material': 'Material and supplier',
  'rs.col.order': 'Order',
  'rs.col.now': 'Now',
  'rs.col.proposed': 'Proposed',
  'rs.col.freed': 'Freed above capacity',
  'rs.col.saving': 'Rented space saved',
  'rs.col.cost': 'Change cost',
  'rs.col.position': 'Zone and lead time',
  'rs.col.action': 'Action',
  'rs.kind.poLine': 'PO line',
  'rs.kind.callOff': 'Call-off',
  'rs.type.rescheduleOut': 'Reschedule out',
  'rs.type.rescheduleIn': 'Reschedule in',
  'rs.type.reduce': 'Reduce',
  'rs.type.cancel': 'Cancel',
  'rs.proposed.cancel': 'Cancel the rest of the line',
  'rs.need.none': 'Not needed within the horizon',
  'rs.need.week': 'Needed from {{week}}',
  'rs.palletWeeks': '{{value}} pallet-weeks',
  'rs.freedAll': '{{value}} pallet-weeks in all',
  'rs.net': 'Net',
  'rs.liabilityNotPriced': 'Liability — not priced',
  'rs.zone.firm': 'Firm zone',
  'rs.zone.tradeOff': 'Trade-off zone',
  'rs.zone.forecast': 'Forecast zone',
  'rs.lt.inside': '{{days}} days ahead, inside the {{lead}}-day lead time',
  'rs.lt.outside': '{{days}} days ahead, outside the {{lead}}-day lead time',
  'rs.flag.agreement': 'Needs supplier agreement',
  'rs.flag.liability': 'Supplier liability',
  'rs.flag.band': 'Held to the ±10% / ±20% band',
  'rs.flag.lastLine': 'Last open line on the PO — buyer to check the contract',
  'rs.flag.planChange': 'Would count as a PTI change inside the lead time',

  'rs.action.send': 'Send change to supplier',
  'rs.action.withheldCallOff':
    'Cannot be sent to the supplier until the Master Data Management team’s SAP feed is live: this proposal is calculated on simulated data.',
  'rs.action.awaitingConfirmation': 'Sent — awaiting the supplier’s confirmation',
  'rs.action.callOffCancel':
    'No hub act cancels a released call-off: agree it with the supplier, who rejects or re-confirms it.',
  'rs.action.inSap': 'Changed in SAP by the Material Planner',
  'rs.action.mark': 'Mark as taken to SAP',
  'rs.action.withheldSap':
    'Cannot be taken to SAP until the Master Data Management team’s SAP feed is live: this proposal is calculated on simulated data.',
  'rs.action.taken': 'Taken to SAP',
  'rs.reason.later': 'Warehouse capacity: not needed until {{week}}',
  'rs.reason.reduce': 'Warehouse capacity: only {{quantity}} needed within the plan horizon',
  'rs.refusal.simulated':
    'This proposal is calculated on simulated data. It can reach a supplier once the Master Data Management team’s SAP feed is live.',
  'rs.toast.sent': 'Change sent',
  'rs.toast.sentDesc': 'The supplier confirms the new date as for any change. Until then nothing counts as moved.',
  'rs.toast.marked': 'Marked as taken to SAP',
  'rs.toast.refused': 'Not sent',

  'rs.def.title': 'How this is calculated',
  'rs.def.need':
    'Need week: open lines are taken in due-date order; a line is needed in the first week in which stock without it, and without every line due after it, would fall below safety stock. Planned orders are not counted — they are re-planned around the open lines.',
  'rs.def.types':
    'A line due at least the set number of weeks early is proposed later, to its need week. A line only partly needed within the horizon is reduced, rounded up to the MOQ and order multiple; one not needed at all is cancelled. A line due after its need week is brought in.',
  'rs.def.zones':
    'Inside the supplier’s lead time or its Firm zone a change needs the supplier’s agreement, carries the change penalty and ranks last. In the Trade-off zone a reduction is held to ±10% of the quantity in force and ±20% of the first quantity; a cancellation there carries the supplier’s liability for material already bought, flagged but not priced. The Forecast zone is free.',
  'rs.def.value':
    'Value: the pallet-weeks a change frees in weeks over capacity, times the rented-space rate, less the change penalty. The list is valued together, one proposal after another.',
  'rs.def.onHand':
    'Stock on hand: what is already in the warehouse and not yet used by the plan. Where it alone is above capacity, no change to an open order can bring the week under.',
  'rs.def.unconfirmed_one':
    '{{count}} open PO line is not yet confirmed by its supplier. Like the material requirement, this report leaves it out of the projection until it is confirmed.',
  'rs.def.unconfirmed_other':
    '{{count}} open PO lines are not yet confirmed by their suppliers. Like the material requirement, this report leaves them out of the projection until they are confirmed.',
};

export const rescheduleId: Record<string, string> = {
  'rs.title': 'Jadwal ulang pesanan terbuka',
  'rs.subtitle':
    'Baris PO dan call-off terbuka yang tiba sebelum dibutuhkan, dan apa yang akan dibebaskan di gudang serta biayanya dengan pemasok bila dipindah lebih lambat, dikurangi, atau dibatalkan.',
  'rs.meta.plan': 'Rencana barang jadi dibuat',
  'rs.meta.horizon': 'Horizon',
  'rs.meta.weeks': '{{count}} minggu',
  'rs.meta.noPlan': 'Tidak ada rencana barang jadi',
  'rs.synthetic':
    'Dihitung dengan data sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'rs.withheld':
    'Tidak ada yang dari halaman ini dapat sampai ke pemasok atau SAP sampai data SAP dari tim Master Data Management tersedia: usulan dihitung dengan data simulasi.',
  'rs.method':
    'Setiap baris terbuka diberi minggu pertama ia dibutuhkan — minggu pertama stok tanpa baris itu, dan tanpa setiap baris yang jatuh tempo setelahnya, turun di bawah stok pengaman. Usulan lalu dinilai bersama per gudang, sehingga tidak ada dua usulan yang mengklaim ruang yang sama.',

  'rs.settings.title': 'Nilai yang dipakai',
  'rs.settings.threshold': 'Minggu lebih awal sebelum tanggal yang lebih lambat diusulkan',
  'rs.settings.weeks_other': '{{count}} minggu',
  'rs.settings.thresholdNote': 'Diputuskan oleh pemilik',
  'rs.settings.rent': 'Ruang sewa, per palet per minggu',
  'rs.settings.penalty': 'Penalti perubahan dalam waktu tunggu, per palet',
  'rs.settings.placeholderFinance': 'Sementara — menunggu konfirmasi Keuangan',
  'rs.settings.placeholderPlanner': 'Sementara — menunggu konfirmasi Perencana Material',
  'rs.settings.where': 'Diatur di Administrasi → Toleransi dan nilai aturan, di samping tarif biaya Apa yang dipesan.',

  'rs.warehouse.packaging': 'Gudang kemasan',
  'rs.warehouse.rawMaterial': 'Gudang bahan baku',
  'rs.warehouse.capacity': 'Kapasitas milik sendiri',
  'rs.warehouse.pallets': '{{value}} palet',

  'rs.kpi.over': 'Palet-minggu di atas kapasitas',
  'rs.kpi.over.sub': 'Sepanjang horizon, dengan setiap pesanan terbuka di tempatnya sekarang',
  'rs.kpi.relief': 'Palet-minggu yang dibebaskan usulan',
  'rs.kpi.relief.sub_other': '{{count}} usulan, {{free}} tanpa persetujuan pemasok',
  'rs.kpi.saving': 'Ruang sewa yang dihemat',
  'rs.kpi.saving.sub': 'Dengan tarif sementara; penalti perubahan {{penalty}}',
  'rs.kpi.onHand': 'Kelebihan yang berupa stok di tangan',
  'rs.kpi.onHand.sub': 'Palet-minggu; {{value}} tetap di atas kapasitas setelah semua usulan',
  'rs.onHand.note_other':
    'Dalam {{count}} minggu ({{first}} sampai {{last}}) stok yang sudah ada di gudang sendiri sudah melebihi kapasitas. Tidak ada pesanan terbuka yang dapat meringankannya: yang tersisa adalah menghabiskan kelebihan stok atau memindahkannya, di luar laporan ini.',

  'rs.guard.title': 'Stabilitas pemasok',
  'rs.guard.intro':
    'Setiap perubahan PTI di dalam waktu tunggu pemasok dihitung sebagai kesalahan PTI dalam ukuran pemasok dan membuat rencana kurang stabil. Bagian ini menunjukkan bagaimana porsi jadwal PTI yang diubah di dalam waktu tunggu ({{weeks}} minggu terakhir) akan bergerak bila usulan terpilih dikirim.',
  'rs.guard.selected': 'Usulan terpilih',
  'rs.guard.inside_other': '{{count}} di dalam waktu tunggu',
  'rs.guard.share': 'Jadwal yang diubah di dalam waktu tunggu',
  'rs.guard.effect': 'Ruang di atas kapasitas yang dibebaskan pilihan',
  'rs.guard.penalty': 'Penalti perubahan',
  'rs.guard.callOffs':
    'Ukuran ini menghitung baris PO. Perubahan call-off belum masuk di dalamnya; ia dihitung dalam usulan terpilih di dalam waktu tunggu.',

  'rs.fill.title': 'Proyeksi isi gudang per minggu',
  'rs.fill.intro':
    'Stok di akhir setiap minggu, dalam palet, sebagai porsi kapasitas milik sendiri: sekarang, dengan usulan terpilih, dan dengan semua usulan di daftar. Garis terakhir adalah stok yang sudah ada di gudang — tidak ada perubahan pesanan terbuka yang memindahkannya.',
  'rs.fill.basis':
    '“Sekarang” adalah proyeksi di Apa yang dipesan, termasuk pesanan yang disarankan, ditambah call-off yang sudah dirilis tetapi belum diterima. Apa yang dipesan belum menghitung call-off itu, jadi “Sekarang” bisa lebih tinggi daripada isinya untuk minggu yang sama.',
  'rs.fill.series.now': 'Sekarang',
  'rs.fill.series.selected': 'Dengan pilihan',
  'rs.fill.series.onHand': 'Stok di tangan',
  'rs.fill.col.week': 'Minggu',
  'rs.fill.col.now': 'Sekarang',
  'rs.fill.col.selected': 'Dengan pilihan',
  'rs.fill.col.allRelief': 'Dengan semua usulan',
  'rs.fill.col.onHand': 'Stok di tangan',
  'rs.fill.col.status': 'Dengan pilihan',
  'rs.fill.status.onHand': 'Tidak dapat diringankan oleh pesanan terbuka',
  'rs.fill.status.over': 'Di atas kapasitas',
  'rs.fill.status.above': 'Di atas 80%',
  'rs.fill.status.within': 'Dalam 80%',

  'rs.relief.title': 'Keringanan gudang, berperingkat',
  'rs.relief.intro':
    'Diurutkan menurut penghematan bersih: ruang sewa yang dihemat di minggu di atas kapasitas, dikurangi penalti perubahan. Setiap usulan dinilai setelah usulan di atasnya, sehingga tidak ada dua yang mengklaim ruang yang sama. Usulan di dalam waktu tunggu pemasok atau zona Firm-nya berada paling akhir dan memerlukan persetujuan pemasok. Tidak ada yang dikirim tanpa tindakan Anda.',
  'rs.relief.empty': 'Tidak ada pesanan terbuka di gudang ini yang dapat membebaskan ruang di minggu di atas kapasitas.',
  'rs.relief.selectFree_other': 'Pilih {{count}} usulan tanpa persetujuan pemasok',
  'rs.relief.clear': 'Hapus pilihan',

  'rs.shortage.title': 'Majukan untuk mencegah kekurangan',
  'rs.shortage.intro':
    'Baris yang jatuh tempo setelah minggu dibutuhkan. Memajukannya memindahkan kekurangan, bukan ruang, sehingga dicantumkan terpisah dan menambah palet.',
  'rs.noSaving.title_other': '{{count}} usulan yang hanya membebaskan ruang di minggu di bawah kapasitas',
  'rs.noSaving.intro':
    'Baris ini datang terlalu awal, atau tidak dibutuhkan dalam horizon, tetapi ruang yang dibebaskannya jatuh di minggu yang sudah di bawah kapasitas — atau sudah dibebaskan oleh usulan di atasnya. Tidak ada ruang sewa yang dihemat.',
  'rs.info.title': 'Pesanan terbuka yang ditampilkan sebagai informasi',
  'rs.info.intro': 'Masuk dalam proyeksi, tetapi tidak diusulkan.',
  'rs.info.reason.dispatched': 'sudah dikirim',
  'rs.info.reason.awaitingConfirmation': 'menunggu konfirmasi pemasok — ubah setelah ada jawaban',
  'rs.info.reason.changePending': 'perubahan sudah dikirim; tidak ada yang dianggap pindah sampai pemasok mengonfirmasi',
  'rs.info.reason.awaitingApproval': 'konfirmasi menunggu keputusan perencana',
  'rs.info.reason.multipleDeliveries': 'dikonfirmasi sebagai dua pengiriman; perubahan akan menetapkan satu',
  'rs.info.reason.noSource': 'tidak ada sumber pemasok dalam data mesin: tidak ada waktu tunggu atau MOQ untuk menilai perubahan',
  'rs.info.reason.noVolume': 'tidak ada konversi palet: ruangnya tidak dapat dinilai',

  'rs.col.select': 'Pilih',
  'rs.col.selectOne': 'Pilih {{order}}',
  'rs.col.rank': 'Peringkat',
  'rs.col.material': 'Material dan pemasok',
  'rs.col.order': 'Pesanan',
  'rs.col.now': 'Sekarang',
  'rs.col.proposed': 'Usulan',
  'rs.col.freed': 'Dibebaskan di atas kapasitas',
  'rs.col.saving': 'Ruang sewa yang dihemat',
  'rs.col.cost': 'Biaya perubahan',
  'rs.col.position': 'Zona dan waktu tunggu',
  'rs.col.action': 'Tindakan',
  'rs.kind.poLine': 'Baris PO',
  'rs.kind.callOff': 'Call-off',
  'rs.type.rescheduleOut': 'Mundurkan jadwal',
  'rs.type.rescheduleIn': 'Majukan jadwal',
  'rs.type.reduce': 'Kurangi',
  'rs.type.cancel': 'Batalkan',
  'rs.proposed.cancel': 'Batalkan sisa baris',
  'rs.need.none': 'Tidak dibutuhkan dalam horizon',
  'rs.need.week': 'Dibutuhkan mulai {{week}}',
  'rs.palletWeeks': '{{value}} palet-minggu',
  'rs.freedAll': '{{value}} palet-minggu seluruhnya',
  'rs.net': 'Bersih',
  'rs.liabilityNotPriced': 'Kewajiban — belum dihargai',
  'rs.zone.firm': 'Zona Firm',
  'rs.zone.tradeOff': 'Zona Trade-off',
  'rs.zone.forecast': 'Zona Forecast',
  'rs.lt.inside': '{{days}} hari lagi, di dalam waktu tunggu {{lead}} hari',
  'rs.lt.outside': '{{days}} hari lagi, di luar waktu tunggu {{lead}} hari',
  'rs.flag.agreement': 'Perlu persetujuan pemasok',
  'rs.flag.liability': 'Kewajiban pemasok',
  'rs.flag.band': 'Dibatasi pita ±10% / ±20%',
  'rs.flag.lastLine': 'Baris terbuka terakhir pada PO — pembeli memeriksa kontrak',
  'rs.flag.planChange': 'Akan dihitung sebagai perubahan PTI di dalam waktu tunggu',

  'rs.action.send': 'Kirim perubahan ke pemasok',
  'rs.action.withheldCallOff':
    'Tidak dapat dikirim ke pemasok sampai data SAP dari tim Master Data Management tersedia: usulan ini dihitung dengan data simulasi.',
  'rs.action.awaitingConfirmation': 'Terkirim — menunggu konfirmasi pemasok',
  'rs.action.callOffCancel':
    'Tidak ada tindakan hub yang membatalkan call-off yang sudah dirilis: sepakati dengan pemasok, yang menolak atau mengonfirmasi ulang.',
  'rs.action.inSap': 'Diubah di SAP oleh Perencana Material',
  'rs.action.mark': 'Tandai sudah dibawa ke SAP',
  'rs.action.withheldSap':
    'Tidak dapat dibawa ke SAP sampai data SAP dari tim Master Data Management tersedia: usulan ini dihitung dengan data simulasi.',
  'rs.action.taken': 'Sudah dibawa ke SAP',
  'rs.reason.later': 'Kapasitas gudang: belum dibutuhkan sampai {{week}}',
  'rs.reason.reduce': 'Kapasitas gudang: hanya {{quantity}} yang dibutuhkan dalam horizon rencana',
  'rs.refusal.simulated':
    'Usulan ini dihitung dengan data simulasi. Ia dapat sampai ke pemasok setelah data SAP dari tim Master Data Management tersedia.',
  'rs.toast.sent': 'Perubahan terkirim',
  'rs.toast.sentDesc': 'Pemasok mengonfirmasi tanggal baru seperti perubahan lainnya. Sampai saat itu tidak ada yang dianggap pindah.',
  'rs.toast.marked': 'Ditandai sudah dibawa ke SAP',
  'rs.toast.refused': 'Tidak terkirim',

  'rs.def.title': 'Cara perhitungannya',
  'rs.def.need':
    'Minggu kebutuhan: baris terbuka diambil menurut urutan tanggal jatuh tempo; sebuah baris dibutuhkan pada minggu pertama stok tanpa baris itu, dan tanpa setiap baris yang jatuh tempo setelahnya, turun di bawah stok pengaman. Pesanan terencana tidak dihitung — pesanan itu direncanakan ulang di sekitar baris terbuka.',
  'rs.def.types':
    'Baris yang jatuh tempo sedikitnya sekian minggu terlalu awal diusulkan lebih lambat, ke minggu kebutuhannya. Baris yang hanya sebagian dibutuhkan dalam horizon dikurangi, dibulatkan ke atas ke MOQ dan kelipatan pesanan; yang sama sekali tidak dibutuhkan dibatalkan. Baris yang jatuh tempo setelah minggu kebutuhannya dimajukan.',
  'rs.def.zones':
    'Di dalam waktu tunggu pemasok atau zona Firm-nya, perubahan memerlukan persetujuan pemasok, dikenai penalti perubahan, dan berada paling akhir. Di zona Trade-off pengurangan dibatasi ±10% dari kuantitas yang berlaku dan ±20% dari kuantitas pertama; pembatalan di sana membawa kewajiban pemasok atas material yang sudah dibeli, ditandai tetapi belum dihargai. Zona Forecast bebas.',
  'rs.def.value':
    'Nilai: palet-minggu yang dibebaskan sebuah perubahan di minggu di atas kapasitas, dikali tarif ruang sewa, dikurangi penalti perubahan. Daftar dinilai bersama, satu usulan setelah yang lain.',
  'rs.def.onHand':
    'Stok di tangan: yang sudah ada di gudang dan belum dipakai rencana. Bila stok itu sendiri di atas kapasitas, tidak ada perubahan pesanan terbuka yang dapat membawa minggu itu ke bawah.',
  'rs.def.unconfirmed_other':
    '{{count}} baris PO terbuka belum dikonfirmasi pemasoknya. Seperti kebutuhan material, laporan ini tidak memasukkannya ke proyeksi sampai dikonfirmasi.',
};
