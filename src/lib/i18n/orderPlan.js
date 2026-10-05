// Order plan i18n fragment (REQ-E14-05). Namespace: op.*
//
// Business language only: the screen says what each figure is, what bound
// each order and which costs are placeholders. Mono data (quantities, weeks,
// dates, codes, rupiah) is rendered through <Data> and never keyed.

/** @type {Record<string, string>} */
export const orderPlanEn = {
  'op.title': 'Order plan',
  'op.subtitle':
    'When and how much to order, sized for all materials sharing a warehouse together: demand met every week, MOQ and order multiple kept, and warehouse space weighed against the cost of another order.',
  'op.meta.plan': 'Finished-goods plan made',
  'op.meta.horizon': 'Horizon',
  'op.meta.weeks': '{{count}} weeks',
  'op.meta.noPlan': 'No finished-goods plan',
  'op.meta.previous': 'Changes inside the lead time are weighed against last week’s plan, as of',
  'op.synthetic':
    'Calculated on synthetic data built to reproduce PTI’s current measures. It proves the calculations, not the business answer.',
  'op.method':
    'Each material’s plan is found exactly, then the materials of a warehouse are re-planned one at a time against the space the others use, until no change lowers the total cost.',

  'op.costs.title': 'Cost rates in use',
  'op.costs.placeholder': 'Placeholder — Finance to confirm',
  'op.costs.placeholderPenalty': 'Placeholder — the Material Planner to confirm',
  'op.costs.holding': 'Holding cost',
  'op.costs.holdingValue': '{{value}}% of value a year',
  'op.costs.order': 'Cost per order',
  'op.costs.rent': 'Rented space, per pallet a week',
  'op.costs.penalty': 'Change penalty inside the lead time, per pallet',
  'op.costs.where':
    'Set on Administration → Tolerances and rule values. Every rupiah figure on this page uses them.',

  'op.warehouse.packaging': 'Packaging warehouse',
  'op.warehouse.rawMaterial': 'Raw material warehouse',
  'op.warehouse.capacity': 'Owned capacity',
  'op.warehouse.pallets': '{{value}} pallets',
  'op.fallback':
    'This warehouse could not be sized jointly ({{reason}}). Each material is sized on its own by the fallback, and marked.',

  'op.kpi.orders': 'Recommended orders',
  'op.kpi.orders.sub': 'Interim round-up would place {{count}}',
  'op.kpi.peak': 'Highest projected fill',
  'op.kpi.peak.sub': 'Against owned capacity; the standard is 80%',
  'op.kpi.rented': 'Rented pallet-weeks',
  'op.kpi.rented.sub': 'Interim round-up: {{value}}',
  'op.kpi.rentCost': 'Rented space cost',
  'op.kpi.rentCost.sub': 'At the placeholder rate',

  'op.fill.title': 'Projected warehouse fill by week',
  'op.fill.intro':
    'Stock at the end of each week, in pallets, as a share of owned capacity. Above 100% the overflow goes to rented space and is costed. The lowest line is the least any plan could hold: each week’s need exactly, with no MOQ or multiple.',
  'op.fill.series.plan': 'Order plan',
  'op.fill.series.interim': 'Interim round-up',
  'op.fill.series.lowest': 'Lowest possible',
  'op.fill.line.capacity': 'Capacity 100%',
  'op.fill.line.standard': 'Standard 80%',
  'op.fill.col.week': 'Week',
  'op.fill.col.plan': 'Order plan',
  'op.fill.col.interim': 'Interim round-up',
  'op.fill.col.lowest': 'Lowest possible',
  'op.fill.col.status': 'Against 80%',
  'op.fill.col.rented': 'Rented pallets',
  'op.fill.col.rentCost': 'Rented space cost',
  'op.fill.status.over': 'Over capacity',
  'op.fill.status.above': 'Above 80%',
  'op.fill.status.within': 'Within 80%',

  'op.recs.title': 'Recommended orders',
  'op.recs.intro':
    'Each order with the constraint that bound it and the cost it saved. A recommendation becomes a call-off only when a planner acts: it is created here as a draft on the supplier’s open agreement, and released on the Call-offs page, where what remains on the agreement is checked.',
  'op.recs.empty': 'No order is needed in this warehouse over the horizon.',
  'op.col.material': 'Material',
  'op.col.supplier': 'Supplier',
  'op.col.week': 'Receive in',
  'op.col.release': 'Release in',
  'op.col.quantity': 'Quantity',
  'op.col.reason': 'Why this size',
  'op.col.previous': 'Last week’s plan',
  'op.col.method': 'Sized by',
  'op.col.action': 'Action',
  'op.pallets': '{{value}} pallets',
  'op.late': 'Late to release',
  'op.cover_one': 'Covers {{count}} week',
  'op.cover_other': 'Covers {{count}} weeks',
  'op.moqFlag': 'MOQ above 26 weeks of demand — a sourcing issue for the buyer',

  'op.binding.moq': 'Minimum order quantity',
  'op.binding.orderMultiple': 'Order multiple',
  'op.binding.warehouse': 'Warehouse space',
  'op.binding.changePenalty': 'Kept as planned (inside the lead time)',
  'op.binding.costBalance': 'Ordering against holding cost',
  'op.binding.demand': 'This week’s need',
  'op.saved': '{{value}} less than {{quantity}}',
  'op.saved.none': 'No other size possible',
  'op.previous.none': 'None planned',
  'op.previous.changed': 'Changed',

  'op.method.joint': 'Joint sizing',
  'op.method.wagnerWhitin': 'Fallback: this material alone (Wagner–Whitin)',
  'op.method.interim': 'Fallback: interim round-up (no value on record)',

  'op.action.draft': 'Create draft call-off',
  'op.action.drafted': 'Draft created',
  'op.action.noPo': 'No PO',
  'op.action.noPo.hint':
    'No open agreement with this supplier for this material, so there is nothing to call off against.',
  'op.action.onPo': 'On {{po}}',
  'op.action.releaseWithheld':
    'Drafts from this plan cannot be released to the supplier until the Master Data Management team’s SAP feed is live: the plan is calculated on simulated data.',
  'op.toast.drafted': 'Draft call-off created',
  'op.toast.draftedDesc': 'Release it from the Call-offs page.',
  'op.toast.draftedDescWithheld':
    'It stays a draft on the Call-offs page until the Master Data Management team’s SAP feed is live.',
  'op.toast.refused': 'The draft was not created',

  'op.def.title': 'How the plan is sized',
  'op.def.cost':
    'Total cost: the cost of each order, plus holding (stock × value × the holding rate ÷ 52 each week), plus rented space (pallets above owned capacity × the rented-space rate each week), plus the change penalty for changing an order already inside the supplier’s lead time.',
  'op.def.constraints':
    'Every week’s need is met and the safety stock is held; every order is at least the MOQ and a whole number of order multiples.',
  'op.def.fill':
    'Fill: stock at the end of the week in pallets (quantity ÷ units per pallet) ÷ owned capacity.',
  'op.def.fallback':
    'Where the joint sizing cannot run, a material is sized on its own (Wagner–Whitin, then rounded up to MOQ and multiple) and marked.',
  'op.def.cap':
    'Most rented space: the plan never rents more than the administrator’s share of owned capacity to save money. A week that cannot fit even so is listed above the fill, for the planner to choose between renting beyond the limit and a later delivery.',

  'op.costs.maxRent': 'Most rented space',
  'op.costs.maxRentValue': '{{value}}% of owned capacity',
  'op.costs.placeholderWarehouse': 'Placeholder — the Warehouse to confirm',
  'op.warehouse.maxRented': 'most rented',
  'op.fill.beyondCap': '{{value}} beyond the limit',
  'op.short.title': 'Weeks that do not fit, even with the most rented space',
  'op.short.intro':
    'In these weeks the stock is above owned capacity plus the {{max}} rented pallets the plan may use. Choose for each week: rent beyond the limit, or have a delivery come later.',
  'op.short.notStored':
    'Your choice here is not saved and changes no order: act on it with the 3PL, on the Reschedule open orders page, or by giving a recommended order’s draft call-off a later date on the Call-offs page.',
  'op.short.pallets': '{{value}} pallets short',
  'op.short.against': '{{pallets}} pallets against a limit of {{limit}}',
  'op.short.unavoidable':
    'No change to the recommended orders can fix this week: even ordering each week’s need exactly, the stock already on hand or already confirmed fills the space.',
  'op.short.choose': 'Choose how to cover the shortfall',
  'op.short.rent': 'Rent beyond the limit',
  'op.short.rent.detail': '{{pallets}} pallets for the week at {{rate}} a pallet: {{cost}}.',
  'op.short.later': 'Deliver later',
  'op.short.later.none': 'Nothing arrives by this week that could come later.',
  'op.short.later.enough_one':
    '{{count}} delivery arrives by this week; moving it after the week frees {{movable}} pallets while keeping safety stock — enough.',
  'op.short.later.enough_other':
    '{{count}} deliveries arrive by this week; those that can move after the week while keeping safety stock free {{movable}} pallets — enough.',
  'op.short.later.notEnough_one':
    '{{count}} delivery arrives by this week; moving it while keeping safety stock frees {{movable}} pallets — not enough on its own.',
  'op.short.later.notEnough_other':
    '{{count}} deliveries arrive by this week; those that can move while keeping safety stock free {{movable}} pallets — not enough on their own.',
  'op.short.col.source': 'Delivery',
  'op.short.col.safety': 'Moved after the week',
  'op.short.source.planned': 'Recommended order',
  'op.short.source.confirmed': 'Confirmed order line',
  'op.short.keeps': 'Safety stock holds',
  'op.short.breaks': 'Stock falls below safety stock',
  'op.short.next.rent':
    'Book {{pallets}} more pallets with the 3PL for this week; the rented space cost above already counts them.',
  'op.short.next.later':
    'Ask the supplier to deliver after this week: a confirmed order line is proposed on the Reschedule open orders page; a recommended order’s draft call-off is given a later date on the Call-offs page.',
  'op.short.next.laterLink': 'Open Reschedule open orders'
};

/** @type {Record<string, string>} */
export const orderPlanId = {
  'op.title': 'Rencana pesanan',
  'op.subtitle':
    'Kapan dan berapa banyak memesan, ditentukan bersama untuk semua material dalam satu gudang: kebutuhan setiap minggu terpenuhi, MOQ dan kelipatan pesanan dijaga, dan ruang gudang ditimbang terhadap biaya satu pesanan lagi.',
  'op.meta.plan': 'Rencana barang jadi dibuat',
  'op.meta.horizon': 'Cakupan',
  'op.meta.weeks': '{{count}} minggu',
  'op.meta.noPlan': 'Tidak ada rencana barang jadi',
  'op.meta.previous': 'Perubahan dalam waktu tunggu ditimbang terhadap rencana minggu lalu, per',
  'op.synthetic':
    'Dihitung dengan data sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'op.method':
    'Rencana setiap material dicari secara tepat, lalu material dalam satu gudang direncanakan ulang satu per satu terhadap ruang yang dipakai material lain, sampai tidak ada perubahan yang menurunkan total biaya.',

  'op.costs.title': 'Tarif biaya yang dipakai',
  'op.costs.placeholder': 'Sementara — menunggu konfirmasi Keuangan',
  'op.costs.placeholderPenalty': 'Sementara — menunggu konfirmasi Perencana Material',
  'op.costs.holding': 'Biaya penyimpanan',
  'op.costs.holdingValue': '{{value}}% dari nilai per tahun',
  'op.costs.order': 'Biaya per pesanan',
  'op.costs.rent': 'Ruang sewa, per palet per minggu',
  'op.costs.penalty': 'Penalti perubahan dalam waktu tunggu, per palet',
  'op.costs.where':
    'Diatur di Administrasi → Toleransi dan nilai aturan. Setiap angka rupiah di halaman ini memakainya.',

  'op.warehouse.packaging': 'Gudang kemasan',
  'op.warehouse.rawMaterial': 'Gudang bahan baku',
  'op.warehouse.capacity': 'Kapasitas sendiri',
  'op.warehouse.pallets': '{{value}} palet',
  'op.fallback':
    'Gudang ini tidak dapat dihitung bersama ({{reason}}). Setiap material dihitung sendiri dengan cara cadangan, dan ditandai.',

  'op.kpi.orders': 'Pesanan yang disarankan',
  'op.kpi.orders.sub': 'Pembulatan sementara akan membuat {{count}}',
  'op.kpi.peak': 'Isi tertinggi yang diproyeksikan',
  'op.kpi.peak.sub': 'Terhadap kapasitas sendiri; standarnya 80%',
  'op.kpi.rented': 'Palet-minggu sewa',
  'op.kpi.rented.sub': 'Pembulatan sementara: {{value}}',
  'op.kpi.rentCost': 'Biaya ruang sewa',
  'op.kpi.rentCost.sub': 'Dengan tarif sementara',

  'op.fill.title': 'Proyeksi isi gudang per minggu',
  'op.fill.intro':
    'Stok di akhir setiap minggu, dalam palet, sebagai porsi kapasitas sendiri. Di atas 100% kelebihannya masuk ruang sewa dan dihitung biayanya. Garis terendah adalah stok paling sedikit yang mungkin: kebutuhan setiap minggu tepat, tanpa MOQ atau kelipatan.',
  'op.fill.series.plan': 'Rencana pesanan',
  'op.fill.series.interim': 'Pembulatan sementara',
  'op.fill.series.lowest': 'Terendah yang mungkin',
  'op.fill.line.capacity': 'Kapasitas 100%',
  'op.fill.line.standard': 'Standar 80%',
  'op.fill.col.week': 'Minggu',
  'op.fill.col.plan': 'Rencana pesanan',
  'op.fill.col.interim': 'Pembulatan sementara',
  'op.fill.col.lowest': 'Terendah yang mungkin',
  'op.fill.col.status': 'Terhadap 80%',
  'op.fill.col.rented': 'Palet sewa',
  'op.fill.col.rentCost': 'Biaya ruang sewa',
  'op.fill.status.over': 'Melebihi kapasitas',
  'op.fill.status.above': 'Di atas 80%',
  'op.fill.status.within': 'Dalam 80%',

  'op.recs.title': 'Pesanan yang disarankan',
  'op.recs.intro':
    'Setiap pesanan dengan batasan yang menentukannya dan biaya yang dihematnya. Saran menjadi call-off hanya bila perencana bertindak: dibuat di sini sebagai draf pada perjanjian terbuka pemasok, lalu dirilis di halaman Call-off, tempat sisa perjanjian diperiksa.',
  'op.recs.empty': 'Tidak ada pesanan yang dibutuhkan di gudang ini sepanjang cakupan.',
  'op.col.material': 'Material',
  'op.col.supplier': 'Pemasok',
  'op.col.week': 'Diterima pada',
  'op.col.release': 'Dirilis pada',
  'op.col.quantity': 'Jumlah',
  'op.col.reason': 'Alasan ukuran ini',
  'op.col.previous': 'Rencana minggu lalu',
  'op.col.method': 'Dihitung dengan',
  'op.col.action': 'Tindakan',
  'op.pallets': '{{value}} palet',
  'op.late': 'Terlambat dirilis',
  'op.cover_other': 'Mencakup {{count}} minggu',
  'op.moqFlag': 'MOQ di atas kebutuhan 26 minggu — masalah sumber pasokan bagi pembeli',

  'op.binding.moq': 'Jumlah pesanan minimum',
  'op.binding.orderMultiple': 'Kelipatan pesanan',
  'op.binding.warehouse': 'Ruang gudang',
  'op.binding.changePenalty': 'Dipertahankan sesuai rencana (dalam waktu tunggu)',
  'op.binding.costBalance': 'Biaya pesanan terhadap biaya simpan',
  'op.binding.demand': 'Kebutuhan minggu ini',
  'op.saved': '{{value}} lebih murah daripada {{quantity}}',
  'op.saved.none': 'Tidak ada ukuran lain yang mungkin',
  'op.previous.none': 'Tidak direncanakan',
  'op.previous.changed': 'Berubah',

  'op.method.joint': 'Perhitungan bersama',
  'op.method.wagnerWhitin': 'Cadangan: material ini sendiri (Wagner–Whitin)',
  'op.method.interim': 'Cadangan: pembulatan sementara (nilai tidak tercatat)',

  'op.action.draft': 'Buat draf call-off',
  'op.action.drafted': 'Draf dibuat',
  'op.action.noPo': 'Tidak ada PO',
  'op.action.noPo.hint':
    'Tidak ada perjanjian terbuka dengan pemasok ini untuk material ini, sehingga tidak ada yang dapat di-call-off.',
  'op.action.onPo': 'Pada {{po}}',
  'op.action.releaseWithheld':
    'Draf dari rencana ini tidak dapat dirilis ke pemasok sampai data SAP dari tim Master Data Management tersedia: rencana ini dihitung dengan data simulasi.',
  'op.toast.drafted': 'Draf call-off dibuat',
  'op.toast.draftedDesc': 'Rilis dari halaman Call-off.',
  'op.toast.draftedDescWithheld':
    'Draf tetap di halaman Call-off sampai data SAP dari tim Master Data Management tersedia.',
  'op.toast.refused': 'Draf tidak dibuat',

  'op.def.title': 'Cara rencana dihitung',
  'op.def.cost':
    'Total biaya: biaya setiap pesanan, ditambah biaya simpan (stok × nilai × tarif simpan ÷ 52 setiap minggu), ditambah ruang sewa (palet di atas kapasitas sendiri × tarif ruang sewa setiap minggu), ditambah penalti perubahan bila mengubah pesanan yang sudah masuk waktu tunggu pemasok.',
  'op.def.constraints':
    'Kebutuhan setiap minggu terpenuhi dan stok pengaman terjaga; setiap pesanan minimal MOQ dan kelipatan pesanan yang utuh.',
  'op.def.fill':
    'Isi: stok di akhir minggu dalam palet (jumlah ÷ unit per palet) ÷ kapasitas sendiri.',
  'op.def.fallback':
    'Bila perhitungan bersama tidak dapat dijalankan, material dihitung sendiri (Wagner–Whitin, lalu dibulatkan ke atas ke MOQ dan kelipatan) dan ditandai.',
  'op.def.cap':
    'Ruang sewa terbanyak: rencana tidak pernah menyewa lebih dari bagian kapasitas sendiri yang ditetapkan administrator demi menghemat biaya. Minggu yang tetap tidak muat dicantumkan di atas isi gudang, agar perencana memilih antara menyewa melebihi batas atau pengiriman yang lebih lambat.',

  'op.costs.maxRent': 'Ruang sewa terbanyak',
  'op.costs.maxRentValue': '{{value}}% dari kapasitas sendiri',
  'op.costs.placeholderWarehouse': 'Sementara — menunggu konfirmasi Gudang',
  'op.warehouse.maxRented': 'sewa terbanyak',
  'op.fill.beyondCap': '{{value}} melebihi batas',
  'op.short.title': 'Minggu yang tidak muat, meski dengan ruang sewa terbanyak',
  'op.short.intro':
    'Pada minggu-minggu ini stok melebihi kapasitas sendiri ditambah {{max}} palet sewa yang boleh dipakai rencana. Pilih untuk setiap minggu: menyewa melebihi batas, atau pengiriman datang lebih lambat.',
  'op.short.notStored':
    'Pilihan di sini tidak disimpan dan tidak mengubah pesanan apa pun: tindak lanjuti dengan 3PL, di halaman Jadwal ulang pesanan terbuka, atau dengan memberi draf call-off dari pesanan yang direkomendasikan tanggal yang lebih lambat di halaman Call-off.',
  'op.short.pallets': 'kurang {{value}} palet',
  'op.short.against': '{{pallets}} palet terhadap batas {{limit}}',
  'op.short.unavoidable':
    'Tidak ada perubahan pada pesanan yang direkomendasikan yang dapat mengatasi minggu ini: meski memesan tepat kebutuhan setiap minggu, stok yang sudah ada atau sudah dikonfirmasi memenuhi ruangnya.',
  'op.short.choose': 'Pilih cara menutup kekurangan',
  'op.short.rent': 'Sewa melebihi batas',
  'op.short.rent.detail': '{{pallets}} palet untuk minggu ini dengan {{rate}} per palet: {{cost}}.',
  'op.short.later': 'Kirim lebih lambat',
  'op.short.later.none': 'Tidak ada pengiriman hingga minggu ini yang dapat datang lebih lambat.',
  'op.short.later.enough_other':
    '{{count}} pengiriman tiba hingga minggu ini; yang dapat dipindah setelah minggu itu dengan stok pengaman tetap terjaga membebaskan {{movable}} palet — cukup.',
  'op.short.later.notEnough_other':
    '{{count}} pengiriman tiba hingga minggu ini; yang dapat dipindah dengan stok pengaman tetap terjaga membebaskan {{movable}} palet — belum cukup sendiri.',
  'op.short.col.source': 'Pengiriman',
  'op.short.col.safety': 'Dipindah setelah minggu itu',
  'op.short.source.planned': 'Pesanan yang direkomendasikan',
  'op.short.source.confirmed': 'Baris pesanan terkonfirmasi',
  'op.short.keeps': 'Stok pengaman terjaga',
  'op.short.breaks': 'Stok turun di bawah stok pengaman',
  'op.short.next.rent':
    'Pesan {{pallets}} palet tambahan ke 3PL untuk minggu ini; biaya ruang sewa di atas sudah menghitungnya.',
  'op.short.next.later':
    'Minta pemasok mengirim setelah minggu ini: baris pesanan terkonfirmasi diusulkan di halaman Jadwal ulang pesanan terbuka; draf call-off dari pesanan yang direkomendasikan diberi tanggal yang lebih lambat di halaman Call-off.',
  'op.short.next.laterLink': 'Buka Jadwal ulang pesanan terbuka'
};
