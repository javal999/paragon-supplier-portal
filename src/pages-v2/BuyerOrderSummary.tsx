import React, { useMemo } from 'react';
import { useForecastCommitments } from '../services/query/hooks';
import type { ForesightAnswer } from '../services/data/poResponseProjection';
import { foresightAnswerOf } from '../services/transitions/forecastRules';
import OrderSummaryView from './orders/OrderSummaryView';

// PTI Order summary (REQ-E07-03). Foresight answers come from the forecast
// commitments (REQ-E06-02): each current forecast line and where its
// commitment stands. PTI never reads a supplier's draft.
const BuyerOrderSummary: React.FC = () => {
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
  return <OrderSummaryView persona="buyer" foresightAnswers={answers} />;
};

export default BuyerOrderSummary;
