import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import LoadingState from '@components/ui-v2/LoadingState';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useSapInterface } from './interface/sapInterfaceDisplay';
import { useGoodsReceiptSettle } from '@services/query/commandHooks';
import { sapMessageStore } from '@services/data/mock/stores/sapMessageStore';
import {
  isRetryable,
  sapAgeParts,
  sapDataAge,
  SAP_LATENCY_TARGET_MINUTES,
  type SapFailedMessage,
  type SapObjectStatus,
} from '@services/data/sapInterfaceRules';

// ────────────────────────────────────────────────────────────────────────────
// Interface monitor — REQ-E07-08 (ADM). Reached from the user menu, not the
// main menu (NV-01): administration is not a working area.
//
// Per interface object: when it last moved, how many messages failed, and each
// failed message with its error, its reference and its time. CR-20 decides the
// retry — only a transport failure is offered one; a business refusal shows its
// reason and offers none, because the answer does not change until the data is
// fixed.
// ────────────────────────────────────────────────────────────────────────────

const AgeText: React.FC<{ lastSuccessAt: string | null; nowIso: string }> = ({
  lastSuccessAt,
  nowIso,
}) => {
  const { t } = useTranslation();
  const age = sapDataAge(lastSuccessAt, nowIso);
  if (age.minutes === null) return <span className="text-text-tertiary">{t('sap.age.never')}</span>;
  const { unit, value } = sapAgeParts(age.minutes);
  return <span className={age.stale ? 'text-warning-hover' : 'text-success'}>{t(`sap.age.${unit}`, { count: value })}</span>;
};

const FailedMessageRow: React.FC<{
  message: SapFailedMessage;
  onRetry: (m: SapFailedMessage) => void;
  busy: boolean;
}> = ({ message, onRetry, busy }) => {
  const { t } = useTranslation();
  const retryable = isRetryable(message);
  return (
    <div
      data-testid={`sap-message-${message.id}`}
      className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border-subtle bg-bg-hover px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-primary">{message.errorText}</div>
        <div className="mt-1 flex flex-wrap gap-4 text-xs text-text-tertiary">
          <span>
            {t('sap.message.reference')}: <Data>{message.correlationId}</Data>
          </span>
          <span>
            {t('sap.message.time')}: <Data>{formatDate(message.timestamp)}</Data>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {retryable ? (
          <>
            <StatusPill variant="warning">{t('sap.fault.transport')}</StatusPill>
            <Button
              variant="outline"
              icon={RefreshCw}
              disabled={busy}
              onClick={() => onRetry(message)}
              data-testid={`sap-retry-${message.id}`}
            >
              {t('sap.action.retry')}
            </Button>
          </>
        ) : (
          <>
            <StatusPill variant="danger">{t('sap.fault.refused')}</StatusPill>
            <span
              data-testid={`sap-noretry-${message.id}`}
              className="max-w-[16rem] text-xs text-text-tertiary"
            >
              {t('sap.message.noRetry')}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const ObjectCard: React.FC<{
  status: SapObjectStatus;
  nowIso: string;
  onRetry: (m: SapFailedMessage) => void;
  busy: boolean;
}> = ({ status, nowIso, onRetry, busy }) => {
  const { t } = useTranslation();
  return (
    <section
      data-testid={`sap-object-${status.object}`}
      className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-sm"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <h2 className="text-section text-text-primary">{t(`sap.object.${status.object}`)}</h2>
          <div className="text-xs text-text-tertiary">
            {t(`sap.direction.${status.direction}`)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="text-text-tertiary">
            {t('sap.object.lastSuccess')}:{' '}
            <AgeText lastSuccessAt={status.lastSuccessAt} nowIso={nowIso} />
          </span>
          <span
            data-testid={`sap-failures-${status.object}`}
            className={status.failureCount > 0 ? 'text-danger' : 'text-text-tertiary'}
          >
            {t('sap.object.failures')}: <Data>{status.failureCount}</Data>
          </span>
        </div>
      </div>
      {status.failures.length === 0 ? (
        <div className="py-2 text-sm text-text-tertiary">{t('sap.object.noFailures')}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {status.failures.map((m) => (
            <FailedMessageRow key={m.id} message={m} onRetry={onRetry} busy={busy} />
          ))}
        </div>
      )}
    </section>
  );
};

const InterfaceMonitor: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { objects, nowIso, isPending, refetch } = useSapInterface();
  const settle = useGoodsReceiptSettle();

  const CRUMB = [t('sap.crumb.administration'), t('sap.crumb.monitor')];

  const onRetry = (m: SapFailedMessage) => {
    // A REAL settle failure retries through the dispatcher's pending-settle
    // queue, on the SAME correlationId the failed settle left open. A simulated
    // inbound message is SAP re-sending a record — no hub entity moves, so it
    // is not a governed act and does not dispatch.
    if (m.settleCorrelationId) {
      settle.mutate(
        { correlationId: m.settleCorrelationId },
        {
          onSuccess: () => {
            refetch();
            toast({ variant: 'success', title: t('sap.toast.retried', { reference: m.correlationId }) });
          },
        },
      );
      return;
    }
    const cleared = sapMessageStore.retry(m.id, nowIso);
    refetch();
    toast({
      variant: cleared ? 'success' : 'error',
      title: cleared
        ? t('sap.toast.retried', { reference: m.correlationId })
        : t('sap.toast.notRetryable'),
    });
  };

  if (isPending) return <LoadingState breadcrumb={CRUMB} />;

  const openFailures = objects.reduce((s, o) => s + o.failureCount, 0);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('sap.header.title')}
        subtitle={t('sap.header.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-6">
        {t('sap.meta.target', { minutes: SAP_LATENCY_TARGET_MINUTES })} ·{' '}
        {t('sap.meta.openFailures', { count: openFailures })}
        {/* The arrivals are simulated: this prototype has no SAP, so the times
            come from the sample documents rather than from a feed. */}
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="flex flex-col gap-5">
        {objects.map((o) => (
          <ObjectCard
            key={o.object}
            status={o}
            nowIso={nowIso}
            onRetry={onRetry}
            busy={settle.isPending}
          />
        ))}
      </div>
    </AppShellV2>
  );
};

export default InterfaceMonitor;
