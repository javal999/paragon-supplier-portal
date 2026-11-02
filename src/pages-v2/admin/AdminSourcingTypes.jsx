/** @import React from 'react' */
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDateTime } from '@lib/format';
import { useSourcingTypeSet } from '@services/query/commandHooks';
/** @import { SourcingType, SourcingTypeKey } from '@services/sourcing/sourcingType' */
import {
  SOURCING_TYPES,
  SOURCING_TYPE_KEYS,
  sourcingTypeRefusal
} from '@services/sourcing/sourcingType';
import { purchasingGroupNameKey } from '@services/sourcing/rfxConfig';
import { sourcingTypeStore } from '@services/transitions/sourcingTypeStore';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · SOURCING TYPES — Material G2 (MR-10 BR-06; MAT-D13).
//
// Every sourcing category and purchasing group, Direct or Indirect. Each row
// is the one entrance to `t_sourcingtype_set` for its key, gated on
// `sourcingtype:manage` (Procurement); a seat without it reads the map and is
// told whose act a change is. The pre-check calls the same refusal the verb's
// policy hook calls (MAT-R2). A published event keeps its type.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const AdminSourcingTypes = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const setType = useSourcingTypeSet();
  const availability = useVerbAvailability('sourcingtype:manage');
  const held = availability.kind === 'held';
  const [drafts, setDrafts] = useState(
    /** @type {Partial<Record<SourcingTypeKey, SourcingType>>} */ ({})
  );

  const version = useSyncExternalStore(sourcingTypeStore.subscribe, sourcingTypeStore.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's change signal, so the memo re-reads the store
  const map = useMemo(() => sourcingTypeStore.map(), [version]);
  const lastChange = useMemo(() => {
    const m = /** @type {Map<string, string>} */ (new Map());
    for (const c of sourcingTypeStore.changes()) m.set(c.key, c.setAt);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's change signal, so the memo re-reads the store
  }, [version]);

  /**
   * @param {SourcingTypeKey} key
   * @returns {{ kind: string; name: string }}
   */
  const keyLabel = (key) => {
    const [kind, value] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (kind === 'pg') {
      const nameKey = purchasingGroupNameKey(value);
      return {
        kind: t('adminSourcing.kind.group'),
        name: `${value}${nameKey ? ` · ${t(nameKey)}` : ''}`
      };
    }
    return { kind: t('adminSourcing.kind.category'), name: value };
  };

  /** @param {SourcingTypeKey} key */
  const save = (key) => {
    const next = drafts[key];
    if (!next) return;
    setType.mutate(
      { key, sourcingType: next },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'error',
              title: t('adminSourcing.refused', { reason: res.reason ?? '' })
            });
            return;
          }
          setDrafts((d) => {
            const { [key]: _done, ...rest } = d;
            return rest;
          });
          toast({ variant: 'success', title: t('adminSourcing.saved') });
        }
      }
    );
  };

  const CRUMB = [t('adminSourcing.crumb.administration'), t('adminSourcing.crumb.page')];
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('adminSourcing.title')}
        subtitle={t('adminSourcing.subtitle')}
      />
      <AdminSectionNav />
      {held ? null : (
        <div className="mb-4">
          <HandoffNotice availability={availability} testId="handoff-sourcingtype-manage" />
        </div>
      )}
      <section
        className="rounded-lg border border-border-subtle bg-white shadow-sm"
        data-testid="adminsourcing-table"
      >
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('adminSourcing.col.key')}</TableHeaderCell>
            <TableHeaderCell term="sourcingType" />
            <TableHeaderCell>{t('adminSourcing.col.lastChange')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {SOURCING_TYPE_KEYS.map((key) => {
              const label = keyLabel(key);
              const current = map[key] ?? 'direct';
              const value = drafts[key] ?? current;
              const changedAt = lastChange.get(key);
              const precheck = drafts[key] ? sourcingTypeRefusal(key, drafts[key]) : null;
              return (
                <TableRow key={key} data-testid={`adminsourcing-row-${key}`}>
                  <TableCell>
                    <span className="block text-xs text-text-tertiary">{label.kind}</span>
                    <span className="text-sm text-text-primary">{label.name}</span>
                  </TableCell>
                  <TableCell>
                    {held ? (
                      <span className="inline-flex items-center gap-2">
                        <select
                          className="px-3 h-9 text-sm border border-border-subtle rounded-md bg-white"
                          aria-label={`${label.name} — ${t('adminSourcing.col.type')}`}
                          data-testid={`adminsourcing-select-${key}`}
                          value={value}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [key]: /** @type {SourcingType} */ (e.target.value)
                            }))
                          }
                        >
                          {SOURCING_TYPES.map((st) => (
                            <option key={st} value={st}>
                              {t(`sourcingType.${st}`)}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          disabled={
                            !drafts[key] ||
                            drafts[key] === current ||
                            precheck !== null ||
                            setType.isPending
                          }
                          data-testid={`adminsourcing-save-${key}`}
                          onClick={() => save(key)}
                        >
                          {t('adminSourcing.save')}
                        </Button>
                      </span>
                    ) : (
                      <span className="text-sm">{t(`sourcingType.${current}`)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {changedAt ? (
                      <Data>{formatDateTime(changedAt)}</Data>
                    ) : (
                      <span className="text-xs text-text-tertiary">
                        {t('adminSourcing.default')}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </section>
    </AppShellV2>
  );
};

export default AdminSourcingTypes;
