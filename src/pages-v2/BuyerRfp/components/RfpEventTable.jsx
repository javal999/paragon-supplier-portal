/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
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
 * proposals) with the button that opens or closes its detail below.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   items: readonly RfpEventView[];
 *   openId: string | null;
 *   setOpenId: (id: string | null) => void;
 * }>}
 */
const RfpEventTable = ({ items, openId, setOpenId }) => {
  const { t } = useTranslation();
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
              <TableCell className="align-top text-sm">
                {t('rfx.rfp.proposals', { count: event.responses.length })}
              </TableCell>
              <TableCell className="align-top text-right">
                <Button
                  variant="secondary"
                  onClick={() => setOpenId(openId === event.id ? null : event.id)}
                  data-testid={`rfp-open-${event.id}`}
                >
                  {openId === event.id
                    ? t('rfx.close')
                    : event.status === 'Draft'
                      ? t('rfx.rfp.openEvent')
                      : t('rfx.rfp.compare')}
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
