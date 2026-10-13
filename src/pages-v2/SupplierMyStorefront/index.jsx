/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useAdaptive } from '@context/AdaptiveContext';
import { CHANNEL_CONFIG } from '@data/communicationProfiles';
import NoSupplierIdentity from '@components/ui-v2/NoSupplierIdentity';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import {
  useCurrentSupplier,
  useStorefrontCatalog,
  useStorefrontCerts
} from '@services/query/hooks';
import { emptyMaterial } from './const';
import CompletenessCard, { COMPLETENESS_ITEMS } from './components/CompletenessCard';
import ProfileSection from './components/ProfileSection';
import CatalogSection from './components/CatalogSection';
import CertificatesSection from './components/CertificatesSection';
import ChannelSection from './components/ChannelSection';
import BusinessHoursSection from './components/BusinessHoursSection';
import PerformanceSection from './components/PerformanceSection';
/** @import { CatalogItem, ProfileCert, Supplier } from '@services/data/types' */
/** @import { NewMaterial } from './const' */

/**
 * @typedef {object} StorefrontEditorProps
 * @property {Supplier} supp
 * @property {string} supplierId
 * @property {CatalogItem[]} initialCatalog
 * @property {ProfileCert[]} initialCerts
 */

/**
 * The storefront editor: owns every piece of session edit state and every
 * handler, renders the page chrome (`AppShellV2`, header, meta line) and the
 * six step sections from `components/`.
 * @type {React.FC<StorefrontEditorProps>}
 */
const StorefrontEditor = ({ supp, supplierId, initialCatalog, initialCerts }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getSupplierProfile, isBusinessHours, getLocalTime } = useAdaptive();

  const [catalog, setCatalog] = useState(/** @type {CatalogItem[]} */ (initialCatalog));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [description, setDescription] = useState(
    "Leading manufacturer of PET packaging and airless pump systems for beauty and personal care. BPOM registered. ISO 9001:2015 certified. Serving Indonesia's top beauty brands since 2005."
  );
  const [bizHoursStart, setBizHoursStart] = useState('08:00');
  const [bizHoursEnd, setBizHoursEnd] = useState('17:00');
  const [certs, setCerts] = useState(/** @type {ProfileCert[]} */ (initialCerts));
  const [newMaterial, setNewMaterial] = useState(/** @type {NewMaterial} */ (emptyMaterial));

  const completeness = useMemo(() => {
    const done = COMPLETENESS_ITEMS.filter((i) => i.done).length;
    return Math.round((done / COMPLETENESS_ITEMS.length) * 100);
  }, []);

  const cp = getSupplierProfile(supp.country);
  const bizHours = isBusinessHours(supp.country);
  const localTime = getLocalTime(supp.country);

  /** @param {number} idx */
  const toggleCertVisibility = (idx) => {
    setCerts((prev) => prev.map((c, i) => (i === idx ? { ...c, visible: !c.visible } : c)));
  };

  /** @param {string} id */
  const toggleCatalogVisibility = (id) => {
    setCatalog((prev) => prev.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)));
  };

  /** @param {string} id */
  const removeCatalogItem = (id) => {
    setCatalog((prev) => prev.filter((x) => x.id !== id));
    toast({ title: t('supplierMyStorefront.toast.materialRemoved') });
  };

  /** @param {string} c */
  const toggleNewCert = (c) => {
    setNewMaterial((p) => ({
      ...p,
      certs: p.certs.includes(c) ? p.certs.filter((x) => x !== c) : [...p.certs, c]
    }));
  };

  const submitNewMaterial = () => {
    if (!newMaterial.material) {
      toast({
        variant: 'error',
        title: t('supplierMyStorefront.toast.materialNameRequired')
      });
      return;
    }
    setCatalog((prev) => [
      ...prev,
      { id: `c${Date.now()}`, supplierId, ...newMaterial, visible: true }
    ]);
    setNewMaterial(emptyMaterial);
    setShowAddForm(false);
    toast({
      variant: 'success',
      title: t('supplierMyStorefront.toast.materialSubmitted.title'),
      description: t('supplierMyStorefront.toast.materialSubmitted.desc')
    });
  };

  /** @type {'success' | 'warning'} */
  const completenessVariant = completeness >= 80 ? 'success' : 'warning';

  const primaryCfg = CHANNEL_CONFIG[/** @type {keyof typeof CHANNEL_CONFIG} */ (cp.primaryChannel)];
  const fallbackCfg =
    CHANNEL_CONFIG[/** @type {keyof typeof CHANNEL_CONFIG} */ (cp.fallbackChannel)];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[
          t('supplierMyStorefront.crumb.acquire'),
          t('supplierMyStorefront.crumb.myStorefront')
        ]}
        title={t('supplierMyStorefront.header.title')}
        subtitle={t('supplierMyStorefront.header.subtitle', { supplier: supp.name })}
        actions={
          <Button
            variant="outline"
            icon={ExternalLink}
            onClick={() => navigate(`/marketplace/supplier/${supplierId}`)}
          >
            {t('supplierMyStorefront.header.preview')}
          </Button>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierMyStorefront.meta.summary', {
          materials: catalog.length,
          certs: certs.filter((c) => c.visible).length,
          pct: completeness
        })}
        {/* D-CENSUS-8 — storefront catalog + certificate visibility are fixture-fed;
            nothing published here reaches a buyer-facing system. */}
        <ProvenanceMarker capability="suppliers" className="ml-3 align-middle" />
      </PageMetaLine>

      <CompletenessCard completeness={completeness} completenessVariant={completenessVariant} />

      <div className="flex flex-col gap-5">
        <ProfileSection
          supp={supp}
          cp={cp}
          editProfile={editProfile}
          setEditProfile={setEditProfile}
          description={description}
          setDescription={setDescription}
        />

        <CatalogSection
          catalog={catalog}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          newMaterial={newMaterial}
          setNewMaterial={setNewMaterial}
          toggleCatalogVisibility={toggleCatalogVisibility}
          removeCatalogItem={removeCatalogItem}
          toggleNewCert={toggleNewCert}
          submitNewMaterial={submitNewMaterial}
        />

        <CertificatesSection certs={certs} toggleCertVisibility={toggleCertVisibility} />

        <ChannelSection primaryCfg={primaryCfg} fallbackCfg={fallbackCfg} />

        <BusinessHoursSection
          cp={cp}
          bizHours={bizHours}
          localTime={localTime}
          bizHoursStart={bizHoursStart}
          setBizHoursStart={setBizHoursStart}
          bizHoursEnd={bizHoursEnd}
          setBizHoursEnd={setBizHoursEnd}
        />

        <PerformanceSection completeness={completeness} />
      </div>
    </AppShellV2>
  );
};

// Wrapper: reads the current supplier + storefront catalog/certs through the
// scoped hooks and renders the four honest states; the editor inner holds the
// local (Phase-2′, non-persisting) catalog/cert/profile edit state seeded from
// the resolved reads.
/** @type {React.FC} */
const SupplierMyStorefront = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const catalogQuery = useStorefrontCatalog();
  const certsQuery = useStorefrontCerts();
  const crumb = [
    t('supplierMyStorefront.crumb.acquire'),
    t('supplierMyStorefront.crumb.myStorefront')
  ];

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || catalogQuery.isPending || certsQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || catalogQuery.isError || certsQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={supplierQuery.error ?? catalogQuery.error ?? certsQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          catalogQuery.refetch();
          certsQuery.refetch();
        }}
      />
    );

  const supp = supplierQuery.data ?? null;
  if (!supp) return <NoSupplierIdentity />;

  return (
    <StorefrontEditor
      supp={supp}
      supplierId={supplierId}
      initialCatalog={catalogQuery.data?.items ?? []}
      initialCerts={certsQuery.data?.items ?? []}
    />
  );
};

export default SupplierMyStorefront;
