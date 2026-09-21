// ────────────────────────────────────────────────────────────────────────────
// SDC-3c-a — the row vocabulary a parsed supplier message is expressed in.
//
// ⚠️ BL-73 · REQ-E08-02 BR-09 — THE ADAPTER THAT LIVED HERE IS RETIRED. This
// module used to hold `parseGrid`: rows → validated InventoryDeclaration
// dispatch units, with its own number rules (`ParseReason`), its own batch-fold
// reconciliation and its own payload assembly. Its last callers were the two
// channel-triage surfaces (`CommHubInbound`, `BuyerChannelTriage`), which
// recorded stock through it — a second stock entry beside the Stock page. They
// now pre-fill the Stock page's own entry form (`StockEntryPanel`), whose
// checks are `inventoryRules` (CR-18 `readStockNumber`, CR-19 batch total,
// `batchDatesProblem`) and whose dispatch is `useInventoryCommand`. With no
// caller left, the adapter was duplicate stock-entry code and is deleted rather
// than kept as a second rule set that could drift from the first.
//
// What stays is the VOCABULARY the reply parser (`channel/replyParser.ts`)
// still emits: a row is `Record<string, string>` keyed by
// `IMPORT_DECLARE_COLUMN`, and its `specHint` names what the row would be.
// ────────────────────────────────────────────────────────────────────────────

/** One tabular row — source-agnostic string cells. */
export type GridRow = Record<string, string>;

/** What a parsed row means: one total-only stock declaration. */
export type GridParseSpec = {
  readonly kind: 'InventoryDeclaration';
  readonly mode: 'import';
};

/** Canonical import-row column keys. */
export const IMPORT_DECLARE_COLUMN = {
  materialCode: 'materialCode',
  totalQty: 'totalQty',
} as const;
