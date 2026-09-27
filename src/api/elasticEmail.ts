import { ELASTIC_EMAIL_API_BASE, ELASTIC_EMAIL_API_V4_BASE } from './config';
import emitter from './eventEmitter';

// --- API Helper for v2 ---
export const apiFetch = async (endpoint: string, apiKey: string, options: { method?: 'GET' | 'POST', params?: Record<string, any> } = {}) => {
  const { method = 'GET', params = {} } = options;
  
  const allParams = new URLSearchParams({
    apikey: apiKey,
    ...params
  });

  const url = `${ELASTIC_EMAIL_API_BASE}${endpoint}`;
  let response;

  if (method === 'POST') {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: allParams
    });
  } else { // GET
    response = await fetch(`${url}?${allParams.toString()}`);
  }

  if (response.status === 403) {
    emitter.dispatchEvent(new CustomEvent('apiForbidden'));
  }

  const data = await response.json();
  
  if (!data.success) {
    const error: any = new Error(data.error || `An unknown API error occurred.`);
    error.status = response.status;
    throw error;
  }
  
  return data.data;
};

// --- API Helper for v4 ---
// FIX: Add 'PATCH' to the list of allowed methods for v4 API calls.
export const apiFetchV4 = async (endpoint: string, apiKey: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', params?: Record<string, any>, body?: any } = {}) => {
    const { method = 'GET', params = {}, body = null } = options;
    const queryParams = new URLSearchParams(params).toString();
    const url = `${ELASTIC_EMAIL_API_V4_BASE}${endpoint}${queryParams ? `?${queryParams}` : ''}`;

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'X-ElasticEmail-ApiKey': apiKey,
        }
    };
    
    // FIX: Include PATCH method when checking if a request body should be added.
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        if (response.status === 403) {
            emitter.dispatchEvent(new CustomEvent('apiForbidden'));
        }
        let errorMessage = `An unknown API error occurred.`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.Error || 'An unknown API error occurred.';
        } catch (e) {
            // response was not json, use default message
        }
        const error: any = new Error(errorMessage);
        error.status = response.status;
        throw error;
    }
    
    if (response.status === 204) {
        return {};
    }

    const text = await response.text();
    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn(`API for endpoint ${endpoint} returned a non-JSON success response. Text: "${text}"`);
        // This handles cases where a success response (like 200 OK for DELETE) has a non-JSON body like "OK".
        // Returning a success-like object prevents the caller's try/catch from failing.
        return { success: true, nonJsonText: text };
    }
};

export const apiUploadV4 = async (endpoint: string, apiKey: string, formData: FormData, params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${ELASTIC_EMAIL_API_V4_BASE}${endpoint}${queryParams ? `?${queryParams}` : ''}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'X-ElasticEmail-ApiKey': apiKey
        },
        body: formData
    });

    if (!response.ok) {
        if (response.status === 403) {
            emitter.dispatchEvent(new CustomEvent('apiForbidden'));
        }
        let errorMessage = `An unknown API error occurred.`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.Error || 'An unknown API error occurred.';
        } catch (e) { /* no-op */ }
        const error: any = new Error(errorMessage);
        error.status = response.status;
        throw error;
    }

    // Import returns 202, file upload returns 201
    if (response.status === 202) { 
        return {};
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
};