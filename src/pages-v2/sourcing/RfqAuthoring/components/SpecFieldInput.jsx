import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
/** @import { RfqSpecField } from '@services/sourcing/rfqModel' */
import { inputClass } from '../const';

/**
 * One buyer-filled spec value: a select for a `choice` field, else a text input
 * (decimal keypad for a number). Marks itself invalid while a required value is empty.
 * @type {React.FC<{ field: RfqSpecField; label: string; testId: string; onValue: (v: string) => void; }>}
 */
export const SpecFieldInput = ({ field, label, testId, onValue }) => {
  const { t } = useTranslation();
  const missing = field.required && !(field.value && field.value.trim());
  // BL-84 — an invalid field names why. The message is the same for both
  // control shapes and its id derives from the field's own test id.
  const requiredId = `${testId}-required`;
  const requiredNote = missing ? (
    <div id={requiredId} className="mt-1 text-[length:var(--fs-label-3)] text-danger">
      {t('rfqAuthoring.items.addField.required')}
    </div>
  ) : null;
  if (field.kind === 'choice') {
    return (
      <>
        <select
          aria-label={label}
          data-testid={testId}
          value={field.value ?? ''}
          onChange={(e) => onValue(e.target.value)}
          aria-invalid={missing}
          aria-describedby={missing ? requiredId : undefined}
          className={inputClass}
        >
          <option value="">{t('rfqAuthoring.opt.choose')}</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {t(`rfqAuthoring.opt.${o}`)}
            </option>
          ))}
        </select>
        {requiredNote}
      </>
    );
  }
  return (
    <>
      <input
        type="text"
        inputMode={field.kind === 'number' ? 'decimal' : undefined}
        aria-label={label}
        data-testid={testId}
        value={field.value ?? ''}
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={missing}
        aria-describedby={missing ? requiredId : undefined}
        className={inputClass}
      />
      {requiredNote}
    </>
  );
};
