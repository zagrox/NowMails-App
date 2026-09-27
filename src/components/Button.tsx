
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Icon, { ICONS } from './Icon';
import { Module } from '../api/types';

// Redefine ButtonProps to explicitly include common button attributes.
// This is a safer approach if `extends React.ButtonHTMLAttributes` is not working as expected in the build environment.
interface ButtonProps {
    action?: string;
    children?: React.ReactNode;
    className?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    title?: string;
    style?: React.CSSProperties;
    'aria-label'?: string; // For icon buttons
}

const Button = ({ action, children, className, onClick, ...props }: ButtonProps) => {
    const { canPerformAction, allModules, setModuleToUnlock } = useAuth();
    const isLocked = action ? !canPerformAction(action) : false;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isLocked) {
            e.preventDefault();
            e.stopPropagation();
            
            const normalize = (str: string) => str.toLowerCase().replace(/_/g, '');
            const normalizedActionName = normalize(action!);

            const moduleForAction = allModules?.find(m => 
                Array.isArray(m.locked_actions) && 
                m.locked_actions.some(lockedAction => normalize(lockedAction) === normalizedActionName)
            );

            if (moduleForAction) {
                setModuleToUnlock(moduleForAction as Module);
            } else {
                console.warn(`Action "${action}" is locked but no corresponding module was found.`);
            }
        } else if (onClick) {
            onClick(e);
        }
    };
    
    return (
        <button
            className={`btn ${className || ''} ${isLocked ? 'btn-locked' : ''}`}
            onClick={handleClick}
            disabled={isLocked ? false : props.disabled}
            aria-disabled={isLocked || props.disabled}
            {...props}
        >
            {isLocked && <Icon style={{ marginRight: '0.5rem' }}>{ICONS.LOCK}</Icon>}
            {children}
        </button>
    );
};

export default Button;