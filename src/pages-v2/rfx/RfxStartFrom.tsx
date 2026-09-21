import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';

// ─────────────────────────────────────────────────────────────────────────────
// "START FROM" — owner decision D2, reversing CE-04. The buyer starts a new RFI
// or RFP from a system template (Procurement's), from one of their own saved
// templates, or by copying a past event. Applying one PRE-FILLS the wizard;
// every field stays editable, and a copy's dates are left blank.
//
// The store's honest read is rendered, not absorbed: an unreadable store and
// rows refused on read are both said out loud, by name.
// ─────────────────────────────────────────────────────────────────────────────

export interface StartOption {
  readonly key: string;
  readonly label: string;
  readonly group: 'system' | 'saved' | 'past';
}

interface RfxStartFromProps {
  options: readonly StartOption[];
  onApply: (key: string) => void;
  /** Delete a SAVED template. System templates and past events cannot be deleted. */
  onDeleteSaved: (key: string) => void;
  unreadable: boolean;
  rejected: readonly { readonly id: string; readonly reason: string }[];
  testIdPrefix: string;
}

const RfxStartFrom: React.FC<RfxStartFromProps> = ({
  options,
  onApply,
  onDeleteSaved,
  unreadable,
  rejected,
  testIdPrefix: p,
}) => {
  const { t } = useTranslation();
  const [pick, setPick] = useState('');
  const chosen = options.find((o) => o.key === pick);
  const groups: StartOption['group'][] = ['system', 'saved', 'past'];

  return (
    <div className="border border-border-subtle rounded-md px-3 py-3 space-y-2" data-testid={`${p}-start`}>
      <label className="block text-xs font-semibold text-text-secondary" htmlFor={`${p}-start-pick`}>
        {t('rfxa.start.label')}
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <select
          id={`${p}-start-pick`}
          data-testid={`${p}-start-pick`}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="flex-1 min-w-[16rem] bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        >
          <option value="">{t('rfxa.start.blank')}</option>
          {groups.map((g) => {
            const rows = options.filter((o) => o.group === g);
            if (rows.length === 0) return null;
            return (
              <optgroup key={g} label={t(`rfxa.start.group.${g}`)}>
                {rows.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <Button
          variant="outline"
          disabled={!chosen}
          onClick={() => chosen && onApply(chosen.key)}
          data-testid={`${p}-start-apply`}
        >
          {t('rfxa.start.apply')}
        </Button>
        {chosen?.group === 'saved' && (
          <Button
            variant="secondary"
            onClick={() => {
              onDeleteSaved(chosen.key);
              setPick('');
            }}
            data-testid={`${p}-start-delete`}
          >
            {t('rfxa.start.delete')}
          </Button>
        )}
      </div>
      <p className="text-xs text-text-tertiary">{t('rfxa.start.note')}</p>
      {unreadable && (
        <p className="text-xs text-danger" data-testid={`${p}-start-unreadable`}>
          {t('rfxa.tpl.unreadable')}
        </p>
      )}
      {rejected.length > 0 && (
        <p className="text-xs text-warning-hover" data-testid={`${p}-start-rejected`}>
          {t('rfxa.tpl.rejected')} {rejected.map((r) => `${r.id} (${r.reason})`).join('; ')}
        </p>
      )}
    </div>
  );
};

export default RfxStartFrom;
