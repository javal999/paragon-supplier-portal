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
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Plus, X } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import StatusPill from '../../components/ui-v2/StatusPill';
import { documentRequestsRefusal } from '../../services/transitions/rfxDocumentRules';
import { DOCUMENT_TYPES, type DocumentRequest, type DocumentType } from '../../services/sourcing/types';

/** One RFQ item a request can be for. */
export interface DocumentRequestItem {
  readonly lineNo: number;
  readonly description: string;
}

/** The label of an RFQ item as the level select and the review show it. */
const itemLabel = (t: TFunction, item: DocumentRequestItem): string =>
  item.description.trim()
    ? `${t('rfxa.doc.level.item', { n: item.lineNo })} · ${item.description.trim()}`
    : t('rfxa.doc.level.item', { n: item.lineNo });

/** A request id this list does not use yet. */
const freshId = (requests: readonly DocumentRequest[]): string => {
  let n = requests.length + 1;
  while (requests.some((r) => r.id === `doc-${n}`)) n += 1;
  return `doc-${n}`;
};

export interface DocumentRequestsRefusalView {
  /** The index of the row the refusal names. */
  readonly index: number;
  /** The refusal in the buyer's language, naming the row. */
  readonly message: string;
}

/**
 * The verb's refusal, pointed at its row. `documentRequestsRefusal` judges the
 * rows in order and stops at the first it refuses, so the shortest prefix it
 * refuses ends at that row. The kind of refusal is read off the verb's own
 * detail; anything unrecognised still names the row.
 */
export function documentRequestsRefusalView(
  t: TFunction,
  requests: readonly DocumentRequest[],
  itemLines: readonly number[],
): DocumentRequestsRefusalView | null {
  const reason = documentRequestsRefusal(requests, itemLines);
  if (!reason) return null;
  let index = requests.findIndex((_, i) => documentRequestsRefusal(requests.slice(0, i + 1), itemLines) !== null);
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

interface DocumentRequestsEditorProps {
  value: readonly DocumentRequest[];
  onChange: (next: readonly DocumentRequest[]) => void;
  /** The RFQ's items. Present = an RFQ, and each row offers a level select. */
  items?: readonly DocumentRequestItem[];
  testIdPrefix: string;
}

const DocumentRequestsEditor: React.FC<DocumentRequestsEditorProps> = ({
  value,
  onChange,
  items,
  testIdPrefix: p,
}) => {
  const { t } = useTranslation();
  const itemLines = (items ?? []).map((i) => i.lineNo);
  const refusal = documentRequestsRefusalView(t, value, itemLines);

  const patch = (id: string, next: Partial<DocumentRequest>) =>
    onChange(value.map((r) => (r.id === id ? { ...r, ...next } : r)));

  const setLevel = (r: DocumentRequest, level: string) => {
    const { itemLineNo: _dropped, ...rest } = r;
    onChange(value.map((x) => (x.id === r.id ? (level ? { ...rest, itemLineNo: Number(level) } : rest) : x)));
  };

  const add = () =>
    onChange([...value, { id: freshId(value), name: '', type: 'other', required: false }]);

  const remove = (id: string) => onChange(value.filter((r) => r.id !== id));

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  return (
    <div className="space-y-4" data-testid={`${p}-docs`}>
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

const DocumentRequestRow: React.FC<{
  request: DocumentRequest;
  n: number;
  refused: boolean;
  items?: readonly DocumentRequestItem[];
  onPatch: (next: Partial<DocumentRequest>) => void;
  onLevel: (level: string) => void;
  onRemove: () => void;
  inputClass: string;
  labelClass: string;
  testIdPrefix: string;
}> = ({ request: r, n, refused, items, onPatch, onLevel, onRemove, inputClass, labelClass, testIdPrefix: p }) => {
  const { t } = useTranslation();
  const rowName = t('rfxa.doc.row', { n });
  const id = `${p}-doc-${r.id}`;
  return (
    <li
      data-testid={id}
      className={`border rounded-md px-3 py-3 ${refused ? 'border-danger' : 'border-border-subtle'}`}
    >
      <div className={`grid grid-cols-1 gap-3 ${items ? 'sm:grid-cols-[2fr_1fr_1fr_auto_auto]' : 'sm:grid-cols-[2fr_1fr_auto_auto]'} items-end`}>
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
            onChange={(e) => onPatch({ type: e.target.value as DocumentType })}
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
 */
export const DocumentRequestsSummary: React.FC<{
  value: readonly DocumentRequest[];
  items?: readonly DocumentRequestItem[];
  testIdPrefix: string;
}> = ({ value, items, testIdPrefix: p }) => {
  const { t } = useTranslation();
  if (value.length === 0) {
    return <span data-testid={`${p}-review-docs-none`}>{t('rfxa.doc.review.none')}</span>;
  }
  return (
    <ul className="space-y-1" data-testid={`${p}-review-docs`}>
      {value.map((r) => {
        const item = r.itemLineNo === undefined ? undefined : items?.find((i) => i.lineNo === r.itemLineNo);
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
