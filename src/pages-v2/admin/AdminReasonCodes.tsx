import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import AppShellV2 from '../../components/layout-v2/AppShellV2';
import PageHeader from '../../components/ui-v2/PageHeader';
import PageMetaLine from '../../components/ui-v2/PageMetaLine';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { useRefusalText } from '../../hooks/useRefusalText';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../lib/format';
import { useReasonCodeSet } from '../../services/query/commandHooks';
import {
  REASON_LISTS,
  builtInReasonLabels,
  reasonCodeFor,
  reasonCodeStore,
  type ReasonCodeEntry,
  type ReasonListId,
} from '../../services/transitions/reasonCodes';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · REASON CODES — BL-32 (§3.6 starter lists, ADM).
//
// The layout of the 3PL list (BL-51), the list page it most resembles:
//   · THE FOUR LISTS the tree holds as codes, each with its codes, both labels,
//     offered or retired, and where the code came from. Call-off and receipt
//     dispute reasons are free text in this build and are named as such.
//   · ONE FORM, the only entrance to `t_reasoncode_set`. Row buttons only
//     PRE-FILL it (rename; retire / offer again). There is no delete — a code
//     that answers carry stays readable on them, marked retired.
//   · A seat without `reasoncode:maintain` reads everything and gets the wait.
//   · THE CHANGES ON RECORD, old → new, with who and when.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

interface Draft {
  list: ReasonListId;
  /** The code being changed, or null for a new one (its code comes from the English label). */
  editing: string | null;
  labelEn: string;
  labelId: string;
  active: boolean;
}

const EMPTY_DRAFT: Draft = { list: 'poAdjust', editing: null, labelEn: '', labelId: '', active: true };

/** The labels a code shows now: the administrator's, else the shipped ones. */
const labelsOf = (e: ReasonCodeEntry): { en: string; id: string } => {
  if (e.labelEn !== undefined) return { en: e.labelEn, id: e.labelId ?? e.code };
  return builtInReasonLabels(e.list, e.code) ?? { en: e.code, id: e.code };
};

const AdminReasonCodes: React.FC = () => {
  const { t, i18n } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const setCode = useReasonCodeSet();
  const availability = useVerbAvailability('reasoncode:maintain');
  const held = availability.kind === 'held';
  const version = useSyncExternalStore(reasonCodeStore.subscribe, reasonCodeStore.version, reasonCodeStore.version);
  const formRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [refusal, setRefusal] = useState<string | null>(null);

  const lists = useMemo(() => REASON_LISTS.map((list) => ({ list, rows: reasonCodeStore.list(list) })), [version]);
  const changes = useMemo(() => [...reasonCodeStore.changes()].reverse(), [version]);
  const readState = useMemo(() => reasonCodeStore.readState(), [version]);
  const offered = lists.reduce((n, l) => n + l.rows.filter((r) => r.active).length, 0);
  const retired = lists.reduce((n, l) => n + l.rows.filter((r) => !r.active).length, 0);
  const label = (e: { en: string; id: string }) => (i18n.language === 'id' ? e.id : e.en);

  const draftCode = draft.editing ?? reasonCodeFor(draft.labelEn);

  const prefill = (e: ReasonCodeEntry, active: boolean) => {
    const l = labelsOf(e);
    setDraft({ list: e.list, editing: e.code, labelEn: l.en, labelId: l.id, active });
    setRefusal(null);
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const result = await setCode.mutateAsync({
      list: draft.list,
      code: draftCode,
      labelEn: draft.labelEn,
      labelId: draft.labelId,
      active: draft.active,
    });
    if (result.status === 'failed') {
      const text = refusalText(result.reason) ?? t('adminRsn.toast.refused', { reason: result.reason ?? '' });
      setRefusal(text);
      toast({ variant: 'error', title: text });
      return;
    }
    setRefusal(null);
    toast({
      variant: 'success',
      title: t('adminRsn.toast.saved', { label: i18n.language === 'id' ? draft.labelId : draft.labelEn, code: draftCode }),
    });
    setDraft({ ...EMPTY_DRAFT, list: draft.list });
  };

  const CRUMB = [t('adminCal.crumb.administration'), t('adminRsn.crumb')];

  return (
    <AppShellV2>
      <PageHeader breadcrumb={CRUMB} title={t('adminRsn.title')} subtitle={t('adminRsn.subtitle')} />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid="admin-rsn-meta">
          {t('adminRsn.meta.offered', { count: offered })} · {t('adminRsn.meta.retired', { count: retired })}
        </span>
      </PageMetaLine>

      <AdminSectionNav />

      <p className="mb-5 text-xs text-text-secondary" data-testid="admin-rsn-free-text">
        {t('adminRsn.meta.freeText')}
      </p>

      {refusal && (
        <section
          role="alert"
          className="mb-5 rounded-lg border border-danger/30 bg-danger-soft p-4 flex gap-3"
          data-testid="admin-rsn-refusal"
        >
          <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{refusal}</p>
        </section>
      )}
      {readState.unreadable && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-rsn-store-unreadable"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">{t('adminRsn.store.unreadableTitle')}</div>
            <p className="text-xs text-text-secondary mt-1">{t('adminRsn.store.unreadableBody')}</p>
          </div>
        </section>
      )}
      {readState.rejected.length > 0 && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-rsn-store-rejected"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">{t('adminRsn.store.rejectedTitle')}</div>
            <p className="text-xs text-text-secondary mt-1">{t('adminRsn.store.rejectedBody')}</p>
            <ul className="text-xs text-text-secondary mt-1 list-disc pl-4">
              {readState.rejected.map((r) => (
                <li key={`${r.row}-${r.reason}`}>
                  <Data>{r.row}</Data>: {r.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── The one entrance to the verb ─────────────────────────────────── */}
      {held ? (
        <section
          ref={formRef}
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="admin-rsn-form"
        >
          <h2 className="text-section text-text-primary">{t('adminRsn.form.title')}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminRsn.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">{t('adminRsn.form.list')}</span>
                <select
                  className={INPUT_CLASS}
                  data-testid="admin-rsn-list"
                  value={draft.list}
                  disabled={draft.editing !== null}
                  onChange={(e) => setDraft({ ...EMPTY_DRAFT, list: e.target.value as ReasonListId })}
                >
                  {REASON_LISTS.map((l) => (
                    <option key={l} value={l}>
                      {t(`adminRsn.list.${l}`)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t(draft.editing ? 'adminRsn.form.code' : 'adminRsn.form.newCode')}
                </span>
                <div className="mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-bg-hover" data-testid="admin-rsn-code">
                  <Data>{draft.editing || draft.labelEn.trim() ? draftCode : '—'}</Data>
                </div>
                {!draft.editing && (
                  <span className="block text-[11px] text-text-tertiary mt-0.5">{t('adminRsn.form.codeHint')}</span>
                )}
              </div>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">{t('adminRsn.form.labelEn')}</span>
                <input
                  className={INPUT_CLASS}
                  data-testid="admin-rsn-label-en"
                  value={draft.labelEn}
                  onChange={(e) => setDraft((d) => ({ ...d, labelEn: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">{t('adminRsn.form.labelId')}</span>
                <input
                  className={INPUT_CLASS}
                  data-testid="admin-rsn-label-id"
                  value={draft.labelId}
                  onChange={(e) => setDraft((d) => ({ ...d, labelId: e.target.value }))}
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                data-testid="admin-rsn-active"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              {t('adminRsn.form.active')}
            </label>
            <p className="text-xs text-text-tertiary" data-testid="admin-rsn-attribution">
              {t('adminRsn.form.attribution')}
            </p>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={setCode.isPending} data-testid="admin-rsn-submit">
                {t('adminRsn.form.submit')}
              </Button>
              {(draft.editing !== null || draft.labelEn !== '' || draft.labelId !== '') && (
                <Button type="button" variant="secondary" onClick={() => setDraft({ ...EMPTY_DRAFT, list: draft.list })}>
                  {t('adminRsn.form.cancel')}
                </Button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="admin-rsn-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{t('adminRsn.gate.title')}</span>
              <HandoffNotice availability={availability} testId="handoff-reasoncode-maintain" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminRsn.gate.body')}</p>
          </div>
        </section>
      )}

      {/* ── The lists ────────────────────────────────────────────────────── */}
      {lists.map(({ list, rows }) => (
        <section key={list} className="mb-5" data-testid={`admin-rsn-list-${list}`}>
          <h2 className="text-section text-text-primary">{t(`adminRsn.list.${list}`)}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-2">{t(`adminRsn.list.${list}.hint`)}</p>
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('adminRsn.col.code')}</TableHeaderCell>
                <TableHeaderCell>{t('adminRsn.col.labelEn')}</TableHeaderCell>
                <TableHeaderCell>{t('adminRsn.col.labelId')}</TableHeaderCell>
                <TableHeaderCell>{t('adminRsn.col.status')}</TableHeaderCell>
                <TableHeaderCell>{t('adminRsn.col.source')}</TableHeaderCell>
                {held && <TableHeaderCell>{t('adminRsn.col.action')}</TableHeaderCell>}
              </TableHeader>
              <tbody>
                {rows.map((e) => {
                  const l = labelsOf(e);
                  const source = !e.builtIn
                    ? 'adminRsn.source.added'
                    : e.labelEn !== undefined
                      ? 'adminRsn.source.renamed'
                      : 'adminRsn.source.starter';
                  return (
                    <TableRow key={e.code} data-testid={`admin-rsn-row-${list}-${e.code}`}>
                      <TableCell className="whitespace-nowrap">
                        <Data>{e.code}</Data>
                      </TableCell>
                      <TableCell className="text-sm">{l.en}</TableCell>
                      <TableCell className="text-sm">{l.id}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusPill variant={e.active ? 'success' : 'neutral'}>
                          {t(e.active ? 'adminRsn.status.offered' : 'adminRsn.status.retired')}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">{t(source)}</TableCell>
                      {held && (
                        <TableCell className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              data-testid={`admin-rsn-rename-${list}-${e.code}`}
                              onClick={() => prefill(e, e.active)}
                            >
                              {t('adminRsn.action.rename')}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              data-testid={`admin-rsn-toggle-${list}-${e.code}`}
                              onClick={() => prefill(e, !e.active)}
                            >
                              {t(e.active ? 'adminRsn.action.retire' : 'adminRsn.action.offer')}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </section>
      ))}

      {/* ── The changes on record ────────────────────────────────────────── */}
      <section data-testid="admin-rsn-history">
        <h2 className="text-section text-text-primary mb-3">{t('adminRsn.history.title')}</h2>
        {changes.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="admin-rsn-history-empty">
            {t('adminRsn.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('adminRsn.history.col.code')}</TableHeaderCell>
                <TableHeaderCell>{t('adminRsn.history.col.change')}</TableHeaderCell>
                <TableHeaderCell>{t('adminRsn.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('adminRsn.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {changes.map((c, i) => {
                  const before = c.previous
                    ? `${label(
                        c.previous.labelEn !== undefined
                          ? { en: c.previous.labelEn, id: c.previous.labelId ?? c.code }
                          : builtInReasonLabels(c.list, c.code) ?? { en: c.code, id: c.code },
                      )} · ${t(c.previous.active ? 'adminRsn.status.offered' : 'adminRsn.status.retired')}`
                    : t('adminRsn.history.added');
                  const after = `${label({ en: c.labelEn, id: c.labelId })} · ${t(
                    c.active ? 'adminRsn.status.offered' : 'adminRsn.status.retired',
                  )}`;
                  return (
                    <TableRow key={`${c.list}-${c.code}-${c.setAt}-${i}`} data-testid={`admin-rsn-change-${c.list}-${c.code}`}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {t(`adminRsn.list.${c.list}`)} · <Data>{c.code}</Data>
                      </TableCell>
                      <TableCell className="text-sm">
                        {before} → {after}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {c.setBy.kind === 'RESOLVED' ? c.setBy.person.displayName : t('adminRsn.by.unattributed')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Data>{formatDateTime(c.setAt)}</Data>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

export default AdminReasonCodes;
