// ────────────────────────────────────────────────────────────────────────────
// The file-limit rule (NR-1 BR-05, decision D-3, accepted 2026-09-25).
//
// One pure function, shared by a screen's pre-check and a verb's policy hook
// (RFX-R2). No screen or policy calls it yet: wiring it into supplier responses
// is B1 and B4. The limits are named constants so a change is a 1-line edit
// with a failing test beside it.
// ────────────────────────────────────────────────────────────────────────────

/** At most 25 MB per file. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** At most 30 files per response. */
export const MAX_FILES_PER_RESPONSE = 30;

/**
 * The extensions that pass, lower case. Anything else is refused, which is
 * what keeps ZIP archives and executables out.
 * @type {readonly string[]}
 */
export const ALLOWED_FILE_EXTENSIONS = Object.freeze([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'dwg',
  'dxf',
  'step',
  'stp'
]);

/** @typedef {'FILE_TOO_LARGE' | 'FILE_TYPE_NOT_ALLOWED' | 'FILE_COUNT_EXCEEDED'} FileLimitRefusal */

/**
 * The extension after the last dot, lower case; `''` when there is none.
 * @param {string} name
 * @returns {string}
 */
const extensionOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
};

/**
 * Why this file may not be added, or `null` when it may.
 *
 * `filesAlready` is how many files the response holds before this one. The
 * type is judged by the file name's extension: the browser's reported MIME
 * type is often empty for DWG, DXF and STEP files, so it cannot be the test.
 * @param {{ name: string; size: number; type: string }} file
 * @param {number} filesAlready
 * @returns {FileLimitRefusal | null}
 */
export function fileLimitRefusal(file, filesAlready) {
  if (filesAlready >= MAX_FILES_PER_RESPONSE) return 'FILE_COUNT_EXCEEDED';
  if (!ALLOWED_FILE_EXTENSIONS.includes(extensionOf(file.name))) return 'FILE_TYPE_NOT_ALLOWED';
  if (file.size > MAX_FILE_BYTES) return 'FILE_TOO_LARGE';
  return null;
}
