// ────────────────────────────────────────────────────────────────────────────
// i18n fragment — RFQ evaluation and award (RFx spec 2026-09-21, "Evaluation
// and award"): the RFQ content on the event page, the per-item comparison at an
// evaluation break, the per-item split award, and the comparison export.
// ────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
export const rfqCompareEn = {
  // — The RFQ content —
  'rfqCompare.content.title': 'What is being quoted',
  'rfqCompare.content.item': 'Item {{n}}',
  'rfqCompare.content.variants': 'Variants: {{count}}',
  'rfqCompare.content.buyerSpec': 'Spec (buyer values)',
  'rfqCompare.content.supplierSpec': 'Filled in by the supplier',
  'rfqCompare.content.required': 'required',
  'rfqCompare.content.costs': 'One-time costs requested',
  'rfqCompare.content.noCosts': 'None requested',
  'rfqCompare.content.attachments': 'Reference files',
  'rfqCompare.content.eventFiles': 'RFQ files',
  'rfqCompare.content.note': 'Note',
  'rfqCompare.content.breaks': 'Quantity breaks',
  'rfqCompare.content.itemBreaks': 'This item has its own breaks: {{breaks}}',
  'rfqCompare.content.questions': 'Questions for suppliers',
  'rfqCompare.content.noQuestions': 'No questions asked.',
  'rfqCompare.content.options': 'Options',
  'rfqCompare.flag.alternatives.on': 'Alternative offers allowed',
  'rfqCompare.flag.alternatives.off': 'No alternative offers',
  'rfqCompare.flag.samples': 'Samples requested: {{qty}} by {{date}}',
  'rfqCompare.flag.noSamples': 'No samples requested',
  'rfqCompare.flag.confidential.on':
    'Confidential: suppliers accept the terms before they see the spec and files',
  'rfqCompare.flag.confidential.off': 'Not confidential',

  // — The comparison —
  'rfqCompare.cmp.title': 'Comparison by item',
  'rfqCompare.cmp.evalBreak': 'Evaluation break',
  'rfqCompare.cmp.evalBreak.default': 'nearest the RFQ quantity',
  'rfqCompare.cmp.evalBreak.help':
    'Total cost at this break is unit price × quantity (× variants for a per-variant break) plus one-time costs. The score ranks price on it; the weights do not change.',
  'rfqCompare.cmp.breakOption': '{{qty}} {{basis}}',
  'rfqCompare.cmp.col.supplier': 'Supplier',
  'rfqCompare.cmp.col.oneTime': 'One-time costs',
  'rfqCompare.cmp.col.leadTime': 'Lead time',
  'rfqCompare.cmp.col.moq': 'MOQ',
  'rfqCompare.cmp.col.totalAtBreak': 'Total at {{qty}}',
  'rfqCompare.cmp.col.score': 'Score',
  'rfqCompare.cmp.bestPrice': 'Lowest price at this break',
  'rfqCompare.cmp.lowest': 'Lowest',
  'rfqCompare.cmp.lowestLegend':
    'Lowest: the lowest unit price at that break among the suppliers that can be awarded.',
  'rfqCompare.cmp.bestScored': 'Best scored',
  'rfqCompare.cmp.notPriced': 'Not priced',
  'rfqCompare.cmp.noQuotes': 'No quotes for this item yet.',
  'rfqCompare.cmp.failing': 'Listed, not ranked: these suppliers do not pass the compliance gate.',
  'rfqCompare.cmp.alternatives': 'Alternative offers (shown apart, not ranked)',
  'rfqCompare.cmp.pieces': '{{pieces}} pcs at this break',
  'rfqCompare.cmp.eventTotal': 'Total cost at {{qty}}',
  'rfqCompare.cmp.unitAtBreak': 'Cost per piece at {{qty}}',

  // — The per-item award —
  'rfqCompare.award.hint':
    'Give each item to one or more suppliers, by share or by quantity; the other side follows. Each awarded item totals its break. Leave an item “Not awarded now” to award it later.',
  'rfqCompare.award.itemTotal': '{{pct}}% of 100%',
  'rfqCompare.award.col.item': 'Item',
  'rfqCompare.award.col.break': 'Break',
  'rfqCompare.award.qty': 'Quantity',
  'rfqCompare.award.reasonItems': 'This award does not follow the best score for: {{items}}',
  'rfqCompare.award.wholeEvent': 'The whole event',
  'rfqCompare.award.choice': 'Decision',
  'rfqCompare.award.choice.award': 'Award',
  'rfqCompare.award.choice.open': 'Not awarded now',
  'rfqCompare.award.choice.willNot': 'Will not award',
  'rfqCompare.award.break': 'Quantity break',
  'rfqCompare.award.basis': 'Split by',
  'rfqCompare.award.basis.pct': 'Split by %',
  'rfqCompare.award.basis.qty': 'Split by quantity',
  'rfqCompare.award.itemTotalQty': '{{total}} of {{pieces}}',
  'rfqCompare.award.awardedIn': 'Awarded in {{award}}',
  'rfqCompare.award.partialNote':
    'Items left “Not awarded now” stay open, and the RFQ becomes Partly awarded.',
  'rfqCompare.award.confirmPartial': 'Award these items',
  'rfqCompare.award.willNotRest': 'Will not award the rest',
  'rfqCompare.award.willNotRestHelp':
    'Marks every open item “Will not award”. The RFQ becomes Awarded for the items already awarded.',
  'rfqCompare.award.record': 'Award {{id}}, {{date}}',
  'rfqCompare.award.status.active': 'Active',
  'rfqCompare.award.status.cancelled': 'Cancelled',
  'rfqCompare.award.status.sapRaised': 'Raised in SAP',
  'rfqCompare.award.noLines':
    'This award awarded no items: it marked the open items “Will not award”.',
  'rfqCompare.award.cancel': 'Cancel award',
  'rfqCompare.award.cancelReason': 'Reason for cancelling',
  'rfqCompare.award.cancelConfirm': 'Confirm cancel',
  'rfqCompare.award.cancelToClosed':
    'No other award stays in force, so the RFQ returns to Closed for a new award.',
  'rfqCompare.award.cancelToPartly': 'Other awards stay in force, so the RFQ stays Partly awarded.',
  'rfqCompare.award.sapMark': 'Mark raised in SAP',
  'rfqCompare.award.sapDocumentNo': 'SAP document number',
  'rfqCompare.award.sapConfirm': 'Save SAP number',
  'rfqCompare.award.close': 'Close',
  'rfqCompare.award.cancelledOn': 'Cancelled {{date}}. Reason: {{reason}}',
  'rfqCompare.award.sapRaisedAs':
    'Raised in SAP as {{doc}} on {{date}}. Changes to this award are made in SAP.',
  'rfqCompare.refusal.AWARD_SPLIT_INCOMPLETE_QTY':
    '{{item}} totals {{total}}, not {{breakQty}}. Each awarded item must total its break.',
  'rfqCompare.refusal.AWARD_EMPTY': 'Give at least one supplier a share.',
  'rfqCompare.refusal.AWARD_ITEM_UNKNOWN': 'An award line names an item this RFQ does not have.',
  'rfqCompare.refusal.AWARD_TIER_UNKNOWN':
    'The lines for {{item}} must record one quantity break of that item.',
  'rfqCompare.refusal.AWARD_QTY_INVALID': 'Every award line carries a quantity above zero.',
  'rfqCompare.refusal.AWARD_SHARE_INVALID': 'Every share is a percentage above zero.',
  'rfqCompare.refusal.AWARD_SPLIT_INCOMPLETE':
    '{{item}} totals {{pct}}%. Each item must total 100%.',
  'rfqCompare.refusal.AWARD_ITEM_NOT_QUOTED': '{{detail}} did not price {{item}} at this break.',
  'rfqCompare.refusal.AWARD_QTY_NOT_DERIVED':
    'The quantity for {{item}} is not the share of the break.',
  'rfqCompare.refusal.AWARD_ITEM_ALREADY_AWARDED': '{{item}} was already awarded.',
  'rfqCompare.refusal.AWARD_ITEMS_OPEN':
    '{{item}} has no share yet. Give every item shares that total 100%.',
  'rfqCompare.refusal.AWARD_NOTHING_OPEN':
    'This award settles every item, so confirm it as the final award.',
  'rfqCompare.refusal.AWARD_REASON_REQUIRED':
    'The award for {{item}} does not follow the best score. Give a reason.',
  // Material B4 (MR-2 BR-06) — a share to a supplier red-flagged on weekly update compliance.
  'rfqCompare.refusal.AWARD_REASON_COMPLIANCE_FLAG':
    '{{detail}} is below the weekly update compliance flag and gets a share of {{item}}. Give a reason.',
  'rfqCompare.award.reasonFlagged':
    '{{suppliers}}: weekly update compliance below {{flagPct}}%, with a share of {{items}}. Give a reason.',
  'rfqCompare.award.compliance.value': 'Updates {{pct}}%',
  'rfqCompare.award.compliance.tip':
    'Weekly update compliance {{pct}}%: the share of counted weeks, over the last 13 weekly update cycles, in which the supplier updated the stock of every assigned material (a connected supplier: synced every working day). Amber below {{warnPct}}%, red below {{flagPct}}%. A red supplier can still be awarded, with a reason.',
  'rfqCompare.award.compliance.tipNoHistory':
    'No history: fewer than 4 weeks counted in the last 13 weekly update cycles, so no colour and no flag.',
  'rfqCompare.award.complianceAtAward': 'Weekly update compliance at award',
  // RFx D3 (NR-2 edge case 2) — an RFP option's firm offer lapsed before the award.
  'rfqCompare.refusal.AWARD_OFFER_EXPIRED':
    'The firm offer on {{item}} is no longer valid. Open a new firm-offer round.',

  // — Export —
  'rfqCompare.export.done': 'Comparison exported to CSV',
  'rfqCompare.export.empty': 'There are no quotes to export yet.',
  'rfqCompare.csv.rfq': 'RFQ',
  'rfqCompare.csv.item': 'Item',
  'rfqCompare.csv.supplier': 'Supplier',
  'rfqCompare.csv.break': 'Break quantity',
  'rfqCompare.csv.basis': 'Break basis',
  'rfqCompare.csv.unitPrice': 'Unit price',
  'rfqCompare.csv.currency': 'Currency',
  'rfqCompare.csv.oneTime': 'One-time costs',
  'rfqCompare.csv.leadTime': 'Lead time (days)',

  // — The wizard and the board —
  'rfqCompare.wizard.materialsOptional':
    'Optional. The Items step describes what is being sourced.',
  'rfqCompare.wizard.optional': '(optional)',
  'rfqCompare.history.split': 'Split per item',
  'rfqCompare.panel.awardOnEvent': 'Every RFQ is awarded item by item on the event page.',
  'rfqCompare.panel.openAward': 'Open the per-item award',
  'rfqCompare.panel.atBreak': 'Priced and scored at the {{qty}} break, as the event page opens.',
  'rfqCompare.panel.compareByBreak': 'Compare by break on the event page',
  'rfqCompare.footer.openEvent': 'Open the sourcing event'
};

/** @type {Record<string, string>} */
export const rfqCompareId = {
  // — The RFQ content —
  'rfqCompare.content.title': 'Yang dimintakan penawaran',
  'rfqCompare.content.item': 'Item {{n}}',
  'rfqCompare.content.variants': 'Varian: {{count}}',
  'rfqCompare.content.buyerSpec': 'Spesifikasi (nilai dari pembeli)',
  'rfqCompare.content.supplierSpec': 'Diisi oleh pemasok',
  'rfqCompare.content.required': 'wajib',
  'rfqCompare.content.costs': 'Biaya satu kali yang diminta',
  'rfqCompare.content.noCosts': 'Tidak ada yang diminta',
  'rfqCompare.content.attachments': 'Berkas referensi',
  'rfqCompare.content.eventFiles': 'Berkas RFQ',
  'rfqCompare.content.note': 'Catatan',
  'rfqCompare.content.breaks': 'Jenjang kuantitas',
  'rfqCompare.content.itemBreaks': 'Item ini memiliki jenjang sendiri: {{breaks}}',
  'rfqCompare.content.questions': 'Pertanyaan untuk pemasok',
  'rfqCompare.content.noQuestions': 'Tidak ada pertanyaan.',
  'rfqCompare.content.options': 'Opsi',
  'rfqCompare.flag.alternatives.on': 'Penawaran alternatif diizinkan',
  'rfqCompare.flag.alternatives.off': 'Tanpa penawaran alternatif',
  'rfqCompare.flag.samples': 'Sampel diminta: {{qty}} paling lambat {{date}}',
  'rfqCompare.flag.noSamples': 'Tidak ada sampel yang diminta',
  'rfqCompare.flag.confidential.on':
    'Rahasia: pemasok menyetujui ketentuan sebelum melihat spesifikasi dan berkas',
  'rfqCompare.flag.confidential.off': 'Tidak rahasia',

  // — The comparison —
  'rfqCompare.cmp.title': 'Perbandingan per item',
  'rfqCompare.cmp.evalBreak': 'Jenjang evaluasi',
  'rfqCompare.cmp.evalBreak.default': 'terdekat dengan kuantitas RFQ',
  'rfqCompare.cmp.evalBreak.help':
    'Total biaya pada jenjang ini adalah harga satuan × kuantitas (× varian untuk jenjang per varian) ditambah biaya satu kali. Skor menilai harga berdasarkan total ini; bobotnya tidak berubah.',
  'rfqCompare.cmp.breakOption': '{{qty}} {{basis}}',
  'rfqCompare.cmp.col.supplier': 'Pemasok',
  'rfqCompare.cmp.col.oneTime': 'Biaya satu kali',
  'rfqCompare.cmp.col.leadTime': 'Waktu tunggu',
  'rfqCompare.cmp.col.moq': 'MOQ',
  'rfqCompare.cmp.col.totalAtBreak': 'Total pada {{qty}}',
  'rfqCompare.cmp.col.score': 'Skor',
  'rfqCompare.cmp.bestPrice': 'Harga terendah pada jenjang ini',
  'rfqCompare.cmp.lowest': 'Terendah',
  'rfqCompare.cmp.lowestLegend':
    'Terendah: harga satuan terendah pada jenjang itu di antara pemasok yang dapat dimenangkan.',
  'rfqCompare.cmp.bestScored': 'Skor terbaik',
  'rfqCompare.cmp.notPriced': 'Tidak diberi harga',
  'rfqCompare.cmp.noQuotes': 'Belum ada penawaran untuk item ini.',
  'rfqCompare.cmp.failing':
    'Ditampilkan, tidak diperingkat: pemasok ini tidak lolos gerbang kepatuhan.',
  'rfqCompare.cmp.alternatives': 'Penawaran alternatif (ditampilkan terpisah, tidak diperingkat)',
  'rfqCompare.cmp.pieces': '{{pieces}} pcs pada jenjang ini',
  'rfqCompare.cmp.eventTotal': 'Total biaya pada {{qty}}',
  'rfqCompare.cmp.unitAtBreak': 'Biaya per buah pada {{qty}}',

  // — The per-item award —
  'rfqCompare.award.hint':
    'Berikan setiap item kepada satu atau beberapa pemasok, per porsi atau per kuantitas; sisi lainnya mengikuti. Setiap item yang ditetapkan berjumlah jenjangnya. Pilih “Belum ditetapkan sekarang” untuk menetapkan item nanti.',
  'rfqCompare.award.itemTotal': '{{pct}}% dari 100%',
  'rfqCompare.award.col.item': 'Item',
  'rfqCompare.award.col.break': 'Jenjang',
  'rfqCompare.award.qty': 'Kuantitas',
  'rfqCompare.award.reasonItems': 'Penetapan ini tidak mengikuti skor terbaik untuk: {{items}}',
  'rfqCompare.award.wholeEvent': 'Seluruh event',
  'rfqCompare.award.choice': 'Keputusan',
  'rfqCompare.award.choice.award': 'Tetapkan',
  'rfqCompare.award.choice.open': 'Belum ditetapkan sekarang',
  'rfqCompare.award.choice.willNot': 'Tidak akan ditetapkan',
  'rfqCompare.award.break': 'Jenjang kuantitas',
  'rfqCompare.award.basis': 'Bagi menurut',
  'rfqCompare.award.basis.pct': 'Bagi per %',
  'rfqCompare.award.basis.qty': 'Bagi per kuantitas',
  'rfqCompare.award.itemTotalQty': '{{total}} dari {{pieces}}',
  'rfqCompare.award.awardedIn': 'Ditetapkan di {{award}}',
  'rfqCompare.award.partialNote':
    'Item yang “Belum ditetapkan sekarang” tetap terbuka, dan RFQ menjadi Ditetapkan sebagian.',
  'rfqCompare.award.confirmPartial': 'Tetapkan item ini',
  'rfqCompare.award.willNotRest': 'Tidak menetapkan sisanya',
  'rfqCompare.award.willNotRestHelp':
    'Menandai setiap item terbuka “Tidak akan ditetapkan”. RFQ menjadi Ditetapkan untuk item yang sudah ditetapkan.',
  'rfqCompare.award.record': 'Penetapan {{id}}, {{date}}',
  'rfqCompare.award.status.active': 'Aktif',
  'rfqCompare.award.status.cancelled': 'Dibatalkan',
  'rfqCompare.award.status.sapRaised': 'Sudah dibuat di SAP',
  'rfqCompare.award.noLines':
    'Penetapan ini tidak menetapkan item: penetapan ini menandai item terbuka “Tidak akan ditetapkan”.',
  'rfqCompare.award.cancel': 'Batalkan penetapan',
  'rfqCompare.award.cancelReason': 'Alasan pembatalan',
  'rfqCompare.award.cancelConfirm': 'Konfirmasi pembatalan',
  'rfqCompare.award.cancelToClosed':
    'Tidak ada penetapan lain yang berlaku, jadi RFQ kembali ke Ditutup untuk penetapan baru.',
  'rfqCompare.award.cancelToPartly':
    'Penetapan lain tetap berlaku, jadi RFQ tetap Ditetapkan sebagian.',
  'rfqCompare.award.sapMark': 'Tandai sudah dibuat di SAP',
  'rfqCompare.award.sapDocumentNo': 'Nomor dokumen SAP',
  'rfqCompare.award.sapConfirm': 'Simpan nomor SAP',
  'rfqCompare.award.close': 'Tutup',
  'rfqCompare.award.cancelledOn': 'Dibatalkan {{date}}. Alasan: {{reason}}',
  'rfqCompare.award.sapRaisedAs':
    'Sudah dibuat di SAP sebagai {{doc}} pada {{date}}. Perubahan penetapan ini dilakukan di SAP.',
  'rfqCompare.refusal.AWARD_SPLIT_INCOMPLETE_QTY':
    '{{item}} berjumlah {{total}}, bukan {{breakQty}}. Setiap item yang ditetapkan harus berjumlah jenjangnya.',
  'rfqCompare.refusal.AWARD_EMPTY': 'Berikan porsi kepada setidaknya satu pemasok.',
  'rfqCompare.refusal.AWARD_ITEM_UNKNOWN':
    'Satu baris penetapan menyebut item yang tidak ada di RFQ ini.',
  'rfqCompare.refusal.AWARD_TIER_UNKNOWN':
    'Baris untuk {{item}} harus mencatat satu jenjang kuantitas dari item itu.',
  'rfqCompare.refusal.AWARD_QTY_INVALID': 'Setiap baris penetapan memuat kuantitas di atas nol.',
  'rfqCompare.refusal.AWARD_SHARE_INVALID': 'Setiap porsi adalah persentase di atas nol.',
  'rfqCompare.refusal.AWARD_SPLIT_INCOMPLETE':
    '{{item}} berjumlah {{pct}}%. Setiap item harus berjumlah 100%.',
  'rfqCompare.refusal.AWARD_ITEM_NOT_QUOTED':
    '{{detail}} tidak memberi harga {{item}} pada jenjang ini.',
  'rfqCompare.refusal.AWARD_QTY_NOT_DERIVED': 'Kuantitas untuk {{item}} bukan porsi dari jenjang.',
  'rfqCompare.refusal.AWARD_ITEM_ALREADY_AWARDED': '{{item}} sudah ditetapkan sebelumnya.',
  'rfqCompare.refusal.AWARD_ITEMS_OPEN':
    '{{item}} belum mendapat porsi. Berikan setiap item porsi yang berjumlah 100%.',
  'rfqCompare.refusal.AWARD_NOTHING_OPEN':
    'Penetapan ini menyelesaikan setiap item, jadi konfirmasikan sebagai penetapan akhir.',
  'rfqCompare.refusal.AWARD_REASON_REQUIRED':
    'Penetapan untuk {{item}} tidak mengikuti skor terbaik. Berikan alasannya.',
  'rfqCompare.refusal.AWARD_REASON_COMPLIANCE_FLAG':
    '{{detail}} berada di bawah batas tanda kepatuhan pembaruan mingguan dan mendapat porsi {{item}}. Berikan alasannya.',
  'rfqCompare.award.reasonFlagged':
    '{{suppliers}}: kepatuhan pembaruan mingguan di bawah {{flagPct}}%, dengan porsi {{items}}. Berikan alasannya.',
  'rfqCompare.award.compliance.value': 'Pembaruan {{pct}}%',
  'rfqCompare.award.compliance.tip':
    'Kepatuhan pembaruan mingguan {{pct}}%: porsi minggu yang dihitung, dalam 13 siklus pembaruan mingguan terakhir, saat pemasok memperbarui stok setiap material yang ditugaskan (pemasok terhubung API: sinkron setiap hari kerja). Kuning di bawah {{warnPct}}%, merah di bawah {{flagPct}}%. Pemasok merah tetap dapat ditetapkan, dengan alasan.',
  'rfqCompare.award.compliance.tipNoHistory':
    'Belum ada riwayat: kurang dari 4 minggu dihitung dalam 13 siklus pembaruan mingguan terakhir, jadi tanpa warna dan tanpa tanda.',
  'rfqCompare.award.complianceAtAward': 'Kepatuhan pembaruan mingguan saat penetapan',
  'rfqCompare.refusal.AWARD_OFFER_EXPIRED':
    'Penawaran pasti pada {{item}} tidak berlaku lagi. Buka putaran penawaran pasti baru.',

  // — Export —
  'rfqCompare.export.done': 'Perbandingan diekspor ke CSV',
  'rfqCompare.export.empty': 'Belum ada penawaran untuk diekspor.',
  'rfqCompare.csv.rfq': 'RFQ',
  'rfqCompare.csv.item': 'Item',
  'rfqCompare.csv.supplier': 'Pemasok',
  'rfqCompare.csv.break': 'Kuantitas jenjang',
  'rfqCompare.csv.basis': 'Dasar jenjang',
  'rfqCompare.csv.unitPrice': 'Harga satuan',
  'rfqCompare.csv.currency': 'Mata uang',
  'rfqCompare.csv.oneTime': 'Biaya satu kali',
  'rfqCompare.csv.leadTime': 'Waktu tunggu (hari)',

  // — The wizard and the board —
  'rfqCompare.wizard.materialsOptional': 'Opsional. Langkah Item menjelaskan apa yang diadakan.',
  'rfqCompare.wizard.optional': '(opsional)',
  'rfqCompare.history.split': 'Dibagi per item',
  'rfqCompare.panel.awardOnEvent': 'Setiap RFQ ditetapkan per item di halaman event.',
  'rfqCompare.panel.openAward': 'Buka penetapan per item',
  'rfqCompare.panel.atBreak':
    'Harga dan skor pada jenjang {{qty}}, sama seperti saat halaman event dibuka.',
  'rfqCompare.panel.compareByBreak': 'Bandingkan per jenjang di halaman event',
  'rfqCompare.footer.openEvent': 'Buka event sourcing'
};

/**
 * The CSV header, in the reader's language.
 * @type {readonly string[]}
 */
export const COMPARISON_CSV_HEADER_KEYS = [
  'rfqCompare.csv.rfq',
  'rfqCompare.csv.item',
  'rfqCompare.csv.supplier',
  'rfqCompare.csv.break',
  'rfqCompare.csv.basis',
  'rfqCompare.csv.unitPrice',
  'rfqCompare.csv.currency',
  'rfqCompare.csv.oneTime',
  'rfqCompare.csv.leadTime'
];
