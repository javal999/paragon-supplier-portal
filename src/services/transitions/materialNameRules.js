// ────────────────────────────────────────────────────────────────────────────
// Material C2 · SUPPLIER TRADE NAMES — THE RULES (MR-3 BR-01 to BR-06).
//
// Pure functions, called by BOTH the `MATERIAL_NAME_VALID` policy hook and the
// pages' pre-checks (MAT-R2), so the form and the verb refuse the same input
// with the same code:
//
//   · NOT_ASSIGNED        the material is not assigned to the supplier (AC-01)
//   · NAME_LENGTH         the trade name is not 2 to 80 characters (BR-05)
//   · SUPPLIER_NO_LENGTH  the supplier material number is over 40 characters (BR-05)
//   · REASON_REQUIRED     a rejection without a reason (AC-05)
//
// Whether a material is assigned is a READ (the inventory model), so it is
// passed in rather than looked up here.
// ────────────────────────────────────────────────────────────────────────────

export const TRADE_NAME_MIN = 2;
export const TRADE_NAME_MAX = 80;
export const SUPPLIER_MATERIAL_NO_MAX = 40;

/** @typedef {'NOT_ASSIGNED' | 'NAME_LENGTH' | 'SUPPLIER_NO_LENGTH' | 'REASON_REQUIRED'} MaterialNameRefusal */

/**
 * Every refusal code, in the order the rule checks them.
 * @type {readonly MaterialNameRefusal[]}
 */
export const MATERIAL_NAME_REFUSALS = Object.freeze([
  'NOT_ASSIGNED',
  'NAME_LENGTH',
  'SUPPLIER_NO_LENGTH',
  'REASON_REQUIRED'
]);

/**
 * A trade name as recorded: trimmed, runs of spaces collapsed.
 * @param {unknown} value
 * @returns {string}
 */
export const cleanTradeName = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

/**
 * A supplier material number as recorded: trimmed, or absent when blank.
 * @param {unknown} value
 * @returns {string | undefined}
 */
export const cleanSupplierMaterialNo = (value) => {
  const v = typeof value === 'string' ? value.trim() : '';
  return v === '' ? undefined : v;
};

/**
 * A submitted or loaded name (BR-05, AC-01). Returns the first refusal, or null.
 * A name identical to PTI's description is accepted (edge case 3).
 * @param {{ readonly assigned: boolean; readonly tradeName: unknown; readonly supplierMaterialNo?: unknown; }} input
 * @returns {MaterialNameRefusal | null}
 */
export function materialNameEntryRefusal(input) {
  if (!input.assigned) return 'NOT_ASSIGNED';
  const name = cleanTradeName(input.tradeName);
  if (name.length < TRADE_NAME_MIN || name.length > TRADE_NAME_MAX) return 'NAME_LENGTH';
  const no = cleanSupplierMaterialNo(input.supplierMaterialNo);
  if (no !== undefined && no.length > SUPPLIER_MATERIAL_NO_MAX) return 'SUPPLIER_NO_LENGTH';
  return null;
}

/**
 * A rejection (AC-05): the reason is required, and blank is not a reason.
 * @param {unknown} reason
 * @returns {MaterialNameRefusal | null}
 */
export function materialNameRejectRefusal(reason) {
  return typeof reason === 'string' && reason.trim() !== '' ? null : 'REASON_REQUIRED';
}

/**
 * The refusal code at the end of a dispatcher reason (`POLICY_REJECTED:hook:CODE`), if it is one of ours.
 * @param {string | undefined} reason
 * @returns {MaterialNameRefusal | null}
 */
export function materialNameRefusalOf(reason) {
  const code = (reason ?? '').split(':').pop() ?? '';
  return /** @type {readonly string[]} */ (MATERIAL_NAME_REFUSALS).includes(code)
    ? /** @type {MaterialNameRefusal} */ (code)
    : null;
}

// ─── The bulk load file (BR-06) ─────────────────────────────────────────────

/** One row of the bulk load: PTI code, supplier ID, trade name, supplier material number. */
/**
 * `line`:  1-based line number in the file, for the planner.
 *
 * @typedef {{
 *   readonly line: number;
 *   readonly materialCode: string;
 *   readonly supplierId: string;
 *   readonly tradeName: string;
 *   readonly supplierMaterialNo?: string;
 * }} TradeNameCsvRow
 */

/**
 * `badLines`:  Lines that do not have 3 or 4 columns.
 *
 * @typedef {{
 *   readonly rows: readonly TradeNameCsvRow[];
 *   readonly badLines: readonly number[];
 * }} TradeNameCsvParse
 */

/**
 * Split one CSV line, honouring double quotes ("a, b" and "" inside quotes).
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  /** @type {string[]} */
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else cell += ch;
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/**
 * A first line naming the columns rather than carrying a material code.
 * @param {readonly string[]} cells
 * @returns {boolean}
 */
const isHeader = (cells) =>
  /code|kode/i.test(cells[0] ?? '') && /supplier|pemasok/i.test(cells[1] ?? '');

/**
 * Parse the bulk load file. Blank lines are skipped and a header line is
 * recognised. Values are passed on as written; the verb validates each row.
 * @param {string} text
 * @returns {TradeNameCsvParse}
 */
export function parseTradeNameCsv(text) {
  /** @type {TradeNameCsvRow[]} */
  const rows = [];
  /** @type {number[]} */
  const badLines = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    if (raw.trim() === '') return;
    const cells = splitCsvLine(raw);
    if (i === 0 && isHeader(cells)) return;
    if (cells.length < 3 || cells.length > 4) {
      badLines.push(i + 1);
      return;
    }
    rows.push({
      line: i + 1,
      materialCode: cells[0],
      supplierId: cells[1],
      tradeName: cells[2],
      ...(cells[3] ? { supplierMaterialNo: cells[3] } : {})
    });
  });
  return { rows, badLines };
}
