import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUploadV4 } from '../api/elasticEmail';
import { List, CustomField } from '../api/types';
import useApiV4 from '../hooks/useApiV4';
import Modal from './Modal';
import Loader from './Loader';
import Button from './Button';
import Badge from './Badge';
import Icon, { ICONS } from './Icon';

const ImportWizardModal = ({ isOpen, onClose, apiKey, onSuccess, onError, initialListName = '' }: { isOpen: boolean; onClose: () => void; apiKey: string; onSuccess: () => void; onError: (msg: string) => void; initialListName?: string; }) => {
    const { t } = useTranslation(['contacts', 'common', 'customFields']);
    
    // Wizard State
    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Step 1 State
    const [file, setFile] = useState<File | null>(null);
    const [listName, setListName] = useState(initialListName);
    const [updateExisting, setUpdateExisting] = useState(true);
    const [consentChecked, setConsentChecked] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    
    // Step 2 State
    const [csvData, setCsvData] = useState<{ headers: string[], preview: string[][] }>({ headers: [], preview: [] });
    const [mappings, setMappings] = useState<Record<string, string>>({});

    const { data: lists, loading: listsLoading } = useApiV4('/lists', apiKey, {}, isOpen ? 1 : 0);
    const { data: customFieldsApi } = useApiV4('/fields', apiKey, {}, isOpen ? 1 : 0);

    const availableFields = useMemo(() => {
        const standard = ['Email', 'FirstName', 'LastName', 'Phone', 'Company', 'City', 'Country', 'Zip'];
        // Explicitly map custom fields to strings
        const custom = (Array.isArray(customFieldsApi) ? customFieldsApi : []).map((f: any) => f.Name as string);
        return [...standard, ...custom];
    }, [customFieldsApi]);

    const resetState = useCallback(() => {
        setStep(1);
        setIsProcessing(false);
        setFile(null);
        setListName(initialListName || '');
        setUpdateExisting(true);
        setConsentChecked(false);
        setDragOver(false);
        setCsvData({ headers: [], preview: [] });
        setMappings({});
    }, [initialListName]);

    useEffect(() => {
        if (isOpen) {
            resetState();
        }
    }, [isOpen, resetState]);


    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            if (files[0].type === 'text/csv' || files[0].name.endsWith('.csv')) {
                setFile(files[0]);
            } else {
                onError(t('invalidFileType'));
            }
        }
    };

    const handleDragEvents = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: React.DragEvent) => { handleDragEvents(e); setDragOver(true); };
    const handleDragLeave = (e: React.DragEvent) => { handleDragEvents(e); setDragOver(false); };
    const handleDrop = (e: React.DragEvent) => {
        handleDragEvents(e);
        setDragOver(false);
        handleFileChange(e.dataTransfer.files);
    };

    const autoMapField = (header: string): string => {
        const normalizedHeader = header.toLowerCase().replace(/[\s_]/g, '');
        const fieldMap: Record<string, string> = {
            'email': 'Email', 'emailaddress': 'Email',
            'firstname': 'FirstName', 'first_name': 'FirstName', 'givenname': 'FirstName', 'name': 'FirstName',
            'lastname': 'LastName', 'last_name': 'LastName', 'surname': 'LastName',
            'phone': 'Phone', 'phonenumber': 'Phone',
            'company': 'Company', 'organization': 'Company',
        };
        const foundField = availableFields.find(f => f.toLowerCase() === normalizedHeader);
        // Cast foundField to string | undefined to prevent unknown type errors
        return fieldMap[normalizedHeader] || (foundField as string | undefined) || 'skip';
    };

    const handleParseAndProceed = async () => {
        if (!file) return;
        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const result = e.target?.result;
            // Explicit check to ensure result is a string
            if (typeof result !== 'string') {
                onError("Could not read file content as text.");
                setIsProcessing(false);
                return;
            }
            const text = result;
            const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '');
            if (lines.length < 1) {
                onError("CSV file is empty or invalid.");
                setIsProcessing(false);
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const preview = lines.slice(1, 4).map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')));
            
            const initialMappings: Record<string, string> = {};
            headers.forEach(h => {
                initialMappings[h] = autoMapField(h);
            });
            
            setCsvData({ headers, preview });
            setMappings(initialMappings);
            setIsProcessing(false);
            setStep(2);
        };
        reader.onerror = () => {
            onError("Failed to read the file.");
            setIsProcessing(false);
        };
        reader.readAsText(file);
    };

    const handleMappingChange = (header: string, field: string) => {
        setMappings(prev => ({ ...prev, [header]: field }));
    };

    const handleImport = async () => {
        if (!file) return;
        setIsProcessing(true);

        const formData = new FormData();
        formData.append('file', file);
        if (listName) formData.append('listName', listName);
        formData.append('allowUpdate', String(updateExisting));
        
        const finalMappings: Record<string, string> = {};
        Object.entries(mappings).forEach(([header, field]) => {
            if (field !== 'skip') {
                finalMappings[header] = field;
            }
        });
        
        if (Object.keys(finalMappings).length > 0) {
            formData.append('mapping', JSON.stringify(finalMappings));
        }

        try {
            await apiUploadV4('/contacts/import', apiKey, formData);
            onSuccess();
        } catch (err: any) {
            onError(err.message || "An unknown error occurred during import.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const isStep1NextDisabled = !file || !consentChecked || isProcessing;
    const isStep2ImportDisabled = !Object.values(mappings).some(f => f === 'Email') || isProcessing;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 1 ? t('importWizardStep1Title') : t('importWizardStep2Title')}
            size="large"
        >
            {step === 1 && (
                <form onSubmit={e => { e.preventDefault(); handleParseAndProceed(); }} className="modal-form">
                    <div className="form-group">
                        <label>{t('uploadCsvFile')}</label>
                        <div
                            className={`file-dropzone ${dragOver ? 'drag-over' : ''}`}
                            onClick={() => document.getElementById('csv-input-wizard')?.click()}
                            onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragEvents} onDrop={handleDrop}
                        >
                            <input type="file" id="csv-input-wizard" accept=".csv, text/csv" onChange={(e) => handleFileChange(e.target.files)} style={{ display: 'none' }} />
                            {file ? <p className="file-name">{t('selectedFile', { fileName: file.name })}</p> : <p><strong>{t('clickToBrowse')}</strong> {t('orDragAndDrop')}</p>}
                        </div>
                        <p className="field-hint">{t('supportedFilesNote')}</p>
                    </div>
                    <div className="form-group">
                        <label htmlFor="listName">{t('addToListOptional')}</label>
                        <select id="listName" value={listName} onChange={e => setListName(e.target.value)} disabled={listsLoading || !!initialListName}>
                            <option value="">{t('dontAddToList')}</option>
                            {lists?.map((l: List) => <option key={l.ListName} value={l.ListName}>{l.ListName}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="custom-checkbox"><input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} /><span className="checkbox-checkmark"></span><span className="checkbox-label" style={{ fontWeight: 'normal' }}>{t('updateExistingContacts')}</span></label>
                        <label className="custom-checkbox"><input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} required /><span className="checkbox-checkmark"></span><span className="checkbox-label" style={{ fontWeight: 'normal' }}>{t('consentConfirmation')}</span></label>
                    </div>
                    <div className="form-actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button type="button" className="btn" onClick={onClose} disabled={isProcessing}>{t('cancel')}</Button>
                        <Button type="submit" className="btn-primary" disabled={isStep1NextDisabled}>
                            {isProcessing ? <Loader /> : t('continue')}
                        </Button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <div className="import-wizard-step2">
                    <div className="table-container mapping-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('mappingStatus')}</th>
                                    <th>{t('mappingColumnHeader')}</th>
                                    <th>{t('mappingDataPreview')}</th>
                                    <th>{t('mappingContactField')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {csvData.headers.map((header, index) => {
                                    const mappedField = mappings[header];
                                    const isMatched = mappedField && mappedField !== 'skip';
                                    return (
                                        <tr key={index}>
                                            <td>
                                                {isMatched ? <Badge text={t('mappingMatched')} type="success" /> : <Badge text={t('mappingSkipped')} />}
                                            </td>
                                            <td><strong>{header}</strong></td>
                                            <td>
                                                <div className="preview-data">
                                                    {csvData.preview.map((row, rIndex) => <div key={rIndex}>{row[index]}</div>)}
                                                </div>
                                            </td>
                                            <td>
                                                <select value={mappedField} onChange={e => handleMappingChange(header, e.target.value)}>
                                                    <option value="skip">{t('mappingSkipColumn')}</option>
                                                    <optgroup label={t('standardFields', { ns: 'customFields' })}>
                                                        {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                                                    </optgroup>
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                     <div className="form-actions" style={{ marginTop: '1.5rem', justifyContent: 'space-between' }}>
                        <Button type="button" className="btn-secondary" onClick={() => setStep(1)} disabled={isProcessing}>{t('back')}</Button>
                        <Button type="button" className="btn-primary" onClick={handleImport} disabled={isStep2ImportDisabled}>
                            {isProcessing ? <Loader /> : t('import')}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
export default ImportWizardModal;