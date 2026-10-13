/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
/** @import { HubSettingDef, HubSettingValue } from '@services/transitions/hubSettings' */
import { settingValue } from '@services/transitions/hubSettingsStore';

/**
 * One value's row: its label, hint and "placeholder until <owner> decides"
 * pill; the value in force (at or changed from default); the default; and, for
 * a seat holding `setting:set`, "Change" and "Reset to default", which only
 * pre-fill the form.
 * @type {React.FC<{
 *   d: HubSettingDef;
 *   held: boolean;
 *   prefill: (key: string, value: HubSettingValue | undefined) => void;
 *   valueText: (def: Pick<HubSettingDef, 'unit'> | null, value: HubSettingValue | undefined) => string;
 * }>}
 */
const RuleRow = ({ d, held, prefill, valueText }) => {
  const { t } = useTranslation();
  const inForce = settingValue(d.key);
  const atDefault = inForce === d.defaultValue;
  return (
    <TableRow data-testid={`admin-set-row-${d.key}`}>
      <TableCell className="text-sm">
        <div className="text-text-primary">{t(`adminSet.key.${d.key}.label`)}</div>
        <div className="text-xs text-text-tertiary mt-0.5">{t(`adminSet.key.${d.key}.hint`)}</div>
        {d.placeholder && (
          <div className="mt-1" data-testid={`admin-set-placeholder-${d.key}`}>
            <StatusPill variant="warning">
              {t('adminSet.placeholder', {
                owner: t(`adminSet.owner.${d.placeholder.owner}`),
                id: d.placeholder.backlogId
              })}
            </StatusPill>
          </div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Data>
          <span data-testid={`admin-set-value-${d.key}`}>{valueText(d, inForce)}</span>
        </Data>
        <StatusPill variant={atDefault ? 'neutral' : 'info'} className="ml-2">
          {t(atDefault ? 'adminSet.atDefault' : 'adminSet.changedFromDefault')}
        </StatusPill>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Data>{valueText(d, d.defaultValue)}</Data>
      </TableCell>
      {held && (
        <TableCell className="whitespace-nowrap">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              data-testid={`admin-set-change-${d.key}`}
              onClick={() => prefill(d.key, inForce)}
            >
              {t('adminSet.action.change')}
            </Button>
            {!atDefault && (
              <Button
                type="button"
                variant="secondary"
                data-testid={`admin-set-reset-${d.key}`}
                onClick={() => prefill(d.key, d.defaultValue)}
              >
                {t('adminSet.action.reset')}
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};

export default RuleRow;
