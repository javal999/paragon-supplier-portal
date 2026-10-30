/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import SubTabs from '@components/ui-v2/SubTabs';
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
import { useToast } from '@hooks/useToast';
import { formatDateTime } from '@lib/format';
import { useMaterialNames } from '@services/query/hooks';
/** @import { MaterialNameLoadOutcome } from '@services/query/commandHooks' */
import { useMaterialNameDecide, useMaterialNameLoad } from '@services/query/commandHooks';
/** @import { MaterialNameRow, MaterialNameState, SupplierMaterialName } from '@services/data/types' */
import {
  cleanSupplierMaterialNo,
  cleanTradeName,
  materialNameRejectRefusal,
  parseTradeNameCsv
} from '@services/transitions/materialNameRules';
import { MaterialNameStatePill, refusalKeyOf } from './tradeNameDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// MATERIALS · TRADE NAMES — Material C2 (MR-3 d, planner steps 1 to 3; BR-06).
//
// Every supplier trade name on an assigned material, filtered to "Awaiting
// approval" by default (kept in the address, ?state=). Material Planning
// approves, or rejects with a reason the supplier sees. Approving replaces the
// supplier's earlier approved name (at most one per material, BR-01).
//
// The bulk load takes a CSV of PTI code, supplier ID, trade name and supplier
// material number; each row is one `t_materialname_load`, approved on load and
// marked "Loaded by PTI". A row identical to the approved name changes nothing.
//
// Both acts need `materialname:review`; a seat without it reads the list and
// is told whose act it is (one notice per verb, in the verb's slot).
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'awaiting' | 'approved' | 'rejected' | 'all'} Filter */
/** @type {Record<Exclude<Filter, 'all'>, MaterialNameState>} */
const FILTER_STATE = {
  awaiting: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected'
};
/**
 * @param {string | null} v
 * @returns {v is Filter}
 */
const isFilter = (v) => v === 'awaiting' || v === 'approved' || v === 'rejected' || v === 'all';

/**
 * @typedef {{
 *     readonly row: MaterialNameRow;
 *     readonly name: SupplierMaterialName;
 *   }} Entry
 */

/**
 * Approve, or reject with a reason, one name awaiting approval.
 * @type {React.FC<{ entry: Entry }>}
 */
const DecideCell = ({ entry }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const decide = useMaterialNameDecide();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const code = entry.name.materialCode;

  /** @param {'approve' | 'reject'} decision */
  const act = async (decision) => {
    const result = await decide.mutateAsync({
      id: entry.name.id,
      decision,
      rejectionReason: reason
    });
    if (result.status === 'failed') {
      const key = refusalKeyOf(result.reason);
      toast({
        variant: 'error',
        title: key ? t(key) : t('matName.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title: t(decision === 'approve' ? 'matName.toast.approved' : 'matName.toast.rejected', {
        name: entry.name.tradeName
      })
    });
  };

  if (!rejecting)
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={decide.isPending}
          data-testid={`tn-approve-${entry.name.id}`}
          onClick={() => act('approve')}
        >
          {t('matName.action.approve')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-testid={`tn-reject-${entry.name.id}`}
          onClick={() => setRejecting(true)}
        >
          {t('matName.action.reject')}
        </Button>
      </div>
    );
  const refusal = materialNameRejectRefusal(reason);
  return (
    <div
      className="flex flex-col gap-2 min-w-[16rem]"
      data-testid={`tn-reject-form-${entry.name.id}`}
    >
      <textarea
        className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-white"
        rows={2}
        aria-label={t('matName.reject.reason', { code })}
        placeholder={t('matName.reject.placeholder')}
        data-testid={`tn-reject-reason-${entry.name.id}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {!!refusal && (
        <span className="text-xs text-text-tertiary">{t('matName.refusal.REASON_REQUIRED')}</span>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={refusal !== null || decide.isPending}
          data-testid={`tn-reject-confirm-${entry.name.id}`}
          onClick={() => act('reject')}
        >
          {t('matName.reject.confirm')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setRejecting(false)}>
          {t('matName.form.cancel')}
        </Button>
      </div>
    </div>
  );
};

/**
 * The bulk load: paste or choose a CSV, then load it (BR-06).
 * @type {React.FC<{ rows: readonly MaterialNameRow[] }>}
 */
const LoadPanel = ({ rows }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const load = useMaterialNameLoad();
  const [text, setText] = useState('');
  const [outcomes, setOutcomes] = useState(/** @type {MaterialNameLoadOutcome[] | null} */ (null));
  const parsed = useMemo(() => parseTradeNameCsv(text), [text]);

  /** @param {File | undefined} file */
  const readFile = (file) => {
    if (!file) return;
    void file.text().then((content) => {
      setText(content);
      setOutcomes(null);
    });
  };

  const run = async () => {
    // Rows that match the approved name already change nothing (BR-06); said so up front.
    const unchanged = parsed.rows.filter((r) => {
      const a = rows.find(
        (x) => x.supplierId === r.supplierId.trim() && x.materialCode === r.materialCode.trim()
      )?.approved;
      return (
        !!a &&
        a.tradeName === cleanTradeName(r.tradeName) &&
        a.supplierMaterialNo === cleanSupplierMaterialNo(r.supplierMaterialNo)
      );
    }).length;
    const out = await load.mutateAsync(parsed.rows);
    setOutcomes(out);
    const done = out.filter((o) => o.status === 'done').length;
    toast({
      variant: done === out.length ? 'success' : 'warning',
      title: t('matName.load.summary', {
        done: done - unchanged,
        unchanged,
        failed: out.length - done
      })
    });
  };

  const failed = (outcomes ?? []).filter((o) => o.status === 'failed');
  return (
    <section
      className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
      data-testid="tn-load"
    >
      <h2 className="text-section text-text-primary">{t('matName.load.title')}</h2>
      <p className="text-xs text-text-secondary mt-1 mb-3">{t('matName.load.intro')}</p>
      <input
        type="file"
        accept=".csv,text/csv"
        className="text-sm mb-2"
        aria-label={t('matName.load.file')}
        data-testid="tn-load-file"
        onChange={(e) => readFile(e.target.files?.[0])}
      />
      <textarea
        className="w-full px-3 py-2 text-sm border border-border-subtle rounded-md bg-white font-mono"
        rows={4}
        aria-label={t('matName.load.paste')}
        placeholder={t('matName.load.placeholder')}
        data-testid="tn-load-text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOutcomes(null);
        }}
      />
      <p className="text-xs text-text-tertiary mt-2" data-testid="tn-load-count">
        {t('matName.load.count', { count: parsed.rows.length })}
        {parsed.badLines.length > 0
          ? ` · ${t('matName.load.badLines', { lines: parsed.badLines.join(', ') })}`
          : ''}
      </p>
      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          disabled={parsed.rows.length === 0 || load.isPending}
          data-testid="tn-load-run"
          onClick={run}
        >
          {t('matName.load.run')}
        </Button>
      </div>
      {failed.length > 0 && (
        <ul className="mt-3 text-xs text-danger list-disc pl-5" data-testid="tn-load-failed">
          {failed.map((o) => (
            <li key={o.line}>
              {t('matName.load.lineRefused', {
                line: o.line,
                reason: t(refusalKeyOf(o.reason) ?? 'matName.load.otherRefusal', {
                  reason: o.reason ?? ''
                })
              })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** @type {React.FC} */
const BuyerTradeNames = () => {
  const { t } = useTranslation();
  const names = useMaterialNames();
  const review = useVerbAvailability('materialname:review');
  const held = review.kind === 'held';
  const [params, setParams] = useSearchParams();
  const raw = params.get('state');
  /** @type {Filter} */
  const filter = isFilter(raw) ? raw : 'awaiting';
  const crumb = [t('hub.nav.section.materials'), t('matName.pti.crumb')];

  const rows = useMemo(() => names.data?.items ?? [], [names.data]);
  const entries = /** @type {Entry[]} */ (
    useMemo(() => rows.flatMap((row) => row.history.map((name) => ({ row, name }))), [rows])
  );
  /** @param {Exclude<Filter, 'all'>} f */
  const countOf = (f) => entries.filter((e) => e.name.state === FILTER_STATE[f]).length;
  const shown =
    filter === 'all' ? entries : entries.filter((e) => e.name.state === FILTER_STATE[filter]);

  if (names.isPending) return <LoadingState breadcrumb={crumb} />;
  if (names.isError)
    return <ErrorState breadcrumb={crumb} error={names.error} onRetry={() => names.refetch()} />;

  /** @param {Filter} f */
  const setFilter = (f) => {
    const next = new URLSearchParams(params);
    if (f === 'awaiting') next.delete('state');
    else next.set('state', f);
    setParams(next, { replace: true });
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('matName.pti.title')}
        subtitle={t('matName.pti.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        <span data-testid="tn-meta">{t('matName.pti.meta', { count: entries.length })}</span>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {held ? (
        <LoadPanel rows={rows} />
      ) : (
        <div className="mb-4" data-testid="tn-gate">
          <HandoffNotice availability={review} testId="handoff-materialname-review" />
        </div>
      )}

      <SubTabs
        options={[
          { id: 'awaiting', label: t('matName.state.awaiting'), count: countOf('awaiting') },
          { id: 'approved', label: t('matName.state.approved'), count: countOf('approved') },
          { id: 'rejected', label: t('matName.state.rejected'), count: countOf('rejected') },
          { id: 'all', label: t('matName.filter.all'), count: entries.length }
        ]}
        value={filter}
        onChange={setFilter}
        className="mb-4"
      />

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('matName.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('matName.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('matName.col.tradeName')}</TableHeaderCell>
            <TableHeaderCell>{t('matName.col.supplierNo')}</TableHeaderCell>
            <TableHeaderCell>{t('matName.col.submitted')}</TableHeaderCell>
            <TableHeaderCell term="tradeNameStatus" />
            <TableHeaderCell>{t('matName.col.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((e) => (
              <TableRow key={e.name.id} data-testid={`tn-row-${e.name.id}`}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{e.row.materialCode}</Data>
                  <div className="text-sm text-text-primary">{e.row.materialLabel}</div>
                </TableCell>
                <TableCell className="text-sm text-text-primary">{e.row.supplierName}</TableCell>
                <TableCell className="text-sm text-text-primary">
                  {e.name.tradeName}
                  {!!e.name.rejectionReason && (
                    <div className="text-xs text-text-secondary">
                      {t('matName.rejectedBecause', { reason: e.name.rejectionReason })}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {e.name.supplierMaterialNo ? (
                    <Data>{e.name.supplierMaterialNo}</Data>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Data>{formatDateTime(e.name.submittedAt)}</Data>
                </TableCell>
                <TableCell>
                  <MaterialNameStatePill state={e.name.state} testId={`tn-state-${e.name.id}`} />
                  {!!e.name.loadedByPti && (
                    <StatusPill variant="neutral" className="ml-1">
                      {t('matName.loadedByPti')}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell>
                  {e.name.state === 'Awaiting approval' && held ? (
                    <DecideCell entry={e} />
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-sm text-text-tertiary"
                  data-testid="tn-empty"
                >
                  {t('matName.pti.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </AppShellV2>
  );
};

export default BuyerTradeNames;
