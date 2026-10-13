/** @import React from 'react' */
/** @import { ChannelConfig } from '@context/AdaptiveContext' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
import StatusPill from '@components/ui-v2/StatusPill';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';

/**
 * @typedef {object} ChannelSectionProps
 * @property {ChannelConfig | undefined} primaryCfg  CHANNEL_CONFIG row for the supplier's primary channel.
 * @property {ChannelConfig | undefined} fallbackCfg  CHANNEL_CONFIG row for the fallback channel.
 */

/**
 * Step 4, communication channel: a Save button (a toast only) and the primary
 * and fallback channel cards; a missing config renders an empty slot. Moved
 * out of `SupplierMyStorefront.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<ChannelSectionProps>}
 */
const ChannelSection = ({ primaryCfg, fallbackCfg }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  return (
    <FormSection
      eyebrow={t('supplierMyStorefront.step', { n: 4 })}
      title={t('supplierMyStorefront.step4.title')}
      description={t('supplierMyStorefront.step4.description')}
    >
      <div className="flex justify-end mb-3">
        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: 'success',
              title: t('supplierMyStorefront.toast.channelUpdated')
            })
          }
        >
          {t('supplierMyStorefront.action.save')}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          {
            cfg: primaryCfg,
            labelKey: 'supplierMyStorefront.channel.primary',
            variant: /** @type {const} */ ('info'),
            accent: true
          },
          {
            cfg: fallbackCfg,
            labelKey: 'supplierMyStorefront.channel.fallback',
            variant: /** @type {const} */ ('neutral'),
            accent: false
          }
        ].map(({ cfg, labelKey, variant, accent }) =>
          cfg ? (
            <div
              key={labelKey}
              className={`flex items-center gap-3 px-4 py-3 rounded-md border ${
                accent ? 'bg-teal-soft border-teal/30' : 'bg-bg-hover border-border-subtle'
              }`}
            >
              <span className="text-2xl shrink-0">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                {/* cfg.label / cfg.description are shared CHANNEL_CONFIG data
                    (proper-noun channel names + technical protocol copy) — i18n-defer */}
                <div className="text-sm font-semibold text-text-primary">{cfg.label}</div>
                <div className="text-xs text-text-tertiary">{cfg.description}</div>
              </div>
              <StatusPill variant={variant}>{t(labelKey)}</StatusPill>
            </div>
          ) : (
            // labelKey (primary / fallback) is unique per slot and is also the key of the
            // filled branch above, so the slot keeps its identity either way.
            <div key={labelKey} />
          )
        )}
      </div>
    </FormSection>
  );
};

export default ChannelSection;
