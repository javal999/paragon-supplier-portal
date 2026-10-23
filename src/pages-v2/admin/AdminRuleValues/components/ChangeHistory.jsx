/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { formatDateTime } from '@lib/format';
/** @import { HubSettingDef, HubSettingValue } from '@services/transitions/hubSettings' */
import { settingDefOf } from '@services/transitions/hubSettings';
/** @import { HubSettingChange } from '@services/transitions/hubSettingsStore' */

/**
 * The section's changes on record, newest first: old → new, who (or the
 * honest "not attributed") and when; an empty line when there are none.
 * @type {React.FC<{
 *   changes: readonly (HubSettingChange & { seq: number })[];
 *   keyLabel: (key: string) => string;
 *   valueText: (def: Pick<HubSettingDef, 'unit'> | null, value: HubSettingValue | undefined) => string;
 * }>}
 */
const ChangeHistory = ({ changes, keyLabel, valueText }) => {
  const { t } = useTranslation();
  return (
    <section data-testid="admin-set-history">
      <h2 className="text-section text-text-primary mb-3">{t('adminSet.history.title')}</h2>
      {changes.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid="admin-set-history-empty">
          {t('adminSet.history.empty')}
        </p>
      ) : (
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('adminSet.history.col.value')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSet.history.col.change')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSet.history.col.by')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSet.history.col.at')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {changes.map((c) => {
                // A group override reads in its base key's unit (REQ-E08-05 BR-03).
                const def = settingDefOf(c.key) ?? null;
                return (
                  <TableRow key={c.seq} data-testid={`admin-set-change-row-${c.key}`}>
                    <TableCell className="text-sm">{keyLabel(c.key)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <Data>{valueText(def, c.previous)}</Data> →{' '}
                      <Data>{valueText(def, c.value)}</Data>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {c.setBy.kind === 'RESOLVED'
                        ? c.setBy.person.displayName
                        : t('adminSet.by.unattributed')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDateTime(c.setAt)}</Data>
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
};

export default ChangeHistory;
