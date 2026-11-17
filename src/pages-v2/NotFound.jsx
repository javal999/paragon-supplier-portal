/** @import React from 'react' */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Button from '@components/ui-v2/Button';

// Real 404 (NAV-02). Unknown routes previously fell through to the buyer
// dashboard, silently masking bad links. This surfaces the miss honestly and
// offers a route home.
// BL-84 (WCAG 3.1.2): every line was an English literal in BOTH locales; the
// title and body now come from `notFound.*` in EN and ID.
/** @type {React.FC} */
const NotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['404']}
        title={t('notFound.title')}
        subtitle={t('notFound.subtitle')}
      />
      <div className="py-16 px-6 flex flex-col items-center text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
          <Compass size={24} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">{t('notFound.code')}</div>
        <div className="text-sm text-text-tertiary max-w-md mb-4">{t('notFound.body')}</div>
        <Button variant="outline" onClick={() => navigate('/buyer/home')}>
          {t('notFound.home')}
        </Button>
      </div>
    </AppShellV2>
  );
};

export default NotFound;
