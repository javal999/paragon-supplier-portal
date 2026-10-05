// ────────────────────────────────────────────────────────────────────────────
// RFP TERMS — the buyer's term picker (standard AND custom terms) and the one
// value input both sides type a term's value into.
//
// ⚠️ **A TERM IS ASKED IN A VALUE KIND, AND THE INPUT IS THAT KIND.** Text, a
// number with a unit, a choice among the buyer's options, or yes/no. The same
// `TermValueInput` takes PTI's requested value in the wizard and the supplier's
// proposed value on the answer form, so "what PTI asks for" and "what the
// supplier proposes" are always comparable — the comparison column the whole
// RFP exists for.
//
// ⚠️ **A CUSTOM TERM IS THE BUYER'S OWN, AND IT CARRIES WHAT THE STANDARD LIST
// WOULD HAVE GIVEN IT** — a label, a group, a kind, and options for a choice.
// The editor refuses one the create verb would refuse (`rfpTermsRefusal`, the
// same predicate) and names why.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import {
  RFP_TERM_GROUP_ORDER,
  RFP_TERM_VALUE_KINDS,
  rfpTermKindOf
} from '@services/sourcing/rfxConfig';
import { rfpTermsRefusal } from '@services/transitions/rfxRules';
/** @import { RfpTermGroup, RfpTermRow, RfpTermValueKind } from '@services/sourcing/types' */
import { refusalCode } from './RfxQuestionEditor';
import { termUnit } from './rfxAuthoringDisplay';

/**
 * One term value, typed in the row's kind.
 * @type {React.FC<{ row: RfpTermRow; value: string; onChange: (value: string) => void; ariaLabel: string; disabled?: boolean; invalid?: boolean; testId?: string; }>}
 */
export const TermValueInput = ({
  row,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  invalid = false,
  testId
}) => {
  const { t } = useTranslation();
  const kind = rfpTermKindOf(row);
  const cls = `w-full bg-white border rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover ${
    invalid ? 'border-danger' : 'border-border-input'
  }`;
  if (kind === 'yesNo' || kind === 'choice') {
    const options = kind === 'yesNo' ? ['yes', 'no'] : (row.options ?? []);
    return (
      <select
        aria-label={ariaLabel}
        data-testid={testId}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cls}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {kind === 'yesNo' ? t(`rfx.opt.${o}`) : o}
          </option>
        ))}
      </select>
    );
  }
  const unit = termUnit(t, row);
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode={kind === 'numberWithUnit' ? 'decimal' : undefined}
        aria-label={ariaLabel}
        data-testid={testId}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cls}
      />
      {unit && <span className="text-xs text-text-tertiary whitespace-nowrap">{unit}</span>}
    </div>
  );
};

/**
 * @typedef {object} NewTerm
 * @property {string} label
 * @property {RfpTermGroup} group
 * @property {RfpTermValueKind} valueKind
 * @property {string} unit
 * @property {OptionRow[]} options
 * @property {string} requestedValue
 */

/**
 * One row of the option editor. `id` is the row's React key, given once when
 * the row is created: options are added and removed and hold an input, and two
 * labels can be equal (or both blank), so neither the label nor the position
 * identifies a row. The id never leaves the editor.
 */
/**
 * @typedef {object} OptionRow
 * @property {number} id
 * @property {string} label
 */

let nextOptionRowId = 0;
/** @returns {OptionRow} */
const optionRow = () => ({ id: nextOptionRowId++, label: '' });

// A function, not a constant, so every fresh draft gets fresh option ids.
/** @returns {NewTerm} */
const blankTerm = () => ({
  label: '',
  group: 'other',
  valueKind: 'text',
  unit: '',
  options: [optionRow(), optionRow()],
  requestedValue: ''
});

/**
 * The custom-term editor: the terms the buyer writes for this RFP alone.
 * @type {React.FC<{ terms: readonly RfpTermRow[]; onChange: (next: readonly RfpTermRow[]) => void; }>}
 */
export const CustomTermEditor = ({ terms, onChange }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(/** @type {() => NewTerm} */ (blankTerm));

  /** @returns {string} */
  const freshId = () => {
    let n = terms.length + 1;
    while (terms.some((r) => r.termId === `custom-${n}`)) n += 1;
    return `custom-${n}`;
  };

  /** @returns {RfpTermRow} */
  const candidate = () => ({
    termId: freshId(),
    label: draft.label.trim(),
    group: draft.group,
    valueKind: draft.valueKind,
    requestedValue: draft.requestedValue.trim(),
    ...(draft.valueKind === 'numberWithUnit' && draft.unit.trim()
      ? { unit: draft.unit.trim() }
      : {}),
    ...(draft.valueKind === 'choice' ? { options: draft.options.map((o) => o.label.trim()) } : {})
  });

  const started = draft.label.trim().length > 0;
  const refusal = started ? rfpTermsRefusal([candidate()]) : null;

  const add = () => {
    if (!started || refusal) return;
    onChange([...terms, candidate()]);
    setDraft(blankTerm());
  };

  const inputClass =
    'w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action';
  const labelClass = 'block text-xs font-semibold text-text-secondary mb-1';

  return (
    <div
      className="border-t border-border-subtle pt-4 space-y-3"
      data-testid="rfp-new-custom-terms"
    >
      <h4 className="text-sm font-semibold text-text-primary">{t('rfxa.term.custom')}</h4>
      <p className="text-xs text-text-tertiary">{t('rfxa.term.custom.hint')}</p>

      {terms.length > 0 && (
        <ul className="space-y-1">
          {terms.map((row) => (
            <li
              key={row.termId}
              data-testid={`rfp-new-custom-${row.termId}`}
              className="flex items-center justify-between gap-3 border border-border-subtle rounded-md px-3 py-2"
            >
              <span className="text-sm text-text-primary">
                {row.label}
                <StatusPill variant="neutral" className="ml-2">
                  {t(`rfx.group.${row.group ?? 'other'}`)}
                </StatusPill>
                <StatusPill variant="neutral" className="ml-2">
                  {t(`rfxa.termKind.${rfpTermKindOf(row)}`)}
                </StatusPill>
                <span className="text-text-secondary ml-2">
                  {t('rfx.rfp.term.requested')}: {row.requestedValue}
                  {row.unit ? ` ${row.unit}` : ''}
                </span>
              </span>
              <button
                type="button"
                aria-label={`${t('rfx.rfi.removeQuestion')} — ${row.label}`}
                data-testid={`rfp-new-custom-remove-${row.termId}`}
                onClick={() => onChange(terms.filter((r) => r.termId !== row.termId))}
                className="text-text-tertiary hover:text-danger"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label className={labelClass} htmlFor="rfp-new-custom-label">
            {t('rfxa.term.label')}
          </label>
          <input
            id="rfp-new-custom-label"
            value={draft.label}
            placeholder={t('rfxa.term.label.ph')}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="rfp-new-custom-group">
            {t('rfxa.term.group')}
          </label>
          <select
            id="rfp-new-custom-group"
            value={draft.group}
            onChange={(e) =>
              setDraft((d) => ({ ...d, group: /** @type {RfpTermGroup} */ (e.target.value) }))
            }
            className={inputClass}
          >
            {RFP_TERM_GROUP_ORDER.map((g) => (
              <option key={g} value={g}>
                {t(`rfx.group.${g}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="rfp-new-custom-kind">
            {t('rfxa.term.kind')}
          </label>
          <select
            id="rfp-new-custom-kind"
            data-testid="rfp-new-custom-kind"
            value={draft.valueKind}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                valueKind: /** @type {RfpTermValueKind} */ (e.target.value),
                requestedValue: ''
              }))
            }
            className={inputClass}
          >
            {RFP_TERM_VALUE_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`rfxa.termKind.${k}`)}
              </option>
            ))}
          </select>
        </div>
        {draft.valueKind === 'numberWithUnit' && (
          <div>
            <label className={labelClass} htmlFor="rfp-new-custom-unit">
              {t('rfxa.q.unit')}
            </label>
            <input
              id="rfp-new-custom-unit"
              value={draft.unit}
              placeholder={t('rfxa.q.unit.ph')}
              onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {draft.valueKind === 'choice' && (
        <fieldset className="space-y-2" data-testid="rfp-new-custom-options">
          <legend className={labelClass}>{t('rfxa.q.options')}</legend>
          {draft.options.map(({ id, label }, i) => (
            <div key={id} className="flex items-center gap-2">
              <input
                value={label}
                aria-label={t('rfxa.q.option', { n: i + 1 })}
                data-testid={`rfp-new-custom-option-${i}`}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    options: d.options.map((o, j) =>
                      j === i ? { ...o, label: e.target.value } : o
                    ),
                    requestedValue: d.requestedValue === d.options[i].label ? '' : d.requestedValue
                  }))
                }
                className={inputClass}
              />
              <button
                type="button"
                aria-label={`${t('rfxa.q.option.remove')} ${i + 1}`}
                onClick={() =>
                  setDraft((d) => ({ ...d, options: d.options.filter((_, j) => j !== i) }))
                }
                className="text-text-tertiary hover:text-danger"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => setDraft((d) => ({ ...d, options: [...d.options, optionRow()] }))}
            data-testid="rfp-new-custom-option-add"
          >
            {t('rfxa.q.option.add')}
          </Button>
        </fieldset>
      )}

      <div className="max-w-md">
        <span className={labelClass}>{t('rfx.rfp.term.requested')}</span>
        <TermValueInput
          row={{
            termId: 'custom-draft',
            requestedValue: '',
            valueKind: draft.valueKind,
            unit: draft.unit,
            options: draft.options.map((o) => o.label.trim()).filter((o) => o.length > 0)
          }}
          value={draft.requestedValue}
          onChange={(v) => setDraft((d) => ({ ...d, requestedValue: v }))}
          ariaLabel={`${t('rfxa.term.custom')} — ${t('rfx.rfp.term.requested')}`}
          testId="rfp-new-custom-requested"
        />
      </div>

      {refusal && (
        <p className="text-sm text-danger" data-testid="rfp-new-custom-refusal">
          {t(`rfxa.refusal.${refusalCode(refusal)}`, { defaultValue: refusal })}
        </p>
      )}
      <Button
        variant="outline"
        disabled={!started || refusal !== null}
        onClick={add}
        data-testid="rfp-new-custom-add"
      >
        {t('rfxa.term.add')}
      </Button>
    </div>
  );
};
