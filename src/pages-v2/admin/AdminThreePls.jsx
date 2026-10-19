/** @import React from 'react' */
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TrackingNumber from '@components/ui-v2/TrackingNumber';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDateTime } from '@lib/format';
import { useThreePlSet } from '@services/query/commandHooks';
/** @import { ThreePl } from '@services/transitions/threePlStore' */
import { threePlIdFor, threePlStore, trackingUrlFor } from '@services/transitions/threePlStore';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · 3PL TRACKING LINKS — BL-51, REQ-E07-04 BR-05 (ADM persona).
//
// Reached from the user menu, not the main menu (NV-01): administration is not
// a working area.
//
//   · THE LIST, marked "Sample data": the 3PLs and their `.example` addresses
//     are illustrative. Each row carries an example link built by the SAME
//     resolver every ASN surface uses, so what the administrator tries here is
//     exactly what a planner clicks on an ASN.
//   · ONE FORM, and it is the only entrance to `t_threepl_set`. The row buttons
//     only PRE-FILL it; the gate sits on the form (§84: gate the mode, not the
//     door). A seat without `threepl:maintain` reads everything and is told
//     whose act a change is — the wait, never a missing button.
//   · THE CHANGES ON RECORD, with who and when — including the honest "not
//     attributed", because the platform cannot name a person.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

/**
 * @typedef {object} Draft
 * @property {string | null} editing -  The 3PL being changed, or null for a new one (its id comes from the name).
 * @property {string} name
 * @property {string} trackingUrlPattern
 * @property {boolean} active
 */

/** @type {Draft} */
const EMPTY_DRAFT = { editing: null, name: '', trackingUrlPattern: '', active: true };

/** @type {React.FC} */
const AdminThreePls = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const setThreePl = useThreePlSet();
  const availability = useVerbAvailability('threepl:maintain');
  const held = availability.kind === 'held';
  const version = useSyncExternalStore(
    threePlStore.subscribe,
    threePlStore.version,
    threePlStore.version
  );
  const formRef = useRef(/** @type {HTMLElement | null} */ (null));

  const list = useMemo(() => threePlStore.all(), [version]);
  const changes = useMemo(() => [...threePlStore.changes()].reverse(), [version]);
  const offered = list.filter((r) => r.active).length;

  const [draft, setDraft] = useState(/** @type {Draft} */ (EMPTY_DRAFT));
  const draftId = draft.editing ?? threePlIdFor(draft.name);
  const preview = trackingUrlFor(draftId, t('tpl.example.number'), [
    {
      id: draftId,
      name: draft.name,
      trackingUrlPattern: draft.trackingUrlPattern,
      active: draft.active
    }
  ]);

  /** @param {ThreePl} row */
  const edit = (row) => {
    setDraft({
      editing: row.id,
      name: row.name,
      trackingUrlPattern: row.trackingUrlPattern,
      active: row.active
    });
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    const name = draft.name.trim();
    const result = await setThreePl.mutateAsync({
      threePlId: draftId,
      name,
      trackingUrlPattern: draft.trackingUrlPattern.trim(),
      active: draft.active
    });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title: refusalText(result.reason) ?? t('tpl.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title: t(draft.editing ? 'tpl.toast.saved' : 'tpl.toast.added', { name })
    });
    setDraft(EMPTY_DRAFT);
  };

  const CRUMB = [t('tpl.crumb.administration'), t('tpl.crumb.page')];
  /** @param {string} id */
  const nameOf = (id) => list.find((r) => r.id === id)?.name ?? id;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={CRUMB} title={t('tpl.title')} subtitle={t('tpl.subtitle')} />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid="tpl-meta">
          {t('tpl.meta.count', { count: list.length })} ·{' '}
          {t('tpl.meta.offered', { count: offered })}
        </span>
        {/* The 3PLs and their addresses are illustrative (SC-04). */}
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <AdminSectionNav />

      {/* ── The one entrance to the verb ─────────────────────────────────── */}
      {held ? (
        <section
          ref={formRef}
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="tpl-form"
        >
          <h2 className="text-section text-text-primary">
            {draft.editing
              ? t('tpl.form.title.edit', { name: nameOf(draft.editing) })
              : t('tpl.form.title.add')}
          </h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('tpl.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('tpl.form.name')}
                </span>
                <input
                  className={INPUT_CLASS}
                  data-testid="tpl-name"
                  aria-label={t('tpl.form.name')}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  required
                />
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('tpl.form.pattern')}
                </span>
                <input
                  className={`${INPUT_CLASS} font-mono`}
                  data-testid="tpl-pattern"
                  aria-label={t('tpl.form.pattern')}
                  placeholder={t('tpl.form.patternPlaceholder')}
                  value={draft.trackingUrlPattern}
                  onChange={(e) => setDraft((d) => ({ ...d, trackingUrlPattern: e.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="accent-action"
                data-testid="tpl-active"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              {t('tpl.form.offered')}
            </label>
            {preview && (
              <p className="text-xs text-text-secondary break-all" data-testid="tpl-preview">
                {t('tpl.form.preview', { url: preview })}
              </p>
            )}
            <p className="text-xs text-text-tertiary" data-testid="tpl-attribution">
              {t('tpl.form.attribution')}
            </p>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={setThreePl.isPending}
                data-testid="tpl-submit"
              >
                {draft.editing ? t('tpl.form.submit.edit') : t('tpl.form.submit.add')}
              </Button>
              {(draft.editing !== null || draft.name !== '' || draft.trackingUrlPattern !== '') && (
                <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_DRAFT)}>
                  {t('tpl.form.cancel')}
                </Button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="tpl-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{t('tpl.gate.title')}</span>
              <HandoffNotice availability={availability} testId="handoff-threepl-maintain" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('tpl.gate.body')}</p>
          </div>
        </section>
      )}

      {/* ── The list ─────────────────────────────────────────────────────── */}
      <section className="mb-5" data-testid="tpl-list">
        <h2 className="text-section text-text-primary">{t('tpl.list.title')}</h2>
        <p className="text-xs text-text-secondary mt-1 mb-3">{t('tpl.sample.note')}</p>
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('tpl.col.name')}</TableHeaderCell>
              <TableHeaderCell>{t('tpl.col.pattern')}</TableHeaderCell>
              <TableHeaderCell>{t('tpl.col.offered')}</TableHeaderCell>
              <TableHeaderCell>{t('tpl.col.try')}</TableHeaderCell>
              {held && <TableHeaderCell>{t('tpl.col.action')}</TableHeaderCell>}
            </TableHeader>
            <tbody>
              {list.map((r) => (
                <TableRow key={r.id} data-testid={`tpl-row-${r.id}`}>
                  {/* i18n-defer: a 3PL's name is data, not UI copy */}
                  <TableCell className="text-sm text-text-primary">{r.name}</TableCell>
                  <TableCell className="text-xs break-all">
                    <Data>{r.trackingUrlPattern}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusPill variant={r.active ? 'success' : 'neutral'}>
                      {t(r.active ? 'tpl.offered.yes' : 'tpl.offered.no')}
                    </StatusPill>
                    {!r.active && (
                      <div className="text-[length:var(--fs-label-3)] text-text-tertiary mt-1">
                        {t('tpl.offered.noHint')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    <TrackingNumber
                      threePlId={r.id}
                      trackingNumber={t('tpl.example.number')}
                      testId={`tpl-try-${r.id}`}
                    />
                  </TableCell>
                  {held && (
                    <TableCell className="whitespace-nowrap">
                      <Button
                        type="button"
                        variant="secondary"
                        data-testid={`tpl-edit-${r.id}`}
                        onClick={() => edit(r)}
                      >
                        {t('tpl.action.edit')}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </section>

      {/* ── The changes on record ────────────────────────────────────────── */}
      <section data-testid="tpl-history">
        <h2 className="text-section text-text-primary mb-3">{t('tpl.history.title')}</h2>
        {changes.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="tpl-history-empty">
            {t('tpl.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('tpl.history.col.threePl')}</TableHeaderCell>
                <TableHeaderCell>{t('tpl.history.col.change')}</TableHeaderCell>
                <TableHeaderCell>{t('tpl.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('tpl.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {changes.map((c) => (
                  <TableRow key={`${c.id}-${c.setAt}`} data-testid={`tpl-change-${c.id}`}>
                    <TableCell className="text-sm text-text-primary">{c.name}</TableCell>
                    <TableCell className="text-xs text-text-secondary break-all">
                      <Data>{c.trackingUrlPattern}</Data> ·{' '}
                      {t(c.active ? 'tpl.offered.yes' : 'tpl.offered.no')}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {c.setBy.kind === 'RESOLVED'
                        ? c.setBy.person.displayName
                        : t('tpl.history.by.unattributed')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDateTime(c.setAt)}</Data>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

export default AdminThreePls;
