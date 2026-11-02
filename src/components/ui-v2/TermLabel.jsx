/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import TermTip from '@components/forecast/TermTip';
import { TERM_LABEL_GLOSSARY } from '@lib/glossary';
/** @import { TermLabelId } from '@lib/glossary' */

// ─────────────────────────────────────────────────────────────────────────────
// BL-233 (TL-R2) — a term's label with its (i), for a table column header, a
// grid row label or a KPI card title (BR-05).
//
// The label and the tip both come from the term's glossary entry
// (`lib/glossary/termLabels.glossary.js`), in the active language, so the page
// holds no copy of either (BR-08). `values` fills a label's `{{name}}` slots;
// no wave-1 label has one since TL-D14 renamed the consumption average. The tip keeps
// TermTip's accessibility (BR-09).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
const fill = (text, values) =>
  text.replace(/\{\{(\w+)\}\}/g, (slot, name) =>
    values[name] === undefined ? slot : String(values[name])
  );

/**
 * The label of a term in the active language, without the (i).
 * @param {TermLabelId} term
 * @param {boolean} indonesian
 * @param {Record<string, string | number>} [values]
 * @returns {string}
 */
export const termLabelText = (term, indonesian, values = {}) => {
  const label = TERM_LABEL_GLOSSARY[term].label;
  return fill(indonesian ? label.id : label.en, values);
};

/**
 * @typedef {{
 *     readonly term: TermLabelId;
 *     readonly values?: Record<string, string | number>;
 *     readonly className?: string;
 *   }} TermLabelProps
 */

/** @type {React.FC<TermLabelProps>} */
const TermLabel = ({ term, values, className = '' }) => {
  const { i18n } = useTranslation();
  const indonesian = i18n.language?.toLowerCase().startsWith('id') ?? false;
  const text = termLabelText(term, indonesian, values);
  return (
    <TermTip entry={TERM_LABEL_GLOSSARY[term]} name={text} slugId={term} className={className}>
      <span data-term={term}>{text}</span>
    </TermTip>
  );
};

/**
 * The (i) of a term alone, for a slot whose label is already inside another
 * control (a sort button), where a second button cannot nest.
 * @type {React.FC<{ readonly term: TermLabelId }>}
 */
export const TermInfo = ({ term }) => {
  const { i18n } = useTranslation();
  const indonesian = i18n.language?.toLowerCase().startsWith('id') ?? false;
  return (
    <TermTip
      entry={TERM_LABEL_GLOSSARY[term]}
      name={termLabelText(term, indonesian)}
      slugId={term}
    />
  );
};

export default TermLabel;
