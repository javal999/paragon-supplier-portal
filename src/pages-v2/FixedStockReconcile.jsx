/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import SidePanel from '@components/ui-v2/SidePanel';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { FIELD_FOCUS_RING, TOUCH_TARGET } from '@components/forecast/focusRing';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDate, formatNumber } from '@lib/format';
import { useFixedStockReconcile } from '@services/query/hooks';
import { useMaxStockSet } from '@services/query/commandHooks';
/** @import { FixedStockReconcileRow } from '@services/data/types' */
import { maxStockRefusal } from '@services/transitions/maxStock';
import { FEEDSTOCK_LEFTOVER_RULES } from '@services/transitions/feedstockReconcile';
import { forecastNow } from './forecasts/forecastDisplay';
import { inputClass, labelClass } from './inventory/inventoryDisplay';

// C2 (WCAG 2.4.7): the shared field class shows focus only as a 1 px border
// tint; the forecast fields add a ring.
const fieldClass = `${inputClass} ${FIELD_FOCUS_RING}`;

// ─────────────────────────────────────────────────────────────────────────────
// FEEDSTOCK (FS) RECONCILE — DRC-15a (BL-201), replacing the fixed stock
// reconcile of REQ-E06-04 [DRC-D14]. The file, the component names and the
// routes `/buyer/fs-reconcile` and `/supplier/fs-reconcile` are kept so links
// and the router stay as they are (DRC-15a BR-05); FS now reads "feedstock".
//
// Per supplier × material, read on the hub's current day (BR-01): what PTI
// ordered on POs, what it called off, what the supplier shipped on ASNs against
// those call-offs, and the two remainders, with no outcome or settlement (BR-02).
// What "not yet called off" means is DRC-15b (BL-207), built as a recommendation
// behind `FEEDSTOCK_LEFTOVER_RULES.leftoverRule` and labelled [Proposed]: the
// row shows the liability flag or the carry the rows were built with.
// The max stock stays on the row and Procurement sets it with `maxstock:set`
// (BR-03); any other PTI seat sees whose act it is; a supplier reads it only.
// The planner sees every supplier; the supplier sees its own rows, scoped by
// the service (BR-04).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC<{ value: number; uom: string; testId?: string }>} */
const Qty = ({ value, uom, testId }) => (
  <Data className="whitespace-nowrap" data-testid={testId}>{`${formatNumber(value)} ${uom}`}</Data>
);

const note = 'block text-xs text-text-tertiary';

/** @type {React.FC<{ persona: 'buyer' | 'supplier' }>} */
const FixedStockReconcile = ({ persona }) => {
  const { t } = useTranslation();
  const query = useFixedStockReconcile();
  const [editing, setEditing] = useState(/** @type {FixedStockReconcileRow | null} */ (null));
  const [draft, setDraft] = useState('');
  const setMax = useMaxStockSet();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const maxAvailability = useVerbAvailability('maxstock:set');
  const isPti = persona === 'buyer';
  const canSetMax = isPti && maxAvailability.kind === 'held';
  // FUX A4: the planner's page sits under Review and is named by its menu label;
  // the supplier's keeps its own name and section.
  const crumb = isPti
    ? forecastCrumb(t, 'stockCheck')
    : [t('hub.nav.section.planning'), t('fsr.title')];

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const rows = query.data?.items ?? [];
  const cols = isPti ? 8 : 7;
  // DRC-15b [Proposed BL-207] — the variant the rows were built with.
  const leftoverRule = rows[0]?.leftover.rule ?? FEEDSTOCK_LEFTOVER_RULES.leftoverRule;
  const draftQty = draft.trim() === '' ? null : Number(draft.trim());
  const draftInvalid =
    draft.trim() !== '' && (Number.isNaN(draftQty) || maxStockRefusal(draftQty) !== null);

  /** @param {FixedStockReconcileRow} r */
  const openEditor = (r) => {
    setDraft(r.maxStock === null ? '' : String(r.maxStock));
    setEditing(r);
  };

  /** @param {number | null} quantity */
  const save = async (quantity) => {
    if (!editing) return;
    const result = await setMax.mutateAsync({
      supplierId: editing.supplierId,
      materialCode: editing.materialCode,
      quantity
    });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title: refusalText(result.reason) ?? t('fsr.max.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title:
        quantity === null
          ? t('fsr.max.cleared', { material: editing.materialCode })
          : t('fsr.max.saved', {
              material: editing.materialCode,
              qty: formatNumber(quantity),
              uom: editing.uom
            })
    });
    setEditing(null);
  };

  /**
   * DRC-15b [Proposed BL-207] — the leftover outcome under "Not yet called off".
   * @param {FixedStockReconcileRow} r
   */
  const leftoverNotes = (r) => {
    const { liabilityQty, noMaxAgreed, carriedQty } = r.leftover;
    if (liabilityQty === null && carriedQty === null) return null;
    return (
      <>
        {liabilityQty !== null && (
          <span className={note} data-testid={`fsr-liability-${r.key}`}>
            {t('fsr.leftover.liability')} <Qty value={liabilityQty} uom={r.uom} />
          </span>
        )}
        {liabilityQty !== null && noMaxAgreed ? (
          <span className={note} data-testid={`fsr-liability-nomax-${r.key}`}>
            {t('fsr.leftover.noMax')}
          </span>
        ) : null}
        {carriedQty !== null && (
          <span className={note} data-testid={`fsr-carried-${r.key}`}>
            {t('fsr.leftover.carried')} <Qty value={carriedQty} uom={r.uom} />
          </span>
        )}
        <span className={note} data-testid={`fsr-proposed-${r.key}`}>
          {t('fsr.proposed')}
        </span>
      </>
    );
  };

  /** @param {FixedStockReconcileRow} r */
  const maxCell = (r) => (
    <>
      <span className="block text-sm" data-testid={`fsr-max-${r.key}`}>
        {r.maxStock === null ? (
          <span className="text-text-tertiary">{t('fsr.noMax')}</span>
        ) : (
          <>
            {t('fsr.max')} <Qty value={r.maxStock} uom={r.uom} />
          </>
        )}
      </span>
      {!isPti ? null : !r.maxStockSettable ? (
        <span className={note} data-testid={`fsr-max-unassigned-${r.key}`}>
          {t('fsr.max.notAssigned')}
        </span>
      ) : canSetMax ? (
        <button
          type="button"
          className={`text-xs text-action-hover hover:underline ${TOUCH_TARGET}`}
          onClick={() => openEditor(r)}
          data-testid={`fsr-max-edit-${r.key}`}
          aria-label={t('fsr.max.editFor', {
            material: r.materialCode,
            supplier: r.supplierName
          })}
        >
          {t(r.maxStock === null ? 'fsr.max.set' : 'fsr.max.change')}
        </button>
      ) : (
        <HandoffNotice availability={maxAvailability} testId={`handoff-maxstock-${r.key}`} />
      )}
    </>
  );

  return (
    <AppShellV2>
      {isPti ? (
        <>
          <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'stockCheck')} />
          <PurposeHeader page="stockCheck" />
          <SimulatedDataBanner />
          <DataAsOf date={forecastNow()} />
        </>
      ) : (
        <>
          <PageHeader breadcrumb={crumb} title={t('fsr.title')} subtitle={t('fsr.subtitle.sup')} />
          <PageMetaLine className="-mt-6 mb-4">
            {t('fsr.asOf')} <Data>{formatDate(forecastNow())}</Data>
            <SampleDataBadge className="ml-3 align-middle" />
          </PageMetaLine>
        </>
      )}

      <div
        className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-2"
        data-testid="fsr-table"
      >
        <Table>
          <TableHeader>
            {isPti ? <TableHeaderCell>{t('fsr.col.supplier')}</TableHeaderCell> : null}
            <TableHeaderCell>{t('fsr.col.material')}</TableHeaderCell>
            <TableHeaderCell term="poOrdered" />
            <TableHeaderCell term="reconcileCalledOff" />
            <TableHeaderCell term="asnRequested" />
            <TableHeaderCell term="notYetCalledOff" />
            <TableHeaderCell term="calledOffNotYetShipped" />
            <TableHeaderCell term="maxStockSupplier" />
          </TableHeader>
          <tbody>
            {rows.map((r) => (
              <TableRow key={r.key} data-testid={`fsr-row-${r.key}`}>
                {isPti ? (
                  <TableCell className="align-top max-w-[11rem]">
                    <span className="block text-sm text-text-primary">{r.supplierName}</span>
                    <Data className="text-xs text-text-tertiary">{r.supplierId}</Data>
                  </TableCell>
                ) : null}
                <TableCell className="align-top max-w-[10rem]">
                  <Data className="whitespace-nowrap">{r.materialCode}</Data>
                  <span className={note}>{r.materialLabel}</span>
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.poOrdered} uom={r.uom} testId={`fsr-po-${r.key}`} />
                  <span className={note}>{t('fsr.poCount', { count: r.poNumbers.length })}</span>
                  {r.valueOnlyLines > 0 && (
                    <span className={note} data-testid={`fsr-value-only-${r.key}`}>
                      {t('fsr.valueOnly', { count: r.valueOnlyLines })}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.calledOff} uom={r.uom} testId={`fsr-called-${r.key}`} />
                  <span className={note}>
                    {t('fsr.callOffCount', { count: r.callOffNumbers.length })}
                  </span>
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.asnRequested} uom={r.uom} testId={`fsr-asn-${r.key}`} />
                  <span className={note}>{t('fsr.asnCount', { count: r.asnNumbers.length })}</span>
                </TableCell>
                <TableCell className="align-top">
                  <Qty value={r.notYetCalledOff} uom={r.uom} testId={`fsr-uncalled-${r.key}`} />
                  {r.calledBeyondPo > 0 && (
                    <span className={note} data-testid={`fsr-beyond-${r.key}`}>
                      {t('fsr.calledBeyond')} <Qty value={r.calledBeyondPo} uom={r.uom} />
                    </span>
                  )}
                  {leftoverNotes(r)}
                </TableCell>
                <TableCell className="align-top">
                  <Qty
                    value={r.calledOffNotShipped}
                    uom={r.uom}
                    testId={`fsr-unshipped-${r.key}`}
                  />
                  {r.shippedBeyondCalledOff > 0 && (
                    <span className={note} data-testid={`fsr-shipped-beyond-${r.key}`}>
                      {t('fsr.shippedBeyond')} <Qty value={r.shippedBeyondCalledOff} uom={r.uom} />
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">{maxCell(r)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={cols}
                  className="text-center text-sm text-text-tertiary py-10"
                  data-testid="fsr-empty"
                >
                  {t('fsr.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
      {/* DRC-15b [Proposed BL-207] — names the proposed leftover rule and its switch. */}
      <p
        className="text-sm text-text-secondary mb-6"
        data-testid="fsr-remainder-note"
        data-leftover-rule={leftoverRule}
      >
        {t(`fsr.leftover.note.${leftoverRule}`)} {t('fsr.proposed')}
      </p>

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
        data-testid="fsr-rules"
      >
        <h2 className="text-section text-text-primary">{t('fsr.rules.title')}</h2>
        <p>{t('fsr.rules.daily')}</p>
        <p>{t('fsr.rules.figures')}</p>
        <p>{t('fsr.rules.remainders')}</p>
      </section>

      {isPti ? (
        <AboutThisPage>
          <p>{t('fsr.subtitle.pti')}</p>
        </AboutThisPage>
      ) : null}

      <SidePanel
        open={editing !== null && canSetMax}
        onClose={() => setEditing(null)}
        title={editing ? t('fsr.max.panelTitle', { material: editing.materialCode }) : ''}
        footerActions={
          editing && canSetMax ? (
            <>
              {editing.maxStock !== null && (
                <Button
                  variant="secondary"
                  disabled={setMax.isPending}
                  onClick={() => void save(null)}
                  data-testid="fsr-max-clear"
                >
                  {t('fsr.max.clear')}
                </Button>
              )}
              <Button
                variant="outline"
                disabled={setMax.isPending || draftQty === null || draftInvalid}
                // C2 (WCAG 4.1.2): a switched-off Save says why.
                aria-describedby={draftQty === null || draftInvalid ? 'fsr-max-why' : undefined}
                onClick={() => void save(draftQty)}
                data-testid="fsr-max-save"
              >
                {t('fsr.max.save')}
              </Button>
            </>
          ) : undefined
        }
      >
        {editing ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              {editing.supplierName} · <Data>{editing.materialCode}</Data> {editing.materialLabel}
            </p>
            <p className="text-sm text-text-secondary">{t('fsr.max.panelHint')}</p>
            <label className="block">
              <span className={labelClass}>{t('fsr.max.input', { uom: editing.uom })}</span>
              <input
                className={fieldClass}
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                data-testid="fsr-max-input"
                aria-invalid={draftInvalid}
                aria-describedby={draftInvalid ? 'fsr-max-why' : undefined}
              />
            </label>
            {draftInvalid ? (
              <p
                id="fsr-max-why"
                className="text-sm text-danger"
                role="alert"
                data-testid="fsr-max-invalid"
              >
                {t('fsr.max.invalid')}
              </p>
            ) : draftQty === null ? (
              <span id="fsr-max-why" className="sr-only">
                {t('fsr.max.invalid')}
              </span>
            ) : null}
          </div>
        ) : null}
      </SidePanel>
    </AppShellV2>
  );
};

/** @type {React.FC} */
export const BuyerFixedStockReconcile = () => <FixedStockReconcile persona="buyer" />;
/** @type {React.FC} */
export const SupplierFixedStockReconcile = () => <FixedStockReconcile persona="supplier" />;

export default FixedStockReconcile;
