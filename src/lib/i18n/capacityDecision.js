// PTI's capacity gap decision i18n fragment (INV-D8; Inventory UX P-07).
// Namespace: capDecision.*
//
// The "PTI's decision" row and header line on PTI Capacity, the "Accept
// additional capacity" action on an amber week, the sentence on a red week,
// the refusal per code, and the supplier's read-only "PTI accepted your
// additional capacity on …" line on its Capacity page. Dates and quantities
// are mono data, rendered through <Data> beside the text, never keyed.
// "Ask supplier" is lane 2A's control and keeps its own `supplierAsk.*` keys.

/** @type {Record<string, string>} */
export const capacityDecisionEn = {
  'capDecision.header.label': 'PTI’s decision:',
  'capDecision.header.pending': 'pending',
  'capDecision.header.accepted': 'accepted',
  'capDecision.header.pendingWeeks': '{{count}} wk pending',
  'capDecision.accept': 'Accept additional capacity',
  'capDecision.acceptFor': 'Accept additional capacity for the week of {{week}}',
  'capDecision.accepted': 'Accepted',
  'capDecision.cannotCover': 'Additional capacity cannot cover this week. Still short:',
  'capDecision.toast.accepted': 'Additional capacity accepted',
  'capDecision.toast.refused': 'Not accepted: {{reason}}',
  'capDecision.refusal.WEEK_NOT_IN_PLAN':
    'The supplier has no capacity plan for this planning group and week.',
  'capDecision.refusal.CAPACITY_NOT_STATED':
    'The supplier has not stated its capacity for this week.',
  'capDecision.refusal.NOT_A_GAP_WEEK':
    'The LTP is within the supplier’s capacity this week, so there is nothing to accept.',
  'capDecision.refusal.ABOVE_ADDITIONAL_CAPACITY':
    'The LTP is above capacity plus additional capacity, so the additional capacity cannot cover this week.',
  'capDecision.refusal.ALREADY_ACCEPTED':
    'PTI has already accepted the additional capacity for this week.',
  'capDecision.supplier.accepted': 'PTI accepted your additional capacity on',
  // BL-227 — undo, and an accepted week that has since turned red.
  'capDecision.undo': 'Undo',
  'capDecision.undoFor': 'Undo the acceptance for the week of {{week}}',
  'capDecision.toast.undone': 'Acceptance undone. The week counts toward the capacity alert again.',
  'capDecision.toast.undoRefused': 'Not undone: {{reason}}',
  'capDecision.acceptedNowRed':
    'Accepted earlier, but the week is now above capacity plus additional capacity, so it counts toward the alert again.'
};

/** @type {Record<string, string>} */
export const capacityDecisionId = {
  'capDecision.header.label': 'Keputusan PTI:',
  'capDecision.header.pending': 'menunggu',
  'capDecision.header.accepted': 'diterima',
  'capDecision.header.pendingWeeks': '{{count}} mg menunggu',
  'capDecision.accept': 'Terima kapasitas tambahan',
  'capDecision.acceptFor': 'Terima kapasitas tambahan untuk minggu {{week}}',
  'capDecision.accepted': 'Diterima',
  'capDecision.cannotCover': 'Kapasitas tambahan tidak dapat menutup minggu ini. Masih kurang:',
  'capDecision.toast.accepted': 'Kapasitas tambahan diterima',
  'capDecision.toast.refused': 'Tidak diterima: {{reason}}',
  'capDecision.refusal.WEEK_NOT_IN_PLAN':
    'Pemasok tidak memiliki rencana kapasitas untuk grup perencanaan dan minggu ini.',
  'capDecision.refusal.CAPACITY_NOT_STATED':
    'Pemasok belum menyatakan kapasitasnya untuk minggu ini.',
  'capDecision.refusal.NOT_A_GAP_WEEK':
    'LTP masih dalam kapasitas pemasok minggu ini, jadi tidak ada yang perlu diterima.',
  'capDecision.refusal.ABOVE_ADDITIONAL_CAPACITY':
    'LTP di atas kapasitas ditambah kapasitas tambahan, jadi kapasitas tambahan tidak dapat menutup minggu ini.',
  'capDecision.refusal.ALREADY_ACCEPTED': 'PTI sudah menerima kapasitas tambahan untuk minggu ini.',
  'capDecision.supplier.accepted': 'PTI menerima kapasitas tambahan Anda pada',
  'capDecision.undo': 'Batalkan',
  'capDecision.undoFor': 'Batalkan penerimaan untuk minggu {{week}}',
  'capDecision.toast.undone':
    'Penerimaan dibatalkan. Minggu ini kembali dihitung dalam peringatan kapasitas.',
  'capDecision.toast.undoRefused': 'Tidak dibatalkan: {{reason}}',
  'capDecision.acceptedNowRed':
    'Sudah diterima, tetapi minggu ini sekarang di atas kapasitas ditambah kapasitas tambahan, jadi kembali dihitung dalam peringatan.'
};
