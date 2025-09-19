import { useState, useEffect, useCallback } from 'react';
import type { CVE, LoadingState, ApiError } from '../types/cve';
import { cveApi } from '../services/api';

interface UseCVEsReturn {
  cves: CVE[];
  loading: LoadingState;
  error: ApiError | null;
  refetch: () => Promise<void>;
  syncCVEs: () => Promise<void>;
}

export const useCVEs = (): UseCVEsReturn => {
  const [cves, setCVEs] = useState<CVE[]>([]);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<ApiError | null>(null);

  const fetchCVEs = useCallback(async () => {
    try {
      setLoading('loading');
      setError(null);
      const data = await cveApi.getAllCVEs();
      setCVEs(data);
      setLoading('success');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading('error');
      console.error('Failed to fetch CVEs:', apiError);
    }
  }, []);

  const syncCVEs = useCallback(async () => {
    try {
      setLoading('loading');
      setError(null);
      await cveApi.syncCVEs();
      await fetchCVEs();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading('error');
      console.error('Failed to sync CVEs:', apiError);
    }
  }, [fetchCVEs]);

  useEffect(() => {
    fetchCVEs();
  }, [fetchCVEs]);

  return {
    cves,
    loading,
    error,
    refetch: fetchCVEs,
    syncCVEs,
  };
};