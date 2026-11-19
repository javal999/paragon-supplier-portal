/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Tabs from '@components/ui-v2/Tabs';
import { useToast } from '@hooks/useToast';
import { useLtpInputCommand } from '@services/query/commandHooks';
import {
  LTP_SERIES,
  compareLtpBatch,
  ltpComputedAvailable,
  parseLtpBatchCsv
} from '@services/transitions/ltpInputRules';
/** @import { LtpBatchMaterial, LtpBatchRepeat, LtpSeries } from '@services/transitions/ltpInputRules' */
/** @import { RowLtpInputs } from '@services/data/mock/demandAnticipationReadModel' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import { formatDate, formatNumber } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// BL-338 (PSC-3) — the batch LTP upload: three screens, one per series (LTP A,
// LTP Festive, LTP B). Each takes ONE CSV with many materials, one row per
// material × week, and shows the computed total from the FG plan and the BOM
// beside the uploaded figure (BR-01, BR-02). The planner confirms; every
// material in the file is dispatched through `t_ltpinput_set` under the same
// file name, so the ledger stamps each one with the uploader, the date and
// the file (BR-03). An upload marks the published DA out of date with its
// cause through the PEX-6 mechanism the DA read already carries (BR-06).
//
// The per-material CSV this replaces (§BR-01, BL-267) lives on in
// `LtpInputsPanel` only as the choice control; its own file input is gone.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One material of the page, with what the preview reads: the DRC-18 week
 * fields (the computed total and the FG breakdown), the FGs that use the
 * material and the uploads in force (the stamps).
 * @typedef {{
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly ltpInputs?: RowLtpInputs;
 *   readonly weeks?: readonly {
 *     readonly week: string;
 *     readonly fgDemandMaterial?: number | null;
 *     readonly fgBreakdown?: readonly { readonly skuCode: string; readonly quantity: number }[] | null;
 *   }[];
 *   readonly fgDemandAvailable?: boolean;
 *   readonly fgUsers?: readonly string[];
 *   readonly noPlanFgs?: readonly string[];
 * }} LtpBatchMaterialView
 */

/**
 * A parsed file for one screen, with the file name the stamps record.
 * @typedef {{
 *   readonly fileName: string;
 *   readonly materials: readonly LtpBatchMaterial[];
 *   readonly repeated: readonly LtpBatchRepeat[];
 * }} BatchDraft
 */

/**
 * @typedef {Record<LtpSeries, BatchDraft | null>} BatchDrafts
 * @typedef {Record<LtpSeries, string | null>} BatchProblems
 */

/** @returns {BatchDrafts} */
const noDrafts = () => ({ A: null, Festive: null, B: null });
/** @returns {BatchProblems} */
const noProblems = () => ({ A: null, Festive: null, B: null });

/** @param {ActorAttribution} setBy @returns {string} */
const uploaderText = (setBy) => (setBy.kind === 'RESOLVED' ? setBy.person.displayName : '');

/**
 * @type {React.FC<{ materials: readonly LtpBatchMaterialView[] }>}
 */
const LtpBatchUploads = ({ materials }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const command = useLtpInputCommand();
  const [series, setSeries] = useState(/** @type {LtpSeries} */ ('A'));
  const [drafts, setDrafts] = useState(noDrafts);
  const [problems, setProblems] = useState(noProblems);
  const [busy, setBusy] = useState(false);
  const [openBreakdown, setOpenBreakdown] = useState(/** @type {string | null} */ (null));
  const byMaterial = useMemo(() => new Map(materials.map((m) => [m.materialCode, m])), [materials]);

  const draft = drafts[series];
  const problem = problems[series];
  /** @param {Partial<BatchProblems>} next */
  const setProblem = (next) => setProblems((p) => ({ ...p, ...next }));
  /** @param {Partial<BatchDrafts>} next */
  const setDraft = (next) => setDrafts((p) => ({ ...p, ...next }));

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const parsed = parseLtpBatchCsv(await file.text());
    if ('refusal' in parsed) {
      setDraft({ [series]: null });
      setProblem({ [series]: parsed.refusal });
      return;
    }
    const unknown = parsed.materials.find((m) => !byMaterial.has(m.materialCode));
    if (unknown) {
      setDraft({ [series]: null });
      setProblem({ [series]: t('ltpIn.batchUnknown', { material: unknown.materialCode }) });
      return;
    }
    setProblem({ [series]: null });
    setDraft({
      [series]: { fileName: file.name, materials: parsed.materials, repeated: parsed.repeated }
    });
  };

  /** Upload every material of the parsed file under the same file name. */
  const confirm = async () => {
    const file = drafts[series];
    if (!file) return;
    setBusy(true);
    /** @type {{ readonly material: string; readonly reason: string } | null} */
    let failure = null;
    let done = 0;
    for (const m of file.materials) {
      const result = await command.mutateAsync({
        materialCode: m.materialCode,
        series,
        weeks: { ...m.weeks },
        sourceFile: file.fileName
      });
      if (result.status === 'failed')
        failure = { material: m.materialCode, reason: result.reason ?? '' };
      else done += 1;
    }
    setBusy(false);
    if (failure)
      toast({
        variant: 'error',
        title: t('ltpIn.batchFailed', { material: failure.material, reason: failure.reason })
      });
    else
      toast({
        variant: 'success',
        title: t('ltpIn.batchDone', {
          series: t(`ltpIn.series.${series}`),
          count: done
        })
      });
  };

  return (
    <div className="mt-4 pt-4 border-t border-border-subtle" data-testid="ltp-batch">
      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('ltpIn.batchTitle')}</h3>
      <p className="text-xs text-text-tertiary mb-3">{t('ltpIn.batchIntro')}</p>
      <Tabs
        tabs={LTP_SERIES.map((id) => ({ id, label: t(`ltpIn.series.${id}`) }))}
        active={series}
        onChange={(id) => setSeries(/** @type {LtpSeries} */ (id))}
        className="mb-3"
      />
      <div
        role="tabpanel"
        aria-label={t(`ltpIn.series.${series}`)}
        data-testid={`ltp-batch-panel-${series}`}
      >
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <label className="inline-block">
            <span className="text-xs text-text-secondary mr-2">{t('ltpIn.batchFile')}</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              data-testid={`ltp-batch-file-${series}`}
              disabled={busy}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? `ltp-batch-problem-${series}` : undefined}
              onChange={(e) => void onFile(e)}
            />
          </label>
          <span className="text-xs text-text-tertiary">{t('ltpIn.batchFormat')}</span>
        </div>
        {problem ? (
          <p
            id={`ltp-batch-problem-${series}`}
            className="text-sm text-danger mt-2"
            role="alert"
            data-testid={`ltp-batch-problem-${series}`}
          >
            {problem}
          </p>
        ) : null}
        {draft ? (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-text-secondary mb-2">
              {t('ltpIn.batchPreview')}
            </h4>
            {draft.repeated.length > 0 ? (
              <ul
                className="mb-2 text-xs text-warning-hover"
                data-testid={`ltp-batch-repeated-${series}`}
              >
                {draft.repeated.map((r) => (
                  <li key={`${r.materialCode}-${r.week}`}>
                    {t('ltpIn.batchRepeated', { material: r.materialCode, week: r.week })}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="space-y-4">
              {draft.materials.map((m) => {
                const view = byMaterial.get(m.materialCode);
                const computed = Object.fromEntries(
                  (view?.weeks ?? []).map((w) => [w.week, w.fgDemandMaterial ?? null])
                );
                const rows = compareLtpBatch(m.weeks, computed);
                const available = view ? ltpComputedAvailable(view) : false;
                const upload = view?.ltpInputs?.uploads[series] ?? null;
                const by = upload ? uploaderText(upload.setBy) : '';
                const key = `${series}-${m.materialCode}`;
                const open = openBreakdown === key;
                const noPlan = view?.noPlanFgs ?? [];
                const users = view?.fgUsers ?? [];
                return (
                  <section
                    key={m.materialCode}
                    className="border border-border-subtle rounded-md p-3"
                    data-testid={`ltp-batch-material-${key}`}
                  >
                    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                      <Data className="text-sm">{m.materialCode}</Data>
                      <span className="text-sm text-text-secondary">
                        {view?.materialLabel ?? ''}
                      </span>
                      <Button
                        variant="secondary"
                        className="ml-auto"
                        aria-expanded={open}
                        onClick={() => setOpenBreakdown(open ? null : key)}
                        data-testid={`ltp-batch-breakdown-toggle-${key}`}
                      >
                        {open ? t('ltpIn.batchHideBreakdown') : t('ltpIn.batchBreakdown')}
                      </Button>
                    </header>
                    <p
                      className="text-xs text-text-tertiary mb-1"
                      data-testid={`ltp-batch-stamp-${key}`}
                    >
                      {upload
                        ? t('ltpIn.batchStamp', {
                            file: upload.sourceFile,
                            date: formatDate(upload.setAt),
                            // The actor is the seam's placeholder until an IdP answers.
                            by: by || t('demandAnt.pub.unattributed')
                          })
                        : t('ltpIn.batchNoStamp')}
                    </p>
                    {!available ? (
                      <p
                        className="text-xs text-warning-hover mb-1"
                        data-testid={`ltp-batch-noplan-${key}`}
                      >
                        {view?.fgDemandAvailable === false
                          ? t('ltpIn.batchPlanUnavailable')
                          : users.length > 0 && noPlan.length > 0
                            ? t('ltpIn.batchNoPlan', { fgs: noPlan.join(', ') })
                            : t('ltpIn.batchNoUsers')}
                      </p>
                    ) : noPlan.length > 0 ? (
                      <p
                        className="text-xs text-warning-hover mb-1"
                        data-testid={`ltp-batch-noplan-${key}`}
                      >
                        {t('ltpIn.batchNoPlan', { fgs: noPlan.join(', ') })}
                      </p>
                    ) : null}
                    <Table>
                      <TableHeader>
                        <TableHeaderCell>{t('ltpIn.batchWeek')}</TableHeaderCell>
                        <TableHeaderCell>{t('ltpIn.batchComputed')}</TableHeaderCell>
                        <TableHeaderCell>{t('ltpIn.batchUploaded')}</TableHeaderCell>
                        <TableHeaderCell>{t('ltpIn.batchDifference')}</TableHeaderCell>
                      </TableHeader>
                      <tbody>
                        {rows.map((row) => (
                          <TableRow key={row.week}>
                            <TableCell>
                              <Data>{row.week}</Data>
                            </TableCell>
                            <TableCell>
                              {available && row.computed !== null ? (
                                <Data data-testid={`ltp-batch-computed-${key}-${row.week}`}>
                                  {formatNumber(row.computed)}
                                </Data>
                              ) : (
                                <span
                                  className="text-text-tertiary"
                                  data-testid={`ltp-batch-computed-${key}-${row.week}`}
                                >
                                  {t('ltpIn.batchNotAvailable')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Data data-testid={`ltp-batch-uploaded-${key}-${row.week}`}>
                                {formatNumber(row.uploaded)}
                              </Data>
                            </TableCell>
                            <TableCell>
                              {row.difference === null ? (
                                <span className="text-text-tertiary">—</span>
                              ) : (
                                <Data data-testid={`ltp-batch-difference-${key}-${row.week}`}>
                                  {row.difference > 0
                                    ? t('ltpIn.batchPlus', { qty: formatNumber(row.difference) })
                                    : formatNumber(row.difference)}
                                </Data>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </tbody>
                    </Table>
                    {open ? (
                      <div className="mt-2" data-testid={`ltp-batch-breakdown-${key}`}>
                        {rows.map((row) => {
                          const parts =
                            view?.weeks?.find((w) => w.week === row.week)?.fgBreakdown ?? [];
                          return (
                            <p
                              key={row.week}
                              className="text-xs text-text-secondary mb-1"
                              data-testid={`ltp-batch-breakdown-${key}-${row.week}`}
                            >
                              <Data>{row.week}</Data>
                              {' · '}
                              {parts.length === 0
                                ? t('ltpIn.batchBreakdownEmpty')
                                : parts.map((p) => (
                                    <span key={p.skuCode} className="mr-3">
                                      <Data>{p.skuCode}</Data> {formatNumber(p.quantity)}
                                    </span>
                                  ))}
                            </p>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                onClick={() => void confirm()}
                disabled={busy || command.isPending}
                data-testid={`ltp-batch-confirm-${series}`}
              >
                {t('ltpIn.batchConfirm', { count: draft.materials.length })}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default LtpBatchUploads;
