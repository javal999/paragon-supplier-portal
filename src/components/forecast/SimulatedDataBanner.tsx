import React from 'react';
import { useTranslation } from 'react-i18next';
import { isLive, type Capability } from '@services/liveness';

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATED DATA BANNER — F-14 (Forecast UX phase 1, task A4).
//
// One wording on all 13 buyer forecast pages, in place of the two labels they
// carried ("Sample data" on three, "Synthetic data · awaiting the MDM SAP feed"
// on ten), so a planner no longer has to guess whether the two differ.
//
// Honesty stays derived (FUX-R3): a page that names a capability shows the
// banner only while the liveness registry says that capability is not live,
// so the banner cannot outlast the simulation and cannot be switched off by a
// caller. A page with no registry capability (the fixed-stock reconcile reads
// fixtures) always shows it.
// ─────────────────────────────────────────────────────────────────────────────

interface SimulatedDataBannerProps {
  /** The registry capability the page's figures come from, when it has one. */
  readonly capability?: Capability;
  readonly className?: string;
}

const SimulatedDataBanner: React.FC<SimulatedDataBannerProps> = ({ capability, className = '' }) => {
  const { t } = useTranslation();
  if (capability !== undefined && isLive(capability)) return null;
  return (
    <p
      role="note"
      data-testid="simulated-data-banner"
      className={`mb-3 flex items-center gap-2 rounded border border-warning/40 bg-warning-soft px-3 py-1.5 text-sm text-warning-hover ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full border border-warning" />
      {t('fux.banner')}
    </p>
  );
};

export default SimulatedDataBanner;
