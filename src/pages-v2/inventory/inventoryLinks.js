// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX lane 2D — the one place the PTI inventory surfaces build the
// addresses of their order and simulation actions for a supplier × material
// pair: the material drawer, the PTI Alerts next step and Stock simulation.
// Each target page reads its parameters by name.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string} "Open stock simulation" on this pair.
 */
export const stockSimulationHref = (supplierId, materialCode) =>
  `/buyer/stock-simulation?q=${encodeURIComponent(materialCode)}&supplier=${encodeURIComponent(supplierId)}`;

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string} "Create call-off" pre-filled with this pair.
 */
export const callOffHref = (supplierId, materialCode) =>
  `/buyer/call-offs?newFor=${encodeURIComponent(supplierId)}&material=${encodeURIComponent(materialCode)}`;

/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string} "Create PO request" pre-filled with this pair.
 */
export const poRequestHref = (supplierId, materialCode) =>
  `/buyer/purchase-requisition?new=1&supplier=${encodeURIComponent(supplierId)}&material=${encodeURIComponent(materialCode)}`;
