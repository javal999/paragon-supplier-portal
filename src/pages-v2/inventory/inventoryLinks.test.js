import { describe, expect, it } from 'vitest';
import { callOffHref, poRequestHref, stockSimulationHref } from './inventoryLinks';

describe('inventoryLinks — one address per action on a supplier × material pair', () => {
  it('builds the stock simulation, call-off and PO request addresses', () => {
    expect(stockSimulationHref('sup-007', 'PK-PETB-8802')).toBe(
      '/buyer/stock-simulation?q=PK-PETB-8802&supplier=sup-007'
    );
    expect(callOffHref('sup-002', 'RM-EMUL-9410')).toBe(
      '/buyer/call-offs?newFor=sup-002&material=RM-EMUL-9410'
    );
    expect(poRequestHref('sup-007', 'PK-PETB-8802')).toBe(
      '/buyer/purchase-requisition?new=1&supplier=sup-007&material=PK-PETB-8802'
    );
    // BL-292 — the stock simulation passes the shortfall to pre-fill the draft
    // PR; every other caller omits it and the address is unchanged.
    expect(poRequestHref('sup-007', 'PK-PETB-8802', 121000)).toBe(
      '/buyer/purchase-requisition?new=1&supplier=sup-007&material=PK-PETB-8802&qty=121000'
    );
    expect(poRequestHref('sup-007', 'PK-PETB-8802', 0)).toBe(
      '/buyer/purchase-requisition?new=1&supplier=sup-007&material=PK-PETB-8802'
    );
  });

  it('encodes each value, so a code with reserved characters stays one parameter', () => {
    expect(poRequestHref('sup a&b', 'M/1?x=2')).toBe(
      '/buyer/purchase-requisition?new=1&supplier=sup%20a%26b&material=M%2F1%3Fx%3D2'
    );
    const url = new URL(callOffHref('sup a&b', 'M/1?x=2'), 'http://x');
    expect(url.searchParams.get('newFor')).toBe('sup a&b');
    expect(url.searchParams.get('material')).toBe('M/1?x=2');
    expect(new URL(stockSimulationHref('s&1', 'm#2'), 'http://x').searchParams.get('q')).toBe(
      'm#2'
    );
  });
});
