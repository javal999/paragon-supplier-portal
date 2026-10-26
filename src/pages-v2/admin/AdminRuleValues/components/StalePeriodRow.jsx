/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { formatDateTime } from '@lib/format';
/** @import { InventoryPosition } from '@services/data/types' */
/** @import { HubSettingDef, HubSettingValue } from '@services/transitions/hubSettings' */
import { SEEDED_STALE_OVERRIDES, defaultOfKey } from '@services/transitions/hubSettings';
import { groupStaleDaysFor, staleApiHours } from '@services/transitions/inventoryConfig';
import { stockFreshness } from '@services/transitions/inventoryRules';
import { groupOverrideFor } from '@services/transitions/hubSettingsStore';
import { PullFailedNote } from '../../../inventory/inventoryDisplay';
import { toInput } from '../utils';

/**
 * One supplier × material row of the stale-period table: the period that
 * applies (its own override, or the rule of the supplier's update mode), its
 * source, the last update, stale-or-current now, and — for a seat holding
 * `setting:set` — "Set", "Reset" and "Remove", which only pre-fill the pair
 * form owned by `StalePeriodsPanel` (its setters and ref are passed in).
 * @type {React.FC<{
 *   p: InventoryPosition;
 *   rowKey: string;
 *   override: number | null;
 *   now: string;
 *   held: boolean;
 *   daysDef: Pick<HubSettingDef, 'unit'>;
 *   valueText: (def: Pick<HubSettingDef, 'unit'> | null, value: HubSettingValue | undefined) => string;
 *   formRef: React.RefObject<HTMLElement | null>;
 *   setPairKey: React.Dispatch<React.SetStateAction<string>>;
 *   setDays: React.Dispatch<React.SetStateAction<string>>;
 * }>}
 */
const StalePeriodRow = ({
  p,
  rowKey: key,
  override,
  now,
  held,
  daysDef,
  valueText,
  formRef,
  setPairKey,
  setDays
}) => {
  const { t } = useTranslation();
  const freshness = stockFreshness(p, now);
  const seeded = SEEDED_STALE_OVERRIDES[key];
  // REQ-E08-05 BR-03 — without a pair period, the material group's period for
  // the supplier's update mode applies when the group has one.
  const groupDays = p.apiConnected ? null : groupStaleDaysFor(p.materialGroup);
  const groupHours = p.apiConnected ? groupOverrideFor('stale.apiHours', p.materialGroup) : null;
  const source =
    override !== null
      ? 'adminSet.stale.source.override'
      : groupDays !== null || groupHours !== null
        ? 'adminSet.stale.source.group'
        : 'adminSet.stale.source.default';
  return (
    <TableRow data-testid={`admin-set-stale-row-${p.supplierId}-${p.materialCode}`}>
      <TableCell className="text-sm">{p.supplierName}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Data>{p.materialCode}</Data>
      </TableCell>
      {/* Material B2 (carried over from B1) — without an override the
          figure follows the supplier's update mode (`staleAt`), not
          the stale period in days, so the row says which rule applies. */}
      <TableCell
        className="whitespace-nowrap"
        data-testid={`admin-set-stale-period-${p.supplierId}-${p.materialCode}`}
      >
        {override !== null ? (
          <Data>{valueText(daysDef, p.updateSla)}</Data>
        ) : groupDays !== null ? (
          <Data>{valueText(daysDef, groupDays)}</Data>
        ) : p.apiConnected ? (
          <span className="text-sm">
            {t('adminSet.stale.byMode.api', { hours: staleApiHours(p.materialGroup) })}
          </span>
        ) : (
          <span className="text-sm">{t('adminSet.stale.byMode.manual')}</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {t(source, { group: p.materialGroup })}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Data>{p.lastUpdatedAt ? formatDateTime(p.lastUpdatedAt) : '—'}</Data>
      </TableCell>
      <TableCell
        className="whitespace-nowrap"
        data-testid={`admin-set-stale-now-${p.supplierId}-${p.materialCode}`}
      >
        <StatusPill variant={freshness === 'current' ? 'success' : 'warning'}>
          {t(`adminSet.stale.now.${freshness}`)}
        </StatusPill>
        <PullFailedNote position={p} />
      </TableCell>
      {held && (
        <TableCell className="whitespace-nowrap">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPairKey(key);
                setDays(toInput(override ?? undefined));
                formRef.current?.scrollIntoView?.({
                  behavior: 'smooth',
                  block: 'start'
                });
              }}
            >
              {t('adminSet.stale.action.set')}
            </Button>
            {seeded !== undefined && override !== seeded && (
              <Button
                type="button"
                variant="secondary"
                data-testid={`admin-set-stale-reset-${p.supplierId}-${p.materialCode}`}
                onClick={() => {
                  setPairKey(key);
                  setDays(toInput(defaultOfKey(key)));
                  formRef.current?.scrollIntoView?.({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
              >
                {t('adminSet.action.reset')}
              </Button>
            )}
            {override !== null && (
              <Button
                type="button"
                variant="secondary"
                data-testid={`admin-set-stale-remove-${p.supplierId}-${p.materialCode}`}
                onClick={() => {
                  // Pre-fills "no period of its own"; the form records it.
                  setPairKey(key);
                  setDays('');
                  formRef.current?.scrollIntoView?.({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
              >
                {t('adminSet.stale.action.remove')}
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};

export default StalePeriodRow;
