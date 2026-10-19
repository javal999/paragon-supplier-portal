import { useEffect, useRef } from 'react';
/** @import React from 'react' */
import { Phone, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SCENARIOS, WHATSAPP_BG, WHATSAPP_GREEN_DOT, WHATSAPP_GREEN_HEADER } from '../const';
/** @import { ScenarioId, SimMessage } from '../const' */
import Bubble from './Bubble';

/**
 * The WhatsApp phone frame (D-2 messenger chrome): the chat, the typing dots,
 * the quick-reply chips and the input row. State lives in `WhatsAppPanel`; this
 * component only scrolls the chat to the bottom when a message or the typing
 * indicator arrives. The input row shows only when the scenario has an
 * `inputDefault`.
 */
/**
 * @typedef {object} PhoneMockupProps
 * @property {ScenarioId} scenarioId
 * @property {SimMessage[]} messages
 * @property {string} inputValue
 * @property {(v: string) => void} setInputValue
 * @property {(text: string) => void} onQuickReply
 * @property {(text: string) => void} onSend
 * @property {string[]} quickReplies
 * @property {boolean} isTyping
 * @property {Set<string>} newMsgIds
 */

/** @type {React.FC<PhoneMockupProps>} */
const PhoneMockup = ({
  scenarioId,
  messages,
  inputValue,
  setInputValue,
  onQuickReply,
  onSend,
  quickReplies,
  isTyping,
  newMsgIds
}) => {
  const { t } = useTranslation();
  const chatRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const hasInput = SCENARIOS[scenarioId].inputDefault !== undefined;

  return (
    <div className="w-[300px] mx-auto">
      <div className="rounded-[36px] p-3 shadow-2xl" style={{ background: '#1A1A1A' }}>
        <div className="w-24 h-5 bg-[#1A1A1A] rounded-[10px] mx-auto mb-2" />
        <div className="overflow-hidden rounded-3xl" style={{ background: WHATSAPP_BG }}>
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ background: WHATSAPP_GREEN_HEADER }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: WHATSAPP_GREEN_DOT }}
            >
              PC
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white leading-tight">Paragon Corp ✅</div>
              <div className="text-[9px] text-white/70">Business Account</div>
            </div>
            <Phone size={14} className="text-white/80" />
          </div>

          <div ref={chatRef} className="h-[340px] overflow-y-auto px-2 py-2.5 flex flex-col">
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} animateIn={newMsgIds.has(m.id)} />
            ))}
            {isTyping && (
              <div className="flex items-start mb-1.5">
                <div className="bg-white rounded-[0_10px_10px_10px] px-3 py-2 shadow-sm flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="wa-typing-dot w-1.5 h-1.5 rounded-full bg-text-tertiary"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {quickReplies.length > 0 && !isTyping && (
            <div className="bg-bg-hover px-2 py-1.5 flex gap-1.5 flex-wrap border-t border-border-subtle">
              {quickReplies.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onQuickReply(r)}
                  className="px-2.5 py-1 rounded-full border text-[length:var(--fs-label-3)] font-semibold bg-white whitespace-nowrap"
                  style={{
                    borderColor: WHATSAPP_GREEN_DOT,
                    color: WHATSAPP_GREEN_HEADER
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <div className="bg-bg-hover px-2 py-1.5 flex gap-1.5 items-center border-t border-border-subtle">
            {hasInput ? (
              <>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-full bg-white text-[length:var(--fs-label-3)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => onSend(inputValue)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: WHATSAPP_GREEN_DOT }}
                  aria-label={t('supplierWhatsApp.aria.send')}
                >
                  <Send size={13} />
                </button>
              </>
            ) : (
              <div className="flex-1 px-3 py-1.5 rounded-full bg-white text-[length:var(--fs-label-3)] text-text-tertiary">
                Use quick reply buttons above ↑
              </div>
            )}
          </div>
        </div>
        <div className="w-20 h-1 bg-[#444] rounded mx-auto mt-2" />
      </div>
    </div>
  );
};

export default PhoneMockup;
