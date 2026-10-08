/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useRequirementResponseAcknowledge } from '@services/query/sdcSupplierHooks';
/** @import { ForecastLine, ForecastPublication, SdcObjectKind } from '@services/sdc' */
import { buildRequirementAcknowledgePayload } from '@services/sdc';
/** @import { CommandResult } from '@services/data/types' */
import { formatNumber } from '@lib/format';
import { CHIP, CLASS_LABEL_KEY, inputClass, labelClass } from '../const';
import { materialLabel } from '../utils';

/**
 * @typedef {object} AcknowledgePanelProps
 * @property {ForecastLine | null} line  the visibility-only line; `null` closes the panel
 * @property {string} note  the optional signal typed by the supplier
 * @property {(note: string) => void} setNote
 * @property {() => void} onClose  Cancel and the panel's own close
 * @property {() => void} onAcknowledged  after success: close, clear, switch to My responses
 * @property {ForecastPublication} publication  the RENDERED publication (snapshot keys)
 * @property {string} supplierId  from the identity, never the form
 * @property {() => string | undefined} causationId  the visit's audit anchor
 * @property {(kind: SdcObjectKind, res: CommandResult) => void} recordAttempt
 * @property {() => void} failToast  the generic failure toast for a thrown dispatch
 */

/**
 * The acknowledge panel (SDC-2b-EXT — the visibility response): the line
 * summary and an optional note, sent through `t_requirementresponse_acknowledge`.
 * A visibility-only line carries no commitment ask, so there is no quantity,
 * date or capacity field here.
 * @type {React.FC<AcknowledgePanelProps>}
 */
const AcknowledgePanel = ({
  line: ackPanelLine,
  note: ackNote,
  setNote: setAckNote,
  onClose,
  onAcknowledged,
  publication,
  supplierId,
  causationId,
  recordAttempt,
  failToast
}) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const acknowledgeMutation = useRequirementResponseAcknowledge();

  // SDC-2b-EXT — the visibility response: acknowledge + optional signal.
  const submitAcknowledgment = async () => {
    if (!ackPanelLine) return;
    const payload = buildRequirementAcknowledgePayload(
      publication,
      ackPanelLine,
      supplierId,
      ackNote
    );
    try {
      const res = await acknowledgeMutation.mutateAsync({ payload, causationId: causationId() });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.toast.failed.title'),
          description: refusalText(res.reason) ?? res.reason ?? t('sdcSup.toast.failed.body')
        });
        return;
      }
      recordAttempt('RequirementResponse', res);
      toast({
        variant: 'success',
        title: t('sdcSup.toast.acknowledged.title', {
          material: materialLabel(ackPanelLine.materialCode)
        }),
        description: t('sdcSup.toast.acknowledged.body')
      });
      onAcknowledged();
    } catch {
      failToast();
    }
  };

  return (
    <SidePanel
      open={ackPanelLine !== null}
      onClose={onClose}
      title={
        ackPanelLine
          ? t('sdcSup.ackPanel.title', { material: materialLabel(ackPanelLine.materialCode) })
          : ''
      }
      footerActions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('sdcSup.panel.cancel')}
          </Button>
          <Button
            variant="outline"
            disabled={acknowledgeMutation.isPending}
            onClick={submitAcknowledgment}
          >
            {acknowledgeMutation.isPending
              ? t('sdcSup.ackPanel.submitting')
              : t('sdcSup.ackPanel.submit')}
          </Button>
        </>
      }
    >
      {ackPanelLine && (
        <div className="space-y-5">
          <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Data className="text-sm font-bold text-text-primary">
                {ackPanelLine.materialCode}
              </Data>
              <span className={CHIP}>{t(CLASS_LABEL_KEY[ackPanelLine.commitmentClass])}</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
              <span>
                {t('sdcSup.panel.requested')}{' '}
                <Data as="strong" className="text-text-primary">
                  {formatNumber(ackPanelLine.forecastQty)} {ackPanelLine.uom}
                </Data>
              </span>
              <span>
                {t('sdcSup.line.period')}{' '}
                <Data as="strong" className="text-text-primary">
                  {ackPanelLine.periodBucket}
                </Data>
              </span>
            </div>
            <p className="mt-2 text-xs text-text-secondary">{t('sdcSup.ackPanel.desc')}</p>
          </section>

          <div>
            <label className={labelClass} htmlFor="sdcsup-ack-note">
              {t('sdcSup.ackPanel.note')}
            </label>
            <textarea
              id="sdcsup-ack-note"
              rows={3}
              placeholder={t('sdcSup.ackPanel.notePlaceholder')}
              value={ackNote}
              onChange={(e) => setAckNote(e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>
      )}
    </SidePanel>
  );
};

export default AcknowledgePanel;
