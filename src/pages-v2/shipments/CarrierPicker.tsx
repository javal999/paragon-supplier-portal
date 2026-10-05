import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { threePlStore, type ThreePl } from '@services/transitions/threePlStore';

// ─────────────────────────────────────────────────────────────────────────────
// THE CARRIER ON AN ASN — BL-51, REQ-E07-04 BR-05.
//
// The supplier picks the 3PL from the administrator's list (the ones still
// offered), or says it is another carrier and types its name. Picking a 3PL
// sets BOTH the id (what the tracking link resolves through) and the carrier
// name (what BR-04 requires and every screen shows); typing a name clears the
// id, so the tracking number will show without a link — and the form says so
// before the ASN is sent rather than after.
//
// It replaces a hard-coded carrier list whose "Other" option stored the word
// "Other" as the carrier.
// ─────────────────────────────────────────────────────────────────────────────

export interface CarrierValue {
  /** `tpl-…`, or '' for a carrier typed by name. */
  threePlId: string;
  carrier: string;
}

/** The 3PLs a new ASN may name, in list order. */
export const offeredThreePls = (list: readonly ThreePl[] = threePlStore.all()): readonly ThreePl[] =>
  list.filter((r) => r.active);

/** The starting value for a new ASN: the first 3PL still offered, if any. */
export function defaultCarrier(list: readonly ThreePl[] = threePlStore.all()): CarrierValue {
  const first = offeredThreePls(list)[0];
  return first ? { threePlId: first.id, carrier: first.name } : { threePlId: '', carrier: '' };
}

/**
 * The value a stored draft opens with: its 3PL if that is still offered, its
 * typed carrier name if it had one, otherwise the default.
 */
export function carrierFor(
  stored: { threePlId?: string; carrier: string },
  list: readonly ThreePl[] = threePlStore.all(),
): CarrierValue {
  const row = stored.threePlId ? offeredThreePls(list).find((r) => r.id === stored.threePlId) : undefined;
  if (row) return { threePlId: row.id, carrier: row.name };
  const typed = stored.carrier && stored.carrier !== '—' ? stored.carrier : '';
  if (typed && !stored.threePlId) return { threePlId: '', carrier: typed };
  return defaultCarrier(list);
}

interface CarrierPickerProps {
  value: CarrierValue;
  onChange: (next: CarrierValue) => void;
  /** Distinguishes the wizard's controls from the submit drawer's. */
  idPrefix: string;
  label: string;
  labelClass: string;
  inputClass: string;
}

const CarrierPicker: React.FC<CarrierPickerProps> = ({ value, onChange, idPrefix, label, labelClass, inputClass }) => {
  const { t } = useTranslation();
  const version = useSyncExternalStore(threePlStore.subscribe, threePlStore.version, threePlStore.version);
  const offered = React.useMemo(() => offeredThreePls(), [version]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-threepl`}>
          {label}
        </label>
        <select
          id={`${idPrefix}-threepl`}
          data-testid={`${idPrefix}-threepl`}
          value={value.threePlId}
          onChange={(e) => {
            const id = e.target.value;
            const row = offered.find((r) => r.id === id);
            onChange(row ? { threePlId: row.id, carrier: row.name } : { threePlId: '', carrier: '' });
          }}
          className={inputClass}
        >
          {offered.map((r) => (
            // i18n-defer: a 3PL's name is data from the administrator's list
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
          <option value="">{t('tpl.form.other')}</option>
        </select>
      </div>
      {value.threePlId === '' && (
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-carrier-name`}>
            {t('tpl.form.otherName')}
          </label>
          <input
            id={`${idPrefix}-carrier-name`}
            data-testid={`${idPrefix}-carrier-name`}
            type="text"
            value={value.carrier}
            onChange={(e) => onChange({ threePlId: '', carrier: e.target.value })}
            className={inputClass}
          />
        </div>
      )}
      <p className="text-xs text-text-tertiary" data-testid={`${idPrefix}-carrier-hint`}>
        {value.threePlId ? t('tpl.form.linkHint') : t('tpl.form.noLinkHint')}
      </p>
    </div>
  );
};

export default CarrierPicker;
