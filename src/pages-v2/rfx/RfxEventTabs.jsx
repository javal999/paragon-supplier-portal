// ────────────────────────────────────────────────────────────────────────────
// RFx UX 2G — the tabs on the RFP and RFI event pages (owner ruling
// 2026-10-20): Overview · Compare · By supplier, under the header, the stage
// bar and the actions row.
//
// The tab lives in the URL (`?tab=overview|compare|supplier`, and
// `&supplier=<id>` on By supplier), so a link lands on it and the browser's
// back and forward move between tabs. A `?section=<id>` deep link selects the
// tab that holds that section. Each change of tab is a history entry.
//
// DISPLAY ONLY: nothing here runs a verb or decides a rule.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { RfxEventTab, InviteeTally } from './rfxCompare' */
/** @import { BiddingEligibility } from '@services/sourcing/sourcingType' */
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SubTabs from '@components/ui-v2/SubTabs';
import { formatDate } from '@lib/format';
import { EligibilityMarker } from './eligibilityDisplay';
import { RFX_EVENT_TABS, rfxTabOf } from './rfxCompare';

/**
 * The tab and supplier the URL selects, and the way to change them.
 * @param {{ submitted: number; sectionTab: Readonly<Record<string, RfxEventTab>> }} input
 * @returns {{
 *   tab: RfxEventTab;
 *   supplier: string | null;
 *   section: string | null;
 *   select: (tab: RfxEventTab, opts?: { supplier?: string; section?: string }) => void;
 * }}
 */
export function useRfxEventTab({ submitted, sectionTab }) {
  const [params, setParams] = useSearchParams();
  const section = params.get('section');
  const tab = rfxTabOf({ tab: params.get('tab'), section, submitted, sectionTab });
  return {
    tab,
    supplier: params.get('supplier'),
    section,
    select: (next, opts = {}) => {
      const out = new URLSearchParams();
      out.set('tab', next);
      if (opts.supplier) out.set('supplier', opts.supplier);
      if (opts.section) out.set('section', opts.section);
      setParams(out);
    }
  };
}

/**
 * The tab bar. Compare carries the count of what was submitted.
 * @type {React.FC<{ tab: RfxEventTab; submitted: number; onSelect: (tab: RfxEventTab) => void }>}
 */
export const RfxEventTabBar = ({ tab, submitted, onSelect }) => {
  const { t } = useTranslation();
  return (
    <SubTabs
      className="mb-4"
      options={RFX_EVENT_TABS.map((id) => ({
        id,
        label: t(`rfx.tab.${id}`),
        ...(id === 'compare' ? { count: submitted } : {})
      }))}
      value={tab}
      onChange={onSelect}
    />
  );
};

/**
 * Compare or By supplier before anything is submitted: still selectable, and
 * saying so.
 * @type {React.FC<{ text: string; testId: string }>}
 */
export const RfxTabEmpty = ({ text, testId }) => (
  <p
    className="bg-bg-surface border border-border-subtle rounded-lg py-10 text-center text-sm text-text-tertiary"
    data-testid={testId}
  >
    {text}
  </p>
);

/**
 * "4 invited · 3 submitted · 1 not started · 1 declined" — the invitee table
 * in one line, linking to it on Overview. "In progress" shows only when a
 * supplier holds an unsent draft.
 * @type {React.FC<{ tally: InviteeTally; onOpen: () => void; testId: string }>}
 */
export const InviteeTallyLine = ({ tally, onOpen, testId }) => {
  const { t } = useTranslation();
  const parts = [
    t('rfx.tally.invited', { count: tally.invited }),
    t('rfx.tally.submitted', { count: tally.submitted }),
    ...(tally.inProgress > 0 ? [t('rfx.tally.inProgress', { count: tally.inProgress })] : []),
    t('rfx.tally.notStarted', { count: tally.notStarted }),
    t('rfx.tally.declined', { count: tally.declined })
  ];
  return (
    <p className="text-sm text-text-secondary">
      <button
        type="button"
        className="text-left text-teal-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
        onClick={onOpen}
        data-testid={testId}
      >
        {parts.join(' · ')}
      </button>
    </p>
  );
};

/**
 * The neutral "Best" marker on the best value of a comparable row (DP-2:
 * teal accent, never a state colour — it informs, it does not judge).
 * @type {React.FC<{ testId?: string }>}
 */
export const BestTag = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <span
      className="ml-1 inline-flex items-center rounded border border-teal/40 bg-teal-soft px-1.5 text-xs font-medium text-teal-hover align-middle"
      data-testid={testId}
    >
      {t('rfx.best.tag')}
    </span>
  );
};

/**
 * One fact on a summary card: a label and its value.
 * @typedef {{ key: string; label: string; value: React.ReactNode }} CardFact
 */

/**
 * One submitted supplier on the Compare tab's summary strip.
 * @type {React.FC<{
 *   supplierName: string;
 *   scoreLabel: string;
 *   score: number | null;
 *   facts: readonly CardFact[];
 *   eligibility: BiddingEligibility | undefined;
 *   version: number;
 *   submittedAt: string | null;
 *   linkLabel: string;
 *   onView: () => void;
 *   testId: string;
 * }>}
 */
export const SummaryCard = ({
  supplierName,
  scoreLabel,
  score,
  facts,
  eligibility,
  version,
  submittedAt,
  linkLabel,
  onView,
  testId
}) => {
  const { t } = useTranslation();
  return (
    <li
      className="min-w-[220px] flex-1 bg-bg-surface border border-border-subtle rounded-lg p-3 space-y-2"
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary" data-testid={`${testId}-name`}>
          {supplierName}
        </span>
        <EligibilityMarker eligibility={eligibility} compact testId={`${testId}-elig`} />
      </div>
      <div className="text-xs text-text-tertiary" data-testid={`${testId}-score`}>
        {scoreLabel}{' '}
        {score === null ? (
          t('rfx.rfi.noScore')
        ) : (
          <Data className="text-base font-semibold">{score}</Data>
        )}
      </div>
      <dl className="space-y-1 text-xs">
        {facts.map((f) => (
          <div
            key={f.key}
            className="flex justify-between gap-2"
            data-testid={`${testId}-${f.key}`}
          >
            <dt className="text-text-tertiary">{f.label}</dt>
            <dd className="text-right text-text-primary">{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-text-tertiary" data-testid={`${testId}-version`}>
        {t('rfx.version.label', { n: version })}
        {submittedAt ? (
          <>
            {' · '}
            {t('rfx.version.submittedOn')} <Data>{formatDate(submittedAt)}</Data>
          </>
        ) : null}
      </p>
      <button
        type="button"
        className="text-sm text-teal-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
        onClick={onView}
        data-testid={`${testId}-view`}
      >
        {linkLabel}
      </button>
    </li>
  );
};

/**
 * By supplier: one supplier at a time — a picker with Previous and Next.
 * @type {React.FC<{
 *   options: readonly { id: string; name: string }[];
 *   current: string;
 *   onChange: (id: string) => void;
 *   testId: string;
 * }>}
 */
export const SupplierStepper = ({ options, current, onChange, testId }) => {
  const { t } = useTranslation();
  const index = options.findIndex((o) => o.id === current);
  const prev = index > 0 ? options[index - 1] : undefined;
  const next = index >= 0 && index < options.length - 1 ? options[index + 1] : undefined;
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4" data-testid={testId}>
      <div>
        <label
          className="block text-xs font-semibold text-text-secondary mb-1"
          htmlFor={`${testId}-select`}
        >
          {t('rfx.bySupplier.pick')}
        </label>
        <select
          id={`${testId}-select`}
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          data-testid={`${testId}-select`}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="secondary"
        disabled={!prev}
        onClick={() => prev && onChange(prev.id)}
        data-testid={`${testId}-prev`}
      >
        {t('rfx.bySupplier.prev')}
      </Button>
      <Button
        variant="secondary"
        disabled={!next}
        onClick={() => next && onChange(next.id)}
        data-testid={`${testId}-next`}
      >
        {t('rfx.bySupplier.next')}
      </Button>
      <span className="text-xs text-text-tertiary" data-testid={`${testId}-position`}>
        {t('rfx.bySupplier.position', { n: index + 1, total: options.length })}
      </span>
    </div>
  );
};

/**
 * Every submitted version of one response, newest first (NR-1 BR-08).
 * @type {React.FC<{ versions: readonly { number: number; submittedAt: string }[]; testId: string }>}
 */
export const VersionHistory = ({ versions, testId }) => {
  const { t } = useTranslation();
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4"
      data-testid={testId}
    >
      <h3 className="text-sm font-semibold text-text-primary mb-2">
        {t('rfx.bySupplier.versions')}
      </h3>
      <ol className="space-y-1 text-sm">
        {[...versions].reverse().map((v) => (
          <li key={v.number} data-testid={`${testId}-${v.number}`}>
            {t('rfx.version.label', { n: v.number })} · {t('rfx.version.submittedOn')}{' '}
            <Data>{formatDate(v.submittedAt)}</Data>
          </li>
        ))}
      </ol>
    </div>
  );
};

/**
 * A switch over the comparison grid: "Show deviations only", "Show answers
 * that differ". Disabled with its reason when there is nothing to filter.
 * @type {React.FC<{ label: string; checked: boolean; onChange: (next: boolean) => void; disabledReason?: string; testId: string }>}
 */
export const GridFilterToggle = ({ label, checked, onChange, disabledReason, testId }) => (
  <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
    <input
      type="checkbox"
      className="accent-action"
      checked={checked}
      disabled={!!disabledReason}
      onChange={(e) => onChange(e.target.checked)}
      data-testid={testId}
    />
    <span>{label}</span>
    {disabledReason ? (
      <span className="text-xs text-text-tertiary" data-testid={`${testId}-reason`}>
        {disabledReason}
      </span>
    ) : null}
  </label>
);
