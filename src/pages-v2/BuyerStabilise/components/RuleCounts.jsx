/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import { formatNumber } from '@lib/format';
/** @import { StabiliseRunView } from '@services/data/types' */
import { STABILISE_RULES } from '@services/engine/stabilise';

/**
 * The "which rule set the weeks" table: per stabilise rule, how many of the
 * latest weeks it set and how many it set across the replay.
 * `counts` and `replayCounts` are the run's totals for each rule.
 * @type {React.FC<{
 *   counts: StabiliseRunView['totals']['counts'];
 *   replayCounts: StabiliseRunView['totals']['replayCounts'];
 * }>}
 */
const RuleCounts = ({ counts, replayCounts }) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="stb-rules"
    >
      <h2 className="text-section text-text-primary mb-1">{t('stb.rules.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('stb.rules.intro')}</p>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('stb.rules.col.rule')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.rules.col.latest')}</TableHeaderCell>
          <TableHeaderCell>{t('stb.rules.col.replay')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {STABILISE_RULES.map((r) => (
            <TableRow key={r} data-testid={`stb-rule-row-${r}`}>
              <TableCell>{t(`stb.rule.${r}`)}</TableCell>
              <TableCell>
                <Data data-testid={`stb-count-${r}`}>{formatNumber(counts[r])}</Data>
              </TableCell>
              <TableCell>
                <Data className="text-text-secondary" data-testid={`stb-replay-${r}`}>
                  {formatNumber(replayCounts[r])}
                </Data>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </section>
  );
};

export default RuleCounts;
