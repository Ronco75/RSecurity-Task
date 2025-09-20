import { useState, useEffect, useCallback, useRef } from 'react';
import type { CVE, LoadingState, ApiError, NetworkState, SyncResponse } from '../types/cve';
import { cveApi } from '../services/api';

interface UseCVEsReturn {
  cves: CVE[];
  loading: LoadingState;
  error: ApiError | null;
  networkState: NetworkState;
  refetch: () => Promise<void>;
  syncCVEs: () => Promise<SyncResponse>;
  clearCache: () => void;
  isOnline: boolean;
}

export const useCVEs = (): UseCVEsReturn => {
  const [cves, setCVEs] = useState<CVE[]>([]);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const [networkState, setNetworkState] = useState<NetworkState>(cveApi.getNetworkState());
  const mounted = useRef(true);

  const fetchCVEs = useCallback(async () => {
    if (!mounted.current) return;

    try {
      setLoading('loading');
      setError(null);

      const data = await cveApi.getAllCVEs({
        enableRetry: true,
        retryAttempts: 3,
        enableCache: true,
      });

      if (mounted.current) {
        setCVEs(data);
        setLoading('success');
      }
    } catch (err) {
      if (mounted.current) {
        const apiError = err as ApiError;
        setError(apiError);
        setLoading('error');
        console.error('Failed to fetch CVEs:', apiError);
      }
    }
  }, []);

  const syncCVEs = useCallback(async (): Promise<SyncResponse> => {
    try {
      setLoading('loading');
      setError(null);

      const syncResult = await cveApi.syncCVEs({
        enableRetry: true,
        retryAttempts: 2,
        enableCache: false,
      });

      await fetchCVEs();
      return syncResult;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading('error');
      console.error('Failed to sync CVEs:', apiError);
      throw err;
    }
  }, [fetchCVEs]);

  const clearCache = useCallback(() => {
    cveApi.clearCache();
  }, []);

  useEffect(() => {
    const unsubscribe = cveApi.onNetworkChange((state) => {
      setNetworkState(state);
      if (state.isOnline && error?.message.includes('No internet connection')) {
        setError(null);
        fetchCVEs();
      }
    });

    return () => {
      unsubscribe();
      mounted.current = false;
    };
  }, [error, fetchCVEs]);

  useEffect(() => {
    mounted.current = true;
    fetchCVEs();

    return () => {
      mounted.current = false;
    };
  }, [fetchCVEs]);

  return {
    cves,
    loading,
    error,
    networkState,
    refetch: fetchCVEs,
    syncCVEs,
    clearCache,
    isOnline: networkState.isOnline,
  };
};