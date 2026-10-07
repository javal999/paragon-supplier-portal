// ────────────────────────────────────────────────────────────────────────────
// Central shipment-mode label map (SEAT2-I18N-MODE-01) — a sibling of
// statusLabel.js / priorityLabel.js for the ShipmentMode enum.
//
// `ShipmentMode` (`'Sea' | 'Air' | 'Road'`, src/data/mockShipments.js) is a
// shared, context-independent vocabulary that renders in table cells, filter
// chips, and side panels on both BuyerShipments and SupplierShipments — but was
// left canonical EN in Batch 4 because no central label map existed and the chip
// `id` is matched against `s.mode` (data). This map closes that gap.
//
// HONEST-BY-CONSTRUCTION: display-only. The stored `s.mode` value and the
// FilterChipsBar `id` stay canonical EN (the id drives `s.mode` filtering); only
// the visible label is resolved through here. `useModeLabel()` is the display
// resolver — never feed its output back into state, a filter id, or a mutation.
//
// Slugs are namespaced `mode.*` so they never collide with `status.*` / `enum.*`.
// ────────────────────────────────────────────────────────────────────────────

// canonical ShipmentMode → Bahasa Indonesia.
/** @type {Record<string, string>} */
const MODE_ID = {
  Sea: 'Laut',
  Air: 'Udara',
  Road: 'Darat'
};

// The canonical set, in declaration order (resource spread + guard test).
export const CANONICAL_MODES = Object.keys(MODE_ID);

// Case-insensitive index: normalized token → canonical token.
const BY_NORM = new Map(CANONICAL_MODES.map((k) => [k.trim().toLowerCase(), k]));

/**
 * Slug a canonical mode into its i18n key: "Sea" → "mode.sea".
 * @param {string} mode
 * @returns {string}
 */
function slug(mode) {
  return (
    'mode.' +
    mode
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

/**
 * The i18n key for a shipment-mode label, or null if the token is not a known
 * mode (caller then renders it verbatim). Trimmed and case-insensitive.
 * @param {string} mode
 * @returns {string | null}
 */
export function modeLabelKey(mode) {
  const canon = BY_NORM.get(mode.trim().toLowerCase());
  return canon ? slug(canon) : null;
}

/**
 * i18n resource fragments — spread into the en/id translation namespaces.
 * @type {Record<string, string>}
 */
export const modeResourcesEn = Object.fromEntries(CANONICAL_MODES.map((s) => [slug(s), s]));
/** @type {Record<string, string>} */
export const modeResourcesId = Object.fromEntries(
  CANONICAL_MODES.map((s) => [slug(s), MODE_ID[s]])
);

// Re-exported for the guard test (coverage + slug-collision checks).
export const __modeInternals = { MODE_ID, slug };
