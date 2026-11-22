import { beforeEach, describe, expect, it } from 'vitest';
import { NO_PERSON } from '@context/noPerson';
import {
  NOTICE_READS_STORAGE_KEY,
  markRead,
  readSeat,
  resetNoticeReads,
  seatKeyFor
} from './noticeReadsStore';

// BL-213 — the read-state store behind the supplier bell. The four properties
// the bell depends on: a mark survives a reload, seats are isolated, a notice
// keeps its id across a refetch (the caller's id is opaque here), and a corrupt
// value is reported rather than thrown.

const SUP_A = 'supplier:sup-001';
const SUP_B = 'supplier:sup-002';

/** @param {Record<string, unknown>} value */
const writeStore = (value) => localStorage.setItem(NOTICE_READS_STORAGE_KEY, JSON.stringify(value));

beforeEach(() => {
  resetNoticeReads();
});

describe('noticeReadsStore — absent, ok and unreadable are different facts', () => {
  it('reports an absent store, not a corrupt one', () => {
    expect(readSeat(SUP_A)).toEqual({ ids: new Set(), status: 'absent' });
  });

  it('reports ok with an empty set once the envelope exists for another seat', () => {
    markRead(SUP_B, ['rfq:rfq-1:awarded']);
    expect(readSeat(SUP_A)).toEqual({ ids: new Set(), status: 'ok' });
  });

  it('reports unparseable storage as unreadable, not as empty success', () => {
    localStorage.setItem(NOTICE_READS_STORAGE_KEY, '{not json');
    expect(readSeat(SUP_A)).toEqual({ ids: new Set(), status: 'unreadable' });
  });

  it('reports a wrong envelope version as unreadable', () => {
    writeStore({ v: 99, seats: { [SUP_A]: ['rfq:rfq-1:awarded'] } });
    expect(readSeat(SUP_A).status).toBe('unreadable');
  });

  it('reports a bad seat row as unreadable and keeps no ids from it', () => {
    writeStore({ v: 1, seats: { [SUP_A]: ['rfq:rfq-1:awarded'], [SUP_B]: 'not-an-array' } });
    expect(readSeat(SUP_B)).toEqual({ ids: new Set(), status: 'unreadable' });
  });

  it('never throws on a corrupt store, and a mark replaces it with a clean one', () => {
    localStorage.setItem(NOTICE_READS_STORAGE_KEY, 'garbage');
    expect(() => markRead(SUP_A, ['rfp:rfp-1:withdrawn'])).not.toThrow();
    expect(readSeat(SUP_A)).toEqual({
      ids: new Set(['rfp:rfp-1:withdrawn']),
      status: 'ok'
    });
  });
});

describe('noticeReadsStore — mark, reload and per-seat isolation', () => {
  it('marks ids and unions a second mark rather than replacing the first', () => {
    markRead(SUP_A, ['rfq:rfq-1:awarded']);
    markRead(SUP_A, ['rfq:rfq-2:withdrawn', 'rfq:rfq-1:awarded']);
    expect(readSeat(SUP_A).ids).toEqual(new Set(['rfq:rfq-1:awarded', 'rfq:rfq-2:withdrawn']));
  });

  it('persists across a reload: the value on disk is what the next read parses', () => {
    markRead(SUP_A, ['rfq:rfq-1:awarded']);
    // A reload starts from localStorage, not from a module cache; assert the
    // stored bytes directly, then read through the public API.
    expect(
      JSON.parse(/** @type {string} */ (localStorage.getItem(NOTICE_READS_STORAGE_KEY)))
    ).toEqual({ v: 1, seats: { [SUP_A]: ['rfq:rfq-1:awarded'] } });
    expect(readSeat(SUP_A).ids.has('rfq:rfq-1:awarded')).toBe(true);
  });

  it('isolates seats: one supplier cannot clear, or read, another supplier’s mark', () => {
    markRead(SUP_A, ['rfq:rfq-1:awarded']);
    expect(readSeat(SUP_B).ids).toEqual(new Set());
    markRead(SUP_B, ['rfq:rfq-9:awarded']);
    expect(readSeat(SUP_A).ids).toEqual(new Set(['rfq:rfq-1:awarded']));
  });

  it('gives the buyer/PTI seat its own row', () => {
    markRead('buyer', ['x:y:awarded']);
    expect(readSeat(SUP_A).ids).toEqual(new Set());
    expect(readSeat('buyer').ids).toEqual(new Set(['x:y:awarded']));
  });

  it('ignores empty and non-string ids instead of writing junk', () => {
    markRead(SUP_A, /** @type {string[]} */ (/** @type {unknown} */ (['', null, 7])));
    expect(readSeat(SUP_A).status).toBe('absent');
  });
});

describe('noticeReadsStore — seat keys', () => {
  /**
   * @param {'buyer' | 'supplier'} personaType
   * @param {string | null} supplierId
   * @returns {import('@context/CurrentIdentityContext').CurrentIdentity}
   */
  const seat = (personaType, supplierId) => ({
    personaType,
    supplierId,
    supplierName: supplierId,
    businessRoles: [],
    actor: NO_PERSON
  });

  it('keys a supplier by its supplierId and the PTI seat as buyer', () => {
    expect(seatKeyFor(seat('supplier', 'sup-007'))).toBe('supplier:sup-007');
    expect(seatKeyFor(seat('buyer', null))).toBe('buyer');
  });

  it('never puts a supplier without an id in the buyer row', () => {
    expect(seatKeyFor(seat('supplier', null))).toBe('supplier:unknown');
  });
});
