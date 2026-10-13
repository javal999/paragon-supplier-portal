/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { VerbAvailability } from '@services/transitions/handoff' */

/**
 * In the form's place for a seat without `setting:set`: the seat reads every
 * value and is told whose act a change is (the handoff notice).
 * @type {React.FC<{ availability: VerbAvailability }>}
 */
const SettingGate = ({ availability }) => {
  const { t } = useTranslation();
  return (
    <section
      className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
      data-testid="admin-set-gate"
    >
      <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{t('adminSet.gate.title')}</span>
          <HandoffNotice availability={availability} testId="handoff-setting-set" />
        </div>
        <p className="text-xs text-text-secondary mt-1">{t('adminSet.gate.body')}</p>
      </div>
    </section>
  );
};

export default SettingGate;
