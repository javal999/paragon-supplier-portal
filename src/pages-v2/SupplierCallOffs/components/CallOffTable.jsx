/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
/** @import { CallOffView } from '@services/transitions/callOffRules' */
import { PicHeader } from '../../materials/picDisplay';
import CallOffRow from './CallOffRow';

/**
 * The supplier's call-off table: the 7-column header (BL-38) and one
 * `CallOffRow` per listed call-off. Moved out of `SupplierCallOffs.jsx` by the
 * Phase 5 page split (no behaviour change).
 * `listed`: the rows after the status, PIC and material-search filters, each
 * with the reason the search matched it.
 * @type {React.FC<{ listed: { item: CallOffView; match: React.ComponentProps<typeof CallOffRow>['match'] }[]; onOpen: (id: string) => void }>}
 */
const CallOffTable = ({ listed, onOpen }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          {/* BL-38 — 7 columns, not 10: separately, the PO, the type and the
              confirm-by deadline pushed Confirmation, Delivery and the action
              off a 1280px screen. Each rides as a second line in the cell it
              qualifies, and each header names both, as the Order summary does. */}
          <TableHeaderCell>
            {t('co.col.callOff')}{' '}
            <span className="block text-[11px] font-normal normal-case text-text-tertiary">
              {t('co.col.po')}
            </span>
          </TableHeaderCell>
          {/* The PIC (#90) rides under the material, as the PO rides under the
              call-off: as its own column it pushed the table 257px past 1280. */}
          <TableHeaderCell>
            {t('co.col.material')}{' '}
            <span className="block text-[11px] font-normal normal-case text-text-tertiary">
              <PicHeader wrap />
            </span>
          </TableHeaderCell>
          <TableHeaderCell className="text-right">{t('co.col.quantity')}</TableHeaderCell>
          <TableHeaderCell>
            {t('co.col.needDate')}{' '}
            <span className="block text-[11px] font-normal normal-case text-text-tertiary">
              {t('co.col.type')}
            </span>
          </TableHeaderCell>
          <TableHeaderCell>
            {t('co.col.confirmation')}{' '}
            <span className="block text-[11px] font-normal normal-case text-text-tertiary">
              {t('co.col.confirmBy')}
            </span>
          </TableHeaderCell>
          <TableHeaderCell>{t('co.col.delivery')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('co.col.action')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {listed.map(({ item: v, match }) => (
            <CallOffRow key={v.callOff.id} v={v} match={match} onOpen={onOpen} />
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default CallOffTable;
