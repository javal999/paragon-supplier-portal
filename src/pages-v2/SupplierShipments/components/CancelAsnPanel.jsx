/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';

/**
 * REQ-E07-04 — the confirm drawer for withdrawing an ASN before receipt
 * (`t_asn_cancel`). Open while `cancelTarget` names an ASN.
 * @type {React.FC<{ cancelTarget: string | null; onClose: () => void; onConfirm: () => void; pending: boolean }>}
 */
const CancelAsnPanel = ({ cancelTarget, onClose, onConfirm, pending }) => {
  const { t } = useTranslation();
  return (
    <SidePanel
      open={cancelTarget !== null}
      onClose={onClose}
      title={cancelTarget ? t('fc.asn.cancel.title', { asnNumber: cancelTarget }) : ''}
      footerActions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('fc.asn.cancel.keep')}
          </Button>
          <Button variant="outline" onClick={onConfirm} disabled={pending}>
            {t('fc.asn.cancel.confirm')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{t('fc.asn.cancel.body')}</p>
    </SidePanel>
  );
};

export default CancelAsnPanel;
