/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { useMaterialNames } from '@services/query/hooks';
import { useMaterialNameSubmit } from '@services/query/commandHooks';
/** @import { MaterialNameRow } from '@services/data/types' */
import {
  SUPPLIER_MATERIAL_NO_MAX,
  TRADE_NAME_MAX,
  materialNameEntryRefusal
} from '@services/transitions/materialNameRules';
import { MaterialNameStatePill, refusalKeyOf } from './tradeNameDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER · MY MATERIALS — Material C2 (MR-3 d, supplier steps 1 to 3).
//
// The PTI materials assigned to this supplier, with PTI's code and description,
// its trade name and where the name stands. A rejected name shows the reason.
// One form submits a new name or a changed one; the approved name stays in use
// until the new one is approved (BR-02). The read is narrowed to this supplier
// by the read model (BR-03), not here.
//
// The form is the only entrance to `t_materialname_submit`, gated on the MODE
// (§84): a seat without the atom reads the list and is told whose act it is.
// The submit is disabled by the same rule the verb's hook calls (MAT-R2).
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

/**
 * @typedef {object} Draft
 * @property {string} materialCode
 * @property {string} materialLabel
 * @property {string} tradeName
 * @property {string} supplierMaterialNo
 */

/**
 * What the row says about its names: the one in use, and the newest if it differs.
 * @type {React.FC<{ row: MaterialNameRow }>}
 */
const NameCell = ({ row }) => {
  const { t } = useTranslation();
  const pending = row.latest && row.latest.id !== row.approved?.id ? row.latest : undefined;
  if (!row.approved && !pending)
    return <span className="text-xs text-text-tertiary">{t('matName.none')}</span>;
  return (
    <div className="flex flex-col gap-1">
      {!!row.approved && (
        <span
          className="text-sm text-text-primary"
          data-testid={`my-mat-approved-${row.materialCode}`}
        >
          {row.approved.tradeName}
        </span>
      )}
      {!!pending && (
        <span
          className="text-xs text-text-secondary"
          data-testid={`my-mat-pending-${row.materialCode}`}
        >
          {t(row.approved ? 'matName.newName' : 'matName.submittedName', {
            name: pending.tradeName
          })}
        </span>
      )}
      {pending?.state === 'Rejected' && (
        <span className="text-xs text-danger" data-testid={`my-mat-reason-${row.materialCode}`}>
          {t('matName.rejectedBecause', { reason: pending.rejectionReason ?? '' })}
        </span>
      )}
    </div>
  );
};

/** @type {React.FC<{ supplierId: string }>} */
const SupplierMaterialNames = ({ supplierId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const names = useMaterialNames();
  const submit = useMaterialNameSubmit();
  const availability = useVerbAvailability('materialname:submit');
  const held = availability.kind === 'held';
  const [draft, setDraft] = useState(/** @type {Draft | null} */ (null));

  if (names.isPending) return <p className="text-sm text-text-tertiary">{t('matName.loading')}</p>;
  const rows = names.data?.items ?? [];

  // Every row here is an assigned material (the read lists nothing else).
  const refusal = draft
    ? materialNameEntryRefusal({
        assigned: true,
        tradeName: draft.tradeName,
        supplierMaterialNo: draft.supplierMaterialNo
      })
    : null;
  const refusalKey = refusalKeyOf(refusal);

  /** @param {MaterialNameRow} row */
  const open = (row) => {
    const base = row.latest?.state === 'Awaiting approval' ? row.latest : row.approved;
    setDraft({
      materialCode: row.materialCode,
      materialLabel: row.materialLabel,
      tradeName: base?.tradeName ?? '',
      supplierMaterialNo: base?.supplierMaterialNo ?? ''
    });
  };

  /** @param {React.FormEvent} e */
  const send = async (e) => {
    e.preventDefault();
    if (!draft || refusal) return;
    const result = await submit.mutateAsync({
      supplierId,
      materialCode: draft.materialCode,
      tradeName: draft.tradeName,
      supplierMaterialNo: draft.supplierMaterialNo
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
      title: t('matName.toast.submitted', { code: draft.materialCode })
    });
    setDraft(null);
  };

  return (
    <section data-testid="my-materials">
      <p className="text-sm text-text-secondary mb-4">{t('matName.sup.intro')}</p>
      {!held && (
        <div className="mb-4" data-testid="my-materials-gate">
          <HandoffNotice availability={availability} testId="handoff-materialname-submit" />
        </div>
      )}

      {held && draft !== null ? (
        <form
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm flex flex-col gap-3"
          data-testid="my-materials-form"
          onSubmit={send}
        >
          <h2 className="text-section text-text-primary">
            {t('matName.form.title')} <Data>{draft.materialCode}</Data>
          </h2>
          <p className="text-xs text-text-secondary">
            {t('matName.form.pti', { label: draft.materialLabel })}
          </p>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('matName.form.tradeName')}
            </span>
            <input
              className={INPUT_CLASS}
              data-testid="my-materials-trade-name"
              aria-label={t('matName.form.tradeName')}
              maxLength={TRADE_NAME_MAX + 20}
              value={draft.tradeName}
              onChange={(e) => setDraft((d) => (d ? { ...d, tradeName: e.target.value } : d))}
            />
          </label>
          <label className="block">
            <span className="text-label text-text-tertiary uppercase">
              {t('matName.form.supplierNo')}
            </span>
            <input
              className={`${INPUT_CLASS} font-mono`}
              data-testid="my-materials-supplier-no"
              aria-label={t('matName.form.supplierNo')}
              maxLength={SUPPLIER_MATERIAL_NO_MAX + 20}
              value={draft.supplierMaterialNo}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, supplierMaterialNo: e.target.value } : d))
              }
            />
          </label>
          {!!refusalKey && (
            <p className="text-xs text-danger" data-testid="my-materials-refusal">
              {t(refusalKey)}
            </p>
          )}
          <p className="text-xs text-text-tertiary">{t('matName.form.note')}</p>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="outline"
              disabled={refusal !== null || submit.isPending}
              data-testid="my-materials-submit"
            >
              {t('matName.form.submit')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDraft(null)}>
              {t('matName.form.cancel')}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('matName.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('matName.col.tradeName')}</TableHeaderCell>
            <TableHeaderCell>{t('matName.col.supplierNo')}</TableHeaderCell>
            <TableHeaderCell>{t('matName.col.state')}</TableHeaderCell>
            {held ? <TableHeaderCell>{t('matName.col.action')}</TableHeaderCell> : null}
          </TableHeader>
          <tbody>
            {rows.map((row) => (
              <TableRow key={row.materialCode} data-testid={`my-mat-row-${row.materialCode}`}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">{row.materialCode}</Data>
                  <div className="text-sm text-text-primary">{row.materialLabel}</div>
                </TableCell>
                <TableCell>
                  <NameCell row={row} />
                </TableCell>
                <TableCell>
                  {row.latest?.supplierMaterialNo ? (
                    <Data>{row.latest.supplierMaterialNo}</Data>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {row.latest ? (
                    <MaterialNameStatePill
                      state={row.latest.state}
                      testId={`my-mat-state-${row.materialCode}`}
                    />
                  ) : (
                    <span className="text-xs text-text-tertiary">{t('matName.state.none')}</span>
                  )}
                </TableCell>
                {held ? (
                  <TableCell className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="secondary"
                      data-testid={`my-mat-edit-${row.materialCode}`}
                      onClick={() => open(row)}
                    >
                      {t(row.latest ? 'matName.action.change' : 'matName.action.enter')}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={held ? 5 : 4} className="py-10 text-center text-sm text-text-tertiary">
                  {t('matName.sup.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default SupplierMaterialNames;
