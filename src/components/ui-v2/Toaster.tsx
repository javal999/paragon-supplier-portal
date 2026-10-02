import React from 'react';
import Toast from './Toast';
import { useToast } from '@hooks/useToast';

const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToast();

  // BL-31 (WCAG 4.1.3): the container is ALWAYS rendered as a polite live
  // region. A live region that is inserted together with its content is often
  // not announced, so the old early `return null` meant a screen reader could
  // miss every "recorded" / "refused" toast — the only place several refusals
  // are reported. (Error toasts also carry role="alert" themselves.)
  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full sm:w-auto">
          <Toast
            id={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            duration={t.duration}
            onDismiss={dismiss}
          />
        </div>
      ))}
    </div>
  );
};

export default Toaster;
