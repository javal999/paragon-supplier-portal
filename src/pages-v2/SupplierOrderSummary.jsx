/** @import React from 'react' */
import { useMemo } from 'react';
import { useForecastCommitments, useSupplierInvoices } from '@services/query/hooks';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
/** @import { ForesightAnswer } from '@services/data/poResponseProjection' */
import { foresightAnswerOf } from '@services/transitions/forecastRules';
/** @import { SummaryInvoice } from './orders/OrderSummaryView' */
import OrderSummaryView from './orders/OrderSummaryView';

// Supplier Order summary (REQ-E07-03 BR-06): the same summary over the
// supplier's own POs only. Foresight answers are the supplier's own forecast
// commitments (REQ-E06-02); a saved draft is still awaiting until submitted.
//
// The invoice column reads the SUPPLIER's own invoice population, which keeps
// its drafts — so the count equals what `/supplier/invoices` lists for that PO
// (BR-09 / AC-10), even though that population differs from PTI's.
/** @type {React.FC} */
const SupplierOrderSummary = () => {
  const { identity } = useCurrentIdentity();
  const lines = useForecastCommitments();
  const invoicesQuery = useSupplierInvoices();
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
  if (!identity.supplierId) return <NoSupplierIdentity />;
  return <OrderSummaryView persona="supplier" foresightAnswers={answers} invoices={invoices} />;
};

export default SupplierOrderSummary;
