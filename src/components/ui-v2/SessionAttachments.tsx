import React, { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, X } from 'lucide-react';
import Button from './Button';
import Data from './Data';
import {
  formatBytes,
  sessionAttachments,
  type AttachmentMeta,
} from '../../services/attachments/sessionAttachments';

// ────────────────────────────────────────────────────────────────────────────
// The shared attachment control (BL-27: no file store). It adds files to the
// session store, hands the RECORD back only their metadata, and says on the
// screen, every time it renders, that the file itself lasts for this session
// only. A file whose bytes are no longer held (after a reload) is listed with
// its name and size and an honest "not available in this session" instead of a
// link that would open nothing.
// ────────────────────────────────────────────────────────────────────────────

interface SessionAttachmentsProps {
  value: readonly AttachmentMeta[];
  /** Absent = read-only (the RFI/RFP read surfaces pass none). */
  onChange?: (next: readonly AttachmentMeta[]) => void;
  label: string;
  testId: string;
  /** Read-only lists render no add or remove control. */
  readOnly?: boolean;
  /** One file only (an RFP's T&C document): adding replaces it. */
  single?: boolean;
}

const SessionAttachments: React.FC<SessionAttachmentsProps> = ({
  value,
  onChange,
  label,
  testId,
  readOnly: readOnlyProp = false,
  single = false,
}) => {
  const { t } = useTranslation();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  // A control with nothing to call is a false affordance, so no handler means
  // no add and no remove — the same as an explicit `readOnly`.
  const readOnly = readOnlyProp || !onChange;

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || !onChange) return;
    const added = [...files].map((f) => sessionAttachments.add(f));
    if (single) {
      value.forEach((a) => sessionAttachments.release(a.id));
      onChange(added.slice(0, 1));
    } else {
      onChange([...value, ...added]);
    }
    if (input.current) input.current.value = '';
  };

  const remove = (id: string) => {
    if (!onChange) return;
    sessionAttachments.release(id);
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
              onChange={(e) => onFiles(e.target.files)}
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
      {value.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t('attachments.none')}</p>
      ) : (
        <ul className="space-y-1">
          {value.map((a) => {
            const url = sessionAttachments.urlFor(a.id);
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 text-sm border border-border-subtle rounded-md px-3 py-1.5"
                data-testid={`${testId}-row`}
              >
                <span className="min-w-0 truncate">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-action hover:underline">
                      {a.name}
                    </a>
                  ) : (
                    <span className="text-text-primary">{a.name}</span>
                  )}{' '}
                  <Data className="text-text-tertiary text-xs">{formatBytes(a.size)}</Data>
                  {!url && (
                    <span className="ml-2 text-xs text-text-tertiary">{t('attachments.notHeld')}</span>
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
