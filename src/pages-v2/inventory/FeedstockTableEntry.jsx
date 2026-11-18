/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
/** @import { InventoryPosition } from '@services/data/types' */
import { useFeedstockConfirm } from '@services/query/commandHooks';
import { dayOf } from '@services/transitions/inventoryRules';

// ────────────────────────────────────────────────────────────────────────────
// PSC-2 BR-06 / BR-07 — FEEDSTOCK TO CONFIRM, TYPED DIRECTLY IN THE STOCK TABLE.
//
// For a packaging material the row carries an input: the supplier types the
// figure, presses Confirm, and the entry goes through the DRC-8 verb
// (`t_feedstock_confirm`) — it is the feedstock confirmation and is NEVER added
// to SOH (BR-07, MoM 2B). A raw material row shows no input here; the column is
// hidden entirely when the supplier has no packaging materials.
//
// The date the figure is confirmed as of is today on the hub clock, the same
// convention the feedstock form uses; the input is not a stock field and no
// stock read includes it.
// ────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-24 px-2 py-1 text-sm text-right font-mono text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';

/**
 * @typedef {object} FeedstockTableEntryProps
 * @property {string} supplierId
 * @property {InventoryPosition} position
 * @property {string} nowIso
 * @property {boolean} editable  Held atom, and this row is packaging.
 */

/** @type {React.FC<FeedstockTableEntryProps>} */
const FeedstockTableEntry = ({ supplierId, position, nowIso, editable }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useFeedstockConfirm();
  const [value, setValue] = useState(/** @type {string | null} */ (null));
  const latest = position.feedstock;
  const shown = value ?? (latest ? String(latest.feedstockQty) : '');

  /** @param {React.FormEvent} e */
  const send = async (e) => {
    e.preventDefault();
    if (shown.trim() === '') return;
    const result = await confirm.mutateAsync({
      supplierId,
      materialCode: position.materialCode,
      feedstockQty: Number(shown),
      confirmedOn: dayOf(nowIso),
      note: ''
    });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title: t('fsConfirm.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title: t('fsConfirm.toast.done', { code: position.materialCode })
    });
    setValue(null);
  };

  if (!editable) {
    // BR-06 — a raw material row carries no feedstock entry.
    return <span className="text-xs text-text-tertiary">{t('inv.sup.feedstock.notRequired')}</span>;
  }

  return (
    <form
      onSubmit={send}
      className="flex items-center gap-2"
      data-testid={`sup-stock-feedstock-${position.materialCode}`}
    >
      <input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className={INPUT_CLASS}
        aria-label={t('inv.sup.feedstock.for', { material: position.materialCode })}
        data-testid={`sup-stock-feedstock-input-${position.materialCode}`}
        value={shown}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="submit"
        variant="secondary"
        disabled={confirm.isPending || shown.trim() === ''}
        data-testid={`sup-stock-feedstock-confirm-${position.materialCode}`}
      >
        {t('inv.sup.feedstock.confirm')}
      </Button>
      {latest ? (
        <span className="text-xs text-text-tertiary whitespace-nowrap">
          {t('fsConfirm.asOf')} <Data>{formatDate(latest.confirmedOn)}</Data>
        </span>
      ) : null}
    </form>
  );
};

export default FeedstockTableEntry;
