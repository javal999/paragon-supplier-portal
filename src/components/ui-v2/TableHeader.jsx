/** @import * as React from 'react' */
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
export const TableHeaderCell = ({ children, className = '', ariaSort }) => {
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`text-left text-label text-text-tertiary uppercase py-3 px-4 ${className}`}
    >
      {children}
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
 * @property {React.ReactNode} children
 * @property {string} [className]
 * @property {'ascending' | 'descending'} [ariaSort] Set on the column a table is sorted by, so assistive tech announces it.
 */
