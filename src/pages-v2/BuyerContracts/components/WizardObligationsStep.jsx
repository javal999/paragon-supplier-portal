/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { ContractType } from '@data/mockContracts' */
/** @import { DraftContract, DraftObligation } from '../const' */
import { Plus } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { ownerLabel, typeLabel } from '../utils';

// i18n-defer: obligation-template seed titles. These strings are not just
// displayed — the selected title is stored verbatim as the obligation's
// `title` (and flows into the created contract / the Review + Selected tables),
// so they are seed DATA, not static scaffolding. Translating only the suggestion
// label would desync it from the stored/echoed value. Localize when obligations
// gain stable keys (real persistence), not in this string-sweep batch.
/** @type {Record< ContractType, { title: string; owner: 'Buyer' | 'Supplier' | 'Both' }[] >} */
const OBLIGATION_SUGGESTIONS = {
  Supply: [
    { title: 'Quarterly delivery performance report', owner: 'Supplier' },
    { title: 'Annual halal certificate renewal', owner: 'Supplier' },
    { title: 'Quality audit access', owner: 'Both' }
  ],
  Service: [
    { title: 'Monthly service review', owner: 'Both' },
    { title: 'SLA reporting', owner: 'Supplier' },
    { title: 'Annual contract review', owner: 'Both' }
  ],
  Framework: [
    { title: 'Quarterly volume review', owner: 'Both' },
    { title: 'Annual price benchmarking', owner: 'Buyer' },
    { title: 'Innovation pipeline review', owner: 'Supplier' }
  ],
  NDA: [
    { title: 'Annual confidentiality acknowledgment', owner: 'Both' },
    { title: 'Renewal decision before expiry', owner: 'Buyer' }
  ],
  Quality: [
    { title: 'Semi-annual on-site audit', owner: 'Both' },
    { title: 'Non-conformance closure SLA', owner: 'Supplier' },
    { title: 'Annual quality scorecard', owner: 'Both' }
  ],
  Pricing: [
    { title: 'Monthly price index publication', owner: 'Supplier' },
    { title: 'Quarterly business review', owner: 'Both' },
    { title: 'Annual price adjustment review', owner: 'Both' }
  ]
};

/**
 * @typedef {object} WizardObligationsStepProps
 * @property {DraftContract} draft The draft being collected.
 * @property {string} customObligationTitle The "add custom" input's text.
 * @property {(value: string) => void} setCustomObligationTitle
 * @property {(title: string, owner: DraftObligation['owner']) => void} toggleSuggestedObligation
 *   Adds or removes one suggested obligation by title.
 * @property {() => void} addCustomObligation Appends the custom title as a new row.
 * @property {(i: number) => void} removeObligation Removes the row at index `i`.
 * @property {<K extends keyof DraftObligation>(i: number, key: K, value: DraftObligation[K]) => void} updateObligation
 *   Sets one field of the row at index `i`.
 * @property {TFunction} t
 */

/**
 * Wizard step 3, "Obligations": the suggestions for the chosen contract type,
 * a custom-obligation input, and the table of selected obligations with an
 * owner, a due date and a remove action per row. `OBLIGATION_SUGGESTIONS`
 * lives here because this file `.map()`s it. Moved out of `BuyerContracts.jsx`
 * by the Phase 5 page split (no behaviour change).
 * @type {React.FC<WizardObligationsStepProps>}
 */
const WizardObligationsStep = ({
  draft,
  customObligationTitle,
  setCustomObligationTitle,
  toggleSuggestedObligation,
  addCustomObligation,
  removeObligation,
  updateObligation,
  t
}) => (
  <div className="space-y-5">
    {draft.type && (
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-2">
          {t('contracts.wizard.obl.suggestedFor', {
            type: typeLabel(t, draft.type)
          })}
        </h4>
        <div className="space-y-2">
          {OBLIGATION_SUGGESTIONS[/** @type {ContractType} */ (draft.type)].map((s) => {
            const selected = draft.obligations.some((o) => o.title === s.title);
            return (
              <label
                key={s.title}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  selected
                    ? 'bg-bg-surface border-action'
                    : 'bg-bg-surface border-border-subtle hover:border-action'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleSuggestedObligation(s.title, s.owner)}
                  className="mt-0.5 accent-teal"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{s.title}</div>
                  <div className="text-xs text-text-tertiary">
                    {t('contracts.wizard.obl.ownerLabel', {
                      owner: ownerLabel(t, s.owner)
                    })}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    )}

    <div>
      <h4 className="text-sm font-semibold text-text-primary mb-2">
        {t('contracts.wizard.obl.addCustom')}
      </h4>
      <div className="flex gap-2">
        <input
          type="text"
          aria-label={t('contracts.wizard.obl.addCustom')}
          value={customObligationTitle}
          onChange={(e) => setCustomObligationTitle(e.target.value)}
          placeholder={t('contracts.wizard.obl.customPlaceholder')}
          className="flex-1 bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
        <Button
          variant="secondary"
          icon={Plus}
          onClick={addCustomObligation}
          disabled={!customObligationTitle.trim()}
        >
          {t('contracts.wizard.obl.add')}
        </Button>
      </div>
    </div>

    {draft.obligations.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-2">
          {t('contracts.wizard.obl.selected', {
            count: draft.obligations.length
          })}
        </h4>
        <div className="relative min-w-0 border border-border-subtle rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs">
              <tr>
                <th className="text-left px-3 py-2">{t('contracts.wizard.obl.col.title')}</th>
                <th className="text-left px-3 py-2">{t('contracts.wizard.obl.col.owner')}</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">
                  {t('contracts.wizard.obl.col.dueDate')}
                </th>
                <th className="text-right px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {draft.obligations.map((o, i) => (
                <tr key={o.id} className="border-t border-border-subtle">
                  <td className="px-3 py-2 text-text-primary">{o.title}</td>
                  <td className="px-3 py-2">
                    <select
                      value={o.owner}
                      onChange={(e) =>
                        updateObligation(
                          i,
                          'owner',
                          /** @type {DraftObligation['owner']} */ (e.target.value)
                        )
                      }
                      className="bg-white border border-border-input rounded-md px-2 h-8 text-xs focus:outline-none focus:border-action"
                    >
                      <option value="Buyer">{t('contracts.owner.buyer')}</option>
                      <option value="Supplier">{t('contracts.owner.supplier')}</option>
                      <option value="Both">{t('contracts.owner.both')}</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={o.dueDate}
                      onChange={(e) => updateObligation(i, 'dueDate', e.target.value)}
                      className="bg-white border border-border-input rounded-md px-2 h-8 text-xs focus:outline-none focus:border-action"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeObligation(i)}
                      className="text-text-tertiary hover:text-danger text-xs"
                      aria-label={t('contracts.wizard.obl.removeAria')}
                    >
                      {t('contracts.wizard.obl.remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

export default WizardObligationsStep;
