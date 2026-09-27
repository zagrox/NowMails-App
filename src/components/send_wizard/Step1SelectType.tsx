
import React from 'react';
import { useTranslation } from 'react-i18next';
import WizardLayout from './WizardLayout';
import Icon, { ICONS } from '../Icon';

const Step1SelectType = ({ onNext, onBack, data, updateData }: { onNext: () => void; onBack: () => void; data: any; updateData: (d: any) => void; }) => {
    const { t } = useTranslation('send-wizard');

    const handleSelect = (type: string) => {
        updateData({ type });
    };

    return (
        <WizardLayout
            title={t('selectCampaignType')}
            onNext={onNext}
            onBack={onBack}
            nextDisabled={!data.type}
            backButtonText={t('exitWizard')}
        >
            <div className="wizard-step-intro">
                {/* FIX: Pass icon as child to Icon component */}
                <Icon>{ICONS.HASH}</Icon>
                <p>{t('selectCampaignType_desc')}</p>
            </div>
            <div className="selection-grid">
                <div
                    className={`selection-card ${data.type === 'regular' ? 'selected' : ''}`}
                    onClick={() => handleSelect('regular')}
                >
                    <h3 dangerouslySetInnerHTML={{ __html: t('regularCampaign') }} />
                    <div className="selection-card-radio"></div>
                </div>
                <div
                    className="selection-card disabled"
                    title={t('comingSoon')}
                >
                    <h3 dangerouslySetInnerHTML={{ __html: t('abTestCampaign') }} />
                    <div className="selection-card-radio"></div>
                </div>
            </div>
        </WizardLayout>
    );
};

export default Step1SelectType;
