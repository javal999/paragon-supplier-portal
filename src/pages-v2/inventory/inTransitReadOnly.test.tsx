// BL-83 — the in-transit read-out says its quantity and its words as two
// words. A CSS margin alone separated them on screen, so the text itself (what
// a screen reader reads, and what copy-paste takes) was "0nothing in transit".

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import type { InventoryPosition } from '../../services/data/types';
import { InTransitReadOnly } from './inventoryDisplay';

const position = (incoming: InventoryPosition['incoming']): InventoryPosition =>
  ({ uom: 'PCS', incoming }) as unknown as InventoryPosition;

describe('BL-83 — the in-transit read-out keeps a space between the number and its words', () => {
  it('nothing in transit reads "0 nothing in transit"', () => {
    renderWithProviders(<InTransitReadOnly position={position([])} />);
    const box = screen.getByTestId('in-transit-readonly');
    expect(box.textContent).toContain('0 nothing in transit');
    expect(box.textContent).not.toContain('0nothing');
  });

  it('a quantity with its sources reads "<qty> from <refs>"', () => {
    renderWithProviders(
      <InTransitReadOnly
        position={position([
          { source: 'asn', quantity: 1200, reference: 'ASN-2026-031' },
        ] as unknown as InventoryPosition['incoming'])}
      />,
    );
    expect(screen.getByTestId('in-transit-readonly').textContent).toContain('1,200 from ASN-2026-031');
  });
});
