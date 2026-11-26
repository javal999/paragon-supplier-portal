// ─────────────────────────────────────────────────────────────────────────────
// UCX-P8 (BL-369, UCX-D24) — the supplier's Awaiting exception row names the
// owner and the act beside the agreed status words. The status value and its
// tone stay; the sentence is display only.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { MOCK_ASNS } from '@services/data/mock/fixtures/supplierShipments';
/** @import { ASN } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import AsnRow from './AsnRow';

/** @type {VerbAvailability} */
const HELD = { kind: 'held' };
const ASN_VERBS = { create: HELD, submit: HELD, resolve: HELD, cancel: HELD };

/**
 * @param {ASN['status']} status
 * @returns {ASN}
 */
const asnWith = (status) => /** @type {ASN} */ ({ ...MOCK_ASNS[0], status });

/**
 * The row is a `<tr>`, so it renders inside a table.
 * @param {ASN} asn
 */
const renderRow = (asn) =>
  renderWithProviders(
    <table>
      <tbody>
        <AsnRow
          asn={asn}
          isOpen={false}
          asnVerbs={ASN_VERBS}
          onToggleExpand={() => {}}
          onSubmitAsn={() => {}}
          onCancelAsn={() => {}}
        />
      </tbody>
    </table>
  );

describe('UCX-P8 — the Awaiting exception row names the owner', () => {
  it('reads the ruled sentence beside the status label', () => {
    renderRow(asnWith('Awaiting exception'));
    expect(screen.getByText('Awaiting exception')).toBeTruthy();
    expect(screen.getByTestId(`asn-awaiting-owner-${MOCK_ASNS[0].asnNumber}`)).toHaveTextContent(
      'Awaiting PTI Quality: exception decision'
    );
  });

  it('leaves every other status without the sentence', () => {
    renderRow(asnWith('Submitted'));
    expect(screen.queryByTestId(`asn-awaiting-owner-${MOCK_ASNS[0].asnNumber}`)).toBeNull();
    expect(screen.queryByText('Awaiting PTI Quality: exception decision')).toBeNull();
  });
});
