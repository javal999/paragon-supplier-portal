// ────────────────────────────────────────────────────────────────────────────
// RFx authoring — the display helpers every RFI and RFP surface shares, so the
// wizard, the supplier form and the comparison render a question, an answer, a
// term and an indicative price the SAME way.
//
// ⚠️ **BUYER-AUTHORED WORDS ARE NOT i18n KEYS, AND `authored` SAYS SO.** A
// library prompt is a key; a prompt, help text, option, unit or custom term
// the buyer typed is their own sentence. `authored` resolves a key when one
// exists and otherwise renders the words as written — with the namespace and
// key separators OFF, so a buyer's "Size: W×H" is not misread as namespace
// "Size". PTI asked it in one language, and the hub does not invent the other.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatMoney } from '../../lib/format';
import { BID_CURRENCIES, type BidCurrency } from '../../lib/currencyPolicy';
import type { RfiAnswer, RfiQuestion, RfpTermRow } from '../../services/sourcing/types';
import { rfpTerm, rfpTermKindOf, type RfxSectionView } from '../../services/sourcing/rfxConfig';
import { FileOpenLink } from './SupplierDocumentsPanel';

/** A key when the catalogue has one; otherwise the words exactly as written. */
export const authored = (t: TFunction, text: string | undefined): string =>
  text ? String(t(text, { nsSeparator: false, keySeparator: false, defaultValue: text })) : '';

/** An option's label: the buyer's own words, else the library's `rfx.opt.<id>`. */
export const optionLabel = (t: TFunction, q: Pick<RfiQuestion, 'optionLabels'>, option: string): string =>
  q.optionLabels?.[option] ?? String(t(`rfx.opt.${option}`, { defaultValue: option }));

/** A section's title: i18n for the template's A–F, the buyer's words for their own. */
export const sectionTitle = (t: TFunction, s: RfxSectionView): string =>
  s.kind === 'template' ? String(t(`rfx.section.${s.id}`)) : s.title;

/** A money amount in a currency the policy knows, else the bare number. */
export const moneyIn = (value: number, currency: string | undefined): string =>
  currency && (BID_CURRENCIES as readonly string[]).includes(currency)
    ? formatMoney(value, currency as BidCurrency)
    : value.toLocaleString('en-US');

/**
 * The chip on every indicative price (spec D4). It is a STATE of the number —
 * "this is not a quote" — so it renders beside the number wherever it appears,
 * for buyer and supplier alike.
 */
export const IndicativePill: React.FC<{ className?: string; testId?: string }> = ({ className = '', testId }) => {
  const { t } = useTranslation();
  return (
    <StatusPill variant="neutral" className={className}>
      <span data-testid={testId}>{t('rfxa.indicative')}</span>
    </StatusPill>
  );
};

/**
 * D4's other half — "every price field is labelled indicative or firm". An RFQ
 * price is a FIRM quote by tier, and it says so with the same quiet tag the
 * indicative one uses, wherever it is entered or compared.
 */
export const FirmPill: React.FC<{ className?: string; testId?: string }> = ({ className = '', testId }) => {
  const { t } = useTranslation();
  return (
    <StatusPill variant="neutral" className={className}>
      <span data-testid={testId}>{t('rfxa.firm')}</span>
    </StatusPill>
  );
};

/** One answer as a reader sees it, in the question's kind. `—` when unanswered. */
export function answerText(t: TFunction, q: RfiQuestion, a: RfiAnswer | undefined): string {
  if (!a) return '—';
  const unit = q.unitKey ? ` ${authored(t, q.unitKey)}` : '';
  switch (q.type) {
    case 'priceRange':
      return a.range
        ? `${moneyIn(a.range.min, q.currency)} – ${moneyIn(a.range.max, q.currency)}${unit}`
        : '—';
    case 'money':
      return typeof a.value === 'number' || typeof a.value === 'string'
        ? moneyIn(Number(a.value), q.currency)
        : '—';
    case 'percentage':
      return a.value === undefined ? '—' : `${a.value}%`;
    case 'attachment':
      // The files themselves render as links through `AnswerValue` (F-02);
      // this is the text an attachment answer carries without a file.
      return typeof a.value === 'string' && a.value ? a.value : '—';
    case 'yesNo':
    case 'singleChoice':
      return a.value === undefined ? '—' : optionLabel(t, q, String(a.value));
    case 'multipleChoice':
      return Array.isArray(a.value) && a.value.length > 0
        ? a.value.map((v) => optionLabel(t, q, String(v))).join(', ')
        : '—';
    default:
      return a.value === undefined || a.value === '' ? '—' : `${String(a.value)}${unit}`;
  }
}

/**
 * One answer as the buyer reads it. An attachment answer lists its files as
 * links through the same open action as the "Supplier documents" panel, so
 * each open is recorded (F-02, NR-1 BR-10); a file the session no longer holds
 * shows the session-only note. Every other kind reads as `answerText`.
 */
export const AnswerValue: React.FC<{ q: RfiQuestion; a: RfiAnswer | undefined; testId: string }> = ({
  q,
  a,
  testId,
}) => {
  const { t } = useTranslation();
  const files = q.type === 'attachment' ? (a?.attachments ?? []) : [];
  if (files.length === 0) return <>{answerText(t, q, a)}</>;
  return (
    <ul data-testid={testId}>
      {files.map((f) => (
        <li key={f.id}>
          <FileOpenLink file={f} testId={`${testId}-${f.id}`} />
        </li>
      ))}
    </ul>
  );
};

/** A term row's label: the standard term's i18n label, or the buyer's own. */
export const termLabel = (t: TFunction, row: RfpTermRow): string => {
  const def = rfpTerm(row.termId);
  return def ? String(t(def.labelKey)) : row.label ?? row.termId;
};

/** A term row's unit, when it is a number term. */
export const termUnit = (t: TFunction, row: RfpTermRow): string => {
  if (rfpTermKindOf(row) !== 'numberWithUnit') return '';
  if (row.unit) return row.unit;
  const key = rfpTerm(row.termId)?.unitKey;
  return key ? String(t(key)) : '';
};

/** A term value as a reader sees it: yes/no translated, a unit appended to a number. */
export const termValueText = (t: TFunction, row: RfpTermRow, value: string | undefined): string => {
  if (value === undefined || value.trim() === '') return '—';
  const kind = rfpTermKindOf(row);
  if (kind === 'yesNo') return String(t(`rfx.opt.${value}`, { defaultValue: value }));
  const unit = termUnit(t, row);
  return unit ? `${value} ${unit}` : value;
};
