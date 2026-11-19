// Demand anticipation i18n fragment (CAP-10, reworked by DRC-2 / BL-188 and
// DRC-4 / BL-190, SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10).
// Namespace: demandAnt.*
//
// TL-D1 (BL-233, 2026-10-29; supersedes CAP-D10) — the figure's label is
// "Demand anticipation (DA)" in EN and ID; its (i) says "Not Delivery
// Agreement", which "DA" also labels on the contract pages. TL-D8 — the carried
// quantity is "Carry-over" in EN and ID. Grid row labels must equal their
// glossary entries (`lib/glossary/termLabels.glossary.js`, BR-08). ROP, SOH, OSPO, OSPR and PR are
// the planners' own abbreviations and are kept in both languages.

/** @type {Record<string, string>} */
export const demandAnticipationEn = {
  // BL-268 (PEX-6) — DA versions: the cause of a change.
  'daCause.outOfDate': 'Out of date',
  'daCause.because': 'Because:',
  'daCause.kind.ltpA': 'LTP A',
  'daCause.kind.ltpFestive': 'LTP Festive',
  'daCause.kind.ltpB': 'LTP B',
  'daCause.kind.ltpChoice': 'LTP choice',
  'daCause.kind.safetyStock': 'Safety stock',
  'daCause.kind.safetySwitch': 'Safety stock switch',
  // BL-267 (PEX-5) — LTP inputs.
  'ltpIn.title': 'LTP inputs',
  'ltpIn.intro':
    'Upload LTP A, LTP Festive and LTP B per material, and record which one the demand anticipation uses. The hub never picks it: a material with no choice uses LTP A. Until LTP A is uploaded, the forecast quantity stands in for it.',
  'ltpIn.material': 'Material',
  'ltpIn.pick': 'Pick a material',
  'ltpIn.choice': 'LTP in use',
  'ltpIn.uploadSeries': 'Upload for',
  'ltpIn.file': 'LTP file',
  'ltpIn.fileFormat':
    'File: one line per week, Monday date and quantity, for example 2026-11-16,1200',
  'ltpIn.series.A': 'LTP A',
  'ltpIn.series.Festive': 'LTP Festive',
  'ltpIn.series.B': 'LTP B',
  'ltpIn.notUploaded': 'not uploaded',
  'ltpIn.done': 'LTP input recorded',
  'ltpIn.failed': 'Could not record the LTP input',
  'ltpIn.inUse': 'in use',
  'ltpIn.fromInputs': 'from LTP inputs',
  'ltpIn.fallbackSb': 'DRC-9a calculation (no LTP Festive)',
  'ltpIn.choiceWeekEmpty': 'LTP in use has no quantity for some weeks: those weeks read LTP A.',
  'ltpIn.choiceNotUploaded': 'The LTP in use is not uploaded: DA reads LTP A.',
  // BL-338 (PSC-3) — the batch upload screens.
  'ltpIn.batchTitle': 'Batch upload',
  'ltpIn.batchIntro':
    'One file per series for many materials at once. One row covers every finished good that uses the material; the computed total comes from the FG plan and the BOM, and the upload is the override.',
  'ltpIn.batchFile': 'Batch file',
  'ltpIn.batchFormat':
    'File: one row per material and week — material, week (a Monday, YYYY-MM-DD), quantity — for example RM-STEAR-7300,2026-11-16,1200',
  'ltpIn.batchPreview': 'Preview: the upload beside the computed total',
  'ltpIn.batchMaterial': 'Material',
  'ltpIn.batchWeek': 'Week',
  'ltpIn.batchComputed': 'Computed total (FG plan and BOM)',
  'ltpIn.batchUploaded': 'Uploaded',
  'ltpIn.batchDifference': 'Difference',
  'ltpIn.batchPlus': '+{{qty}}',
  'ltpIn.batchNotAvailable': 'Not available',
  'ltpIn.batchNoPlan': 'No FG plan for {{fgs}}: left out of the computed total',
  'ltpIn.batchNoUsers': 'No finished good uses this material: no plan to compute a total from',
  'ltpIn.batchPlanUnavailable': 'The FG plan is not readable: no computed total',
  'ltpIn.batchRepeated': 'Repeated row: {{material}} {{week}} — the last row is the one uploaded',
  'ltpIn.batchUnknown': '{{material}} is not a material on this page',
  'ltpIn.batchBreakdown': 'FG breakdown',
  'ltpIn.batchHideBreakdown': 'Hide the FG breakdown',
  'ltpIn.batchBreakdownEmpty': 'No FG demand for this week',
  'ltpIn.batchConfirm_one': 'Upload for {{count}} material',
  'ltpIn.batchConfirm_other': 'Upload for {{count}} materials',
  'ltpIn.batchDone_one': 'LTP {{series}} uploaded for {{count}} material',
  'ltpIn.batchDone_other': 'LTP {{series}} uploaded for {{count}} materials',
  'ltpIn.batchFailed': 'Could not upload {{material}}: {{reason}}',
  'ltpIn.batchStamp': 'Stamped: {{file}} · {{date}} · {{by}}',
  'ltpIn.batchNoStamp': 'no upload on record',
  'demandAnt.subtitle':
    'What PTI expects to call off from each supplier, per material and week, over the lead time. The horizon rolls weekly: each planning week is published on its own, and the next one rolls forward.',
  'demandAnt.asOf': 'As of',
  'demandAnt.howItWorks':
    'Each week of the horizon is the LTP plus any remainder carried into it; the first week also carries the safety order. What the first week’s call-offs leave goes to the last week of the horizon, or to the first week outside it when the supplier agreed. Supply above the total is absorbed in the last week; a shortfall is a PR recommendation to raise in SAP. Nothing is sent to SAP or a supplier.',
  // The planning week and its publication.
  'demandAnt.pub.label': 'Planning week',
  'demandAnt.pub.none': 'not published yet',
  'demandAnt.pub.publishedSame': 'published; today’s figures match',
  'demandAnt.pub.publishedChanged_one':
    'published; {{count}} supplier × material differs from today’s figures',
  'demandAnt.pub.publishedChanged_other':
    'published; {{count}} supplier × materials differ from today’s figures',
  'demandAnt.pub.sampleSeed': 'Sample publication, computed from the sample data on {{date}}',
  'demandAnt.pub.published': 'Last published {{date}}',
  'demandAnt.pub.unattributed': 'not attributed to a person (no one is signed in by name)',
  // The publish act.
  'demandAnt.publish.button': 'Publish demand anticipation (DA) · {{week}}',
  'demandAnt.publish.confirmTitle': 'Publish demand anticipation (DA)',
  'demandAnt.publish.confirmBody':
    'This records the demand anticipation of planning week {{week}} ({{dates}}) at today’s figures, for every supplier × material.',
  'demandAnt.publish.confirmChanged_one':
    '{{count}} supplier × material differs from the figures published for this week.',
  'demandAnt.publish.confirmChanged_other':
    '{{count}} supplier × materials differ from the figures published for this week.',
  'demandAnt.publish.confirmKept':
    'An earlier publication of this week stays on record; the new one is the one in force. Nothing is sent to SAP or a supplier.',
  'demandAnt.publish.cancel': 'Cancel',
  'demandAnt.publish.confirm': 'Publish',
  'demandAnt.publish.done': 'Demand anticipation published for {{week}}',
  'demandAnt.publish.failed': 'Could not publish demand anticipation',
  // The supplier's agreement to take a remainder outside the horizon [Owner A8].
  'demandAnt.agree.legend': 'Supplier agreed to take the remainder after the horizon',
  'demandAnt.agree.help':
    'Tick only where the supplier agreed. Without it the remainder goes to the last week of the horizon.',
  'demandAnt.agree.option': '{{qty}} to {{outside}} instead of {{last}}',
  // The filters.
  'demandAnt.filter.supplier': 'Supplier',
  'demandAnt.filter.material': 'Material',
  'demandAnt.filter.all': 'All',
  'demandAnt.filter.clear': 'Clear filters',
  'demandAnt.empty.title': 'No demand anticipation to show',
  'demandAnt.empty.body': 'No supplier has an LTP in the current forecast versions.',
  'demandAnt.empty.filtered': 'No supplier × material matches these filters.',
  // One supplier × material.
  'demandAnt.card.share': 'Share {{pct}}',
  'demandAnt.card.noStock': 'No PTI stock record in SAP: the check counts no stock on hand.',
  'demandAnt.card.showWeeks': 'Show the weeks',
  'demandAnt.card.hideWeeks': 'Hide the weeks',
  'demandAnt.grid.corner': 'Week',
  // The grid rows.
  'demandAnt.row.carriedFrom': '{{qty}} from {{week}}',
  // BL-245 (U-03) — the planning week's remainder, pending in its target cell.
  'demandAnt.row.carryPending': '{{qty}} pending (counts from next planning week)',
  'demandAnt.row.absorbedCell': '−{{qty}} supply above demand anticipation',
  'demandAnt.published': 'Published',
  'demandAnt.horizon': 'Horizon',
  'demandAnt.publishedParts':
    'Published {{date}}: LTP {{ltp}}, safety order {{safety}}, carry-over {{carried}}',
  'demandAnt.noChange': 'no change',
  'demandAnt.wouldBeHelp': 'Would be: today’s figure beside a published one, for information only.',
  // The plan vs execution check (DRC-4).
  'demandAnt.check.title': 'Plan vs execution',
  'demandAnt.check.sourceSample': '{{week}} · sample publication of {{date}}',
  'demandAnt.check.sourcePublished': '{{week}} · published {{date}}',
  'demandAnt.check.sourceToday': '{{week}} · today’s figures, not published',
  'demandAnt.check.horizon': 'Horizon (lead time)',
  'demandAnt.check.horizonWeeks_one': '{{count}} week',
  'demandAnt.check.horizonWeeks_other': '{{count}} weeks',
  'demandAnt.check.totalDa': 'Total demand anticipation',
  'demandAnt.check.ropOrder': 'ROP Order',
  'demandAnt.check.ropParts': '(cycle stock {{cycle}} + safety order {{safety}})',
  'demandAnt.check.supply.totalOspo': 'Total OSPO',
  'demandAnt.check.supply.sohOspoOsprPr': 'SOH + OSPO + OSPR + PR',
  'demandAnt.check.supply.ospoOsprPr': 'OSPO + OSPR + PR',
  'demandAnt.check.supplyParts.sohOspoOsprPr': '({{soh}} + {{ospo}} + {{ospr}} + {{pr}})',
  'demandAnt.check.supplyParts.ospoOsprPr': '({{ospo}} + {{ospr}} + {{pr}})',
  'demandAnt.check.mrpParts': 'SOH {{soh}} · OSPR {{ospr}} · PR {{pr}}',
  'demandAnt.check.mrpContext': 'SAP MRP elements (context, not in the check)',
  'demandAnt.check.gap': 'Gap',
  'demandAnt.check.result': 'Result',
  'demandAnt.check.balanced': 'Balanced',
  'demandAnt.check.surplus': 'Surplus: {{qty}} absorbed in {{week}}',
  'demandAnt.check.surplusPartly':
    'Surplus: {{qty}} absorbed in {{week}}; {{left}} more than that week can take',
  'demandAnt.check.shortfall': 'Shortfall: recommend a PR of {{qty}} (raise it in SAP)',
  'demandAnt.check.additionalPo': 'Additional PO',
  // The planning week's carry-over (DRC-2 BR-03).
  'demandAnt.carry.label': 'Call-off {{week}}',
  'demandAnt.carry.parts': '{{callOff}} called off, remainder {{remainder}}',
  'demandAnt.carry.none': 'nothing to carry',
  'demandAnt.carry.lastWeek': '{{qty}} carried to {{week}} (last week of the horizon)',
  'demandAnt.carry.firstOutside':
    '{{qty}} carried to {{week}} (first week after the horizon, supplier agreed)',
  // What a figure could not read (the read's flags).
  'demandAnt.flag.LEAD_TIME_MISSING':
    'No lead time on record for this supplier × material: the horizon is {{weeks}} weeks until one is.',
  'demandAnt.flag.NO_STOCK_RECORD': 'No PTI stock record: SOH counts 0.',
  'demandAnt.flag.OSPO_FROM_STORE':
    'The previous week is not published: OSPO starts from the open PO quantity not yet called off.',
  'demandAnt.flag.OSPR_NOT_AVAILABLE':
    'OSPR counts 0: the hub’s purchase requisitions carry no material code.',
  'demandAnt.flag.CARRY_LIMIT_NO_SALES_ORDERS':
    'No carry-over limit applied: the hub holds no sales-order quantity per supplier × material (A8b).',
  'demandAnt.flag.CARRY_OVER_LIMIT': '{{qty}} above the carry-over limit was not carried.',
  'demandAnt.tab.thisWeek': 'This week',
  'demandAnt.tab.consumption': 'Record consumption'
};

/** @type {Record<string, string>} */
export const demandAnticipationId = {
  // BL-268 (PEX-6) — DA versions: the cause of a change.
  'daCause.outOfDate': 'Kedaluwarsa',
  'daCause.because': 'Karena:',
  'daCause.kind.ltpA': 'LTP A',
  'daCause.kind.ltpFestive': 'LTP Festive',
  'daCause.kind.ltpB': 'LTP B',
  'daCause.kind.ltpChoice': 'Pilihan LTP',
  'daCause.kind.safetyStock': 'Safety stock',
  'daCause.kind.safetySwitch': 'Saklar Safety stock',
  // BL-267 (PEX-5) — LTP inputs.
  'ltpIn.title': 'Input LTP',
  'ltpIn.intro':
    'Unggah LTP A, LTP Festive dan LTP B per material, dan catat mana yang dipakai demand anticipation. Hub tidak pernah memilihnya: material tanpa pilihan memakai LTP A. Sebelum LTP A diunggah, kuantitas prakiraan menggantikannya.',
  'ltpIn.material': 'Material',
  'ltpIn.pick': 'Pilih material',
  'ltpIn.choice': 'LTP yang dipakai',
  'ltpIn.uploadSeries': 'Unggah untuk',
  'ltpIn.file': 'Berkas LTP',
  'ltpIn.fileFormat':
    'Berkas: satu baris per minggu, tanggal Senin dan kuantitas, misalnya 2026-11-16,1200',
  'ltpIn.series.A': 'LTP A',
  'ltpIn.series.Festive': 'LTP Festive',
  'ltpIn.series.B': 'LTP B',
  'ltpIn.notUploaded': 'belum diunggah',
  'ltpIn.done': 'Input LTP tercatat',
  'ltpIn.failed': 'Input LTP tidak dapat dicatat',
  'ltpIn.inUse': 'dipakai',
  'ltpIn.fromInputs': 'dari input LTP',
  'ltpIn.fallbackSb': 'Perhitungan DRC-9a (tanpa LTP Festive)',
  'ltpIn.choiceWeekEmpty':
    'LTP yang dipakai tidak punya kuantitas untuk beberapa minggu: minggu itu memakai LTP A.',
  'ltpIn.choiceNotUploaded': 'LTP yang dipakai belum diunggah: DA memakai LTP A.',
  // BL-338 (PSC-3) — layar unggah batch.
  'ltpIn.batchTitle': 'Unggah batch',
  'ltpIn.batchIntro':
    'Satu berkas per seri untuk banyak material sekaligus. Satu baris mencakup setiap finished good yang memakai material itu; total terhitung berasal dari rencana FG dan BOM, dan unggahan menjadi override-nya.',
  'ltpIn.batchFile': 'Berkas batch',
  'ltpIn.batchFormat':
    'Berkas: satu baris per material dan minggu — material, minggu (hari Senin, YYYY-MM-DD), kuantitas — misalnya RM-STEAR-7300,2026-11-16,1200',
  'ltpIn.batchPreview': 'Pratinjau: unggahan di samping total terhitung',
  'ltpIn.batchMaterial': 'Material',
  'ltpIn.batchWeek': 'Minggu',
  'ltpIn.batchComputed': 'Total terhitung (rencana FG dan BOM)',
  'ltpIn.batchUploaded': 'Diunggah',
  'ltpIn.batchDifference': 'Selisih',
  'ltpIn.batchPlus': '+{{qty}}',
  'ltpIn.batchNotAvailable': 'Tidak tersedia',
  'ltpIn.batchNoPlan': 'Tidak ada rencana FG untuk {{fgs}}: tidak dihitung dalam total terhitung',
  'ltpIn.batchNoUsers':
    'Tidak ada finished good yang memakai material ini: tidak ada rencana untuk menghitung total',
  'ltpIn.batchPlanUnavailable': 'Rencana FG tidak dapat dibaca: tidak ada total terhitung',
  'ltpIn.batchRepeated': 'Baris berulang: {{material}} {{week}} — baris terakhir yang diunggah',
  'ltpIn.batchUnknown': '{{material}} bukan material di halaman ini',
  'ltpIn.batchBreakdown': 'Rincian FG',
  'ltpIn.batchHideBreakdown': 'Sembunyikan rincian FG',
  'ltpIn.batchBreakdownEmpty': 'Tidak ada permintaan FG untuk minggu ini',
  // Indonesian has one plural category (other); an `_one` key here would fail parity.
  'ltpIn.batchConfirm_other': 'Unggah untuk {{count}} material',
  'ltpIn.batchDone_other': 'LTP {{series}} diunggah untuk {{count}} material',
  'ltpIn.batchFailed': 'Tidak dapat mengunggah {{material}}: {{reason}}',
  'ltpIn.batchStamp': 'Tercatat: {{file}} · {{date}} · {{by}}',
  'ltpIn.batchNoStamp': 'belum ada unggahan tercatat',
  'demandAnt.subtitle':
    'Jumlah yang PTI perkirakan akan di-call-off dari tiap pemasok, per material dan minggu, sepanjang lead time. Horizon bergulir setiap minggu: tiap minggu perencanaan dipublikasikan tersendiri, dan minggu berikutnya bergulir maju.',
  'demandAnt.asOf': 'Per',
  'demandAnt.howItWorks':
    'Tiap minggu dalam horizon adalah LTP ditambah sisa yang dibawa ke minggu itu; minggu pertama juga memuat safety order. Sisa setelah call-off minggu pertama dipindah ke minggu terakhir horizon, atau ke minggu pertama setelah horizon bila pemasok setuju. Pasokan di atas total diserap di minggu terakhir; kekurangan menjadi rekomendasi PR untuk dibuat di SAP. Tidak ada yang dikirim ke SAP atau pemasok.',
  'demandAnt.pub.label': 'Minggu perencanaan',
  'demandAnt.pub.none': 'belum dipublikasikan',
  'demandAnt.pub.publishedSame': 'dipublikasikan; angka hari ini sama',
  'demandAnt.pub.publishedChanged_other':
    'dipublikasikan; {{count}} pemasok × material berbeda dari angka hari ini',
  'demandAnt.pub.sampleSeed': 'Publikasi contoh, dihitung dari data contoh pada {{date}}',
  'demandAnt.pub.published': 'Terakhir dipublikasikan {{date}}',
  'demandAnt.pub.unattributed':
    'tidak tercatat atas nama seseorang (tidak ada yang masuk dengan nama)',
  'demandAnt.publish.button': 'Publikasikan demand anticipation (DA) · {{week}}',
  'demandAnt.publish.confirmTitle': 'Publikasikan demand anticipation (DA)',
  'demandAnt.publish.confirmBody':
    'Ini mencatat demand anticipation minggu perencanaan {{week}} ({{dates}}) pada angka hari ini, untuk setiap pemasok × material.',
  'demandAnt.publish.confirmChanged_other':
    '{{count}} pemasok × material berbeda dari angka yang dipublikasikan untuk minggu ini.',
  'demandAnt.publish.confirmKept':
    'Publikasi sebelumnya untuk minggu ini tetap tercatat; yang baru yang berlaku. Tidak ada yang dikirim ke SAP atau pemasok.',
  'demandAnt.publish.cancel': 'Batal',
  'demandAnt.publish.confirm': 'Publikasikan',
  'demandAnt.publish.done': 'Demand anticipation dipublikasikan untuk {{week}}',
  'demandAnt.publish.failed': 'Demand anticipation tidak dapat dipublikasikan',
  'demandAnt.agree.legend': 'Pemasok setuju menerima sisa setelah horizon',
  'demandAnt.agree.help':
    'Centang hanya bila pemasok setuju. Tanpa itu sisa dipindah ke minggu terakhir horizon.',
  'demandAnt.agree.option': '{{qty}} ke {{outside}}, bukan {{last}}',
  'demandAnt.filter.supplier': 'Pemasok',
  'demandAnt.filter.material': 'Material',
  'demandAnt.filter.all': 'Semua',
  'demandAnt.filter.clear': 'Hapus filter',
  'demandAnt.empty.title': 'Tidak ada demand anticipation untuk ditampilkan',
  'demandAnt.empty.body': 'Tidak ada pemasok dengan LTP pada versi prakiraan saat ini.',
  'demandAnt.empty.filtered': 'Tidak ada pemasok × material yang cocok dengan filter ini.',
  'demandAnt.card.share': 'Bagian {{pct}}',
  'demandAnt.card.noStock': 'Tidak ada catatan stok PTI di SAP: pemeriksaan menghitung stok 0.',
  'demandAnt.card.showWeeks': 'Tampilkan minggu',
  'demandAnt.card.hideWeeks': 'Sembunyikan minggu',
  'demandAnt.grid.corner': 'Minggu',
  'demandAnt.row.carriedFrom': '{{qty}} dari {{week}}',
  'demandAnt.row.carryPending': '{{qty}} tertunda (dihitung mulai minggu perencanaan berikutnya)',
  'demandAnt.row.absorbedCell': '−{{qty}} pasokan di atas demand anticipation',
  'demandAnt.published': 'Dipublikasikan',
  'demandAnt.horizon': 'Horizon',
  'demandAnt.publishedParts':
    'Dipublikasikan {{date}}: LTP {{ltp}}, safety order {{safety}}, carry-over {{carried}}',
  'demandAnt.noChange': 'tidak berubah',
  'demandAnt.wouldBeHelp':
    'Jika dihitung ulang: angka hari ini di samping angka yang dipublikasikan, sebagai informasi saja.',
  'demandAnt.check.title': 'Rencana vs eksekusi',
  'demandAnt.check.sourceSample': '{{week}} · publikasi contoh {{date}}',
  'demandAnt.check.sourcePublished': '{{week}} · dipublikasikan {{date}}',
  'demandAnt.check.sourceToday': '{{week}} · angka hari ini, belum dipublikasikan',
  'demandAnt.check.horizon': 'Horizon (lead time)',
  'demandAnt.check.horizonWeeks_other': '{{count}} minggu',
  'demandAnt.check.totalDa': 'Total demand anticipation',
  'demandAnt.check.ropOrder': 'ROP Order',
  'demandAnt.check.ropParts': '(cycle stock {{cycle}} + safety order {{safety}})',
  'demandAnt.check.supply.totalOspo': 'Total OSPO',
  'demandAnt.check.supply.sohOspoOsprPr': 'SOH + OSPO + OSPR + PR',
  'demandAnt.check.supply.ospoOsprPr': 'OSPO + OSPR + PR',
  'demandAnt.check.supplyParts.sohOspoOsprPr': '({{soh}} + {{ospo}} + {{ospr}} + {{pr}})',
  'demandAnt.check.supplyParts.ospoOsprPr': '({{ospo}} + {{ospr}} + {{pr}})',
  'demandAnt.check.mrpParts': 'SOH {{soh}} · OSPR {{ospr}} · PR {{pr}}',
  'demandAnt.check.mrpContext': 'Elemen MRP SAP (konteks, tidak masuk pemeriksaan)',
  'demandAnt.check.gap': 'Selisih',
  'demandAnt.check.result': 'Hasil',
  'demandAnt.check.balanced': 'Seimbang',
  'demandAnt.check.surplus': 'Kelebihan: {{qty}} diserap di {{week}}',
  'demandAnt.check.surplusPartly':
    'Kelebihan: {{qty}} diserap di {{week}}; {{left}} melebihi yang dapat ditampung minggu itu',
  'demandAnt.check.shortfall': 'Kekurangan: rekomendasikan PR sebesar {{qty}} (buat di SAP)',
  'demandAnt.check.additionalPo': 'PO tambahan',
  'demandAnt.carry.label': 'Call-off {{week}}',
  'demandAnt.carry.parts': '{{callOff}} di-call-off, sisa {{remainder}}',
  'demandAnt.carry.none': 'tidak ada sisa untuk dipindah',
  'demandAnt.carry.lastWeek': '{{qty}} dipindah ke {{week}} (minggu terakhir horizon)',
  'demandAnt.carry.firstOutside':
    '{{qty}} dipindah ke {{week}} (minggu pertama setelah horizon, pemasok setuju)',
  'demandAnt.flag.LEAD_TIME_MISSING':
    'Tidak ada lead time tercatat untuk pemasok × material ini: horizon {{weeks}} minggu sampai ada.',
  'demandAnt.flag.NO_STOCK_RECORD': 'Tidak ada catatan stok PTI: SOH dihitung 0.',
  'demandAnt.flag.OSPO_FROM_STORE':
    'Minggu sebelumnya belum dipublikasikan: OSPO dimulai dari kuantitas PO terbuka yang belum di-call-off.',
  'demandAnt.flag.OSPR_NOT_AVAILABLE':
    'OSPR dihitung 0: permintaan pembelian di hub tidak memuat kode material.',
  'demandAnt.flag.CARRY_LIMIT_NO_SALES_ORDERS':
    'Batas pemindahan sisa tidak diterapkan: hub tidak menyimpan kuantitas pesanan penjualan per pemasok × material (A8b).',
  'demandAnt.flag.CARRY_OVER_LIMIT': '{{qty}} di atas batas pemindahan sisa tidak dipindah.',
  'demandAnt.tab.thisWeek': 'Minggu ini',
  'demandAnt.tab.consumption': 'Catat pemakaian'
};
