/** @import React from 'react' */
import { WHATSAPP_BUBBLE } from '../const';
/** @import { SimMessage } from '../const' */
import FormatMsg from './FormatMsg';

/**
 * One WhatsApp chat bubble: left and white for the bot, right and green for the
 * supplier, with the time and (supplier only) the read ticks. `animateIn` plays
 * the slide-in for a message added this session.
 */
/** @type {React.FC<{ msg: SimMessage; animateIn?: boolean }>} */
const Bubble = ({ msg, animateIn }) => {
  const isBot = msg.from === 'bot';
  return (
    <div
      className={`flex flex-col mb-1.5 ${isBot ? 'items-start' : 'items-end'} ${animateIn ? 'wa-msg-in' : ''}`}
    >
      <div
        className="max-w-[82%] px-3 py-2 shadow-sm"
        style={{
          background: isBot ? '#FFFFFF' : WHATSAPP_BUBBLE,
          borderRadius: isBot ? '0 10px 10px 10px' : '10px 0 10px 10px'
        }}
      >
        <div className="text-xs text-text-primary leading-relaxed">
          <FormatMsg text={msg.content} />
        </div>
        <div className="flex justify-end items-center gap-1 mt-1">
          <span className="text-[9px] text-text-tertiary">{msg.time}</span>
          {!isBot && <span className="text-[length:var(--fs-caption-1)] text-info">✓✓</span>}
        </div>
      </div>
    </div>
  );
};

export default Bubble;
