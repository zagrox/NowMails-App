import React, { useEffect, ReactNode, PropsWithChildren } from 'react';

type ModalProps = PropsWithChildren<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    size?: 'default' | 'large' | 'fullscreen';
    bodyClassName?: string;
    zIndex?: number;
}>;

const Modal = ({ isOpen, onClose, title, children, size, bodyClassName, zIndex }: ModalProps) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    const overlayStyle: React.CSSProperties = {};
    if (zIndex) {
        overlayStyle.zIndex = zIndex;
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={overlayStyle}>
            <div className={`modal-content modal-size-${size || 'default'}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                        &times;
                    </button>
                </div>
                <div className={`modal-body ${bodyClassName || ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
