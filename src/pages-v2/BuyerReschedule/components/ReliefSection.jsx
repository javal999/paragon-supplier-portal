/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
/** @import { RescheduleProposalView } from '@services/data/types' */
import { WITHHELD_ID } from '../const';
import ProposalTable from './ProposalTable';
/** @import { ProposalActionContext } from './ProposalAction' */

/**
 * @typedef {object} ReliefSectionProps
 * @property {readonly RescheduleProposalView[]} relief the ranked relief proposals
 * @property {boolean} withheld the engine dataset is not live (X-03): say once why the acts are off
 * @property {number} freeCount how many relief proposals need no supplier agreement
 * @property {() => void} onSelectFree select every relief proposal that needs no supplier agreement
 * @property {() => void} onClear clear the selection
 * @property {ReadonlySet<string>} selected the selected proposal ids
 * @property {(id: string) => void} onToggle select or unselect one proposal
 * @property {ProposalActionContext} action what each row's act needs
 */

/**
 * The relief proposals, ranked by net saving: the one line saying why the acts
 * are off on sample data, the selection buttons, and the selectable table — or
 * the empty line when nothing relieves the warehouse.
 * @type {React.FC<ReliefSectionProps>}
 */
const ReliefSection = ({
  relief,
  withheld,
  freeCount,
  onSelectFree,
  onClear,
  selected,
  onToggle,
  action
}) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="rs-relief"
    >
      <h2 className="text-section text-text-primary mb-1">{t('rs.relief.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('rs.relief.intro')}</p>
      {relief.length === 0 ? (
        <p className="text-sm text-text-tertiary py-6 text-center" data-testid="rs-relief-empty">
          {t('rs.relief.empty')}
        </p>
      ) : (
        <>
          {!!withheld && (
            <p
              id={WITHHELD_ID}
              className="text-xs text-warning-hover mb-2"
              data-testid="rs-actions-withheld"
            >
              {t('rs.relief.withheld')}
            </p>
          )}
          <p className="text-xs text-text-secondary mb-2" data-testid="rs-select-hint">
            {t('rs.relief.selectHint')}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button variant="outline" onClick={onSelectFree} data-testid="rs-select-free">
              {t('rs.relief.selectFree', { count: freeCount })}
            </Button>
            <Button variant="secondary" onClick={onClear} data-testid="rs-select-clear">
              {t('rs.relief.clear')}
            </Button>
          </div>
          <ProposalTable
            rows={relief}
            selectable
            testPrefix="rs-relief"
            selected={selected}
            onToggle={onToggle}
            action={action}
          />
        </>
      )}
    </section>
  );
};

export default ReliefSection;
