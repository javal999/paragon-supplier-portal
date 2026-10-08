/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Truck } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability, useVerbAvailabilities } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
/** @import { IncomingShipmentView } from '@services/query/sdcSupplierHooks' */
import {
  useIncomingShipmentShip,
  useIncomingShipmentArrive,
  useIncomingShipmentCancel
} from '@services/query/sdcSupplierHooks';
/** @import { IncomingShipment } from '@services/sdc' */
/** @import { CommandResult } from '@services/data/types' */
import { DataError } from '@services/data/types';
import { useDataErrorText } from '@hooks/useRefusalText';
import ShipmentCard from './ShipmentCard';

/**
 * The "Shipments" tab (SDC-3b): the Report-a-shipment entry, then one
 * `ShipmentCard` per own reported leg, or the empty state. Owns the three
 * advance mutations (`_ship` / `_arrive` / `_cancel`) and their toasts.
 *
 * `onReport` opens the workspace's shipment report panel.
 * @type {React.FC<{ shipments: readonly IncomingShipmentView[]; onReport: () => void; }>}
 */
const ShipmentsTab = ({ shipments, onReport }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const dataErrorText = useDataErrorText();
  const reportAvailability = useVerbAvailability('incomingshipment:report');
  // Three DISTINCT atoms → three availabilities → three notices in their own
  // slots. They are separate grants in `fulfilment`, and a seat can be narrowed
  // to hold one and not another; gating all three on one atom would invent an
  // authority statement the bundles do not make.
  const advance = useVerbAvailabilities(
    /** @type {const} */ ({
      ship: 'incomingshipment:ship',
      arrive: 'incomingshipment:arrive',
      cancel: 'incomingshipment:cancel'
    })
  );
  const shipMutation = useIncomingShipmentShip();
  const arriveMutation = useIncomingShipmentArrive();
  const cancelMutation = useIncomingShipmentCancel();
  /** Keyed by the SAME key as `advance`, so the verb table can reach both. */
  const mutationFor = { ship: shipMutation, arrive: arriveMutation, cancel: cancelMutation };
  const [pendingId, setPendingId] = useState(/** @type {string | null} */ (null));

  /**
   * @param {IncomingShipment} s
   * @param {{ mutateAsync: (v: { shipmentId: string }) => Promise<CommandResult> }} mutation
   * @param {string} okTitleKey
   */
  const runAdvance = async (s, mutation, okTitleKey) => {
    setPendingId(s.id);
    try {
      const res = await mutation.mutateAsync({ shipmentId: s.id });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.ship.advance.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body')
        });
        return;
      }
      toast({ variant: 'success', title: t(okTitleKey, { id: s.id }) });
    } catch (e) {
      // A refusal the dispatcher THROWS (SCOPE_DENIED) rather than returns.
      // Absorbing it would leave the supplier pressing a button that reports
      // nothing at all.
      //
      // ⚠️ **THIS SITE TESTS `Error`, NOT `DataError`, AND THE DIFFERENCE IS WHY
      // IT WAS ALMOST MISSED.** The five sibling sites on the buyer side test
      // `instanceof DataError`, so a `grep` for that — the natural way to find
      // this class — returns this file NOT AT ALL. It was found by matching the
      // SHAPE (a caught value whose `.message` reaches a toast) rather than the
      // type name, and it is the only site of the class on the supplier side.
      //
      // The supertype test is KEPT rather than narrowed to match the others: a
      // plain `Error` that is not a `DataError` must still render its message,
      // and `String(e)` must still catch a thrown non-`Error`. Only the
      // recognised-code branch is new.
      toast({
        variant: 'error',
        title: t('sdcSup.ship.advance.failed.title'),
        description:
          dataErrorText(e instanceof DataError ? e.code : undefined) ??
          (e instanceof Error ? e.message : String(e))
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="sdcsup-shipments">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-secondary">{t('sdcSup.ship.subtitle')}</p>
        {reportAvailability.kind === 'held' ? (
          <Button variant="outline" icon={Plus} onClick={onReport}>
            {t('sdcSup.ship.report')}
          </Button>
        ) : (
          <HandoffNotice
            availability={reportAvailability}
            testId="handoff-incomingshipment-report"
          />
        )}
      </div>
      {shipments.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
            <Truck size={20} className="text-text-tertiary" />
          </div>
          <div className="text-base font-semibold text-text-primary mb-1">
            {t('sdcSup.ship.emptyTitle')}
          </div>
          <div className="text-sm text-text-tertiary">{t('sdcSup.ship.emptyBody')}</div>
        </div>
      ) : (
        shipments.map((view) => (
          <ShipmentCard
            key={view.shipment.id}
            view={view}
            advance={advance}
            pending={pendingId === view.shipment.id}
            onAdvance={(key, okTitleKey) => runAdvance(view.shipment, mutationFor[key], okTitleKey)}
          />
        ))
      )}
    </div>
  );
};

export default ShipmentsTab;
