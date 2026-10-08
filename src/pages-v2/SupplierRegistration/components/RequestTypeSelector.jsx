/** @import React from 'react' */
/** @import { LucideIcon } from 'lucide-react' */
import { Building2, ClipboardCheck, UserPlus, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';

/** @typedef {'External SR' | 'Internal SR' | 'KOL'} RequestType */

/**
 * @typedef {object} RequestTypeMeta
 * @property {RequestType} id
 * @property {string} labelKey
 * @property {string} subKey
 * @property {string} detailKey
 * @property {LucideIcon} Icon
 * @property {number} steps
 * @property {string} badgeKey
 * @property {string} shortKey
 */

/** @type {RequestTypeMeta[]} */
export const REQUEST_TYPES = [
  {
    id: 'External SR',
    labelKey: 'registration.type.external.label',
    subKey: 'registration.type.external.sub',
    detailKey: 'registration.type.external.detail',
    Icon: Building2,
    steps: 5,
    badgeKey: 'registration.type.external.badge',
    shortKey: 'registration.type.external.short'
  },
  {
    id: 'Internal SR',
    labelKey: 'registration.type.internal.label',
    subKey: 'registration.type.internal.sub',
    detailKey: 'registration.type.internal.detail',
    Icon: ClipboardCheck,
    steps: 3,
    badgeKey: 'registration.type.internal.badge',
    shortKey: 'registration.type.internal.short'
  },
  {
    id: 'KOL',
    labelKey: 'registration.type.kol.label',
    subKey: 'registration.type.kol.sub',
    detailKey: 'registration.type.kol.detail',
    Icon: UserPlus,
    steps: 2,
    badgeKey: 'registration.type.kol.badge',
    shortKey: 'registration.type.kol.short'
  }
];

/**
 * The first screen: one card per request type, an info banner for the picked
 * one, and Continue. Picking a card only sets `value`; Continue commits it.
 * @type {React.FC<{ value: RequestType | null; onChange: (t: RequestType) => void; onContinue: () => void; }>}
 */
const RequestTypeSelector = ({ value, onChange, onContinue }) => {
  const { t } = useTranslation();
  const selectedMeta = REQUEST_TYPES.find((r) => r.id === value);
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-md p-6 sm:p-8">
      <h1 className="text-title text-text-primary mb-1">{t('registration.selector.title')}</h1>
      <p className="text-sm text-text-tertiary mb-6">{t('registration.selector.subtitle')}</p>
      <div className="flex flex-col gap-3 mb-6">
        {REQUEST_TYPES.map((rt) => {
          const Icon = rt.Icon;
          const selected = value === rt.id;
          return (
            <button
              key={rt.id}
              type="button"
              onClick={() => onChange(rt.id)}
              aria-pressed={selected}
              className={`text-left rounded-lg p-4 sm:p-5 border-2 transition-colors flex items-start gap-4 ${
                selected
                  ? 'border-action bg-action-soft'
                  : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                  selected ? 'bg-action text-white' : 'bg-bg-hover text-text-tertiary'
                }`}
              >
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-text-primary">{t(rt.labelKey)}</span>
                  <StatusPill variant="info">{t(rt.badgeKey)}</StatusPill>
                  <span className="text-xs text-text-tertiary ml-auto whitespace-nowrap">
                    {t('registration.selector.steps', { count: rt.steps })}
                  </span>
                </div>
                <div className="text-xs text-text-tertiary mb-2">{t(rt.subKey)}</div>
                <div className="text-xs text-text-secondary leading-relaxed">{t(rt.detailKey)}</div>
              </div>
              {selected && (
                <CheckCircle2 size={20} className="text-teal shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
      {selectedMeta && (
        <div className="bg-info-soft border-l-2 border-info rounded px-3 py-2 mb-6 text-xs text-text-secondary">
          <strong className="text-info">{t(selectedMeta.shortKey)}</strong> —{' '}
          {t(selectedMeta.detailKey)}
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="outline" disabled={value === null} onClick={onContinue}>
          {t('registration.selector.continue')}
        </Button>
      </div>
    </div>
  );
};

export default RequestTypeSelector;
