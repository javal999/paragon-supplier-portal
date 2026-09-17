import React, { useMemo } from 'react';
import { useConsolidationRows } from '../services/query/sdcBuyerHooks';
import type { ForesightAnswer } from '../services/data/poResponseProjection';
import OrderSummaryView from './orders/OrderSummaryView';

// PTI Order summary (REQ-E07-03). Foresight answers come from the forecast
// consolidation: each published line and how its supplier answered it.
const BuyerOrderSummary: React.FC = () => {
  const consolidation = useConsolidationRows();
  const answers = useMemo<ForesightAnswer[]>(
    () =>
      (consolidation.data ?? []).map((row) => ({
        supplierId: row.line.supplierId,
        materialCode: row.line.materialCode,
        answer:
          row.state.kind === 'short'
            ? 'gap'
            : row.state.kind === 'confirmed-full' || row.state.kind === 'acknowledged'
              ? 'confirmed'
              : 'awaiting',
      })),
    [consolidation.data],
  );
  return <OrderSummaryView persona="buyer" foresightAnswers={answers} />;
};

export default BuyerOrderSummary;
