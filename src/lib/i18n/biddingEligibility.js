// ─────────────────────────────────────────────────────────────────────────────
// SOURCING TYPE AND BIDDING ELIGIBILITY — Material G2 (MR-10 BR-05 to BR-07).
//
// The sourcing type on an event, the "not qualified" marker on the invitee
// step and the award panel, the award refusals, and Administration → Sourcing
// types. Missing-document wording is the requirement text Procurement and
// Quality typed (data) and is not keyed here.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
export const biddingEligibilityEn = {
  // — The type (BR-06) —
  'sourcingType.label': 'Sourcing type',
  'sourcingType.direct': 'Direct',
  'sourcingType.indirect': 'Indirect',
  'sourcingType.fromCategory':
    'Taken from the category. Direct needs Preferred vendors; Indirect accepts Approved or Preferred.',
  // — The marker (BR-05, BR-07) —
  'elig.warn': 'Not qualified (placeholder rules)',
  'elig.refused': 'Not qualified',
  'elig.needs': 'Is {{have}}; this {{type}} event needs {{need}}.',
  'elig.missing': 'Missing: {{docs}}',
  'elig.invite.note':
    'Only vendors qualified for this event’s sourcing type can be invited. While the qualification lists are placeholders, vendors below the level are marked but can still be invited.',
  'elig.invite.notOffered': 'Not qualified for this event — cannot be invited',
  'elig.award.warnReason':
    'Awarding a vendor that is not qualified (placeholder rules) needs a reason: {{vendors}}.',
  // — BL-147: the warnings kept on the event at publish and on the award record —
  'elig.published_one': 'Published with {{count}} vendor not qualified (placeholder rules)',
  'elig.published_other': 'Published with {{count}} vendors not qualified (placeholder rules)',
  'elig.awarded_one': 'Awarded to {{count}} vendor not qualified (placeholder rules)',
  'elig.awarded_other': 'Awarded to {{count}} vendors not qualified (placeholder rules)',
  'elig.awarded.reason': 'Reason given: {{reason}}',
  'elig.recorded.hint':
    'As recorded at the time. The qualification lists were placeholders, so these vendors were let through with a warning.',
  // — Award refusals (the verb's codes, in the reader's language) —
  'rfqCompare.refusal.AWARD_SUPPLIER_NOT_QUALIFIED':
    '{{vendors}} is below the qualification level this event needs, so it cannot be awarded. It can still respond.',
  'elig.refusal.reasonRequired':
    '{{vendors}} is not qualified (placeholder rules), so the award needs a reason.',
  // — Administration → Sourcing types —
  'adminSourcing.crumb.administration': 'ADMINISTRATION',
  'adminSourcing.crumb.page': 'SOURCING TYPES',
  'adminSourcing.title': 'Sourcing types',
  'adminSourcing.subtitle':
    'Whether each sourcing category and purchasing group is Direct or Indirect. An event takes its type from its category when it is published, and keeps it.',
  'adminSourcing.col.key': 'Category or purchasing group',
  'adminSourcing.col.type': 'Sourcing type',
  'adminSourcing.col.lastChange': 'Last change',
  'adminSourcing.kind.category': 'Category',
  'adminSourcing.kind.group': 'Purchasing group',
  'adminSourcing.default': 'Default (Direct)',
  'adminSourcing.save': 'Save',
  'adminSourcing.saved': 'Sourcing type saved',
  'adminSourcing.refused': 'Not saved: {{reason}}'
};

/** @type {Record<string, string>} */
export const biddingEligibilityId = {
  'sourcingType.label': 'Jenis sourcing',
  'sourcingType.direct': 'Direct',
  'sourcingType.indirect': 'Indirect',
  'sourcingType.fromCategory':
    'Diambil dari kategori. Direct memerlukan vendor Preferred; Indirect menerima Approved atau Preferred.',
  'elig.warn': 'Belum memenuhi syarat (aturan sementara)',
  'elig.refused': 'Belum memenuhi syarat',
  'elig.needs': 'Berlevel {{have}}; event {{type}} ini memerlukan {{need}}.',
  'elig.missing': 'Kurang: {{docs}}',
  'elig.invite.note':
    'Hanya vendor yang memenuhi syarat untuk jenis sourcing event ini yang dapat diundang. Selama daftar kualifikasi masih sementara, vendor di bawah level diberi tanda tetapi masih dapat diundang.',
  'elig.invite.notOffered': 'Belum memenuhi syarat untuk event ini — tidak dapat diundang',
  'elig.award.warnReason':
    'Memenangkan vendor yang belum memenuhi syarat (aturan sementara) memerlukan alasan: {{vendors}}.',
  'elig.published_other':
    'Dipublikasikan dengan {{count}} vendor yang belum memenuhi syarat (aturan sementara)',
  'elig.awarded_other':
    'Dimenangkan oleh {{count}} vendor yang belum memenuhi syarat (aturan sementara)',
  'elig.awarded.reason': 'Alasan yang diberikan: {{reason}}',
  'elig.recorded.hint':
    'Sesuai catatan saat itu. Daftar kualifikasi masih sementara, sehingga vendor ini diloloskan dengan peringatan.',
  'rfqCompare.refusal.AWARD_SUPPLIER_NOT_QUALIFIED':
    '{{vendors}} berada di bawah level kualifikasi yang diperlukan event ini, sehingga tidak dapat dimenangkan. Vendor tetap dapat merespons.',
  'elig.refusal.reasonRequired':
    '{{vendors}} belum memenuhi syarat (aturan sementara), sehingga penetapan pemenang memerlukan alasan.',
  'adminSourcing.crumb.administration': 'ADMINISTRASI',
  'adminSourcing.crumb.page': 'JENIS SOURCING',
  'adminSourcing.title': 'Jenis sourcing',
  'adminSourcing.subtitle':
    'Apakah setiap kategori sourcing dan purchasing group termasuk Direct atau Indirect. Event mengambil jenisnya dari kategori saat dipublikasikan, dan tetap memakainya.',
  'adminSourcing.col.key': 'Kategori atau purchasing group',
  'adminSourcing.col.type': 'Jenis sourcing',
  'adminSourcing.col.lastChange': 'Perubahan terakhir',
  'adminSourcing.kind.category': 'Kategori',
  'adminSourcing.kind.group': 'Purchasing group',
  'adminSourcing.default': 'Bawaan (Direct)',
  'adminSourcing.save': 'Simpan',
  'adminSourcing.saved': 'Jenis sourcing tersimpan',
  'adminSourcing.refused': 'Tidak tersimpan: {{reason}}'
};
