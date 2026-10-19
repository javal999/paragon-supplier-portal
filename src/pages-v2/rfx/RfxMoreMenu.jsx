/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';

/**
 * One entry of the menu: its label and what choosing it does.
 * @typedef {{ key: string; label: string; onSelect: () => void }} RfxMenuItem
 */

/**
 * RFx UX 2A (B-10) — "More actions" at the end of an RFI or RFP actions row,
 * for the acts a buyer rarely takes ("Save as a template"), so they no longer
 * take prime space on every detail. Choosing an item closes the menu; Escape
 * closes it too.
 * @type {React.FC<{ items: readonly RfxMenuItem[]; testId: string }>}
 */
const RfxMoreMenu = ({ items, testId }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <Button
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
      >
        {t('rfx.actions.more')}
      </Button>
      {!!open && (
        <ul
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-[12rem] rounded-md border border-border-subtle bg-bg-surface py-1 shadow-md"
          data-testid={`${testId}-menu`}
        >
          {items.map((item) => (
            <li key={item.key} role="none">
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                data-testid={`${testId}-${item.key}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RfxMoreMenu;
