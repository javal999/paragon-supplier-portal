import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import Button from '@components/ui-v2/Button';

// ─────────────────────────────────────────────────────────────────────────────
// THE CONFIDENTIALITY GATE, as the supplier meets it. The event's content is
// not behind this card — the READ never delivered it (`rfxReadModel`), so there
// is nothing here to reveal by editing the page. Accepting dispatches the
// response save with `acceptConfidentiality`, and the store records the time.
// ─────────────────────────────────────────────────────────────────────────────

interface RfxConfidentialityGateProps {
  /** The buyer's terms. Absent = the standard wording. */
  terms?: string;
  onAccept: () => void;
  /** The seat may not answer, or the event is closed. */
  disabled: boolean;
  testId: string;
}

const RfxConfidentialityGate: React.FC<RfxConfidentialityGateProps> = ({ terms, onAccept, disabled, testId }) => {
  const { t } = useTranslation();
  return (
    <div className="border border-border-subtle rounded-lg bg-bg-hover px-4 py-4 space-y-3" data-testid={testId}>
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Lock size={16} aria-hidden />
        {t('rfxa.conf.title')}
      </div>
      <p className="text-sm text-text-secondary">{t('rfxa.conf.body')}</p>
      <blockquote className="text-sm text-text-primary border-l-2 border-border-subtle pl-3 whitespace-pre-line">
        {terms ?? t('rfxa.conf.standardTerms')}
      </blockquote>
      <Button variant="outline" disabled={disabled} onClick={onAccept} data-testid={`${testId}-accept`}>
        {t('rfxa.conf.accept')}
      </Button>
    </div>
  );
};

export default RfxConfidentialityGate;
