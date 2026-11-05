/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatDate } from '@lib/format';
import { labelOf } from '@services/sdc/materialMaster';
/** @import { IncomingShipment } from '@services/sdc' */
import {
  useIncomingShipmentTrack,
  useOwnIncomingShipments
} from '@services/query/sdcSupplierHooks';
import { trackingUrlProblem } from '@services/transitions/trackingUrl';
import { qty } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PEX-16 (BL-279) — on the supplier Stock page, each shipment from the
// supplier's principal still on its way (Booked or Shipped) can carry a
// tracking link the supplier types. It is not an ASN (Paragon is not the
// receiver) and does not use the 3PL `trackingUrlPattern`. Only https:// links
// are accepted; the form says why before sending, and the policy hook refuses
// the same input whatever the surface. The link opens in a new tab.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {readonly string[]} */
const IN_FLIGHT = ['Booked', 'Shipped'];

/** @type {Readonly<Record<string, string>>} */
const LIFECYCLE_KEY = {
  Booked: 'sdcSup.ship.state.booked',
  Shipped: 'sdcSup.ship.state.shipped'
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';

/**
 * One leg's link editor: the field, its message, Save and Cancel.
 * @type {React.FC<{ leg: IncomingShipment; onDone: () => void }>}
 */
const TrackingForm = ({ leg, onDone }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const track = useIncomingShipmentTrack();
  const [value, setValue] = useState(leg.trackingUrl ?? '');
  const [touched, setTouched] = useState(false);
  const problem = trackingUrlProblem(value);
  const fieldId = `principal-tracking-${leg.id}`;
  const errorId = `${fieldId}-error`;

  const save = async () => {
    setTouched(true);
    if (problem) return;
    try {
      const res = await track.mutateAsync({ shipmentId: leg.id, trackingUrl: value.trim() });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('inv.toast.refused'),
          description: refusalText(res.reason) ?? t('inv.refusal.generic')
        });
        return;
      }
      toast({ variant: 'success', title: t('inv.principal.saved') });
      onDone();
    } catch {
      toast({
        variant: 'error',
        title: t('inv.toast.refused'),
        description: t('inv.refusal.generic')
      });
    }
  };

  return (
    <div className="flex flex-col gap-1 min-w-[16rem]" data-testid={`principal-form-${leg.id}`}>
      <label htmlFor={fieldId} className="sr-only">
        {t('inv.principal.field', { material: leg.materialCode })}
      </label>
      <input
        id={fieldId}
        type="url"
        inputMode="url"
        className={inputClass}
        placeholder={t('inv.principal.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={touched && problem !== null}
        aria-describedby={touched && problem ? errorId : undefined}
        data-testid={`principal-input-${leg.id}`}
      />
      {touched && problem ? (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {t(`inv.principal.error.${problem}`)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={save} disabled={track.isPending}>
          {t('inv.principal.save')}
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={track.isPending}>
          {t('inv.principal.cancel')}
        </Button>
      </div>
    </div>
  );
};

/** @type {React.FC} */
const PrincipalShipmentsSection = () => {
  const { t } = useTranslation();
  const shipments = useOwnIncomingShipments();
  const availability = useVerbAvailability('incomingshipment:track');
  const [editing, setEditing] = useState(/** @type {string | null} */ (null));
  const legs = (shipments.data ?? [])
    .map((v) => v.shipment)
    .filter((s) => s.direction === 'principal-to-distributor' && IN_FLIGHT.includes(s.lifecycle));
  if (shipments.isPending || shipments.error) return null;

  return (
    <section
      className="mt-6 bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5"
      data-testid="principal-shipments"
    >
      <h2 className="text-section text-text-primary mb-1">{t('inv.principal.title')}</h2>
      <p className="text-sm text-text-secondary mb-4">{t('inv.principal.intro')}</p>
      {legs.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid="principal-empty">
          {t('inv.principal.empty')}
        </p>
      ) : (
        <div className="relative w-full min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-label text-text-tertiary uppercase">
                <th className="text-left py-1">{t('inv.principal.col.material')}</th>
                <th className="text-right py-1">{t('inv.principal.col.quantity')}</th>
                <th className="text-left py-1 pl-3">{t('inv.principal.col.eta')}</th>
                <th className="text-left py-1">{t('inv.principal.col.status')}</th>
                <th className="text-left py-1">{t('inv.principal.col.tracking')}</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-border-subtle align-top"
                  data-testid={`principal-row-${s.id}`}
                >
                  <td className="py-2">
                    <Data className="text-xs text-text-tertiary">{s.materialCode}</Data>
                    <div className="text-text-primary">{labelOf(s.materialCode)}</div>
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <Data>{`${qty(s.qty)} ${s.uom}`}</Data>
                  </td>
                  <td className="py-2 pl-3 whitespace-nowrap">
                    <Data>{formatDate(s.eta ?? null)}</Data>
                  </td>
                  <td className="py-2">{t(LIFECYCLE_KEY[s.lifecycle])}</td>
                  <td className="py-2">
                    {editing === s.id ? (
                      <TrackingForm leg={s} onDone={() => setEditing(null)} />
                    ) : (
                      <div className="flex flex-col items-start gap-1">
                        {s.trackingUrl ? (
                          <a
                            href={s.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-action hover:underline break-all"
                            data-testid={`principal-link-${s.id}`}
                          >
                            {s.trackingUrl}
                            <ExternalLink size={12} aria-hidden="true" />
                            <span className="sr-only">{t('inv.principal.opensNewTab')}</span>
                          </a>
                        ) : (
                          <span className="text-text-tertiary">{t('inv.principal.noLink')}</span>
                        )}
                        {availability.kind === 'held' ? (
                          <button
                            type="button"
                            className="text-xs text-action-hover hover:underline"
                            onClick={() => setEditing(s.id)}
                            data-testid={`principal-edit-${s.id}`}
                          >
                            {t(s.trackingUrl ? 'inv.principal.change' : 'inv.principal.add')}
                          </button>
                        ) : (
                          <HandoffNotice
                            availability={availability}
                            testId={`handoff-incomingshipment-track-${s.id}`}
                          />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PrincipalShipmentsSection;
