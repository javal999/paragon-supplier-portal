import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { DRAFT_KEY_PREFIX } from '@pages-v2/rfx/responseDraft';

// RFx UX S-01 — a supplier response form keeps what is typed in localStorage.
// jsdom's localStorage outlives a test, so one spec's typed answers would open
// in the next spec's form. Only those keys are dropped; every other stored
// value keeps its existing lifetime.
afterEach(() => {
  try {
    const store = globalThis.localStorage;
    if (!store) return;
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i) ?? '');
    keys.filter((k) => k.startsWith(DRAFT_KEY_PREFIX)).forEach((k) => store.removeItem(k));
  } catch {
    // A test environment without storage keeps nothing to clear.
  }
});

// jsdom does not implement ResizeObserver, which recharts' ResponsiveContainer
// (used by BuyerDashboard and other chart pages) requires on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = /** @type {typeof ResizeObserver} */ (
    /** @type {unknown} */ (ResizeObserverStub)
  );
}
