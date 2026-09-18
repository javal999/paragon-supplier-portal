// ─────────────────────────────────────────────────────────────────────────────
// SAP INTERFACE RULES — REQ-E07-08 (order data interface with SAP), CR-20.
//
// Pure functions. Nothing here reads a clock or a store: the monitor page and
// the data-age banner hand in the documents, the recorded messages and the
// instant, so "last updated", "how old" and "is this stale" are derived at read
// time and never stored (law 0.5).
//
// ⚠️ THE HUB HAS NO SAP. What this models is stated rather than implied: the
// inbound feeds are SIMULATED — each object's "last received" is the newest
// document of that family in the fixtures, which is the honest stand-in for a
// delivery timestamp nothing in this prototype produces. The OUTBOUND failures
// are real: they are the settle failures the dispatcher already records, read
// back out of the audit trail and classified by the SAME vocabulary the settle
// boundary uses (`settleFaults.ts`), so CR-20's retry rule has exactly one home.
// ─────────────────────────────────────────────────────────────────────────────

import type { TransitionEvent } from '../transitions/events';
import {
  SETTLE_FAULT_RETRYABLE,
  settleFaultKindOf,
  type SettleFault,
} from '../transitions/settleFaults';

// ── BR-01 / BR-02 · the objects exchanged, and which way they travel ────────

export const SAP_OBJECTS = [
  'umbrellaPo',
  'goodsReceipt',
  'invoiceStatus',
  'poResponse',
  'inboundDelivery',
  'invoiceOut',
] as const;

export type SapObjectId = (typeof SAP_OBJECTS)[number];

export type SapDirection = 'inbound' | 'outbound';

/** BR-02 — SAP to hub for PO, goods receipt and invoice status; hub to SAP for
 *  the PO response, the ASN as an inbound delivery, and the invoice. */
export const SAP_OBJECT_DIRECTION: Readonly<Record<SapObjectId, SapDirection>> = Object.freeze({
  umbrellaPo: 'inbound',
  goodsReceipt: 'inbound',
  invoiceStatus: 'inbound',
  poResponse: 'outbound',
  inboundDelivery: 'outbound',
  invoiceOut: 'outbound',
});

/** BR-04 — SAP changes are expected in the hub inside this many minutes. */
export const SAP_LATENCY_TARGET_MINUTES = 15;

/** Which interface object each screen's figures depend on (AC-03). */
export const SAP_PAGE_OBJECT = {
  purchaseOrders: 'umbrellaPo',
  goodsReceipts: 'goodsReceipt',
  inventory: 'umbrellaPo',
  invoices: 'invoiceStatus',
} as const satisfies Record<string, SapObjectId>;

export type SapPageKey = keyof typeof SAP_PAGE_OBJECT;

// ── A failed message ────────────────────────────────────────────────────────

export interface SapFailedMessage {
  readonly id: string;
  readonly object: SapObjectId;
  /** CR-20's class — the settle boundary's own vocabulary, not a second one. */
  readonly fault: SettleFault;
  /** The business-plain error the interface reported. */
  readonly errorText: string;
  /** The reference both sides quote when they talk about this message. */
  readonly correlationId: string;
  readonly timestamp: string;
  /** Present when the message came from a real settle the dispatcher can retry. */
  readonly settleCorrelationId?: string;
}

/** CR-20 — only a transport failure may be retried; a refusal is fixed first. */
export function isRetryable(message: Pick<SapFailedMessage, 'fault'>): boolean {
  return SETTLE_FAULT_RETRYABLE[message.fault];
}

// ── The per-object status the monitor renders ───────────────────────────────

export interface SapObjectStatus {
  readonly object: SapObjectId;
  readonly direction: SapDirection;
  /** The last time this object moved successfully, or null if it never has. */
  readonly lastSuccessAt: string | null;
  readonly failureCount: number;
  readonly failures: readonly SapFailedMessage[];
  /** Of the failures, the ones CR-20 allows a retry on. */
  readonly retryableCount: number;
}

/** The newest of a set of timestamps, or null when there is none. */
export function newestInstant(instants: readonly (string | null | undefined)[]): string | null {
  const real = instants.filter((i): i is string => typeof i === 'string' && i.length > 0);
  if (real.length === 0) return null;
  return real.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b));
}

/**
 * Which interface object a settle failure belongs to. The two SAP-boundary
 * verbs in the tree are the goods-receipt post and the invoice payment release,
 * so the mapping is by entity and there is no third case to guess at.
 */
export function objectForEntity(entity: string): SapObjectId | null {
  if (entity === 'goodsReceipt') return 'goodsReceipt';
  if (entity === 'invoice') return 'invoiceOut';
  return null;
}

/**
 * Failed messages recovered from the command trail. A settle that failed emits
 * `outcome: 'failed'` with a `reason` the settle boundary wrote; a later
 * successful settle emits `done` under the SAME correlationId, which is what
 * clears the failure here — so a retry that works updates the monitor without
 * anything being deleted.
 */
export function failuresFromEvents(
  events: readonly TransitionEvent[],
  entityOf: (transitionId: string) => string | null,
): readonly SapFailedMessage[] {
  const settled = new Set(
    events.filter((e) => e.outcome === 'done').map((e) => e.correlationId),
  );
  const out: SapFailedMessage[] = [];
  for (const e of events) {
    if (e.outcome !== 'failed') continue;
    const fault = settleFaultKindOf(e.reason);
    if (!fault) continue;
    if (settled.has(e.correlationId)) continue;
    const entity = entityOf(e.event);
    const object = entity ? objectForEntity(entity) : null;
    if (!object) continue;
    out.push({
      id: `msg-${e.correlationId}`,
      object,
      fault,
      errorText: e.reason ?? fault,
      correlationId: e.correlationId,
      timestamp: e.ts,
      settleCorrelationId: e.correlationId,
    });
  }
  return out;
}

export interface SapMonitorInput {
  /** Newest document instant per object — the simulated "last received". */
  readonly lastSeen: Readonly<Partial<Record<SapObjectId, string | null>>>;
  readonly messages: readonly SapFailedMessage[];
}

/** The whole monitor: one row per interface object, newest failure first. */
export function sapMonitor(input: SapMonitorInput): readonly SapObjectStatus[] {
  return SAP_OBJECTS.map((object) => {
    const failures = input.messages
      .filter((m) => m.object === object)
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return {
      object,
      direction: SAP_OBJECT_DIRECTION[object],
      lastSuccessAt: input.lastSeen[object] ?? null,
      failureCount: failures.length,
      failures,
      retryableCount: failures.filter(isRetryable).length,
    };
  });
}

// ── BR-04 / AC-03 · the data age a screen shows ─────────────────────────────

export interface SapDataAge {
  /** Whole minutes since the object last arrived; null when it never has. */
  readonly minutes: number | null;
  /** True when the age exceeds the latency target — the banner's condition. */
  readonly stale: boolean;
  readonly lastSuccessAt: string | null;
}

/**
 * How old a screen's SAP data is. Derived at read time from the last successful
 * arrival and the instant handed in — never stored, and never a clock read here.
 */
export function sapDataAge(lastSuccessAt: string | null, nowIso: string): SapDataAge {
  if (!lastSuccessAt) return { minutes: null, stale: true, lastSuccessAt: null };
  const ms = Date.parse(nowIso) - Date.parse(lastSuccessAt);
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return { minutes, stale: minutes > SAP_LATENCY_TARGET_MINUTES, lastSuccessAt };
}

/** A plain age phrase's parts (SC-04): the page renders them, this decides them. */
export type SapAgeUnit = 'minutes' | 'hours' | 'days';

export function sapAgeParts(minutes: number): { unit: SapAgeUnit; value: number } {
  if (minutes < 60) return { unit: 'minutes', value: minutes };
  if (minutes < 60 * 24) return { unit: 'hours', value: Math.floor(minutes / 60) };
  return { unit: 'days', value: Math.floor(minutes / (60 * 24)) };
}
