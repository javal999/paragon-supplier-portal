// ────────────────────────────────────────────────────────────────────────────
// CE-11i / NR-1 BR-10 — `stampDocuments`, the ONE place that decides WHEN a
// response file arrived and WHO sent it. Pure, so every rule is probed here
// both ways: a new id is stamped with the session's actor and the store's
// clock; a carried id keeps the stamp it was stored with; a payload's own
// `uploadedBy` / `uploadedAt` is never trusted.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { stampDocuments } from './rfxDocumentRules';
import { NO_PERSON } from '../../context/noPerson';
import type { ActorAttribution } from '../../lib/enforcement';
import type { ResponseDocument } from '../sourcing/types';
import type { AttachmentMeta } from '../attachments/sessionAttachments';

const file = (name: string): AttachmentMeta => ({
  id: `f-${name}`,
  name,
  size: 1_000,
  type: 'application/pdf',
  addedAt: '2026-09-20T00:00:00.000Z',
});

// A test-only resolved actor, so "the session's actor" is distinguishable from
// every other actor in the file. Shipped code still constructs none (the
// `simUsrNamespace` tripwire), and this id is outside the reserved
// demo-person namespace (C10 §6.3).
const SESSION: ActorAttribution = { kind: 'RESOLVED', person: { personId: 'p-stamp-test', displayName: 'Session person' } };
const FORGED: ActorAttribution = { kind: 'RESOLVED', person: { personId: 'p-forged', displayName: 'Forged' } };

const NOW = '2026-09-28T03:00:00.000Z';
const EARLIER = '2026-09-21T01:00:00.000Z';

const held = (over: Partial<ResponseDocument> = {}): ResponseDocument => ({
  id: 'd-held',
  attachment: file('held.pdf'),
  uploadedAt: EARLIER,
  uploadedBy: NO_PERSON,
  ...over,
});

describe('CE-11i — a NEW document is stamped with the session actor and the store clock', () => {
  it('a document whose id the store does not hold gets `uploadedBy` = actor and `uploadedAt` = now', () => {
    const [out] = stampDocuments([{ id: 'd-new', attachment: file('new.pdf') }], [], NOW, SESSION);
    expect(out!.uploadedBy).toEqual(SESSION);
    expect(out!.uploadedAt).toBe(NOW);
  });

  it('the UNATTRIBUTED seat actor is stamped as the claim it is, not dropped', () => {
    const [out] = stampDocuments([{ id: 'd-new', attachment: file('new.pdf') }], [], NOW, NO_PERSON);
    expect(out!.uploadedBy).toEqual({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
  });

  it('a new FILE under a held id is a new upload: it is stamped afresh', () => {
    const [out] = stampDocuments([{ id: 'd-held', attachment: file('replacement.pdf') }], [held()], NOW, SESSION);
    expect(out!.uploadedBy).toEqual(SESSION);
    expect(out!.uploadedAt).toBe(NOW);
  });
});

describe('CE-11i — a CARRIED document keeps its original stamp', () => {
  it('same id, same file: `uploadedBy` and `uploadedAt` are the stored ones, not this call\'s', () => {
    const [out] = stampDocuments([{ id: 'd-held', attachment: file('held.pdf') }], [held()], NOW, SESSION);
    expect(out!.uploadedBy).toEqual(NO_PERSON);
    expect(out!.uploadedAt).toBe(EARLIER);
  });

  it('carried and new in one call: each keeps or gets its own stamp', () => {
    const out = stampDocuments(
      [
        { id: 'd-held', attachment: file('held.pdf') },
        { id: 'd-new', attachment: file('new.pdf') },
      ],
      [held()],
      NOW,
      SESSION,
    );
    expect(out.map((d) => [d.id, d.uploadedBy, d.uploadedAt])).toEqual([
      ['d-held', NO_PERSON, EARLIER],
      ['d-new', SESSION, NOW],
    ]);
  });

  it('a carried document stored BEFORE the stamp existed stays unrecorded — never back-filled', () => {
    const legacy: ResponseDocument = { id: 'd-old', attachment: file('old.pdf'), uploadedAt: EARLIER };
    const [out] = stampDocuments([{ id: 'd-old', attachment: file('old.pdf') }], [legacy], NOW, SESSION);
    expect('uploadedBy' in out!).toBe(false);
    expect(out!.uploadedAt).toBe(EARLIER);
  });
});

describe('CE-11i — a payload\'s own attribution is never trusted (C10 §6.2)', () => {
  it('KNOWN-BAD — a NEW document claiming a forged uploader and a backdated time is overwritten', () => {
    const [out] = stampDocuments(
      [{ id: 'd-new', attachment: file('new.pdf'), uploadedBy: FORGED, uploadedAt: '1999-01-01T00:00:00.000Z' }],
      [],
      NOW,
      SESSION,
    );
    expect(out!.uploadedBy).toEqual(SESSION);
    expect(out!.uploadedAt).toBe(NOW);
    expect(JSON.stringify(out)).not.toContain('p-forged');
  });

  it('KNOWN-BAD — a CARRIED document claiming a different uploader keeps the STORED one', () => {
    const [out] = stampDocuments(
      [{ id: 'd-held', attachment: file('held.pdf'), uploadedBy: FORGED, uploadedAt: NOW }],
      [held()],
      NOW,
      SESSION,
    );
    expect(out!.uploadedBy).toEqual(NO_PERSON);
    expect(out!.uploadedAt).toBe(EARLIER);
  });

  it('KNOWN-BAD — a carried LEGACY document cannot acquire an uploader by claiming one', () => {
    const legacy: ResponseDocument = { id: 'd-old', attachment: file('old.pdf'), uploadedAt: EARLIER };
    const [out] = stampDocuments(
      [{ id: 'd-old', attachment: file('old.pdf'), uploadedBy: FORGED }],
      [legacy],
      NOW,
      SESSION,
    );
    expect('uploadedBy' in out!).toBe(false);
  });

  it('KNOWN-GOOD — an echo of the stored stamp (what a carry-forward screen sends) passes through unchanged', () => {
    const [out] = stampDocuments([{ ...held() }], [held()], NOW, SESSION);
    expect(out).toEqual(held());
  });
});
