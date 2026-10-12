import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
import { X } from 'lucide-react';
import { useDialogFocus } from '@hooks/useDialogFocus';

/**
 * The modal frame both template dialogs share: overlay above the wizard, a titled
 * panel (`wide` for the picker) with a close button, and the BL-31 keyboard contract.
 * @type {React.FC<{ label: string; testId: string; onClose: () => void; wide?: boolean; children: React.ReactNode }>}
 */
export const Dialog = ({ label, testId, onClose, wide, children }) => {
  const { t } = useTranslation();
  // The shared modal keyboard contract (BL-31): focus moves in, Tab is trapped,
  // Escape closes, focus returns to the opener. It stacks, so this dialog opened
  // over the wizard is the one that owns the keys while it is open.
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  useDialogFocus(ref, true, onClose);
  return (
    // z-[60]: above the wizard's overlay (z-50), which "Save as template" opens over.
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(13,27,42,0.4)]">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={testId}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[85vh] overflow-y-auto bg-white rounded-lg border border-border-subtle p-5`}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-section text-text-primary">{label}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('rfqAuthoring.template.picker.close')}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
