
import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
} from '@dnd-kit/sortable';
import { produce } from 'immer';

import Icon, { ICONS, SOCIAL_ICONS } from '../components/Icon';
import Toolbar, { TOOLBAR_COMPONENTS } from '../components/email_builder/Toolbar';
import Canvas from '../components/email_builder/Canvas';
import { renderBlock } from '../components/email_builder/blocks';
import MediaManagerModal from '../components/media_manager/MediaManagerModal';
import { FileInfo, Template } from '../api/types';
import { ELASTIC_EMAIL_API_V4_BASE } from '../api/config';
import { useToast } from '../contexts/ToastContext';
import Loader from '../components/Loader';
import SettingsPanel from '../components/email_builder/settings/SettingsPanel';
import Modal from '../components/Modal';
import { apiFetchV4 } from '../api/elasticEmail';
import Button from '../components/Button';
import { AppActions } from '../config/actions';
import useApiV4 from '../hooks/useApiV4';


const generateId = (prefix = 'block') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- START UNICODE-SAFE BASE64 HELPERS ---
// Encode a UTF-8 string to Base64 using modern browser APIs
const encodeState = (str: string): string => {
    // 1. Encode the string to a Uint8Array of UTF-8 bytes.
    const bytes = new TextEncoder().encode(str);
    // 2. Create a binary string from the byte array.
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    // 3. Base64 encode the binary string.
    return window.btoa(binary);
}

// Decode a Base64 string to UTF-8 using modern browser APIs
const decodeState = (base64: string): string => {
    // 1. Decode the Base64 string to a binary string.
    const binary_string = window.atob(base64);
    // 2. Create a Uint8Array from the binary string.
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    // 3. Decode the UTF-8 bytes back to a string.
    return new TextDecoder().decode(bytes);
}
// --- END UNICODE-SAFE BASE64 HELPERS ---


// --- START HTML GENERATION ---
const styleObjectToString = (style: React.CSSProperties | undefined): string => {
    if (!style) return '';
    return Object.entries(style)
        .map(([key, value]) => {
            if (value === undefined || value === null || value === '') return '';
            const kebabKey = key.replace(/([a-z09]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            
            if (kebabKey === 'padding-y') {
                const pxVal = typeof value === 'number' ? `${value}px` : value;
                return `padding-top: ${pxVal}; padding-bottom: ${pxVal};`;
            }
            if (kebabKey === 'padding-x') {
                const pxVal = typeof value === 'number' ? `${value}px` : value;
                return `padding-left: ${pxVal}; padding-right: ${pxVal};`;
            }
            
            const cssValue = typeof value === 'number' && !['line-height', 'font-weight', 'opacity', 'flex'].includes(kebabKey)
                ? `${value}px`
                : value;
            
            return `${kebabKey}: ${cssValue};`;
        })
        .join(' ');
};

const renderBlockToHtml = (block: any): string => {
    const { type, content, style } = block;
    const styleStr = styleObjectToString(style);

    switch (type) {
        case 'Header': {
            // For headers, we inject inline styles into the H tag to force it to inherit properties
            // from the parent wrapper (which holds the user's selected styles).
            // This overrides default browser user agent styles (like font-weight: bold).
            const rawHtml = content.html || '';
            const cleanHeaderHtml = rawHtml.replace(/<h([1-6])/, '<h$1 style="margin:0; font-weight:inherit; font-size:inherit; line-height:inherit; color:inherit;"');
            return `<div style="${styleStr}">${cleanHeaderHtml}</div>`;
        }
        case 'Text': {
             // For text blocks, we replace newlines (from textarea) with <br/> tags.
             const textHtml = (content.html || '').replace(/\n/g, '<br/>');
             return `<div style="${styleStr}">${textHtml}</div>`;
        }
        case 'Footer':
            return `<div style="${styleStr}">${content.html || ''}</div>`;
        case 'Image': {
            const s = style;
            const c = content;
            const imgStyle = styleObjectToString({
                display: 'block', // Keep for gmail gap fix
                maxWidth: '100%',
                width: c.width === 'auto' ? 'auto' : `${parseInt(String(c.width), 10)}px`,
                height: c.height === 'auto' ? 'auto' : `${parseInt(String(c.height), 10)}px`,
                borderRadius: s.borderRadius ? `${parseInt(String(s.borderRadius), 10)}px` : '0px',
            });
            // The width attribute is important for Outlook.
            const imgWidth = c.width === 'auto' ? '' : `width="${parseInt(String(c.width), 10)}"`;

            const img = `<img src="${c.src}" alt="${c.alt || ''}" style="${imgStyle}" ${imgWidth} />`;

            // display: block on the link is also a good practice to avoid gaps.
            const linkedImg = c.href
                ? `<a href="${c.href}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: block;">${img}</a>`
                : img;

            // This td handles padding and background for the whole block.
            const outerTdStyle = styleObjectToString({
                paddingTop: s.paddingTop,
                paddingRight: s.paddingRight,
                paddingBottom: s.paddingBottom,
                paddingLeft: s.paddingLeft,
                backgroundColor: s.backgroundColor || 'transparent',
            });
            
            // This table will be aligned left/center/right. It will shrink to fit the image.
            const imageTableAlign = `align="${s.textAlign || 'center'}"`;

            // This td contains the image. It handles vertical alignment and gap fixes.
            const innerTdStyle = styleObjectToString({
                 fontSize: 0,
                 lineHeight: 0,
            });

            return `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="${outerTdStyle}">
                            <table border="0" cellpadding="0" cellspacing="0" ${imageTableAlign}>
                                <tr>
                                    <td valign="${s.verticalAlign || 'middle'}" style="${innerTdStyle}">
                                        ${linkedImg}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `;
        }
        case 'Button': {
            const tableAlign = style.width === 'full' ? 'center' : style.textAlign;
            const buttonStyle = styleObjectToString({
                display: 'inline-block',
                backgroundColor: style.backgroundColor,
                color: style.textColor,
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                lineHeight: '120%',
                margin: 0,
                textDecoration: 'none',
                textTransform: 'none',
                padding: `${style.paddingY} ${style.paddingX}`,
                borderRadius: style.borderRadius,
            });
            return `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="${tableAlign}" style="padding: 10px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" valign="middle" bgcolor="${style.backgroundColor}" style="border-radius:${style.borderRadius};">
                                        <a href="${content.href}" target="_blank" style="${buttonStyle}">${content.text}</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `;
        }
        case 'Spacer':
            return `<div style="height: ${content.height}px; background-color: ${style.backgroundColor || 'transparent'};"></div>`;
        case 'Divider': {
            const wrapperStyle = styleObjectToString({
                padding: `${style.paddingY} 0`,
                backgroundColor: style.backgroundColor || 'transparent'
            });
             const lineStyle = styleObjectToString({
                borderTop: `${style.height} ${style.style} ${style.color}`
             });
            return `<div style="${wrapperStyle}"><div style="${lineStyle}"></div></div>`;
        }
        case 'Social': {
            const s = style;
            const c = content;
            const items = c.items || [];
            if (items.length === 0) return '';
 
            const iconColors: Record<string, { bg: string, icon: string }> = {
                dark: { bg: '#1F2937', icon: 'FFFFFF' },
                white: { bg: '#FFFFFF', icon: '1F2937' },
                gray: { bg: '#6B7280', icon: 'FFFFFF' },
            };
 
            const iconsHtml = items.map((item: any, index: number) => {
                if (!item.url) return '';
                const socialInfo = SOCIAL_ICONS[item.network];
                if (!socialInfo) return '';
 
                const colors = s.iconColor === 'color' 
                    ? { bg: socialInfo.brandColor, icon: 'FFFFFF' }
                    : iconColors[s.iconColor] || iconColors.gray;
                
                const networkSlug = socialInfo.slug;
 
                const borderRadius = s.iconStyle === 'circle' ? '50%' : s.iconStyle === 'rounded' ? '6px' : '0px';
 
                const iconTdStyle = styleObjectToString({
                    borderRadius: borderRadius,
                    width: `${s.iconSize}px`,
                    height: `${s.iconSize}px`,
                    textAlign: 'center',
                    verticalAlign: 'middle',
                });
                
                const spacerTd = index > 0 ? `<td width="${s.iconSpacing}"></td>` : '';
 
                if (s.iconStyle === 'default') {
                    let color;
                    if (s.iconColor === 'color') {
                        color = socialInfo.brandColor.replace('#', '');
                    } else {
                        color = (iconColors[s.iconColor] || iconColors.gray).bg.replace('#', '');
                    }
                    const defaultIconUrl = `https://cdn.simpleicons.org/${networkSlug}/${color}`;
                    return `
                        ${spacerTd}
                        <td>
                            <a href="${item.url}" target="_blank" rel="noopener noreferrer">
                                <img src="${defaultIconUrl}" alt="${item.network}" width="${s.iconSize}" height="${s.iconSize}" style="border:0; display:block;"/>
                            </a>
                        </td>
                    `;
                }
 
                const iconUrl = `https://cdn.simpleicons.org/${networkSlug}/${colors.icon}`;
                return `
                    ${spacerTd}
                    <td bgcolor="${colors.bg}" style="${iconTdStyle}">
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" style="display:block; width:100%; text-align:center;">
                            <!--[if mso]><i style="letter-spacing: ${s.iconSize/2}px;mso-font-width:-100%;mso-text-raise:15px">&nbsp;</i><![endif]-->
                            <img src="${iconUrl}" alt="${item.network}" width="${s.iconSize * 0.6}" height="${s.iconSize * 0.6}" style="border:0; margin: 0 auto; vertical-align: middle;" />
                            <!--[if mso]><i style="letter-spacing: ${s.iconSize/2}px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                        </a>
                    </td>
                `;
            }).join('');
 
            const wrapperTableStyle = styleObjectToString({
                backgroundColor: s.backgroundColor || 'transparent',
            });

            const cellStyle = styleObjectToString({
                paddingTop: s.paddingTop,
                paddingBottom: s.paddingBottom,
                paddingLeft: s.paddingLeft,
                paddingRight: s.paddingRight,
            });
            
            const tableAlign = `align="${s.alignment || 'center'}"`;

            return `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="${wrapperTableStyle}">
                    <tr>
                        <td style="${cellStyle}">
                            <table ${tableAlign} border="0" cellpadding="0" cellspacing="0">
                                <tr>${iconsHtml}</tr>
                            </table>
                        </td>
                    </tr>
                </table>
            `;
        }
        case 'Columns':
        case 'Product': {
             const totalFlex = content.columns.reduce((acc: number, col: any) => acc + (col.flex || 1), 0);
             const colsHtml = content.columns.map((col: any) => {
                const width = `${((col.flex || 1) / totalFlex) * 100}%`;
                const colContent = col.items.map(renderBlockToHtml).join('');
                return `<td valign="${style.verticalAlign || 'top'}" width="${width}" style="padding: 0 8px;">${colContent}</td>`;
             }).join('');
             return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="${styleStr}"><tr>${colsHtml}</tr></table>`;
        }
        default:
            return '';
    }
};
// --- END HTML GENERATION ---

const cleanDomain = (domainStr: string) => {
    if (!domainStr) return '';
    const match = domainStr.match(/^([a-zA-Z0-9.-]+)/);
    return match ? match[0] : domainStr;
};


// Helper to find an item and its parent array in a nested structure
const findItemContainer = (items: any[], itemId: string): { container: any[], index: number } | null => {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id === itemId) {
            return { container: items, index: i };
        }
        if ((item.type === 'Columns' || item.type === 'Product' || item.type === 'Social') && item.content.columns) {
            for (const column of item.content.columns) {
                const found = findItemContainer(column.items, itemId);
                if (found) {
                    return found;
                }
            }
        }
    }
    return null;
};

// Helper to find and mutate a nested item using Immer drafts
const findAndMutateItem = (items: any[], itemId: string, mutator: (item: any) => void): boolean => {
    for (const item of items) {
        if (item.id === itemId) {
            mutator(item);
            return true;
        }
        if ((item.type === 'Columns' || item.type === 'Product' || item.type === 'Social') && item.content.columns) {
            for (const column of item.content.columns) {
                if (findAndMutateItem(column.items, itemId, mutator)) {
                    return true;
                }
            }
        }
    }
    return false;
};

// Helper to find a nested item
const findBlockById = (items: any[], id: string): any | null => {
    for (const item of items) {
        if (item.id === id) {
            return item;
        }
        if ((item.type === 'Columns' || item.type === 'Product' || item.type === 'Social') && item.content.columns) {
            for (const column of item.content.columns) {
                const found = findBlockById(column.items, id);
                if (found) {
                    return found;
                }
            }
        }
    }
    return null;
};

interface EmailBuilderViewProps {
    apiKey: string;
    user: any;
    templateToEdit: Template | null;
    setView: (view: string, data?: any) => void;
    onDirtyChange: (isDirty: boolean) => void;
    isNewFromGallery?: boolean;
}

const EmailBuilderView = forwardRef(({ apiKey, user, templateToEdit, setView, onDirtyChange, isNewFromGallery }: EmailBuilderViewProps, ref) => {
    const { t } = useTranslation(['emailBuilder', 'common', 'sendEmail']);
    const { addToast } = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [activeItem, setActiveItem] = useState<any | null>(null);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [editingImageBlockId, setEditingImageBlockId] = useState<string | null>(null);
    const [isUpdatingImage, setIsUpdatingImage] = useState(false);
    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [originalTemplateName, setOriginalTemplateName] = useState<string | null>(null);
    const [isMobileView, setIsMobileView] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [generatedHtml, setGeneratedHtml] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [subject, setSubject] = useState('');
    const [fromName, setFromName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTestSendVisible, setIsTestSendVisible] = useState(false);
    
    // State for Test Send Panel
    const [testRecipient, setTestRecipient] = useState('');
    const [testSenderPrefix, setTestSenderPrefix] = useState('test');
    const [testSenderDomain, setTestSenderDomain] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    
    const [settingsView, setSettingsView] = useState<'block' | 'global' | null>(null);
    
    const { data: domains, loading: domainsLoading } = useApiV4('/domains', apiKey, {});

    const verifiedDomainsWithDefault = useMemo(() => {
        if (!Array.isArray(domains)) return [];
        return domains
            .filter(d => String(d.Spf).toLowerCase() === 'true' && String(d.Dkim).toLowerCase() === 'true')
            .map(d => ({
                domain: cleanDomain(d.Domain),
                defaultSender: d.DefaultSender
            }));
    }, [domains]);

    useEffect(() => {
        if (verifiedDomainsWithDefault.length > 0 && !testSenderDomain) {
            setTestSenderDomain(verifiedDomainsWithDefault[0].domain);
        }
    }, [verifiedDomainsWithDefault, testSenderDomain]);

    const [globalStyles, setGlobalStyles] = useState({
        backdropColor: '#F7F9FC',
        canvasColor: '#FFFFFF',
        canvasBorderRadius: 0,
        canvasBorderColor: 'transparent',
        defaultFontFamily: "'Inter', Arial, sans-serif",
        defaultTextColor: '#333333',
    });

    const [isDirty, setIsDirty] = useState(false);
    const isInitialLoad = useRef(true);

    const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSaveTemplate();
        }
    }));
    
    useEffect(() => {
        const resetToNew = () => {
            setIsEditing(false);
            setOriginalTemplateName(null);
            setTemplateName(t('newTemplateName'));
            setSubject('');
            setFromName('');
            setItems([]);
            setGlobalStyles({
                backdropColor: '#F7F9FC',
                canvasColor: '#FFFFFF',
                canvasBorderRadius: 0,
                canvasBorderColor: 'transparent',
                defaultFontFamily: "'Inter', Arial, sans-serif",
                defaultTextColor: '#333333',
            });
            setIsDirty(false);
            isInitialLoad.current = true;
        };

        if (templateToEdit) {
            if (isNewFromGallery) {
                setIsEditing(false);
                setOriginalTemplateName(null);
            } else {
                setIsEditing(true);
                setOriginalTemplateName(templateToEdit.Name);
            }

            const htmlContent = templateToEdit.Body?.[0]?.Content;
            
            if (htmlContent) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                const stateContainer = doc.getElementById('mailzila-template-state');
                const base64State = stateContainer?.getAttribute('data-state');

                if (base64State) {
                    try {
                        const jsonState = decodeState(base64State);
                        const state = JSON.parse(jsonState);
                        setGlobalStyles(state.globalStyles || globalStyles);
                        setItems(state.items || []);
                        setSubject(state.subject || templateToEdit.Subject || '');
                        setFromName(state.fromName || '');
                        setTemplateName(state.templateName || templateToEdit.Name);
                        setIsDirty(false);
                        isInitialLoad.current = true;
                        return; // Exit after successful parsing
                    } catch (e) {
                        console.error("Failed to parse template state from HTML.", e);
                    }
                }
            }
            
            // Fallback for old templates or parsing errors
            addToast(t('This template is from an older version and could not be fully loaded into the editor. Its content has been placed in a text block.'), 'warning');
            setTemplateName(templateToEdit.Name);
            setSubject(templateToEdit.Subject || '');
            setFromName('');
            const fallbackBlock = {
                id: generateId('text'),
                type: 'Text',
                content: { html: templateToEdit.Body?.[0]?.Content || '' },
                style: TOOLBAR_COMPONENTS.find(c => c.type === 'Text')!.defaultStyle,
            };
            setItems([fallbackBlock]);
            setIsDirty(false);
            isInitialLoad.current = true;

        } else {
            resetToNew();
        }
    }, [templateToEdit, isNewFromGallery, addToast, t]);

    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }
        if (!isDirty) {
            setIsDirty(true);
        }
    }, [items, globalStyles, templateName, subject, fromName, isDirty]);

    useEffect(() => {
        onDirtyChange(isDirty);
    }, [isDirty, onDirtyChange]);


    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const generateEmailHtml = useCallback((): string => {
        const bodyStyle = styleObjectToString({
            fontFamily: globalStyles.defaultFontFamily,
            color: globalStyles.defaultTextColor,
            margin: 0,
            padding: 0,
            backgroundColor: globalStyles.backdropColor
        });

        const canvasStyle = styleObjectToString({
            backgroundColor: globalStyles.canvasColor,
            borderRadius: `${globalStyles.canvasBorderRadius}px`,
            border: `1px solid ${globalStyles.canvasBorderColor}`,
            maxWidth: '600px',
        });
        
        const contentHtml = items.map(renderBlockToHtml).join('');
        
        const state = { globalStyles, items, subject, templateName, fromName };
        const jsonState = JSON.stringify(state);
        const base64State = encodeState(jsonState);

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${subject || 'Email'}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: ${globalStyles.defaultFontFamily}; }
                </style>
            </head>
            <body style="${bodyStyle}">
                <div id="mailzila-template-state" style="display:none !important; mso-hide:all;" data-state="${base64State}"></div>
                <center>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
                        <tr>
                            <td align="center">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="${canvasStyle}">
                                    <tr>
                                        <td style="padding: 1rem;">
                                            ${contentHtml}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </center>
            </body>
            </html>
        `;
    }, [items, globalStyles, subject, templateName, fromName]);

    const handleSendTest = async () => {
        if (!testRecipient) {
            addToast(t('recipientEmailRequired', { ns: 'emailBuilder' }), 'error');
            return;
        }
        setIsSendingTest(true);
        try {
            const htmlContent = generateEmailHtml();
            const fromEmail = `${testSenderPrefix}@${testSenderDomain}`;
            
            const payload = {
                Recipients: {
                    To: [testRecipient]
                },
                Content: {
                    Body: [
                        {
                            ContentType: "HTML" as const,
                            Content: htmlContent,
                            Charset: "UTF-8"
                        }
                    ],
                    From: `${fromName} <${fromEmail}>`,
                    Subject: subject || t('testEmailSubject', { ns: 'emailBuilder', defaultValue: 'Test Email' })
                },
                Options: {
                    TrackOpens: false,
                    TrackClicks: false
                }
            };
            
            await apiFetchV4('/emails/transactional', apiKey, {
                method: 'POST',
                body: payload
            });

            addToast(t('testEmailSentSuccess', { ns: 'emailBuilder', email: testRecipient }), 'success');
            
        } catch (err: any) {
            addToast(t('testEmailSentError', { ns: 'emailBuilder', error: err.message }), 'error');
        } finally {
            setIsSendingTest(false);
        }
    };
    
    const handleSaveTemplate = async (): Promise<boolean> => {
        if (!templateName) {
            addToast(t('templateNameRequired'), 'error');
            return false;
        }
        setIsSaving(true);
    
        const htmlContent = generateEmailHtml();
        const payload = {
            Name: templateName,
            Subject: subject,
            Body: [{
                ContentType: "HTML" as const,
                Content: htmlContent,
                Charset: "utf-8"
            }],
            TemplateScope: "Personal" as const
        };
    
        try {
            if (isEditing) {
                // UPDATE or RENAME. Endpoint uses the *original* name before this save.
                const endpoint = `/templates/${encodeURIComponent(originalTemplateName!)}`;
                await apiFetchV4(endpoint, apiKey, { method: 'PUT', body: payload });
            } else {
                // CREATE new template. The API will reject if the name already exists.
                await apiFetchV4('/templates', apiKey, { method: 'POST', body: payload });
            }
    
            addToast(t('saveTemplateSuccess', { name: templateName }), 'success');
            setOriginalTemplateName(templateName); 
            setIsEditing(true); 
            setIsDirty(false);
            return true;
    
        } catch (err: any) {
            let errorMessage = err.message;
            if (err.message?.includes('already exists')) {
                errorMessage = `A template named "${templateName}" already exists. Please choose a different name.`;
            } else if (err.message?.includes('Could not find specified template name')) {
                errorMessage = `The original template "${originalTemplateName}" was not found and could not be updated. It might have been deleted.`;
            }
            addToast(t('saveTemplateError', { error: errorMessage }), 'error');
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const toggleMobileView = () => setIsMobileView(v => !v);

    const prepareAndShowHtml = (mode: 'preview' | 'code') => {
        const html = generateEmailHtml();
        setGeneratedHtml(html);
        if (mode === 'preview') {
            setIsPreviewModalOpen(true);
        } else {
            setIsCodeModalOpen(true);
        }
    };

    const handleExportHtml = () => {
        const html = generateEmailHtml();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'email-template.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setSelectedBlockId(null);
        setSettingsView(null);
        const { active } = event;
        const activeId = active.id as string;
        
        const toolbarItem = TOOLBAR_COMPONENTS.find(c => c.id === activeId);
        if (toolbarItem) {
            setActiveItem({ id: activeId, type: toolbarItem.type, ...toolbarItem, isToolbarItem: true });
        } else {
            const found = findItemContainer(items, activeId);
            if (found) {
                setActiveItem(found.container[found.index]);
            }
        }
    }, [items]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;
        const overId = over.id as string;
        const activeId = active.id as string;

        // --- Reordering existing items ---
        if (activeId !== overId && !active.data.current?.isToolbarItem) {
            setItems((currentItems) => {
                 return produce(currentItems, draft => {
                    const oldContainerResult = findItemContainer(draft, activeId);
                    const newContainerResult = findItemContainer(draft, overId);

                    if (oldContainerResult && newContainerResult) {
                        const { container: oldContainer, index: oldIndex } = oldContainerResult;
                        const { container: newContainer, index: newIndex } = newContainerResult;

                        const [movedItem] = oldContainer.splice(oldIndex, 1);
                        newContainer.splice(newIndex, 0, movedItem);
                    }
                });
            });
            return;
        }

        // --- Dropping a toolbar item ---
        if (active.data.current?.isToolbarItem) {
            const toolbarItem = TOOLBAR_COMPONENTS.find(c => c.id === activeId);
            if (!toolbarItem) return;

            let newBlock;
            if (toolbarItem.type === 'Product') {
                const imageId = generateId('image');
                const titleId = generateId('header');
                const descId = generateId('text');
                const priceId = generateId('text');
                const buttonId = generateId('button');
                newBlock = {
                    id: generateId('product'),
                    type: 'Product',
                    content: {
                        columns: [
                            {
                                id: generateId('col'),
                                flex: 1,
                                items: [{
                                    id: imageId,
                                    type: 'Image',
                                    content: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Image')!.defaultContent },
                                    style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Image')!.defaultStyle, backgroundColor: '#ffffff' }
                                }]
                            },
                            {
                                id: generateId('col'),
                                flex: 1,
                                items: [
                                    {
                                        id: titleId,
                                        type: 'Header',
                                        content: { html: '<h2>Product Title</h2>' },
                                        style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Header')!.defaultStyle, fontSize: '22px', paddingLeft: 10, paddingRight: 10 }
                                    },
                                    {
                                        id: descId,
                                        type: 'Text',
                                        content: { html: '<p>A brief description of your amazing product goes here. Highlight the key features and benefits.</p>' },
                                        style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Text')!.defaultStyle, fontSize: '14px', paddingLeft: 10, paddingRight: 10 }
                                    },
                                    {
                                        id: priceId,
                                        type: 'Text',
                                        content: { html: '<p style="font-size: 20px; font-weight: bold;">$19.99</p>' },
                                        style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Text')!.defaultStyle, fontSize: '20px', fontWeight: 'bold', paddingLeft: 10, paddingRight: 10, textAlign: 'left' }
                                    },
                                    {
                                        id: buttonId,
                                        type: 'Button',
                                        content: { text: 'Buy Now', href: '#' },
                                        style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Button')!.defaultStyle, textAlign: 'left' }
                                    }
                                ]
                            }
                        ]
                    },
                    style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Columns')!.defaultStyle }
                }
            } else {
                 newBlock = {
                    id: generateId(toolbarItem.type.toLowerCase()),
                    type: toolbarItem.type,
                    content: JSON.parse(JSON.stringify(toolbarItem.defaultContent)),
                    style: JSON.parse(JSON.stringify(toolbarItem.defaultStyle))
                };
            }

            setItems(produce(draft => {
                const dropContainerResult = findItemContainer(draft, overId);
                 if (dropContainerResult) {
                    dropContainerResult.container.splice(dropContainerResult.index, 0, newBlock);
                } else {
                     if (overId === 'canvas-droppable') {
                         draft.push(newBlock);
                     } else { // It's a column
                        for(const item of draft) {
                            if (item.type === 'Columns' || item.type === 'Product' || item.type === 'Social') {
                                const col = item.content.columns.find((c: any) => c.id === overId);
                                if (col) {
                                    col.items.push(newBlock);
                                    break;
                                }
                            }
                        }
                     }
                }
            }));
            return;
        }

        // --- Dragging item into a column ---
        const isColumnDrop = overId.startsWith('col-');
        if(isColumnDrop) {
            setItems(produce(draft => {
                const oldContainerResult = findItemContainer(draft, activeId);
                if (!oldContainerResult) return;
                const [movedItem] = oldContainerResult.container.splice(oldContainerResult.index, 1);

                for(const item of draft) {
                    if (item.type === 'Columns' || item.type === 'Product' || item.type === 'Social') {
                        const col = item.content.columns.find((c: any) => c.id === overId);
                        if (col) {
                            col.items.push(movedItem);
                            break;
                        }
                    }
                }
            }));
        }

    }, [items]);

    const removeItem = useCallback((id: string) => {
        setItems(produce(draft => {
            const containerResult = findItemContainer(draft, id);
            if (containerResult) {
                containerResult.container.splice(containerResult.index, 1);
            }
        }));
        if (selectedBlockId === id) {
            setSelectedBlockId(null);
            setSettingsView(null);
        }
    }, [selectedBlockId]);

    const handleDuplicateBlock = useCallback((idToDuplicate: string) => {
        setItems(produce(draft => {
            const containerResult = findItemContainer(draft, idToDuplicate);
            if (containerResult) {
                const { container, index } = containerResult;
                const originalItem = container[index];
                
                const duplicateItem = JSON.parse(JSON.stringify(originalItem));
                
                const regenerateIds = (item: any) => {
                    item.id = generateId(item.type.toLowerCase());
                    if ((item.type === 'Columns' || item.type === 'Product' || item.type === 'Social') && item.content?.columns) {
                        item.content.columns.forEach((col: any) => {
                            col.id = generateId('col');
                            col.items.forEach(regenerateIds);
                        });
                    }
                };
                
                regenerateIds(duplicateItem);
                
                container.splice(index + 1, 0, duplicateItem);
                setSelectedBlockId(duplicateItem.id);
            }
        }));
    }, []);

    const handleSelectBlock = useCallback((id: string) => {
        setSelectedBlockId(id);
    }, []);

    const handleEditBlock = useCallback((id: string) => {
        setSelectedBlockId(id);
        setSettingsView('block');
    }, []);
    
    const handleGlobalStyleChange = (newStyles: any) => {
        setGlobalStyles(prev => ({ ...prev, ...newStyles }));
    }

    const handleStyleChange = useCallback((blockId: string, newStyles: any) => {
        setItems(produce(draft => {
            findAndMutateItem(draft, blockId, item => {
                item.style = { ...item.style, ...newStyles };
            });
        }));
    }, []);
    
    const handleContentChange = useCallback((blockId: string, newContent: any) => {
        setItems(produce(draft => {
            findAndMutateItem(draft, blockId, item => {
                item.content = { ...item.content, ...newContent };
            });
        }));
    }, []);

    const handleEditImageBlock = (id: string) => {
        setEditingImageBlockId(id);
        setIsMediaModalOpen(true);
    };

    const handleImageSelect = async (fileInfo: FileInfo) => {
        if (!editingImageBlockId) return;

        setIsMediaModalOpen(false);
        setIsUpdatingImage(true);
        addToast(`Updating image to ${fileInfo.FileName}...`, 'info');

        try {
            const url = `${ELASTIC_EMAIL_API_V4_BASE}/files/${encodeURIComponent(fileInfo.FileName)}`;
            const response = await fetch(url, { headers: { 'X-ElasticEmail-ApiKey': apiKey } });
            if (!response.ok) throw new Error(t('couldNotLoadPreview'));

            const blob = await response.blob();
            const base64 = await toBase64(blob);

            handleContentChange(editingImageBlockId, { src: base64, alt: fileInfo.FileName });
            addToast(`Image updated successfully!`, 'success');

        } catch (error: any) {
            addToast(error.message, 'error');
        } finally {
            setIsUpdatingImage(false);
            setEditingImageBlockId(null);
        }
    };
    
    const handleInsertBlock = useCallback((blockType: string, index: number, targetArray?: any[]) => {
        const toolbarItem = TOOLBAR_COMPONENTS.find(c => c.type === blockType);
        if (!toolbarItem) return;

        const newBlock = {
            id: generateId(toolbarItem.type.toLowerCase()),
            type: toolbarItem.type,
            content: JSON.parse(JSON.stringify(toolbarItem.defaultContent)),
            style: JSON.parse(JSON.stringify(toolbarItem.defaultStyle)),
        };

        setItems(items => {
            const newItems = [...items];
            const arrayToInsertInto = targetArray || newItems;
            arrayToInsertInto.splice(index + 1, 0, newBlock);
            return newItems;
        });
        setSelectedBlockId(newBlock.id);
    }, []);
    
    const handleSetColumns = useCallback((blockId: string, layoutConfig: { flex: number }[]) => {
        setItems(produce(draft => {
            const item = findBlockById(draft, blockId);
            if (item && (item.type === 'Columns' || item.type === 'Product' || item.type === 'Social')) {
                item.content.columns = layoutConfig.map(config => ({
                    id: generateId('col'),
                    flex: config.flex,
                    items: []
                }));
            }
        }));
    }, []);

    const handleAddComponentFromToolbar = useCallback((blockType: string) => {
        const toolbarItem = TOOLBAR_COMPONENTS.find(c => c.type === blockType);
        if (!toolbarItem) return;

        let newBlock;
        if (toolbarItem.type === 'Product') {
            const imageId = generateId('image');
            const titleId = generateId('header');
            const descId = generateId('text');
            const priceId = generateId('text');
            const buttonId = generateId('button');
            newBlock = {
                id: generateId('product'),
                type: 'Product',
                content: {
                    columns: [
                        {
                            id: generateId('col'),
                            flex: 1,
                            items: [{
                                id: imageId,
                                type: 'Image',
                                content: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Image')!.defaultContent },
                                style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Image')!.defaultStyle, backgroundColor: '#ffffff' }
                            }]
                        },
                        {
                            id: generateId('col'),
                            flex: 1,
                            items: [
                                {
                                    id: titleId,
                                    type: 'Header',
                                    content: { html: '<h2>Product Title</h2>' },
                                    style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Header')!.defaultStyle, fontSize: '22px', paddingLeft: 10, paddingRight: 10 }
                                },
                                {
                                    id: descId,
                                    type: 'Text',
                                    content: { html: '<p>A brief description of your amazing product goes here. Highlight the key features and benefits.</p>' },
                                    style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Text')!.defaultStyle, fontSize: '14px', paddingLeft: 10, paddingRight: 10 }
                                },
                                {
                                    id: priceId,
                                    type: 'Text',
                                    content: { html: '<p style="font-size: 20px; font-weight: bold;">$19.99</p>' },
                                    style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Text')!.defaultStyle, fontSize: '20px', fontWeight: 'bold', paddingLeft: 10, paddingRight: 10, textAlign: 'left' }
                                },
                                {
                                    id: buttonId,
                                    type: 'Button',
                                    content: { text: 'Buy Now', href: '#' },
                                    style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Button')!.defaultStyle, textAlign: 'left' }
                                }
                            ]
                        }
                    ]
                },
                style: { ...TOOLBAR_COMPONENTS.find(c => c.type === 'Columns')!.defaultStyle }
            }
        } else {
             newBlock = {
                id: generateId(toolbarItem.type.toLowerCase()),
                type: toolbarItem.type,
                content: JSON.parse(JSON.stringify(toolbarItem.defaultContent)),
                style: JSON.parse(JSON.stringify(toolbarItem.defaultStyle))
            };
        }

        setItems(produce(draft => {
            draft.push(newBlock);
        }));
        setSelectedBlockId(newBlock.id);
    }, []);
    
    const handleOpenGlobalSettings = () => {
        setSelectedBlockId(null);
        setSettingsView('global');
    };

    const handleCloseSettingsPanel = () => {
        setSelectedBlockId(null);
        setSettingsView(null);
    };

    const selectedBlock = selectedBlockId ? findBlockById(items, selectedBlockId) : null;
    
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="email-builder-view-container">
                {isUpdatingImage && <div className="page-overlay"><Loader /></div>}
                <header className="email-builder-header">
                    <div className="email-builder-header-left">
                        <button className="btn-icon" onClick={() => setView('Gallery')} title={t('gallery', { ns: 'common' })}>
                            <Icon>{ICONS.BOX}</Icon>
                        </button>
                        <button className="btn-icon" onClick={() => setIsTestSendVisible(prev => !prev)} title={t('sendTestEmail')}>
                            <Icon>{ICONS.SEND_EMAIL}</Icon>
                        </button>
                        <button className="btn-icon" onClick={handleOpenGlobalSettings} title={t('global')}><Icon>{ICONS.SETTINGS}</Icon></button>
                        <button className={`btn-icon ${isMobileView ? 'active' : ''}`} onClick={toggleMobileView} title={t('mobileView')}><Icon>{ICONS.MOBILE}</Icon></button>
                        <button className="btn-icon" onClick={() => prepareAndShowHtml('preview')} title={t('previewEmail')}><Icon>{ICONS.EYE}</Icon></button>
                        <button className="btn-icon" onClick={() => prepareAndShowHtml('code')} title={t('viewCode')}><Icon>{ICONS.CODE}</Icon></button>
                        <button className="btn-icon" onClick={handleExportHtml} title={t('exportHtml')}><Icon>{ICONS.DOWNLOAD}</Icon></button>
                    </div>
                    <div className="email-builder-header-right">
                        <div className="input-with-icon">
                            <Icon>{ICONS.ARCHIVE}</Icon>
                            <input
                                type="text"
                                placeholder={t('templateName')}
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                aria-label={t('templateName')}
                                required
                            />
                        </div>
                        <Button className="btn-primary" onClick={handleSaveTemplate} disabled={isSaving} title={t('saveChanges')} action={AppActions.SAVE_TEMPLATE}>
                            {isSaving ? <Loader /> : <><Icon>{ICONS.SAVE_CHANGES}</Icon><span>{t('saveTemplate')}</span></>}
                        </Button>
                    </div>
                </header>

                <div className={`email-builder-test-panel ${isTestSendVisible ? 'visible' : ''}`}>
                    <div className="form-group" style={{ flex: '1 1 100%'}}>
                        <div className="input-with-icon">
                            <Icon>{ICONS.MAIL}</Icon>
                            <input type="email" placeholder={t('recipientEmailPlaceholder')} value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} required />
                        </div>
                    </div>
                    <div className="form-group" style={{ flex: '2 1 300px' }}>
                        <div className="input-with-icon">
                            <Icon>{ICONS.TYPE}</Icon>
                            <input type="text" placeholder={t('subject', { ns: 'sendEmail' })} value={subject} onChange={(e) => setSubject(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group" style={{ flex: '1 1 200px' }}>
                        <div className="input-with-icon">
                            <Icon>{ICONS.ACCOUNT}</Icon>
                            <input type="text" placeholder={t('fromName', { ns: 'sendEmail' })} value={fromName} onChange={(e) => setFromName(e.target.value)} />
                        </div>
                    </div>
                     <div className="form-group" style={{ flex: '2 1 300px' }}>
                        {verifiedDomainsWithDefault.length > 0 ? (
                            <div className="from-email-composer">
                                <input type="text" value={testSenderPrefix} onChange={e => setTestSenderPrefix(e.target.value.trim())} />
                                <span className="from-email-at">@</span>
                                <select value={testSenderDomain} onChange={e => setTestSenderDomain(e.target.value)}>
                                    {verifiedDomainsWithDefault.map(d => (
                                        <option key={d.domain} value={d.domain}>{d.domain}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="info-message warning" style={{padding: '0.5rem 1rem', fontSize: '0.8rem', margin: 0, textAlign: 'center'}}>
                                {t('noVerifiedDomainsToSendError', { ns: 'sendEmail' })}
                            </div>
                        )}
                    </div>
                    <button className="btn btn-secondary" onClick={handleSendTest} disabled={isSendingTest || !testRecipient || verifiedDomainsWithDefault.length === 0} style={{flexShrink: 0}}>
                        {isSendingTest ? <Loader /> : <Icon>{ICONS.SEND_EMAIL}</Icon>}
                        <span>{t('sendTestEmail')}</span>
                    </button>
                </div>


                <div className="email-builder-container">
                    <Toolbar onAddComponent={handleAddComponentFromToolbar} />
                    <div ref={canvasWrapperRef} className="builder-canvas-wrapper" style={{backgroundColor: globalStyles.backdropColor}}>
                         <div className={isMobileView ? 'is-mobile-view' : ''}>
                             <Canvas
                                items={items}
                                removeItem={removeItem}
                                onDuplicateBlock={handleDuplicateBlock}
                                onEditImageBlock={handleEditImageBlock}
                                selectedBlockId={selectedBlockId}
                                onSelectBlock={handleSelectBlock}
                                onEditBlock={handleEditBlock}
                                onContentChange={handleContentChange}
                                onStyleChange={handleStyleChange}
                                onInsertBlock={handleInsertBlock}
                                onSetColumns={handleSetColumns}
                                globalStyles={globalStyles}
                            />
                        </div>
                    </div>
                    <div className={`settings-panel-wrapper ${settingsView ? 'is-open' : ''}`}>
                        <div className="settings-panel-overlay" onClick={handleCloseSettingsPanel}></div>
                        <SettingsPanel
                            block={settingsView === 'block' ? selectedBlock : null}
                            globalStyles={globalStyles}
                            onGlobalStyleChange={handleGlobalStyleChange}
                            onStyleChange={handleStyleChange}
                            // FIX: Corrected prop name from onContentChange to handleContentChange
                            onContentChange={handleContentChange}
                            onOpenMediaManager={handleEditImageBlock}
                            onClose={handleCloseSettingsPanel}
                            subject={subject}
                            onSubjectChange={setSubject}
                            fromName={fromName}
                            onFromNameChange={setFromName}
                        />
                    </div>
                </div>
            </div>
            
            <MediaManagerModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                apiKey={apiKey}
                onSelect={handleImageSelect}
            />
            
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title={t('previewEmail')} size="fullscreen" bodyClassName="modal-body--no-padding">
                <iframe srcDoc={generatedHtml} className="preview-iframe" title={t('previewEmail')} />
            </Modal>
            
            <Modal isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} title={t('htmlCode')} size="large">
                <pre className="code-view-pre">
                    <code>{generatedHtml}</code>
                </pre>
            </Modal>

            <DragOverlay>
                {activeItem ? (
                    <div className="drag-overlay-item">
                        {activeItem.isToolbarItem ? (
                            <div className="toolbar-item" style={{cursor: 'grabbing'}}>
                                <Icon>{activeItem.icon}</Icon>
                                <span>{t(activeItem.type.toLowerCase())}</span>
                            </div>
                        ) : (
                            renderBlock(activeItem)
                        )}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
});

export default EmailBuilderView;
