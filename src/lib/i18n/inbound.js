// Inbound acknowledgments i18n fragment (AIB-2, BL-350). Namespace: inbound.*
// Flat dot-keys, mirrors src/lib/i18n.js. The Expeditor's list: the inbound's
// identity (ASN, PO, Surat Jalan, sequence, ETA), SAP's receipt result, the
// acknowledgment (who and when) and the one-working-day deadline.
//
// Document numbers, quantities and dates are DATA and render through <Data> and
// the formatters; the GR status tokens localize through StatusPill's central
// status map, never here.
/** @type {Record<string, string>} */
export const inboundEn = {
  'inbound.header.title': 'Inbound acknowledgments',
  'inbound.header.subtitle':
    'Review what is arriving and confirm PTI has seen it. The goods receipt and its quality status come from SAP.',
  'inbound.meta.summary': '{{inbounds}} inbounds · {{overdue}} overdue for review',
  'inbound.tab.all': 'All inbounds',
  'inbound.tab.awaiting': 'Awaiting acknowledgment',
  'inbound.tab.overdue': 'Overdue',
  'inbound.tab.acknowledged': 'Acknowledged',
  'inbound.search.label': 'Search inbounds',
  'inbound.search.placeholder': 'Search ASN, PO, supplier or Surat Jalan…',
  'inbound.list.empty': 'No inbound matches this view.',
  'inbound.col.asn': 'ASN',
  'inbound.col.supplier': 'Supplier',
  'inbound.col.po': 'PO',
  'inbound.col.sj': 'Surat Jalan (SJ)',
  'inbound.col.sequence': 'Sequence',
  'inbound.col.eta': 'Expected arrival',
  'inbound.col.qty': 'Shipped qty',
  'inbound.col.gr': 'Goods receipt (SAP)',
  'inbound.col.due': 'Acknowledgment due',
  'inbound.col.ack': 'Acknowledgment',
  'inbound.none': '—',
  'inbound.gr.rejected': '{{qty}} rejected',
  'inbound.gr.notPosted': 'Not posted in SAP yet',
  'inbound.due.acknowledged': 'Acknowledged',
  'inbound.due.overdue': 'Overdue',
  'inbound.due.by': 'By {{at}}',
  'inbound.action.acknowledge': 'Acknowledge',
  'inbound.ack.success': '{{asnNumber}} acknowledged',
  'inbound.ack.failed': '{{asnNumber}} was not acknowledged',
  'inbound.empty.title': 'No inbounds yet',
  'inbound.empty.subtitle': 'An ASN appears here once the supplier has submitted it.',
  'inbound.empty.message': 'Submitted advance ship notices will appear in this list.'
};

/** @type {Record<string, string>} */
export const inboundId = {
  'inbound.header.title': 'Konfirmasi inbound',
  'inbound.header.subtitle':
    'Tinjau apa yang akan datang dan konfirmasi bahwa PTI telah melihatnya. Penerimaan barang dan status kualitasnya berasal dari SAP.',
  'inbound.meta.summary': '{{inbounds}} inbound · {{overdue}} terlambat ditinjau',
  'inbound.tab.all': 'Semua inbound',
  'inbound.tab.awaiting': 'Menunggu konfirmasi',
  'inbound.tab.overdue': 'Terlambat',
  'inbound.tab.acknowledged': 'Sudah dikonfirmasi',
  'inbound.search.label': 'Cari inbound',
  'inbound.search.placeholder': 'Cari ASN, PO, pemasok atau Surat Jalan…',
  'inbound.list.empty': 'Tidak ada inbound yang cocok dengan tampilan ini.',
  'inbound.col.asn': 'ASN',
  'inbound.col.supplier': 'Pemasok',
  'inbound.col.po': 'PO',
  'inbound.col.sj': 'Surat Jalan (SJ)',
  'inbound.col.sequence': 'Sekuens',
  'inbound.col.eta': 'Perkiraan kedatangan',
  'inbound.col.qty': 'Jumlah dikirim',
  'inbound.col.gr': 'Penerimaan barang (SAP)',
  'inbound.col.due': 'Batas konfirmasi',
  'inbound.col.ack': 'Konfirmasi',
  'inbound.none': '—',
  'inbound.gr.rejected': '{{qty}} ditolak',
  'inbound.gr.notPosted': 'Belum diposting di SAP',
  'inbound.due.acknowledged': 'Sudah dikonfirmasi',
  'inbound.due.overdue': 'Terlambat',
  'inbound.due.by': 'Paling lambat {{at}}',
  'inbound.action.acknowledge': 'Konfirmasi',
  'inbound.ack.success': '{{asnNumber}} sudah dikonfirmasi',
  'inbound.ack.failed': '{{asnNumber}} gagal dikonfirmasi',
  'inbound.empty.title': 'Belum ada inbound',
  'inbound.empty.subtitle': 'ASN muncul di sini setelah pemasok mengirimkannya.',
  'inbound.empty.message': 'Pemberitahuan pengiriman yang sudah dikirim akan tampil di daftar ini.'
};
