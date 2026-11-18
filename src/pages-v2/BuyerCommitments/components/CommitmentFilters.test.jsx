// ─────────────────────────────────────────────────────────────────────────────
// BL-79 — the second of the two entry links that used to open the retired
// hidden chase page. The first (the buyer Home "to chase" task) is pinned in
// `pages-v2/home/iaTaskLinks.test.jsx`; this pins the one in the commitment
// exception filters.
//
// The destination is the IA P-05 successor — the Comm Hub's follow-up tab —
// and it is pinned HERE because `legacyRedirects.test.jsx` only forbids a
// literal `/buyer/chase`: a link re-pointed somewhere else valid would pass
// that guard while sending the planner to the wrong list.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import CommitmentFilters from './CommitmentFilters';

/** Every filter at its empty value. */
const props = {
  activeStream: /** @type {const} */ ('packaging'),
  onStreamChange: () => {},
  supplier: '',
  onSupplierChange: () => {},
  suppliers: [],
  material: '',
  onMaterialChange: () => {},
  materials: [],
  reasons: [],
  onReasonsChange: () => {},
  reasonOptions: []
};

describe('BL-79 — the exceptions filter links to the supplier follow-up list', () => {
  it('opens the Comm Hub follow-up tab, and no link names the retired /buyer/chase', () => {
    renderWithProviders(<CommitmentFilters {...props} />, {
      route: '/buyer/collaboration?tab=gaps'
    });
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/buyer/comm-hub?tab=follow-up');
    expect(hrefs).not.toContain('/buyer/chase');
  });
});
