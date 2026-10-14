/** @import React from 'react' */
/** @import { ComplianceRow } from '@services/data/types' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
import { daysUntil } from '@services/data/dayProjection';
import { COMPLIANCE_VARIANT, TODAY } from '../const';

/**
 * The "Compliance risks" tab body: the dismissible halal-certificate warning
 * banner, the certificate table (days left projected from each row's own
 * `expires` against the anchored `TODAY`, with reminder / urgent-renewal
 * toasts) and the pointer to the compliance tracker. Owns the banner's
 * dismissed flag.
 *
 * Props: `compliance` (the fixture rows from `useCompliance`).
 * @type {React.FC<{ compliance: ComplianceRow[] }>}
 */
const ComplianceRisksTab = ({ compliance }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // ⚠️ ONE clock read for the tab, at the TOP of the body. Derived before
  // writing: this component has no early return, so the hook is unconditional —
  // the check that #317 skipped and paid 44 specs for.
  // ⚠️ **A DEFAULT-RENDER SWEEP CLEARS THIS PAGE, AND THAT READING IS FALSE.**
  // This hook lives in `ComplianceRisksTab` and the default tab is `geo`, so a
  // census that renders the page and diffs its text finds NO clock-derived
  // value and reports `BuyerRisk` as inert — which is exactly what happened
  // before this was anchored. The day-counts below are one click away, not
  // absent. `anchoredSurfaces.guard.test.jsx` opens the tab for that reason;
  // without the click its assertion passes whether or not this line is pinned.
  const nowIso = TODAY;
  /** Days to expiry for a compliance row, from its own `expires` date.
   *  `daysLeft` was a STORED difference against now and every row of it was
   * @param {ComplianceRow} r
   * @returns {number | null}
   *  153 days stale — it back-solved to a single authoring date, 2026-04-08. */
  const daysLeftOf = (r) => daysUntil(r.expires, nowIso);
  const halalItem = compliance.find((r) => r.type === 'Halal Cert');

  return (
    <div className="flex flex-col gap-4">
      {!bannerDismissed && halalItem && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-text-primary">
              {t('risk.compliance.actionRequired')}
            </span>
            {/* Interpolated supplier/type/expires/days stay canonical (fixture data) */}
            <span className="text-sm text-text-secondary">
              {t(
                (daysLeftOf(halalItem) ?? 0) < 0
                  ? 'risk.compliance.certExpiredPrefix'
                  : 'risk.compliance.certWarnPrefix',
                { supplier: halalItem.supplier, type: halalItem.type }
              )}
              <strong className="text-warning-hover">
                {t(
                  (daysLeftOf(halalItem) ?? 0) < 0
                    ? 'risk.compliance.certExpiredDays'
                    : 'risk.compliance.certWarnDays',
                  { days: Math.abs(daysLeftOf(halalItem) ?? 0) }
                )}
              </strong>
              {t('risk.compliance.certWarnSuffix', { expires: halalItem.expires })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-text-tertiary hover:text-text-secondary shrink-0"
            aria-label={t('risk.compliance.dismissBanner')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('risk.compliance.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.certRequirement')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.expiryDate')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.daysLeft')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('risk.compliance.col.action')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {compliance.map((row) => {
              // "Expiring soon" is not a canonical status token (the map holds
              // "Expiring Soon"), so StatusPill left it in EN; all three labels
              // are keyed here so the pill reads in the reader's language.
              const statusLabel =
                row.status === 'expired'
                  ? t('risk.compliance.status.expired')
                  : row.status === 'expiring'
                    ? t('risk.compliance.status.expiring')
                    : t('risk.compliance.status.valid');
              return (
                <TableRow key={row.supplier + row.type}>
                  <TableCell>
                    <span className="font-semibold text-text-primary">{row.supplier}</span>
                  </TableCell>
                  <TableCell className="text-text-secondary">{row.type}</TableCell>
                  <TableCell className="text-text-tertiary">
                    <Data>{row.expires}</Data>
                  </TableCell>
                  <TableCell>
                    <Data
                      className={`font-bold ${
                        row.status === 'expired'
                          ? 'text-danger'
                          : row.status === 'expiring'
                            ? 'text-warning-hover'
                            : 'text-success'
                      }`}
                    >
                      {(() => {
                        const d = daysLeftOf(row);
                        if (d === null) return '—';
                        return d < 0
                          ? t('risk.compliance.overdue', { days: Math.abs(d) })
                          : t('risk.unit.daysShort', { days: d });
                      })()}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={COMPLIANCE_VARIANT[row.status]}>{statusLabel}</StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === 'ok' ? (
                      <span className="text-meta text-text-tertiary">
                        ✓ {t('risk.compliance.noAction')}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() =>
                          toast({
                            variant: row.status === 'expired' ? 'warning' : 'info',
                            title:
                              row.status === 'expired'
                                ? t('risk.toast.urgentRenewal', { supplier: row.supplier })
                                : t('risk.toast.reminderSent', { supplier: row.supplier })
                          })
                        }
                      >
                        {row.status === 'expired'
                          ? t('risk.compliance.urgentRenewal')
                          : t('risk.compliance.sendReminder')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-meta text-text-secondary">
        {t('risk.compliance.differentAnglePrefix')}
        <strong className="text-info">{t('risk.compliance.complianceTracker')}</strong>
        {t('risk.compliance.differentAngleSuffix')}
      </div>
    </div>
  );
};

export default ComplianceRisksTab;
