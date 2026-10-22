/** @import React from 'react' */
import { useMemo } from 'react';
import SidePanel from '@components/ui-v2/SidePanel';
import GuidedLesson from '@components/ui-v2/GuidedLesson';
import { HALAL_RENEWAL_STEPS, HALAL_RENEWAL_SOURCE } from '@lib/learn/halalRenewalWalkthrough';
import { useTranslation } from 'react-i18next';

/**
 * I3.4 (FORK-1=(c)) — the halal-renewal walkthrough. Read-only guidance; a
 * shared SIHALAL path (no per-document branching; the `certBasis` this once
 * named was deleted at D-A). The page owns `lessonOpen` because the
 * per-document "Renew" action AND the standalone "How to renew" entry both
 * open it; this component builds the translated steps and renders the panel.
 * Moved out of `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{ lessonOpen: boolean; setLessonOpen: (open: boolean) => void }>}
 */
const RenewalLessonPanel = ({ lessonOpen, setLessonOpen }) => {
  const { t } = useTranslation();
  const lessonSteps = useMemo(
    () =>
      HALAL_RENEWAL_STEPS.map((s) => ({
        id: s.id,
        icon: s.icon,
        title: t(s.titleKey),
        body: t(s.bodyKey)
      })),
    [t]
  );
  return (
    // I3.4 — the halal-renewal walkthrough, in a read-only SidePanel. No footer
    // actions here: GuidedLesson owns its own Back/Next/Done nav and has NO
    // submit path, so it can never look like a live renewal submission.
    <SidePanel
      open={lessonOpen}
      onClose={() => setLessonOpen(false)}
      title={t('learn.halalRenewal.title')}
    >
      <GuidedLesson
        steps={lessonSteps}
        labels={{
          back: t('learn.halalRenewal.nav.back'),
          next: t('learn.halalRenewal.nav.next'),
          done: t('learn.halalRenewal.nav.done'),
          step: (current, total) => t('learn.halalRenewal.nav.step', { current, total })
        }}
        disclaimer={t('learn.halalRenewal.disclaimer')}
        source={{
          href: HALAL_RENEWAL_SOURCE.href,
          label: t(HALAL_RENEWAL_SOURCE.labelKey)
        }}
        onDone={() => setLessonOpen(false)}
      />
    </SidePanel>
  );
};

export default RenewalLessonPanel;
