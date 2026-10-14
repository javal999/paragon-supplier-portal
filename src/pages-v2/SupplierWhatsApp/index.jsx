import { useMemo, useState } from 'react';
/** @import React from 'react' */
import { Info } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import SubTabs from '@components/ui-v2/SubTabs';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import Data from '@components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { sdcClock } from '@services/sdc/clock';
import { PULSE_CSS } from './const';
import WhatsAppPanel from './components/WhatsAppPanel';
import EmailPanel from './components/EmailPanel';
import WeChatPanel from './components/WeChatPanel';

/** @typedef {'whatsapp' | 'email' | 'wechat'} Channel */

/**
 * The supplier channel-demo page (`/supplier/whatsapp`): header, the "session
 * opened" meta line on the hub clock, the demonstration banner, and the
 * WhatsApp / Email / WeChat tabs. Each tab is a scripted simulator that owns its
 * own state; this component owns only the selected channel.
 */
/** @type {React.FC} */
const SupplierWhatsApp = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;
  const [channel, setChannel] = useState(/** @type {Channel} */ ('whatsapp'));

  // ⚠️ **THE HUB CLOCK (operator, 2026-09-22).** This read the machine clock on
  // purpose ("a fact about THIS SESSION"). Reversed: the demo hub runs on one
  // clock, so a session opened "22 Sep" on a hub whose present is 31 Aug read
  // as a defect, not as a fact. The message stamps (`getTime`) and the email
  // panel's "Sent:" date read the same clock, so the page holds ONE clock.
  const lastUpdated = useMemo(
    () =>
      new Date(sdcClock.now()).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  );

  if (!supplierId) return <NoSupplierIdentity />;

  return (
    <AppShellV2>
      <style>{PULSE_CSS}</style>
      <PageHeader
        breadcrumb={[
          t('supplierWhatsApp.crumb.intelligence'),
          t('supplierWhatsApp.crumb.whatsappHub')
        ]}
        title={t('supplierWhatsApp.header.title')}
        subtitle={t('supplierWhatsApp.header.subtitle', {
          supplier: supplierName ?? t('supplierWhatsApp.fallback.supplier')
        })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierWhatsApp.meta.sessionOpened')} <Data>{lastUpdated}</Data>
        {/* D-CENSUS-8 — `messaging` is null-backed. This is a scripted simulator: no
            WhatsApp Business API is connected, no message leaves the browser, and
            the bot replies are authored. The capability copy claiming the bot sends
            documents "instantly" and returns "real-time payment info" is retracted
            in this batch. */}
        <ProvenanceMarker capability="messaging" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* C5 — the demonstration honesty marker: a supplier can never mistake these
          scripted example conversations for their real channel history. JJ's ruling
          keeps the demonstrator; this label makes what it is unmistakable. */}
      <div
        className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary"
        data-testid="supplier-whatsapp-demo-banner"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-warning-hover" aria-hidden="true" />
        <span className="text-text-secondary">{t('supplierWhatsApp.demo.banner')}</span>
      </div>

      <SubTabs
        options={[
          { id: 'whatsapp', label: t('supplierWhatsApp.tab.whatsapp') },
          { id: 'email', label: t('supplierWhatsApp.tab.email') },
          { id: 'wechat', label: t('supplierWhatsApp.tab.wechat') }
        ]}
        value={channel}
        onChange={setChannel}
        className="mb-6"
      />

      {channel === 'whatsapp' && <WhatsAppPanel />}
      {channel === 'email' && <EmailPanel />}
      {channel === 'wechat' && <WeChatPanel />}
    </AppShellV2>
  );
};

export default SupplierWhatsApp;
