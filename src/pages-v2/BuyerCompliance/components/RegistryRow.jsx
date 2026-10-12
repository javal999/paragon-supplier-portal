/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { Row } from '../const' */
import { Bell, RefreshCw } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import { formatDate } from '@lib/format';
import { certTypeLabelKey, actionLabelKey } from '@lib/complianceView';
import { statusTone } from '@lib/statusTone';

/**
 * @typedef {object} RegistryRowProps
 * @property {Row} row One registry entry with its computed-at-read projections.
 * @property {UseToastReturn['toast']} toast The page's toast function, for the Remind action.
 * @property {TFunction} t
 */

/**
 * One certificate in the registry table: supplier, certificate and number,
 * category, issuer, expiry with the days left or since, display status, SAP
 * sync state, the descriptive action label, and Remind for a remind-eligible
 * row. Moved out of `BuyerCompliance.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<RegistryRowProps>}
 */
const RegistryRow = ({ row: { entry, status, days, category, remind }, toast, t }) => (
  <TableRow>
    <TableCell>
      <div className="font-semibold text-text-primary">{entry.supplierName}</div>
    </TableCell>
    <TableCell className="text-text-secondary">
      <div>{t(certTypeLabelKey(entry.certType))}</div>
      {entry.certNumber && (
        <Data as="div" className="text-xs text-text-tertiary mt-0.5">
          {entry.certNumber}
        </Data>
      )}
    </TableCell>
    <TableCell>
      <StatusPill variant="neutral">{category}</StatusPill>
    </TableCell>
    <TableCell className="text-text-tertiary">{entry.issuer || '—'}</TableCell>
    <TableCell>
      <div className="text-sm text-text-secondary whitespace-nowrap">
        {formatDate(entry.expiryDate)}
      </div>
      {days !== null && (
        <div
          className={`text-xs mt-0.5 ${
            days <= 0 ? 'text-danger' : days <= 90 ? 'text-warning-hover' : 'text-text-tertiary'
          }`}
        >
          {days <= 0
            ? t('compliance.expiry.expiredAgo', { days: Math.abs(days) })
            : t('compliance.expiry.remaining', { days })}
        </div>
      )}
    </TableCell>
    <TableCell>
      <StatusPill variant={statusTone(status)}>
        {status === 'Under Review' ? (
          <span className="inline-flex items-center gap-1">
            <RefreshCw size={10} />
            {status}
          </span>
        ) : (
          status
        )}
      </StatusPill>
    </TableCell>
    {/* ── THE SYNC STATE, SAID RATHER THAN INFERRED ──────────────
        A stored fact, NOT a projection — the one non-derived column
        added since I3.1, and it is stored precisely because nothing
        can compute it: there is no transport to ask. Every row reads
        the same today because `SapSyncState` has exactly one
        reachable member; the column is here so a reader learns that
        from the row instead of assuming the opposite from silence. */}
    <TableCell>
      <span
        data-testid={`sap-sync-${entry.sapSync}`}
        title={t(`compliance.sapSync.${entry.sapSync}.title`)}
      >
        <StatusPill variant="neutral">{t(`compliance.sapSync.${entry.sapSync}`)}</StatusPill>
      </span>
    </TableCell>
    <TableCell>
      {/* Descriptive of state, never imperative (D4): the label names
          the state; it does not offer an action the SIMULATED cert
          cannot back. */}
      <span
        className={`text-xs ${
          status === 'Expired' || status === 'Missing'
            ? 'text-danger'
            : status === 'Expiring'
              ? 'text-warning-hover'
              : 'text-text-tertiary'
        }`}
      >
        {t(actionLabelKey(status))}
      </span>
    </TableCell>
    <TableCell className="text-right">
      {/* Remind is gated on remindEligible (lifecycleState Valid) —
          the honest projection. Under Review / Missing certs are NOT
          remind-eligible (HALAL-UNDERREVIEW mechanism, I3.1). */}
      {remind && (
        <Button
          variant="outline"
          icon={Bell}
          onClick={() =>
            toast({
              variant: 'info',
              title: t('compliance.toast.reminderQueued', {
                supplier: entry.supplierName
              }),
              description: t('compliance.toast.reminderDesc')
            })
          }
        >
          {t('compliance.action.remind')}
        </Button>
      )}
    </TableCell>
  </TableRow>
);

export default RegistryRow;
