/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import HandoffNotice from '@components/ui-v2/HandoffNotice';
import { formatDate } from '@lib/format';
/** @import { CallOffChaseRow } from '@services/transitions/callOffChase' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { qty } from '../../callOffs/callOffDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// AIB-3 (BL-351) — the missing-ASN chase list.
//
// A call-off the planner sent with no ASN appears here one working day after it
// was sent, ONCE (BR-01, AIB-D6). The list is DERIVED at read
// (`transitions/callOffChase.js`): the page sends only the planner's closure,
// with a reason. A partial ASN keeps the row until the ASNs cover the call-off
// (edge case, [Proposed]); a covering ASN, a receipt, a missed delivery or a
// closure takes it off.
//
// HONEST: nothing is sent from here — email waits on the notification service
// (BL-26), and CR-09's 7-day reminder is a separate rule (BR-02, BR-03). The
// note travels with the list.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} ChaseSectionProps
 * @property {readonly CallOffChaseRow[]} rows The open chases, oldest first.
 * @property {VerbAvailability} availability The seat's authority over `calloffchase:close`.
 * @property {boolean} busy A close is in flight.
 * @property {(callOffId: string, reason: string) => Promise<boolean>} onClose
 *   Closes one chase; resolves true when it succeeded.
 */

const th = 'text-left text-xs font-medium text-text-tertiary uppercase py-1 pr-4 align-bottom';

/** @type {React.FC<ChaseSectionProps>} */
const ChaseSection = ({ rows, availability, busy, onClose }) => {
  const { t } = useTranslation();
  const [closing, setClosing] = useState(/** @type {string | null} */ (null));
  const [reason, setReason] = useState('');
  // `held` is the seat HOLDING the atom (`VerbAvailability`), so it is the
  // branch that offers the act; every other kind names whose act it is.
  const held = availability.kind === 'held';

  /** @param {string} callOffId */
  const confirm = async (callOffId) => {
    const ok = await onClose(callOffId, reason.trim());
    if (ok) {
      setClosing(null);
      setReason('');
    }
  };

  return (
    <div data-testid="calloff-chase">
      <p
        className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-4 text-sm text-text-primary"
        data-testid="calloff-chase-note"
      >
        {t('co.chase.note')}
      </p>

      {rows.length === 0 ? (
        <div
          className="border border-border-subtle rounded-lg bg-white px-6 py-8 text-center text-sm text-text-tertiary"
          data-testid="calloff-chase-empty"
        >
          {t('co.chase.empty')}
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-subtle">
                <th scope="col" className={th}>
                  {t('co.chase.col.callOff')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.supplier')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.material')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.quantity')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.needDate')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.sent')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.since')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.asn')}
                </th>
                <th scope="col" className={th}>
                  {t('co.chase.col.action')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.callOffId}
                  className="border-b border-border-subtle align-top"
                  data-testid={`calloff-chase-row-${r.callOffId}`}
                >
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Data data-testid={`calloff-chase-number-${r.callOffId}`}>
                      {r.callOffNumber}
                    </Data>
                  </td>
                  <td className="py-2 pr-4">{r.supplierName}</td>
                  <td className="py-2 pr-4">
                    <div>{r.description}</div>
                    <Data className="text-xs text-text-tertiary">{r.materialCode}</Data>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Data>{`${qty(r.quantity)} ${r.uom}`}</Data>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Data>{formatDate(r.needDate)}</Data>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Data>{formatDate(r.releasedAt)}</Data>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <Data data-testid={`calloff-chase-since-${r.callOffId}`}>
                      {formatDate(r.dueAt)}
                    </Data>
                  </td>
                  <td
                    className="py-2 pr-4 whitespace-nowrap text-text-secondary"
                    data-testid={`calloff-chase-asn-${r.callOffId}`}
                  >
                    {r.coverage === 0
                      ? t('co.chase.asn.none')
                      : t('co.chase.asn.partial', {
                          coverage: qty(r.coverage),
                          obligation: qty(r.obligation),
                          uom: r.uom
                        })}
                  </td>
                  <td className="py-2 pr-4">
                    {held ? (
                      closing === r.callOffId ? (
                        <div className="min-w-[16rem]">
                          <label
                            className="block text-label text-text-tertiary uppercase mb-1"
                            htmlFor={`calloff-chase-reason-${r.callOffId}`}
                          >
                            {t('co.chase.reason')}
                          </label>
                          <input
                            id={`calloff-chase-reason-${r.callOffId}`}
                            className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('co.chase.reasonPlaceholder')}
                            data-testid={`calloff-chase-reason-${r.callOffId}`}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              onClick={() => void confirm(r.callOffId)}
                              disabled={busy || reason.trim() === ''}
                              data-testid={`calloff-chase-confirm-${r.callOffId}`}
                            >
                              {t('co.chase.confirm')}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setClosing(null);
                                setReason('');
                              }}
                              data-testid={`calloff-chase-cancel-${r.callOffId}`}
                            >
                              {t('co.chase.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setClosing(r.callOffId);
                            setReason('');
                          }}
                          data-testid={`calloff-chase-close-${r.callOffId}`}
                        >
                          {t('co.chase.close')}
                        </Button>
                      )
                    ) : (
                      <HandoffNotice
                        availability={availability}
                        testId={`handoff-calloff-chase-${r.callOffId}`}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChaseSection;
