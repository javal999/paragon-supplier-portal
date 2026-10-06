/** @import React from 'react' */
import { useMemo, useRef, useState } from 'react';
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
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDateTime } from '@lib/format';
import { useStockUpdateModes } from '@services/query/hooks';
import { useSupplierSetUpdateMode } from '@services/query/commandHooks';
import {
  STOCK_UPDATE_MODES,
  supplierUpdateModeRefusal
} from '@services/transitions/supplierOverlayRules';
/** @import { StockUpdateMode, SupplierStockUpdateMode, SupplierUpdateModeChange } from '@services/data/types' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · SUPPLIERS — Material A1 (MR-1 BR-02, AC-06; ADM persona).
//
// The 3PL page's shape, followed:
//   · ONE FORM, the only entrance to `t_supplier_set_update_mode`. The row
//     buttons only PRE-FILL it; the gate sits on the form (§84: gate the mode,
//     not the door). A seat without `supplier:set-update-mode` reads everything
//     and is told whose act a change is.
//   · THE TABLE: every supplier's mode as the ONE resolver answers it, and where
//     it came from — the administrator, or the sample connection list for a
//     supplier nobody has set (marked "Sample data").
//   · THE CHANGES ON RECORD, with who and when (AC-06), newest first.
//
// The pre-check calls the same rule the verb's policy hook calls (MAT-R2).
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

/**
 * @typedef {object} Draft
 * @property {string} supplierId
 * @property {StockUpdateMode} mode
 * @property {string} reason
 */

/** @type {Draft} */
const EMPTY_DRAFT = { supplierId: '', mode: 'manual', reason: '' };

/**
 * `seq`:  Position in the supplier's own history — stable, because it is append-only.
 *
 * @typedef {SupplierUpdateModeChange & {
 *     readonly supplierName: string;
 *     readonly seq: number;
 *   }} HistoryRow
 */

/** @type {React.FC} */
const AdminSuppliers = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const modes = useStockUpdateModes();
  const setMode = useSupplierSetUpdateMode();
  const availability = useVerbAvailability('supplier:set-update-mode');
  const held = availability.kind === 'held';
  const formRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [draft, setDraft] = useState(/** @type {Draft} */ (EMPTY_DRAFT));

  /** @type {readonly SupplierStockUpdateMode[]} */
  const rows = modes.data?.items ?? [];
  const history = /** @type {HistoryRow[]} */ (
    useMemo(
      () =>
        rows
          .flatMap((r) => r.history.map((c, seq) => ({ ...c, supplierName: r.supplierName, seq })))
          .sort((a, b) => b.setAt.localeCompare(a.setAt) || b.seq - a.seq),
      [rows]
    )
  );

  const CRUMB = [t('adminSup.crumb.administration'), t('adminSup.crumb.page')];
  if (modes.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (modes.isError)
    return <ErrorState breadcrumb={CRUMB} error={modes.error} onRetry={() => modes.refetch()} />;

  /** @param {StockUpdateMode} m */
  const modeLabel = (m) => t(`adminSup.mode.${m}`);
  /** @param {ActorAttribution} a */
  const byLabel = (a) =>
    a.kind === 'RESOLVED' ? a.person.displayName : t('adminSup.history.by.unattributed');
  const selected = rows.find((r) => r.supplierId === draft.supplierId);
  const precheck = supplierUpdateModeRefusal(draft.supplierId, draft.mode, (id) =>
    rows.some((r) => r.supplierId === id)
  );
  const onApi = rows.filter((r) => r.stockUpdateMode === 'api').length;

  /** @param {SupplierStockUpdateMode} row */
  const edit = (row) => {
    setDraft({ supplierId: row.supplierId, mode: row.stockUpdateMode, reason: '' });
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    if (precheck) return;
    const result = await setMode.mutateAsync({
      supplierId: draft.supplierId,
      stockUpdateMode: draft.mode,
      reason: draft.reason
    });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title:
          refusalText(result.reason) ?? t('adminSup.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title: t('adminSup.toast.saved', {
        name: selected?.supplierName ?? draft.supplierId,
        mode: modeLabel(draft.mode)
      })
    });
    setDraft(EMPTY_DRAFT);
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('adminSup.title')}
        subtitle={t('adminSup.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid="adminsup-meta">
          {t('adminSup.meta.count', { count: rows.length })} ·{' '}
          {t('adminSup.meta.api', { count: onApi })}
        </span>
        {/* The default for an unset supplier is the sample connection list. */}
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <AdminSectionNav />

      {/* ── The one entrance to the verb ─────────────────────────────────── */}
      {held ? (
        <section
          ref={formRef}
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="adminsup-form"
        >
          <h2 className="text-section text-text-primary">{t('adminSup.form.title')}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminSup.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('adminSup.form.supplier')}
                </span>
                <select
                  className={INPUT_CLASS}
                  data-testid="adminsup-supplier"
                  aria-label={t('adminSup.form.supplier')}
                  value={draft.supplierId}
                  onChange={(e) => setDraft((d) => ({ ...d, supplierId: e.target.value }))}
                >
                  <option value="">{t('adminSup.form.choose')}</option>
                  {rows.map((r) => (
                    // i18n-defer: a supplier's name is data, not UI copy
                    <option key={r.supplierId} value={r.supplierId}>
                      {r.supplierName}
                    </option>
                  ))}
                </select>
                {!!selected && (
                  <span className="text-xs text-text-tertiary" data-testid="adminsup-current">
                    {t('adminSup.form.current', { mode: modeLabel(selected.stockUpdateMode) })}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('adminSup.form.mode')}
                </span>
                <select
                  className={INPUT_CLASS}
                  data-testid="adminsup-mode"
                  aria-label={t('adminSup.form.mode')}
                  value={draft.mode}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      mode: /** @type {StockUpdateMode} */ (e.target.value)
                    }))
                  }
                >
                  {STOCK_UPDATE_MODES.map((m) => (
                    <option key={m} value={m}>
                      {modeLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('adminSup.form.reason')}
                </span>
                <input
                  className={INPUT_CLASS}
                  data-testid="adminsup-reason"
                  aria-label={t('adminSup.form.reason')}
                  placeholder={t('adminSup.form.reasonPlaceholder')}
                  value={draft.reason}
                  onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                />
              </label>
            </div>
            <p className="text-xs text-text-tertiary">{t('adminSup.form.attribution')}</p>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={setMode.isPending || precheck !== null}
                data-testid="adminsup-submit"
              >
                {t('adminSup.form.submit')}
              </Button>
              {draft.supplierId !== '' ? (
                <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_DRAFT)}>
                  {t('adminSup.form.cancel')}
                </Button>
              ) : null}
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="adminsup-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {t('adminSup.gate.title')}
              </span>
              <HandoffNotice
                availability={availability}
                testId="handoff-supplier-set-update-mode"
              />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminSup.gate.body')}</p>
          </div>
        </section>
      )}

      {/* ── The suppliers and their mode ─────────────────────────────────── */}
      <section className="mb-5" data-testid="adminsup-list">
        <h2 className="text-section text-text-primary">{t('adminSup.list.title')}</h2>
        <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminSup.list.sample')}</p>
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('adminSup.col.supplier')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSup.col.mode')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSup.col.source')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSup.col.lastChange')}</TableHeaderCell>
              {held ? <TableHeaderCell>{t('adminSup.col.action')}</TableHeaderCell> : null}
            </TableHeader>
            <tbody>
              {rows.map((r) => {
                const last = r.history[r.history.length - 1];
                return (
                  <TableRow key={r.supplierId} data-testid={`adminsup-row-${r.supplierId}`}>
                    <TableCell className="text-sm text-text-primary">
                      {/* i18n-defer: a supplier's name is data, not UI copy */}
                      <div>{r.supplierName}</div>
                      <Data className="text-xs">{r.supplierId}</Data>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusPill variant={r.stockUpdateMode === 'api' ? 'info' : 'neutral'}>
                        {modeLabel(r.stockUpdateMode)}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">
                      {t(
                        r.source === 'overlay'
                          ? 'adminSup.source.overlay'
                          : 'adminSup.source.default'
                      )}
                    </TableCell>
                    <TableCell
                      className="text-xs text-text-secondary"
                      data-testid={`adminsup-last-${r.supplierId}`}
                    >
                      {last ? (
                        <>
                          {byLabel(last.setBy)} · <Data>{formatDateTime(last.setAt)}</Data>
                        </>
                      ) : (
                        t('adminSup.lastChange.none')
                      )}
                    </TableCell>
                    {held ? (
                      <TableCell className="whitespace-nowrap">
                        <Button
                          type="button"
                          variant="secondary"
                          data-testid={`adminsup-edit-${r.supplierId}`}
                          onClick={() => edit(r)}
                        >
                          {t('adminSup.action.change')}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      </section>

      {/* ── The changes on record ────────────────────────────────────────── */}
      <section data-testid="adminsup-history">
        <h2 className="text-section text-text-primary mb-3">{t('adminSup.history.title')}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="adminsup-history-empty">
            {t('adminSup.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('adminSup.history.col.supplier')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSup.history.col.mode')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSup.history.col.reason')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSup.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSup.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {history.map((c) => (
                  <TableRow
                    key={`${c.supplierId}-${c.seq}`}
                    data-testid={`adminsup-change-${c.supplierId}`}
                  >
                    {/* i18n-defer: a supplier's name is data, not UI copy */}
                    <TableCell className="text-sm text-text-primary">{c.supplierName}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {modeLabel(c.stockUpdateMode)}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {/* i18n-defer: a reason the administrator typed is data */}
                      {c.reason ?? t('adminSup.history.noReason')}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {byLabel(c.setBy)}
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

export default AdminSuppliers;
