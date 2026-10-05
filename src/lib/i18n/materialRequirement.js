// Material requirement i18n fragment (REQ-E14-03). Namespace: mrq.*
//
// Business language only: the screen says what each figure is and where it
// came from. Mono data (quantities, weeks, dates, codes) is rendered through
// <Data> and never keyed.

/** @type {Record<string, string>} */
export const materialRequirementEn = {
  'mrq.title': 'Material requirement',
  'mrq.subtitle':
    'What each material is needed, when, and how much must be ordered: the finished-goods plan through the bill of materials, net of stock, confirmed deliveries and safety stock.',
  'mrq.meta.plan': 'Finished-goods plan made',
  'mrq.meta.horizon': 'Horizon',
  'mrq.meta.weeks': '{{count}} weeks',
  'mrq.meta.noPlan': 'No finished-goods plan',
  'mrq.synthetic':
    'Calculated on synthetic data built to reproduce PTI’s current measures. It proves the calculations, not the business answer.',
  'mrq.planSource': 'The finished-goods plan is SAP’s until PTI’s own demand forecast is live.',
  'mrq.interim':
    'Planned orders are rounded up to the minimum order quantity and the order multiple only, without weighing warehouse space.',
  'mrq.sized':
    'Planned orders are sized on What to order: MOQ and order multiple kept, and warehouse space weighed against the cost of another order.',
  'mrq.sized.link': 'Open What to order',

  'mrq.receipts.confirmed': 'Confirmed deliveries only',
  'mrq.receipts.include': 'Also count unconfirmed lines',
  'mrq.receipts.includedNote':
    'Unconfirmed order lines are counted at PTI’s requested date and quantity, and marked. A supplier has not committed to them.',

  'mrq.kpi.net': 'Materials with a net requirement',
  'mrq.kpi.net.sub': 'of {{total}} materials',
  'mrq.kpi.orders': 'Planned orders',
  'mrq.kpi.orders.sub': 'Over the horizon',
  'mrq.kpi.late': 'Late to release',
  'mrq.kpi.late.sub': 'Release week already past',
  'mrq.kpi.review': 'Marked for review',
  'mrq.kpi.review.sub': 'Stock count off by more than the tolerance',

  'mrq.col.material': 'Material',
  'mrq.col.supplier': 'Supplier',
  'mrq.col.leadTime': 'Lead time',
  'mrq.col.safetyStock': 'Safety stock',
  'mrq.col.stock': 'Stock on hand',
  'mrq.col.net': 'Net requirement',
  'mrq.filter.needsOrder': 'Needs order',
  'mrq.filter.empty': 'No material has a net requirement over the horizon.',
  'mrq.col.orders': 'Planned orders',
  'mrq.col.late': 'Late',
  'mrq.days': '{{count}} days',
  'mrq.plusSafetyLead': '+ {{count}} days safety lead time',
  'mrq.review': 'Review',
  'mrq.review.hint': 'Stock accuracy check failed: recommendations wait for the planner.',
  'mrq.noSource': 'No supplier',
  'mrq.empty': 'No material in the plan.',

  'mrq.ssSource.engine': 'From forecast errors',
  'mrq.ssSource.sap': 'SAP value (too little history)',
  'mrq.ssSource.sapPlaceholder': 'SAP value (placeholder)',
  'mrq.ssSource.none': 'None set',

  'mrq.detail.title': 'Week by week',
  'mrq.detail.select': 'Select a material to see its weeks.',
  'mrq.detail.stockDate': 'Stock as of',
  'mrq.detail.noStock': 'No stock record: treated as zero and marked for review.',
  'mrq.wk.week': 'Week',
  'mrq.wk.gross': 'Gross requirement',
  'mrq.wk.start': 'Stock at start',
  'mrq.wk.receipts': 'Confirmed receipts',
  'mrq.wk.safety': 'Safety stock',
  'mrq.wk.net': 'Net requirement',
  'mrq.wk.planned': 'Planned order',
  'mrq.wk.release': 'Release week',
  'mrq.wk.end': 'Stock at end',
  'mrq.wk.unconfirmed': 'incl. {{qty}} unconfirmed',
  'mrq.wk.late': 'Late to release',
  'mrq.wk.openPegs': 'Show the finished goods behind {{qty}}',

  'mrq.pegs.title': 'Finished goods behind the gross requirement',
  'mrq.pegs.week': 'Week',
  'mrq.pegs.sku': 'Finished good',
  'mrq.pegs.fgQty': 'Finished-good quantity',
  'mrq.pegs.scrap': 'Scrap',
  'mrq.pegs.yield': 'Yield',
  'mrq.pegs.part': 'Requirement',
  'mrq.pegs.close': 'Close',
  'mrq.pegs.total': 'Total',

  'mrq.def.title': 'How it is calculated',
  'mrq.def.gross':
    'Gross requirement: the finished-goods quantities that use the material × the quantity per unit × (1 + scrap) ÷ yield. Yield is the share of the material that ends up in good finished goods; 100% means no loss. Sales orders replace the forecast in the weeks they fall into, so the two are not counted twice.',
  'mrq.def.net':
    'Net requirement: gross requirement + safety stock − (stock at the start of the week + confirmed receipts in the week), and never below zero. Receipts count at the date and quantity the supplier confirmed.',
  'mrq.def.planned':
    'Planned order: sized on What to order — at least the net requirement and the minimum order quantity, a whole number of order multiples, and possibly covering later weeks where one order costs less than several. It is released the lead time (plus any safety lead time) before the week it is needed.',
  'mrq.def.end': 'Stock at end: stock at start + receipts + planned order − gross requirement.'
};

/** @type {Record<string, string>} */
export const materialRequirementId = {
  'mrq.title': 'Kebutuhan material',
  'mrq.subtitle':
    'Berapa kebutuhan setiap material, kapan, dan berapa yang harus dipesan: rencana barang jadi melalui daftar bahan, dikurangi stok, pengiriman terkonfirmasi, dan stok pengaman.',
  'mrq.meta.plan': 'Rencana barang jadi dibuat',
  'mrq.meta.horizon': 'Cakupan',
  'mrq.meta.weeks': '{{count}} minggu',
  'mrq.meta.noPlan': 'Tidak ada rencana barang jadi',
  'mrq.synthetic':
    'Dihitung dengan data sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'mrq.planSource':
    'Rencana barang jadi berasal dari SAP sampai prakiraan permintaan PTI sendiri aktif.',
  'mrq.interim':
    'Pesanan terencana hanya dibulatkan ke atas ke jumlah pesanan minimum dan kelipatan pesanan, tanpa menimbang ruang gudang.',
  'mrq.sized':
    'Pesanan terencana ditentukan di Apa yang dipesan: MOQ dan kelipatan pesanan dijaga, dan ruang gudang ditimbang terhadap biaya satu pesanan lagi.',
  'mrq.sized.link': 'Buka Apa yang dipesan',

  'mrq.receipts.confirmed': 'Hanya pengiriman terkonfirmasi',
  'mrq.receipts.include': 'Ikut hitung baris belum dikonfirmasi',
  'mrq.receipts.includedNote':
    'Baris pesanan yang belum dikonfirmasi dihitung pada tanggal dan jumlah yang diminta PTI, dan ditandai. Pemasok belum berkomitmen atasnya.',

  'mrq.kpi.net': 'Material dengan kebutuhan bersih',
  'mrq.kpi.net.sub': 'dari {{total}} material',
  'mrq.kpi.orders': 'Pesanan terencana',
  'mrq.kpi.orders.sub': 'Sepanjang cakupan',
  'mrq.kpi.late': 'Terlambat dirilis',
  'mrq.kpi.late.sub': 'Minggu rilis sudah lewat',
  'mrq.kpi.review': 'Ditandai untuk ditinjau',
  'mrq.kpi.review.sub': 'Hitung stok meleset melebihi toleransi',

  'mrq.col.material': 'Material',
  'mrq.col.supplier': 'Pemasok',
  'mrq.col.leadTime': 'Waktu tunggu',
  'mrq.col.safetyStock': 'Stok pengaman',
  'mrq.col.stock': 'Stok tersedia',
  'mrq.col.net': 'Kebutuhan bersih',
  'mrq.filter.needsOrder': 'Perlu dipesan',
  'mrq.filter.empty': 'Tidak ada material dengan kebutuhan bersih dalam cakupan.',
  'mrq.col.orders': 'Pesanan terencana',
  'mrq.col.late': 'Terlambat',
  'mrq.days': '{{count}} hari',
  'mrq.plusSafetyLead': '+ {{count}} hari waktu tunggu pengaman',
  'mrq.review': 'Tinjau',
  'mrq.review.hint': 'Pemeriksaan akurasi stok gagal: rekomendasi menunggu perencana.',
  'mrq.noSource': 'Tidak ada pemasok',
  'mrq.empty': 'Tidak ada material dalam rencana.',

  'mrq.ssSource.engine': 'Dari kesalahan prakiraan',
  'mrq.ssSource.sap': 'Nilai SAP (riwayat terlalu sedikit)',
  'mrq.ssSource.sapPlaceholder': 'Nilai SAP (sementara)',
  'mrq.ssSource.none': 'Belum diatur',

  'mrq.detail.title': 'Per minggu',
  'mrq.detail.select': 'Pilih material untuk melihat minggunya.',
  'mrq.detail.stockDate': 'Stok per',
  'mrq.detail.noStock': 'Tidak ada catatan stok: dianggap nol dan ditandai untuk ditinjau.',
  'mrq.wk.week': 'Minggu',
  'mrq.wk.gross': 'Kebutuhan kotor',
  'mrq.wk.start': 'Stok awal',
  'mrq.wk.receipts': 'Penerimaan terkonfirmasi',
  'mrq.wk.safety': 'Stok pengaman',
  'mrq.wk.net': 'Kebutuhan bersih',
  'mrq.wk.planned': 'Pesanan terencana',
  'mrq.wk.release': 'Minggu rilis',
  'mrq.wk.end': 'Stok akhir',
  'mrq.wk.unconfirmed': 'termasuk {{qty}} belum dikonfirmasi',
  'mrq.wk.late': 'Terlambat dirilis',
  'mrq.wk.openPegs': 'Tampilkan barang jadi di balik {{qty}}',

  'mrq.pegs.title': 'Barang jadi di balik kebutuhan kotor',
  'mrq.pegs.week': 'Minggu',
  'mrq.pegs.sku': 'Barang jadi',
  'mrq.pegs.fgQty': 'Jumlah barang jadi',
  'mrq.pegs.scrap': 'Susut',
  'mrq.pegs.yield': 'Hasil (yield)',
  'mrq.pegs.part': 'Kebutuhan',
  'mrq.pegs.close': 'Tutup',
  'mrq.pegs.total': 'Total',

  'mrq.def.title': 'Cara menghitungnya',
  'mrq.def.gross':
    'Kebutuhan kotor: jumlah barang jadi yang memakai material × jumlah per unit × (1 + susut) ÷ hasil (yield). Hasil adalah bagian material yang menjadi barang jadi yang baik; 100% berarti tidak ada kehilangan. Pesanan penjualan menggantikan prakiraan pada minggunya, sehingga keduanya tidak dihitung dua kali.',
  'mrq.def.net':
    'Kebutuhan bersih: kebutuhan kotor + stok pengaman − (stok awal minggu + penerimaan terkonfirmasi pada minggu itu), dan tidak pernah di bawah nol. Penerimaan dihitung pada tanggal dan jumlah yang dikonfirmasi pemasok.',
  'mrq.def.planned':
    'Pesanan terencana: ditentukan di Apa yang dipesan — minimal kebutuhan bersih dan jumlah pesanan minimum, kelipatan pesanan yang utuh, dan dapat mencakup minggu berikutnya bila satu pesanan lebih murah daripada beberapa. Dirilis sebesar waktu tunggu (ditambah waktu tunggu pengaman, bila ada) sebelum minggu kebutuhannya.',
  'mrq.def.end': 'Stok akhir: stok awal + penerimaan + pesanan terencana − kebutuhan kotor.'
};
