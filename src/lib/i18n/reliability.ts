// Supplier reliability i18n fragment (REQ-E14-02, BL-99). Namespace: rel.*
//
// Business language only (SC-04): the screen says what was measured and over
// how many lines, never which rule decided it. Mono data (rates, counts,
// dates) is rendered through <Data> and never keyed.

export const reliabilityEn: Record<string, string> = {
  // — Planner page —
  'rel.pti.title': 'Supplier reliability',
  'rel.pti.subtitle':
    'Why deliveries are missed: the supplier did not confirm, the supplier missed what it committed, or PTI changed the plan inside the supplier’s lead time.',
  'rel.windowLabel': 'Window',
  'rel.window.13': 'Last 13 weeks',
  'rel.window.26': 'Last 26 weeks',
  'rel.synthetic':
    'Calculated on synthetic data built to reproduce PTI’s current measures. It proves the calculations, not the business answer.',
  'rel.noData': 'No history',
  'rel.empty': 'No supplier has order lines in this window.',

  'rel.kpi.confirmation': 'Confirmed by the deadline',
  'rel.kpi.confirmation.sub': '{{confirmed}} of {{due}} order lines',
  'rel.kpi.commitment': 'Delivered as committed',
  'rel.kpi.commitment.sub': 'Quantity received by the committed date',
  // B6 (FUX-D5) — renamed so it is never read as Supplier performance's
  // "Delivered on the confirmed date" (by quantity, per order, 30 or 90 days).
  'rel.kpi.cfot': 'Confirmed-date lines delivered',
  'rel.kpi.cfot.basis': 'By PO line, last {{weeks}} weeks.',
  'rel.kpi.cfot.sub_one': 'Average over {{count}} purchase order',
  'rel.kpi.cfot.sub_other': 'Average over {{count}} purchase orders',
  'rel.kpi.misses': 'Missed lines',
  'rel.kpi.misses.sub': 'Never confirmed {{never}} · supplier {{supplier}} · PTI {{pti}}',
  'rel.kpi.planChange': 'PTI changes inside lead time',
  'rel.kpi.planChange.sub': '{{changed}} of {{schedules}} order lines',

  'rel.col.supplier': 'Supplier',
  'rel.col.confirmation': 'Confirmed by the deadline',
  'rel.col.commitment': 'Delivered as committed',
  'rel.col.cfot': 'Confirmed-date lines delivered',
  'rel.col.misses': 'Missed lines',
  'rel.col.planChange': 'PTI changed inside lead time',
  'rel.col.masc': 'Size of PTI’s changes',
  'rel.col.mascI': 'Drift since first seen',
  'rel.split.never': 'Never confirmed',
  'rel.split.supplier': 'Supplier',
  'rel.split.pti': 'PTI',
  'rel.sort.ascending': 'Sort by confirmation, lowest first',
  'rel.sort.descending': 'Sort by confirmation, highest first',

  'rel.def.title': 'How these are calculated',
  'rel.def.confirmation':
    'Confirmed by the deadline: order lines the supplier confirmed by their confirmation deadline, out of all lines whose deadline fell in the window.',
  'rel.def.commitment':
    'Delivered as committed: quantity received on or before the committed date, out of the committed quantity. When PTI changes a line and the supplier confirms again, the new confirmation is the commitment.',
  'rel.def.cfot':
    'Confirmed-date lines delivered: per purchase order, the quantity received on or before the confirmed date, and no more than {{early}} days before it, divided by the quantity ordered. Receipts are added together. The confirmed date is the latest confirmation; a change PTI makes counts only once the supplier confirms it again, and a line never confirmed is measured against the date PTI asked for. The figure is the average over the orders whose date falls in the window.',
  'rel.def.misses':
    'Every missed line has one cause. Never confirmed: no confirmation by the deadline. PTI: PTI changed the line inside the supplier’s lead time, or by more than the tolerance (10% per change, 20% in total), and the supplier did not confirm again. Supplier: everything else that arrived short or late.',
  'rel.def.planChange':
    'PTI changed inside lead time: order lines created in the window that PTI changed less than the supplier’s lead time before the requested date.',
  'rel.def.masc':
    'Size of PTI’s changes: the average change between two plan versions for the same weeks, divided by the material’s normal week-to-week movement. 0.5 means the plan moved by half its normal noise. Drift since first seen compares the latest version with the first version the supplier saw for each week.',

  // — Supplier panel —
  'rel.sup.title': 'Your reliability',
  'rel.sup.subtitle':
    'Your order confirmations and deliveries, and how much PTI changed the plan for your materials. You see only your own figures.',
  'rel.sup.empty': 'No order lines for your company in this window.',
};

export const reliabilityId: Record<string, string> = {
  // — Planner page —
  'rel.pti.title': 'Keandalan pemasok',
  'rel.pti.subtitle':
    'Mengapa pengiriman meleset: pemasok tidak mengonfirmasi, pemasok tidak memenuhi komitmennya, atau PTI mengubah rencana di dalam lead time pemasok.',
  'rel.windowLabel': 'Periode',
  'rel.window.13': '13 minggu terakhir',
  'rel.window.26': '26 minggu terakhir',
  'rel.synthetic':
    'Dihitung dengan data sintetis yang dibuat untuk meniru ukuran PTI saat ini. Ini membuktikan perhitungannya, bukan jawaban bisnisnya.',
  'rel.noData': 'Belum ada riwayat',
  'rel.empty': 'Tidak ada pemasok dengan baris pesanan pada periode ini.',

  'rel.kpi.confirmation': 'Dikonfirmasi sebelum tenggat',
  'rel.kpi.confirmation.sub': '{{confirmed}} dari {{due}} baris pesanan',
  'rel.kpi.commitment': 'Dikirim sesuai komitmen',
  'rel.kpi.commitment.sub': 'Jumlah yang diterima sampai tanggal komitmen',
  'rel.kpi.cfot': 'Baris tepat tanggal konfirmasi',
  'rel.kpi.cfot.basis': 'Per baris PO, {{weeks}} minggu terakhir.',
  'rel.kpi.cfot.sub_other': 'Rata-rata dari {{count}} pesanan pembelian',
  'rel.kpi.misses': 'Baris yang meleset',
  'rel.kpi.misses.sub': 'Tidak pernah dikonfirmasi {{never}} · pemasok {{supplier}} · PTI {{pti}}',
  'rel.kpi.planChange': 'Perubahan PTI di dalam lead time',
  'rel.kpi.planChange.sub': '{{changed}} dari {{schedules}} baris pesanan',

  'rel.col.supplier': 'Pemasok',
  'rel.col.confirmation': 'Dikonfirmasi sebelum tenggat',
  'rel.col.commitment': 'Dikirim sesuai komitmen',
  'rel.col.cfot': 'Baris tepat tanggal konfirmasi',
  'rel.col.misses': 'Baris yang meleset',
  'rel.col.planChange': 'Diubah PTI di dalam lead time',
  'rel.col.masc': 'Besar perubahan PTI',
  'rel.col.mascI': 'Pergeseran sejak pertama dilihat',
  'rel.split.never': 'Tidak pernah dikonfirmasi',
  'rel.split.supplier': 'Pemasok',
  'rel.split.pti': 'PTI',
  'rel.sort.ascending': 'Urutkan menurut konfirmasi, terendah dulu',
  'rel.sort.descending': 'Urutkan menurut konfirmasi, tertinggi dulu',

  'rel.def.title': 'Cara menghitungnya',
  'rel.def.confirmation':
    'Dikonfirmasi sebelum tenggat: baris pesanan yang dikonfirmasi pemasok sebelum tenggat konfirmasinya, dari semua baris yang tenggatnya jatuh dalam periode.',
  'rel.def.commitment':
    'Dikirim sesuai komitmen: jumlah yang diterima pada atau sebelum tanggal komitmen, dari jumlah yang dikomitmenkan. Bila PTI mengubah baris dan pemasok mengonfirmasi ulang, konfirmasi baru itulah komitmennya.',
  'rel.def.cfot':
    'Baris tepat tanggal konfirmasi: per pesanan pembelian, jumlah yang diterima pada atau sebelum tanggal yang dikonfirmasi, dan tidak lebih dari {{early}} hari sebelumnya, dibagi jumlah yang dipesan. Penerimaan dijumlahkan. Tanggal yang dikonfirmasi adalah konfirmasi terakhir; perubahan oleh PTI baru dihitung setelah pemasok mengonfirmasinya ulang, dan baris yang tidak pernah dikonfirmasi diukur terhadap tanggal yang diminta PTI. Angkanya adalah rata-rata dari pesanan yang tanggalnya jatuh dalam periode.',
  'rel.def.misses':
    'Setiap baris yang meleset punya satu penyebab. Tidak pernah dikonfirmasi: tidak ada konfirmasi sebelum tenggat. PTI: PTI mengubah baris di dalam lead time pemasok, atau melebihi toleransi (10% per perubahan, 20% total), dan pemasok tidak mengonfirmasi ulang. Pemasok: selebihnya yang datang kurang atau terlambat.',
  'rel.def.planChange':
    'Diubah PTI di dalam lead time: baris pesanan yang dibuat dalam periode dan diubah PTI kurang dari lead time pemasok sebelum tanggal yang diminta.',
  'rel.def.masc':
    'Besar perubahan PTI: rata-rata perubahan antara dua versi rencana untuk minggu yang sama, dibagi pergerakan normal material dari minggu ke minggu. 0,5 berarti rencana bergeser setengah dari gangguan normalnya. Pergeseran sejak pertama dilihat membandingkan versi terakhir dengan versi pertama yang dilihat pemasok untuk tiap minggu.',

  // — Supplier panel —
  'rel.sup.title': 'Keandalan Anda',
  'rel.sup.subtitle':
    'Konfirmasi dan pengiriman pesanan Anda, serta seberapa besar PTI mengubah rencana untuk material Anda. Anda hanya melihat angka Anda sendiri.',
  'rel.sup.empty': 'Tidak ada baris pesanan untuk perusahaan Anda pada periode ini.',
};
