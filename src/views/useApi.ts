
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/elasticEmail';

const useApi = (endpoint: string, apiKey: string, params: Record<string, any> = {}, refetchIndex = 0) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{message: string, endpoint: string, status?: number} | null>(null);
  
  const paramsString = JSON.stringify(params);

  const fetchData = useCallback(async () => {
    if (!apiKey || !endpoint) {
        setLoading(false);
        setData(null);
        return;
    };

    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(endpoint, apiKey, { params: JSON.parse(paramsString) });
      setData(result);
    } catch (err: any) {
      setError({message: err.message, endpoint, status: err.status});
    } finally {
      setLoading(false);
    }
  }, [endpoint, apiKey, paramsString]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refetchIndex]);

  return { data, loading, error, refetch: fetchData };
};

export default useApi;
