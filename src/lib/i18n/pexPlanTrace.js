// PEX wave 2 (lane C) i18n fragment: switches (PEX-13), trace (PEX-11), sandbox levels (PEX-15).
// Namespaces: pex.switch.*, pex.trace.*, pex.sandbox.*
// New strings only: no existing label is reworded. "Safety stock", "Protection buffer" and
// "LTP" are kept in both languages.

/** @type {Record<string, string>} */
export const pexPlanTraceEn = {
  'pex.switch.title': 'Safety stock and protection buffer switches',
  'pex.switch.note':
    'Both are on by default. Every change, on or off, needs a reason of at least {{min}} characters; it is recorded with who and when.',
  'pex.switch.safetyStockOn': 'Safety stock',
  'pex.switch.protectionBufferOn': 'Protection buffer',
  'pex.switch.on': 'On',
  'pex.switch.off': 'Off',
  'pex.switch.reason': 'Reason for the change',
  'pex.switch.reasonHint': 'At least {{min}} characters',
  'pex.switch.save': 'Save switch',
  'pex.switch.last': 'Last change: {{state}} on {{when}}. Reason: {{reason}}',
  'pex.switch.saved.safetyStockOn': 'Safety stock switch saved',
  'pex.switch.saved.protectionBufferOn': 'Protection buffer switch saved',
  'pex.switch.rulesHold':
    'Rules that switch these automatically are not built: they wait for Material Planning.'
};

/** @type {Record<string, string>} */
export const pexPlanTraceId = {
  'pex.switch.title': 'Saklar Safety stock dan Protection buffer',
  'pex.switch.note':
    'Keduanya aktif secara bawaan. Setiap perubahan, aktif atau nonaktif, membutuhkan alasan minimal {{min}} karakter; dicatat bersama siapa dan kapan.',
  'pex.switch.safetyStockOn': 'Safety stock',
  'pex.switch.protectionBufferOn': 'Protection buffer',
  'pex.switch.on': 'Aktif',
  'pex.switch.off': 'Nonaktif',
  'pex.switch.reason': 'Alasan perubahan',
  'pex.switch.reasonHint': 'Minimal {{min}} karakter',
  'pex.switch.save': 'Simpan saklar',
  'pex.switch.last': 'Perubahan terakhir: {{state}} pada {{when}}. Alasan: {{reason}}',
  'pex.switch.saved.safetyStockOn': 'Saklar Safety stock disimpan',
  'pex.switch.saved.protectionBufferOn': 'Saklar Protection buffer disimpan',
  'pex.switch.rulesHold':
    'Aturan yang mengubah saklar ini secara otomatis belum dibangun: menunggu Material Planning.'
};
