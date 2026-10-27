/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierInvoice } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import { fmtDate } from '../utils';

/**
 * An invoice's due date, with the days-overdue line under it when it is
 * overdue. Rendered in the table's due-date column and in the detail panel's
 * key facts. Was the page's inline `dueCell(inv)` helper; moved out of
 * `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ inv: SupplierInvoice; t: TFunction }>}
 */
const DueCell = ({ inv, t }) => (
  <>
    <Data>{fmtDate(inv.dueDate)}</Data>
    {inv.overdue && (
      <div className="text-[length:var(--fs-label-3)] text-danger font-semibold">
        {inv.daysOutstanding === 1
          ? t('fc.inv.overdue.one')
          : t('fc.inv.overdue.other', { count: inv.daysOutstanding })}
      </div>
    )}
  </>
);

export default DueCell;
