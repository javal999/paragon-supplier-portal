import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { PLANNING_TERM_GLOSSARY, type PlanningTerm } from '@lib/glossary';

// ─────────────────────────────────────────────────────────────────────────────
// TERM TIP — F-09 (Forecast UX phase 1, task A4).
//
// A point-of-use definition for a planning term (Firm, Trade-off, MASC,
// tracking signal, reorder point, P50/P90). The sentence is read from the
// glossary entry (`lib/glossary/planning.glossary.js`) in the active language,
// so the tip and the glossary page show the same words and a correction is one
// edit. The tip opens on hover and on keyboard focus of its info button.
// ─────────────────────────────────────────────────────────────────────────────

interface TermTipProps {
  readonly term: PlanningTerm;
  /** The label the tip explains; without it only the info button renders. */
  readonly children?: React.ReactNode;
  readonly className?: string;
}

const slug = (term: PlanningTerm) => term.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const TermTip: React.FC<TermTipProps> = ({ term, children, className = '' }) => {
  const { t, i18n } = useTranslation();
  const id = useId();
  const indonesian = i18n.language?.toLowerCase().startsWith('id') ?? false;
  const entry = PLANNING_TERM_GLOSSARY[term];
  return (
    <span className={`group relative inline-flex items-center gap-1 ${className}`} data-testid={`term-tip-${slug(term)}`}>
      {children ? <span className="underline decoration-dotted underline-offset-2">{children}</span> : null}
      <button
        type="button"
        aria-label={t('fux.term.aria', { term })}
        aria-describedby={id}
        className="text-text-tertiary hover:text-action-hover focus:text-action-hover focus:outline-none"
      >
        <Info size={12} aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible absolute left-0 top-full z-20 mt-1 w-64 rounded border border-border-subtle bg-bg-surface p-2 text-left text-xs font-normal normal-case tracking-normal text-text-secondary opacity-0 shadow-md group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {indonesian ? entry.id : entry.en}
      </span>
    </span>
  );
};

export default TermTip;
