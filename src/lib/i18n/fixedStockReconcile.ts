// Fixed stock (FS) reconcile i18n fragment (REQ-E06-04, ENG-D21, BL-134). Namespace: fsr.*
//
// Business language only (SC-04). Mono data (quantities, dates, codes) is
// rendered through <Data> and never keyed.

export const fixedStockReconcileEn: Record<string, string> = {
  'fsr.title': 'Fixed stock reconcile',
  'fsr.subtitle.pti':
    'At the end of each cycle: what each supplier committed, what it accepted of PTI’s call-offs, and what it holds, against its maximum stock.',
  'fsr.subtitle.sup':
    'At the end of each cycle: what you committed, what you accepted of PTI’s call-offs, and the stock you hold, against your maximum stock.',
  'fsr.asOf': 'As of',
  'fsr.empty': 'No cycle to reconcile yet: nothing was committed or called off in a cycle that has started.',

  'fsr.outcome.supplierShort': 'Supplier short',
  'fsr.outcome.underCalled': 'PTI under-called',
  'fsr.outcome.stockNotReported': 'Stock not reported',
  'fsr.outcome.notCommitted': 'Not committed',
  'fsr.outcome.overHeld': 'Above max stock',
  'fsr.outcome.balanced': 'Balanced',
  'fsr.outcomeHint.supplierShort': 'Holds less than the commitment PTI did not call off',
  'fsr.outcomeHint.underCalled': 'PTI called off less than committed; the supplier holds it',
  'fsr.outcomeHint.stockNotReported': 'Commitment not called off, but no stock figure to confirm it',
  'fsr.outcomeHint.notCommitted': 'PTI called off stock the supplier never committed',
  'fsr.outcomeHint.overHeld': 'Everything called off, but stock above the maximum',
  'fsr.outcomeHint.balanced': 'PTI called off at least what was committed',

  'fsr.col.supplier': 'Supplier',
  'fsr.col.material': 'Material',
  'fsr.col.cycle': 'Cycle',
  'fsr.col.committed': 'Committed',
  'fsr.col.calledOff': 'Called off',
  'fsr.col.held': 'Held',
  'fsr.col.result': 'Result',
  'fsr.col.status': 'Status',

  'fsr.cycleKind.packaging': '{{weeks}}-week cycle',
  'fsr.cycleKind.rawMaterial': 'Month',
  'fsr.periods': '{{committed}} periods committed · {{awaiting}} awaiting',
  'fsr.callOffCount_one': 'accepted on {{count}} call-off',
  'fsr.callOffCount_other': 'accepted on {{count}} call-offs',
  'fsr.notCalledOff': 'Not called off:',
  'fsr.awaitingSupplier_one': '{{count}} call-off awaiting the supplier — not counted',
  'fsr.awaitingSupplier_other': '{{count}} call-offs awaiting the supplier — not counted',
  'fsr.awaitingPti_one': '{{count}} counter-offer awaiting PTI — not counted',
  'fsr.awaitingPti_other': '{{count}} counter-offers awaiting PTI — not counted',
  'fsr.notReported': 'Not reported',
  'fsr.heldAt': 'Submitted',
  'fsr.noMax': 'No max stock agreed',
  'fsr.max': 'Max:',
  'fsr.liability': 'Liability — not priced:',
  'fsr.short': 'Short of commitment:',
  'fsr.aboveMax': 'Above max stock (supplier’s own):',
  'fsr.calledBeyond': 'Called off beyond commitment:',
  'fsr.final': 'Final',
  'fsr.provisional': 'Provisional',

  'fsr.max.set': 'Set max stock',
  'fsr.max.change': 'Change max stock',
  'fsr.max.editFor': 'Max stock for {{material}} from {{supplier}}',
  'fsr.max.panelTitle': 'Max stock · {{material}}',
  'fsr.max.panelHint':
    'The most this supplier may hold for PTI of this material, as agreed with the supplier. It caps the liability flagged on the reconcile; stock above it is the supplier’s own. Every change is kept with the value before it.',
  'fsr.max.input': 'Max stock ({{uom}})',
  'fsr.max.invalid': 'Enter a whole number above zero, or clear the value.',
  'fsr.max.save': 'Save',
  'fsr.max.clear': 'Clear — no max stock agreed',
  'fsr.max.saved': 'Max stock for {{material}} set to {{qty}} {{uom}}',
  'fsr.max.cleared': 'Max stock for {{material}} cleared',
  'fsr.max.refused': 'The max stock was not saved: {{reason}}',

  'fsr.rules.title': 'How the reconcile works',
  'fsr.rules.cycle':
    'Packaging is reconciled at the end of each {{weeks}}-week cycle. Raw material, committed per month, is reconciled at the end of each month.',
  'fsr.rules.figures':
    'Committed is the sum of the Firm and Trade-off commitments for the cycle’s periods; a period still awaiting a commitment counts as zero. Called off is what the supplier accepted on PTI’s call-offs, by the agreed delivery date; a call-off still awaiting the supplier, or a counter-offer awaiting PTI, is not counted until it is accepted. Held is the supplier’s stock figure: the latest one while the cycle runs, and the latest submitted by the cycle end once it has ended.',
  'fsr.rules.outcomes':
    'Not called off = committed − called off, and never below zero. If some commitment was not called off: no stock figure means stock not reported; holding less than that part means the supplier is short; holding at least that part means PTI under-called. Otherwise: PTI calling off stock that was never committed is not committed; holding more than the maximum stock is above max stock; anything else is balanced.',
  'fsr.rules.liability':
    'Where PTI under-called, or the supplier is short, the quantity the supplier holds of the part not called off, up to the maximum stock, is flagged as liability — not priced. Stock above the maximum is the supplier’s own. The settlement is agreed outside the Hub. Procurement maintains the maximum stock.',
  'fsr.rules.provisional':
    'A cycle that has not ended is provisional: PTI can still call off before its end.',
};

export const fixedStockReconcileId: Record<string, string> = {
  'fsr.title': 'Rekonsiliasi stok tetap',
  'fsr.subtitle.pti':
    'Di akhir setiap siklus: apa yang dikomitmenkan tiap pemasok, apa yang diterimanya dari call-off PTI, dan stok yang dipegangnya, terhadap stok maksimumnya.',
  'fsr.subtitle.sup':
    'Di akhir setiap siklus: apa yang Anda komitmenkan, apa yang Anda terima dari call-off PTI, dan stok yang Anda pegang, terhadap stok maksimum Anda.',
  'fsr.asOf': 'Per',
  'fsr.empty': 'Belum ada siklus untuk direkonsiliasi: tidak ada komitmen atau call-off dalam siklus yang sudah dimulai.',

  'fsr.outcome.supplierShort': 'Pemasok kurang',
  'fsr.outcome.underCalled': 'PTI kurang call-off',
  'fsr.outcome.stockNotReported': 'Stok tidak dilaporkan',
  'fsr.outcome.notCommitted': 'Tidak dikomitmenkan',
  'fsr.outcome.overHeld': 'Di atas stok maksimum',
  'fsr.outcome.balanced': 'Seimbang',
  'fsr.outcomeHint.supplierShort': 'Memegang lebih sedikit dari komitmen yang tidak di-call-off PTI',
  'fsr.outcomeHint.underCalled': 'PTI melakukan call-off lebih sedikit dari komitmen; pemasok memegangnya',
  'fsr.outcomeHint.stockNotReported': 'Ada komitmen yang belum di-call-off, tetapi tidak ada angka stok untuk memastikannya',
  'fsr.outcomeHint.notCommitted': 'PTI melakukan call-off atas stok yang tidak pernah dikomitmenkan pemasok',
  'fsr.outcomeHint.overHeld': 'Semua sudah di-call-off, tetapi stok di atas maksimum',
  'fsr.outcomeHint.balanced': 'PTI melakukan call-off sedikitnya sebesar komitmen',

  'fsr.col.supplier': 'Pemasok',
  'fsr.col.material': 'Material',
  'fsr.col.cycle': 'Siklus',
  'fsr.col.committed': 'Dikomitmenkan',
  'fsr.col.calledOff': 'Di-call-off',
  'fsr.col.held': 'Dipegang',
  'fsr.col.result': 'Hasil',
  'fsr.col.status': 'Status',

  'fsr.cycleKind.packaging': 'Siklus {{weeks}} minggu',
  'fsr.cycleKind.rawMaterial': 'Bulan',
  'fsr.periods': '{{committed}} periode dikomitmenkan · {{awaiting}} menunggu',
  'fsr.callOffCount_other': 'diterima pada {{count}} call-off',
  'fsr.notCalledOff': 'Belum di-call-off:',
  'fsr.awaitingSupplier_other': '{{count}} call-off menunggu pemasok — tidak dihitung',
  'fsr.awaitingPti_other': '{{count}} tawaran balik menunggu PTI — tidak dihitung',
  'fsr.notReported': 'Tidak dilaporkan',
  'fsr.heldAt': 'Dikirim',
  'fsr.noMax': 'Belum ada stok maksimum yang disepakati',
  'fsr.max': 'Maks:',
  'fsr.liability': 'Kewajiban — belum dihargai:',
  'fsr.short': 'Kurang dari komitmen:',
  'fsr.aboveMax': 'Di atas stok maksimum (milik pemasok):',
  'fsr.calledBeyond': 'Call-off melebihi komitmen:',
  'fsr.final': 'Final',
  'fsr.provisional': 'Sementara',

  'fsr.max.set': 'Tetapkan stok maksimum',
  'fsr.max.change': 'Ubah stok maksimum',
  'fsr.max.editFor': 'Stok maksimum {{material}} dari {{supplier}}',
  'fsr.max.panelTitle': 'Stok maksimum · {{material}}',
  'fsr.max.panelHint':
    'Jumlah terbanyak yang boleh dipegang pemasok ini untuk PTI atas material ini, sesuai kesepakatan dengan pemasok. Angka ini membatasi kewajiban yang ditandai pada rekonsiliasi; stok di atasnya adalah milik pemasok. Setiap perubahan disimpan beserta nilai sebelumnya.',
  'fsr.max.input': 'Stok maksimum ({{uom}})',
  'fsr.max.invalid': 'Masukkan bilangan bulat di atas nol, atau kosongkan nilainya.',
  'fsr.max.save': 'Simpan',
  'fsr.max.clear': 'Hapus — belum ada stok maksimum yang disepakati',
  'fsr.max.saved': 'Stok maksimum {{material}} ditetapkan {{qty}} {{uom}}',
  'fsr.max.cleared': 'Stok maksimum {{material}} dihapus',
  'fsr.max.refused': 'Stok maksimum tidak disimpan: {{reason}}',

  'fsr.rules.title': 'Cara kerja rekonsiliasi',
  'fsr.rules.cycle':
    'Kemasan direkonsiliasi di akhir setiap siklus {{weeks}} minggu. Bahan baku, yang dikomitmenkan per bulan, direkonsiliasi di akhir setiap bulan.',
  'fsr.rules.figures':
    'Dikomitmenkan adalah jumlah komitmen Firm dan Trade-off untuk periode dalam siklus; periode yang masih menunggu komitmen dihitung nol. Di-call-off adalah yang diterima pemasok dari call-off PTI, menurut tanggal pengiriman yang disepakati; call-off yang masih menunggu pemasok, atau tawaran balik yang menunggu PTI, tidak dihitung sampai diterima. Dipegang adalah angka stok pemasok: yang terbaru selama siklus berjalan, dan yang terbaru dikirim sampai akhir siklus setelah siklus berakhir.',
  'fsr.rules.outcomes':
    'Belum di-call-off = dikomitmenkan − di-call-off, dan tidak pernah di bawah nol. Jika ada komitmen yang belum di-call-off: tanpa angka stok berarti stok tidak dilaporkan; memegang kurang dari bagian itu berarti pemasok kurang; memegang sedikitnya bagian itu berarti PTI kurang call-off. Jika tidak: PTI melakukan call-off atas stok yang tidak pernah dikomitmenkan berarti tidak dikomitmenkan; memegang lebih dari stok maksimum berarti di atas stok maksimum; selain itu seimbang.',
  'fsr.rules.liability':
    'Bila PTI kurang call-off, atau pemasok kurang, jumlah yang dipegang pemasok dari bagian yang belum di-call-off, sampai stok maksimum, ditandai sebagai kewajiban — belum dihargai. Stok di atas maksimum adalah milik pemasok. Penyelesaiannya disepakati di luar Hub. Procurement mengelola stok maksimum.',
  'fsr.rules.provisional':
    'Siklus yang belum berakhir bersifat sementara: PTI masih dapat melakukan call-off sebelum akhir siklus.',
};
