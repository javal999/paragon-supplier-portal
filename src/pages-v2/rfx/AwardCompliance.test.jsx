// ────────────────────────────────────────────────────────────────────────────
// Material B4 — the compliance pill on the award panel (MR-2 step 4, BR-04)
// and the panel's pre-check agreeing with the verb on one shared fixture
// (AR-10, MR-2 BR-06).
//
// The seeded pills are read off the SAMPLE weekly history
// (`fixtures/updateHistorySample.js`). The agreement specs pin one supplier's
// figure at the read model's seam (`complianceOver`), which the page (through
// the data service) and the verb (through the policy hook) both read.
// ────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { everyVendorQualified } from '@test/everyVendorQualified';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { NO_PERSON } from '@context/noPerson';
import { awardQuantity } from '@services/sourcing/rfqComparison';
/** @import { QueryScope } from '@services/data/types' */
/** @import { AwardLine } from '@services/sourcing/types' */
import BuyerSourcingEvent from '../BuyerSourcingEvent';

const PCT = vi.hoisted(() => /** @type {Map<string, number | null>} */ (new Map()));

vi.mock('@services/transitions/updateCompliance', async (importOriginal) => {
  const actual =
    await /** @type {typeof importOriginal<typeof import('@services/transitions/updateCompliance')>} */ (
      importOriginal
    )();
  return {
    ...actual,
    /** @param {Parameters<typeof actual.complianceOver>} args */
    complianceOver: (...args) => {
      const supplierId = args[1];
      return PCT.has(supplierId)
        ? {
            supplierId,
            pct: /** @type {NonNullable<ReturnType<typeof PCT.get>>} */ (PCT.get(supplierId)),
            weeks: []
          }
        : actual.complianceOver(...args);
    }
  };
});

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
const svc = new MockCommandService();

beforeEach(() => {
  PCT.clear();
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  everyVendorQualified();
});

/** @param {string} rfqId */
const renderEvent = (rfqId) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` }
  );

/**
 * @param {string} itemKey
 * @param {string} supplierId
 */
const pill = (itemKey, supplierId) =>
  screen.findByTestId(`award-compliance-${itemKey}-${supplierId}`);

describe('MR-2 step 4 — the four pill states on seeded events (sample history)', () => {
  it('RFQ-2026-014: sup-007 plain 92%, sup-008 amber 69%, sup-013 and sup-015 "No history"', async () => {
    renderEvent('rfq-014');
    const key = 'PK-PETB-8802';
    expect(await pill(key, 'sup-007')).toHaveAttribute('data-pill', 'plain');
    expect(await pill(key, 'sup-007')).toHaveTextContent('Updates 92%');
    expect(await pill(key, 'sup-008')).toHaveAttribute('data-pill', 'amber');
    expect(await pill(key, 'sup-008')).toHaveTextContent('Updates 69%');
    expect(await pill(key, 'sup-013')).toHaveAttribute('data-pill', 'noHistory');
    expect(await pill(key, 'sup-013')).toHaveTextContent('No history');
    expect(await pill(key, 'sup-015')).toHaveAttribute('data-pill', 'noHistory');
    // the tooltip carries the figure and the 13-week definition
    expect(await pill(key, 'sup-007')).toHaveAttribute(
      'title',
      expect.stringMatching(/92%.*last 13 weekly update cycles.*Amber below 80%, red below 60%/)
    );
  });

  it('RFQ-2026-004: sup-003 red 54%; sup-004 "No history"', async () => {
    renderEvent('rfq-004');
    const form = await screen.findByTestId('award-form');
    const reds = await within(form).findAllByTestId(/^award-compliance-.*-sup-003$/);
    expect(reds[0]).toHaveAttribute('data-pill', 'red');
    expect(reds[0]).toHaveTextContent('Updates 54%');
    expect(
      (await within(form).findAllByTestId(/^award-compliance-.*-sup-004$/))[0]
    ).toHaveAttribute('data-pill', 'noHistory');
  });
});

// ── The shared fixture: Oslo (rfq-021), a split that follows the best score ──

const oslo = () => /** @type {import('../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-021'));
/**
 * @param {string} supplierId
 * @param {string} quotationId
 * @param {number} lineNo
 * @param {number} sharePct
 * @returns {AwardLine}
 */
const lineFor = (supplierId, quotationId, lineNo, sharePct) => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: awardQuantity(
    oslo(),
    /** @type {import('../../services/sourcing/rfqModel').RfqItem} */ (
      /** @type {NonNullable<(ReturnType<typeof oslo>)['items']>} */ (oslo().items).find(
        (i) => i.lineNo === lineNo
      )
    ),
    3_000,
    sharePct
  ),
  awardTierQty: 3_000
});
/** @type {readonly (readonly [number, string, string, number])[]} */
const SPLIT = [
  [1, 'sup-015', 'qt-021a', 70],
  [1, 'sup-013', 'qt-021b', 30],
  [2, 'sup-013', 'qt-021b', 100]
];
const typeSplit = () => {
  for (const [lineNo, supplierId, , v] of SPLIT) {
    fireEvent.change(
      within(screen.getByTestId(`award-input-${lineNo}-${supplierId}`)).getByLabelText(/Share/i),
      {
        target: { value: String(v) }
      }
    );
  }
};
const verbAward = () =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_award',
    entity: 'rfq',
    entityId: 'rfq-021',
    payload: {
      awardedQuotationId: 'qt-021a',
      awardedSupplierId: 'sup-015',
      awardLines: SPLIT.map(([lineNo, sid, qid, v]) => lineFor(sid, qid, lineNo, v))
    }
  });

describe('AR-10 — the panel pre-check and the verb agree on one fixture', () => {
  it('sup-013 at 59%: the panel asks for a reason (red pill, confirm disabled) and the verb refuses without one', async () => {
    PCT.set('sup-013', 59);
    renderEvent('rfq-021');
    expect(await pill('1', 'sup-013')).toHaveAttribute('data-pill', 'red');
    typeSplit();
    expect(screen.getByTestId('award-reason-compliance')).toHaveTextContent(/below 60%/);
    expect(screen.getByTestId('award-reason-compliance')).toHaveTextContent(
      /item 1.*item 2|Item 1.*Item 2/
    );
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    // the reason unlocks it — a flag never blocks by itself (BR-07)
    fireEvent.change(screen.getByLabelText(/reason/i), {
      target: { value: 'Only certified printer.' }
    });
    expect(screen.getByTestId('award-confirm')).not.toBeDisabled();
    const res = await verbAward();
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_REASON_COMPLIANCE_FLAG/);
  });

  it('KNOWN-GOOD twin — sup-013 at 79%: amber pill, no reason asked, and the verb accepts the same lines', async () => {
    PCT.set('sup-013', 79);
    renderEvent('rfq-021');
    expect(await pill('1', 'sup-013')).toHaveAttribute('data-pill', 'amber');
    typeSplit();
    expect(screen.queryByTestId('award-reason-compliance')).not.toBeInTheDocument();
    expect(screen.queryByTestId('award-reason-required')).not.toBeInTheDocument();
    expect(screen.getByTestId('award-confirm')).not.toBeDisabled();
    const res = await verbAward();
    expect(res.status, res.reason).toBe('done');
  });
});
