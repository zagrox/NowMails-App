
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon, { ICONS, SOCIAL_ICONS } from '../../Icon';
import AddSocialNetworkModal from './AddSocialNetworkModal';

// Helper to generate unique IDs for new items
const generateId = (prefix = 'item') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_URLS: Record<string, string> = {
    Facebook: 'https://facebook.com',
    Twitter: 'https://x.com',
    Instagram: 'https://instagram.com',
    LinkedIn: 'https://linkedin.com',
    YouTube: 'https://youtube.com',
    Telegram: 'https://telegram.org',
    Pinterest: 'https://pinterest.com',
    WhatsApp: 'https://whatsapp.com',
    TikTok: 'https://tiktok.com',
    Website: 'https://google.com',
};

// --- START: Replicated Controls from SettingsPanel.tsx ---
const Section = ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div className="settings-section">
        {title && <h4 className="settings-section-header">{title}</h4>}
        {children}
    </div>
);

const LabeledControl = ({ label, children, fullWidth = false }: { label: string, children?: React.ReactNode, fullWidth?: boolean }) => (
    <div className={`control-row ${fullWidth ? 'full-width' : ''}`}>
        <span className="control-label">{label}</span>
        <div className="control-input">{children}</div>
    </div>
);

const ColorInput = ({ value, onChange, onAdd, onRemove }: { value?: string; onChange: (hex: string) => void; onAdd: () => void; onRemove: () => void; }) => {
    if (!value || value === 'transparent') {
        {/* FIX: Changed to use JSX children for Icon component */}
        return <button onClick={onAdd} className="btn-icon color-input-add-btn"><Icon>{ICONS.PLUS}</Icon></button>;
    }
    
    return (
        <div className="color-input-wrapper">
            <div className="color-input-swatch" style={{ backgroundColor: value }}>
                <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
            </div>
            <input
                className="color-input-hex"
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={(e) => e.target.select()}
            />
             {/* FIX: Changed to use JSX children for Icon component */}
             <button onClick={onRemove} className="btn-icon"><Icon>{ICONS.DELETE}</Icon></button>
        </div>
    );
};

const SliderControl = ({ label, value, onChange, min = 0, max = 100, step = 1 }: { label: string, value: number, onChange: (val: number) => void, min?: number, max?: number, step?: number }) => (
     <div className="slider-control" style={{width: '100%'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
            <span className="control-label">{label}</span>
            <div className="panel-input-with-unit">
                <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} style={{width: '50px'}} />
                <span className="unit-label">px</span>
            </div>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
        />
    </div>
);

const SegmentedControl = ({ options, value, onChange, isIconOnly = false }: { options: { value: string, label?: string, icon?: React.ReactNode }[], value: string, onChange: (val: string) => void, isIconOnly?: boolean }) => (
    <div className={`segmented-control ${isIconOnly ? 'icon-only' : ''}`}>
        {options.map(opt => (
            <button
                key={opt.value}
                className={value === opt.value ? 'active' : ''}
                onClick={() => onChange(opt.value)}
                title={opt.label}
            >
                {/* FIX: Changed to use JSX children for Icon component */}
                {opt.icon && <Icon>{opt.icon}</Icon>}
                {!isIconOnly && opt.label && <span>{opt.label}</span>}
            </button>
        ))}
    </div>
);
// --- END: Replicated Controls ---


interface SortableItemProps {
    item: any;
    onUrlChange: (id: string, url: string) => void;
    onRemove: (id: string) => void;
}

// Sortable Item Component for the social links list
const SortableItem: React.FC<SortableItemProps> = ({ item, onUrlChange, onRemove }) => {
    const { t } = useTranslation(['emailBuilder', 'common']);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const networkInfo = SOCIAL_ICONS[item.network];

    return (
        <div ref={setNodeRef} style={style} className="social-item-row">
            <div className="drag-handle" {...attributes} {...listeners}>
                {/* FIX: Changed to use JSX children for Icon component */}
                <Icon>{ICONS.DRAG_HANDLE}</Icon>
            </div>
            {/* FIX: Changed to use JSX children for Icon component */}
            {networkInfo && <Icon style={{ color: networkInfo.brandColor, flexShrink: 0 }}>{networkInfo.path}</Icon>}
            <div className="form-group" style={{flexGrow: 1}}>
                 <label style={{fontSize: '0.8rem', marginBottom: '2px'}}>{t(item.network, {ns: 'emailBuilder', defaultValue: item.network})}</label>
                 <input type="url" value={item.url} onChange={(e) => onUrlChange(item.id, e.target.value)} placeholder={`https://...`} />
            </div>
            {/* FIX: Changed to use JSX children for Icon component */}
            <button className="btn-icon btn-icon-danger" onClick={() => onRemove(item.id)}><Icon>{ICONS.DELETE}</Icon></button>
        </div>
    );
}

// Main Settings Component for the Social Block
const SocialSettings = ({ block, onStyleChange, onContentChange }: { block: any, onStyleChange: any, onContentChange: any }) => {
    const { t } = useTranslation(['emailBuilder', 'common']);
    const s = block.style || {};
    const c = block.content || {};
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor));

    const handleStyleChange = (key: string, value: any) => {
        onStyleChange(block.id, { [key]: value });
    };
    
    const handleContentChange = (key: string, value: any) => {
        onContentChange(block.id, { [key]: value });
    };

    const handleUrlChange = (id: string, url: string) => {
        const newItems = c.items.map((item: any) => item.id === id ? { ...item, url } : item);
        handleContentChange('items', newItems);
    };

    const handleRemoveItem = (id: string) => {
        const newItems = c.items.filter((item: any) => item.id !== id);
        handleContentChange('items', newItems);
    };

    const handleAddItem = (network: string) => {
        const url = DEFAULT_URLS[network] || 'https://';
        const newItem = { id: generateId('social'), network, url };
        handleContentChange('items', [...c.items, newItem]);
        setIsAddModalOpen(false);
    };

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = c.items.findIndex((item: any) => item.id === active.id);
            const newIndex = c.items.findIndex((item: any) => item.id === over.id);
            handleContentChange('items', arrayMove(c.items, oldIndex, newIndex));
        }
    }

    return (
        <>
            <style>{`
                .social-item-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem; background: var(--subtle-background); border-radius: 6px; border: 1px solid var(--border-color); }
                .drag-handle { cursor: grab; color: var(--subtle-text-color); }
                .drag-handle:active { cursor: grabbing; }
            `}</style>
             <AddSocialNetworkModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSelect={handleAddItem}
                existingNetworks={c.items?.map((i: any) => i.network) || []}
            />
            <Section title={t('socialLinks')}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={c.items?.map((i: any) => i.id) || []} strategy={verticalListSortingStrategy}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                            {c.items?.map((item: any) => (
                                <SortableItem key={item.id} item={item} onUrlChange={handleUrlChange} onRemove={handleRemoveItem} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <button className="btn" onClick={() => setIsAddModalOpen(true)} style={{width: '100%', marginTop: '1rem'}}>{t('addAnother')}</button>
            </Section>

            <Section title={t('properties')}>
                <LabeledControl label={t('iconStyle')}>
                     <SegmentedControl
                        value={s.iconStyle || 'circle'}
                        onChange={(val) => handleStyleChange('iconStyle', val)}
                        options={[
                            { value: 'default', label: 'Default' },
                            { value: 'square', label: 'Square' },
                            { value: 'rounded', label: 'Rounded' },
                            { value: 'circle', label: 'Circle' },
                        ]}
                    />
                </LabeledControl>
                 <LabeledControl label={t('iconColor')}>
                     <SegmentedControl
                        value={s.iconColor || 'gray'}
                        onChange={(val) => handleStyleChange('iconColor', val)}
                        options={[
                            { value: 'dark', label: 'Dark' },
                            { value: 'white', label: 'White' },
                            { value: 'gray', label: 'Gray' },
                            { value: 'color', label: 'Color' },
                        ]}
                    />
                </LabeledControl>
                <SliderControl label={t('iconSize')} value={s.iconSize || 30} onChange={val => handleStyleChange('iconSize', val)} min={20} max={60} />
                <SliderControl label={t('iconSpacing')} value={s.iconSpacing || 15} onChange={val => handleStyleChange('iconSpacing', val)} min={0} max={40} />
                <LabeledControl label={t('align')}>
                    <SegmentedControl
                        value={s.alignment || 'center'}
                        onChange={(val) => handleStyleChange('alignment', val)}
                        isIconOnly
                        options={[
                            { value: 'left', label: t('alignLeft'), icon: ICONS.ALIGN_LEFT },
                            { value: 'center', label: t('alignCenter'), icon: ICONS.ALIGN_CENTER },
                            { value: 'right', label: t('alignRight'), icon: ICONS.ALIGN_RIGHT },
                        ]}
                    />
                </LabeledControl>
            </Section>

            <Section title={t('colors')}>
                 <LabeledControl label={t('backgroundColor')}>
                    <ColorInput 
                        value={s.backgroundColor} 
                        onChange={(val) => handleStyleChange('backgroundColor', val)} 
                        onAdd={() => handleStyleChange('backgroundColor', '#FFFFFF')} 
                        onRemove={() => handleStyleChange('backgroundColor', 'transparent')} 
                    />
                </LabeledControl>
            </Section>
        </>
    );
};

export default SocialSettings;
