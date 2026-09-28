import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

const Table: React.FC<TableProps> = ({ children, className = '', ...rest }) => {
  // Shared scroll container: a table's own columns may need more room than
  // the screen provides. The table stays at least full width and can grow
  // past it; this wrapper is what scrolls, never the page.
  return (
    <div className="relative w-full min-w-0 overflow-x-auto">
      <table
        className={`w-full min-w-max text-sm text-text-primary border-collapse ${className}`}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
};

export default Table;
