import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { RfqTemplate } from '@services/sourcing/rfqTemplates' */
/** @import { RfqDraftSeed } from '../../rfqDraft' */
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SubTabs from '@components/ui-v2/SubTabs';
import { rfqTemplateStore } from '@services/sourcing/rfqTemplates';
import { seedFromRfq, seedFromTemplate } from '../../rfqDraft';
import { inputClass } from '../const';
import { refusalMessage } from '../utils';
import { Dialog } from './Dialog';

/**
 * The header "Templates" action: start from a template, or copy a past RFQ.
 * @type {React.FC<{ rfqs: readonly RFQ[]; onClose: () => void; onStart: (seed: RfqDraftSeed) => void; }>}
 */
export const TemplatePicker = ({ rfqs, onClose, onStart }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(/** @type {'templates' | 'copy'} */ ('templates'));
  const [search, setSearch] = useState('');
  const templates = rfqTemplateStore.all();
  const state = rfqTemplateStore.readState();
  /** @param {RfqTemplate} tpl */
  const nameOf = (tpl) => (tpl.nameKey ? t(tpl.nameKey) : (tpl.name ?? tpl.id));

  const past = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...rfqs]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .filter(
        (r) =>
          !q ||
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.projectName ?? '').toLowerCase().includes(q)
      );
  }, [rfqs, search]);

  return (
    <Dialog
      label={t('rfqAuthoring.template.picker.title')}
      testId="rfq-template-picker"
      onClose={onClose}
      wide
    >
      <SubTabs
        options={[
          { id: 'templates', label: t('rfqAuthoring.template.picker.fromTemplate') },
          { id: 'copy', label: t('rfqAuthoring.template.picker.copy') }
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />
      {tab === 'templates' ? (
        <div className="space-y-3">
          {state.unreadable && (
            <p role="alert" className="text-xs text-danger" data-testid="rfq-templates-unreadable">
              {t('rfqAuthoring.template.picker.unreadable')}
            </p>
          )}
          {state.rejected.map((r) => (
            <p
              key={r.id}
              role="alert"
              className="text-xs text-danger"
              data-testid="rfq-templates-rejected"
            >
              {t('rfqAuthoring.template.picker.rejected', {
                id: r.id,
                reason: refusalMessage(t, r.reason)
              })}
            </p>
          ))}
          <ul className="divide-y divide-border-subtle border border-border-subtle rounded-md">
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
                data-testid={`rfq-template-${tpl.id}`}
              >
                <div className="min-w-0">
                  <div className="text-sm text-text-primary">{nameOf(tpl)}</div>
                  <div className="text-xs text-text-tertiary">
                    {t(
                      tpl.system
                        ? 'rfqAuthoring.template.picker.system'
                        : 'rfqAuthoring.template.picker.saved'
                    )}{' '}
                    ·{' '}
                    {t('rfqAuthoring.template.picker.summary', {
                      items: tpl.content.items.length,
                      tiers: tpl.content.tiers.length
                    })}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onStart(seedFromTemplate(tpl, nameOf(tpl)))}
                  data-testid={`rfq-template-use-${tpl.id}`}
                >
                  {t('rfqAuthoring.template.picker.use')}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-tertiary">{t('rfqAuthoring.template.picker.storage')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">
            {t('rfqAuthoring.template.picker.copyHelp')}
          </p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('rfqAuthoring.template.picker.search')}
            aria-label={t('rfqAuthoring.template.picker.search')}
            className={inputClass}
          />
          {past.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              {t('rfqAuthoring.template.picker.noMatch')}
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle border border-border-subtle rounded-md max-h-80 overflow-y-auto">
              {past.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                  data-testid={`rfq-copy-${r.id}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      <Data>{r.rfqNumber}</Data> · {r.title}
                    </div>
                    {r.projectName && (
                      <div className="text-xs text-text-tertiary">
                        {t('rfqAuthoring.projectTag', { name: r.projectName })}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => onStart(seedFromRfq(r))}
                    data-testid={`rfq-copy-use-${r.id}`}
                  >
                    {t('rfqAuthoring.template.picker.copyThis')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
};
