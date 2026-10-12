import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
import FlowBox from './FlowBox';
import FlowArrow from './FlowArrow';

/**
 * The email process flow: SAP → engine → channel → parser, then the auto-execute /
 * escalate fork. Every label is an i18n key under `supplierWhatsApp.email.flow.*`.
 */
/** @type {React.FC} */
const EmailFlow = () => {
  const { t } = useTranslation();
  return (
    <div>
      <FlowBox
        accent="border-l-navy"
        title={t('supplierWhatsApp.email.flow.sap.title')}
        sub={t('supplierWhatsApp.email.flow.sap.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.triggers')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.email.flow.engine.title')}
        sub={t('supplierWhatsApp.email.flow.engine.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.sendsVia')} />
      <FlowBox
        accent="border-l-text-tertiary"
        title={t('supplierWhatsApp.email.flow.gateway.title')}
        sub={t('supplierWhatsApp.email.flow.gateway.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.supplierReplies')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.email.flow.parser.title')}
        sub={t('supplierWhatsApp.email.flow.parser.sub')}
      />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <FlowBox
          accent="border-l-success"
          title={t('supplierWhatsApp.email.flow.autoExecute.title')}
          sub={t('supplierWhatsApp.email.flow.autoExecute.sub')}
        />
        <FlowBox
          accent="border-l-warning"
          title={t('supplierWhatsApp.email.flow.escalate.title')}
          sub={t('supplierWhatsApp.email.flow.escalate.sub')}
        />
      </div>
    </div>
  );
};

export default EmailFlow;
