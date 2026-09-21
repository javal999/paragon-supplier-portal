import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, X } from 'lucide-react';
import Button from './Button';
import Data from './Data';
import {
  formatFileSize,
  holdSessionFile,
  releaseSessionFile,
  sessionFileUrl,
  type SessionAttachmentMeta,
} from '../../lib/sessionFiles';

// ─────────────────────────────────────────────────────────────────────────────
// SESSION ATTACHMENTS — a list of attached files, with an "Attach" control when
// editable. The record keeps metadata only; the file opens through an object
// URL while this browser session lasts (`lib/sessionFiles`, BL-27).
//
// The component SAYS so every time it renders, beside the list, because a file
// that silently vanishes on reload reads as a defect, and one the page warned
// about reads as the honest limit it is.
//
// Plain API, controlled: `value` in, `onChange` out. Read-only when `onChange`
// is absent — a list with no Attach button and no remove buttons, because a
// control the reader cannot use is a false affordance.
// ─────────────────────────────────────────────────────────────────────────────

interface SessionAttachmentsProps {
  value: readonly SessionAttachmentMeta[];
  /** Absent = read-only. */
  onChange?: (next: readonly SessionAttachmentMeta[]) => void;
  /** Allow one file only (e.g. a T&C document). */
  single?: boolean;
  /** Accessible name for the file picker. */
  label: string;
  testId: string;
  disabled?: boolean;
}

const SessionAttachments: React.FC<SessionAttachmentsProps> = ({
  value,
  onChange,
  single = false,
  label,
  testId,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const editable = !!onChange && !disabled;

  const add = (files: FileList | null) => {
    if (!files || !onChange) return;
    const added = [...files].map(holdSessionFile);
    onChange(single ? added.slice(0, 1) : [...value, ...added]);
    if (input.current) input.current.value = '';
  };

  const remove = (id: string) => {
    if (!onChange) return;
    releaseSessionFile(id);
    onChange(value.filter((a) => a.id !== id));
  };

  return (
    <div data-testid={testId} className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((a) => {
            const url = sessionFileUrl(a.id);
            return (
              <li
                key={a.id}
                data-testid={`${testId}-file-${a.id}`}
                className="flex flex-wrap items-center gap-2 text-sm border border-border-subtle rounded-md px-3 py-1.5"
              >
                <Paperclip size={14} className="text-text-tertiary" aria-hidden />
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="text-action underline">
                    {a.name}
                  </a>
                ) : (
                  <span className="text-text-primary">{a.name}</span>
                )}
                <Data className="text-xs text-text-tertiary">{formatFileSize(a.size)}</Data>
                {!url && (
                  <span className="text-xs text-text-tertiary" data-testid={`${testId}-unavailable-${a.id}`}>
                    {t('sessionFiles.notThisSession')}
                  </span>
                )}
                {editable && (
                  <button
                    type="button"
                    aria-label={`${t('sessionFiles.remove')} — ${a.name}`}
                    data-testid={`${testId}-remove-${a.id}`}
                    onClick={() => remove(a.id)}
                    className="ml-auto text-text-tertiary hover:text-danger"
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {value.length === 0 && !editable && (
        <p className="text-xs text-text-tertiary">{t('sessionFiles.none')}</p>
      )}
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            multiple={!single}
            aria-label={label}
            data-testid={`${testId}-input`}
            className="sr-only"
            onChange={(e) => add(e.target.files)}
          />
          <Button variant="secondary" onClick={() => input.current?.click()} data-testid={`${testId}-attach`}>
            {single && value.length > 0 ? t('sessionFiles.replace') : t('sessionFiles.attach')}
          </Button>
        </div>
      )}
      <p className="text-xs text-text-tertiary" data-testid={`${testId}-note`}>
        {t('sessionFiles.sessionOnly')}
      </p>
    </div>
  );
};

export default SessionAttachments;
