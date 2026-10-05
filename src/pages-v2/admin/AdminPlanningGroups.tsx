import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDateTime } from '@lib/format';
import { usePlanningGroups } from '@services/query/hooks';
import { usePlanningGroupCommand, type PlanningGroupCommandVars } from '@services/query/commandHooks';
import {
  planningGroupRefusal,
  type PlanningGroupRefusalCode,
  type PlanningGroupWorld,
} from '@services/transitions/planningGroupRules';
import type { PlanningGroupEvent, PlanningGroupView } from '@services/data/types';
import type { ActorAttribution } from '@lib/enforcement';
import { planningGroupLabel } from '../inventory/planningGroupDisplay';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · PLANNING GROUPS — Material C5 (MR-8 BR-01 to BR-05, AR-15).
//
// Material Planning splits SAP material groups into planning groups, the
// groups capacity is kept by. Each SAP group has a default planning group with
// all its materials until it is split, so nothing changes until someone acts.
//   · THREE FORMS, the only entrances to the four verbs: create, rename, and
//     move materials; retire is a row action on an empty group. Every form is
//     behind `planninggroup:manage`; a seat without it reads everything and is
//     told whose act a change is (§84: gate the mode, not the door).
//   · Every pre-check calls `planningGroupRefusal`, the rule the verb's policy
//     hook calls (MAT-R2).
//   · THE CHANGES ON RECORD, with who and when, newest first.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

const REFUSAL_CODES: readonly PlanningGroupRefusalCode[] = [
  'NAME_REQUIRED',
  'UNKNOWN_SAP_GROUP',
  'NO_MATERIALS',
  'UNKNOWN_MATERIAL',
  'MIXED_SAP_GROUP',
  'ALREADY_IN_GROUP',
  'RETIRE_NOT_EMPTY',
];

/** The named code inside a dispatcher refusal, if it is one of this verb's. */
const refusalCodeOf = (reason: string | undefined): PlanningGroupRefusalCode | null =>
  REFUSAL_CODES.find((c) => (reason ?? '').includes(c)) ?? null;

/** What the rule reads, from the groups this page already holds (PTI sees every material). */
function worldOf(groups: readonly PlanningGroupView[]): PlanningGroupWorld {
  const byMaterial = new Map(
    groups.flatMap((g) => g.materials.map((m) => [m, { materialCode: m, sapMaterialGroup: g.sapMaterialGroup, planningGroupId: g.id }] as const)),
  );
  return {
    sapGroups: [...new Set(groups.filter((g) => g.isDefault).map((g) => g.sapMaterialGroup))].sort(),
    material: (code) => byMaterial.get(code) ?? null,
  };
}

interface HistoryRow {
  readonly key: string;
  readonly event: PlanningGroupEvent;
}

const AdminPlanningGroups: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const query = usePlanningGroups();
  const command = usePlanningGroupCommand();
  const availability = useVerbAvailability('planninggroup:manage');
  const held = availability.kind === 'held';
  const [create, setCreate] = useState({ name: '', sapMaterialGroup: '' });
  const [rename, setRename] = useState({ groupId: '', name: '' });
  const [move, setMove] = useState<{ groupId: string; materials: string[] }>({ groupId: '', materials: [] });

  const groups: readonly PlanningGroupView[] = useMemo(() => query.data?.items ?? [], [query.data]);
  const history = useMemo<HistoryRow[]>(() => {
    // A move sits in the history of every group it touched; list it once.
    const seen = new Map<string, HistoryRow>();
    groups.forEach((g) =>
      g.history.forEach((event) => {
        const key = JSON.stringify(event);
        if (!seen.has(key)) seen.set(key, { key, event });
      }),
    );
    return [...seen.values()].sort((a, b) => b.event.at.localeCompare(a.event.at));
  }, [groups]);

  const CRUMB = [t('adminPg.crumb.administration'), t('adminPg.crumb.page')];
  if (query.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (query.isError) return <ErrorState breadcrumb={CRUMB} error={query.error} onRetry={() => query.refetch()} />;

  const world = worldOf(groups);
  const labelOf = (g: PlanningGroupView) => planningGroupLabel(t, g);
  const labelById = (id: string) => {
    const g = groups.find((x) => x.id === id);
    return g ? labelOf(g) : id;
  };
  const byLabel = (a: ActorAttribution) =>
    a.kind === 'RESOLVED' ? a.person.displayName : t('adminPg.history.by.unattributed');
  const active = groups.filter((g) => g.state === 'active');
  const moveTarget = active.find((g) => g.id === move.groupId);
  // Materials that may move into the chosen group: same SAP group, not already in it.
  const movable = moveTarget
    ? groups
        .filter((g) => g.sapMaterialGroup === moveTarget.sapMaterialGroup && g.id !== moveTarget.id)
        .flatMap((g) => g.materials.map((m) => ({ code: m, from: g })))
    : [];

  const createRefusal = planningGroupRefusal({ kind: 'create', ...create }, world);
  const renameRefusal = rename.groupId ? planningGroupRefusal({ kind: 'rename', name: rename.name }, world) : null;
  const moveRefusal = moveTarget
    ? planningGroupRefusal({ kind: 'move', group: moveTarget, materialCodes: move.materials }, world)
    : null;
  const refusalLine = (r: { code: PlanningGroupRefusalCode } | null, id: string) =>
    r ? (
      <p className="text-xs text-warning-hover" data-testid={id}>
        {t(`adminPg.refusal.${r.code}`)}
      </p>
    ) : null;

  const run = async (vars: PlanningGroupCommandVars, done: string, reset: () => void) => {
    const result = await command.mutateAsync(vars);
    if (result.status === 'failed') {
      const code = refusalCodeOf(result.reason);
      toast({
        variant: 'error',
        title: code ? t(`adminPg.refusal.${code}`) : t('adminPg.toast.refused', { reason: result.reason ?? '' }),
      });
      return;
    }
    toast({ variant: 'success', title: done });
    reset();
  };

  const eventText = (e: PlanningGroupEvent): string => {
    switch (e.kind) {
      case 'created':
        return t('adminPg.event.created', { name: e.name, sap: e.sapMaterialGroup });
      case 'renamed':
        return t('adminPg.event.renamed', { name: e.name });
      case 'moved':
        return t('adminPg.event.moved', {
          materials: e.materialCodes.join(', '),
          to: labelById(e.groupId),
          from: e.fromGroupIds.map(labelById).join(', '),
        });
      case 'retired':
        return t('adminPg.event.retired', { name: labelById(e.groupId) });
    }
  };

  return (
    <AppShellV2>
      <PageHeader breadcrumb={CRUMB} title={t('adminPg.title')} subtitle={t('adminPg.subtitle')} />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid="adminpg-meta">
          {t('adminPg.meta.count', { count: groups.length })} ·{' '}
          {t('adminPg.meta.split', { count: groups.filter((g) => !g.isDefault).length })}
        </span>
        {/* The SAP material groups under them are the fixture copy of SAP. */}
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <AdminSectionNav />

      {held ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm" data-testid="adminpg-create">
            <h2 className="text-section text-text-primary">{t('adminPg.create.title')}</h2>
            <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminPg.create.intro')}</p>
            <label className="block mb-2">
              <span className="text-label text-text-tertiary uppercase">{t('adminPg.form.sapGroup')}</span>
              <select
                className={INPUT_CLASS}
                aria-label={t('adminPg.form.sapGroup')}
                data-testid="adminpg-create-sap"
                value={create.sapMaterialGroup}
                onChange={(e) => setCreate((c) => ({ ...c, sapMaterialGroup: e.target.value }))}
              >
                <option value="">{t('adminPg.form.chooseSap')}</option>
                {world.sapGroups.map((sap) => (
                  <option key={sap} value={sap}>
                    {`${sap} · ${t(`inv.group.${sap}`)}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-label text-text-tertiary uppercase">{t('adminPg.form.name')}</span>
              <input
                className={INPUT_CLASS}
                aria-label={t('adminPg.form.name')}
                data-testid="adminpg-create-name"
                value={create.name}
                onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))}
              />
            </label>
            {refusalLine(createRefusal, 'adminpg-create-refusal')}
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              disabled={command.isPending || createRefusal !== null}
              data-testid="adminpg-create-submit"
              onClick={() =>
                void run({ verb: 'create', ...create }, t('adminPg.toast.created', { name: create.name.trim() }), () =>
                  setCreate({ name: '', sapMaterialGroup: '' }),
                )
              }
            >
              {t('adminPg.create.submit')}
            </Button>
          </section>

          <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm" data-testid="adminpg-rename">
            <h2 className="text-section text-text-primary">{t('adminPg.rename.title')}</h2>
            <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminPg.rename.intro')}</p>
            <label className="block mb-2">
              <span className="text-label text-text-tertiary uppercase">{t('adminPg.form.group')}</span>
              <select
                className={INPUT_CLASS}
                aria-label={t('adminPg.rename.group')}
                data-testid="adminpg-rename-group"
                value={rename.groupId}
                onChange={(e) => setRename((r) => ({ ...r, groupId: e.target.value }))}
              >
                <option value="">{t('adminPg.form.chooseGroup')}</option>
                {active.map((g) => (
                  <option key={g.id} value={g.id}>
                    {labelOf(g)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-label text-text-tertiary uppercase">{t('adminPg.form.newName')}</span>
              <input
                className={INPUT_CLASS}
                aria-label={t('adminPg.form.newName')}
                data-testid="adminpg-rename-name"
                value={rename.name}
                onChange={(e) => setRename((r) => ({ ...r, name: e.target.value }))}
              />
            </label>
            {refusalLine(renameRefusal, 'adminpg-rename-refusal')}
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              disabled={command.isPending || rename.groupId === '' || renameRefusal !== null}
              data-testid="adminpg-rename-submit"
              onClick={() =>
                void run(
                  { verb: 'rename', groupId: rename.groupId, name: rename.name },
                  t('adminPg.toast.renamed', { name: rename.name.trim() }),
                  () => setRename({ groupId: '', name: '' }),
                )
              }
            >
              {t('adminPg.rename.submit')}
            </Button>
          </section>

          <section className="rounded-lg border border-border-subtle bg-white p-5 shadow-sm" data-testid="adminpg-move">
            <h2 className="text-section text-text-primary">{t('adminPg.move.title')}</h2>
            <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminPg.move.intro')}</p>
            <label className="block mb-2">
              <span className="text-label text-text-tertiary uppercase">{t('adminPg.move.into')}</span>
              <select
                className={INPUT_CLASS}
                aria-label={t('adminPg.move.into')}
                data-testid="adminpg-move-group"
                value={move.groupId}
                onChange={(e) => setMove({ groupId: e.target.value, materials: [] })}
              >
                <option value="">{t('adminPg.form.chooseGroup')}</option>
                {active.map((g) => (
                  <option key={g.id} value={g.id}>
                    {`${labelOf(g)} (${g.sapMaterialGroup})`}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="mb-3" data-testid="adminpg-move-materials">
              <legend className="text-label text-text-tertiary uppercase">{t('adminPg.move.materials')}</legend>
              {moveTarget && movable.length === 0 ? (
                <p className="text-xs text-text-tertiary">{t('adminPg.move.none')}</p>
              ) : null}
              {movable.map(({ code, from }) => (
                <label key={code} className="flex items-center gap-2 text-sm mt-1">
                  <input
                    type="checkbox"
                    data-testid={`adminpg-move-${code}`}
                    checked={move.materials.includes(code)}
                    onChange={(e) =>
                      setMove((m) => ({
                        ...m,
                        materials: e.target.checked ? [...m.materials, code] : m.materials.filter((x) => x !== code),
                      }))
                    }
                  />
                  <Data>{code}</Data>
                  <span className="text-xs text-text-tertiary">{t('adminPg.move.from', { group: labelOf(from) })}</span>
                </label>
              ))}
            </fieldset>
            {refusalLine(move.materials.length > 0 ? moveRefusal : null, 'adminpg-move-refusal')}
            <p className="text-xs text-text-tertiary mb-2">{t('adminPg.move.reEntry')}</p>
            <Button
              type="button"
              variant="outline"
              disabled={command.isPending || !moveTarget || moveRefusal !== null}
              data-testid="adminpg-move-submit"
              onClick={() =>
                void run(
                  { verb: 'move', groupId: move.groupId, materialCodes: move.materials },
                  t('adminPg.toast.moved', { count: move.materials.length, group: moveTarget ? labelOf(moveTarget) : '' }),
                  () => setMove({ groupId: '', materials: [] }),
                )
              }
            >
              {t('adminPg.move.submit')}
            </Button>
          </section>
        </div>
      ) : (
        <section className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3" data-testid="adminpg-gate">
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{t('adminPg.gate.title')}</span>
              <HandoffNotice availability={availability} testId="handoff-planninggroup-manage" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminPg.gate.body')}</p>
          </div>
        </section>
      )}

      <section className="mb-5" data-testid="adminpg-list">
        <h2 className="text-section text-text-primary">{t('adminPg.list.title')}</h2>
        <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminPg.list.intro')}</p>
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('adminPg.col.group')}</TableHeaderCell>
              <TableHeaderCell>{t('adminPg.col.sapGroup')}</TableHeaderCell>
              <TableHeaderCell>{t('adminPg.col.state')}</TableHeaderCell>
              <TableHeaderCell>{t('adminPg.col.materials')}</TableHeaderCell>
              {held ? <TableHeaderCell>{t('adminPg.col.action')}</TableHeaderCell> : null}
            </TableHeader>
            <tbody>
              {groups.map((g) => {
                const retireRefusal = planningGroupRefusal({ kind: 'retire', group: g }, world);
                return (
                  <TableRow key={g.id} data-testid={`adminpg-row-${g.id}`}>
                    <TableCell className="text-sm text-text-primary">
                      {/* i18n-defer: a planning group's name is data Material Planning typed */}
                      <div>{labelOf(g)}</div>
                      <Data className="text-xs">{g.id}</Data>
                      {g.isDefault ? <span className="ml-2 text-xs text-text-tertiary">{t('adminPg.default')}</span> : null}
                    </TableCell>
                    <TableCell>
                      <Data>{g.sapMaterialGroup}</Data>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={g.state === 'active' ? 'success' : 'neutral'}>{t(`adminPg.state.${g.state}`)}</StatusPill>
                    </TableCell>
                    <TableCell className="text-xs">
                      {g.materials.length > 0 ? <Data>{g.materials.join(', ')}</Data> : t('adminPg.materials.none')}
                    </TableCell>
                    {held ? (
                      <TableCell className="whitespace-nowrap">
                        {g.state === 'active' ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={command.isPending || retireRefusal !== null}
                            title={retireRefusal ? t(`adminPg.refusal.${retireRefusal.code}`) : undefined}
                            data-testid={`adminpg-retire-${g.id}`}
                            onClick={() => void run({ verb: 'retire', groupId: g.id }, t('adminPg.toast.retired', { name: labelOf(g) }), () => undefined)}
                          >
                            {t('adminPg.action.retire')}
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      </section>

      <section data-testid="adminpg-history">
        <h2 className="text-section text-text-primary mb-3">{t('adminPg.history.title')}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="adminpg-history-empty">
            {t('adminPg.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('adminPg.history.col.change')}</TableHeaderCell>
                <TableHeaderCell>{t('adminPg.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('adminPg.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {history.map(({ key, event }) => (
                  <TableRow key={key} data-testid={`adminpg-change-${event.kind}`}>
                    <TableCell className="text-sm text-text-secondary">{eventText(event)}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{byLabel(event.by)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDateTime(event.at)}</Data>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

export default AdminPlanningGroups;
