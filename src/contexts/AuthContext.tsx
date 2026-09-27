import React, { useState, useEffect, useCallback, ReactNode, createContext, useContext, PropsWithChildren } from 'react';
import { readMe, updateMe, createItem, readItems, updateItem, type AuthenticationData } from '@directus/sdk';
import sdk, { storage, authenticatedRequest } from '../api/directus';
import { apiFetch } from '../api/elasticEmail';
import type { Module } from '../api/types';
import { AppActions } from '../config/actions';
import { DIRECTUS_CRM_URL } from '../api/config';
import { getErrorMessage } from '../utils/helpers';

interface User {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    avatar?: string;
    language?: string;
    status: string;
    role: any;
    last_access?: string;
    email_notifications: boolean;
    theme_dark: boolean;
    theme_light: boolean;
    text_direction: string;
    company?: string;
    website?: string;
    mobile?: string;
    elastickey?: string;
    elasticid?: string;
    isApiKeyUser?: boolean;
    profileId?: string;
    purchasedModules: string[];
    type?: string;
    display?: 'light' | 'dark' | 'auto';
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (credentials: any, recaptchaToken?: string) => Promise<void>;
    loginWithApiKey: (apiKey: string) => Promise<void>;
    register: (details: any, recaptchaToken?: string, roleId?: string) => Promise<any>;
    createInitialProfile: (userId: string) => Promise<void>;
    logout: () => void;
    updateUser: (data: any) => Promise<void>;
    updateUserEmail: (newEmail: string) => Promise<void>;
    changePassword: (passwords: { old: string; new: string }) => Promise<void>;
    requestPasswordReset: (email: string, recaptchaToken?: string) => Promise<void>;
    resetPassword: (token: string, password: string) => Promise<void>;
    createElasticSubaccount: (email: string, password: string) => Promise<any>;
    hasModuleAccess: (moduleName: string, allModules: Module[] | null) => boolean;
    canPerformAction: (actionName: string) => boolean;
    purchaseModule: (moduleId: string) => Promise<void>;
    allModules: Module[] | null;
    moduleToUnlock: Module | null;
    setModuleToUnlock: (module: Module | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [allModules, setAllModules] = useState<Module[] | null>(null);
    const [moduleToUnlock, setModuleToUnlock] = useState<Module | null>(null);

    // This function ONLY handles fetching and setting a Directus user.
    const getMe = useCallback(async () => {
        try {
            // 1. Fetch modules, directus user, and profile in parallel where possible.
            const modulesPromise = authenticatedRequest<Module[]>((readItems as any)('modules', { 
                fields: ['id', 'modulename', 'moduleprice', 'moduledetails', 'status', 'modulepro', 'modulediscount', 'modulecore', 'locked_actions'], 
                limit: -1,
                filter: { status: { _eq: 'published' } }
            }));

            const mePromise = authenticatedRequest<any>(readMe({
                fields: [
                    'id', 'first_name', 'last_name', 'email', 'avatar', 'language',
                    'status', 'role.*', 'last_access', 'email_notifications',
                    'theme_dark', 'theme_light', 'text_direction'
                ] as any
            }));

            const [fetchedModules, me] = await Promise.all([modulesPromise, mePromise]);

            // Set modules state. This is safe now.
            setAllModules(fetchedModules);

            // 2. Get the associated user profile from the 'profiles' collection, now that we have the user ID.
            const profiles: any[] = await authenticatedRequest<any[]>((readItems as any)('profiles', {
                filter: { user_created: { _eq: me.id } },
                fields: ['id', 'company', 'website', 'mobile', 'elastickey', 'elasticid', 'type', 'display', 'language'],
                limit: 1
            }));
            
            let profileData: any = profiles?.[0];

            if (!profileData) {
                profileData = await authenticatedRequest<any>((createItem as any)('profiles', { status: 'published', user_created: me.id }));
            }

            // 3. Fetch purchased modules based on the profile ID.
            const purchasedModulesResponse = profileData.id
                ? await authenticatedRequest<{ module_id: string }[]>((readItems as any)('profiles_modules', {
                    filter: { profile_id: { _eq: profileData.id } },
                    fields: ['module_id'],
                    limit: -1
                }))
                : [];

            // 4. Process the purchased modules
            const purchasedModuleIds = new Set(purchasedModulesResponse.map((pm: any) => String(pm.module_id)));
            const purchasedModules = fetchedModules
                .filter((module: any) => purchasedModuleIds.has(String(module.id)))
                .map((module: any) => module.modulename);

            // 5. Combine data and set the user state
            const mergedUser: User = {
                ...me,
                ...profileData,
                id: me.id,
                email: me.email,
                status: me.status,
                role: me.role,
                email_notifications: me.email_notifications,
                theme_dark: me.theme_dark,
                theme_light: me.theme_light,
                text_direction: me.text_direction,
                profileId: profileData.id as string,
                purchasedModules,
                isApiKeyUser: false,
            };
            
            setUser(mergedUser);

        } catch (error: any) {
            const errorMessage = getErrorMessage(error);
            // If the error is a session expiration, it's handled globally by an event listener
            // that triggers a logout. We don't need to log it as a critical error here,
            // as it's an expected part of the authentication flow.
            if (errorMessage !== "Session expired. Logging out.") {
                console.error("Failed to fetch full user profile:", errorMessage);
            }
            // On ANY failure in getMe, we should assume the session is invalid or data is corrupt.
            // Clear everything to be safe. The authenticatedRequest wrapper will trigger a logout
            // if it's a token issue, but this handles other errors (e.g. network, permissions).
            setUser(null);
            setAllModules(null);
        }
    }, []);

    // This function ONLY handles fetching and setting an API Key user.
    const getApiKeyUser = useCallback(async (apiKey: string) => {
         try {
            const accountData = await apiFetch('/account/load', apiKey);
            setUser({
                id: accountData.publicaccountid || `api-user-${apiKey.slice(0, 5)}`,
                email: accountData.email,
                elastickey: apiKey,
                isApiKeyUser: true,
                purchasedModules: [], // API key users have no Directus-managed modules
                first_name: accountData.firstname,
                last_name: accountData.lastname,
                status: 'Active',
                role: { name: 'API User' },
                last_access: new Date().toISOString(),
                email_notifications: false,
                theme_dark: false,
                theme_light: true,
                text_direction: 'ltr',
            });
        } catch (error) {
            console.error("API Key validation failed:", error);
            localStorage.removeItem('elastic_email_api_key');
            setUser(null);
        }
    }, []);

    // On initial app load, determine auth state
    useEffect(() => {
        const initializeAuth = async () => {
            setLoading(true);
            const directusToken = await sdk.getToken();
            const apiKey = localStorage.getItem('elastic_email_api_key');

            if (directusToken) {
                await getMe();
            } else if (apiKey) {
                await getApiKeyUser(apiKey);
            } else {
                setUser(null);
            }
            setLoading(false);
        };
        initializeAuth();
    }, [getMe, getApiKeyUser]);
    
    const login = async (credentials: any, recaptchaToken?: string) => {
        setLoading(true);
        try {
            const authData = await sdk.request<AuthenticationData>(() => ({
                method: 'POST',
                path: '/auth/login',
                body: JSON.stringify({
                    email: credentials.email.toLowerCase(),
                    password: credentials.password,
                    'g-recaptcha-response': recaptchaToken,
                }),
                headers: { 'Content-Type': 'application/json' },
            }));
    
            await storage.set(authData);

            localStorage.removeItem('elastic_email_api_key');
            await getMe();
        } finally {
            setLoading(false);
        }
    };
    
    const loginWithApiKey = async (apiKey: string) => {
        setLoading(true);
        await sdk.logout();
        localStorage.setItem('elastic_email_api_key', apiKey);
        await getApiKeyUser(apiKey);
        setLoading(false);
    };

    const register = async (details: any, recaptchaToken?: string, roleId?: string) => {
        const { email, password, ...otherDetails } = details;
        const requestPayload: { [key: string]: any } = {
            email: email.toLowerCase(),
            password: password,
            ...otherDetails,
        };
        if (roleId) {
            requestPayload.role = roleId;
        }
        if (recaptchaToken) {
            requestPayload['g-recaptcha-response'] = recaptchaToken;
        }

        // This is a public request, so it doesn't need the authenticated wrapper.
        return await sdk.request<any>(() => ({
            method: 'POST',
            path: '/users',
            body: JSON.stringify(requestPayload),
            headers: { 'Content-Type': 'application/json' },
        }));
    };

    const createInitialProfile = async (userId: string) => {
        // This request will use the public role's permissions.
        await sdk.request(createItem('profiles', {
            status: 'published',
            user_created: userId,
        }));
    };

    const logout = async () => {
        setLoading(true);
        try {
            await sdk.logout();
        } catch (error) {
            console.warn("Directus SDK logout failed, likely already logged out.", error);
        } finally {
            localStorage.removeItem('elastic_email_api_key');
            setUser(null);
            setLoading(false);
        }
    };

    const updateUser = async (data: any) => {
        if (!user || !user.id || user.isApiKeyUser) throw new Error("User not authenticated for this action");

        try {
            const meFields: { [key: string]: any } = {};
            const profileFields: { [key: string]: any } = {};
            const allowedMeFields = ['first_name', 'last_name', 'theme_dark', 'theme_light', 'text_direction'];
            const allowedProfileFields = ['company', 'website', 'mobile', 'elastickey', 'elasticid', 'type', 'display', 'language'];

            for (const key in data) {
                if (allowedMeFields.includes(key)) meFields[key] = data[key];
                else if (allowedProfileFields.includes(key)) profileFields[key] = data[key];
            }

            if (Object.keys(meFields).length > 0) {
                await authenticatedRequest<any>(updateMe(meFields));
            }

            if (Object.keys(profileFields).length > 0 && user.profileId) {
                // FIX: Cast SDK function to 'any' to bypass strict type checks when a full schema is not available for Directus.
                await authenticatedRequest<any>((updateItem as any)('profiles', user.profileId, profileFields));
            }
            
            await getMe();

        } catch (error) {
            console.error("Failed to update user:", error);
            throw error;
        }
    };

    const updateUserEmail = async (newEmail: string) => {
        if (!user || user.isApiKeyUser) throw new Error("User not authenticated.");
        await authenticatedRequest(updateMe({ email: newEmail.toLowerCase() }));
        await getMe();
    };

    const changePassword = async (passwords: { old: string; new: string }) => {
        if (!user) throw new Error("User not authenticated");
        await authenticatedRequest(() => ({
            method: 'PATCH',
            path: '/users/me/password',
            body: JSON.stringify({
                password: passwords.new,
                old_password: passwords.old,
            }),
            headers: { 'Content-Type': 'application/json' },
        }));
    };
    
    const requestPasswordReset = async (email: string, recaptchaToken?: string) => {
        const reset_url = `${window.location.origin}${window.location.pathname}#/reset-password`;
        const requestPayload = {
            email: email.toLowerCase(),
            reset_url: reset_url,
        };
    
        // This is a public request.
        await sdk.request(() => ({
            method: 'POST',
            path: '/auth/password/request',
            body: JSON.stringify({ ...requestPayload, 'g-recaptcha-response': recaptchaToken }),
            headers: { 'Content-Type': 'application/json' },
        }));
    };

    const resetPassword = async (token: string, password: string) => {
        // This is a public request.
        await sdk.request(() => ({
            method: 'POST',
            path: '/auth/password/reset',
            body: JSON.stringify({ token, password }),
            headers: { 'Content-Type': 'application/json' },
        }));
    };

    const createElasticSubaccount = async (email: string, password: string) => {
        if (!user || user.isApiKeyUser) {
            throw new Error("User not authenticated for this action");
        }

        const webhookUrl = `${DIRECTUS_CRM_URL}/flows/trigger/736aa130-adf4-4ab0-a117-7e7647b403ea`;

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await sdk.getToken()}`
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                try {
                    const errorBody = await response.json();
                    throw new Error(errorBody.message || `Webhook trigger failed with status ${response.status}`);
                } catch {
                    throw new Error(`Webhook trigger failed with status ${response.status}`);
                }
            }

            const pollForApiKey = async (timeout = 15000, interval = 2000): Promise<boolean> => {
                const endTime = Date.now() + timeout;
                while (Date.now() < endTime) {
                    try {
                        // FIX: Cast SDK function to 'any' to bypass strict type checks when a full schema is not available for Directus.
                        const profiles = await authenticatedRequest<any[]>((readItems as any)('profiles', {
                            filter: { user_created: { _eq: user.id } },
                            fields: ['elastickey'],
                            limit: 1
                        }));
                        if (profiles && profiles.length > 0 && profiles[0].elastickey) {
                            return true;
                        }
                    } catch (pollError) {
                        console.warn("Polling for API key encountered an error, retrying...", pollError);
                    }
                    await new Promise(res => setTimeout(res, interval));
                }
                return false;
            };

            const isKeyProvisioned = await pollForApiKey();

            if (isKeyProvisioned) {
                await getMe();
                return;
            } else {
                await getMe();
                throw new Error("Account creation timed out. Please check your account page shortly or contact support.");
            }

        } catch (error: any) {
            console.error("Subaccount creation failed:", error);
            throw error;
        }
    };

    const hasModuleAccess = (moduleName: string, allModules: Module[] | null): boolean => {
        if (!allModules) return false;
        const moduleData = allModules.find(m => m.modulename === moduleName);
        if (!moduleData) return true;
        if (moduleData.modulecore) return true;
        return user?.purchasedModules.includes(moduleName) ?? false;
    };
    
    const canPerformAction = (actionName: string): boolean => {
        if (!allModules || !user) return false;
        
        const normalize = (str: string) => str.toLowerCase().replace(/_/g, '');
        const normalizedActionName = normalize(actionName);
        
        const moduleThatLocksAction = allModules.find(m => 
            Array.isArray(m.locked_actions) && 
            m.locked_actions.some(lockedAction => normalize(lockedAction) === normalizedActionName)
        );

        if (!moduleThatLocksAction) return true;
        return hasModuleAccess(moduleThatLocksAction.modulename, allModules);
    };

    const purchaseModule = (moduleId: string): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            if (!user || !user.profileId) {
                return reject(new Error("User profile not found."));
            }
    
            const moduleToBuy = allModules?.find(m => String(m.id) === String(moduleId));
            if (!moduleToBuy) {
                return reject(new Error("Module not found."));
            }
    
            const webhookUrl = `${DIRECTUS_CRM_URL}/flows/trigger/974adeab-789f-428d-9433-b056e1c6da9b`;
    
            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await sdk.getToken()}`
                    },
                    body: JSON.stringify({ module_id: moduleId })
                });
    
                if (!response.ok) {
                    try {
                        const errorBody = await response.json();
                        if (errorBody.message?.toLowerCase().includes('balance')) {
                            throw new Error("Insufficient credits.");
                        }
                        throw new Error(errorBody.message || `Webhook trigger failed with status ${response.status}`);
                    } catch {
                        throw new Error(`Webhook trigger failed with status ${response.status}`);
                    }
                }
    
                const pollForModuleUnlock = async (timeout = 15000, interval = 2000): Promise<boolean> => {
                    const endTime = Date.now() + timeout;
                    while (Date.now() < endTime) {
                        try {
                            // FIX: Cast SDK function to 'any' to bypass strict type checks when a full schema is not available for Directus.
                            const result = await authenticatedRequest<any[]>((readItems as any)('profiles_modules', {
                                filter: {
                                    profile_id: { _eq: user.profileId },
                                    module_id: { _eq: moduleId }
                                },
                                limit: 1
                            }));
                            if (result && result.length > 0) {
                                return true;
                            }
                        } catch (pollError) {
                            console.warn("Polling for module unlock encountered an error, retrying...", pollError);
                        }
                        await new Promise(res => setTimeout(res, interval));
                    }
                    return false;
                };
    
                const isUnlocked = await pollForModuleUnlock();
    
                if (isUnlocked) {
                    await getMe();
                    resolve();
                } else {
                    await getMe();
                    reject(new Error("Unlocking the module timed out. The transaction may still be processing. Please check your modules page again shortly or contact support."));
                }
    
            } catch (error: any) {
                console.error("Module purchase failed:", error);
                return reject(new Error(error.message || "Could not initiate module purchase. Please contact support."));
            }
        });
    };

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithApiKey,
        register,
        createInitialProfile,
        logout,
        updateUser,
        updateUserEmail,
        changePassword,
        requestPasswordReset,
        resetPassword,
        createElasticSubaccount,
        hasModuleAccess,
        canPerformAction,
        purchaseModule,
        allModules,
        moduleToUnlock,
        setModuleToUnlock
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
