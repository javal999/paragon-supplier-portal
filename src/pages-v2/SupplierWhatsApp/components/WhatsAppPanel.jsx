import { useEffect, useRef, useState } from 'react';
/** @import React from 'react' */
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import Button from '@components/ui-v2/Button';
import { useTranslation } from 'react-i18next';
import { BOT_REPLIES, FOLLOW_UP_REPLIES, SCENARIOS } from '../const';
/** @import { ScenarioId, SimMessage } from '../const' */
import { getTime } from '../utils';
import PhoneMockup from './PhoneMockup';
import WhatsAppFlow from './WhatsAppFlow';

// Chrome selector + capability + language labels are i18n keys resolved in-
// component via t(); the enum ids / flags stay as data. Scenario command tokens
// inside the capability descriptions (KONFIRMASI, STOK, …) live in the fragment
// values verbatim.
const CAP_KEYS = /** @type {const} */ ([
  'confirmPo',
  'submitAsn',
  'updateInventory',
  'requestDocs',
  'checkPayment',
  'reportDelays',
  'submitRfq',
  'getHelp'
]);

/** @type {{ flag: string; key: string }[]} */
const LANGUAGES = [
  { flag: '🇮🇩', key: 'id' },
  { flag: '🇺🇸', key: 'en' },
  { flag: '🇨🇳', key: 'zh' },
  { flag: '🇩🇪', key: 'de' },
  { flag: '🇸🇦', key: 'ar' },
  { flag: '🇧🇷', key: 'pt' }
];

/**
 * The WhatsApp tab: the scripted chat simulator (scenario chips, phone, reset)
 * on the left; the process flow, the bot's capabilities and its languages on the
 * right. Owns the conversation state. A reply adds the supplier's message, shows
 * the typing dots, then after 1.5s adds the scripted bot reply and any follow-up
 * chips. The pending reply belongs to the conversation that started it, so a
 * scenario switch, a reset or an unmount cancels it. Nothing is dispatched; no
 * message leaves the browser.
 */
/** @type {React.FC} */
const WhatsAppPanel = () => {
  const { t } = useTranslation();
  /** @type {{ id: ScenarioId; label: string }[]} */
  const scenarioOptions = [
    { id: 'po', label: t('supplierWhatsApp.wa.scenario.po') },
    { id: 'asn', label: t('supplierWhatsApp.wa.scenario.asn') },
    { id: 'inventory', label: t('supplierWhatsApp.wa.scenario.inventory') },
    { id: 'invoice', label: t('supplierWhatsApp.wa.scenario.invoice') }
  ];
  const [scenario, setScenario] = useState(/** @type {ScenarioId} */ ('po'));
  const [messages, setMessages] = useState(/** @type {SimMessage[]} */ (SCENARIOS.po.initial));
  const [quickReplies, setQuickReplies] = useState(
    /** @type {string[]} */ (SCENARIOS.po.quickReplies ?? [])
  );
  const [inputValue, setInputValue] = useState(
    /** @type {string} */ (SCENARIOS.po.inputDefault ?? '')
  );
  const [isTyping, setIsTyping] = useState(false);
  const [newMsgIds, setNewMsgIds] = useState(/** @type {Set<string>} */ (new Set()));
  // The scheduled bot reply, if one is pending.
  const replyTimer = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  const cancelPendingReply = () => {
    if (replyTimer.current !== null) clearTimeout(replyTimer.current);
    replyTimer.current = null;
  };

  // No reply may land on an unmounted panel.
  useEffect(() => cancelPendingReply, []);

  /** @param {ScenarioId} s */
  const switchScenario = (s) => {
    cancelPendingReply();
    setScenario(s);
    setMessages(SCENARIOS[s].initial);
    setQuickReplies(SCENARIOS[s].quickReplies ?? []);
    setInputValue(SCENARIOS[s].inputDefault ?? '');
    setIsTyping(false);
    setNewMsgIds(new Set());
  };

  /**
   * @param {'bot' | 'supplier'} from
   * @param {string} content
   * @returns {string}
   */
  const addMessage = (from, content) => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    /** @type {SimMessage} */
    const msg = { id, from, content, time: getTime() };
    setMessages((prev) => [...prev, msg]);
    setNewMsgIds((prev) => new Set([...prev, id]));
    return id;
  };

  /**
   * @param {string} text
   * @returns {string}
   */
  const getBotReply = (text) => {
    const replies = BOT_REPLIES[scenario];
    return replies[text] ?? replies.default ?? 'Terima kasih! 🙏';
  };

  /** @param {string} text */
  const handleReply = (text) => {
    if (isTyping) return;
    addMessage('supplier', text);
    setQuickReplies([]);
    setIsTyping(true);
    replyTimer.current = setTimeout(() => {
      replyTimer.current = null;
      setIsTyping(false);
      const reply = getBotReply(text);
      addMessage('bot', reply);
      const followUp = FOLLOW_UP_REPLIES[text];
      if (followUp) setQuickReplies(followUp);
    }, 1500);
  };

  /** @param {string} text */
  const handleSend = (text) => {
    if (!text.trim() || isTyping) return;
    handleReply(text.trim());
    setInputValue('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-6">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-1">
          {t('supplierWhatsApp.wa.simulator.title')}
        </h3>
        <p className="text-xs text-text-tertiary mb-4">
          {t('supplierWhatsApp.wa.simulator.subtitle')}
        </p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {t('supplierWhatsApp.common.chooseScenario')}
          </div>
          <FilterChipsBar options={scenarioOptions} value={scenario} onChange={switchScenario} />
        </div>

        <PhoneMockup
          scenarioId={scenario}
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onQuickReply={handleReply}
          onSend={handleSend}
          quickReplies={quickReplies}
          isTyping={isTyping}
          newMsgIds={newMsgIds}
        />

        <div className="text-center mt-4">
          <Button variant="secondary" icon={RotateCcw} onClick={() => switchScenario(scenario)}>
            {t('supplierWhatsApp.action.resetConversation')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
          <h3 className="text-section text-text-primary mb-4">
            {t('supplierWhatsApp.wa.flow.title')}
          </h3>
          <WhatsAppFlow />
        </section>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
          <h3 className="text-section text-text-primary">
            {t('supplierWhatsApp.wa.capabilities.title')}
          </h3>
          <p className="text-xs text-text-tertiary mb-4">
            {t('supplierWhatsApp.wa.capabilities.subtitle')}
          </p>
          <div className="flex flex-col gap-2">
            {CAP_KEYS.map((k) => (
              <div
                key={k}
                className="flex gap-3 items-start py-1.5 border-b border-border-subtle last:border-b-0"
              >
                <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {t(`supplierWhatsApp.cap.${k}.title`)}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {t(`supplierWhatsApp.cap.${k}.desc`)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
          <h3 className="text-section text-text-primary">
            {t('supplierWhatsApp.wa.languages.title')}
          </h3>
          <p className="text-xs text-text-tertiary mb-3">
            {t('supplierWhatsApp.wa.languages.subtitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <div
                key={l.key}
                className="flex items-center gap-1.5 bg-bg-hover border border-border-subtle rounded-full px-3 py-1"
              >
                <span className="text-base">{l.flag}</span>
                <span className="text-xs font-medium text-text-primary">
                  {t(`supplierWhatsApp.lang.${l.key}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default WhatsAppPanel;
