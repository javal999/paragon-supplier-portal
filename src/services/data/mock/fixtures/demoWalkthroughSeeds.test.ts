// ────────────────────────────────────────────────────────────────────────────
// The demo walkthrough's starting points, pinned by NAME through a VALUE.
//
// BL-74 — every receipt whose status is an inspection result (Approved,
// Partially Approved, Rejected) stores the result its own lines roll up to
// (`deriveHeaderDisposition`, the rule the header verb and the supplier's
// "Quality result" both read). gr-015 stored "Partially Approved" over one
// fully accepted line, so one receipt showed both answers. A later state
// (Posted to SAP, Quality Hold) is a lifecycle state, not a result, and is not
// compared.
//
// BL-35 — the supplier the demo signs in as (sup-007, `identitySources.js`)
// has an Open RFI and an Open RFP it has not answered, read through its OWN
// scope, so the supplier walkthrough can start from "a request waiting for
// you". They were added in 9651e4a; this pins them so a fixture edit cannot
// take the starting point away in silence.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { mockGoodsReceipts } from '@data/mockGoodsReceipts';
import { deriveHeaderDisposition } from '../../../transitions';
import { MockProcurementService } from '../MockProcurementService';
import { PERSONA_SYSTEM_ROLES } from '../../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import type { QueryScope } from '../../types';
import type { RfxInviteeView } from '../../../sourcing/views';

const RESULT_STATES = ['Approved', 'Partially Approved', 'Rejected'] as const;

describe('BL-74 — a receipt\'s stored result is the result its lines roll up to', () => {
  const results = mockGoodsReceipts.filter((gr) => (RESULT_STATES as readonly string[]).includes(gr.status));

  it('population control: the receipts the rule is about are in the set', () => {
    const ids = results.map((gr) => gr.id);
    expect(ids).toContain('gr-015');
    expect(ids).toContain('gr-016');
    // A lifecycle state after the result is not compared.
    expect(ids).not.toContain('gr-005');
  });

  it('gr-015 reads Approved (its one line accepted all it received); gr-016 stays Partially Approved', () => {
    const status = (id: string) => mockGoodsReceipts.find((gr) => gr.id === id)!.status;
    expect(status('gr-015')).toBe('Approved');
    expect(status('gr-016')).toBe('Partially Approved');
  });

  it('no receipt stores a result its lines contradict', () => {
    const contradicting = results
      .filter((gr) => gr.status !== deriveHeaderDisposition(gr.inspectionResults))
      .map((gr) => `${gr.id}: stored ${gr.status}, lines say ${deriveHeaderDisposition(gr.inspectionResults)}`);
    expect(contradicting).toEqual([]);
  });
});

describe('BL-35 — the demo supplier has an RFI and an RFP waiting for its answer', () => {
  const reads = new MockProcurementService();
  const sup007: QueryScope = {
    personaType: 'supplier',
    supplierId: 'sup-007',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    actor: NO_PERSON,
  };
  /** Open events whose invitee row for sup-007 says it has not submitted. */
  const waiting = (events: readonly { id: string; status: string; invitedSuppliers: readonly RfxInviteeView[] }[]) =>
    events
      .filter((e) => e.status === 'Open')
      .filter((e) => e.invitedSuppliers.some((i) => i.supplierId === 'sup-007' && i.responseState !== 'submitted'))
      .map((e) => e.id);

  it('RFI-2026-002 is Open and unanswered by sup-007; RFI-2026-001, which it answered, is not', async () => {
    const rfis = (await reads.getRfiEvents(sup007)).items;
    expect(waiting(rfis)).toContain('rfi-002');
    expect(waiting(rfis)).not.toContain('rfi-001');
  });

  it('RFP-2026-003 is Open and unanswered by sup-007; RFP-2026-002, which it answered, is not', async () => {
    const rfps = (await reads.getRfpEvents(sup007)).items;
    expect(waiting(rfps)).toContain('rfp-003');
    expect(waiting(rfps)).not.toContain('rfp-002');
  });
});
