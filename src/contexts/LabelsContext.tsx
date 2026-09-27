import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { useConfiguration } from './ConfigurationContext';

export interface Labels {
    [key: string]: string;
}

interface LabelsContextType {
    labels: Labels | null;
    loading: boolean;
    error: string | null;
}

const LabelsContext = createContext<LabelsContextType | undefined>(undefined);

let cachedLabels: Labels | null = null;

export const LabelsProvider = ({ children }: PropsWithChildren) => {
    const { config } = useConfiguration();
    const [labels, setLabels] = useState<Labels | null>(cachedLabels);
    const [loading, setLoading] = useState(!cachedLabels);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (cachedLabels || !config?.app_backend) {
            if (!cachedLabels) setLoading(false);
            return;
        }

        const fetchLabels = async () => {
            setLoading(true);
            try {
                // Fetch the singleton 'labels' item
                const response = await fetch(`${config.app_backend}/items/labels`);
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Labels API response not OK:", response.status, errorText);
                    throw new Error(`Failed to fetch labels configuration (status: ${response.status})`);
                }
                const result = await response.json();
                
                // The API returns a single object under the 'data' key for a singleton
                if (result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
                    const labelsData = { ...result.data };
                    delete labelsData.id; // remove id property
                    cachedLabels = labelsData;
                    setLabels(cachedLabels);
                } else {
                    console.warn('Labels data not found or in unexpected format in response:', result);
                    // Set an empty object to prevent re-fetching and indicate load is complete
                    cachedLabels = {};
                    setLabels({});
                }
            } catch (err: any) {
                setError(err.message);
                console.error("Labels fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLabels();
    }, [config]);

    const value = { labels, loading, error };

    return (
        <LabelsContext.Provider value={value}>
            {children}
        </LabelsContext.Provider>
    );
};

export const useLabels = () => {
    const context = useContext(LabelsContext);
    if (context === undefined) {
        throw new Error('useLabels must be used within a LabelsProvider');
    }
    return context;
};
