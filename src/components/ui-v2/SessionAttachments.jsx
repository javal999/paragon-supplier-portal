/** @import * as React from 'react' */
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, X } from 'lucide-react';
import Button from './Button';
import Data from './Data';
import { formatBytes } from '@services/attachments/sessionAttachments';
import { useDataService } from '@services/data/DataServiceContext';

// ────────────────────────────────────────────────────────────────────────────
// The shared attachment control (BL-27: no file store). It puts files through
// the data service's file seam (`useDataService().files`, the session store
// today), hands the RECORD back only their metadata, and says on the
// screen, every time it renders, that the file itself lasts for this session
// only. A file whose bytes are no longer held (after a reload) is listed with
// its name and size and an honest "not available in this session" instead of a
// link that would open nothing.
// ────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SessionAttachmentsProps
 * @property {readonly AttachmentMeta[]} value
 * @property {(next: readonly AttachmentMeta[]) => void} [onChange] Absent = read-only (the RFI/RFP read surfaces pass none).
 * @property {string} label
 * @property {string} testId
 * @property {boolean} [readOnly] Read-only lists render no add or remove control.
 * @property {boolean} [single] One file only (an RFP's T&C document): adding replaces it.
 * @property {(file: File, acceptedBefore: number) => string | null} [refuse] NR-1 BR-05 — the pre-check on pick. Called for each picked file, in order,
 * with how many files of this pick were accepted before it; a returned text
 * refuses that file, which is never put, and the text is shown. Absent =
 * every file is taken.
 */

/**
 * @param {SessionAttachmentsProps} props
 * @returns {React.ReactNode}
 */
const SessionAttachments = ({
  value,
  onChange,
  label,
  testId,
  readOnly: readOnlyProp = false,
  single = false,
  refuse
}) => {
  const { t } = useTranslation();
  const { files: fileService } = useDataService();
  const inputId = useId();
  const input = useRef(/** @type {HTMLInputElement | null} */ (null));
  // A control with nothing to call is a false affordance, so no handler means
  // no add and no remove — the same as an explicit `readOnly`.
  const readOnly = readOnlyProp || !onChange;
  const [refusals, setRefusals] = useState(/** @type {readonly string[]} */ ([]));

  /** @param {FileList | null} files */
  const onFiles = async (files) => {
    if (!files || files.length === 0 || !onChange) return;
    const picked = [...files];
    // Clear the input first: the list is copied, and the same file can then be
    // picked again while `put` is still resolving.
    if (input.current) input.current.value = '';
    /** @type {File[]} */
    const accepted = [];
    /** @type {string[]} */
    const refused = [];
    for (const f of picked) {
      const reason = refuse ? refuse(f, accepted.length) : null;
      if (reason) refused.push(reason);
      else accepted.push(f);
    }
    setRefusals(refused);
    if (accepted.length === 0) return;
    const added = await Promise.all(accepted.map((f) => fileService.put(f)));
    if (single) {
      value.forEach((a) => fileService.release(a.id));
      onChange(added.slice(0, 1));
    } else {
      onChange([...value, ...added]);
    }
  };

  /** @param {string} id */
  const remove = (id) => {
    if (!onChange) return;
    fileService.release(id);
    onChange(value.filter((a) => a.id !== id));
  };

  return (
    <div data-testid={testId} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label text-text-tertiary uppercase">{label}</span>
        {!readOnly && (
          <>
            <input
              ref={input}
              id={inputId}
              type="file"
              multiple={!single}

              className="sr-only"
              data-testid={`${testId}-input`}
              aria-label={label}
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button
              variant="secondary"
              icon={Paperclip}
              onClick={() => input.current?.click()}
              data-testid={`${testId}-add`}
            >
              {t('attachments.add')}
            </Button>
          </>
        )}
      </div>
      {refusals.length > 0 && (
        <ul
          role="alert"
          className="text-xs text-danger space-y-0.5"
          data-testid={`${testId}-refusal`}
        >
          {refusals.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {value.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t('attachments.none')}</p>
      ) : (
        <ul className="space-y-1">
          {value.map((a) => {
            const url = fileService.urlFor(a.id);
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 text-sm border border-border-subtle rounded-md px-3 py-1.5"
                data-testid={`${testId}-row`}
              >
                <span className="min-w-0 truncate">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-action hover:underline"
                    >
                      {a.name}
                    </a>
                  ) : (
                    <span className="text-text-primary">{a.name}</span>
                  )}{' '}
                  <Data className="text-text-tertiary text-xs">{formatBytes(a.size)}</Data>
                  {!url && (
                    <span className="ml-2 text-xs text-text-tertiary">
                      {t('attachments.notHeld')}
                    </span>
                  )}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    aria-label={t('attachments.remove', { name: a.name })}
                    className="text-text-tertiary hover:text-danger"
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-text-tertiary" data-testid={`${testId}-note`}>
        {t('attachments.sessionOnly')}
      </p>
    </div>
  );
};

export default SessionAttachments;
