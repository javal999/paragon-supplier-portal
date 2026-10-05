/** @import * as React from 'react' */
/** @import { LucideIcon } from 'lucide-react' */
import { Check } from 'lucide-react';
/**
 * @param {TimelineProps} props
 * @returns {React.ReactNode}
 */
const Timeline = ({ events, className = '' }) => {
  return (
    <ol className={`relative ${className}`}>
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        const Icon = event.icon;
        const connectorClass =
          event.status === 'completed'
            ? 'bg-action'
            : event.status === 'current'
              ? 'bg-gradient-to-b from-action to-border-subtle'
              : 'bg-border-subtle';
        /** @type {React.ReactNode} */
        let marker;
        if (event.status === 'completed') {
          marker = (
            <span className="relative z-10 w-3 h-3 rounded-full bg-action flex items-center justify-center">
              <Check size={8} className="text-white" strokeWidth={3} />
            </span>
          );
        } else if (event.status === 'current') {
          marker = (
            <span className="relative z-10 w-4 h-4 rounded-full bg-white border-2 border-action flex items-center justify-center">
              {Icon ? (
                <Icon size={8} className="text-action" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-action" />
              )}
            </span>
          );
        } else {
          marker = (
            <span className="relative z-10 w-3 h-3 rounded-full bg-bg-surface border-2 border-border-subtle" />
          );
        }
        return (
          <li key={event.id} className="flex gap-4 pb-5 last:pb-0">
            <div className="relative flex flex-col items-center w-4 shrink-0">
              <div className="flex items-center justify-center h-5">{marker}</div>
              {!isLast && <div className={`w-0.5 flex-1 ${connectorClass}`} />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`text-sm font-semibold ${
                    event.status === 'pending' ? 'text-text-tertiary' : 'text-text-primary'
                  }`}
                >
                  {event.title}
                </span>
                {event.timestamp ? (
                  <span className="text-xs text-text-tertiary">{event.timestamp}</span>
                ) : null}
              </div>
              {event.description ? (
                <p className="text-sm text-text-secondary mt-1">{event.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
export default Timeline;
/** @typedef {'completed' | 'current' | 'pending'} TimelineEventStatus */
/**
 * @typedef {Object} TimelineEvent
 * @property {string} id
 * @property {string} title
 * @property {string} [timestamp]
 * @property {TimelineEventStatus} status
 * @property {string} [description]
 * @property {LucideIcon} [icon]
 */
/**
 * @typedef {Object} TimelineProps
 * @property {TimelineEvent[]} events
 * @property {string} [className]
 */
