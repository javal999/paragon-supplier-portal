// SupplierWhatsApp — module-scope constants: the messenger-chrome colours the
// LEFT channel mockups paint with (D-2), the keyframes the WhatsApp phone
// animates with, and the three scripted simulators' data (WhatsApp scenarios +
// bot replies + follow-up chips, the email previews, the WeChat scenarios).
//
// `CAP_KEYS` and `LANGUAGES` are NOT here on purpose: they live beside
// `WhatsAppPanel`, the one component that `.map()`s them, because the
// module-scope-literal gate (`src/lib/moduleScopeLiteralGate`) only sees a const
// consumed by `.map()` in its OWN file, and their grandfathered rows must keep
// naming a live const.

export const WHATSAPP_GREEN_HEADER = '#075E54';
export const WHATSAPP_BG = '#ECE5DD';
export const WHATSAPP_BUBBLE = '#DCF8C6';
export const WHATSAPP_GREEN_DOT = '#107E3E';
export const WECHAT_GREEN = '#07C160';
export const WECHAT_BG = '#EDEDED';
// NOTE: the messenger-chrome consts above are used ONLY by the LEFT channel
// mockups (PhoneMockup / WeChat frame) — the D-2 authentic-channel exemption.
// The RIGHT-side process-flow bands no longer consume them: they use DP2-FLAG-01
// accent-edge classes (border-l-navy/teal/text-tertiary/success/warning) instead,
// so the mockups stay pixel-identical while the bands calm to the portal register.

export const PULSE_CSS = `
@keyframes wa-fade-slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wa-typing-dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
.wa-msg-in { animation: wa-fade-slide-in 0.3s ease-out; }
.wa-typing-dot { animation: wa-typing-dot 1.2s ease-in-out infinite; }
`;

/** @typedef {'po' | 'asn' | 'inventory' | 'invoice'} ScenarioId */

/**
 * @typedef {object} SimMessage
 * @property {string} id
 * @property {'bot' | 'supplier'} from
 * @property {string} content
 * @property {string} time
 */

/**
 * @typedef {object} ScenarioConfig
 * @property {string} label
 * @property {SimMessage[]} initial
 * @property {string[]} [quickReplies]
 * @property {string} [inputDefault]
 */

/** @type {Record<ScenarioId, ScenarioConfig>} */
export const SCENARIOS = {
  po: {
    label: 'Confirm a PO',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          'Selamat pagi! 👋\n*PO-2025-00108* diterbitkan:\n📦 PET Bottle 100ml — 50,000 PCS\n💰 Rp 185.000.000\n📅 Delivery: 15 Apr 2026\n\nBalas: KONFIRMASI / TOLAK / UBAH',
        time: '09:00'
      }
    ],
    quickReplies: ['KONFIRMASI', 'TOLAK', 'UBAH']
  },
  asn: {
    label: 'Submit ASN',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          '🚚 *Pengingat ASN*\nPO-2025-00108 delivery dalam 3 hari.\nFormat ASN:\n*ASN [PO] [tgl kirim] [carrier] [resi]*\n\nContoh:\nASN PO-00108 2026-04-12 SampleCourier SMPL123456',
        time: '09:00'
      }
    ],
    inputDefault: 'ASN PO-00108 2026-04-12 SampleCourier SMPL123456'
  },
  inventory: {
    label: 'Update Inventory',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          '📊 *Update Stok Diperlukan*\nStok Niacinamide B3 Anda di sistem kami: 24 hari.\nMohon update posisi stok terkini.\n\nFormat: *STOK [material code] [qty] [unit]*',
        time: '13:00'
      }
    ],
    inputDefault: 'STOK MAT-10234 2400 KG'
  },
  invoice: {
    label: 'Invoice Query',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          '💰 *Status Invoice INV-2026-00234*\nStatus: ✅ Approved\nSAP Document: 5105000234\nEstimasi pembayaran: 5 Mei 2026\nBank: BCA ****4521\n\nAda pertanyaan? Balas chat ini.',
        time: '10:00'
      }
    ],
    inputDefault: 'Kapan transfer dilakukan?'
  }
};

/** @type {Record<ScenarioId, Record<string, string>>} */
export const BOT_REPLIES = {
  po: {
    KONFIRMASI:
      '✅ *Dikonfirmasi!*\nPO-2025-00108 confirmed 09:03\nSAP updated automatically ✓\nASN reminder in 5 days 🙏',
    TOLAK:
      'Noted. Alasan penolakan?\n1️⃣ Stok tidak tersedia\n2️⃣ Harga tidak sesuai\n3️⃣ Kapasitas penuh\n4️⃣ Lainnya',
    UBAH: 'Apa yang ingin diubah?\n📅 *TANGGAL* — ubah delivery date\n📊 *QTY* — ubah kuantitas\n💰 *HARGA* — diskusi harga',
    '1️⃣': 'Dipahami — stok tidak tersedia. Kami akan cari alternatif supplier. Tim akan menghubungi Anda untuk reschedule. 🙏',
    '2️⃣': 'Dipahami — harga tidak sesuai. Tim procurement akan menghubungi untuk negosiasi. 🙏',
    '3️⃣': 'Dipahami — kapasitas penuh. Kapan jadwal Anda tersedia? Balas dengan tanggal. 🙏',
    '4️⃣': 'Silakan jelaskan alasan penolakan Anda. Tim kami akan segera merespons. 🙏',
    TANGGAL: 'Balas dengan tanggal baru:\nFormat: *DATE YYYY-MM-DD*\nContoh: DATE 2026-04-20',
    QTY: 'Balas dengan kuantitas baru:\nFormat: *QTY [jumlah] [unit]*\nContoh: QTY 45000 PCS',
    HARGA:
      'Balas dengan harga usulan:\nFormat: *HARGA [amount] per [unit]*\nContoh: HARGA 3800 per PCS',
    default: 'Terima kasih! Tim Paragon akan menindaklanjuti pesan Anda. 🙏'
  },
  asn: {
    default:
      '✅ *ASN Diterima!*\nASN-2026-001 dibuat otomatis.\n🚚 Carrier: Sample Courier\n📋 Resi: SMPL123456\n📅 ETA: 12 Apr 2026\n\n*Slot dock:* Dock 1 — 09:00 WIB NDC Jatake 6\nMohon tiba 15 menit lebih awal. 🙏'
  },
  inventory: {
    default: '✅ Stok diperbarui: 2,400 KG (24 hari).\nIBP diperbarui otomatis. 🙏'
  },
  invoice: {
    default: 'Transfer dilakukan setiap Jumat.\nInvoice Anda dijadwalkan: Jumat 2 Mei 2026. 🙏'
  }
};

/** @type {Record<string, string[]>} */
export const FOLLOW_UP_REPLIES = {
  TOLAK: ['1️⃣', '2️⃣', '3️⃣', '4️⃣'],
  UBAH: ['TANGGAL', 'QTY', 'HARGA']
};

/**
 * @typedef {object} EmailScenarioMeta
 * @property {string} label
 * @property {string} subject
 * @property {string} preheader
 */

/** @type {Record<ScenarioId, EmailScenarioMeta>} */
export const EMAIL_SCENARIOS = {
  po: {
    label: 'PO Notification',
    subject: 'PO-2025-00108 — Action Required',
    preheader: 'Please confirm or request changes'
  },
  asn: {
    label: 'ASN Reminder',
    subject: 'ASN Required — PO-2025-00108',
    preheader: 'Delivery in 3 days, submit ASN'
  },
  inventory: {
    label: 'Inventory Alert',
    subject: 'Stock Update Request — Niacinamide B3',
    preheader: 'Current stock level check'
  },
  invoice: {
    label: 'Invoice Status',
    subject: 'INV-2026-00234 — Payment Scheduled',
    preheader: 'Payment timeline update'
  }
};

/**
 * @typedef {object} WeChatScenario
 * @property {string} label
 * @property {string} bot
 * @property {string[]} replies
 * @property {string} success
 */

/** @type {Record<ScenarioId, WeChatScenario>} */
export const WECHAT_SCENARIOS = {
  po: {
    label: 'Confirm PO',
    bot: 'Selamat pagi / 早上好\nPurchase Order received:\n📦 PO-2025-00108\nPET Bottle 100ml — 50,000 PCS\nRp 185,000,000\nDelivery: 15 Apr 2026\n\n中文: 采购订单已发出，请确认。\nReply: CONFIRM / REJECT / CHANGE',
    replies: ['CONFIRM', 'REJECT', 'CHANGE'],
    success: '✅ PO-2025-00108 Confirmed\nSAP updated automatically.\n已自动更新SAP系统。'
  },
  asn: {
    label: 'Submit ASN',
    bot: 'ASN Reminder / 发货通知提醒\nPO-2025-00108 delivery in 3 days.\nFormat: ASN [PO] [date] [carrier] [tracking]\n\n中文: 请在3天内提交发货通知。',
    replies: ['SUBMIT ASN'],
    success: '✅ ASN received. Dock slot: NDC Jatake 6 — Dock 1, 09:00 WIB\n装货通知已收到。'
  },
  inventory: {
    label: 'Inventory Alert',
    bot: 'Stock Update / 库存更新\nNiacinamide B3 stock: 24 days\nPlease update current stock level.\n\n中文: 请更新当前库存水平。\nFormat: STOCK [code] [qty] [unit]',
    replies: ['UPDATE STOCK'],
    success:
      '✅ Stock updated: 2,400 KG\nIBP system synced automatically.\n库存已自动同步至IBP系统。'
  },
  invoice: {
    label: 'Invoice Status',
    bot: 'Invoice Status / 发票状态\nINV-2026-00234: ✅ Approved\nSAP Doc: 5105000234\nPayment est: 5 May 2026\n\n中文: 发票已批准，预计付款日期5月5日。',
    replies: ['VIEW DETAILS'],
    success:
      '💰 Payment scheduled: Friday 2 May 2026\nBank: BCA ****4521\n付款日期：2026年5月2日（星期五）'
  }
};
