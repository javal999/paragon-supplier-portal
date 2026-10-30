// Supplier feedstock confirmation i18n fragment (BL-194, DRC-8; DRC-D17).
// Namespace: fsConfirm.*
//
// The supplier's weekly feedstock confirmation on its Stock page, and PTI's
// read-only "Feedstock (confirmed …)" line beside the supplier stock. Figures
// and dates are mono data, rendered through <Data>, never keyed. The
// Provisional label follows design rule 5 with the BL-203 wording.

/** @type {Record<string, string>} */
export const feedstockConfirmEn = {
  'fsConfirm.title': 'Current feedstock',
  'fsConfirm.intro':
    'Confirm the feedstock you hold for each material, weekly with the stock update. Feedstock is not stock until it is produced: it does not count in your stock on hand.',
  'fsConfirm.provisional': 'Provisional: rule awaiting Material Planning ({{question}})',
  'fsConfirm.due': 'Due with the weekly stock update:',
  'fsConfirm.daily.intro':
    'You are on a pull agreement: confirm the feedstock you hold for each material every day. Feedstock is not stock until it is produced: it does not count in your stock on hand.',
  'fsConfirm.daily.due': 'Due today, by the end of the day:',
  'fsConfirm.daily.allDone': 'All materials confirmed today.',
  'fsConfirm.daily.missed': '{{count}} materials missed yesterday’s confirmation.',
  'fsConfirm.count': '{{confirmed}} of {{total}} materials confirmed this week',
  'fsConfirm.allDone': 'All materials confirmed this week.',
  'fsConfirm.missed': '{{count}} materials missed last week’s confirmation.',
  'fsConfirm.col.material': 'Material',
  'fsConfirm.col.action': 'Action',
  'fsConfirm.status.confirmed': 'Confirmed',
  'fsConfirm.status.due': 'Due',
  'fsConfirm.status.missed': 'Missed',
  'fsConfirm.none': 'Not confirmed yet',
  'fsConfirm.asOf': 'as of',
  'fsConfirm.confirm': 'Confirm',
  'fsConfirm.confirmFor': 'Confirm feedstock for {{material}}',
  'fsConfirm.form.title': 'Confirm feedstock for',
  'fsConfirm.form.qty': 'Feedstock quantity ({{uom}})',
  'fsConfirm.form.date': 'Confirmed as of',
  'fsConfirm.form.note': 'Note (optional)',
  'fsConfirm.form.submit': 'Confirm feedstock',
  'fsConfirm.form.cancel': 'Cancel',
  'fsConfirm.refusal.NOT_ASSIGNED': 'This material is not assigned to you.',
  'fsConfirm.refusal.QTY_INVALID': 'Enter a quantity of 0 or more.',
  'fsConfirm.refusal.DATE_REQUIRED': 'Enter the date you confirm the feedstock as of.',
  'fsConfirm.refusal.DATE_INVALID': 'Enter a valid date.',
  'fsConfirm.refusal.DATE_IN_FUTURE': 'The confirmation date cannot be in the future.',
  'fsConfirm.refusal.NOTE_INVALID': 'The note must be text.',
  'fsConfirm.refusal.NOTE_TOO_LONG': 'The note is too long (at most {{max}} characters).',
  // BL-204 (DRC-8) — Incoming DA, shown only with the supplier view on. On
  // screen it is never "DA" (CAP-D10: that abbreviation means Delivery Agreement).
  'fsConfirm.refusal.INCOMING_DA_INVALID':
    'Incoming demand anticipation confirmed must be yes or no.',
  'fsConfirm.refusal.INCOMING_DA_NOT_AVAILABLE':
    'There is no published demand anticipation to confirm for this material.',
  'fsConfirm.incomingDa.label': 'Incoming demand anticipation confirmed',
  'fsConfirm.incomingDa.hint': 'Published for planning week {{week}}, total',
  'fsConfirm.incomingDa.confirmed': 'Incoming demand anticipation confirmed ({{week}} publication)',
  'fsConfirm.toast.done': 'Feedstock confirmed for {{code}}',
  'fsConfirm.toast.refused': 'Not confirmed: {{reason}}',
  'fsConfirm.pti.line': 'Feedstock (confirmed {{date}})',
  'fsConfirm.pti.by': 'Confirmed by supplier on {{date}}',
  'fsConfirm.pti.none': 'Feedstock not confirmed',
  'fsConfirm.pti.target': 'Target'
};

/** @type {Record<string, string>} */
export const feedstockConfirmId = {
  'fsConfirm.title': 'Feedstock saat ini',
  'fsConfirm.intro':
    'Konfirmasikan feedstock yang Anda miliki untuk setiap material, setiap minggu bersama pembaruan stok. Feedstock belum menjadi stok sampai diproduksi: tidak dihitung dalam stok Anda.',
  'fsConfirm.provisional': 'Sementara: aturan menunggu Material Planning ({{question}})',
  'fsConfirm.due': 'Jatuh tempo bersama pembaruan stok mingguan:',
  'fsConfirm.daily.intro':
    'Anda dalam perjanjian tarik: konfirmasikan feedstock yang Anda miliki untuk setiap material setiap hari. Feedstock belum menjadi stok sampai diproduksi: tidak dihitung dalam stok Anda.',
  'fsConfirm.daily.due': 'Jatuh tempo hari ini, sampai akhir hari:',
  'fsConfirm.daily.allDone': 'Semua material sudah dikonfirmasi hari ini.',
  'fsConfirm.daily.missed': '{{count}} material terlewat konfirmasi kemarin.',
  'fsConfirm.count': '{{confirmed}} dari {{total}} material dikonfirmasi minggu ini',
  'fsConfirm.allDone': 'Semua material sudah dikonfirmasi minggu ini.',
  'fsConfirm.missed': '{{count}} material terlewat konfirmasi minggu lalu.',
  'fsConfirm.col.material': 'Material',
  'fsConfirm.col.action': 'Tindakan',
  'fsConfirm.status.confirmed': 'Dikonfirmasi',
  'fsConfirm.status.due': 'Jatuh tempo',
  'fsConfirm.status.missed': 'Terlewat',
  'fsConfirm.none': 'Belum dikonfirmasi',
  'fsConfirm.asOf': 'per',
  'fsConfirm.confirm': 'Konfirmasi',
  'fsConfirm.confirmFor': 'Konfirmasi feedstock untuk {{material}}',
  'fsConfirm.form.title': 'Konfirmasi feedstock untuk',
  'fsConfirm.form.qty': 'Jumlah feedstock ({{uom}})',
  'fsConfirm.form.date': 'Dikonfirmasi per tanggal',
  'fsConfirm.form.note': 'Catatan (opsional)',
  'fsConfirm.form.submit': 'Konfirmasi feedstock',
  'fsConfirm.form.cancel': 'Batal',
  'fsConfirm.refusal.NOT_ASSIGNED': 'Material ini tidak ditugaskan kepada Anda.',
  'fsConfirm.refusal.QTY_INVALID': 'Masukkan jumlah 0 atau lebih.',
  'fsConfirm.refusal.DATE_REQUIRED': 'Masukkan tanggal konfirmasi feedstock.',
  'fsConfirm.refusal.DATE_INVALID': 'Masukkan tanggal yang valid.',
  'fsConfirm.refusal.DATE_IN_FUTURE': 'Tanggal konfirmasi tidak boleh di masa depan.',
  'fsConfirm.refusal.NOTE_INVALID': 'Catatan harus berupa teks.',
  'fsConfirm.refusal.NOTE_TOO_LONG': 'Catatan terlalu panjang (maksimal {{max}} karakter).',
  'fsConfirm.refusal.INCOMING_DA_INVALID':
    'Konfirmasi demand anticipation masuk harus ya atau tidak.',
  'fsConfirm.refusal.INCOMING_DA_NOT_AVAILABLE':
    'Tidak ada demand anticipation terbit yang dapat dikonfirmasi untuk material ini.',
  'fsConfirm.incomingDa.label': 'Demand anticipation masuk dikonfirmasi',
  'fsConfirm.incomingDa.hint': 'Terbit untuk minggu perencanaan {{week}}, total',
  'fsConfirm.incomingDa.confirmed': 'Demand anticipation masuk dikonfirmasi (terbitan {{week}})',
  'fsConfirm.toast.done': 'Feedstock dikonfirmasi untuk {{code}}',
  'fsConfirm.toast.refused': 'Tidak dikonfirmasi: {{reason}}',
  'fsConfirm.pti.line': 'Feedstock (dikonfirmasi {{date}})',
  'fsConfirm.pti.by': 'Dikonfirmasi pemasok pada {{date}}',
  'fsConfirm.pti.none': 'Feedstock belum dikonfirmasi',
  'fsConfirm.pti.target': 'Target'
};
