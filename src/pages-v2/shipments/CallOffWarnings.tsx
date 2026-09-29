// ────────────────────────────────────────────────────────────────────────────
// The ASN's call-off and batch warnings, as the supplier and the planner see
// them (MR-6 BR-03, BR-04, BR-10 to BR-12; plan FU-5, FU-7).
//
// Every figure comes from the rules (`asnCallOffWarnings`, `batchAboveAvailable`
// via the form's line model); this file only words them. Warnings never block.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatDate } from '../../lib/format';
import type { ASN, CallOffWarning } from '../../services/data/types';
import type { AsnLinesRead } from './asnLines';

const n = (v: number | undefined): string => (v ?? 0).toLocaleString('en-US');

/** One call-off warning in words, with its figures (e.g. "1,200 vs 1,000 called off (+20%)"). */
export function callOffWarningText(t: TFunction, w: CallOffWarning): string {
  const d = w.detail;
  const callOff = d.callOffNumber ?? '';
  switch (w.kind) {
    case 'qtyOver':
      return t('co.asn.warn.qtyOver', { shipped: n(d.shipped), agreed: n(d.agreed), pct: n(d.pct), limit: n(d.limit), callOff });
    case 'qtyUnder':
      return t('co.asn.warn.qtyUnder', { shipped: n(d.shipped), agreed: n(d.agreed), pct: n(d.pct), callOff });
    case 'late':
      // BL-159 — `count` picks the plural form (i18next).
      return t('co.asn.warn.late', { count: d.days ?? 0, eta: formatDate(d.eta), date: formatDate(d.agreedDate), callOff });
    case 'early':
      return t('co.asn.warn.early', {
        count: d.days ?? 0,
        eta: formatDate(d.eta),
        date: formatDate(d.agreedDate),
        limit: t('co.asn.warn.days', { count: d.limit ?? 0 }),
        callOff,
      });
    case 'material':
      return t('co.asn.warn.material', { material: d.materialCode ?? '', expected: d.expectedMaterial ?? '', callOff });
    case 'unlinked':
      return t('co.asn.warn.unlinked', { material: d.materialCode ?? '', callOffs: (d.callOffNumbers ?? []).join(', ') });
  }
}

const warningKey = (w: CallOffWarning, i: number): string =>
  `${w.kind}-${w.detail.materialCode ?? w.detail.callOffNumber ?? ''}-${i}`;

interface SubmitWarningsProps {
  /** MR-6 BR-03 — lines shipping more of a declared batch than is available. */
  aboveAvailable: AsnLinesRead['aboveAvailable'];
  /** MR-6 BR-10 / BR-11 — the call-off warnings for the ASN as entered. */
  callOffWarnings: readonly CallOffWarning[];
  testId: string;
}

/**
 * The supplier's warnings before submit, on BOTH submit paths: the wizard's
 * confirm step and the Submit drawer on a draft (FU-5). Submit stays allowed.
 */
export const AsnSubmitWarnings: React.FC<SubmitWarningsProps> = ({ aboveAvailable, callOffWarnings, testId }) => {
  const { t } = useTranslation();
  if (aboveAvailable.length === 0 && callOffWarnings.length === 0) return null;
  return (
    <div
      role="alert"
      data-testid={testId}
      className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 space-y-1 text-xs text-warning-hover"
    >
      {aboveAvailable.length > 0 ? (
        <div data-testid="asn-batch-above-available" className="space-y-1">
          {aboveAvailable.map((l) => (
            <p key={l.line.materialCode}>
              {t('fc.asn.batch.aboveAvailable', {
                material: l.line.materialCode,
                qty: l.input.shippedQty.toLocaleString('en-US'),
                batch: l.input.batchNumber,
                available: (l.aboveAvailable ?? 0).toLocaleString('en-US'),
              })}
            </p>
          ))}
          <p>{t('fc.asn.batch.aboveAvailableHint')}</p>
        </div>
      ) : null}
      {callOffWarnings.length > 0 ? (
        <div data-testid="asn-calloff-warnings" className="space-y-1">
          {callOffWarnings.map((w, i) => (
            <p key={warningKey(w, i)} data-testid={`asn-calloff-warning-${w.kind}`}>
              {callOffWarningText(t, w)}
            </p>
          ))}
          <p>{t('co.asn.warn.hint')}</p>
        </div>
      ) : null}
    </div>
  );
};

interface PlannerMarkersProps {
  asn: Pick<ASN, 'asnNumber' | 'lineItems'>;
  /** The CURRENT comparison, recomputed on read (edge case 6) — never the stored copy. */
  warnings: readonly CallOffWarning[];
}

/**
 * The planner's markers on one ASN, wherever PTI lists it: "Mismatch" with the
 * current figures (MR-6 BR-12), and "Not in declared stock" for a typed batch
 * (BR-04, FU-7).
 */
export const AsnPlannerMarkers: React.FC<PlannerMarkersProps> = ({ asn, warnings }) => {
  const { t } = useTranslation();
  const typed = asn.lineItems.filter((l) => l.batchSource === 'typed');
  if (warnings.length === 0 && typed.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-xs">
      {warnings.length > 0 ? (
        <div data-testid={`asn-mismatch-${asn.asnNumber}`} className="flex flex-col gap-0.5">
          <span>
            <StatusPill variant="warning">{t('co.asn.mismatch')}</StatusPill>
          </span>
          {warnings.map((w, i) => (
            <span key={warningKey(w, i)} className="text-warning-hover">
              {callOffWarningText(t, w)}
            </span>
          ))}
        </div>
      ) : null}
      {typed.map((l) => (
        <span
          key={l.materialCode}
          data-testid={`asn-not-declared-${asn.asnNumber}-${l.materialCode}`}
          className="inline-block w-fit px-1.5 py-0.5 rounded border border-warning bg-warning-soft text-[11px] text-warning-hover"
        >
          {t('fc.asn.batch.notDeclared')} · {l.materialCode} · {l.lotNumber}
        </span>
      ))}
    </div>
  );
};
