/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
/** @import { HubSettingDef, HubSettingValue } from '@services/transitions/hubSettings' */
import { settingValue } from '@services/transitions/hubSettingsStore';
import { EMPTY_DRAFT, INPUT_CLASS } from '../const';
/** @import { Draft } from '../utils' */

/** The days a `weekday` value can take, Monday = 1 (ISO 8601). */
const WEEKDAYS = /** @type {const} */ ([1, 2, 3, 4, 5, 6, 7]);

/**
 * The one entrance to `t_setting_set`, shown to a seat that holds
 * `setting:set`: pick a value, type the new one (a yes/no, a weekday, a time
 * or a number, by the value's unit), record it. The draft and the submit
 * handler stay in the page, because the row buttons pre-fill this form.
 * @type {React.FC<{
 *   formRef: React.RefObject<HTMLElement | null>;
 *   defs: readonly HubSettingDef[];
 *   draft: Draft;
 *   setDraft: React.Dispatch<React.SetStateAction<Draft>>;
 *   draftDef: HubSettingDef | undefined;
 *   prefill: (key: string, value: HubSettingValue | undefined) => void;
 *   submit: (e: React.FormEvent) => Promise<void>;
 *   isPending: boolean;
 *   valueText: (def: Pick<HubSettingDef, 'unit'> | null, value: HubSettingValue | undefined) => string;
 * }>}
 */
const SettingForm = ({
  formRef,
  defs,
  draft,
  setDraft,
  draftDef,
  prefill,
  submit,
  isPending,
  valueText
}) => {
  const { t } = useTranslation();
  return (
    <section
      ref={formRef}
      className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
      data-testid="admin-set-form"
    >
      <h2 className="text-section text-text-primary">{t('adminSet.form.title')}</h2>
      <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminSet.form.intro')}</p>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('adminSet.form.key')}
            </span>
            <select
              className={INPUT_CLASS}
              data-testid="admin-set-key"
              value={draft.key}
              onChange={(e) =>
                prefill(e.target.value, e.target.value ? settingValue(e.target.value) : undefined)
              }
              required
            >
              <option value="">{t('adminSet.form.pick')}</option>
              {defs.map((d) => (
                <option key={d.key} value={d.key}>
                  {t(`adminSet.key.${d.key}.label`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('adminSet.form.newValue')}
              {draftDef && draftDef.unit !== 'boolean'
                ? ` (${t(`adminSet.unit.input.${draftDef.unit}`)})`
                : ''}
            </span>
            {draftDef?.unit === 'boolean' ? (
              <select
                className={INPUT_CLASS}
                data-testid="admin-set-value"
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              >
                <option value="true">{t('adminSet.unit.yes')}</option>
                <option value="false">{t('adminSet.unit.no')}</option>
              </select>
            ) : draftDef?.unit === 'weekday' ? (
              <select
                className={INPUT_CLASS}
                data-testid="admin-set-value"
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              >
                {WEEKDAYS.map((day) => (
                  <option key={day} value={String(day)}>
                    {t(`adminSet.unit.weekday.${day}`)}
                  </option>
                ))}
              </select>
            ) : draftDef?.unit === 'time' ? (
              <input
                type="time"
                className={`${INPUT_CLASS} font-mono`}
                data-testid="admin-set-value"
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                required
              />
            ) : (
              <input
                className={`${INPUT_CLASS} font-mono`}
                data-testid="admin-set-value"
                inputMode="decimal"
                value={draft.value}
                onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                disabled={draft.key === ''}
                required
              />
            )}
          </label>
        </div>
        {draftDef && (
          <p className="text-xs text-text-secondary" data-testid="admin-set-form-current">
            {t('adminSet.form.current', {
              value: valueText(draftDef, settingValue(draftDef.key)),
              default: valueText(draftDef, draftDef.defaultValue)
            })}
          </p>
        )}
        <p className="text-xs text-text-tertiary" data-testid="admin-set-attribution">
          {t('adminSet.form.attribution')}
        </p>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="outline"
            disabled={isPending || draft.key === ''}
            data-testid="admin-set-submit"
          >
            {t('adminSet.form.submit')}
          </Button>
          {draft.key !== '' && (
            <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_DRAFT)}>
              {t('adminSet.form.cancel')}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
};

export default SettingForm;
