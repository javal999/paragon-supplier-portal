// ────────────────────────────────────────────────────────────────────────────
// S-01 (RFx UX 2026-10) — the response draft kept in this browser, and the
// leave guard that fires only when leaving would lose work. Each behaviour has
// a case where it holds and a case where it does not.
// ────────────────────────────────────────────────────────────────────────────

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DRAFT_KEY_PREFIX,
  draftKey,
  formatSavedTime,
  readDraft,
  restoredIds,
  staleDraftIds,
  useAutosave,
  useLeaveGuard,
  withoutIds,
  writeDraft
} from './responseDraft';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the kept draft', () => {
  it('is written under a supplier-scoped key and read back whole', () => {
    const key = draftKey('rfq', 'sup-007', 'rfq-010');
    expect(key).toBe(`${DRAFT_KEY_PREFIX}rfq.sup-007.rfq-010`);
    expect(writeDraft(key, { form: { unitPrice: '15000' } })).toBe(true);
    expect(readDraft(key)).toEqual({ form: { unitPrice: '15000' } });
  });

  it('reads nothing from an absent or unreadable entry', () => {
    expect(readDraft(draftKey('rfi', 'sup-404'))).toBeNull();
    globalThis.localStorage.setItem(draftKey('rfi', 'sup-bad'), '{not json');
    expect(readDraft(draftKey('rfi', 'sup-bad'))).toBeNull();
  });

  it('formats the stamp as HH:MM in Jakarta time, and nothing for no time', () => {
    expect(formatSavedTime('2026-10-19T12:04:00Z')).toBe('19:04');
    expect(formatSavedTime(undefined)).toBe('');
    expect(formatSavedTime('not a date')).toBe('');
  });

  it('drops the edits of a sent or closed response, and keeps an open one', () => {
    const stale = staleDraftIds(
      [
        { id: 'open', responses: [{ status: 'Draft' }] },
        { id: 'sent', responses: [{ status: 'Submitted' }] },
        { id: 'revising', responses: [{ status: 'Submitted' }] },
        { id: 'closed', closed: true, responses: [] }
      ],
      { revising: true }
    );
    expect([...stale].sort()).toEqual(['closed', 'sent']);
    expect(withoutIds({ open: 1, sent: 2 }, stale)).toEqual({ open: 1 });
    expect([
      ...restoredIds({ draft: { a: [] }, docDraft: { b: [] }, savedAt: { c: 'x' } })
    ]).toEqual(['a', 'b']);
  });
});

describe('useAutosave', () => {
  it('KNOWN-GOOD: writes the value and reports no failure', () => {
    const key = draftKey('rfi', 'sup-ok');
    const { result } = renderHook(() => useAutosave(key, { draft: { e: [1] } }, true));
    expect(result.current).toBe(false);
    expect(readDraft(key)).toEqual({ draft: { e: [1] } });
  });

  it('KNOWN-BAD: a browser that refuses the write is reported as not saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() =>
      useAutosave(draftKey('rfi', 'sup-full'), { draft: { e: [1] } }, true)
    );
    expect(result.current).toBe(true);
  });

  it('drops the key once nothing is left to keep, and touches nothing with no key', () => {
    const key = draftKey('rfi', 'sup-empty');
    writeDraft(key, { draft: { e: [1] } });
    renderHook(() => useAutosave(key, {}, false));
    expect(readDraft(key)).toBeNull();
    const { result } = renderHook(() => useAutosave(null, { a: 1 }, true));
    expect(result.current).toBe(false);
  });
});

describe('useLeaveGuard', () => {
  /** @returns {Event} */
  const unload = () => {
    const e = new Event('beforeunload', { cancelable: true });
    globalThis.dispatchEvent(e);
    return e;
  };
  /** @returns {MouseEvent} */
  const clickLink = () => {
    const a = document.createElement('a');
    a.setAttribute('href', '#/supplier/home');
    document.body.appendChild(a);
    const e = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(e);
    a.remove();
    return e;
  };

  it('KNOWN-BAD: while unsaved, a reload is held and a declined menu link goes nowhere', () => {
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    renderHook(() => useLeaveGuard(true, 'Leave?'));
    expect(unload().defaultPrevented).toBe(true);
    expect(clickLink().defaultPrevented).toBe(true);
    expect(confirm).toHaveBeenCalledWith('Leave?');
  });

  it('KNOWN-GOOD: with nothing to lose, nothing is asked and nothing is held', () => {
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    renderHook(() => useLeaveGuard(false, 'Leave?'));
    expect(unload().defaultPrevented).toBe(false);
    expect(clickLink().defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('a supplier who confirms the prompt leaves', () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    renderHook(() => useLeaveGuard(true, 'Leave?'));
    expect(clickLink().defaultPrevented).toBe(false);
  });
});
