/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Ship } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import FormSection from '@components/ui-v2/FormSection';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
/** @import { CollaboratedMaterialView } from '@services/query/sdcSupplierHooks' */
import { useIncomingShipmentReport } from '@services/query/sdcSupplierHooks';
/** @import { SdcObjectKind, ShipmentDirection } from '@services/sdc' */
import { buildIncomingShipmentPayload } from '@services/sdc';
/** @import { ASN, CommandResult } from '@services/data/types' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
import { normalizeQty } from '@lib/localeNumber';
/** @import { ShipmentForm } from '../const' */
import { inputClass, labelClass } from '../const';
import { materialLabel, materialUom } from '../utils';
import ShipmentLinkSection from './ShipmentLinkSection';

// CP-0 · W1 · PR-2d — the shipment quantity. NO CONVENTION HINT, for exactly
// the reasons written above the confirm map: this surface has no carrier, and
// the supplier master's `country` is a jurisdiction, not the convention of
// whoever is typing. Ambiguity refuses (CP-0 §5a).
//
// (The confirm map is `CONFIRM_REFUSAL_KEY` in `ConfirmPanel.jsx`. Each map sits
// beside both of its uses because GL-1's `chipCoverage` links a message map to
// its uses only within the file that declares it.)
/** @type {Record<QtyRefusalReason, string>} */
const SHIP_REFUSAL_KEY = {
  EMPTY_QTY: 'sdcSup.ship.qty.refused.empty',
  NOT_NUMERIC: 'sdcSup.ship.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'sdcSup.ship.qty.refused.ambiguous'
};

/**
 * @typedef {object} ShipmentReportPanelProps
 * @property {boolean} open
 * @property {ShipmentForm} form
 * @property {React.Dispatch<React.SetStateAction<ShipmentForm>>} setForm
 * @property {() => void} onClose  Cancel and the panel's own close
 * @property {() => void} onReported  after success: close, reset, switch to Shipments
 * @property {readonly CollaboratedMaterialView[]} materials  the supplier's own materials
 * @property {readonly ASN[]} asns  the supplier's own ASNs, the to-paragon link source
 * @property {string} supplierId  from the identity, never the form
 * @property {() => string | undefined} causationId  the visit's audit anchor
 * @property {(kind: SdcObjectKind, res: CommandResult) => void} recordAttempt
 * @property {() => void} failToast  the generic failure toast for a thrown dispatch
 */

/**
 * The shipment report panel (SDC-3b, direction-guarded): material and a
 * direction legal for it, quantity (parsed once, refused inline, Submit
 * withdrawn while refused), ETD / ETA, then the direction's link section.
 * Sends `t_incomingshipment_report`.
 *
 * Form state stays in the workspace, which opens the panel with an empty form.
 * @type {React.FC<ShipmentReportPanelProps>}
 */
const ShipmentReportPanel = ({
  open,
  form: shipForm,
  setForm: setShipForm,
  onClose,
  onReported,
  materials,
  asns,
  supplierId,
  causationId,
  recordAttempt,
  failToast
}) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const reportMutation = useIncomingShipmentReport();

  // ── SDC-3b — shipment report ───────────────────────────────────────────────
  const shipMaterial = materials.find((m) => m.materialCode === shipForm.materialCode) ?? null;
  // Direction legality (the surface never offers an illegal pairing):
  // to-paragon is always legal; principal-to-distributor ONLY for a distributor.
  const p2dLegal = shipMaterial?.supplierType === 'distributor';
  // The supplier's own ASNs are the to-paragon link source (asnRef is SELECTED,
  // never free-typed — it resolves server-side, per the R-4 note).
  const ownAsns = asns;
  // THE ONE PARSE for this form: the gate below, the inline refusal, and the
  // payload all read this single result, so no two of them can disagree.
  const shipQty = normalizeQty(shipForm.qty);

  /** @param {string} materialCode */
  const setShipMaterial = (materialCode) => {
    const m = materials.find((x) => x.materialCode === materialCode) ?? null;
    setShipForm((f) => ({
      ...f,
      materialCode,
      // Reset a now-illegal direction (p2d on a non-distributor material).
      direction:
        f.direction === 'principal-to-distributor' && m?.supplierType !== 'distributor'
          ? ''
          : f.direction
    }));
  };
  /** @param {string} asnNumber */
  const setShipAsn = (asnNumber) => {
    const asn = ownAsns.find((a) => a.asnNumber === asnNumber);
    // Auto-fill the AWB from the linked ASN's tracking number (read-only echo).
    setShipForm((f) => ({ ...f, asnRef: asnNumber, awb: asn?.trackingNumber ?? '' }));
  };

  const submitShipment = async () => {
    if (!shipForm.materialCode) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingMaterial.title'),
        description: t('sdcSup.ship.toast.missingMaterial.body')
      });
      return;
    }
    if (!shipForm.direction) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingDirection.title'),
        description: t('sdcSup.ship.toast.missingDirection.body')
      });
      return;
    }
    // The refusal renders inline on the field; this is the submit-time backstop
    // (a keyboard commit can reach here without the operator reading the field).
    // Same `shipQty` both places — one parse, one verdict.
    if (!shipQty.ok) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingQty.title'),
        description: t(SHIP_REFUSAL_KEY[shipQty.reason])
      });
      return;
    }
    // to-paragon MUST link an own ASN (the guard enforces; the surface requires it).
    if (shipForm.direction === 'to-paragon' && !shipForm.asnRef) {
      toast({
        variant: 'error',
        title: t('sdcSup.ship.toast.missingAsn.title'),
        description: t('sdcSup.ship.toast.missingAsn.body')
      });
      return;
    }
    const payload = buildIncomingShipmentPayload(
      supplierId,
      shipForm.materialCode,
      shipForm.direction,
      {
        qty: shipQty.value,
        ...(shipForm.etd ? { etd: shipForm.etd } : {}),
        ...(shipForm.eta ? { eta: shipForm.eta } : {}),
        ...(shipForm.awb ? { awb: shipForm.awb } : {}),
        ...(shipForm.direction === 'to-paragon' && shipForm.asnRef
          ? { asnRef: shipForm.asnRef }
          : {})
      }
    );
    try {
      const res = await reportMutation.mutateAsync({ payload, causationId: causationId() });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.ship.toast.failed.title'),
          description: refusalText(res.reason) ?? res.reason ?? t('sdcSup.toast.failed.body')
        });
        return;
      }
      recordAttempt('IncomingShipment', res);
      toast({
        variant: 'success',
        title: t('sdcSup.ship.toast.reported.title', {
          material: materialLabel(shipForm.materialCode)
        }),
        description: t('sdcSup.ship.toast.reported.body')
      });
      onReported();
    } catch {
      failToast();
    }
  };

  const shipUom = shipForm.materialCode ? materialUom(shipForm.materialCode) : '';

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={t('sdcSup.ship.panel.title')}
      footerActions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('sdcSup.panel.cancel')}
          </Button>
          {/* Disabled UNCONDITIONALLY on a refusal (D3, 2b): an unreadable
              quantity is not a submittable form, so the commit is withdrawn
              rather than left to fail at the toast. */}
          <Button
            variant="outline"
            icon={Ship}
            data-testid="sdcsup-ship-submit"
            disabled={reportMutation.isPending || !shipQty.ok}
            onClick={submitShipment}
          >
            {reportMutation.isPending
              ? t('sdcSup.ship.panel.submitting')
              : t('sdcSup.ship.panel.submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FormSection
          eyebrow={t('sdcSup.ship.panel.material.eyebrow')}
          title={t('sdcSup.ship.panel.material.title')}
          description={t('sdcSup.ship.panel.material.desc')}
        >
          <div>
            <label className={labelClass} htmlFor="sdcsup-ship-material">
              {t('sdcSup.stock.panel.materialLabel')}
            </label>
            <select
              id="sdcsup-ship-material"
              value={shipForm.materialCode}
              onChange={(e) => setShipMaterial(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('sdcSup.stock.panel.materialSelect')}</option>
              {materials.map((m) => (
                <option key={m.materialCode} value={m.materialCode}>
                  {m.materialCode} — {m.label} ({m.uom})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="sdcsup-ship-direction">
              {t('sdcSup.ship.panel.directionLabel')}
            </label>
            <select
              id="sdcsup-ship-direction"
              value={shipForm.direction}
              disabled={!shipForm.materialCode}
              onChange={(e) =>
                setShipForm({
                  ...shipForm,
                  direction: /** @type {ShipmentDirection | ''} */ (e.target.value)
                })
              }
              className={inputClass}
            >
              <option value="">{t('sdcSup.ship.panel.directionSelect')}</option>
              <option value="to-paragon">{t('sdcSup.ship.dir.toParagon')}</option>
              {/* p2d offered ONLY for a distributor material — the surface never
                  presents an illegal pairing (ISH_P2D_DISTRIBUTOR_ONLY). */}
              {p2dLegal && (
                <option value="principal-to-distributor">{t('sdcSup.ship.dir.p2d')}</option>
              )}
            </select>
            {shipForm.materialCode && !p2dLegal && (
              <p className="mt-1 text-xs italic text-text-tertiary">
                {t('sdcSup.ship.panel.p2dHint')}
              </p>
            )}
          </div>
        </FormSection>

        <FormSection
          eyebrow={t('sdcSup.ship.panel.detail.eyebrow')}
          title={t('sdcSup.ship.panel.detail.title')}
          description={t('sdcSup.ship.panel.detail.desc')}
        >
          <div>
            <label className={labelClass} htmlFor="sdcsup-ship-qty">
              {t('sdcSup.ship.panel.qtyLabel', { uom: shipUom || '—' })}
            </label>
            {/* CP-0 · 6.2 — text + inputmode, not type="number": a fix behind
                a number field cannot fire, because the browser filters the
                input space to what `Number` happens to accept. The widened
                space is safe ONLY because the parse landed in this same
                commit (the NaN-through-the-spine hazard). */}
            <input
              id="sdcsup-ship-qty"
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-invalid={shipForm.qty.trim() !== '' && !shipQty.ok}
              aria-describedby="sdcsup-ship-qty-hint"
              value={shipForm.qty}
              onChange={(e) => setShipForm({ ...shipForm, qty: e.target.value })}
              className={inputClass}
            />
            {shipForm.qty.trim() !== '' && !shipQty.ok ? (
              <p
                id="sdcsup-ship-qty-hint"
                role="alert"
                data-testid="ship-qty-refusal"
                className="mt-1 text-xs text-danger"
              >
                {t(SHIP_REFUSAL_KEY[shipQty.reason])}{' '}
                <GlossaryTermChip
                  refTo={{ sourceType: 'QtyRefusalReason', term: shipQty.reason }}
                />
              </p>
            ) : (
              <p id="sdcsup-ship-qty-hint" className="mt-1 text-xs text-text-tertiary">
                {t('sdcSup.ship.qty.hint')}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="sdcsup-ship-etd">
                {t('sdcSup.ship.panel.etd')}
              </label>
              <input
                id="sdcsup-ship-etd"
                type="date"
                value={shipForm.etd}
                onChange={(e) => setShipForm({ ...shipForm, etd: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="sdcsup-ship-eta">
                {t('sdcSup.ship.panel.eta')}
              </label>
              <input
                id="sdcsup-ship-eta"
                type="date"
                value={shipForm.eta}
                onChange={(e) => setShipForm({ ...shipForm, eta: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </FormSection>

        <ShipmentLinkSection
          form={shipForm}
          setForm={setShipForm}
          ownAsns={ownAsns}
          onSelectAsn={setShipAsn}
        />
      </div>
    </SidePanel>
  );
};

export default ShipmentReportPanel;
