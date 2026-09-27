
import React from 'react';
import Icon from './Icon';
import Button from './Button';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message: string;
    ctaText?: string;
    onCtaClick?: () => void;
    secondaryCtaText?: string;
    onSecondaryCtaClick?: () => void;
}

const EmptyState = ({
    icon,
    title,
    message,
    ctaText,
    onCtaClick,
    secondaryCtaText,
    onSecondaryCtaClick
}: EmptyStateProps) => {
    return (
        <div className="empty-state-container">
            <div className="empty-state-icon-wrapper">
                <Icon>{icon}</Icon>
            </div>
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-message">{message}</p>
            {(ctaText || secondaryCtaText) && (
                <div className="empty-state-actions">
                    {secondaryCtaText && onSecondaryCtaClick && (
                        <Button className="btn-secondary" onClick={onSecondaryCtaClick}>
                            {secondaryCtaText}
                        </Button>
                    )}
                    {ctaText && onCtaClick && (
                        <Button className="btn-primary" onClick={onCtaClick}>
                            {ctaText}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
