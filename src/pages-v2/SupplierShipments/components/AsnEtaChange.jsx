/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useAdvanceShipNoticeChangeEta } from '@services/query/commandHooks';
import { etaNeedsReapproval, shelfLifeExceptionOf } from '@services/transitions/fulfilmentRules';
/** @import { ASN } from '@services/data/types' */
import { inputClass, labelClass } from '../const';
import { fmtDate } from '../utils';

/**
 * MR-6 edge case 1 — on a submitted ASN whose shelf-life exception was
 * approved, the supplier may move the ETA later; when a line then fails the
 * rule, Quality decides again (`t_asn_change_eta`). The control is offered only
 * where the verb would accept it (`etaNeedsReapproval`, the hook's rule).
 * @type {React.FC<{ asn: ASN }>}
 */
const AsnEtaChange = ({ asn }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const changeEta = useAdvanceShipNoticeChangeEta();
  const [eta, setEta] = useState('');
  const view = shelfLifeExceptionOf(asn);
  if (asn.status !== 'Submitted' || view?.state !== 'approved') return null;
  const legal = etaNeedsReapproval(asn, eta);
  const run = () =>
    changeEta.mutate(
      { asnNumber: asn.asnNumber, eta },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('fc.asn.shelfLife.changeEta.failed', { asnNumber: asn.asnNumber }),
              description: refusalText(res.reason) ?? res.reason ?? ''
            });
            return;
          }
          setEta('');
          toast({
            variant: 'success',
            title: t('fc.asn.shelfLife.changeEta.success', { asnNumber: asn.asnNumber })
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('asn.denied.title'),
            description: t('asn.denied.desc')
          })
      }
    );
  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-border-subtle pt-2">
      <label className="block">
        <span className={labelClass}>{t('fc.asn.shelfLife.changeEta.label')}</span>
        <input
          type="date"
          value={eta}
          min={view.request.eta}
          onChange={(ev) => setEta(ev.target.value)}
          className={inputClass}
        />
      </label>
      <Button variant="outline" onClick={run} disabled={!legal || changeEta.isPending}>
        {t('fc.asn.shelfLife.changeEta.action')}
      </Button>
      <p className="w-full text-[length:var(--fs-label-3)] text-text-tertiary">
        {t('fc.asn.shelfLife.changeEta.hint', { eta: fmtDate(view.request.eta) })}
      </p>
    </div>
  );
};

export default AsnEtaChange;
