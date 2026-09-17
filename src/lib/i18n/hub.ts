// Supplier Hub navigation and Home i18n fragment. Namespace: hub.*
//
// The menu follows SUPPLIER-HUB-REQUIREMENTS.md §3.7; Home follows §3.8 (SC-01).
// Names are business words only (SC-04): one name per object, the same on the
// PTI side and the supplier side wherever the object is the same.

export const hubEn: Record<string, string> = {
  // Persona switch (NV-02)
  'hub.persona.pti': 'PTI',
  'hub.persona.supplier': 'Supplier',

  // Sections
  'hub.nav.section.home': 'Home',
  'hub.nav.section.orders': 'Order collaboration',
  'hub.nav.section.supplierOrders': 'Orders',
  'hub.nav.section.forecast': 'Forecast',
  'hub.nav.section.inventory': 'Inventory & capacity',
  'hub.nav.section.calloffs': 'Call-offs',
  'hub.nav.section.sourcing': 'Sourcing',
  'hub.nav.section.invoices': 'Invoices',
  'hub.nav.section.performance': 'Performance',
  'hub.nav.section.planning': 'Planning',
  'hub.nav.section.company': 'Company',

  // PTI items
  'hub.nav.pti.tasks': 'My tasks',
  'hub.nav.pti.replies': 'Supplier replies',
  'hub.nav.pti.purchaseOrders': 'Purchase orders',
  'hub.nav.pti.shipments': 'Shipments & ASN',
  'hub.nav.pti.goodsReceipts': 'Goods receipts',
  'hub.nav.pti.commitments': 'Commitments & gaps',
  'hub.nav.pti.inventory': 'Inventory',
  'hub.nav.pti.callOffs': 'Call-offs',
  'hub.nav.pti.rfx': 'RFI · RFQ · RFP',
  'hub.nav.pti.suppliers': 'Suppliers',
  'hub.nav.pti.invoices': 'Invoices',
  'hub.nav.pti.performance': 'Supplier performance',

  // Supplier items
  'hub.nav.sup.todo': 'To do',
  'hub.nav.sup.purchaseOrders': 'Purchase orders',
  'hub.nav.sup.callOffs': 'Call-offs',
  'hub.nav.sup.shipments': 'Shipments & ASN',
  'hub.nav.sup.forecast': 'Forecast & commitments',
  'hub.nav.sup.stock': 'Stock',
  'hub.nav.sup.invitations': 'Invitations',
  'hub.nav.sup.invoices': 'Invoices',
  'hub.nav.sup.performance': 'My performance',
  'hub.nav.sup.documents': 'Profile & documents',

  // User menu (NV-01)
  'hub.nav.util.title': 'Help & administration',
  'hub.nav.util.glossary': 'Help & glossary',
  'hub.nav.util.roles': 'Roles',
  'hub.nav.util.processFlows': 'Process flows',

  // PTI role view (NV-02)
  'hub.role.title': 'Menu for',
  'hub.role.hint': 'Shows the menu sections for this role. It does not change what you are allowed to do.',
  'hub.role.MP': 'Material Planner',
  'hub.role.BUY': 'Buyer',
  'hub.role.FIN': 'Finance',
  'hub.role.ALL': 'All PTI roles',

  // Home (SC-01)
  'hub.home.crumb': 'Home',
  'hub.home.pti.title': 'My tasks',
  'hub.home.pti.subtitle': 'What needs your action, most urgent first.',
  'hub.home.sup.title': 'To do',
  'hub.home.sup.subtitle': 'What Paragon is waiting for from you, most urgent first.',
  'hub.home.empty.title': 'Nothing needs your action',
  'hub.home.empty.body': 'New tasks appear here as soon as something is waiting for you.',
  'hub.home.open': 'Open',
  'hub.home.count.one': '{{count}} item',
  'hub.home.count.other': '{{count}} items',
  'hub.home.severity.critical': 'Urgent',
  'hub.home.severity.warning': 'Due soon',
  'hub.home.severity.info': 'To review',

  'hub.home.task.unackPo': 'Purchase orders with no supplier response after 48 hours',
  'hub.home.task.receipts': 'Goods receipts to review',
  'hub.home.task.inboundAsn': 'Inbound shipments to receive',
  'hub.home.task.chase': 'Suppliers to follow up on forecasts or deliveries',
  'hub.home.task.rfqAward': 'Sourcing events ready to award',
  'hub.home.task.overdueInvoices': 'Overdue supplier invoices',

  'hub.home.task.sup.confirmOrders': 'Purchase orders to respond to',
  'hub.home.task.sup.createAsn': 'Confirmed orders ready to ship: create the ASN',
  'hub.home.task.sup.rfq': 'Sourcing invitations to answer',
  'hub.home.task.sup.certs': 'Certificates expired or expiring',
  'hub.home.task.sup.invoices': 'Invoices awaiting payment',

  // Sample data marker (SC-04)
  'hub.sample.label': 'Sample data',
  'hub.sample.hint': 'Figures are examples. Actions work, but changes reset when the page reloads.',
};

export const hubId: Record<string, string> = {
  'hub.persona.pti': 'PTI',
  'hub.persona.supplier': 'Pemasok',

  'hub.nav.section.home': 'Beranda',
  'hub.nav.section.orders': 'Kolaborasi pesanan',
  'hub.nav.section.supplierOrders': 'Pesanan',
  'hub.nav.section.forecast': 'Prakiraan',
  'hub.nav.section.inventory': 'Stok & kapasitas',
  'hub.nav.section.calloffs': 'Call-off',
  'hub.nav.section.sourcing': 'Sourcing',
  'hub.nav.section.invoices': 'Faktur',
  'hub.nav.section.performance': 'Kinerja',
  'hub.nav.section.planning': 'Perencanaan',
  'hub.nav.section.company': 'Perusahaan',

  'hub.nav.pti.tasks': 'Tugas saya',
  'hub.nav.pti.replies': 'Balasan pemasok',
  'hub.nav.pti.purchaseOrders': 'Pesanan pembelian',
  'hub.nav.pti.shipments': 'Pengiriman & ASN',
  'hub.nav.pti.goodsReceipts': 'Penerimaan barang',
  'hub.nav.pti.commitments': 'Komitmen & selisih',
  'hub.nav.pti.inventory': 'Stok',
  'hub.nav.pti.callOffs': 'Call-off',
  'hub.nav.pti.rfx': 'RFI · RFQ · RFP',
  'hub.nav.pti.suppliers': 'Pemasok',
  'hub.nav.pti.invoices': 'Faktur',
  'hub.nav.pti.performance': 'Kinerja pemasok',

  'hub.nav.sup.todo': 'Yang perlu dikerjakan',
  'hub.nav.sup.purchaseOrders': 'Pesanan pembelian',
  'hub.nav.sup.callOffs': 'Call-off',
  'hub.nav.sup.shipments': 'Pengiriman & ASN',
  'hub.nav.sup.forecast': 'Prakiraan & komitmen',
  'hub.nav.sup.stock': 'Stok',
  'hub.nav.sup.invitations': 'Undangan',
  'hub.nav.sup.invoices': 'Faktur',
  'hub.nav.sup.performance': 'Kinerja saya',
  'hub.nav.sup.documents': 'Profil & dokumen',

  'hub.nav.util.title': 'Bantuan & administrasi',
  'hub.nav.util.glossary': 'Bantuan & glosarium',
  'hub.nav.util.roles': 'Peran',
  'hub.nav.util.processFlows': 'Alur proses',

  'hub.role.title': 'Menu untuk',
  'hub.role.hint': 'Menampilkan bagian menu untuk peran ini. Tidak mengubah apa yang boleh Anda lakukan.',
  'hub.role.MP': 'Material Planner',
  'hub.role.BUY': 'Pembeli',
  'hub.role.FIN': 'Keuangan',
  'hub.role.ALL': 'Semua peran PTI',

  'hub.home.crumb': 'Beranda',
  'hub.home.pti.title': 'Tugas saya',
  'hub.home.pti.subtitle': 'Yang menunggu tindakan Anda, paling mendesak di atas.',
  'hub.home.sup.title': 'Yang perlu dikerjakan',
  'hub.home.sup.subtitle': 'Yang ditunggu Paragon dari Anda, paling mendesak di atas.',
  'hub.home.empty.title': 'Tidak ada yang perlu ditindaklanjuti',
  'hub.home.empty.body': 'Tugas baru muncul di sini begitu ada yang menunggu Anda.',
  'hub.home.open': 'Buka',
  'hub.home.count.one': '{{count}} item',
  'hub.home.count.other': '{{count}} item',
  'hub.home.severity.critical': 'Mendesak',
  'hub.home.severity.warning': 'Segera',
  'hub.home.severity.info': 'Untuk ditinjau',

  'hub.home.task.unackPo': 'Pesanan pembelian tanpa tanggapan pemasok setelah 48 jam',
  'hub.home.task.receipts': 'Penerimaan barang untuk ditinjau',
  'hub.home.task.inboundAsn': 'Pengiriman masuk untuk diterima',
  'hub.home.task.chase': 'Pemasok yang perlu ditindaklanjuti untuk prakiraan atau pengiriman',
  'hub.home.task.rfqAward': 'Event sourcing yang siap diputuskan pemenangnya',
  'hub.home.task.overdueInvoices': 'Faktur pemasok yang lewat jatuh tempo',

  'hub.home.task.sup.confirmOrders': 'Pesanan pembelian yang perlu ditanggapi',
  'hub.home.task.sup.createAsn': 'Pesanan terkonfirmasi siap dikirim: buat ASN',
  'hub.home.task.sup.rfq': 'Undangan sourcing yang perlu dijawab',
  'hub.home.task.sup.certs': 'Sertifikat kedaluwarsa atau akan kedaluwarsa',
  'hub.home.task.sup.invoices': 'Faktur yang menunggu pembayaran',

  'hub.sample.label': 'Data contoh',
  'hub.sample.hint': 'Angka hanya contoh. Tindakan berjalan, tetapi perubahan hilang saat halaman dimuat ulang.',
};
