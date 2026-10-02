/** @import * as React from 'react' */
/**
 * @param {TableCellProps} props
 * @returns {React.ReactNode}
 */
const TableCell = ({ children, className = '', ...rest }) => {
  return (
    <td className={`py-4 px-4 align-middle ${className}`} {...rest}>
      {children}
    </td>
  );
};
export default TableCell;
/**
 * Every native `<td>` attribute; `children` is required.
 * @typedef {React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }} TableCellProps
 */
