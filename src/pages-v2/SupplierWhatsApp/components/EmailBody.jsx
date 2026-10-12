import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import Button from '@components/ui-v2/Button';
/** @import { ScenarioId } from '../const' */

/**
 * The body of the email preview for one `scenario`: the message, its detail
 * card and its action buttons. A button only calls `onAction` with a success
 * line, which shows as `successMsg` in the green banner; nothing is dispatched.
 */
/** @type {React.FC<{ scenario: ScenarioId; onAction: (label: string) => void; successMsg: string | null; }>} */
const EmailBody = ({ scenario, onAction, successMsg }) => {
  const labelCls = 'text-xs text-text-tertiary uppercase tracking-wider font-semibold';
  const valueCls = 'text-sm text-text-primary font-medium mt-0.5';
  const cardCls = 'bg-bg-hover border border-border-subtle rounded-md p-4 mt-3';

  const SuccessBanner = () =>
    successMsg ? (
      <div className="mt-3 bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-success font-semibold flex items-center gap-2">
        <CheckCircle2 size={14} />
        {successMsg}
      </div>
    ) : null;

  if (scenario === 'po') {
    return (
      <>
        <p className="text-sm text-text-primary mb-3 leading-relaxed">
          Dear PT Sample Packaging team,
          <br />
          <br />A new purchase order has been issued. Please review and confirm receipt, or request
          changes within 24 hours.
        </p>
        <div className={cardCls}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              ['PO Number', 'PO-2025-00108'],
              ['Delivery Date', '15 Apr 2026'],
              ['Item', 'PET Bottle 100ml'],
              ['Quantity', '50,000 PCS'],
              ['Total Value', 'Rp 185,000,000'],
              ['Delivery To', 'NDC Jatake 6']
            ].map(([k, v]) => (
              <div key={k}>
                <div className={labelCls}>{k}</div>
                <div className={valueCls}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onAction('Order confirmed — SAP updated automatically')}
          >
            CONFIRM ORDER
          </Button>
          <Button
            variant="secondary"
            onClick={() => onAction('Change request received — buyer notified')}
          >
            REQUEST CHANGES
          </Button>
        </div>
        <SuccessBanner />
      </>
    );
  }

  if (scenario === 'asn') {
    return (
      <>
        <p className="text-sm text-text-primary mb-3 leading-relaxed">
          Reminder: delivery for <strong>PO-2025-00108</strong> is due in 3 days (15 Apr 2026).
          <br />
          <br />
          Please submit your Advance Shipping Notice so the receiving dock can be reserved.
        </p>
        <div className={cardCls}>
          <div className="grid grid-cols-1 gap-3">
            {[
              ['Carrier', 'Sample Courier'],
              ['Tracking Number', 'SMPL123456'],
              ['Ship Date', '12 Apr 2026']
            ].map(([k, v]) => (
              <div key={k}>
                <div className={labelCls}>{k}</div>
                <div className="mt-1 px-3 py-2 border border-border-input rounded text-sm text-text-primary bg-white">
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => onAction('ASN-2026-001 created — Dock 1 @ 09:00 reserved')}
          >
            SUBMIT ASN
          </Button>
        </div>
        <SuccessBanner />
      </>
    );
  }

  if (scenario === 'inventory') {
    return (
      <>
        <p className="text-sm text-text-primary mb-3 leading-relaxed">
          Our IBP shows <strong>Niacinamide B3</strong> at 24 days of supply. Please confirm or
          update the latest on-hand quantity so forecasts stay accurate.
        </p>
        <div className={cardCls}>
          <div className={labelCls}>Current Stock Level</div>
          <div className="text-kpi font-mono tabular-nums text-text-primary mt-1">24 days</div>
          <div className="text-sm text-text-tertiary mt-0.5">2,400 KG · Material MAT-10234</div>
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => onAction('Stock confirmed at 2,400 KG — IBP refreshed')}
          >
            UPDATE STOCK
          </Button>
        </div>
        <SuccessBanner />
      </>
    );
  }

  /** @type {{ label: string; done: boolean }[]} */
  const steps = [
    { label: 'Submitted', done: true },
    { label: 'Approved', done: true },
    { label: 'Scheduled', done: true },
    { label: 'Paid', done: false }
  ];
  return (
    <>
      <p className="text-sm text-text-primary mb-3 leading-relaxed">
        Your invoice <strong>INV-2026-00234</strong> has been approved and scheduled for payment.
      </p>
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="text-center flex-1">
                <div
                  className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center mx-auto mb-1 ${
                    s.done ? 'bg-action text-white' : 'bg-bg-hover text-text-tertiary'
                  }`}
                >
                  {s.done ? '✓' : i + 1}
                </div>
                <div
                  className={`text-[10px] font-semibold ${
                    s.done ? 'text-text-primary' : 'text-text-tertiary'
                  }`}
                >
                  {s.label}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mb-4 ${steps[i + 1].done ? 'bg-action' : 'bg-bg-hover'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border-subtle flex justify-between">
          <div>
            <div className={labelCls}>SAP Document</div>
            <div className={valueCls}>5105000234</div>
          </div>
          <div className="text-right">
            <div className={labelCls}>Estimated Payment</div>
            <div className={valueCls}>2 May 2026</div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => onAction('Payment confirmation requested — finance team notified')}
        >
          ACKNOWLEDGE
        </Button>
      </div>
      <SuccessBanner />
    </>
  );
};

export default EmailBody;
