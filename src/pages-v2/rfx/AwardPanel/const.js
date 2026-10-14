/** @import { ItemDraft } from './types' */

/** An item no control has touched yet: award it, split by %, nothing typed. */
/** @type {ItemDraft} */
export const EMPTY_DRAFT = { choice: 'award', basis: 'pct', values: {} };
