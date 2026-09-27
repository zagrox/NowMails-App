import React, { useState } from 'react';
import Icon, { ICONS } from './Icon';

interface AccordionItem {
    title: string;
    content: React.ReactNode;
}

interface AccordionProps {
    items: AccordionItem[];
    allowMultipleOpen?: boolean;
}

const Accordion = ({ items, allowMultipleOpen = false }: AccordionProps) => {
    const [openIndexes, setOpenIndexes] = useState<number[]>([]);

    const toggleItem = (index: number) => {
        if (allowMultipleOpen) {
            setOpenIndexes(prev =>
                prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
            );
        } else {
            setOpenIndexes(prev => (prev.includes(index) ? [] : [index]));
        }
    };

    return (
        <div className="accordion">
            {items.map((item, index) => {
                const isOpen = openIndexes.includes(index);
                return (
                    <div className="accordion-item" key={index}>
                        <div
                            className={`accordion-header ${isOpen ? 'open' : ''}`}
                            onClick={() => toggleItem(index)}
                            onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && toggleItem(index)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isOpen}
                        >
                            <h3 className="accordion-title">{item.title}</h3>
                            <Icon className={`accordion-icon ${isOpen ? 'open' : ''}`}>{ICONS.CHEVRON_DOWN}</Icon>
                        </div>
                        {isOpen && (
                            <div className="accordion-content">
                                {item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default Accordion;