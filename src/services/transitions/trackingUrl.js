// ─────────────────────────────────────────────────────────────────────────────
// TRACKING LINK ON A PRINCIPAL SHIPMENT — PEX-16 (BL-279), [M04 5].
//
// BR-01: on the supplier Stock page, an incoming shipment from the principal
// can carry a tracking URL typed by the supplier. It is not an ASN and does not
// use the 3PL `trackingUrlPattern`.
// BR-02: the link opens in a new tab; only `https://` links are accepted.
//
// The ONE expression of the rule, read by the policy hook (the law) and by the
// Stock page form (a courtesy mirror that shows the message before sending).
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'empty' | 'notHttps' | 'invalid'} TrackingUrlProblem */

/**
 * Why a typed tracking URL is refused, or null when it is accepted.
 * @param {unknown} raw
 * @returns {TrackingUrlProblem | null}
 */
export function trackingUrlProblem(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return 'empty';
  if (!/^https:\/\//i.test(text)) return 'notHttps';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || !url.hostname || /\s/.test(text)) return 'invalid';
  } catch {
    return 'invalid';
  }
  return null;
}
