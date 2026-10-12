import { useState } from 'react';
import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
/** @import { RfqTemplateContent } from '@services/sourcing/rfqTemplates' */
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { rfqTemplateStore } from '@services/sourcing/rfqTemplates';
import { inputClass, labelClass } from '../const';
import { refusalMessage } from '../utils';
import { Dialog } from './Dialog';

/**
 * "Save as template": name it, save it to this browser, and say where it lives.
 * @type {React.FC<{ content: RfqTemplateContent; defaultName: string; onClose: () => void; }>}
 */
export const SaveTemplateDialog = ({ content, defaultName, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState(defaultName);

  const save = () => {
    const r = rfqTemplateStore.save(name, content);
    if (!r.ok) {
      toast({
        variant: 'error',
        title: t('rfqAuthoring.template.save.failed'),
        description: refusalMessage(t, r.reason)
      });
      return;
    }
    toast({
      variant: 'success',
      title: t('rfqAuthoring.template.save.done', { name: r.template.name }),
      description: t(
        r.persisted
          ? 'rfqAuthoring.template.save.doneDesc'
          : 'rfqAuthoring.template.save.sessionOnly'
      )
    });
    onClose();
  };

  return (
    <Dialog
      label={t('rfqAuthoring.template.save.title')}
      testId="rfq-save-template-dialog"
      onClose={onClose}
    >
      <label className={labelClass} htmlFor="rfq-template-name">
        {t('rfqAuthoring.template.save.name')}
      </label>
      <input
        id="rfq-template-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
      />
      <p className="text-xs text-text-secondary mt-3">{t('rfqAuthoring.template.save.keeps')}</p>
      <p className="text-xs text-text-tertiary mt-1">{t('rfqAuthoring.template.picker.storage')}</p>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="secondary" onClick={onClose}>
          {t('rfqAuthoring.template.save.cancel')}
        </Button>
        <Button
          variant="outline"
          onClick={save}
          disabled={name.trim() === ''}
          data-testid="rfq-save-template-confirm"
        >
          {t('rfqAuthoring.template.save.confirm')}
        </Button>
      </div>
    </Dialog>
  );
};
