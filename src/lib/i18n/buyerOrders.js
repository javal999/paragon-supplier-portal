// BuyerOrders i18n fragment (Batch 3). Namespace: buyerOrders.*
// Flat dot-keys, mirrors src/lib/i18n.js. Wired into i18n.js by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.js).
// Canonical StatusPill children (POStatus values) and ChannelType enum values
// are localized centrally / are data — NOT re-declared here. The fabricated
// communication-history previews (buildComms) are mock data (i18n-defer).
/** @type {Record<string, string>} */
export const buyerOrdersEn = {
  // — Breadcrumb —
  'buyerOrders.crumb.transact': 'TRANSACT',
  'buyerOrders.crumb.purchaseOrders': 'PURCHASE ORDERS',
  // — Page header —
  // IA P-11 — the page title is the menu label.
  'buyerOrders.header.title': 'Purchase orders',
  'buyerOrders.header.subtitle':
    'Active and historical purchase orders across your supplier network.',
  // — Header actions —
  'buyerOrders.action.export': 'Export',
  'buyerOrders.action.bulkDownload': 'Bulk download',
  'buyerOrders.action.newPo': 'New PO',
  // — Meta line —
  'buyerOrders.meta.summary.one': '{{count}} record · last updated {{date}}',
  'buyerOrders.meta.summary.other': '{{count}} records · last updated {{date}}',
  // — KPI cards —
  'buyerOrders.kpi.open.subtitle': 'Across all suppliers',
  'buyerOrders.kpi.pending.subtitle': 'Awaiting supplier ack',
  'buyerOrders.kpi.transit.subtitle': 'Confirmed + shipping',
  'buyerOrders.kpi.overdue.subtitle.past': 'Past requested delivery',
  'buyerOrders.kpi.overdue.subtitle.onSchedule': 'On schedule',
  // — Group tabs —
  'buyerOrders.tab.all': 'All',
  'buyerOrders.tab.pending': 'Pending',
  'buyerOrders.tab.confirmed': 'Confirmed',
  'buyerOrders.tab.transit': 'In Transit',
  'buyerOrders.tab.delivered': 'Delivered',
  'buyerOrders.tab.closed': 'Closed',
  // — Range filter —
  'buyerOrders.range.7d': 'Last 7 days',
  'buyerOrders.range.30d': 'Last 30 days',
  'buyerOrders.range.90d': 'Last 90 days',
  'buyerOrders.range.all': 'All time',
  // — Search —
  'buyerOrders.search.placeholder': 'Search by PO number, supplier, or material…',
  // — Table —
  'buyerOrders.table.col.po': 'PO #',
  'buyerOrders.table.col.supplier': 'Supplier',
  'buyerOrders.table.col.material': 'Material / Category',
  'buyerOrders.table.col.orderDate': 'Order date',
  'buyerOrders.table.col.delivery': 'Delivery',
  'buyerOrders.table.col.value': 'Value',
  'buyerOrders.table.col.channel': 'Channel',
  'buyerOrders.table.col.status': 'Status',
  'buyerOrders.table.col.actions': 'Actions',
  'buyerOrders.table.moreLines.one': '+{{count}} more line',
  'buyerOrders.table.moreLines.other': '+{{count}} more lines',
  'buyerOrders.table.overdue': '+{{count}}d overdue',
  'buyerOrders.table.empty': 'No purchase orders match the current filters.',
  // — Empty state (wrapper) —
  'buyerOrders.empty.title': 'No purchase orders yet',
  'buyerOrders.empty.subtitle': 'Purchase orders across your supplier network appear here.',
  'buyerOrders.empty.message':
    'When POs are issued they show up here with their lifecycle and line items.',
  // — Side panel —
  'buyerOrders.panel.title': 'PO {{poNumber}} — {{supplier}}',
  'buyerOrders.panel.keyFacts': 'Key facts',
  'buyerOrders.panel.lineItems': 'Line items',
  'buyerOrders.panel.lifecycle': 'Lifecycle',
  'buyerOrders.panel.field.orderDate': 'Order date',
  'buyerOrders.panel.field.deliveryDate': 'Delivery date',
  'buyerOrders.panel.field.totalValue': 'Total value',
  'buyerOrders.panel.field.channel': 'Channel',
  'buyerOrders.panel.field.status': 'Status',
  'buyerOrders.panel.field.currency': 'Currency',
  'buyerOrders.panel.field.incoterms': 'Incoterms',
  'buyerOrders.panel.field.paymentTerms': 'Payment terms',
  // — Line-items table —
  'buyerOrders.lines.col.material': 'Material',
  'buyerOrders.lines.col.qty': 'Qty',
  'buyerOrders.lines.col.unit': 'Unit price',
  'buyerOrders.lines.col.lineTotal': 'Line total',
  'buyerOrders.lines.total': 'Total',
  // — Side-panel footer actions —
  'buyerOrders.footer.viewFullDetails': 'View Full Details',
  'buyerOrders.footer.sendReminder': 'Send reminder',
  'buyerOrders.footer.requestAsn': 'Request ASN',
  'buyerOrders.footer.trackShipment': 'Track shipment',
  'buyerOrders.footer.viewGr': 'View GR',
  // — UCX-P7 (BL-368) · UCX-D22 — the escalated PO's acts. [Proposed] labels.
  'buyerOrders.escalation.title': 'Escalated: no answer from the supplier',
  'buyerOrders.escalation.intro': 'The supplier has not answered by {{date}}.',
  'buyerOrders.escalation.ask': 'Ask the supplier to confirm',
  'buyerOrders.escalation.asked': 'Asked the supplier on {{date}}.',
  'buyerOrders.escalation.decisionLabel': 'Record what PTI did',
  'buyerOrders.escalation.choose': 'Choose…',
  'buyerOrders.escalation.record': 'Record the decision',
  'buyerOrders.escalation.recorded': 'Recorded: {{decision}}, {{date}}',
  'buyerOrders.escalation.recordedToast': 'Recorded for {{po}}.',
  'buyerOrders.escalation.askedToast': 'The ask is recorded for {{po}}.',
  'buyerOrders.escalation.refused': 'The record was refused: {{reason}}',
  'buyerOrders.escalation.decision.supplierConfirmedOutside':
    'The supplier confirmed outside the hub',
  'buyerOrders.escalation.decision.sourcingElsewhere': 'Sourcing elsewhere',
  'buyerOrders.escalation.decision.cancellingInSap': 'Cancelling the PO in SAP',
  'buyerOrders.escalation.decision.stillWaiting': 'Still waiting for the supplier',
  // — UCX-P7 · UCX-F16 — the figures that decide a counter-offer or a call-off
  //   approval (shared with the call-off panel). [Proposed] labels.
  'buyerOrders.pairFacts.open': 'Open balance: {{qty}} {{uom}} not yet called off',
  'buyerOrders.pairFacts.openNone': 'Open balance: nothing on record',
  'buyerOrders.pairFacts.cover': 'Cover: {{days}} days against a {{lead}}-day lead time',
  'buyerOrders.pairFacts.coverNone': 'Cover: not on record',
  // UCX-P7 — the SAP prompt after an accepted counter-offer (UCX-D16: CR-05 unchanged).
  'buyerOrders.counter.sapPrompt':
    'Accepted. Change the PO in SAP so the order matches the counter-offer.',
  // — Communication-history toggle —
  'buyerOrders.comms.show': 'Show',
  'buyerOrders.comms.hide': 'Hide',
  'buyerOrders.comms.history.one': 'communication history ({{count}} message)',
  'buyerOrders.comms.history.other': 'communication history ({{count}} messages)',
  // — Lifecycle timeline —
  'buyerOrders.timeline.created': 'PO Created',
  'buyerOrders.timeline.sent': 'Sent to Supplier',
  'buyerOrders.timeline.acknowledged': 'Acknowledged by Supplier',
  'buyerOrders.timeline.asn': 'ASN Received',
  'buyerOrders.timeline.goodsReceived': 'Goods Received',
  'buyerOrders.timeline.invoiceSubmitted': 'Invoice Submitted',
  'buyerOrders.timeline.paymentPosted': 'Payment Posted',
  'buyerOrders.timeline.ackAfter': '{{hours}}h after send'
};

/** @type {Record<string, string>} */
export const buyerOrdersId = {
  // — Breadcrumb —
  'buyerOrders.crumb.transact': 'TRANSAKSI',
  'buyerOrders.crumb.purchaseOrders': 'PESANAN PEMBELIAN',
  // — Page header —
  'buyerOrders.header.title': 'Pesanan pembelian',
  'buyerOrders.header.subtitle':
    'Pesanan pembelian aktif dan historis di seluruh jaringan pemasok Anda.',
  // — Header actions —
  'buyerOrders.action.export': 'Ekspor',
  'buyerOrders.action.bulkDownload': 'Unduh massal',
  'buyerOrders.action.newPo': 'PO Baru',
  // — Meta line —
  'buyerOrders.meta.summary.one': '{{count}} catatan · terakhir diperbarui {{date}}',
  'buyerOrders.meta.summary.other': '{{count}} catatan · terakhir diperbarui {{date}}',
  // — KPI cards —
  'buyerOrders.kpi.open.subtitle': 'Di semua pemasok',
  'buyerOrders.kpi.pending.subtitle': 'Menunggu pengakuan pemasok',
  'buyerOrders.kpi.transit.subtitle': 'Dikonfirmasi + pengiriman',
  'buyerOrders.kpi.overdue.subtitle.past': 'Melewati pengiriman yang diminta',
  'buyerOrders.kpi.overdue.subtitle.onSchedule': 'Sesuai jadwal',
  // — Group tabs —
  'buyerOrders.tab.all': 'Semua',
  'buyerOrders.tab.pending': 'Menunggu',
  'buyerOrders.tab.confirmed': 'Dikonfirmasi',
  'buyerOrders.tab.transit': 'Dalam Perjalanan',
  'buyerOrders.tab.delivered': 'Terkirim',
  'buyerOrders.tab.closed': 'Ditutup',
  // — Range filter —
  'buyerOrders.range.7d': '7 hari terakhir',
  'buyerOrders.range.30d': '30 hari terakhir',
  'buyerOrders.range.90d': '90 hari terakhir',
  'buyerOrders.range.all': 'Sepanjang waktu',
  // — Search —
  'buyerOrders.search.placeholder': 'Cari berdasarkan nomor PO, pemasok, atau material…',
  // — Table —
  'buyerOrders.table.col.po': 'No. PO',
  'buyerOrders.table.col.supplier': 'Pemasok',
  'buyerOrders.table.col.material': 'Material / Kategori',
  'buyerOrders.table.col.orderDate': 'Tanggal pesanan',
  'buyerOrders.table.col.delivery': 'Pengiriman',
  'buyerOrders.table.col.value': 'Nilai',
  'buyerOrders.table.col.channel': 'Kanal',
  'buyerOrders.table.col.status': 'Status',
  'buyerOrders.table.col.actions': 'Tindakan',
  'buyerOrders.table.moreLines.one': '+{{count}} baris lagi',
  'buyerOrders.table.moreLines.other': '+{{count}} baris lagi',
  'buyerOrders.table.overdue': '+{{count}}h terlambat',
  'buyerOrders.table.empty': 'Tidak ada pesanan pembelian yang cocok dengan filter saat ini.',
  // — Empty state (wrapper) —
  'buyerOrders.empty.title': 'Belum ada pesanan pembelian',
  'buyerOrders.empty.subtitle':
    'Pesanan pembelian di seluruh jaringan pemasok Anda muncul di sini.',
  'buyerOrders.empty.message':
    'Saat PO diterbitkan, mereka muncul di sini beserta siklus hidup dan item barisnya.',
  // — Side panel —
  'buyerOrders.panel.title': 'PO {{poNumber}} — {{supplier}}',
  'buyerOrders.panel.keyFacts': 'Fakta utama',
  'buyerOrders.panel.lineItems': 'Item baris',
  'buyerOrders.panel.lifecycle': 'Siklus hidup',
  'buyerOrders.panel.field.orderDate': 'Tanggal pesanan',
  'buyerOrders.panel.field.deliveryDate': 'Tanggal pengiriman',
  'buyerOrders.panel.field.totalValue': 'Nilai total',
  'buyerOrders.panel.field.channel': 'Kanal',
  'buyerOrders.panel.field.status': 'Status',
  'buyerOrders.panel.field.currency': 'Mata uang',
  'buyerOrders.panel.field.incoterms': 'Incoterms',
  'buyerOrders.panel.field.paymentTerms': 'Syarat pembayaran',
  // — Line-items table —
  'buyerOrders.lines.col.material': 'Material',
  'buyerOrders.lines.col.qty': 'Jml',
  'buyerOrders.lines.col.unit': 'Harga satuan',
  'buyerOrders.lines.col.lineTotal': 'Total baris',
  'buyerOrders.lines.total': 'Total',
  // — Side-panel footer actions —
  'buyerOrders.footer.viewFullDetails': 'Lihat Detail Lengkap',
  'buyerOrders.footer.sendReminder': 'Kirim pengingat',
  'buyerOrders.footer.requestAsn': 'Minta ASN',
  'buyerOrders.footer.trackShipment': 'Lacak pengiriman',
  'buyerOrders.footer.viewGr': 'Lihat GR',
  'buyerOrders.escalation.title': 'Eskalasi: belum ada jawaban dari pemasok',
  'buyerOrders.escalation.intro': 'Pemasok belum menjawab sampai {{date}}.',
  'buyerOrders.escalation.ask': 'Minta pemasok mengonfirmasi',
  'buyerOrders.escalation.asked': 'Permintaan dikirim ke pemasok pada {{date}}.',
  'buyerOrders.escalation.decisionLabel': 'Catat tindakan PTI',
  'buyerOrders.escalation.choose': 'Pilih…',
  'buyerOrders.escalation.record': 'Catat keputusan',
  'buyerOrders.escalation.recorded': 'Tercatat: {{decision}}, {{date}}',
  'buyerOrders.escalation.recordedToast': 'Tercatat untuk {{po}}.',
  'buyerOrders.escalation.askedToast': 'Permintaan tercatat untuk {{po}}.',
  'buyerOrders.escalation.refused': 'Pencatatan ditolak: {{reason}}',
  'buyerOrders.escalation.decision.supplierConfirmedOutside': 'Pemasok mengonfirmasi di luar hub',
  'buyerOrders.escalation.decision.sourcingElsewhere': 'Mencari sumber lain',
  'buyerOrders.escalation.decision.cancellingInSap': 'Membatalkan PO di SAP',
  'buyerOrders.escalation.decision.stillWaiting': 'Masih menunggu pemasok',
  'buyerOrders.pairFacts.open': 'Saldo terbuka: {{qty}} {{uom}} belum di-call-off',
  'buyerOrders.pairFacts.openNone': 'Saldo terbuka: belum ada catatan',
  'buyerOrders.pairFacts.cover': 'Cover: {{days}} hari terhadap lead time {{lead}} hari',
  'buyerOrders.pairFacts.coverNone': 'Cover: tidak ada catatan',
  'buyerOrders.counter.sapPrompt':
    'Diterima. Ubah PO di SAP agar pesanan sesuai dengan counter-offer.',
  // — Communication-history toggle —
  'buyerOrders.comms.show': 'Tampilkan',
  'buyerOrders.comms.hide': 'Sembunyikan',
  'buyerOrders.comms.history.one': 'riwayat komunikasi ({{count}} pesan)',
  'buyerOrders.comms.history.other': 'riwayat komunikasi ({{count}} pesan)',
  // — Lifecycle timeline —
  'buyerOrders.timeline.created': 'PO Dibuat',
  'buyerOrders.timeline.sent': 'Dikirim ke Pemasok',
  'buyerOrders.timeline.acknowledged': 'Diakui oleh Pemasok',
  'buyerOrders.timeline.asn': 'ASN Diterima',
  'buyerOrders.timeline.goodsReceived': 'Barang Diterima',
  'buyerOrders.timeline.invoiceSubmitted': 'Faktur Diajukan',
  'buyerOrders.timeline.paymentPosted': 'Pembayaran Diposting',
  'buyerOrders.timeline.ackAfter': '{{hours}} jam setelah dikirim'
};
