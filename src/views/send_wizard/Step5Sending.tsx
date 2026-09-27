
import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WizardLayout from '../../components/send_wizard/WizardLayout';
import Icon, { ICONS } from '../../components/Icon';
import useApiV4 from '../../hooks/useApiV4';
import useApi from '../../views/useApi';
import Loader from '../../components/Loader';
import { AppActions } from '../../config/actions';

const SummaryItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
    if (!value && value !== 0) return null;
    return (
        <>
            <dt>{label}</dt>
            <dd style={{ textAlign: 'right', wordBreak: 'break-all' }}>{value}</dd>
        </>
    );
};

const Step5Sending = ({ onSubmit, onBack, data, updateData, apiKey, isSubmitting, payloadForDisplay }: { onSubmit: () => void; onBack: () => void; data: any; updateData: (d: any) => void; apiKey: string; isSubmitting: boolean; payloadForDisplay: string; }) => {
    const { t, i18n } = useTranslation(['send-wizard', 'sendEmail', 'common', 'dashboard']);
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});
    const { data: accountData, loading: balanceLoading } = useApi('/account/load', apiKey, {}, apiKey ? 1 : 0);

    const userBalance = accountData?.emailcredits ?? 0;
    const creditsNeeded = data.recipientCount || 0;
    const hasEnoughCredits = userBalance >= creditsNeeded;

    const isSendingAction = data.sendAction === 'schedule' || data.sendAction === 'now';
    const isSubmitDisabled = (isSendingAction && !hasEnoughCredits) || domainsLoading;

    const nextAction = data.sendAction === 'later'
        ? AppActions.SAVE_MARKETING_DRAFT
        : AppActions.SEND_MARKETING_CAMPAIGN;

    const defaultFromEmail = useMemo(() => {
        if (!Array.isArray(domains)) return '................@.................';

        const verifiedDomains = domains.filter(d =>
            String(d.Spf).toLowerCase() === 'true' &&
            String(d.Dkim).toLowerCase() === 'true'
        );

        if (verifiedDomains.length > 0) {
            return verifiedDomains[0].DefaultSender || `mailer@${verifiedDomains[0].Domain}`;
        }

        return 'no-verified-domain@found.com';
    }, [domains]);

    useEffect(() => {
        if (data.sendAction === 'schedule' && !data.scheduleDateTime) {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5); // Default to 5 mins in the future
            now.setSeconds(0);
            now.setMilliseconds(0);
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd