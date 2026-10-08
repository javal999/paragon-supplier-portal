// BuyerStabilise — module-scope constants and the page's shared typedefs.
// Moved out of the page file unchanged (frontend-standard Phase 5 split).

/** @import { StabiliseRule } from '@services/engine/stabilise' */

/** @typedef {'engine' | 'sapHistory'} Source */

/** @typedef {'publish' | 'versions'} Tab */

/** @typedef {'pass' | 'attention' | 'count' | 'unknown'} ItemState */

/**
 * @typedef {{
 *     readonly id: 'inputs' | 'orders' | 'warehouse' | 'held';
 *     readonly state: ItemState;
 *     readonly text: string;
 *     readonly to: string;
 *     readonly linkText: string;
 *   }} ChecklistItem
 */

/**
 * The StatusPill tone for the rule that set a week's published value.
 * @type {Record<StabiliseRule, 'neutral' | 'info' | 'warning'>}
 */
export const RULE_VARIANT = {
  new: 'neutral',
  unchanged: 'neutral',
  firmFrozen: 'info',
  forecast: 'neutral',
  damped: 'info',
  bandHeld: 'warning',
  cumulativeHeld: 'warning',
  override: 'warning'
};

/** The address parameter that holds the shown tab (`?tab=versions`). */
export const TAB_PARAM = 'tab';

/**
 * The StatusPill tone for each publish-checklist item state.
 * @type {Record<ItemState, 'success' | 'warning' | 'neutral'>}
 */
export const ITEM_VARIANT = {
  pass: 'success',
  attention: 'warning',
  count: 'neutral',
  unknown: 'neutral'
};
