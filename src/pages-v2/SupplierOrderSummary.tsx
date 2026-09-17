import React, { useMemo } from 'react';
import { useOwnRequirementResponses } from '../services/query/sdcSupplierHooks';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import type { ForesightAnswer } from '../services/data/poResponseProjection';
import OrderSummaryView from './orders/OrderSummaryView';

// Supplier Order summary (REQ-E07-03 BR-03): the same summary over the
// supplier's own POs only. Foresight answers are the supplier's own forecast
// responses: a draft is still awaiting, a disputed one is a gap.
const SupplierOrderSummary: React.FC = () => {
  const { identity } = useCurrentIdentity();
  const responses = useOwnRequirementResponses();
  const answers = useMemo<ForesightAnswer[]>(
    () =>
      (responses.data ?? []).map((r) => ({
        supplierId: r.supplierId,
        materialCode: r.materialCode,
        answer: r.status === 'Disputed' ? 'gap' : r.status === 'Draft' ? 'awaiting' : 'confirmed',
      })),
    [responses.data],
  );
  if (!identity.supplierId) return <NoSupplierIdentity />;
  return <OrderSummaryView persona="supplier" foresightAnswers={answers} />;
};

export default SupplierOrderSummary;
