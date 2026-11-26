// ─────────────────────────────────────────────────────────────────────────────
// UCX-P6 (BL-367) · UCX-D19 — the standing DA agreement, derived from the
// publication history. The date is the old run's start (how long it has
// stood), the quantity is the newest recorded remainder, and a publish that
// records the pair without agreeing revokes it.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { askStateOf, standingAgreementOf, standingAgreements } from './daAgreementRules';

/** @import { DemandAnticipationPublication } from './demandAnticipationRules' */

/**
 * One publication with the given remainder per pair.
 * @param {string} id
 * @param {string} publishedAt
 * @param {readonly (readonly [string, string, number])[]} pairs
 * @param {readonly string[]} agreed
 * @returns {DemandAnticipationPublication}
 */
const pub = (id, publishedAt, pairs, agreed) =>
  /** @type {DemandAnticipationPublication} */ (
    /** @type {unknown} */ ({
      id,
      publishedAt,
      actor: 'UNATTRIBUTED: NO_PERSON_IN_SESSION',
      source: 'publish',
      planningWeek: '2026-09-07',
      agreedFirstOutside: agreed,
      entries: pairs.map(([supplierId, materialCode, remainder]) => ({
        supplierId,
        materialCode,
        figure: { value: { remainder } }
      }))
    })
  );

const KEY = 'sup-002|RM-EMUL-9410';

describe('standingAgreementOf — the agreement stands until the planner changes it', () => {
  it('is null with no publication that records the pair', () => {
    expect(standingAgreementOf([], 'sup-002', 'RM-EMUL-9410')).toBeNull();
    expect(
      standingAgreementOf(
        [pub('p1', '2026-08-31T03:00:00Z', [['sup-005', 'X', 5]], [])],
        'sup-002',
        'RM-EMUL-9410'
      )
    ).toBeNull();
  });

  it('is null when the newest recording of the pair does not agree', () => {
    const publications = [
      pub('p1', '2026-08-31T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 4_000]], [KEY]),
      pub('p2', '2026-09-07T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 4_000]], [])
    ];
    expect(standingAgreementOf(publications, 'sup-002', 'RM-EMUL-9410')).toBeNull();
  });

  it('keeps the FIRST date of an unbroken run and the newest quantity', () => {
    const publications = [
      pub('p1', '2026-08-24T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 4_000]], []),
      pub('p2', '2026-08-31T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 4_000]], [KEY]),
      pub('p3', '2026-09-07T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 5_000]], [KEY])
    ];
    expect(standingAgreementOf(publications, 'sup-002', 'RM-EMUL-9410')).toEqual({
      qty: 5_000,
      agreedAt: '2026-08-31T03:00:00Z',
      publicationId: 'p2'
    });
  });

  it('skips a publication that does not record the pair, and stops at one that records it unagreed', () => {
    const publications = [
      pub('p1', '2026-08-24T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 4_000]], [KEY]),
      pub('p2', '2026-08-31T03:00:00Z', [['sup-005', 'X', 5]], []),
      pub('p3', '2026-09-07T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 4_000]], [KEY])
    ];
    expect(standingAgreementOf(publications, 'sup-002', 'RM-EMUL-9410')?.agreedAt).toBe(
      '2026-08-24T03:00:00Z'
    );
    const revoked = [
      ...publications,
      pub('p4', '2026-09-14T03:00:00Z', [['sup-002', 'RM-EMUL-9410', 4_000]], [])
    ];
    expect(standingAgreementOf(revoked, 'sup-002', 'RM-EMUL-9410')).toBeNull();
  });
});

describe('standingAgreements — every pair with a standing agreement', () => {
  it('keys each pair by supplier and material', () => {
    const publications = [
      pub(
        'p1',
        '2026-08-31T03:00:00Z',
        [
          ['sup-002', 'RM-EMUL-9410', 4_000],
          ['sup-005', 'RM-EMUL-9410', 1_000]
        ],
        [KEY]
      )
    ];
    const all = standingAgreements(publications);
    expect([...all.keys()]).toEqual([KEY]);
    expect(all.get(KEY)?.qty).toBe(4_000);
  });
});

describe('askStateOf — new, changed, standing', () => {
  it('asks about a row with no agreement and about a row whose quantity moved', () => {
    const agreement = { qty: 4_000, agreedAt: '2026-08-31T03:00:00Z', publicationId: 'p2' };
    expect(askStateOf({ agreement: null, remainder: 4_000 })).toBe('new');
    expect(askStateOf({ agreement, remainder: 5_000 })).toBe('changed');
    expect(askStateOf({ agreement, remainder: 4_000 })).toBe('standing');
  });
});
