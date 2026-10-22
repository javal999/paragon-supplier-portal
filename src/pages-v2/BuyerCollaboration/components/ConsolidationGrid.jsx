/** @import React from 'react' */
/** @import { Column } from 'react-datasheet-grid' */
/** @import { CoverageRow } from '../const' */
import { DataSheetGrid } from 'react-datasheet-grid';
import { useTranslation } from 'react-i18next';
import FullScreenSection from '../../plan-grid/FullScreenSection';
import { DSG_H } from '../const';
import { dsgVar } from '../utils';

/**
 * The consolidation grid: a read-only DataSheetGrid in a full-screen-capable
 * section, height-pinned (`--plan-dsg-h`) so it does not tremble. Renders the
 * rows the period filter leaves, with the page's columns.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{ visibleRows: CoverageRow[]; columns: Column<CoverageRow>[] }>}
 */
const ConsolidationGrid = ({ visibleRows, columns }) => {
  const { t } = useTranslation();

  return (
    <section className="mb-8">
      <FullScreenSection title={t('sdc.grid.title')} normalHeight={DSG_H.grid}>
        {({ dsgHeight }) => (
          <>
            <p className="mb-1 text-sm text-text-secondary">{t('sdc.grid.subtitle')}</p>
            <p className="mb-3 text-xs text-text-tertiary">{t('sdc.coverage.legend')}</p>
            <div
              className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
              style={dsgVar(dsgHeight)}
            >
              <DataSheetGrid
                value={visibleRows}
                columns={columns}
                gutterColumn={false}
                lockRows
                rowKey="id"
                height={dsgHeight}
              />
            </div>
          </>
        )}
      </FullScreenSection>
    </section>
  );
};

export default ConsolidationGrid;
