/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { commitmentDeadlineWorkingDays } from '@services/transitions/forecastConfig';

/**
 * A11y finding 19, supplier side — the Due column's rule, stated once and
 * visibly above the material tables so it is not read in every cell. The
 * working-day counts are the administrator's setting in force.
 * @type {React.FC}
 */
const DueRuleNote = () => {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-text-tertiary" data-testid="fc-sup-due-rule">
      {t('fc.pti.gaps.dueRuleNote', {
        due: t('fc.col.due'),
        rule: t('fc.col.dueRule', {
          firm: t('adminSet.unit.workingDays', {
            count: commitmentDeadlineWorkingDays().firm
          }),
          other: t('adminSet.unit.workingDays', {
            count: commitmentDeadlineWorkingDays().other
          })
        })
      })}
    </p>
  );
};

export default DueRuleNote;
