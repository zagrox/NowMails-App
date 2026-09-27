

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { CustomField } from '../api/types';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';

const CustomFieldsView = ({ apiKey }: { apiKey: string; }) => {
    const { t } = useTranslation(['customFields', 'common']);
    const [refetchIndex, setRefetchIndex] = useState(0);
    const { data: contactsData, loading, error } = useApiV4('/contacts', apiKey, { limit: 250 }, refetchIndex);
    
    const fieldsList: CustomField[] = useMemo(() => {
        if (!Array.isArray(contactsData)) return [];
        const discoveredFields = new Map<string, CustomField>();
        contactsData.forEach(contact => {
            if (contact.CustomFields) {
                Object.keys(contact.CustomFields).forEach(key => {
                    if (!discoveredFields.has(key)) {
                        const value = contact.CustomFields[key];
                        let dataType: CustomField['DataType'] = 'String';
                        if (typeof value === 'number') dataType = 'Number';
                        else if (typeof value === 'boolean') dataType = 'Boolean';
                        
                        discoveredFields.set(key, {
                            Name: key,
                            DataType: dataType
                        });
                    }
                });
            }
        });
        return Array.from(discoveredFields.values());
    }, [contactsData]);

    const predefinedFields = [
        { labelKey: 'birthdayLabel', fieldName: 'Birthday', descKey: 'birthdayDesc' },
        { labelKey: 'phoneLabel', fieldName: 'Phone', descKey: 'phoneDesc' },
        { labelKey: 'companyLabel', fieldName: 'Company', descKey: 'companyDesc' },
        { labelKey: 'streetLabel', fieldName: 'Street address', descKey: 'streetDesc' },
        { labelKey: 'cityLabel', fieldName: 'City', descKey: 'cityDesc' },
        { labelKey: 'zipLabel', fieldName: 'Zip code', descKey: 'zipDesc' },
        { labelKey: 'stateLabel', fieldName: 'State', descKey: 'stateDesc' },
        { labelKey: 'countryLabel', fieldName: 'Country', descKey: 'countryDesc' },
        { labelKey: 'consentLabel', fieldName: 'Consent', descKey: 'consentDesc' }
    ];

    return (
        <div>
            <div className="card" style={{ marginBottom: '2.5rem' }}>
                <div className="card-header">
                    <h3>{t('predefinedFieldsTitle')}</h3>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p className="view-subtitle" style={{ marginTop: 0 }}>{t('predefinedFieldsDesc')}</p>
                    <ul className="predefined-fields-list">
                        {predefinedFields.map(field => (
                            <li key={field.labelKey}>
                                <span className="field-label-translated">{t(field.labelKey)}</span>
                                <strong className="field-name-en">({field.fieldName})</strong>:&nbsp;
                                <span className="field-desc">{t(field.descKey)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
            <h3 className="content-title" style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>{t('discoveredFieldsTitle')}</h3>
            <p className="view-subtitle" style={{ marginTop: 0, marginBottom: '1.5rem' }}>{t('discoveredFieldsDesc')}</p>


            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            
            {!loading && !error && (
                fieldsList.length === 0 ? (
                    <CenteredMessage>
                        <div className="info-message">
                            <strong>{t('noCustomFields')}</strong>
                            <p>{t('noCustomFieldsDesc')}</p>
                        </div>
                    </CenteredMessage>
                ) : (
                    <div className="table-container">
                        <table className="simple-table">
                            <thead>
                                <tr>
                                    <th>{t('fieldName')}</th>
                                    <th>{t('fieldType')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fieldsList.map((field: CustomField) => (
                                    <tr key={field.Name}>
                                        <td><strong>{field.Name}</strong></td>
                                        <td>{t(field.DataType.toLowerCase())}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
};

export default CustomFieldsView;