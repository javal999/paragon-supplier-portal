// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp share link (INV-D9) — the one place the portal builds a `wa.me`
// link. It opens WhatsApp with the text filled in and lets the person choose
// the chat; the hub sends nothing itself. No helper existed in the tree before
// this one (searched for `wa.me` and WhatsApp share helpers).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A `wa.me` link that opens WhatsApp with `text` ready to send.
 * @param {string} text
 * @returns {string}
 */
export const whatsAppShareHref = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
