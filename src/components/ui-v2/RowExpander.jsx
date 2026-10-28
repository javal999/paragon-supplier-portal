/** @import * as React from 'react' */
import { ChevronDown, ChevronRight } from 'lucide-react';

// A row expander for the shared `Table`: secondary fields move out of the main
// row and into a second row the user opens per row. Use it when a table is
// too wide for its decision column to stay on screen, and the fields moved
// out are ones the row's decision does not need at a glance.
//
// - `RowExpanderToggle` is a real button, so it is in the tab order and
//   operates on Enter and Space. It states its state through `aria-expanded`
//   and names the row it opens through `label`.
// - `RowExpansion` is the row it opens: one cell across the whole table,
//   holding a `<dl>` of the moved fields, so each value keeps its label.

/**
 * @param {RowExpanderToggleProps} props
 * @returns {React.ReactNode}
 */
export const RowExpanderToggle = ({ open, onToggle, label, controls, testId }) => {
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="rounded p-1 text-text-tertiary hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
      data-testid={testId}
    >
      <Chevron size={16} aria-hidden="true" />
    </button>
  );
};

/**
 * @param {RowExpansionProps} props
 * @returns {React.ReactNode}
 */
export const RowExpansion = ({ id, colSpan, fields, testId }) => (
  <tr id={id} className="border-b border-border-subtle bg-bg-page" data-testid={testId}>
    <td colSpan={colSpan} className="px-4 py-3">
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <dt className="text-label text-text-tertiary uppercase inline-flex items-center gap-1">
              {f.label}
            </dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </td>
  </tr>
);

/**
 * @typedef {Object} RowExpanderToggleProps
 * @property {boolean} open
 * @property {() => void} onToggle
 * @property {string} label Names what the button opens, e.g. "Show details for <row>".
 * @property {string} controls Id of the `RowExpansion` row, referenced while it is open.
 * @property {string} [testId]
 */
/**
 * @typedef {Object} RowExpansionField
 * @property {string} key
 * @property {React.ReactNode} label
 * @property {React.ReactNode} value
 */
/**
 * @typedef {Object} RowExpansionProps
 * @property {string} id
 * @property {number} colSpan The table's column count.
 * @property {readonly RowExpansionField[]} fields
 * @property {string} [testId]
 */
