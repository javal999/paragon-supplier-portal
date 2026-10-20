/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { DeadlinePill, EmptyRow } from '../../rfx/rfxDisplay';

/**
 * The RFP list: one row per event (number, title, status, deadline, terms,
 * "N of M submitted") with ONE row button, "Open", which goes to the event's
 * own page (RFx UX 2A, B-08 and B-09). RFx UX 2G — the separate "Compare
 * proposals" button is gone: the page opens on its Compare tab once a
 * proposal is in, and on Overview before.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split.
 * @type {React.FC<{ items: readonly RfpEventView[] }>}
 */
const RfpEventTable = ({ items }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  /** @param {string} id */
  const pageOf = (id) => `/buyer/rfp/${encodeURIComponent(id)}`;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.rfi.eventTitle')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.deadline')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
          <TableHeaderCell>{''}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {items.map((event) => (
            <TableRow key={event.id} data-testid={`rfp-row-${event.id}`}>
              <TableCell className="align-top">
                <Data className="font-semibold">{event.eventNumber}</Data>
                <div className="text-sm text-text-primary">{event.title}</div>
                <StatusPill variant={event.closed ? 'neutral' : 'info'} className="mt-1">
                  {t(`rfx.status.${event.status}`)}
                </StatusPill>
                {event.confidentiality && (
                  <StatusPill variant="neutral" className="mt-1 ml-1">
                    {t('rfxa.conf.pill')}
                  </StatusPill>
                )}
              </TableCell>
              <TableCell className="align-top whitespace-nowrap">
                <DeadlinePill deadline={event.responseDeadline} done={event.closed} />
              </TableCell>
              <TableCell className="align-top text-sm">
                {t('rfx.rfp.terms', { count: event.terms.length })}
                {event.pricing && (
                  <div className="text-xs text-text-tertiary">
                    {t('rfxa.pricing.summary', {
                      options: t('rfxa.pricing.optionCount', {
                        count: event.pricing.options.length
                      }),
                      points: t('rfxa.pricing.pointCount', {
                        count: event.pricing.quantityPoints.length
                      })
                    })}
                  </div>
                )}
              </TableCell>
              <TableCell className="align-top text-sm" data-testid={`rfp-submitted-${event.id}`}>
                {t('rfx.list.submittedOf', {
                  n: event.responses.length,
                  m: event.invitedSuppliers.length
                })}
              </TableCell>
              <TableCell className="align-top text-right">
                <Button
                  variant="secondary"
                  onClick={() => navigate(pageOf(event.id))}
                  data-testid={`rfp-open-${event.id}`}
                >
                  {t('rfx.row.open')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <EmptyRow colSpan={5} testId="rfp-empty">
              {t('rfx.rfp.empty')}
            </EmptyRow>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default RfpEventTable;
