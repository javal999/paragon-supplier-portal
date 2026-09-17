import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import { useInventory } from '../../services/query/hooks';
import { positionBand } from '../../services/transitions/inventoryRules';
import { SupplyPill, qty } from '../inventory/inventoryDisplay';

// Capability "inventory": backed by the wired InventoryDeclaration target
// (gate-1 LIVE) and still harvest-gated on a live supplier feed (gate-2), so the
// shell keeps the amber "Sample data" pill. INVENTORY-REFERENT-01 is closed: the
// widget now reads the same inventory model the capability is backed to, and
// "low" is the ONE band function (CR-02) — Critical or Warning days of supply —
// not the retired <7 / 7–13 stock status.
const BuyerInventoryWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useInventory();

  const low = useMemo(
    () =>
      (query.data?.items ?? []).filter((p) => {
        const band = positionBand(p);
        return band === 'critical' || band === 'warning';
      }),
    [query.data],
  );
  const count = low.length;
  const critical = low.filter((p) => positionBand(p) === 'critical').length;
  const severity: FlagSeverity = critical > 0 ? 'critical' : count > 0 ? 'warning' : 'none';

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">{t('widget.inventory.none')}</div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('widget.inventory.col.material')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.inventory.col.supplier')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('widget.inventory.col.onHand')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.inventory.col.daysOfSupply')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {low.map((p) => (
            <TableRow key={`${p.supplierId}-${p.materialCode}`}>
              <TableCell>
                <Data className="text-xs font-bold text-text-primary">{p.materialCode}</Data>
                <div className="text-text-secondary">{p.materialLabel}</div>
              </TableCell>
              <TableCell className="text-text-secondary">{p.supplierName}</TableCell>
              <TableCell className="text-right text-text-secondary">
                <Data>{p.supplierSoh === null ? '—' : `${qty(p.supplierSoh)} ${p.uom}`}</Data>
              </TableCell>
              <TableCell>
                <SupplyPill position={p} />
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.inventory.title')}
      icon={Boxes}
      count={count}
      capability="inventory"
      flagSeverity={severity}
      flagLabel={
        count > 0
          ? critical > 0
            ? t('widget.inventory.flag.withCritical', { count, critical })
            : t('widget.inventory.flag.plain', { count })
          : undefined
      }
      actionLabel={count > 0 ? t('widget.inventory.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/inventory') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerInventoryWidget;
