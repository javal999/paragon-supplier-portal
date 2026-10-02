import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import type { SaveResult } from '@services/sourcing/rfxTemplates';
import { refusalCode } from './RfxQuestionEditor';

// ─────────────────────────────────────────────────────────────────────────────
// "SAVE AS TEMPLATE" (D2). Saves the event's CONTENT — never its invitees,
// dates or files — to this browser's template store. The store refuses by name
// what the create verb would refuse, and the refusal is shown, not swallowed.
// ─────────────────────────────────────────────────────────────────────────────

interface RfxSaveTemplateProps {
  onSave: (name: string) => SaveResult;
  defaultName?: string;
  testIdPrefix: string;
}

const RfxSaveTemplate: React.FC<RfxSaveTemplateProps> = ({ onSave, defaultName = '', testIdPrefix: p }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(defaultName);

  const save = () => {
    const res = onSave(name);
    if (res.ok) {
      toast({ variant: 'success', title: t('rfxa.tpl.saved', { name: name.trim() }) });
    } else {
      toast({
        variant: 'error',
        title: t('rfx.toast.refused', {
          reason: t(`rfxa.refusal.${refusalCode(res.reason)}`, { defaultValue: res.reason }),
        }),
      });
    }
  };

  return (
    <div className="border border-border-subtle rounded-md px-3 py-3 space-y-2" data-testid={`${p}-save-template`}>
      <label className="block text-xs font-semibold text-text-secondary" htmlFor={`${p}-template-name`}>
        {t('rfxa.tpl.name')}
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <input
          id={`${p}-template-name`}
          value={name}
          placeholder={t('rfxa.tpl.name.ph')}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[14rem] bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
        <Button
          variant="secondary"
          disabled={name.trim().length === 0}
          onClick={save}
          data-testid={`${p}-template-save`}
        >
          {t('rfxa.tpl.save')}
        </Button>
      </div>
      <p className="text-xs text-text-tertiary">{t('rfxa.tpl.note')}</p>
    </div>
  );
};

export default RfxSaveTemplate;
