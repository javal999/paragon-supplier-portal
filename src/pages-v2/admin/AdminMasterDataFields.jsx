/** @import React from 'react' */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { RFI_QUESTION_LIBRARY } from '@services/sourcing/rfxConfig';
import {
  MASTER_DATA_ENFORCEMENT,
  MASTER_FIELD_GROUPS,
  buildMasterFieldCatalogue
} from '@services/transitions/masterDataCatalogue';

// ─────────────────────────────────────────────────────────────────────────────
// MASTER DATA FIELDS — PEX-14 (BL-278) [Proposed]. The catalogue: each field with
// its definition, its group and whether it is mandatory, seeded from the RFI fields
// that exist in code and the planning parameters (`masterDataCatalogue`). Read only.
// The mandatory mark is shown; saving is not blocked during the warning period.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const AdminMasterDataFields = () => {
  const { t } = useTranslation();
  const crumb = [t('adminCal.crumb.administration'), t('hub.nav.util.masterDataFields')];
  const fields = useMemo(() => buildMasterFieldCatalogue(RFI_QUESTION_LIBRARY), []);
  const blocking = MASTER_DATA_ENFORCEMENT.mode === 'block';
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('hub.nav.util.masterDataFields')}
        subtitle={t('pex.md.subtitle')}
      />
      <p className="text-sm text-text-secondary mb-2" data-testid="md-mode">
        {t(blocking ? 'pex.md.modeBlock' : 'pex.md.modeMark')}
      </p>
      <p className="text-xs text-text-tertiary mb-4" data-testid="md-proposed">
        {t('pex.md.proposed')}
      </p>
      {MASTER_FIELD_GROUPS.map((group) => {
        const rows = fields.filter((f) => f.group === group);
        if (rows.length === 0) return null;
        return (
          <section key={group} className="mb-5" data-testid={`md-group-${group}`}>
            <h2 className="text-sm font-semibold text-text-primary mb-2">
              {t(`pex.md.group.${group}`)}
            </h2>
            <div className="overflow-x-auto border border-border-subtle rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-label text-text-tertiary uppercase bg-bg-hover">
                    <th className="text-left px-4 py-2">{t('pex.md.col.field')}</th>
                    <th className="text-left px-4 py-2">{t('pex.md.col.definition')}</th>
                    <th className="text-left px-4 py-2">{t('pex.md.col.mark')}</th>
                    <th className="text-left px-4 py-2">{t('pex.md.col.source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => (
                    <tr
                      key={f.id}
                      className="border-t border-border-subtle align-top"
                      data-testid={`md-field-${f.id}`}
                    >
                      <td className="px-4 py-2">
                        <Data>{f.id}</Data>
                      </td>
                      <td className="px-4 py-2">{t(f.definitionKey)}</td>
                      <td className="px-4 py-2">
                        <StatusPill variant={f.mandatory ? 'warning' : 'neutral'}>
                          {f.mandatory ? `* ${t('pex.md.mandatory')}` : t('pex.md.optional')}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-2 text-text-secondary">
                        {t(`pex.md.source.${f.source}`)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </AppShellV2>
  );
};

export default AdminMasterDataFields;
