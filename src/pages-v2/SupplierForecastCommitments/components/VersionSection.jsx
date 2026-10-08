/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { formatDate, formatDateTime } from '@lib/format';
import { commitmentTemplateCsv, forecastCsv } from '@services/transitions/forecastRules';
/** @import { ForecastCommitmentLine, ForecastVersionView } from '@services/data/types' */
/** @import { ForecastStream } from '@services/sdc/types' */
/** @import { UploadResult } from '../const' */
import { downloadText } from '../../forecasts/forecastDisplay';
import UploadResultTable from './UploadResultTable';

/**
 * The stream's current version: its number, the emergency badge, when it was
 * published and the previous version, PTI's change note, and the three file
 * actions — the forecast download (AC-03), the commitment template, and the
 * upload (shown only when the seat may commit) with its progress, error and
 * result.
 * @type {React.FC<{
 *   activeStream: ForecastStream;
 *   current: ForecastVersionView;
 *   previous: ForecastVersionView | null;
 *   streamLines: ForecastCommitmentLine[];
 *   language: 'id' | 'en';
 *   canCommit: boolean;
 *   fileRef: React.RefObject<HTMLInputElement | null>;
 *   busy: boolean;
 *   fileError: string | null;
 *   upload: UploadResult | null;
 *   onFile: (file: File | undefined) => Promise<void>;
 * }>}
 */
const VersionSection = ({
  activeStream,
  current,
  previous,
  streamLines,
  language,
  canCommit,
  fileRef,
  busy,
  fileError,
  upload,
  onFile
}) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4"
      data-testid="fc-sup-version"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-section text-text-primary">
            {t(`fc.stream.${activeStream}`)} · {t('fc.version', { version: current.version })}
            {current.emergency && (
              <StatusPill variant="warning" className="ml-2 align-middle">
                {t('fc.emergency')}
              </StatusPill>
            )}
          </h2>
          <p className="text-sm text-text-secondary">
            {t('fc.publishedAt')} <Data>{formatDateTime(current.publishedAt)}</Data> ·{' '}
            {t(`fc.cadence.${activeStream}`)}
            {previous && (
              <>
                {' '}
                · {t('fc.previousVersion', { version: previous.version })}{' '}
                <Data>{formatDate(previous.publishedAt)}</Data>
              </>
            )}
          </p>
          {current.changeNote && (
            <p className="text-sm text-text-secondary" data-testid="fc-sup-change-note">
              {t('fc.changeNote')} {current.changeNote}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={Download}
            data-testid="fc-download-forecast"
            onClick={() =>
              downloadText(
                `forecast-${activeStream}-v${current.version}.csv`,
                forecastCsv(
                  streamLines,
                  {
                    materialCode: t('fc.csv.materialCode'),
                    material: t('fc.csv.material'),
                    period: t('fc.csv.period'),
                    periodStart: t('fc.csv.periodStart'),
                    zone: t('fc.csv.zone'),
                    forecastQty: t('fc.csv.forecastQty'),
                    unit: t('fc.csv.unit'),
                    previousQty: t('fc.csv.previousQty'),
                    dueAt: t('fc.csv.dueAt')
                  },
                  (z) => t(`fc.zone.${z}`)
                )
              )
            }
          >
            {t('fc.sup.downloadForecast')}
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            data-testid="fc-download-template"
            onClick={() =>
              downloadText(
                `commitments-${activeStream}-v${current.version}.csv`,
                commitmentTemplateCsv(streamLines, language)
              )
            }
          >
            {t('fc.upload.template')}
          </Button>
          {canCommit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,text/csv"
                className="hidden"
                data-testid="fc-upload-file"
                aria-label={t('fc.upload.choose')}
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                icon={Upload}
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {t('fc.upload.choose')}
              </Button>
            </>
          )}
        </div>
      </div>
      {busy && <p className="mt-3 text-sm text-text-tertiary">{t('fc.upload.checking')}</p>}
      {fileError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {fileError}
        </p>
      )}
      {upload && <UploadResultTable upload={upload} />}
    </section>
  );
};

export default VersionSection;
