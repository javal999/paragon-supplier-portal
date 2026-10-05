import React, { useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { knownMaterialCodes, materialEntry } from '@services/sdc/materialMaster';
import { mrpControllerStore } from '@services/transitions/mrpControllerStore';
import { useMyMrpController } from './mrpControllerSeat';

// ─────────────────────────────────────────────────────────────────────────────
// Material C4 — the seat's own MRP controller code, chosen in the identity
// panel (MR-5 AC-02). The codes offered are every code a material carries plus
// every code on the administrator's list; a mapped code shows its name.
// ─────────────────────────────────────────────────────────────────────────────

/** Every MRP controller code the hub knows, sorted. */
export function knownMrpControllerCodes(): string[] {
  const codes = new Set<string>(mrpControllerStore.all().map((r) => r.code));
  for (const m of knownMaterialCodes()) {
    const code = materialEntry(m)?.mrpController;
    if (code) codes.add(code);
  }
  return [...codes].sort();
}

const MyMrpControllerSelect: React.FC = () => {
  const { t } = useTranslation();
  const [mine, setMine] = useMyMrpController();
  const version = useSyncExternalStore(mrpControllerStore.subscribe, mrpControllerStore.version, mrpControllerStore.version);
  const codes = useMemo(() => knownMrpControllerCodes(), [version]);

  return (
    <div className="mt-3">
      <label htmlFor="my-mrp-controller" className="text-label text-text-tertiary uppercase">
        {t('pic.seat.title')}
      </label>
      <select
        id="my-mrp-controller"
        data-testid="my-mrp-controller-select"
        value={mine ?? ''}
        onChange={(e) => setMine(e.target.value === '' ? null : e.target.value)}
        className="mt-1 w-full h-8 rounded-md border border-border-input bg-white px-2 text-sm text-text-primary"
      >
        <option value="">{t('pic.seat.none')}</option>
        {codes.map((code) => {
          const name = mrpControllerStore.get(code)?.name;
          return (
            <option key={code} value={code}>
              {name ? `${code} · ${name}` : code}
            </option>
          );
        })}
      </select>
      <p className="mt-1 text-xs text-text-tertiary">{t('pic.seat.hint')}</p>
    </div>
  );
};

export default MyMrpControllerSelect;
