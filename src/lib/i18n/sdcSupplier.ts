// Supplier Data Collaboration (SDC-2b) i18n fragment. Namespace: sdcSup.*
// The P1 supplier surface: an invited supplier sees ITS OWN published forecast
// lines and confirms them (t_requirementresponse_submit). FLAG-2 layer 3 holds
// here: the supplier-facing class vocabulary is commitmentClass ONLY — no
// internal liveness / plan-state grammar ever reaches these strings.
export const sdcSupplierEn: Record<string, string> = {
  // — Page chrome —
  'sdcSup.crumb.section': 'Acquire',
  'sdcSup.crumb.page': 'Forecasts',
  'sdcSup.header.title': 'Forecast Commitments',
  'sdcSup.header.subtitle': 'Published forecast lines for {{supplier}} — confirm what you can supply',
  'sdcSup.meta.summary': '{{lines}} published line(s) · {{responses}} response(s) · plan {{planVersion}}',

  // — FLAG-2 honesty banner (the governed LIVE lane is empty; sample fallback) —
  'sdcSup.honesty.title': 'Sample forecast — no live publication yet',
  'sdcSup.honesty.body':
    'There is no live forecast publication for your account yet — the SOMO C8 feed has not landed. The lines below are simulated sample data shown for demonstration; nothing here is a binding Paragon commitment until a live publication arrives.',

  // — Tabs —
  'sdcSup.tab.lines': 'Published lines',
  'sdcSup.tab.stock': 'Stock (SOH)',
  'sdcSup.tab.shipments': 'Shipments',
  'sdcSup.tab.responses': 'My responses',

  // — Commitment classes (the ONLY supplier-facing class vocabulary) —
  'sdcSup.class.firm': 'Firm',
  'sdcSup.class.semiFirm': 'Semi-firm',
  'sdcSup.class.visibilityOnly': 'Visibility only',

  // — Published lines —
  'sdcSup.line.demand': 'Requested',
  'sdcSup.line.period': 'Period',
  'sdcSup.line.confirm': 'Confirm',
  // SDC-2b-EXT: the visibility-response verb — a response, never a commitment.
  'sdcSup.line.acknowledge': 'Acknowledge',
  'sdcSup.line.visibilityHint': 'Forward visibility only — no commitment requested.',
  'sdcSup.line.lastResponse': 'Your latest response: {{qty}} {{uom}} · v{{version}} · {{status}}',
  'sdcSup.line.lastResponseAck': 'Your latest response: Acknowledged · v{{version}} · {{status}}',
  'sdcSup.lines.emptyTitle': 'No published lines',
  'sdcSup.lines.emptyBody': 'No forecast lines have been published to your account.',

  // — My responses (own facts + status ONLY) —
  'sdcSup.responses.emptyTitle': 'No responses yet',
  'sdcSup.responses.emptyBody': 'Confirm a published line and it will appear here.',
  // — R1a · WHOSE ACT IS NEXT (derived from the machine, `nextActorFrom`) —
  // Every exit from Submitted / UnderReview / Disputed is the BUYER's by
  // `requiredRole` — a ruling, not a gap — so the honest supplier surface is
  // read-only WITH THE ACTOR NAMED. Without this line the page shows a noun and
  // a supplier cannot tell "someone else is acting" from "nothing is happening".
  'sdcSup.responses.actor.buyer': 'Awaiting Paragon — nothing needed from you',
  'sdcSup.responses.actor.supplier': 'Your turn — this is waiting on you',
  'sdcSup.responses.actor.ended': 'Complete — no further action',
  'sdcSup.responses.submitDraft': 'Submit to buyer',
  'sdcSup.responses.submitting': 'Submitting…',
  'sdcSup.responses.col.material': 'Material',
  'sdcSup.responses.col.period': 'Period',
  'sdcSup.responses.col.confirmed': 'Confirmed',
  'sdcSup.responses.col.committedDate': 'Committed date',
  'sdcSup.responses.col.version': 'Version',
  'sdcSup.responses.col.submitted': 'Submitted',
  // R1b — the buyer's dispute text and its resolution, shown to the supplier who
  // did not write them (the mirror of `rootCause` directly above).
  'sdcSup.responses.dispute.raised': 'Paragon disputed this',
  'sdcSup.responses.dispute.resolved': 'Paragon resolved the dispute',
  'sdcSup.responses.rootCause': 'Root cause',
  // SDC-2b-EXT: how an acknowledgment renders — never a quantity, and the
  // label reads "Response" (the word "confirmed" never touches an ack).
  'sdcSup.responses.col.response': 'Response',
  'sdcSup.responses.ack': 'Acknowledged',
  'sdcSup.responses.note': 'Note',

  // — Confirm panel —
  'sdcSup.panel.title': 'Confirm {{material}}',
  'sdcSup.panel.requested': 'Requested',
  'sdcSup.panel.qty.eyebrow': 'Step 1',
  'sdcSup.panel.qty.title': 'Confirmed quantity',
  'sdcSup.panel.qty.desc': 'The quantity you commit to supply for this period. 0 is a valid answer when you cannot supply at all.',
  'sdcSup.panel.qtyLabel': 'Confirmed quantity ({{uom}})',
  // — CP-0 · W1 · PR-2c — quantity refusals (the ONE parse, no convention hint) —
  // Each refusal names what to type instead. The ambiguous copy spells both
  // readings out in words, because the glyph is the trap.
  'sdcSup.panel.qty.hint': 'Digits only — no thousands separators (e.g. 40000)',
  'sdcSup.panel.qty.refused.empty':
    'Enter the quantity you commit to — a blank field is not a zero. If you cannot supply any, type 0.',
  'sdcSup.panel.qty.refused.notNumeric':
    'That is not a quantity — type digits only, e.g. 40000.',
  'sdcSup.panel.qty.refused.ambiguous':
    'This can be read two ways — "40.000" means forty thousand in Indonesian and forty in English. Type it without separators: 40000.',
  'sdcSup.panel.date.eyebrow': 'Step 2',
  'sdcSup.panel.date.title': 'Delivery commitment',
  'sdcSup.panel.date.desc': 'Optional: the date you commit to deliver by, and any capacity constraint worth flagging.',
  'sdcSup.panel.committedDate': 'Committed date',
  'sdcSup.panel.capacityConstraint': 'Capacity constraint',
  'sdcSup.panel.capacityPlaceholder': 'e.g. line changeover limits August output',
  'sdcSup.panel.rootCause.eyebrow': 'Step 3',
  'sdcSup.panel.rootCause.title': 'Root cause',
  'sdcSup.panel.rootCause.desc': 'Required when you confirm below the requested quantity — explain the deviation.',
  'sdcSup.panel.rootCause.level1': 'Category',
  'sdcSup.panel.rootCause.select': 'Select a category…',
  'sdcSup.panel.rootCause.note': 'Note',
  'sdcSup.panel.rootCause.notePlaceholder': 'What constrains this commitment?',
  'sdcSup.panel.cancel': 'Cancel',
  // ⚠️ PF-1b — THE PANEL SAVES A DRAFT; it does not send. Submitting is a
  // second, deliberate act from My responses.
  'sdcSup.panel.submit': 'Save draft',
  'sdcSup.panel.submitting': 'Saving…',

  // — Acknowledge panel (SDC-2b-EXT — the visibility response) —
  'sdcSup.ackPanel.title': 'Acknowledge {{material}}',
  'sdcSup.ackPanel.desc':
    'This line is forward visibility — no commitment is requested. Acknowledging tells Paragon you have seen it; the note is an optional early signal (stock sense, capacity outlook).',
  'sdcSup.ackPanel.note': 'Note (optional signal)',
  'sdcSup.ackPanel.notePlaceholder': 'e.g. current stock covers this horizon; no concern yet',
  'sdcSup.ackPanel.submit': 'Acknowledge',
  'sdcSup.ackPanel.submitting': 'Acknowledging…',

  // — Toasts —
  'sdcSup.toast.missingQty.title': 'Quantity required',
  'sdcSup.toast.missingQty.body': 'Enter the quantity you confirm (0 is valid when you cannot supply).',
  'sdcSup.toast.missingRootCause.title': 'Root cause required',
  'sdcSup.toast.missingRootCause.body': 'You are confirming below the requested quantity — select a root-cause category.',
  'sdcSup.toast.draftSaved.title': 'Draft saved — {{material}}',
  'sdcSup.toast.draftSaved.body':
    'Not sent yet. Review it under My responses, then submit it to the buyer.',
  'sdcSup.toast.promoted.title': '{{responseId}} submitted',
  'sdcSup.toast.promoted.body': 'The buyer can see this confirmation now.',
  'sdcSup.toast.acknowledged.title': 'Acknowledged — {{material}}',
  'sdcSup.toast.acknowledged.body': 'Your visibility response is recorded under My responses.',
  'sdcSup.toast.failed.title': 'Confirmation not submitted',
  'sdcSup.toast.failed.body': 'The submission was rejected. Please try again.',

  // ── Stock tab — retired as an entry point (BL-60); a signpost to the Stock page.
  // The two material keys below are shared with the shipment panel.
  'sdcSup.stock.panel.materialLabel': 'Material',
  'sdcSup.stock.panel.materialSelect': 'Select a material…',
  'sdcSup.stock.moved.title': 'Stock is entered on the Stock page',
  'sdcSup.stock.moved.body':
    'Upload the stock template or type your figures there — both carry the same fields, and your in-transit quantity is shown beside them.',
  'sdcSup.stock.moved.link': 'Go to the Stock page',

  'sdcSup.ship.subtitle': 'Incoming shipments you have reported for your collaborated materials.',
  'sdcSup.ship.report': 'Report shipment',
  'sdcSup.ship.emptyTitle': 'No shipments reported yet',
  'sdcSup.ship.emptyBody': 'Report an incoming shipment and it will appear here.',
  'sdcSup.ship.dir.toParagon': 'To Paragon',
  'sdcSup.ship.dir.p2d': 'Principal → distributor',
  'sdcSup.ship.state.booked': 'Booked',
  'sdcSup.ship.state.shipped': 'Shipped',
  'sdcSup.ship.state.arrived': 'Arrived',
  'sdcSup.ship.state.cancelled': 'Cancelled',
  // ── THE SECOND AXIS (the shadowed-lifecycle batch) ──────────────────────────
  // Replaces `trackedViaAsn`, which described a leg whose state WAS the ASN's.
  // It no longer is: the pill shows the supplier's declared state and this
  // labels Paragon's own inbound observation sitting beside it.
  'sdcSup.ship.asnAxis': 'Paragon inbound · {{asn}}',

  // ── WAVE D — the three advance verbs (ship / arrive / cancel) ───────────────
  // `viaAsn` is a REASON, not a handoff: nothing is withheld from this seat by
  // role — the leg is tracked by its ASN, so advancing it here would move a
  // value this card never shows.
  'sdcSup.ship.advance.ship': 'Mark shipped',
  'sdcSup.ship.advance.arrive': 'Mark arrived',
  'sdcSup.ship.advance.cancel': 'Cancel shipment',
  // ⚠️ SPLIT PER VERB. This was ONE string covering all three advance verbs,
  // which is only expressible while the answer is the same for all three — and
  // it no longer is. `_cancel` is offered on a to-paragon leg (no ASN status
  // means cancelled, so there is nothing to duplicate), while departure and
  // arrival stay with the ASN. Rewording one string to cover both answers
  // would have made it vague enough to say nothing.
  'sdcSup.ship.advance.viaAsn.ship':
    'Departure is tracked by ASN {{asn}} — mark it shipped there.',
  'sdcSup.ship.advance.viaAsn.arrive':
    'Arrival is tracked by ASN {{asn}} — mark it arrived there.',
  'sdcSup.ship.advance.terminal': 'This leg has finished — no further updates.',
  'sdcSup.ship.advance.shipped.title': 'Shipment {{id}} marked shipped',
  'sdcSup.ship.advance.arrived.title': 'Shipment {{id}} marked arrived',
  'sdcSup.ship.advance.cancelled.title': 'Shipment {{id}} cancelled',
  'sdcSup.ship.advance.failed.title': 'That update was refused',
  'sdcSup.ship.col.qty': 'Quantity',
  'sdcSup.ship.col.eta': 'ETA',
  'sdcSup.ship.col.etd': 'ETD',
  'sdcSup.ship.col.asn': 'Linked ASN',
  'sdcSup.ship.col.awb': 'AWB',
  // — Shipment report panel —
  'sdcSup.ship.panel.title': 'Report incoming shipment',
  'sdcSup.ship.panel.submit': 'Report shipment',
  'sdcSup.ship.panel.submitting': 'Reporting…',
  'sdcSup.ship.panel.material.eyebrow': 'Step 1',
  'sdcSup.ship.panel.material.title': 'Material & direction',
  'sdcSup.ship.panel.material.desc': 'Choose the material and the shipment leg. A shipment to Paragon links your ASN; a principal-to-distributor leg does not.',
  'sdcSup.ship.panel.directionLabel': 'Direction',
  'sdcSup.ship.panel.directionSelect': 'Select a direction…',
  'sdcSup.ship.panel.p2dHint': 'Principal → distributor applies only to distributor materials.',
  'sdcSup.ship.panel.detail.eyebrow': 'Step 2',
  'sdcSup.ship.panel.detail.title': 'Shipment detail',
  'sdcSup.ship.panel.detail.desc': 'The quantity in transit and the shipment dates.',
  'sdcSup.ship.panel.qtyLabel': 'Quantity ({{uom}})',
  // CP-0 · 2d — the shipment quantity: one parse, honest refusal, no hint.
  'sdcSup.ship.qty.hint': 'Digits only — for example 6000.',
  'sdcSup.ship.qty.refused.empty': 'Enter the quantity in transit.',
  'sdcSup.ship.qty.refused.notNumeric':
    'That quantity is not a number — enter digits only, for example 6000.',
  'sdcSup.ship.qty.refused.ambiguous':
    'That quantity could be read two ways (6.000 = 6,000 or 6) — enter it without separators, for example 6000.',
  'sdcSup.ship.panel.etd': 'ETD',
  'sdcSup.ship.panel.eta': 'ETA',
  'sdcSup.ship.panel.link.eyebrow': 'Step 3',
  'sdcSup.ship.panel.link.title': 'Link your ASN',
  'sdcSup.ship.panel.link.desc': 'A shipment to Paragon converges on your Advance Ship Notice — pick it here. The reference resolves from your own ASNs; you never type it.',
  'sdcSup.ship.panel.asnLabel': 'Your ASN',
  'sdcSup.ship.panel.asnSelect': 'Select one of your ASNs…',
  'sdcSup.ship.panel.noAsns': 'You have no ASNs to link. Create an Advance Ship Notice first.',
  'sdcSup.ship.panel.awbEcho': 'Tracking (from the linked ASN):',
  'sdcSup.ship.panel.awbTitle': 'Carrier reference',
  'sdcSup.ship.panel.awbDesc': 'Optional: the carrier AWB for this leg. Paragon is not the consignee, so no ASN is linked.',
  'sdcSup.ship.panel.awbLabel': 'AWB (optional)',
  // — Shipment toasts —
  'sdcSup.ship.toast.missingMaterial.title': 'Material required',
  'sdcSup.ship.toast.missingMaterial.body': 'Select the material for this shipment.',
  'sdcSup.ship.toast.missingDirection.title': 'Direction required',
  'sdcSup.ship.toast.missingDirection.body': 'Choose the shipment direction.',
  'sdcSup.ship.toast.missingQty.title': 'Quantity required',
  'sdcSup.ship.toast.missingQty.body': 'Enter the quantity in transit.',
  'sdcSup.ship.toast.missingAsn.title': 'ASN required',
  'sdcSup.ship.toast.missingAsn.body': 'A shipment to Paragon must link one of your ASNs.',
  'sdcSup.ship.toast.failed.title': 'Shipment not reported',
  'sdcSup.ship.toast.reported.title': 'Shipment reported — {{material}}',
  'sdcSup.ship.toast.reported.body': 'Your shipment is recorded under Shipments.',

  // — Empty page —
  'sdcSup.empty.title': 'No forecast publications',
  'sdcSup.empty.subtitle': 'Nothing has been published to {{supplier}} yet.',
  'sdcSup.empty.message': 'Published forecast lines appear here when a planning cycle publishes.',
};

export const sdcSupplierId: Record<string, string> = {
  // — Kerangka halaman —
  'sdcSup.crumb.section': 'Pengadaan',
  'sdcSup.crumb.page': 'Prakiraan',
  'sdcSup.header.title': 'Komitmen Prakiraan',
  'sdcSup.header.subtitle': 'Baris prakiraan terbit untuk {{supplier}} — konfirmasikan yang dapat Anda pasok',
  'sdcSup.meta.summary': '{{lines}} baris terbit · {{responses}} respons · rencana {{planVersion}}',

  // — Spanduk kejujuran FLAG-2 —
  'sdcSup.honesty.title': 'Prakiraan sampel — belum ada publikasi live',
  'sdcSup.honesty.body':
    'Belum ada publikasi prakiraan live untuk akun Anda — feed SOMO C8 belum tersedia. Baris di bawah adalah data sampel simulasi untuk demonstrasi; tidak ada yang menjadi komitmen Paragon yang mengikat sampai publikasi live hadir.',

  // — Tab —
  'sdcSup.tab.lines': 'Baris terbit',
  'sdcSup.tab.stock': 'Stok (SOH)',
  'sdcSup.tab.shipments': 'Pengiriman',
  'sdcSup.tab.responses': 'Respons Saya',

  // — Kelas komitmen —
  'sdcSup.class.firm': 'Firm',
  'sdcSup.class.semiFirm': 'Semi-firm',
  'sdcSup.class.visibilityOnly': 'Visibilitas saja',

  // — Baris terbit —
  'sdcSup.line.demand': 'Diminta',
  'sdcSup.line.period': 'Periode',
  'sdcSup.line.confirm': 'Konfirmasi',
  // SDC-2b-EXT: "Tanggapi/Ditanggapi" = INTERIM adjudicated word choice —
  // deliberately a RESPONSE verb, not an approval verb; JJ's Indonesian team
  // reviews the final wording later.
  'sdcSup.line.acknowledge': 'Tanggapi',
  'sdcSup.line.visibilityHint': 'Visibilitas ke depan saja — tidak ada komitmen yang diminta.',
  'sdcSup.line.lastResponse': 'Respons terakhir Anda: {{qty}} {{uom}} · v{{version}} · {{status}}',
  'sdcSup.line.lastResponseAck': 'Respons terakhir Anda: Ditanggapi · v{{version}} · {{status}}',
  'sdcSup.lines.emptyTitle': 'Tidak ada baris terbit',
  'sdcSup.lines.emptyBody': 'Belum ada baris prakiraan yang diterbitkan ke akun Anda.',

  // — Respons Saya —
  'sdcSup.responses.emptyTitle': 'Belum ada respons',
  'sdcSup.responses.emptyBody': 'Konfirmasikan baris terbit dan respons akan muncul di sini.',
  // R1a — lihat catatan EN: pelaku berikutnya, diturunkan dari mesin.
  'sdcSup.responses.actor.buyer': 'Menunggu Paragon — tidak ada tindakan dari Anda',
  'sdcSup.responses.actor.supplier': 'Giliran Anda — menunggu tindakan Anda',
  'sdcSup.responses.actor.ended': 'Selesai — tidak ada tindakan lanjutan',
  'sdcSup.responses.submitDraft': 'Kirim ke pembeli',
  'sdcSup.responses.submitting': 'Mengirim…',
  'sdcSup.responses.col.material': 'Material',
  'sdcSup.responses.col.period': 'Periode',
  'sdcSup.responses.col.confirmed': 'Dikonfirmasi',
  'sdcSup.responses.col.committedDate': 'Tanggal komitmen',
  'sdcSup.responses.col.version': 'Versi',
  'sdcSup.responses.col.submitted': 'Dikirim',
  'sdcSup.responses.dispute.raised': 'Paragon menyanggah tanggapan ini',
  'sdcSup.responses.dispute.resolved': 'Paragon menyelesaikan sanggahan',
  'sdcSup.responses.rootCause': 'Akar masalah',
  'sdcSup.responses.col.response': 'Respons',
  'sdcSup.responses.ack': 'Ditanggapi',
  'sdcSup.responses.note': 'Catatan',

  // — Panel konfirmasi —
  'sdcSup.panel.title': 'Konfirmasi {{material}}',
  'sdcSup.panel.requested': 'Diminta',
  'sdcSup.panel.qty.eyebrow': 'Langkah 1',
  'sdcSup.panel.qty.title': 'Kuantitas dikonfirmasi',
  'sdcSup.panel.qty.desc': 'Kuantitas yang Anda komitmenkan untuk periode ini. 0 adalah jawaban sah bila Anda sama sekali tidak dapat memasok.',
  'sdcSup.panel.qtyLabel': 'Kuantitas dikonfirmasi ({{uom}})',
  // — CP-0 · W1 · PR-2c — penolakan kuantitas (satu parser, tanpa petunjuk konvensi) —
  'sdcSup.panel.qty.hint': 'Angka saja — tanpa pemisah ribuan (misalnya 40000)',
  'sdcSup.panel.qty.refused.empty':
    'Masukkan kuantitas yang Anda komitmenkan — kolom kosong bukan berarti nol. Bila Anda tidak dapat memasok sama sekali, ketik 0.',
  'sdcSup.panel.qty.refused.notNumeric':
    'Itu bukan kuantitas — ketik angka saja, misalnya 40000.',
  'sdcSup.panel.qty.refused.ambiguous':
    'Ini bisa dibaca dua cara — "40.000" berarti empat puluh ribu dalam bahasa Indonesia dan empat puluh dalam bahasa Inggris. Ketik tanpa pemisah: 40000.',
  'sdcSup.panel.date.eyebrow': 'Langkah 2',
  'sdcSup.panel.date.title': 'Komitmen pengiriman',
  'sdcSup.panel.date.desc': 'Opsional: tanggal komitmen pengiriman dan kendala kapasitas yang perlu ditandai.',
  'sdcSup.panel.committedDate': 'Tanggal komitmen',
  'sdcSup.panel.capacityConstraint': 'Kendala kapasitas',
  'sdcSup.panel.capacityPlaceholder': 'mis. pergantian lini membatasi output Agustus',
  'sdcSup.panel.rootCause.eyebrow': 'Langkah 3',
  'sdcSup.panel.rootCause.title': 'Akar masalah',
  'sdcSup.panel.rootCause.desc': 'Wajib bila Anda mengonfirmasi di bawah kuantitas yang diminta — jelaskan deviasinya.',
  'sdcSup.panel.rootCause.level1': 'Kategori',
  'sdcSup.panel.rootCause.select': 'Pilih kategori…',
  'sdcSup.panel.rootCause.note': 'Catatan',
  'sdcSup.panel.rootCause.notePlaceholder': 'Apa yang membatasi komitmen ini?',
  'sdcSup.panel.cancel': 'Batal',
  'sdcSup.panel.submit': 'Simpan draf',
  'sdcSup.panel.submitting': 'Menyimpan…',

  // — Panel tanggapan visibilitas (SDC-2b-EXT) —
  'sdcSup.ackPanel.title': 'Tanggapi {{material}}',
  'sdcSup.ackPanel.desc':
    'Baris ini visibilitas ke depan — tidak ada komitmen yang diminta. Menanggapi memberi tahu Paragon Anda telah melihatnya; catatan adalah sinyal dini opsional (perkiraan stok, pandangan kapasitas).',
  'sdcSup.ackPanel.note': 'Catatan (sinyal opsional)',
  'sdcSup.ackPanel.notePlaceholder': 'mis. stok saat ini mencukupi horizon ini; belum ada kekhawatiran',
  'sdcSup.ackPanel.submit': 'Tanggapi',
  'sdcSup.ackPanel.submitting': 'Menanggapi…',

  // — Toast —
  'sdcSup.toast.missingQty.title': 'Kuantitas wajib diisi',
  'sdcSup.toast.missingQty.body': 'Masukkan kuantitas yang Anda konfirmasi (0 sah bila tidak dapat memasok).',
  'sdcSup.toast.missingRootCause.title': 'Akar masalah wajib diisi',
  'sdcSup.toast.missingRootCause.body': 'Anda mengonfirmasi di bawah kuantitas yang diminta — pilih kategori akar masalah.',
  'sdcSup.toast.draftSaved.title': 'Draf disimpan — {{material}}',
  'sdcSup.toast.draftSaved.body':
    'Belum dikirim. Tinjau di Respons Saya, lalu kirim ke pembeli.',
  'sdcSup.toast.promoted.title': '{{responseId}} terkirim',
  'sdcSup.toast.promoted.body': 'Pembeli kini dapat melihat konfirmasi ini.',
  'sdcSup.toast.acknowledged.title': 'Ditanggapi — {{material}}',
  'sdcSup.toast.acknowledged.body': 'Respons visibilitas Anda tercatat di Respons Saya.',
  'sdcSup.toast.failed.title': 'Konfirmasi tidak terkirim',
  'sdcSup.toast.failed.body': 'Pengiriman ditolak. Silakan coba lagi.',

  // ── Tab Stok — tidak lagi menjadi titik entri (BL-60); penunjuk ke halaman Stok.
  // Dua kunci material di bawah dipakai bersama oleh panel pengiriman.
  'sdcSup.stock.panel.materialLabel': 'Material',
  'sdcSup.stock.panel.materialSelect': 'Pilih material…',
  'sdcSup.stock.moved.title': 'Stok diisi di halaman Stok',
  'sdcSup.stock.moved.body':
    'Unggah template stok atau ketik angka Anda di sana — keduanya memuat kolom yang sama, dan kuantitas dalam perjalanan ditampilkan di sampingnya.',
  'sdcSup.stock.moved.link': 'Buka halaman Stok',

  'sdcSup.ship.subtitle': 'Pengiriman masuk yang telah Anda laporkan untuk material kolaborasi Anda.',
  'sdcSup.ship.report': 'Laporkan pengiriman',
  'sdcSup.ship.emptyTitle': 'Belum ada pengiriman dilaporkan',
  'sdcSup.ship.emptyBody': 'Laporkan pengiriman masuk dan akan muncul di sini.',
  'sdcSup.ship.dir.toParagon': 'Ke Paragon',
  'sdcSup.ship.dir.p2d': 'Prinsipal → distributor',
  'sdcSup.ship.state.booked': 'Dipesan',
  'sdcSup.ship.state.shipped': 'Dikirim',
  'sdcSup.ship.state.arrived': 'Tiba',
  'sdcSup.ship.state.cancelled': 'Dibatalkan',
  'sdcSup.ship.asnAxis': 'Masuk Paragon · {{asn}}',

  // ── WAVE D — verba lanjutan (kirim / tiba / batal) ──────────────────────────
  'sdcSup.ship.advance.ship': 'Tandai dikirim',
  'sdcSup.ship.advance.arrive': 'Tandai tiba',
  'sdcSup.ship.advance.cancel': 'Batalkan pengiriman',
  'sdcSup.ship.advance.viaAsn.ship':
    'Keberangkatan dilacak oleh ASN {{asn}} — tandai dikirim di sana.',
  'sdcSup.ship.advance.viaAsn.arrive':
    'Kedatangan dilacak oleh ASN {{asn}} — tandai tiba di sana.',
  'sdcSup.ship.advance.terminal': 'Rute ini telah selesai — tidak ada pembaruan lagi.',
  'sdcSup.ship.advance.shipped.title': 'Pengiriman {{id}} ditandai dikirim',
  'sdcSup.ship.advance.arrived.title': 'Pengiriman {{id}} ditandai tiba',
  'sdcSup.ship.advance.cancelled.title': 'Pengiriman {{id}} dibatalkan',
  'sdcSup.ship.advance.failed.title': 'Pembaruan itu ditolak',
  'sdcSup.ship.col.qty': 'Kuantitas',
  'sdcSup.ship.col.eta': 'ETA',
  'sdcSup.ship.col.etd': 'ETD',
  'sdcSup.ship.col.asn': 'ASN tertaut',
  'sdcSup.ship.col.awb': 'AWB',
  // — Panel laporan pengiriman —
  'sdcSup.ship.panel.title': 'Laporkan pengiriman masuk',
  'sdcSup.ship.panel.submit': 'Laporkan pengiriman',
  'sdcSup.ship.panel.submitting': 'Melaporkan…',
  'sdcSup.ship.panel.material.eyebrow': 'Langkah 1',
  'sdcSup.ship.panel.material.title': 'Material & arah',
  'sdcSup.ship.panel.material.desc': 'Pilih material dan leg pengiriman. Pengiriman ke Paragon menautkan ASN Anda; leg prinsipal-ke-distributor tidak.',
  'sdcSup.ship.panel.directionLabel': 'Arah',
  'sdcSup.ship.panel.directionSelect': 'Pilih arah…',
  'sdcSup.ship.panel.p2dHint': 'Prinsipal → distributor hanya berlaku untuk material distributor.',
  'sdcSup.ship.panel.detail.eyebrow': 'Langkah 2',
  'sdcSup.ship.panel.detail.title': 'Rincian pengiriman',
  'sdcSup.ship.panel.detail.desc': 'Kuantitas dalam perjalanan dan tanggal pengiriman.',
  'sdcSup.ship.panel.qtyLabel': 'Kuantitas ({{uom}})',
  // CP-0 · 2d — kuantitas pengiriman: satu parse, penolakan jujur, tanpa petunjuk.
  'sdcSup.ship.qty.hint': 'Hanya digit — misalnya 6000.',
  'sdcSup.ship.qty.refused.empty': 'Masukkan kuantitas dalam perjalanan.',
  'sdcSup.ship.qty.refused.notNumeric':
    'Kuantitas itu bukan angka — masukkan hanya digit, misalnya 6000.',
  'sdcSup.ship.qty.refused.ambiguous':
    'Kuantitas itu bisa dibaca dua cara (6.000 = 6.000 atau 6) — masukkan tanpa pemisah, misalnya 6000.',
  'sdcSup.ship.panel.etd': 'ETD',
  'sdcSup.ship.panel.eta': 'ETA',
  'sdcSup.ship.panel.link.eyebrow': 'Langkah 3',
  'sdcSup.ship.panel.link.title': 'Tautkan ASN Anda',
  'sdcSup.ship.panel.link.desc': 'Pengiriman ke Paragon menyatu dengan Advance Ship Notice Anda — pilih di sini. Referensinya diselesaikan dari ASN Anda sendiri; Anda tidak mengetiknya.',
  'sdcSup.ship.panel.asnLabel': 'ASN Anda',
  'sdcSup.ship.panel.asnSelect': 'Pilih salah satu ASN Anda…',
  'sdcSup.ship.panel.noAsns': 'Anda tidak memiliki ASN untuk ditautkan. Buat Advance Ship Notice terlebih dahulu.',
  'sdcSup.ship.panel.awbEcho': 'Pelacakan (dari ASN tertaut):',
  'sdcSup.ship.panel.awbTitle': 'Referensi pengangkut',
  'sdcSup.ship.panel.awbDesc': 'Opsional: AWB pengangkut untuk leg ini. Paragon bukan penerima, jadi tidak ada ASN yang ditautkan.',
  'sdcSup.ship.panel.awbLabel': 'AWB (opsional)',
  // — Toast pengiriman —
  'sdcSup.ship.toast.missingMaterial.title': 'Material wajib diisi',
  'sdcSup.ship.toast.missingMaterial.body': 'Pilih material untuk pengiriman ini.',
  'sdcSup.ship.toast.missingDirection.title': 'Arah wajib diisi',
  'sdcSup.ship.toast.missingDirection.body': 'Pilih arah pengiriman.',
  'sdcSup.ship.toast.missingQty.title': 'Kuantitas wajib diisi',
  'sdcSup.ship.toast.missingQty.body': 'Masukkan kuantitas dalam perjalanan.',
  'sdcSup.ship.toast.missingAsn.title': 'ASN wajib diisi',
  'sdcSup.ship.toast.missingAsn.body': 'Pengiriman ke Paragon harus menautkan salah satu ASN Anda.',
  'sdcSup.ship.toast.failed.title': 'Pengiriman tidak dilaporkan',
  'sdcSup.ship.toast.reported.title': 'Pengiriman dilaporkan — {{material}}',
  'sdcSup.ship.toast.reported.body': 'Pengiriman Anda tercatat di Pengiriman.',

  // — Halaman kosong —
  'sdcSup.empty.title': 'Tidak ada publikasi prakiraan',
  'sdcSup.empty.subtitle': 'Belum ada yang diterbitkan ke {{supplier}}.',
  'sdcSup.empty.message': 'Baris prakiraan terbit muncul di sini saat siklus perencanaan menerbitkan.',
};
