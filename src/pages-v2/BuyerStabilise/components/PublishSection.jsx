/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { FORECAST_PAGES } from '@components/forecast/forecastPages';
import { formatDate } from '@lib/format';
/** @import { ForecastVersionView, StabiliseRunView } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { TAB_PARAM } from '../const';
import PublishChecklist from './PublishChecklist';

/**
 * The publish act (FUX-D1: the only publish point): the last published version
 * per stream, a link to the Published versions tab, the readiness checklist,
 * and then — by the seat's answer for `forecast:publish` — the handoff notice,
 * the withheld line while the engine dataset is simulated (X-03), or the two
 * publish buttons.
 * Props: `lastPublished` (current version per stream), `versionsLoaded` (the
 * versions read answered, so "none yet" is true), `engineRun` (for the
 * checklist), `publishAvailability`, `withheld`, `isPending` (a publish is in
 * flight) and `publish` (the page's handler, which owns the refusal toasts).
 * @type {React.FC<{
 *   lastPublished: readonly ForecastVersionView[];
 *   versionsLoaded: boolean;
 *   engineRun: StabiliseRunView | null;
 *   publishAvailability: VerbAvailability;
 *   withheld: boolean;
 *   isPending: boolean;
 *   publish: (stream: 'packaging' | 'rawMaterial') => Promise<void>;
 * }>}
 */
const PublishSection = ({
  lastPublished,
  versionsLoaded,
  engineRun,
  publishAvailability,
  withheld,
  isPending,
  publish
}) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="stb-publish"
    >
      <h2 className="text-section text-text-primary mb-1">{t('stb.publish.title')}</h2>
      <p className="text-xs text-text-tertiary mb-3">{t('stb.publish.intro')}</p>
      <ul className="text-sm text-text-secondary mb-2 space-y-1" data-testid="stb-last-published">
        {lastPublished.map((v) => (
          <li key={v.publicationId} data-testid={`stb-last-published-${v.stream}`}>
            {t('stb.publish.last', { stream: t(`fc.stream.${v.stream}`) })}{' '}
            <Data>{t('fc.version', { version: v.version })}</Data>,{' '}
            <Data>{formatDate(v.publishedAt)}</Data>
          </li>
        ))}
        {versionsLoaded && lastPublished.length === 0 && <li>{t('stb.publish.lastNone')}</li>}
      </ul>
      <p className="text-sm mb-3">
        <Link
          to={`${FORECAST_PAGES.publish.path}?${TAB_PARAM}=versions`}
          className="text-action-hover hover:underline"
          data-testid="stb-versions-link"
        >
          {t('stb.publish.versionsLink')}
        </Link>
      </p>
      <PublishChecklist run={engineRun} />
      {publishAvailability.kind !== 'held' ? (
        <HandoffNotice availability={publishAvailability} testId="handoff-stabilise-publish" />
      ) : withheld ? (
        <p className="text-sm text-warning-hover" data-testid="stb-publish-withheld">
          {t('stb.publish.withheld')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void publish('packaging')}
            disabled={isPending}
            data-testid="stb-publish-packaging"
          >
            {t('stb.publish.packaging')}
          </Button>
          <Button
            variant="outline"
            onClick={() => void publish('rawMaterial')}
            disabled={isPending}
            data-testid="stb-publish-rawMaterial"
          >
            {t('stb.publish.rawMaterial')}
          </Button>
        </div>
      )}
    </section>
  );
};

export default PublishSection;
