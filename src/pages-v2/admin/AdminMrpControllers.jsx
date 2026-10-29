/** @import React from 'react' */
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import LivenessPill from '@components/ui-v2/LivenessPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { knownMrpControllerCodes } from '@components/layout-v2/MyMrpControllerSelect';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDateTime } from '@lib/format';
import { useMrpControllerSet, useMrpControllerUnmap } from '@services/query/commandHooks';
import {
  mrpControllerRefusal,
  mrpControllerStore,
  mrpControllerUnmapRefusal,
  userLabelsOf
} from '@services/transitions/mrpControllerStore';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · MRP CONTROLLERS (PIC) — Material C4 (MR-5 BR-02).
//
// SAP gives each material an MRP controller code; the hub keeps WHO that code
// is. This page lists every code the hub knows — every code a material carries
// and every code on the list — with its name and the hub users behind it. An
// unmapped code says so: materials carrying it show the code only (BR-02), and
// a supplier sees no name for them.
//
//   · ONE FORM, the only entrance to `t_mrpcontroller_set`. The row buttons only
//     pre-fill it; the gate sits on the form (§84). A seat without
//     `mrpcontroller:manage` reads everything and is told whose act it is.
//   · The submit is disabled by the SAME rule the verb's policy hook calls
//     (`mrpControllerRefusal`, MAT-R2).
//   · BL-157 — "Remove mapping" on a mapped row, through its own governed verb
//     (`t_mrpcontroller_unmap`), after a confirm on the row. The confirm is
//     disabled by the verb's own rule (`mrpControllerUnmapRefusal`). The
//     removal is appended to the changes on record; nothing is erased.
//   · The changes on record, with who and when — "not attributed" included.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

/**
 * @typedef {object} Draft
 * @property {string} code
 * @property {string} name
 * @property {string} users -  One hub user label per line.
 */

/** @type {Draft} */
const EMPTY_DRAFT = { code: '', name: '', users: '' };

/** @type {React.FC} */
const AdminMrpControllers = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const setController = useMrpControllerSet();
  const unmapController = useMrpControllerUnmap();
  const [unmapping, setUnmapping] = useState(/** @type {string | null} */ (null));
  const availability = useVerbAvailability('mrpcontroller:manage');
  const held = availability.kind === 'held';
  const version = useSyncExternalStore(
    mrpControllerStore.subscribe,
    mrpControllerStore.version,
    mrpControllerStore.version
  );
  const formRef = useRef(/** @type {HTMLElement | null} */ (null));

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's change signal, so the memo re-reads the store
  const codes = useMemo(() => knownMrpControllerCodes(), [version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's change signal, so the memo re-reads the store
  const changes = useMemo(() => [...mrpControllerStore.changes()].reverse(), [version]);
  const mapped = codes.filter((c) => mrpControllerStore.get(c) !== undefined).length;

  const [draft, setDraft] = useState(/** @type {Draft} */ (EMPTY_DRAFT));
  const code = draft.code.trim().toUpperCase();
  const users = userLabelsOf(draft.users.split('\n'));
  const refusal = mrpControllerRefusal(code, draft.name, users);

  /** @param {string} c */
  const edit = (c) => {
    const row = mrpControllerStore.get(c);
    setDraft({ code: c, name: row?.name ?? '', users: (row?.userLabels ?? []).join('\n') });
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    if (refusal) return;
    const result = await setController.mutateAsync({
      code,
      name: draft.name.trim(),
      userLabels: users
    });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title:
          refusalText(result.reason) ?? t('mrpc.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({ variant: 'success', title: t('mrpc.toast.saved', { code }) });
    setDraft(EMPTY_DRAFT);
  };

  /** @param {string} c */
  const unmap = async (c) => {
    if (mrpControllerUnmapRefusal(c)) return;
    const result = await unmapController.mutateAsync({ code: c });
    setUnmapping(null);
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title:
          refusalText(result.reason) ?? t('mrpc.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({ variant: 'success', title: t('mrpc.toast.unmapped', { code: c }) });
  };

  const CRUMB = [t('mrpc.crumb.administration'), t('mrpc.crumb.page')];

  return (
    <AppShellV2>
      <PageHeader breadcrumb={CRUMB} title={t('mrpc.title')} subtitle={t('mrpc.subtitle')} />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid="mrpc-meta">
          {t('mrpc.meta.count', { count: codes.length })} ·{' '}
          {t('mrpc.meta.mapped', { count: mapped })}
        </span>
        {/* The names on the sample list are illustrative (SC-04). */}
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <AdminSectionNav />

      {held ? (
        <section
          ref={formRef}
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="mrpc-form"
        >
          <h2 className="text-section text-text-primary">{t('mrpc.form.title')}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('mrpc.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-3">
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('mrpc.form.code')}
                </span>
                <input
                  className={`${INPUT_CLASS} font-mono`}
                  data-testid="mrpc-code"
                  aria-label={t('mrpc.form.code')}
                  placeholder={t('mrpc.form.codePlaceholder')}
                  maxLength={3}
                  value={draft.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('mrpc.form.name')}
                </span>
                <input
                  className={INPUT_CLASS}
                  data-testid="mrpc-name"
                  aria-label={t('mrpc.form.name')}
                  placeholder={t('mrpc.form.namePlaceholder')}
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">
                {t('mrpc.form.users')}
              </span>
              <textarea
                className={INPUT_CLASS}
                rows={3}
                data-testid="mrpc-users"
                aria-label={t('mrpc.form.users')}
                placeholder={t('mrpc.form.usersPlaceholder')}
                value={draft.users}
                onChange={(e) => setDraft((d) => ({ ...d, users: e.target.value }))}
              />
            </label>
            <p className="text-xs text-text-tertiary">{t('mrpc.form.supplierSees')}</p>
            <p className="text-xs text-text-tertiary" data-testid="mrpc-attribution">
              {t('mrpc.form.attribution')}
            </p>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={refusal !== null || setController.isPending}
                data-testid="mrpc-submit"
              >
                {t('mrpc.form.submit')}
              </Button>
              {(draft.code !== '' || draft.name !== '' || draft.users !== '') && (
                <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_DRAFT)}>
                  {t('mrpc.form.cancel')}
                </Button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="mrpc-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{t('mrpc.gate.title')}</span>
              <HandoffNotice availability={availability} testId="handoff-mrpcontroller-manage" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('mrpc.gate.body')}</p>
          </div>
        </section>
      )}

      <section className="mb-5" data-testid="mrpc-list">
        <h2 className="text-section text-text-primary">{t('mrpc.list.title')}</h2>
        <p className="text-xs text-text-secondary mt-1 mb-3">{t('mrpc.list.note')}</p>
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>
                <span className="inline-flex items-center gap-2">
                  {t('mrpc.col.code')}
                  <LivenessPill capability="materialMasterSap" />
                </span>
              </TableHeaderCell>
              <TableHeaderCell>{t('mrpc.col.name')}</TableHeaderCell>
              <TableHeaderCell>{t('mrpc.col.users')}</TableHeaderCell>
              {held && <TableHeaderCell>{t('mrpc.col.action')}</TableHeaderCell>}
            </TableHeader>
            <tbody>
              {codes.map((c) => {
                const row = mrpControllerStore.get(c);
                return (
                  <TableRow key={c} data-testid={`mrpc-row-${c}`}>
                    <TableCell>
                      <Data className="text-sm font-bold">{c}</Data>
                    </TableCell>
                    <TableCell className="text-sm text-text-primary">
                      {/* i18n-defer: a controller's name is data, not UI copy */}
                      {row ? (
                        row.name
                      ) : (
                        <StatusPill variant="neutral">{t('mrpc.unmapped')}</StatusPill>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      {row ? (
                        row.userLabels.join(', ')
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TableCell>
                    {held && (
                      <TableCell className="whitespace-nowrap">
                        {unmapping === c ? (
                          <UnmapConfirm
                            code={c}
                            pending={unmapController.isPending}
                            onConfirm={() => void unmap(c)}
                            onCancel={() => setUnmapping(null)}
                          />
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              data-testid={`mrpc-edit-${c}`}
                              onClick={() => edit(c)}
                            >
                              {t(row ? 'mrpc.action.edit' : 'mrpc.action.map')}
                            </Button>
                            {!!row && (
                              <Button
                                type="button"
                                variant="secondary"
                                data-testid={`mrpc-unmap-${c}`}
                                onClick={() => setUnmapping(c)}
                              >
                                {t('mrpc.action.unmap')}
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      </section>

      <section data-testid="mrpc-history">
        <h2 className="text-section text-text-primary mb-3">{t('mrpc.history.title')}</h2>
        {changes.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="mrpc-history-empty">
            {t('mrpc.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('mrpc.col.code')}</TableHeaderCell>
                <TableHeaderCell>{t('mrpc.history.col.change')}</TableHeaderCell>
                <TableHeaderCell>{t('mrpc.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('mrpc.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {changes.map((c) => (
                  <TableRow key={`${c.code}-${c.setAt}`} data-testid={`mrpc-change-${c.code}`}>
                    <TableCell>
                      <Data>{c.code}</Data>
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      {c.unmapped
                        ? t('mrpc.history.unmapped')
                        : `${c.name} · ${c.userLabels.join(', ')}`}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {c.setBy.kind === 'RESOLVED'
                        ? c.setBy.person.displayName
                        : t('mrpc.history.by.unattributed')}
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

/**
 * BL-157 — the row's confirm before a mapping is removed; the confirm is gated by the verb's rule.
 * @type {React.FC<{ code: string; pending: boolean; onConfirm: () => void; onCancel: () => void }>}
 */
const UnmapConfirm = ({ code, pending, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col items-start gap-2 whitespace-normal"
      data-testid={`mrpc-unmap-confirm-${code}`}
    >
      <p className="text-xs text-text-secondary max-w-xs">{t('mrpc.unmap.warning', { code })}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || mrpControllerUnmapRefusal(code) !== null}
          data-testid={`mrpc-unmap-confirm-button-${code}`}
          onClick={onConfirm}
        >
          {t('mrpc.unmap.confirm')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('mrpc.form.cancel')}
        </Button>
      </div>
    </div>
  );
};

export default AdminMrpControllers;
