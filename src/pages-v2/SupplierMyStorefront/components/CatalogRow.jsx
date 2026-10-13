/** @import React from 'react' */
/** @import { CatalogItem } from '@services/data/types' */
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Switch from '@components/ui-v2/Switch';
import Data from '@components/ui-v2/Data';
import { useCategoryLabel } from '@hooks/useCategoryLabel';

/**
 * @typedef {object} CatalogRowProps
 * @property {CatalogItem} item  One material in the storefront catalog.
 * @property {(id: string) => void} onToggleVisibility  Flips the row's `visible` flag (page handler).
 * @property {(id: string) => void} onRemove  Removes the row and toasts (page handler).
 */

/**
 * One row of the step 2 materials table: name, category, MOQ, lead time,
 * price, capacity, cert pills, a visibility switch and a remove button. Moved
 * out of `SupplierMyStorefront.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<CatalogRowProps>}
 */
const CatalogRow = ({ item, onToggleVisibility, onRemove }) => {
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  return (
    <TableRow>
      <TableCell>
        <span className="font-semibold text-text-primary">{item.material}</span>
      </TableCell>
      <TableCell className="text-text-tertiary text-xs">{cl(item.category)}</TableCell>
      <TableCell className="text-text-secondary">
        <Data>
          {item.moq} {item.uom}
        </Data>
      </TableCell>
      <TableCell className="text-text-secondary">
        <Data>
          {item.leadTime} {t('supplierMyStorefront.days')}
        </Data>
      </TableCell>
      <TableCell className="font-semibold text-teal-hover">
        <Data>
          {item.currency} {item.unitPrice}/{item.uom}
        </Data>
      </TableCell>
      <TableCell className="text-text-secondary">
        <Data>
          {item.capacity}
          {t('supplierMyStorefront.perMonth')}
        </Data>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.certs.map((c) => (
            <StatusPill key={c} variant="success">
              {c}
            </StatusPill>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={item.visible}
          onChange={() => onToggleVisibility(item.id)}
          ariaLabel={t('supplierMyStorefront.aria.toggleVisibility', {
            name: item.material
          })}
        />
      </TableCell>
      <TableCell className="text-right">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-text-tertiary hover:text-danger"
          aria-label={t('supplierMyStorefront.aria.removeMaterial', {
            name: item.material
          })}
        >
          <Trash2 size={14} />
        </button>
      </TableCell>
    </TableRow>
  );
};

export default CatalogRow;
