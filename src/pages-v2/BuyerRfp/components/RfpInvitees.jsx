/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { formatDate } from '@lib/format';
import { EligibilityMarker } from '../../rfx/eligibilityDisplay';
import { DeadlinePill, OtifOrNoHistory, ResponseStatePill } from '../../rfx/rfxDisplay';

/**
 * The invited suppliers: OTIF, own deadline, response state, and — where the RFP
 * asks for them — when each accepted the confidentiality terms and the T&C.
 * RFx UX 2A (B-10) — titled "Invited suppliers": on a live event nobody can be
 * added here ("Invite suppliers" is the wizard's step, where they can).
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split.
 * @type {React.FC<{ event: RfpEventView }>}
 */
const RfpInvitees = ({ event }) => {
  const { t } = useTranslation();
  /**
   * @param {string | null} at
   * @param {string} testId
   */
  const acceptedCell = (at, testId) => (
    <TableCell data-testid={testId}>
      {at ? (
        <Data>{formatDate(at)}</Data>
      ) : (
        <span className="text-xs text-text-tertiary">{t('rfxa.conf.notYet')}</span>
      )}
    </TableCell>
  );
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <div
        className="px-4 py-3 border-b border-border-subtle text-sm font-semibold text-text-primary"
        data-testid={`rfp-invitees-title-${event.id}`}
      >
        {t('rfx.invited.title')}
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.invite.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.invite.col.otif')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.deadline.own')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
          {event.confidentiality && <TableHeaderCell>{t('rfxa.conf.col')}</TableHeaderCell>}
          {event.termsDocument && <TableHeaderCell>{t('rfxa.tc.col')}</TableHeaderCell>}
        </TableHeader>
        <tbody>
          {event.invitedSuppliers.map((invitee) => (
            <TableRow key={invitee.supplierId} data-testid={`rfp-invitee-${invitee.supplierId}`}>
              <TableCell>
                {invitee.supplierName}
                {/* BL-147 — Material G2's marker: below the level for this event's type, today. */}
                <div className="mt-1">
                  <EligibilityMarker
                    eligibility={invitee.eligibility}
                    testId={`rfp-invitee-elig-${invitee.supplierId}`}
                  />
                </div>
              </TableCell>
              <TableCell>
                <OtifOrNoHistory otif={invitee.otif} testId={`rfp-otif-${invitee.supplierId}`} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <DeadlinePill
                  deadline={invitee.deadline}
                  done={invitee.responseState === 'submitted'}
                />
              </TableCell>
              <TableCell>
                <ResponseStatePill state={invitee.responseState} />
              </TableCell>
              {event.confidentiality &&
                acceptedCell(
                  invitee.confidentialityAcceptedAt,
                  `rfp-accepted-${event.id}-${invitee.supplierId}`
                )}
              {event.termsDocument &&
                acceptedCell(
                  invitee.termsAcceptedAt,
                  `rfp-tc-accepted-${event.id}-${invitee.supplierId}`
                )}
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default RfpInvitees;
