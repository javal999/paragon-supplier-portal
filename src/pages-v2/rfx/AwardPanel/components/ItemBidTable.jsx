/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
/** @import { AnyAwardLine } from '@services/sourcing/types' */
/** @import { AwardItemBreak } from '@services/sourcing/awardShape' */
import { EmptyRow } from '../../rfxDisplay';
import { FirmPill } from '../../rfxAuthoringDisplay';
/** @import { ItemRowProps } from './AwardItemRow' */
import { AwardBidRow } from './AwardBidRow';

/**
 * One input per bid that can be awarded the item, and the derived side.
 * @template {AnyAwardLine} L
 * @param {ItemRowProps<L> & { brk: AwardItemBreak }} props
 * @returns {React.ReactElement}
 */
export const ItemBidTable = (props) => {
  const { t } = useTranslation();
  const { item, brk, bids, draft, model } = props;
  return (
    <Table>
      <TableHeader>
        <TableHeaderCell>{t('rfx.award.col.supplier')}</TableHeaderCell>
        <TableHeaderCell>
          {model.priceHeader(item, brk)}
          <FirmPill className="ml-2 normal-case" testId={`award-firm-${item.key}`} />
        </TableHeaderCell>
        <TableHeaderCell>
          {draft.basis === 'pct' ? t('rfx.award.col.share') : t('rfqCompare.award.qty')}
        </TableHeaderCell>
        <TableHeaderCell>
          {draft.basis === 'pct' ? t('rfqCompare.award.qty') : t('rfx.award.col.share')}
        </TableHeaderCell>
      </TableHeader>
      <tbody>
        {bids.map((bid) => (
          <AwardBidRow key={bid.key} {...props} bid={bid} />
        ))}
        {bids.length === 0 && (
          <EmptyRow colSpan={4} testId={`award-item-empty-${item.key}`}>
            {t('rfqCompare.cmp.noQuotes')}
          </EmptyRow>
        )}
      </tbody>
    </Table>
  );
};
