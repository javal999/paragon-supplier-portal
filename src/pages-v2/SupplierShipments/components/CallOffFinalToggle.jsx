/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

/**
 * MR-6 BR-10 — the "last ASN for this call-off" tick, on both submit paths.
 * `id` keeps the wizard's and the drawer's checkbox labels distinct.
 * @type {React.FC<{ id: string; checked: boolean; onChange: (v: boolean) => void }>}
 */
const CallOffFinalToggle = ({ id, checked, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-2">
      <label
        htmlFor={id}
        className="inline-flex items-start gap-2 text-sm text-text-primary cursor-pointer"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 accent-teal"
        />
        {t('co.asn.final.label')}
      </label>
      <p className="mt-1 text-xs text-text-tertiary">{t('co.asn.final.hint')}</p>
    </div>
  );
};

export default CallOffFinalToggle;
