// ────────────────────────────────────────────────────────────────────────────
// B2 · THE BUYER REVIEW LANE — the surface over B1's machine.
//
// B1 shipped `supplierApplication` wired and HEADLESS: three review verbs that
// dispatched and that no screen offered. `/buyer/process-flows` said so in two
// words — **NO READ SURFACE** — and that badge is derived, so this page is what
// retires it rather than an edit to a label.
//
// ── ⚠️ THE SEGREGATION RENDERS, AND THIS PAGE MUST NOT COLLAPSE IT ──────────
//
// `application:submit` is `procurement`'s; `application:review` and
// `application:decide` are `compliance`'s (derived — `/buyer/roles` draws it
// today). So a seat holding review but NOT decide is a real seat, and it must
// see the review act live and a NOTICE on the two decision acts — never an
// absent affordance, and never a live button the dispatcher would refuse.
//
// Availability is per-verb, from each verb's own atom, through
// `useVerbAvailabilities`. There is no page-level gate: a page-level one would
// be exactly the collapse.
//
// ── ⚠️ `t_application_submit` IS HERE AS OF B3, AND IT IS GATED SEPARATELY ──
//
// B2 left it out on the ground that B3 was blocked by an identifier-space
// mismatch. Measured, that block was not real: the `1000456` space `/register`
// taught in a placeholder holds ZERO rows anywhere in this tree, so there were
// never two populated spaces to reconcile — one space (`sapBpNumber`), and a
// copy defect. The door therefore RESOLVES against the roster rather than
// teaching a format, and the eight strings that taught it are deleted.
//
// ⚠️ **IT IS A THIRD AVAILABILITY, NOT A THIRD BUTTON UNDER THE SAME GATE.**
// `application:submit` is `procurement`'s and the two review atoms are
// `compliance`'s, so the default buyer seat holds all three and a page-level
// gate would look identical — right up until somebody holds one lane. This is
// exactly `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`: the create verb acts on
// NO SELECTED DOCUMENT and lives in the page header, so it is invisible to any
// derivation that walks the panel's verbs.
//
// ⚠️ **AND THE GATE IS ON THE MODE, NOT THE DOOR (§84).** The raise panel's
// body is gated as well as the button that opens it — a seat narrowed WHILE
// the panel stands open is reachable, not a dead branch.
//
// ── ⚠️ CONFIRM BEFORE COMMIT, AND THE TWO ENDINGS DIFFER ────────────────────
//
// Both decisions are terminal and neither can be undone, so both confirm. The
// asymmetry is the reason: a refusal REQUIRES authored text (the verb refuses
// without it, and `APPLICATION_REFUSAL_AUTHORED` refuses a blank one), because
// the applicant holds no seat here and that text is the only account of the
// decision that will ever exist. Approval needs no text and is not given a box
// to type in — a field nobody must fill is a field somebody will.
//
// The commit button is disabled until the reason is non-blank. That is a
// COURTESY MIRROR of the policy, not the policy: `APPLICATION_REFUSAL_AUTHORED`
// stands behind any caller that never renders this box.
//
// ── SidePanel (#280): a closed panel renders NOTHING ────────────────────────
// Every control below lives inside a panel that is only mounted when a row is
// selected, so a test must WALK TO THE STATE before asserting a control — and
// the confirm step is a further state inside it.
// ────────────────────────────────────────────────────────────────────────────
//
// ── PHASE 5 SPLIT ────────────────────────────────────────────────────────────
// The page is a folder: this file keeps the shell, the header (the CREATE
// verb's door), the read and every piece of state that must survive the
// loading/error states (tab, search, selection, confirm step, raise draft).
// The sections live in `components/`, the state and handlers in `hooks/`.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { FilePlus2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';

import { useSupplierApplications } from '@services/query/hooks';
import { useVerbAvailabilities } from '@hooks/useVerbAvailability';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { Tab } from './const' */
import { useApplicationReview } from './hooks/useApplicationReview';
import { useRaiseApplication } from './hooks/useRaiseApplication';
import ApplicationsList from './components/ApplicationsList';
import RaisePanel from './components/RaisePanel';
import ApplicationPanel from './components/ApplicationPanel';

/** @type {React.FC} */
const BuyerSupplierApplications = () => {
  const { t } = useTranslation();

  // ⚠️ TRANSLATED, AND BUILT INSIDE THE COMPONENT — the house convention every
  // other page follows, because `t` is only available here. It was a
  // module-level English literal until browser QA read the page in Indonesian
  // and found the one line still in English.
  const APPLICATIONS_CRUMB = [
    t('applications.crumb.acquire'),
    t('applications.crumb.applications')
  ];

  const { data, isLoading, isError, error } = useSupplierApplications();
  const applications = useMemo(() => data?.items ?? [], [data]);

  const [tab, setTab] = useState(/** @type {Tab} */ ('all'));
  const [search, setSearch] = useState('');

  const review = useApplicationReview(applications);
  const raise = useRaiseApplication();

  // ⚠️ ONE AVAILABILITY PER VERB, FROM THAT VERB'S OWN ATOM. `review` and
  // `decide` are separate questions and a seat can hold one without the other —
  // which is precisely the segregation `/buyer/roles` renders.
  const {
    submit: submitAvailability,
    review: reviewAvailability,
    decide: decideAvailability
  } = useVerbAvailabilities(
    /** @type {const} */ ({
      submit: 'application:submit',
      review: 'application:review',
      decide: 'application:decide'
    })
  );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={APPLICATIONS_CRUMB}
        title={t('applications.title')}
        subtitle={t('applications.subtitle')}
        actions={
          /* The CREATE verb, in the page header, acting on no selected row —
             the one shape a panel-walking derivation cannot see. Its own atom,
             its own notice, never the review gate. */
          submitAvailability.kind === 'held' ? (
            <Button
              variant="outline"
              onClick={() => raise.setRaiseOpen(true)}
              data-testid="application-raise-open"
            >
              <FilePlus2 size={16} className="mr-2" />
              {t('applications.raise.action')}
            </Button>
          ) : (
            <HandoffNotice availability={submitAvailability} testId="handoff-application-submit" />
          )
        }
      />
      <PageMetaLine className="-mt-6 mb-6">
        {t('applications.meta.note')}
        <ProvenanceMarker capability="supplierApplications" className="ml-3 align-middle" />
      </PageMetaLine>

      {isLoading && <LoadingState breadcrumb={APPLICATIONS_CRUMB} />}
      {isError && (
        <ErrorState
          breadcrumb={APPLICATIONS_CRUMB}
          title={t('applications.error.title')}
          error={error}
        />
      )}

      {!isLoading && !isError && (
        <ApplicationsList
          applications={applications}
          crumb={APPLICATIONS_CRUMB}
          tab={tab}
          onTabChange={setTab}
          search={search}
          onSearchChange={setSearch}
          onSelect={review.selectRow}
        />
      )}

      {/* ── B3 · THE DOOR. Its own panel, its own gate. ──────────────────── */}
      <RaisePanel raise={raise} submitAvailability={submitAvailability} />

      {/* #280 — mounted only when a row is selected. A closed panel is ABSENT. */}
      <ApplicationPanel
        review={review}
        reviewAvailability={reviewAvailability}
        decideAvailability={decideAvailability}
      />
    </AppShellV2>
  );
};

export default BuyerSupplierApplications;
