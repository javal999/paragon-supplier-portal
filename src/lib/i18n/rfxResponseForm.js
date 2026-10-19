// RFx supplier response forms (RFx UX 2026-10, S-01 / S-02 / S-06). Namespace:
// rfx.form.*
//
// The autosave stamp and leave prompt (S-01), the "still missing" banner, the
// inline message and the Send reason (S-02), and the sample Yes/No and the
// "answered once" note (S-06), shared by the RFI form, the RFP form and the
// RFQ quote drawer. Business language only (SC-04).

/** @type {Record<string, string>} */
export const rfxResponseFormEn = {
  // — S-01 · autosave and the leave guard ———————————————————————————————
  'rfx.form.saved': 'Draft saved on this device at',
  'rfx.form.savedHint': 'Kept in this browser as you type. PTI sees nothing until you send.',
  'rfx.form.notSaved':
    'Not saved: this browser is not keeping drafts. Save or send before you leave.',
  'rfx.form.leave': 'Your answers are not saved in this browser. Leave and lose them?',
  // — S-02 · inline validation —————————————————————————————————————————
  'rfx.form.problems_one': '{{count}} answer still missing or not valid',
  'rfx.form.problems_other': '{{count}} answers still missing or not valid',
  'rfx.form.sendBlocked_one': 'Send is off until {{count}} answer is given or fixed.',
  'rfx.form.sendBlocked_other': 'Send is off until {{count}} answers are given or fixed.',
  'rfx.form.stillMissing': 'Still missing',
  'rfx.form.notValid': 'Not a valid value',
  'rfx.form.anchor.pricing': 'Indicative prices',
  'rfx.form.anchor.documents': 'Documents',
  'rfx.form.rfq.price': 'Item {{n}}: price at {{qty}}',
  'rfx.form.rfq.altPrice': 'Item {{n}}: alternative price at {{qty}}',
  'rfx.form.rfq.altDescription': 'Item {{n}}: what the alternative is',
  'rfx.form.rfq.item': 'Item {{n}}: {{field}}',
  'rfx.form.rfq.moq': 'minimum order quantity',
  'rfx.form.rfq.lead': 'lead time',
  'rfx.form.rfq.extraCost': 'other cost {{n}}',
  'rfx.form.rfq.sameDay': 'Confirm the same-day lead time',
  // — S-06 · the sample asked once ——————————————————————————————————————
  'rfx.form.sample.choose': 'Choose Yes or No.',
  'rfx.form.copiedFrom':
    'Given in your answer to “{{question}}” above, and sent with this part too.'
};

/** @type {Record<string, string>} */
export const rfxResponseFormId = {
  // — S-01 · simpan otomatis dan penjaga keluar ————————————————————————
  'rfx.form.saved': 'Draf tersimpan di perangkat ini pukul',
  'rfx.form.savedHint':
    'Disimpan di browser ini saat Anda mengetik. PTI tidak melihat apa pun sampai Anda mengirim.',
  'rfx.form.notSaved':
    'Tidak tersimpan: browser ini tidak menyimpan draf. Simpan atau kirim sebelum keluar.',
  'rfx.form.leave': 'Jawaban Anda tidak tersimpan di browser ini. Keluar dan kehilangan jawaban?',
  // — S-02 · validasi di tempat ————————————————————————————————————————
  'rfx.form.problems_other': '{{count}} jawaban belum diisi atau belum valid',
  'rfx.form.sendBlocked_other': 'Kirim belum bisa sampai {{count}} jawaban diisi atau diperbaiki.',
  'rfx.form.stillMissing': 'Belum diisi',
  'rfx.form.notValid': 'Nilai tidak valid',
  'rfx.form.anchor.pricing': 'Harga indikatif',
  'rfx.form.anchor.documents': 'Dokumen',
  'rfx.form.rfq.price': 'Item {{n}}: harga pada {{qty}}',
  'rfx.form.rfq.altPrice': 'Item {{n}}: harga alternatif pada {{qty}}',
  'rfx.form.rfq.altDescription': 'Item {{n}}: penjelasan alternatif',
  'rfx.form.rfq.item': 'Item {{n}}: {{field}}',
  'rfx.form.rfq.moq': 'jumlah pesanan minimum',
  'rfx.form.rfq.lead': 'waktu tunggu',
  'rfx.form.rfq.extraCost': 'biaya lain {{n}}',
  'rfx.form.rfq.sameDay': 'Konfirmasi waktu tunggu di hari yang sama',
  // — S-06 · sampel ditanyakan sekali ——————————————————————————————————
  'rfx.form.sample.choose': 'Pilih Ya atau Tidak.',
  'rfx.form.copiedFrom':
    'Diisi dari jawaban Anda untuk “{{question}}” di atas, dan ikut dikirim di bagian ini.'
};
