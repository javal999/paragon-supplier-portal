/** @import * as React from 'react' */
import { pinnedHeaderClass } from './pinnedColumn';
import TermLabel from './TermLabel';
/** @import { TermLabelId } from '@lib/glossary' */
// DP-3 (TMS alignment): a light grey header band over the thin bottom border.
// Row grammar (thin borders, generous height) already lives in TableRow/TableCell.
/**
 * @param {TableHeaderProps} props
 * @returns {React.ReactNode}
 */
const TableHeader = ({ children, className = '' }) => {
  return (
    <thead className={`bg-bg-hover border-b border-border-subtle ${className}`}>
      <tr>{children}</tr>
    </thead>
  );
};
/**
 * @param {TableHeaderCellProps} props
 * @returns {React.ReactNode}
 */
export const TableHeaderCell = ({ children, term, className = '', ariaSort, pin }) => {
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      data-pin={pin}
      className={`text-left text-label text-text-tertiary uppercase py-3 px-4 ${pinnedHeaderClass(pin)} ${className}`}
    >
      {term ? <TermLabel term={term} /> : children}
    </th>
  );
};
export default TableHeader;
/**
 * @typedef {Object} TableHeaderProps
 * @property {React.ReactNode} children
 * @property {string} [className]
 */
/**
 * @typedef {Object} TableHeaderCellProps
 * @property {React.ReactNode} [children]
 * @property {TermLabelId} [term] BL-233 BR-05: the header is the term's label, with its (i).
 * @property {string} [className]
 * @property {'ascending' | 'descending'} [ariaSort] Set on the column a table is sorted by, so assistive tech announces it.
 * @property {'left' | 'right'} [pin] Sticks the column to the table's left or right edge; its body cells take the same `pin` (`pinnedColumn.js`).
 */
