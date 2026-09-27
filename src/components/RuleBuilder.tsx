
import React from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from './Icon';

const RULE_FIELDS = [
    {
        label: 'general', type: 'category',
        options: [
            'firstname', 'lastname', 'listname', 'status', 'source', 'unsubscribereason', 'email',
            'dateadded', 'dateupdated', 'statuschangedate', 'consentdate', 'consentip', 'consenttracking',
            'dayssincedateadded', 'dayssincedateupdated', 'dayssinceconsentdate', 'createdfromip', 'lasterror'
        ]
    },
    {
        label: 'statistics', type: 'category',
        options: [
            'totalsent', 'totalopens', 'totalclicks', 'totalbounces',
            'lastsent', 'lastopened', 'lastclicked', 'lastbounced',
            'dayssincelastsent', 'dayssincelastopened', 'dayssincelastclicked', 'dayssincelastbounced'
        ]
    },
    {
        label: 'custom', type: 'category',
        options: [
            'country', 'mobile', 'phone', 'company' // Common custom fields
        ]
    }
];

const OPERATORS = {
    string: ['=', '!=', 'contains', 'not-contains', 'starts-with', 'ends-with', 'like', 'not-like', 'is-empty', 'is-not-empty'],
    number: ['=', '!=', '>', '<', '>=', '<='],
    date: ['>', '<', '=', '!='],
    boolean: ['=']
};

const FIELD_TYPES: Record<string, keyof typeof OPERATORS> = {
    dateadded: 'date', dateupdated: 'date', statuschangedate: 'date', consentdate: 'date',
    lastsent: 'date', lastopened: 'date', lastclicked: 'date', lastbounced: 'date',
    dayssincedateadded: 'number', dayssincedateupdated: 'number', dayssinceconsentdate: 'number',
    totalsent: 'number', totalopens: 'number', totalclicks: 'number', totalbounces: 'number',
    consenttracking: 'boolean',
};

const getOperatorsForField = (field: string) => {
    const type = FIELD_TYPES[field] || 'string';
    return OPERATORS[type];
};

const operatorRequiresValue = (operator: string) => {
    return operator !== 'is-empty' && operator !== 'is-not-empty';
};


const RuleBuilder = ({ rules, setRules }: { rules: any[]; setRules: Function; }) => {
    const { t } = useTranslation('segments');

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules];
        const ruleToUpdate = { ...newRules[index], [field]: value };

        if (field === 'Field') {
            ruleToUpdate.Operator = getOperatorsForField(value)[0];
            ruleToUpdate.Value = '';
        }
        newRules[index] = ruleToUpdate;
        setRules(newRules);
    };

    const addRule = () => {
        setRules([...rules, { Field: 'email', Operator: 'contains', Value: '', conjunction: 'AND' }]);
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    return (
        <div className="rule-builder">
            <div className="rule-list">
                {rules.map((rule, index) => (
                    <div key={index} className="rule-group">
                        {index > 0 && (
                            <div className="rule-conjunction-toggle">
                                <button type="button" onClick={() => updateRule(index, 'conjunction', 'AND')} className={rule.conjunction === 'AND' ? 'active' : ''}>{t('and')}</button>
                                <button type="button" onClick={() => updateRule(index, 'conjunction', 'OR')} className={rule.conjunction === 'OR' ? 'active' : ''}>{t('or')}</button>
                            </div>
                        )}
                        <div className="rule-row">
                            <select value={rule.Field} onChange={(e) => updateRule(index, 'Field', e.target.value)}>
                               {RULE_FIELDS.map(group => (
                                    <optgroup key={group.label} label={t(`segmentFieldCategory_${group.label}`)}>
                                        {group.options.map(field => (
                                            <option key={field} value={field}>{t(`segmentField_${field}`)}</option>
                                        ))}
                                    </optgroup>
                               ))}
                            </select>
                            <select value={rule.Operator} onChange={(e) => updateRule(index, 'Operator', e.target.value)}>
                               {getOperatorsForField(rule.Field).map(op => (
                                   <option key={op} value={op}>{t(`segmentOperator_${op}`)}</option>
                               ))}
                            </select>
                             <input
                                type={FIELD_TYPES[rule.Field] === 'date' ? 'date' : FIELD_TYPES[rule.Field] === 'number' ? 'number' : 'text'}
                                value={rule.Value}
                                onChange={(e) => updateRule(index, 'Value', e.target.value)}
                                placeholder={t('enterValue')}
                                disabled={!operatorRequiresValue(rule.Operator)}
                                aria-label="Rule value"
                            />
                             <button type="button" className="btn-icon btn-icon-danger remove-rule-btn" onClick={() => removeRule(index)}>
                                <Icon>{ICONS.DELETE}</Icon>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="add-rule-btn-container">
                <button type="button" className="btn add-rule-btn" onClick={addRule}>
                    <Icon>{ICONS.PLUS}</Icon> {t('addAnotherRule')}
                </button>
            </div>
        </div>
    );
};

export default RuleBuilder;
