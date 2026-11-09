/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailabilities } from '@hooks/useVerbAvailability';
/** @import { ForecastLine, RequirementResponse } from '@services/sdc' */
import { formatNumber } from '@lib/format';
import { statusLabelKey } from '@lib/statusLabel';
import { CHIP, CLASS_LABEL_KEY } from '../const';
import { materialLabel } from '../utils';
import { isAcknowledgeOnly, zoneOfClass } from '@services/transitions/forecastRules';

/**
 * One published forecast line on the Lines tab: material, commitment class,
 * demand and period, the supplier's latest own response, and the line's one
 * entry point — Confirm on a firm (Zone Liability) line, Acknowledge on a
 * Zone Capacity line (PEX-D22), each behind its own verb availability.
 *
 * `latest` is the latest own response to this exact line (`latestResponseFor`);
 * `onConfirm` / `onAcknowledge` open the workspace's confirm or acknowledge panel.
 * @type {React.FC<{ line: ForecastLine; latest?: RequirementResponse; onConfirm: (line: ForecastLine) => void; onAcknowledge: (line: ForecastLine) => void; }>}
 */
const LineCard = ({ line, latest, onConfirm, onAcknowledge }) => {
  // ⚠️ **THE SHARPEST PAIR IN THE SPLIT, AND IT IS ONE ENTITY.** A commitment
  // line is COMMERCIAL's; a visibility-only line's acknowledgment is BACK
  // OFFICE's — the flow header is explicit that the latter "carries NO
  // commitment ask … no quantity, no date, no capacity claim". So the same
  // card can name two different owners depending on which kind of line it is,
  // which is why the split had to be argued per ATOM and not per flow. They are
  // mutually exclusive on any one line, so each answers alone in its own slot.
  const lineVerbs = useVerbAvailabilities(
    /** @type {const} */ ({
      commit: 'requirementresponse:submit',
      acknowledge: 'requirementresponse:acknowledge'
    })
  );
  const { t } = useTranslation();
  // PEX-D22 (owner, 2026-11-05) — only a firm line (Zone Liability) asks for a
  // commitment; a semi-firm or visibility-only line (Zone Capacity) is
  // acknowledged. The submit policy hook refuses a commitment on any other line.
  const confirmable = !isAcknowledgeOnly(zoneOfClass(line.commitmentClass));
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Data className="text-sm font-bold text-text-primary">{line.materialCode}</Data>
            <span className={CHIP}>
              {line.commitmentClass === 'firm' && <Lock size={11} aria-hidden="true" />}
              {t(CLASS_LABEL_KEY[line.commitmentClass])}
            </span>
          </div>
          <div className="text-base font-semibold text-text-primary mt-1">
            {materialLabel(line.materialCode)}
          </div>
        </div>
        {confirmable ? (
          // Outline opener — the SOLID commit lives on the panel's Submit (F-3).
          lineVerbs.commit.kind === 'held' ? (
            <Button variant="outline" onClick={() => onConfirm(line)}>
              {t('sdcSup.line.confirm')}
            </Button>
          ) : (
            <HandoffNotice availability={lineVerbs.commit} testId="handoff-rr-commit" />
          )
        ) : (
          // SDC-2b-EXT: a visibility-only line takes a RESPONSE (acknowledge +
          // optional signal), never a commitment — quieter affordance by design.
          <div className="flex flex-col items-end gap-1.5 max-w-[14rem]">
            {lineVerbs.acknowledge.kind === 'held' ? (
              <Button variant="outline" onClick={() => onAcknowledge(line)}>
                {t('sdcSup.line.acknowledge')}
              </Button>
            ) : (
              <HandoffNotice availability={lineVerbs.acknowledge} testId="handoff-rr-acknowledge" />
            )}
            <span className="text-xs italic text-text-tertiary text-right">
              {t('sdcSup.line.visibilityHint')}
            </span>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.line.demand')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {formatNumber(line.forecastQty)} {line.uom}
          </Data>
        </div>
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.line.period')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {line.periodBucket}
          </Data>
        </div>
      </dl>

      {latest && (
        <div className="mt-3 text-xs text-text-secondary">
          {latest.acknowledgment
            ? t('sdcSup.line.lastResponseAck', {
                version: latest.submissionVersion,
                status: statusLabelKey(latest.status)
                  ? t(
                      /** @type {NonNullable<ReturnType<typeof statusLabelKey>>} */ (
                        statusLabelKey(latest.status)
                      )
                    )
                  : latest.status
              })
            : t('sdcSup.line.lastResponse', {
                qty: formatNumber(
                  /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
                    latest.forecastConfirmation
                  ).confirmedQty
                ),
                uom: /** @type {import('@services/sdc/types').ForecastConfirmation} */ (
                  latest.forecastConfirmation
                ).uom,
                version: latest.submissionVersion,
                // Same central status map StatusPill localizes through.
                status: statusLabelKey(latest.status)
                  ? t(
                      /** @type {NonNullable<ReturnType<typeof statusLabelKey>>} */ (
                        statusLabelKey(latest.status)
                      )
                    )
                  : latest.status
              })}
        </div>
      )}
    </div>
  );
};

export default LineCard;
