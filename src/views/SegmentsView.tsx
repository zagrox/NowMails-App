
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useApiV4 from '../hooks/useApiV4';
import { apiFetch, apiFetchV4 } from '../api/elasticEmail';
import { Segment } from '../api/types';
import CenteredMessage from '../components/CenteredMessage';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import RenameModal from '../components/RenameModal';
import RuleBuilder from '../components/RuleBuilder';
import Icon, { ICONS } from '../components/Icon';
import ConfirmModal from '../components/ConfirmModal';
import LineLoader from '../components/LineLoader';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import useApi from './useApi';

const FIELD_TYPES: Record<string, 'date' | 'number' | 'boolean' | 'string'> = {
    dateadded: 'date', dateupdated: 'date', statuschangedate: 'date', consentdate: 'date',
    lastsent: 'date', lastopened: 'date', lastclicked: 'date', lastbounced: 'date',
    dayssincedateadded: 'number', dayssincedateupdated: 'number', dayssinceconsentdate: 'number',
    totalsent: 'number', totalopens: 'number', totalclicks: 'number', totalbounces: 'number',
    consenttracking: 'boolean',
};

const buildRuleString = (rules: any[]) => {
    return rules.map((r, index) => {
        const operator = r.Operator;
        let rulePart;
        
        if (operator === 'is-empty' || operator === 'is-not-empty') {
            rulePart = `${r.Field} ${operator}`;
        } else {
            const value = r.Value || '';
            const fieldType = FIELD_TYPES[r.Field as keyof typeof FIELD_TYPES] || 'string';
            let formattedValue = value;

            if (fieldType === 'string' || fieldType === 'date') {
                const escapedValue = value.replace(/'/g, "''");
                formattedValue = `'${escapedValue}'`;
            }
            rulePart = `${r.Field} ${operator} ${formattedValue}`;
        }

        if (index > 0) {
            return `${r.conjunction} ${rulePart}`;
        }
        return rulePart;
    }).join(' ');
};

const CreateSegmentModal = ({ isOpen, onClose, apiKey, onSuccess, onError }: { isOpen: boolean, onClose: () => void, apiKey: string, onSuccess: Function, onError: Function }) => {
    const { t } = useTranslation(['segments', 'common']);
    const [name, setName] = useState('');
    const [rules, setRules] = useState([{ Field: 'email', Operator: 'contains', Value: '', conjunction: 'AND' }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evaluation, setEvaluation] = useState<{ count: number | null, loading: boolean, error: string | null }>({ count: null, loading: false, error: null });

    const ruleString = useMemo(() => buildRuleString(rules), [rules]);

    const handleEvaluate = async () => {
        if (!ruleString) return;
        setEvaluation({ count: null, loading: true, error: null });
        try {
            const count = await apiFetch('/contact/count', apiKey, { params: { rule: ruleString } });
            setEvaluation({ count: Number(count), loading: false, error: null });
        } catch (e: any) {
            setEvaluation({ count: null, loading: false, error: e.message });
            onError(e.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || rules.some(r => !r.Field || !r.Operator)) {
            onError(t('segmentRuleValidationError'));
            return;
        }

        setIsSubmitting(true);
        
        try {
            await apiFetchV4('/segments', apiKey, {
                method: 'POST',
                body: { Name: name, Rule: ruleString }
            });
            onSuccess(name);
        } catch (err: any) {
            onError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('createNewSegment')}>
            <form onSubmit={handleSubmit} className="rule-builder-form">
                <div className="info-message warning">{t('segmentRuleSubRuleNotice')}</div>
                <div className="form-group">
                    <label htmlFor="segment-name">{t('segmentName')}</label>
                    <input id="segment-name" type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <RuleBuilder rules={rules} setRules={setRules} />
                <div className="segment-evaluation-section">
                    <div className="segment-rule-preview">
                        <strong>{t('rule')}:</strong>
                        <code>{ruleString}</code>
                    </div>
                    <div className="segment-evaluation-action">
                        <button type="button" className="link-button" onClick={handleEvaluate} disabled={evaluation.loading}>
                            {t('evaluate')}
                        </button>
                        {evaluation.loading && <Loader />}
                        {evaluation.count !== null && (
                             <span className="evaluation-result">{t('evaluationResult', { count: evaluation.count })}</span>
                        )}
                         {evaluation.error && (
                             <span className="evaluation-result error">{t('evaluationError')}</span>
                        )}
                    </div>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? <Loader/> : t('createSegment')}</button>
                </div>
            </form>
        </Modal>
    );
};

const ALL_OPERATORS_SORTED = [
    'is-not-empty', 'not-contains', 'starts-with', 'ends-with', 'not-like', 
    'is-empty', 'is-not', '>=', '<=', '!=', '>', '<', '=', 'contains', 'like', 'is'
];
const NO_VALUE_OPERATORS = ['is-empty', 'is-not-empty'];
const unquoteValue = (value: string = ''): string => {
    let val = value.trim();
    if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
    }
    return val.replace(/''/g, "'");
};

const parseRulePart = (partStr: string): { Field: string, Operator: string, Value: string } | null => {
    partStr = partStr.trim();
    
    for (const op of NO_VALUE_OPERATORS) {
        const opWithSpaces = ` ${op}`;
        if (partStr.toLowerCase().endsWith(opWithSpaces)) {
            const field = partStr.substring(0, partStr.length - opWithSpaces.length).trim();
            return { Field: field, Operator: op, Value: '' };
        }
    }

    for (const op of ALL_OPERATORS_SORTED) {
        const opRegex = new RegExp(`\\s+(${op})\\s+`, 'i');
        const match = partStr.match(opRegex);
        if (match && match.index) {
            const field = partStr.substring(0, match.index).trim();
            const value = partStr.substring(match.index + match[0].length).trim();
            return { Field: field, Operator: op, Value: unquoteValue(value) };
        }
    }
    console.warn("Could not parse rule part:", partStr);
    return null;
};

const EditSegmentRulesModal = ({ isOpen, onClose, apiKey, segment, onSuccess, onError }: { isOpen: boolean, onClose: () => void, apiKey: string, segment: Segment | null, onSuccess: (name: string) => void, onError: (msg: string) => void }) => {
    const { t } = useTranslation(['segments', 'common']);
    const [rules, setRules] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evaluation, setEvaluation] = useState<{ count: number | null, loading: boolean, error: string | null }>({ count: null, loading: false, error: null });
    
    useEffect(() => {
        if (segment?.Rule) {
            const ruleString = segment.Rule;
            const parts = ruleString.split(/\s+(AND|OR)\s+/i);
            const parsedRules = [];

            let firstRulePart = parts.shift();
            if (firstRulePart) {
                const parsed = parseRulePart(firstRulePart);
                if (parsed) {
                    parsedRules.push({ ...parsed, conjunction: 'AND' });
                }
            }
            
            for (let i = 0; i < parts.length; i += 2) {
                const conjunction = parts[i]?.toUpperCase();
                const rulePart = parts[i+1];
                if (rulePart && conjunction) {
                    const parsed = parseRulePart(rulePart);
                    if (parsed) {
                        parsedRules.push({ ...parsed, conjunction });
                    }
                }
            }
            setRules(parsedRules.length > 0 ? parsedRules : [{ Field: 'email', Operator: 'contains', Value: '', conjunction: 'AND' }]);
        } else if (segment) {
             setRules([{ Field: 'email', Operator: 'contains', Value: '', conjunction: 'AND' }]);
        }
    }, [segment]);

    const ruleString = useMemo(() => buildRuleString(rules), [rules]);

    const handleEvaluate = async () => {
        if (!ruleString) return;
        setEvaluation({ count: null, loading: true, error: null });
        try {
            const count = await apiFetch('/contact/count', apiKey, { params: { rule: ruleString } });
            setEvaluation({ count: Number(count), loading: false, error: null });
        } catch (e: any) {
            setEvaluation({ count: null, loading: false, error: e.message });
            onError(e.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!segment || rules.some(r => !r.Field || !r.Operator)) {
            onError(t('segmentRuleValidationError'));
            return;
        }

        setIsSubmitting(true);
        
        try {
            await apiFetchV4(`/segments/${encodeURIComponent(segment.Name)}`, apiKey, {
                method: 'PUT',
                body: { Name: segment.Name, Rule: ruleString }
            });
            onSuccess(segment.Name);
        } catch (err: any) {
            onError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('editRulesForSegment', { name: segment?.Name })}>
            <form onSubmit={handleSubmit} className="rule-builder-form">
                <RuleBuilder rules={rules} setRules={setRules} />
                <div className="segment-evaluation-section">
                    <div className="segment-rule-preview">
                        <strong>{t('rule')}:</strong>
                        <code>{ruleString}</code>
                    </div>
                    <div className="segment-evaluation-action">
                        <button type="button" className="link-button" onClick={handleEvaluate} disabled={evaluation.loading}>
                            {t('evaluate')}
                        </button>
                        {evaluation.loading && <Loader />}
                        {evaluation.count !== null && (
                             <span className="evaluation-result">{t('evaluationResult', { count: evaluation.count })}</span>
                        )}
                         {evaluation.error && (
                             <span className="evaluation-result error">{t('evaluationError')}</span>
                        )}
                    </div>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn" onClick={onClose} disabled={isSubmitting}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? <Loader/> : t('saveChanges')}</button>
                </div>
            </form>
        </Modal>
    );
};


const SegmentsView = ({ apiKey }: { apiKey: string }) => {
    const { t, i18n } = useTranslation(['segments', 'common']);
    const { addToast } = useToast();
    const [refetchIndex, setRefetchIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [segmentToRename, setSegmentToRename] = useState<Segment | null>(null);
    const [segmentToEditRules, setSegmentToEditRules] = useState<Segment | null>(null);
    const [segmentToDelete, setSegmentToDelete] = useState<string | null>(null);
    const [segmentCounts, setSegmentCounts] = useState<Record<string, { count: number | null; loading: boolean; error: boolean }>>({});

    const { data: segments, loading, error } = useApiV4('/segments', apiKey, {}, refetchIndex);
    const { data: totalContactsCount, loading: totalContactsLoading } = useApi('/contact/count', apiKey, { allContacts: true }, refetchIndex);
    const refetch = () => setRefetchIndex(i => i + 1);

    useEffect(() => {
        if (segments && Array.isArray(segments) && apiKey) {
            segments.forEach((seg: Segment) => {
                if (seg.Name !== 'All Contacts' && !segmentCounts[seg.Name]) { // Only fetch if not already there and not the special segment
                    setSegmentCounts(prev => ({ ...prev, [seg.Name]: { count: null, loading: true, error: false } }));
                    apiFetch('/contact/count', apiKey, { params: { rule: seg.Rule } })
                        .then(count => {
                            setSegmentCounts(prev => ({ ...prev, [seg.Name]: { count: Number(count), loading: false, error: false } }));
                        })
                        .catch(() => {
                            setSegmentCounts(prev => ({ ...prev, [seg.Name]: { count: null, loading: false, error: true } }));
                        });
                }
            });
        }
    }, [segments, apiKey, segmentCounts]);

    const handleCreateSuccess = (name: string) => {
        setIsCreateModalOpen(false);
        addToast(t('segmentCreatedSuccess', { name }), 'success');
        refetch();
    };
    
    const confirmDeleteSegment = async () => {
        if (!segmentToDelete) return;
        try {
            await apiFetchV4(`/segments/${encodeURIComponent(segmentToDelete)}`, apiKey, { method: 'DELETE' });
            addToast(t('segmentDeletedSuccess', { segmentName: segmentToDelete }), 'success');
            refetch();
        } catch (err: any) {
            addToast(t('segmentDeletedError', { error: err.message }), 'error');
        } finally {
            setSegmentToDelete(null);
        }
    };

    const handleRenameSegment = async (newName: string) => {
        if (!segmentToRename) return;
        try {
            await apiFetchV4(`/segments/${encodeURIComponent(segmentToRename.Name)}`, apiKey, {
                method: 'PUT',
                body: { Name: newName, Rule: segmentToRename.Rule }
            });
            addToast(t('segmentRenamedSuccess', { newName }), 'success');
            setSegmentToRename(null);
            setTimeout(() => refetch(), 1000);
        } catch (err: any) {
            addToast(t('segmentRenamedError', { error: err.message }), 'error');
        }
    };
    
    const filteredSegments: Segment[] = (segments || [])
        .filter((seg: Segment) => 
            seg.Name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => new Date(b.DateAdded).getTime() - new Date(a.DateAdded).getTime());

    return (
        <div>
            <CreateSegmentModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                apiKey={apiKey}
                onSuccess={handleCreateSuccess}
                onError={(msg: string) => addToast(msg, 'error')}
            />
            {segmentToRename && (
                <RenameModal
                    isOpen={!!segmentToRename}
                    onClose={() => setSegmentToRename(null)}
                    entityName={segmentToRename.Name}
                    entityType={t('segment')}
                    onSubmit={handleRenameSegment}
                />
            )}
             {segmentToEditRules && (
                <EditSegmentRulesModal
                    isOpen={!!segmentToEditRules}
                    onClose={() => setSegmentToEditRules(null)}
                    apiKey={apiKey}
                    segment={segmentToEditRules}
                    onSuccess={(name) => {
                        setSegmentToEditRules(null);
                        addToast(t('segmentRulesUpdatedSuccess', { name }), 'success');
                        refetch();
                    }}
                    onError={(msg: string) => addToast(t('segmentRulesUpdatedError', { error: msg }), 'error')}
                />
            )}
            <ConfirmModal
                isOpen={!!segmentToDelete}
                onClose={() => setSegmentToDelete(null)}
                onConfirm={confirmDeleteSegment}
                title={t('deleteSegment')}
            >
                <p>{t('confirmDeleteSegment', { segmentName: segmentToDelete })}</p>
            </ConfirmModal>
            
            <div className="view-header">
                 <div className="search-bar">
                    <Icon>{ICONS.SEARCH}</Icon>
                    <input type="search" placeholder={t('searchSegmentsPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Button className="btn-primary" onClick={() => setIsCreateModalOpen(true)} action="create_segment">
                    <Icon>{ICONS.PLUS}</Icon> {t('createSegment')}
                </Button>
            </div>

            {loading && <CenteredMessage><Loader /></CenteredMessage>}
            {error && <ErrorMessage error={error} />}
            {!loading && filteredSegments.length === 0 && (
                 searchQuery ? (
                    <CenteredMessage>{t('noSegmentsForQuery', { query: searchQuery })}</CenteredMessage>
                 ) : (
                    <EmptyState
                        icon={ICONS.SEGMENTS}
                        title={t('noSegmentsFound')}
                        message={t('noSegmentsFoundDesc')}
                        ctaText={t('createSegment')}
                        onCtaClick={() => setIsCreateModalOpen(true)}
                    />
                 )
            )}

            {filteredSegments.length > 0 && (
                <div className="card-grid list-grid">
                    {filteredSegments.map((seg: Segment) => {
                        const isAllContactsSegment = seg.Name === 'All Contacts';
                        const countInfo = isAllContactsSegment
                            ? { count: totalContactsCount, loading: totalContactsLoading, error: false }
                            : segmentCounts[seg.Name];
                        
                        return (
                            <div key={seg.Name} className="card segment-card">
                                <div className="segment-card-header">
                                    <h3>{isAllContactsSegment ? t('allContactsSegmentName') : seg.Name}</h3>
                                    <div className="action-buttons">
                                        <button className="btn-icon btn-icon-primary" onClick={() => !isAllContactsSegment && setSegmentToEditRules(seg)} disabled={isAllContactsSegment} aria-label={t('editSegmentRules')} title={isAllContactsSegment ? t('defaultSegmentCannotBeEdited') : t('editSegmentRules')}><Icon>{ICONS.SETTINGS}</Icon></button>
                                        <button className="btn-icon btn-icon-primary" onClick={() => !isAllContactsSegment && setSegmentToRename(seg)} disabled={isAllContactsSegment} aria-label={t('renameSegment')} title={isAllContactsSegment ? t('defaultSegmentCannotBeEdited') : t('renameSegment')}><Icon>{ICONS.PENCIL}</Icon></button>
                                        <button className="btn-icon btn-icon-danger" onClick={() => !isAllContactsSegment && setSegmentToDelete(seg.Name)} disabled={isAllContactsSegment} aria-label={t('deleteSegment')} title={isAllContactsSegment ? t('defaultSegmentCannotBeDeleted') : t('deleteSegment')}><Icon>{ICONS.DELETE}</Icon></button>
                                    </div>
                                </div>
                                <div className="segment-card-body">
                                    <p>{t('rule')}:</p>
                                    <div className="segment-rule">{isAllContactsSegment ? t('allContactsSegmentRule') : seg.Rule}</div>
                                </div>
                                <div className="segment-card-footer">
                                    <span>{t('contacts')}:</span>
                                    <strong>
                                        {countInfo?.loading ? (
                                            <div style={{ width: '50px', display: 'inline-block' }}><LineLoader /></div>
                                        ) : countInfo?.error ? (
                                            'N/A'
                                        ) : (
                                            countInfo?.count?.toLocaleString(i18n.language) ?? '...'
                                        )}
                                    </strong>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default SegmentsView;
