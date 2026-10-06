import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import { useVerbAvailabilities } from '@hooks/useVerbAvailability';
import { statusLabelKey } from '@lib/statusLabel';
/** @import { ASN, PurchaseOrder } from '@services/data/types' */
/** @import { StatusFilter } from '../const' */
import { PicFilter, usePicFilter } from '../../materials/picDisplay';
import AsnDetailRow from './AsnDetailRow';
import AsnRow from './AsnRow';
import PendingAsnPanel from './PendingAsnPanel';

/**
 * @typedef {object} ShipmentsListProps
 * @property {ASN[]} asns
 * @property {StatusFilter} statusFilter
 * @property {Set<string>} expanded
 * @property {(asnNumber: string) => void} onToggleExpand
 * @property {(asnNumber: string) => void} onSubmitAsn
 * @property {(asnNumber: string) => void} onCancelAsn
 * @property {(poId: string) => void} onCreateAsnForPO
 * @property {PurchaseOrder[]} confirmedPOs
 */

/**
 * The "My shipments" tab: the awaiting-ASN panel for confirmed POs with no
 * ASN, then the ASN table filtered by the KPI status and the PIC filter. It
 * asks the seat for each ASN verb once and hands each row its own answer.
 * @type {React.FC<ShipmentsListProps>}
 */
const ShipmentsList = ({
  asns,
  statusFilter,
  expanded,
  onToggleExpand,
  onSubmitAsn,
  onCancelAsn,
  onCreateAsnForPO,
  confirmedPOs
}) => {
  const { t } = useTranslation();
  // Material C4 — the PIC filter (by name: a supplier never sees the code). An
  // ASN is kept when any of its lines is that controller's material.
  const pic = usePicFilter();
  // ⚠️ TWO VERBS, TWO SLOTS — never one notice speaking for both (§76). They
  // are co-reachable on this page: a supplier with a confirmed PO and a draft
  // ASN sees the create row and the submit cell at the same time, so a single
  // collapsed notice would name an owner for an act the reader was not looking
  // at. Both atoms belong to FULFILMENT, and they are asked separately anyway
  // so the answer stays right if the lanes ever diverge.
  const asnVerbs = useVerbAvailabilities(
    /** @type {const} */ ({
      create: 'asn:create',
      submit: 'asn:submit',
      // `asn:flag` is a `receiving` atom and this is the supplier side, so this
      // answer is `withheld` for every seat that can reach this page. It is asked
      // through the SAME resolver as the other two rather than hardcoded to a
      // notice: the day a supplier lane is granted the atom, the surface follows
      // the bundles instead of contradicting them.
      resolve: 'asn:flag',
      // REQ-E07-04 — withdrawing a notice before receipt.
      cancel: 'asn:cancel'
    })
  );
  const filtered = useMemo(
    () =>
      (statusFilter === 'All' ? asns : asns.filter((a) => a.status === statusFilter)).filter(
        (a) => pic.filter === '' || a.lineItems.some((li) => pic.matches(li.mrpController))
      ),
    [statusFilter, asns, pic.filter, pic.matches]
  );

  const pendingPOs = useMemo(() => {
    const asnPoRefs = new Set(asns.map((a) => a.poReference));
    return confirmedPOs.filter((po) => !asnPoRefs.has(po.poNumber));
  }, [confirmedPOs, asns]);

  return (
    <div className="flex flex-col gap-5">
      {pendingPOs.length > 0 && (
        <PendingAsnPanel
          pendingPOs={pendingPOs}
          create={asnVerbs.create}
          onCreateAsnForPO={onCreateAsnForPO}
        />
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-section text-text-primary">
            {t('supplierShipments.list.heading')}
            {statusFilter !== 'All' && (
              <span className="text-text-tertiary font-normal ml-2 text-xs">
                ·{' '}
                {t('supplierShipments.list.filteredBy', {
                  status: t(statusLabelKey(statusFilter) ?? statusFilter)
                })}
              </span>
            )}
          </h3>
          <PicFilter
            refs={asns.flatMap((a) => a.lineItems.map((li) => li.mrpController))}
            persona="supplier"
            filter={pic.filter}
            setFilter={pic.setFilter}
            myCode={pic.myCode}
          />
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell className="w-8">
              <span className="sr-only">{t('supplierShipments.aria.expand')}</span>
            </TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.asn')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.poRef')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.carrier')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.tracking')}</TableHeaderCell>
            <TableHeaderCell>{t('supplierShipments.col.eta')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('supplierShipments.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((asn) => {
              const isOpen = expanded.has(asn.asnNumber);
              return (
                <React.Fragment key={asn.asnNumber}>
                  <AsnRow
                    asn={asn}
                    isOpen={isOpen}
                    asnVerbs={asnVerbs}
                    onToggleExpand={onToggleExpand}
                    onSubmitAsn={onSubmitAsn}
                    onCancelAsn={onCancelAsn}
                  />
                  {isOpen && (
                    <AsnDetailRow asn={asn} submitHeld={asnVerbs.submit.kind === 'held'} />
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-sm text-text-tertiary py-10">
                  {t('supplierShipments.list.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default ShipmentsList;
