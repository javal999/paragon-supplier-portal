/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { isConfirmedAndAccepted } from '@services/transitions/callOffRules';
/** @import { ASN, CallOff, PurchaseOrder } from '@services/data/types' */
/** @import { GoodsReceipt } from '@data/mockGoodsReceipts' */
/** @import { AsnForm } from '../const' */
import { fmtDate } from '../utils';
import { qty } from '../../callOffs/callOffDisplay';
import CallOffFinalToggle from './CallOffFinalToggle';
import WizardPoCard from './WizardPoCard';

/**
 * Wizard step 1 — pick the PO to ship against, then (REQ-E09-03 BR-06)
 * optionally the confirmed call-off on it this ASN ships.
 * `receipts`:  GR-1 / BL-71 — kept-open receipts reopen their missing quantity.
 * @type {React.FC<{ shippablePos: readonly PurchaseOrder[]; asns: readonly ASN[]; receipts?: readonly Pick<GoodsReceipt, 'poNumber' | 'asnNumber' | 'inspectionResults' | 'status'>[]; form: AsnForm; updateForm: (patch: Partial<AsnForm>) => void; selectedPO: PurchaseOrder | undefined; callOffs: readonly CallOff[] }>}
 */
const WizardSelectStep = ({
  shippablePos,
  asns,
  receipts = [],
  form,
  updateForm,
  selectedPO,
  callOffs
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      {shippablePos.length === 0 ? (
        <div className="bg-bg-hover border border-border-subtle rounded-md py-8 px-4 text-center text-sm text-text-tertiary">
          {t('supplierShipments.wizard.select.empty')}
        </div>
      ) : (
        shippablePos.map((po) => (
          <WizardPoCard
            key={po.id}
            po={po}
            asns={asns}
            receipts={receipts}
            selected={form.poId === po.id}
            updateForm={updateForm}
          />
        ))
      )}
      {selectedPO && (
        <div>
          <label
            htmlFor="asn-calloff"
            className="block text-label text-text-tertiary uppercase mb-1"
          >
            {t('co.asn.callOff')}
          </label>
          <select
            id="asn-calloff"
            value={form.callOffId}
            onChange={(e) => updateForm({ callOffId: e.target.value, callOffFinal: false })}
            className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
          >
            <option value="">{t('co.asn.noCallOff')}</option>
            {callOffs
              .filter((c) => c.poId === selectedPO.id && isConfirmedAndAccepted(c))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {`${c.callOffNumber} · ${qty(c.quantity)} ${c.uom} · ${fmtDate(c.needDate)}`}
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-text-tertiary">{t('co.asn.callOffHint')}</p>
          {form.callOffId ? (
            <CallOffFinalToggle
              id="asn-wizard-calloff-final"
              checked={form.callOffFinal}
              onChange={(v) => updateForm({ callOffFinal: v })}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default WizardSelectStep;
