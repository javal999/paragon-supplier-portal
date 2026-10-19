/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

/**
 * One entry of the section nav: the section's element id, its label key and
 * the count shown beside it.
 * @typedef {{ id: string; labelKey: string; count: string }} NavEntry
 */

/**
 * RFx UX 1C (B-01) — the sticky "Jump to" nav beside the RFQ event's sections,
 * each with its count. The router is a HashRouter, so a `#id` link would
 * change the route: each entry is a button that scrolls its section into view.
 * @type {React.FC<{ entries: readonly NavEntry[] }>}
 */
const EventSectionNav = ({ entries }) => {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('rfx.stage.jumpTo')}
      className="mb-4 lg:mb-0 lg:sticky lg:top-4 self-start bg-bg-surface border border-border-subtle rounded-lg p-2"
      data-testid="event-nav"
    >
      <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        {t('rfx.stage.jumpTo')}
      </p>
      <ul className="flex flex-wrap gap-1 lg:block lg:space-y-1">
        {entries.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm text-text-primary hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
              onClick={() => document.getElementById(e.id)?.scrollIntoView?.({ block: 'start' })}
              data-testid={`event-nav-${e.id}`}
            >
              <span>{t(e.labelKey)}</span>
              <span className="text-xs text-text-tertiary">{e.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default EventSectionNav;
