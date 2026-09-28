// Fixed stock (FS) reconcile i18n fragment (REQ-E06-04, ENG-D21, BL-134). Namespace: fsr.*
//
// Business language only (SC-04). Mono data (quantities, dates, codes) is
// rendered through <Data> and never keyed.

export const fixedStockReconcileEn: Record<string, string> = {
  'fsr.title': 'Fixed stock reconcile',
  'fsr.subtitle.pti':
    'At the end of each cycle: what each supplier committed, what PTI called off, and what the supplier holds, against its agreed maximum stock.',
  'fsr.subtitle.sup':
    'At the end of each cycle: what you committed, what PTI called off, and the stock you hold, against your agreed maximum stock.',
  'fsr.asOf': 'As of',
  'fsr.empty': 'No cycle to reconcile yet: nothing was committed or called off in a cycle that has started.',

  'fsr.outcome.supplierShort': 'Supplier short',
  'fsr.outcome.underCalled': 'PTI under-called',
  'fsr.outcome.stockNotReported': 'Stock not reported',
  'fsr.outcome.overHeld': 'Above max stock',
  'fsr.outcome.balanced': 'Balanced',
  'fsr.outcomeHint.supplierShort': 'Holds less than the commitment PTI did not call off',
  'fsr.outcomeHint.underCalled': 'PTI called off less than committed; the supplier holds it',
  'fsr.outcomeHint.stockNotReported': 'Uncalled commitment, but no stock figure to confirm it',
  'fsr.outcomeHint.overHeld': 'Everything called off, but stock above the agreed maximum',
  'fsr.outcomeHint.balanced': 'PTI called off at least what was committed',

  'fsr.col.supplier': 'Supplier',
  'fsr.col.material': 'Material',
  'fsr.col.cycle': 'Cycle',
  'fsr.col.committed': 'Committed',
  'fsr.col.calledOff': 'Called off',
  'fsr.col.uncalled': 'Not called off',
  'fsr.col.held': 'Held',
  'fsr.col.maxStock': 'Max stock',
  'fsr.col.result': 'Result',
  'fsr.col.status': 'Status',

  'fsr.cycleKind.packaging': '{{weeks}}-week cycle',
  'fsr.cycleKind.rawMaterial': 'Month',
  'fsr.periods': '{{committed}} periods committed · {{awaiting}} awaiting',
  'fsr.callOffCount_one': '{{count}} call-off',
  'fsr.callOffCount_other': '{{count}} call-offs',
  'fsr.notReported': 'Not reported',
  'fsr.heldAt': 'Submitted',
  'fsr.noMax': 'No max stock agreed',
  'fsr.liability': 'Liability — not priced:',
  'fsr.short': 'Short of commitment:',
  'fsr.aboveMax': 'Above max stock (supplier’s own):',
  'fsr.calledBeyond': 'Called off beyond commitment:',
  'fsr.final': 'Final',
  'fsr.provisional': 'Provisional',

  'fsr.rules.title': 'How the reconcile works',
  'fsr.rules.cycle':
    'Packaging is reconciled at the end of each {{weeks}}-week cycle. Raw material, committed per month, is reconciled at the end of each month.',
  'fsr.rules.figures':
    'Committed is the sum of the Firm and Trade-off commitments for the cycle’s periods; a period still awaiting a commitment counts as zero. Called off is every call-off PTI released with a need date in the cycle. Held is the supplier’s stock figure: the latest one while the cycle runs, and the latest submitted by the cycle end once it has ended.',
  'fsr.rules.outcomes':
    'Not called off = committed − called off. If PTI called off at least what was committed, the cycle is balanced, or above max stock when the supplier holds more than its agreed maximum. Otherwise: no stock figure means stock not reported; holding less than the part not called off means the supplier is short; holding at least that part means PTI under-called.',
  'fsr.rules.liability':
    'Where PTI under-called, or the supplier is short, the quantity the supplier holds of the part not called off, up to its agreed maximum stock, is flagged as liability — not priced. Stock above the maximum is the supplier’s own. The settlement is agreed outside the Hub.',
  'fsr.rules.provisional':
    'A cycle that has not ended is provisional: PTI can still call off before its end.',
};

export const fixedStockReconcileId: Record<string, string> = {
  'fsr.title': 'Rekonsiliasi stok tetap',
  'fsr.subtitle.pti':
    'Di akhir setiap siklus: apa yang dikomitmenkan tiap pemasok, apa yang di-call-off PTI, dan stok yang dipegang pemasok, terhadap stok maksimum yang disepakati.',
  'fsr.subtitle.sup':
    'Di akhir setiap siklus: apa yang Anda komitmenkan, apa yang di-call-off PTI, dan stok yang Anda pegang, terhadap stok maksimum yang disepakati.',
  'fsr.asOf': 'Per',
  'fsr.empty': 'Belum ada siklus untuk direkonsiliasi: tidak ada komitmen atau call-off dalam siklus yang sudah dimulai.',

  'fsr.outcome.supplierShort': 'Pemasok kurang',
  'fsr.outcome.underCalled': 'PTI kurang call-off',
  'fsr.outcome.stockNotReported': 'Stok tidak dilaporkan',
  'fsr.outcome.overHeld': 'Di atas stok maksimum',
  'fsr.outcome.balanced': 'Seimbang',
  'fsr.outcomeHint.supplierShort': 'Memegang lebih sedikit dari komitmen yang tidak di-call-off PTI',
  'fsr.outcomeHint.underCalled': 'PTI melakukan call-off lebih sedikit dari komitmen; pemasok memegangnya',
  'fsr.outcomeHint.stockNotReported': 'Ada komitmen yang belum di-call-off, tetapi tidak ada angka stok untuk memastikannya',
  'fsr.outcomeHint.overHeld': 'Semua sudah di-call-off, tetapi stok di atas maksimum yang disepakati',
  'fsr.outcomeHint.balanced': 'PTI melakukan call-off sedikitnya sebesar komitmen',

  'fsr.col.supplier': 'Pemasok',
  'fsr.col.material': 'Material',
  'fsr.col.cycle': 'Siklus',
  'fsr.col.committed': 'Dikomitmenkan',
  'fsr.col.calledOff': 'Di-call-off',
  'fsr.col.uncalled': 'Belum di-call-off',
  'fsr.col.held': 'Dipegang',
  'fsr.col.maxStock': 'Stok maksimum',
  'fsr.col.result': 'Hasil',
  'fsr.col.status': 'Status',

  'fsr.cycleKind.packaging': 'Siklus {{weeks}} minggu',
  'fsr.cycleKind.rawMaterial': 'Bulan',
  'fsr.periods': '{{committed}} periode dikomitmenkan · {{awaiting}} menunggu',
  'fsr.callOffCount_other': '{{count}} call-off',
  'fsr.notReported': 'Tidak dilaporkan',
  'fsr.heldAt': 'Dikirim',
  'fsr.noMax': 'Belum ada stok maksimum yang disepakati',
  'fsr.liability': 'Kewajiban — belum dihargai:',
  'fsr.short': 'Kurang dari komitmen:',
  'fsr.aboveMax': 'Di atas stok maksimum (milik pemasok):',
  'fsr.calledBeyond': 'Call-off melebihi komitmen:',
  'fsr.final': 'Final',
  'fsr.provisional': 'Sementara',

  'fsr.rules.title': 'Cara kerja rekonsiliasi',
  'fsr.rules.cycle':
    'Kemasan direkonsiliasi di akhir setiap siklus {{weeks}} minggu. Bahan baku, yang dikomitmenkan per bulan, direkonsiliasi di akhir setiap bulan.',
  'fsr.rules.figures':
    'Dikomitmenkan adalah jumlah komitmen Firm dan Trade-off untuk periode dalam siklus; periode yang masih menunggu komitmen dihitung nol. Di-call-off adalah setiap call-off yang dirilis PTI dengan tanggal kebutuhan dalam siklus. Dipegang adalah angka stok pemasok: yang terbaru selama siklus berjalan, dan yang terbaru dikirim sampai akhir siklus setelah siklus berakhir.',
  'fsr.rules.outcomes':
    'Belum di-call-off = dikomitmenkan − di-call-off. Jika PTI melakukan call-off sedikitnya sebesar komitmen, siklus seimbang, atau di atas stok maksimum bila pemasok memegang lebih dari maksimum yang disepakati. Jika tidak: tanpa angka stok berarti stok tidak dilaporkan; memegang kurang dari bagian yang belum di-call-off berarti pemasok kurang; memegang sedikitnya bagian itu berarti PTI kurang call-off.',
  'fsr.rules.liability':
    'Bila PTI kurang call-off, atau pemasok kurang, jumlah yang dipegang pemasok dari bagian yang belum di-call-off, sampai stok maksimum yang disepakati, ditandai sebagai kewajiban — belum dihargai. Stok di atas maksimum adalah milik pemasok. Penyelesaiannya disepakati di luar Hub.',
  'fsr.rules.provisional':
    'Siklus yang belum berakhir bersifat sementara: PTI masih dapat melakukan call-off sebelum akhir siklus.',
};
