import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import Icon, { ICONS } from '../components/Icon';
import Badge from '../components/Badge';
import { useStatusStyles } from '../hooks/useStatusStyles';
import Loader from '../components/Loader';
import Button from '../components/Button';
import useApiV4 from '../hooks/useApiV4';
import CenteredMessage from '../components/CenteredMessage';
import ErrorMessage from '../components/ErrorMessage';
import { apiFetchV4 } from '../api/elasticEmail';

const DNS_RECORDS_CONFIG = {
    SPF: {
        type: 'TXT',
        name: (domain: string) => domain,
        expectedValue: 'v=spf1 a mx include:mailzila.com ~all',
        check: (data: string) => data.includes('v=spf1') && data.includes('include:mailzila.com'),
        host: '@',
    },
    DKIM: {
        type: 'TXT',
        name: (domain: string) => `api._domainkey.${domain}`,
        expectedValue: 'k=rsa;t=s;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbmGbQMzYeMvxwtNQoXN0waGYaciuKx8mtMh5czguT4EZlJXuCt6V+l56mmt3t68FEX5JJ0q4ijG71BGoFRkl87uJi7LrQt1ZZmZCvrEII0YO4mp8sDLXC8g1aUAoi8TJgxq2MJqCaMyj5kAm3Fdy2tzftPCV/lbdiJqmBnWKjtwIDAQAB',
        check: (data: string) => data.includes('k=rsa;') && data.includes('p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbmGbQMzYeMvxwtNQoXN0waGYaciuKx8mtMh5czguT4EZlJXuCt6V+l56mmt3t68FEX5JJ0q4ijG71BGoFRkl87uJi7LrQt1ZZmZCvrEII0YO4mp8sDLXC8g1aUAoi8TJgxq2MJqCaMyj5kAm3Fdy2tzftPCV/lbdiJqmBnWKjtwIDAQAB'),
        host: 'api._domainkey',
    },
    Tracking: {
        type: 'CNAME',
        name: (domain: string) => `tracking.${domain}`,
        expectedValue: 'app.mailzila.com',
        check: (data: string) => data.includes('app.mailzila.com'),
        host: 'tracking',
    },
    DMARC: {
        type: 'TXT',
        name: (domain: string) => `_dmarc.${domain}`,
        expectedValue: 'v=DMARC1;p=none;pct=10;aspf=r;adkim=r;',
        check: (data: string) => data.includes('v=DMARC1'),
        host: '_dmarc',
    },
};

type VerificationStatus = 'idle' | 'checking' | 'verified' | 'failed';

interface VerificationRecordCardProps {
    recordKey: string;
    domainName: string;
    status: VerificationStatus;
    onVerify: (key: string) => void;
}

const VerificationRecordCard: React.FC<VerificationRecordCardProps> = ({ recordKey, domainName, status, onVerify }) => {
    const { t } = useTranslation(['domains', 'common']);
    const { addToast } = useToast();
    const { getStatusStyle } = useStatusStyles();
    // @ts-ignore
    const config = DNS_RECORDS_CONFIG[recordKey];
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast(t('copied', { ns: 'common' }), 'success');
    };

    const statusMap = {
        idle: getStatusStyle('Not Verified'),
        checking: getStatusStyle('Checking'),
        verified: getStatusStyle('Verified'),
        failed: getStatusStyle('Failed'),
    };
    const currentStatus = statusMap[status];

    return (
        <div className="card verification-record-card">
            <div className="card-header">
                <h3>{t('recordType', { type: recordKey })}</h3>
                <Badge text={currentStatus.text} type={currentStatus.type} iconPath={currentStatus.iconPath} />
            </div>
            <div className="card-body">
                <p className="record-instruction">{t(`recordInstruction${recordKey}`, {ns: 'domains'})}</p>
                <div className="record-details-grid">
                    <span>{t('type')}</span>
                    <code>{config.type}</code>
                    
                    <span>{t('host')}</span>
                    <div className="copyable-field">
                        <code>{config.host}</code>
                        <button onClick={() => copyToClipboard(config.host)} className="btn-icon"><Icon>{ICONS.COPY}</Icon></button>
                    </div>

                    <span>{t('value')}</span>
                    <div className="copyable-field">
                        <code>{config.expectedValue}</code>
                        <button onClick={() => copyToClipboard(config.expectedValue)} className="btn-icon"><Icon>{ICONS.COPY}</Icon></button>
                    </div>
                </div>
            </div>
            <div className="card-footer">
                <Button onClick={() => onVerify(recordKey)} disabled={status === 'checking'}>
                    {status === 'checking' ? <Loader /> : <Icon>{ICONS.VERIFY}</Icon>}
                    <span>{t('verify')}</span>
                </Button>
            </div>
        </div>
    );
};


const DomainVerificationView = ({ domainName, apiKey, onBack }: { domainName: string, apiKey: string, onBack: () => void }) => {
    const { t, i18n } = useTranslation(['domains', 'common']);
    const { addToast } = useToast();
    const [statuses, setStatuses] = useState<Record<string, VerificationStatus>>(
      Object.keys(DNS_RECORDS_CONFIG).reduce((acc, key) => ({ ...acc, [key]: 'idle' }), {})
    );
    const [isCheckingAll, setIsCheckingAll] = useState(false);

    const { data: domainDetails, loading: domainLoading, error: domainError } = useApiV4(
        domainName ? `/domains/${encodeURIComponent(domainName)}` : '',
        apiKey
    );
    
    useEffect(() => {
        if (domainDetails) {
            const initialStatuses: Record<string, VerificationStatus> = {
                SPF: domainDetails.Spf === true ? 'verified' : 'idle',
                DKIM: domainDetails.Dkim === true ? 'verified' : 'idle',
                Tracking: domainDetails.TrackingStatus === 'Validated' ? 'verified' : 'idle',
                DMARC: 'idle', // DMARC status is not provided by the API, requires manual client-side check.
            };
            setStatuses(initialStatuses);
        }
    }, [domainDetails]);

    const checkDns = async (key: string) => {
        setStatuses(prev => ({ ...prev, [key]: 'checking' }));
        // @ts-ignore
        const config = DNS_RECORDS_CONFIG[key];
        try {
            const response = await fetch(`https://dns.google/resolve?name=${config.name(domainName)}&type=${config.type}`);
            if (!response.ok) throw new Error(`DNS lookup failed with status ${response.status}`);
            
            const result = await response.json();
            let isVerified = false;
            if (result.Status === 0 && result.Answer) {
                const foundRecord = result.Answer.find((ans: any) => config.check(ans.data.replace(/"/g, '')));
                if (foundRecord) isVerified = true;
            }
            setStatuses(prev => ({ ...prev, [key]: isVerified ? 'verified' : 'failed' }));
        } catch (error) {
            console.error(`Error checking ${key}:`, error);
            setStatuses(prev => ({ ...prev, [key]: 'failed' }));
        }
    };

    const handleVerifyAll = async () => {
        setIsCheckingAll(true);
        const latestDetails = await apiFetchV4(`/domains/${encodeURIComponent(domainName)}`, apiKey);
        if (latestDetails) {
            const apiStatuses: Record<string, VerificationStatus> = {
                SPF: latestDetails.Spf === true ? 'verified' : 'idle',
                DKIM: latestDetails.Dkim === true ? 'verified' : 'idle',
                Tracking: latestDetails.TrackingStatus === 'Validated' ? 'verified' : 'idle',
                DMARC: 'idle',
            };
             setStatuses(apiStatuses);
        }
        for (const key of Object.keys(DNS_RECORDS_CONFIG)) {
            // @ts-ignore
            if (statuses[key] !== 'verified') {
                 await checkDns(key);
            }
        }
        setIsCheckingAll(false);
    };
    
    if (domainLoading) {
        return <div className="domain-verification-view"><CenteredMessage><Loader /></CenteredMessage></div>;
    }
    
    if (domainError) {
        return <div className="domain-verification-view"><ErrorMessage error={domainError} /></div>;
    }

    return (
        <div className="domain-verification-view">
             <div className="view-header" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
                 <button className="btn btn-secondary" onClick={onBack} style={{ whiteSpace: 'nowrap' }}>
                    {i18n.dir() === 'rtl' ? (
                        <>
                            <span>{t('backToDomains', {ns: 'domains'})}</span>
                            <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                        </>
                    ) : (
                        <>
                            <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                            <span>{t('backToDomains', {ns: 'domains'})}</span>
                        </>
                    )}
                </button>
                 <h2 className="content-header" style={{margin: 0, borderBottom: 'none', fontSize: '1.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t('verifyDomainTitle', { ns: 'domains', domainName })}
                </h2>
                <div className="header-actions">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <Button onClick={handleVerifyAll} className="btn-primary" disabled={isCheckingAll}>
                            {isCheckingAll ? <Loader /> : <Icon>{ICONS.VERIFY}</Icon>}
                            <span>{t('verifyAll', {ns: 'domains'})}</span>
                        </Button>
                        <a href="https://mailzila.com/docs/domain/" target="_blank" rel="noopener noreferrer" className="link-button" style={{ fontSize: '0.9rem' }}>
                            {t('howToVerifyDomain', { ns: 'domains' })}
                        </a>
                    </div>
                </div>
            </div>

            <div className="verification-records-grid">
                {Object.keys(DNS_RECORDS_CONFIG).map(key => (
                    <VerificationRecordCard
                        key={key}
                        recordKey={key}
                        domainName={domainName}
                        status={statuses[key]}
                        onVerify={checkDns}
                    />
                ))}
            </div>
        </div>
    );
};

export default DomainVerificationView;