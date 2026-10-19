import { useState } from 'react';
/** @import React from 'react' */
import { RotateCcw } from 'lucide-react';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Button from '@components/ui-v2/Button';
import { useTranslation } from 'react-i18next';
import { WECHAT_BG, WECHAT_GREEN, WECHAT_SCENARIOS } from '../const';
/** @import { ScenarioId } from '../const' */
import WeChatFlow from './WeChatFlow';

/**
 * The WeChat tab: the banner, scenario chips, the WeChat phone frame (D-2
 * messenger chrome) and reset on the left; the WeChat process flow on the right.
 * A reply chip records the chosen reply, which shows that reply and the
 * scripted answer to it. Nothing is dispatched.
 */
/** @type {React.FC} */
const WeChatPanel = () => {
  const { t } = useTranslation();
  /** @type {{ id: ScenarioId; label: string }[]} */
  const scenarioOptions = [
    { id: 'po', label: t('supplierWhatsApp.wc.scenario.po') },
    { id: 'asn', label: t('supplierWhatsApp.wc.scenario.asn') },
    { id: 'inventory', label: t('supplierWhatsApp.wc.scenario.inventory') },
    { id: 'invoice', label: t('supplierWhatsApp.wc.scenario.invoice') }
  ];
  const [scenario, setScenario] = useState(/** @type {ScenarioId} */ ('po'));
  // The reply chip the supplier chose; null until they choose one.
  const [replied, setReplied] = useState(/** @type {string | null} */ (null));

  /** @param {ScenarioId} s */
  const switchScenario = (s) => {
    setScenario(s);
    setReplied(null);
  };

  const current = WECHAT_SCENARIOS[scenario];
  const answer = replied === null ? null : (current.successByReply?.[replied] ?? current.success);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-6">
      <div className="flex flex-col">
        <div className="bg-success-soft border-l-2 border-success rounded px-4 py-3 mb-4 text-xs text-text-secondary">
          <strong className="text-success">{t('supplierWhatsApp.wc.banner.label')}</strong>
          {t('supplierWhatsApp.wc.banner.text')}
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {t('supplierWhatsApp.common.chooseScenario')}
          </div>
          <FilterChipsBar options={scenarioOptions} value={scenario} onChange={switchScenario} />
        </div>

        <div className="rounded-[36px] p-3 shadow-2xl" style={{ background: '#1A1A1A' }}>
          <div className="flex justify-between px-4 pt-1 pb-2 text-[length:var(--fs-caption-1)] text-white">
            <span>09:00</span>
            <span>●●●</span>
          </div>
          <div
            className="flex items-center gap-2.5 px-4 py-2.5"
            style={{ background: WECHAT_GREEN }}
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-success">
              P
            </div>
            <div>
              <div className="text-white font-bold text-sm">Paragon Corp</div>
              <div className="text-white/80 text-[length:var(--fs-caption-1)]">
                Official Account · 企业账号
              </div>
            </div>
          </div>

          <div
            className="p-3 min-h-[260px] flex flex-col gap-2.5"
            style={{ background: WECHAT_BG }}
          >
            <div className="flex gap-2 items-start">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: WECHAT_GREEN }}
              >
                P
              </div>
              <div className="bg-white px-3 py-2 rounded-[0_10px_10px_10px] max-w-[75%] text-[length:var(--fs-label-3)] text-text-primary leading-relaxed whitespace-pre-line">
                {current.bot}
              </div>
            </div>
            {replied === null && (
              <div className="pl-9 flex gap-1.5 flex-wrap">
                {current.replies.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReplied(r)}
                    className="px-3 py-1 rounded-full text-[length:var(--fs-label-3)] font-semibold text-white border-0"
                    style={{ background: WECHAT_GREEN }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            {replied !== null && (
              <>
                <div className="flex justify-end">
                  <div
                    className="rounded-[10px_0_10px_10px] px-3 py-2 max-w-[70%] text-[length:var(--fs-label-3)] text-white"
                    style={{ background: WECHAT_GREEN }}
                  >
                    {replied}
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: WECHAT_GREEN }}
                  >
                    P
                  </div>
                  <div className="bg-white px-3 py-2 rounded-[0_10px_10px_10px] max-w-[75%] text-[length:var(--fs-label-3)] text-success leading-relaxed whitespace-pre-line font-semibold">
                    {answer}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-bg-hover px-3 py-2 rounded-b-3xl flex gap-2 items-center">
            <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[length:var(--fs-label-3)] text-text-tertiary">
              Type a message…
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-white"
              style={{ background: WECHAT_GREEN }}
            >
              +
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <Button variant="secondary" icon={RotateCcw} onClick={() => switchScenario(scenario)}>
            {t('supplierWhatsApp.action.resetConversation')}
          </Button>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-4">
          {t('supplierWhatsApp.wc.flow.title')}
        </h3>
        <WeChatFlow />
      </div>
    </div>
  );
};

export default WeChatPanel;
