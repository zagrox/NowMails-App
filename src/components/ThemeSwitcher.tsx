
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Icon, { ICONS } from './Icon';

type Theme = 'light' | 'dark' | 'auto';

const ThemeSwitcher = () => {
    const { t } = useTranslation(['account', 'common']);
    const { theme, setTheme } = useTheme();
    const { updateUser, user } = useAuth();

    const options: { value: Theme; label: string; icon: React.ReactNode; }[] = [
        { value: 'light', label: t('themeLight'), icon: ICONS.SUN },
        { value: 'dark', label: t('themeDark'), icon: ICONS.MOON },
        { value: 'auto', label: t('themeSystem'), icon: ICONS.DESKTOP },
    ];

    const handleThemeChange = (newTheme: Theme) => {
        // Update UI immediately
        setTheme(newTheme);

        // If user is not an API user, sync to Directus
        if (user && !user.isApiKeyUser) {
            // The `display` field is in `profileFields` (in AuthContext), so `updateUser`
            // will correctly save it to the `profiles` collection.
            // We also keep the legacy theme fields for backward compatibility if needed,
            // although the primary mechanism is now the 'display' field.
            const payload: {
                display: Theme;
                theme_light?: boolean;
                theme_dark?: boolean;
            } = {
                display: newTheme,
            };

            if (newTheme === 'dark') {
                payload.theme_light = false;
                payload.theme_dark = true;
            } else {
                // Default to light theme for 'light' and 'auto' settings.
                payload.theme_light = true;
                payload.theme_dark = false;
            }
            
            updateUser(payload).catch(error => {
                console.warn("Failed to sync theme preference:", error);
                // The UI has already updated, so we just log the error
            });
        }
    };

    return (
        <div className="theme-switcher">
            {options.map(option => (
                <button
                    key={option.value}
                    className={`theme-btn ${theme === option.value ? 'active' : ''}`}
                    onClick={() => handleThemeChange(option.value)}
                    aria-label={t('switchToTheme', { theme: option.label })}
                >
                    <Icon>{option.icon}</Icon>
                    <span>{option.label}</span>
                </button>
            ))}
        </div>
    );
};

export default ThemeSwitcher;
