import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import { EMPTY_PRICING, RfpPricingComparison } from './RfpPricing';

describe('RfpPricingComparison — an RFP with no responses', () => {
  // `rfx.rfp.empty` ("No proposal request yet.") describes an empty RFP LIST;
  // this panel is one RFP that has had no proposals yet (same defect #224
  // fixed in BuyerRfp's comparison).
  it('says no proposals were received, not that no request exists', () => {
    renderWithProviders(
      <RfpPricingComparison
        request={EMPTY_PRICING}
        currency="IDR"
        responses={[]}
        testId="rfp-pricing-compare"
      />
    );
    expect(screen.getByText('No proposals received yet.')).toBeInTheDocument();
    expect(screen.queryByText('No proposal request yet.')).toBeNull();
  });
});
