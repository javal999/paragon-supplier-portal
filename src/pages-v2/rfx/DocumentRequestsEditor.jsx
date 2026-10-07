// ────────────────────────────────────────────────────────────────────────────
// "DOCUMENTS FROM SUPPLIERS" — the buyer's document requests (NR-1 BR-02, B3).
//
// One editor serves the RFI, RFP and RFQ wizards, so the three cannot drift.
// Each row is a name, a type, a required flag and, on an RFQ only, the level:
// the whole response or one item (only an RFQ has items).
//
// ⚠️ **THE STEP'S RULE IS THE VERB'S RULE (RFX-R2).** The refusal shown here
// and the one each wizard's "Next" waits on is `documentRequestsRefusal`, the
// same function the create and revise verbs call, so the step can never accept
// a list the verb refuses. The editor only finds WHICH row it names, so the
// message can point at it in the buyer's language.
//
// ⚠️ **A REQUEST NAMES ITS ITEM BY LINE NUMBER, AND LINE NUMBERS ARE POSITIONS.**
// Removing an RFQ item renumbers every item after it, so the RFQ wizard remaps
// the requests in the same state update (`remapRequestsOnItemsChanged`): a
// request on a later item follows its item down, and a request on the removed
// item becomes response-level and is NAMED in a notice here until the buyer
// edits or dismisses it. Without the remap it would silently point at the
// wrong item.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
/** @import { TFunction } from 'i18next' */
import { Plus, X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import { documentRequestsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { DocumentRequest, DocumentType } from '@services/sourcing/types' */
import { DOCUMENT_TYPES } from '@services/sourcing/types';

/** One RFQ item a request can be for. */
/**
 * @typedef {{
 *     readonly lineNo: number;
 *     readonly description: string;
 *   }} DocumentRequestItem
 */

/**
 * The label of an RFQ item as the level select and the review show it.
 * @param {TFunction} t
 * @param {DocumentRequestItem} item
 * @returns {string}
 */
const itemLabel = (t, item) =>
  item.description.trim()
    ? `${t('rfxa.doc.level.item', { n: item.lineNo })} · ${item.description.trim()}`
    : t('rfxa.doc.level.item', { n: item.lineNo });

/**
 * A request id this list does not use yet.
 * @param {readonly DocumentRequest[]} requests
 * @returns {string}
 */
const freshId = (requests) => {
  let n = requests.length + 1;
  while (requests.some((r) => r.id === `doc-${n}`)) n += 1;
  return `doc-${n}`;
};

/** Requests after an item change, and the ids that lost their item. */
/**
 * `unlinked`:  Requests that were on a removed item and now apply to the whole response.
 *
 * @typedef {{
 *     readonly requests: readonly DocumentRequest[];
 *     readonly unlinked: readonly string[];
 *   }} DocumentRequestsRemap
 */

/**
 * The requests after RFQ item `removedLineNo` is removed. A request on a later
 * item moves down by one, with its item; a request on the removed item drops
 * its `itemLineNo` (whole response) and is reported in `unlinked`. Pure.
 * @param {readonly DocumentRequest[]} requests
 * @param {number} removedLineNo
 * @returns {DocumentRequestsRemap}
 */
export function remapRequestsOnItemRemoved(requests, removedLineNo) {
  /** @type {string[]} */
  const unlinked = [];
  const next = requests.map((r) => {
    if (r.itemLineNo === undefined || r.itemLineNo < removedLineNo) return r;
    if (r.itemLineNo > removedLineNo) return { ...r, itemLineNo: r.itemLineNo - 1 };
    unlinked.push(r.id);
    const { itemLineNo: _removed, ...rest } = r;
    return rest;
  });
  return { requests: next, unlinked };
}

/**
 * The requests after the item list changed from `prevKeys` to `nextKeys` (each
 * item's stable key, in order). Every key missing from `nextKeys` is a removed
 * item; removals apply from the last line up, so each line number is read in
 * the list it was taken from. Items added at the end renumber nothing.
 * @param {readonly DocumentRequest[]} requests
 * @param {readonly string[]} prevKeys
 * @param {readonly string[]} nextKeys
 * @returns {DocumentRequestsRemap}
 */
export function remapRequestsOnItemsChanged(requests, prevKeys, nextKeys) {
  const kept = new Set(nextKeys);
  const removedLines = prevKeys
    .map((key, i) => (kept.has(key) ? null : i + 1))
    .filter(/** @returns {n is number} */ (n) => n !== null)
    .sort((a, b) => b - a);
  /** @type {DocumentRequestsRemap} */
  let out = { requests, unlinked: [] };
  for (const line of removedLines) {
    const step = remapRequestsOnItemRemoved(out.requests, line);
    out = { requests: step.requests, unlinked: [...out.unlinked, ...step.unlinked] };
  }
  return out;
}

/**
 * `index`:  The index of the row the refusal names.
 * `message`:  The refusal in the buyer's language, naming the row.
 *
 * @typedef {{
 *     readonly index: number;
 *     readonly message: string;
 *   }} DocumentRequestsRefusalView
 */

/**
 * The verb's refusal, pointed at its row. `documentRequestsRefusal` judges the
 * rows in order and stops at the first it refuses, so the shortest prefix it
 * refuses ends at that row. The kind of refusal is read off the verb's own
 * detail; anything unrecognised still names the row.
 * @param {TFunction} t
 * @param {readonly DocumentRequest[]} requests
 * @param {readonly number[]} itemLines
 * @returns {DocumentRequestsRefusalView | null}
 */
export function documentRequestsRefusalView(t, requests, itemLines) {
  const reason = documentRequestsRefusal(requests, itemLines);
  if (!reason) return null;
  let index = requests.findIndex(
    (_, i) => documentRequestsRefusal(requests.slice(0, i + 1), itemLines) !== null
  );
  if (index < 0) index = 0;
  const row = requests[index];
  const vars = { n: index + 1, name: row?.name.trim() ?? '' };
  const kind = / has no name$/.test(reason)
    ? 'noName'
    : / is asked for twice$/.test(reason)
      ? 'duplicate'
      : / which is not an item of the RFQ$/.test(reason)
        ? 'item'
        : 'invalid';
  return { index, message: t(`rfxa.doc.refusal.${kind}`, vars) };
}

/**
 * @typedef {object} DocumentRequestsEditorProps
 * @property {readonly DocumentRequest[]} value
 * @property {(next: readonly DocumentRequest[]) => void} onChange
 * @property {readonly DocumentRequestItem[]} [items] -  The RFQ's items. Present = an RFQ, and each row offers a level select.
 * @property {readonly string[]} [unlinked] -  Requests whose item was removed (RFQ); each is named until edited or dismissed.
 * @property {(next: readonly string[]) => void} [onUnlinkedChange]
 * @property {string} testIdPrefix
 */

/** @type {React.FC<DocumentRequestsEditorProps>} */
const DocumentRequestsEditor = ({
  value,
  onChange,
  items,
  unlinked = [],
  onUnlinkedChange,
  testIdPrefix: p
}) => {
  const { t } = useTranslation();
  const itemLines = (items ?? []).map((i) => i.lineNo);
  const refusal = documentRequestsRefusalView(t, value, itemLines);
  const notices = value.filter((r) => unlinked.includes(r.id));

  /**
   * Editing or removing a row answers its notice.
   * @param {string} id
   */
  const settle = (id) => {
    if (unlinked.includes(id)) onUnlinkedChange?.(unlinked.filter((x) => x !== id));
  };

  /**
   * @param {string} id
   * @param {Partial<DocumentRequest>} next
   */
  const patch = (id, next) => {
    settle(id);
    onChange(value.map((r) => (r.id === id ? { ...r, ...next } : r)));
  };

  /**
   * @param {DocumentRequest} r
   * @param {string} level
   */
  const setLevel = (r, level) => {
    settle(r.id);
    const { itemLineNo: _dropped, ...rest } = r;
    onChange(
      value.map((x) =>
        x.id === r.id ? (level ? { ...rest, itemLineNo: Number(level) } : rest) : x
      )
    );
  };

  const add = () =>
    onChange([...value, { id: freshId(value), name: '', type: 'other', required: false }]);

  /** @param {string} id */
  const remove = (id) => {
    settle(id);
    onChange(value.filter((r) => r.id !== id));
  };

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  return (
    <div className="space-y-4" data-testid={`${p}-docs`}>
      {notices.length > 0 ? (
        <ul className="space-y-1" data-testid={`${p}-docs-unlinked`}>
          {notices.map((r) => (
            <li
              key={r.id}
              data-testid={`${p}-docs-unlinked-${r.id}`}
              className="flex items-start justify-between gap-3 text-sm text-warning-hover bg-warning-soft border border-warning rounded-md px-3 py-2"
            >
              <span>
                {t('rfxa.doc.unlinked', {
                  name: r.name.trim() || t('rfxa.doc.row', { n: value.indexOf(r) + 1 })
                })}
              </span>
              <button
                type="button"
                className="text-xs font-medium shrink-0 hover:underline"
                data-testid={`${p}-docs-unlinked-${r.id}-dismiss`}
                onClick={() => settle(r.id)}
              >
                {t('rfxa.doc.unlinked.dismiss')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid={`${p}-docs-empty`}>
          {t('rfxa.doc.empty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((r, i) => (
            <DocumentRequestRow
              key={r.id}
              request={r}
              n={i + 1}
              refused={refusal?.index === i}
              items={items}
              onPatch={(next) => patch(r.id, next)}
              onLevel={(level) => setLevel(r, level)}
              onRemove={() => remove(r.id)}
              inputClass={inputClass}
              labelClass={labelClass}
              testIdPrefix={p}
            />
          ))}
        </ul>
      )}

      {value.some((r) => r.type === 'certificate') && (
        <p className="text-xs text-text-tertiary">{t('rfxa.doc.certificateNote')}</p>
      )}

      {refusal ? (
        <p className="text-sm text-danger" role="alert" data-testid={`${p}-docs-refusal`}>
          {refusal.message}
        </p>
      ) : null}

      <Button variant="outline" icon={Plus} onClick={add} data-testid={`${p}-doc-add`}>
        {t('rfxa.doc.add')}
      </Button>
    </div>
  );
};

/** @type {React.FC<{ request: DocumentRequest; n: number; refused: boolean; items?: readonly DocumentRequestItem[]; onPatch: (next: Partial<DocumentRequest>) => void; onLevel: (level: string) => void; onRemove: () => void; inputClass: string; labelClass: string; testIdPrefix: string; }>} */
const DocumentRequestRow = ({
  request: r,
  n,
  refused,
  items,
  onPatch,
  onLevel,
  onRemove,
  inputClass,
  labelClass,
  testIdPrefix: p
}) => {
  const { t } = useTranslation();
  const rowName = t('rfxa.doc.row', { n });
  const id = `${p}-doc-${r.id}`;
  return (
    <li
      data-testid={id}
      className={`border rounded-md px-3 py-3 ${refused ? 'border-danger' : 'border-border-subtle'}`}
    >
      <div
        className={`grid grid-cols-1 gap-3 ${items ? 'sm:grid-cols-[2fr_1fr_1fr_auto_auto]' : 'sm:grid-cols-[2fr_1fr_auto_auto]'} items-end`}
      >
        <div>
          <label className={labelClass} htmlFor={`${id}-name`}>
            {t('rfxa.doc.name')}
          </label>
          <input
            id={`${id}-name`}
            data-testid={`${id}-name`}
            value={r.name}
            aria-invalid={refused}
            placeholder={t('rfxa.doc.name.ph')}
            onChange={(e) => onPatch({ name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${id}-type`}>
            {t('rfxa.doc.type')}
          </label>
          <select
            id={`${id}-type`}
            data-testid={`${id}-type`}
            value={r.type}
            onChange={(e) => onPatch({ type: /** @type {DocumentType} */ (e.target.value) })}
            className={inputClass}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`rfxa.doc.type.${type}`)}
              </option>
            ))}
          </select>
        </div>
        {items ? (
          <div>
            <label className={labelClass} htmlFor={`${id}-level`}>
              {t('rfxa.doc.level')}
            </label>
            <select
              id={`${id}-level`}
              data-testid={`${id}-level`}
              value={r.itemLineNo === undefined ? '' : String(r.itemLineNo)}
              onChange={(e) => onLevel(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('rfxa.doc.level.response')}</option>
              {items.map((item) => (
                <option key={item.lineNo} value={String(item.lineNo)}>
                  {itemLabel(t, item)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-text-secondary h-10">
          <input
            type="checkbox"
            className="accent-teal"
            checked={r.required}
            data-testid={`${id}-required`}
            aria-label={`${t('rfxa.doc.required')} — ${rowName}`}
            onChange={(e) => onPatch({ required: e.target.checked })}
          />
          {t('rfxa.doc.required')}
        </label>
        <button
          type="button"
          aria-label={`${t('rfxa.doc.remove')} — ${rowName}`}
          data-testid={`${id}-remove`}
          onClick={onRemove}
          className="text-text-tertiary hover:text-danger h-10"
        >
          <X size={16} />
        </button>
      </div>
    </li>
  );
};

/**
 * The requests as the review step lists them: name, type, required or
 * optional, and on an RFQ what each is for.
 * @type {React.FC<{ value: readonly DocumentRequest[]; items?: readonly DocumentRequestItem[]; testIdPrefix: string; }>}
 */
export const DocumentRequestsSummary = ({ value, items, testIdPrefix: p }) => {
  const { t } = useTranslation();
  if (value.length === 0) {
    return <span data-testid={`${p}-review-docs-none`}>{t('rfxa.doc.review.none')}</span>;
  }
  return (
    <ul className="space-y-1" data-testid={`${p}-review-docs`}>
      {value.map((r) => {
        const item =
          r.itemLineNo === undefined ? undefined : items?.find((i) => i.lineNo === r.itemLineNo);
        return (
          <li key={r.id} className="text-sm" data-testid={`${p}-review-doc-${r.id}`}>
            <span className="text-text-primary">{r.name}</span>
            <StatusPill variant="neutral" className="ml-2">
              {t(`rfxa.doc.type.${r.type}`)}
            </StatusPill>
            <span className="ml-2 text-text-secondary">
              {t(r.required ? 'rfxa.doc.required' : 'rfxa.doc.optional')}
            </span>
            {items ? (
              <span className="ml-2 text-text-tertiary">
                {item ? itemLabel(t, item) : t('rfxa.doc.level.response')}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export default DocumentRequestsEditor;
