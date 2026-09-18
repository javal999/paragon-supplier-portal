import React, { useMemo } from 'react';
import { useForecastCommitments } from '../services/query/hooks';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import type { ForesightAnswer } from '../services/data/poResponseProjection';
import { foresightAnswerOf } from '../services/transitions/forecastRules';
import OrderSummaryView from './orders/OrderSummaryView';

// Supplier Order summary (REQ-E07-03 BR-03): the same summary over the
// supplier's own POs only. Foresight answers are the supplier's own forecast
// commitments (REQ-E06-02); a saved draft is still awaiting until submitted.
const SupplierOrderSummary: React.FC = () => {
  const { identity } = useCurrentIdentity();
  const lines = useForecastCommitments();
  const answers = useMemo<ForesightAnswer[]>(
    () =>
      (lines.data?.items ?? []).map((l) => ({
        supplierId: l.supplierId,
        materialCode: l.materialCode,
        answer: foresightAnswerOf(l),
      })),
    [lines.data],
  );
  if (!identity.supplierId) return <NoSupplierIdentity />;
  return <OrderSummaryView persona="supplier" foresightAnswers={answers} />;
};

export default SupplierOrderSummary;
