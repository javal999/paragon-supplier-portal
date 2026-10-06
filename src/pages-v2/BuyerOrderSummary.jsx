/** @import React from 'react' */
import { useMemo } from 'react';
import { useBuyerInvoices, useForecastCommitments } from '@services/query/hooks';
/** @import { ForesightAnswer } from '@services/data/poResponseProjection' */
import { foresightAnswerOf } from '@services/transitions/forecastRules';
/** @import { SummaryInvoice } from './orders/OrderSummaryView' */
import OrderSummaryView from './orders/OrderSummaryView';

// PTI Order summary (REQ-E07-03). Foresight answers come from the forecast
// commitments (REQ-E06-02): each current forecast line and where its
// commitment stands. PTI never reads a supplier's draft.
//
// The invoice column reads PTI's OWN invoice population (REQ-E07-07): the buyer
// read already drops drafts, so the count on the row equals what
// `/buyer/invoices` lists for that PO (BR-09 / AC-10) without this page
// re-deciding which invoices exist.
/** @type {React.FC} */
const BuyerOrderSummary = () => {
  const lines = useForecastCommitments();
  const invoicesQuery = useBuyerInvoices();
  const answers = /** @type {ForesightAnswer[]} */ (
    useMemo(
      () =>
        (lines.data?.items ?? []).map((l) => ({
          supplierId: l.supplierId,
          materialCode: l.materialCode,
          answer: foresightAnswerOf(l)
        })),
      [lines.data]
    )
  );
  const invoices = /** @type {SummaryInvoice[]} */ (
    useMemo(
      () =>
        (invoicesQuery.data?.items ?? []).map((i) => ({
          poNumber: i.poNumber,
          lines: i.lines,
          returnReason: i.returnReason
        })),
      [invoicesQuery.data]
    )
  );
  return <OrderSummaryView persona="buyer" foresightAnswers={answers} invoices={invoices} />;
};

export default BuyerOrderSummary;
