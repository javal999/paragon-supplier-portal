import { useTranslation } from 'react-i18next';
/** @import React from 'react' */
import FlowBox from './FlowBox';
import FlowArrow from './FlowArrow';

/**
 * The WeChat process flow: SAP → engine → channel → parser, then the auto-execute /
 * escalate fork. Every label is an i18n key under `supplierWhatsApp.wc.flow.*`.
 */
/** @type {React.FC} */
const WeChatFlow = () => {
  const { t } = useTranslation();
  return (
    <div>
      <FlowBox
        accent="border-l-navy"
        title={t('supplierWhatsApp.wc.flow.sap.title')}
        sub={t('supplierWhatsApp.wc.flow.sap.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.triggers')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.wc.flow.engine.title')}
        sub={t('supplierWhatsApp.wc.flow.engine.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.sendsVia')} />
      <FlowBox
        accent="border-l-text-tertiary"
        title={t('supplierWhatsApp.wc.flow.api.title')}
        sub={t('supplierWhatsApp.wc.flow.api.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.supplierReplies')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.wc.flow.parser.title')}
        sub={t('supplierWhatsApp.wc.flow.parser.sub')}
      />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <FlowBox
          accent="border-l-success"
          title={t('supplierWhatsApp.wc.flow.autoExecute.title')}
          sub={t('supplierWhatsApp.wc.flow.autoExecute.sub')}
        />
        <FlowBox
          accent="border-l-warning"
          title={t('supplierWhatsApp.wc.flow.escalate.title')}
          sub={t('supplierWhatsApp.wc.flow.escalate.sub')}
        />
      </div>
    </div>
  );
};

export default WeChatFlow;
