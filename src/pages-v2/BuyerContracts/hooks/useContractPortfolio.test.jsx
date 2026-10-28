// The contract list's search matches supplier names through `supplierById`.
// The supplier read can land after the contract read, so a search typed in
// between must re-filter once the names arrive, without another keystroke.
// Before 2026-10-28 the `filtered` memo left `supplierById` out of its
// dependency list and kept the empty result until some other input changed.
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockContracts } from '@data/mockContracts';
import { useContractPortfolio } from './useContractPortfolio';

const NOW = '2026-08-31T00:00:00.000Z';
const contract = mockContracts[0];
const SUPPLIER_NAME = 'Zeta Nusantara Kimia';

describe('useContractPortfolio — search by supplier name', () => {
  it('re-filters when the supplier lookup arrives after the search was typed', () => {
    const base = {
      contracts: [contract],
      obligations: [],
      nowIso: NOW,
      group: /** @type {const} */ ('all'),
      selectedTypes: [],
      search: SUPPLIER_NAME.toLowerCase()
    };
    const { result, rerender } = renderHook((props) => useContractPortfolio(props), {
      initialProps: { ...base, supplierById: new Map() }
    });
    expect(result.current.filtered).toEqual([]);

    rerender({
      ...base,
      supplierById: new Map([
        [
          contract.supplierId,
          /** @type {import('@services/data/types').Supplier} */ (
            /** @type {unknown} */ ({ id: contract.supplierId, name: SUPPLIER_NAME })
          )
        ]
      ])
    });
    expect(result.current.filtered.map((c) => c.id)).toEqual([contract.id]);
  });
});
