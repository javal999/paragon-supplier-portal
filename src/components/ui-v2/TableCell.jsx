/** @import * as React from 'react' */
import { pinnedBodyClass } from './pinnedColumn';
/**
 * @param {TableCellProps} props
 * @returns {React.ReactNode}
 */
const TableCell = ({ children, className = '', pin, ...rest }) => {
  return (
    <td
      className={`py-4 px-4 align-middle ${pinnedBodyClass(pin)} ${className}`}
      data-pin={pin}
      {...rest}
    >
      {children}
    </td>
  );
};
export default TableCell;
/**
 * Every native `<td>` attribute; `children` is required. `pin` sticks the cell
 * to the table's left or right edge (`pinnedColumn.js`); its header cell takes
 * the same `pin`.
 * @typedef {React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode, pin?: 'left' | 'right' }} TableCellProps
 */
