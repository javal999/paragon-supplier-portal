/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import RuleRow from './RuleRow';
/** @import { HubSettingDef, HubSettingValue } from '@services/transitions/hubSettings' */

/**
 * One rule's values as a table: each value with its value in force and its
 * default, and — for a seat holding `setting:set` — the row buttons that
 * pre-fill the form.
 * @type {React.FC<{
 *   rule: string;
 *   defs: readonly HubSettingDef[];
 *   held: boolean;
 *   prefill: (key: string, value: HubSettingValue | undefined) => void;
 *   valueText: (def: Pick<HubSettingDef, 'unit'> | null, value: HubSettingValue | undefined) => string;
 * }>}
 */
const RuleGroup = ({ rule, defs, held, prefill, valueText }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-5" data-testid={`admin-set-group-${rule}`}>
      <h2 className="text-section text-text-primary mb-2">{t(`adminSet.rule.${rule}`)}</h2>
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('adminSet.col.value')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.col.inForce')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.col.default')}</TableHeaderCell>
            {held && <TableHeaderCell>{t('adminSet.col.action')}</TableHeaderCell>}
          </TableHeader>
          <tbody>
            {defs.map((d) => (
              <RuleRow key={d.key} d={d} held={held} prefill={prefill} valueText={valueText} />
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default RuleGroup;
