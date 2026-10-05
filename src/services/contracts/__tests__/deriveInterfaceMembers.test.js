// ─────────────────────────────────────────────────────────────────────────────
// `deriveInterfaceMembers` reads both forms (frontend-standard Phase 4).
//
// The C1 and C3 pins read `CommandTarget`, `TransitionEvent` and `AuditSink`
// through this derivation. After the TS → JS conversion those are JSDoc
// typedefs, not interfaces. This spec holds the known-GOOD and known-BAD inputs
// in ONE synthetic program (rule 4, §40e): the TS interface and its JSDoc twin
// must yield the SAME split, and an undeclared name must still THROW.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { buildProgramFromSources } from '@lib/storedFieldGate/derive';
import { deriveInterfaceMembers } from './deriveC1Surface';

const program = buildProgramFromSources({
  '/ts.ts': `export interface Target {
  readState(id: string): string | null;
  create?(payload: unknown): { entityId: string };
  requireOwner?: boolean;
  label: string;
}
`,
  '/js.js': `/**
 * @typedef {object} Target
 * @property {(id: string) => string | null} readState
 * @property {(payload: unknown) => { entityId: string }} [create]
 * @property {boolean} [requireOwner]
 * @property {string} label
 */
/** @typedef {{ name: string }} Base */
/** @typedef {Base & { extra: number, run(): void }} Extended */
export const x = 1;
`
});

describe('deriveInterfaceMembers — TS interface and JSDoc typedef agree', () => {
  it('KNOWN-GOOD — the TS interface splits methods from properties', () => {
    expect(deriveInterfaceMembers(program, '/ts.ts', 'Target')).toEqual({
      methods: ['readState', 'create'],
      properties: ['requireOwner', 'label']
    });
  });

  it('KNOWN-GOOD — the JSDoc typedef yields the SAME split', () => {
    expect(deriveInterfaceMembers(program, '/js.js', 'Target')).toEqual(
      deriveInterfaceMembers(program, '/ts.ts', 'Target')
    );
  });

  it('a type-literal typedef reads only its OWN members, as an interface ignores `extends`', () => {
    expect(deriveInterfaceMembers(program, '/js.js', 'Extended')).toEqual({
      methods: ['run'],
      properties: ['extra']
    });
  });

  it('KNOWN-BAD — an undeclared name THROWS in either language, never returns empty', () => {
    expect(() => deriveInterfaceMembers(program, '/js.js', 'Missing')).toThrow(/not declared in/);
    expect(() => deriveInterfaceMembers(program, '/ts.ts', 'Missing')).toThrow(/not declared in/);
  });
});
