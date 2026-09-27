
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import sdk from '../api/directus';
import { Configuration } from '../api/types';

interface ConfigurationContextType {
    config: Configuration | null;
    loading: boolean;
    error: string | null;
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

export const ConfigurationProvider = ({ children }: PropsWithChildren) => {
    const [config, setConfig] = useState<Configuration | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // FIX: Replaced the Directus SDK's `readSingleton` helper with a direct `fetch` call.
                // Added timestamp query param to prevent caching and ensure fresh config (like updated chat URLs) is loaded.
                const response = await fetch(`${sdk.url}items/configuration?t=${Date.now()}`);
                
                if (!response.ok) {
                    let errorBody = '';
                    try {
                        errorBody = await response.text();
                    } catch (e) {
                        // Ignore if body is unreadable
                    }
                    throw new Error(`Server responded with status ${response.status}. ${errorBody}`);
                }
                
                const result = await response.json();
                const configData = result?.data; // For singletons, data is in a 'data' property
                
                if (configData) {
                    setConfig(configData as Configuration);
                } else {
                     throw new Error('Configuration data not found in response');
                }
            } catch (err: any) {
                let errorMessage = 'Failed to fetch app configuration';
                // This check is kept for potential SDK errors elsewhere, though less likely now.
                if (err.errors && err.errors[0] && err.errors[0].message) {
                    errorMessage = err.errors[0].message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
                // FIX: Log the error message directly to avoid "[object Object]".
                console.error("Configuration fetch error:", err.message || err);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const value = { config, loading, error };

    return (
        <ConfigurationContext.Provider value={value}>
            {children}
        </ConfigurationContext.Provider>
    );
};

export const useConfiguration = () => {
    const context = useContext(ConfigurationContext);
    if (context === undefined) {
        throw new Error('useConfiguration must be used within a ConfigurationProvider');
    }
    return context;
};
