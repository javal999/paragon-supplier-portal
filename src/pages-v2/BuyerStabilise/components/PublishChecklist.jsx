/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import StatusPill from '@components/ui-v2/StatusPill';
/** @import { StabiliseRunView } from '@services/data/types' */
import { ITEM_VARIANT } from '../const';
import usePublishChecklist from '../hooks/usePublishChecklist';

/**
 * F-01 · evaluation §5 "Publish gate checklist". Four items, each with its state
 * and a link to the page that resolves it. Orders carry a number, not a status:
 * no "reviewed" flag exists, and none is invented (FUX2-R3).
 * `run` is the engine run (null before the plan loads); the items come from
 * `usePublishChecklist`.
 * @type {React.FC<{ run: StabiliseRunView | null }>}
 */
const PublishChecklist = ({ run }) => {
  const { t } = useTranslation();
  const items = usePublishChecklist(run);

  return (
    <div className="mb-4" data-testid="stb-checklist">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('stb.check.title')}</h3>
      <p className="text-xs text-text-tertiary mb-2">{t('stb.check.intro')}</p>
      <ul className="divide-y divide-border-subtle border border-border-subtle rounded">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
            data-testid={`stb-check-${item.id}`}
            data-state={item.state}
          >
            <span className="text-text-primary min-w-[12rem]">{t(`stb.check.${item.id}`)}</span>
            <StatusPill variant={ITEM_VARIANT[item.state]}>
              <span data-testid={`stb-check-${item.id}-state`}>{item.text}</span>
            </StatusPill>
            <Link
              to={item.to}
              className="text-action-hover hover:underline ml-auto"
              data-testid={`stb-check-${item.id}-link`}
              onClick={
                item.id === 'held'
                  ? () =>
                      document
                        .querySelector('[data-testid="stb-series"]')
                        ?.scrollIntoView?.({ behavior: 'smooth' })
                  : undefined
              }
            >
              {item.linkText}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PublishChecklist;
