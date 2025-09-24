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
  const pollingIntervalRef = useRef<number | null>(null);
  const lastCVECount = useRef<number>(0);

  const fetchCVEs = useCallback(async (silent: boolean = false) => {
    if (!mounted.current) return;

    try {
      if (!silent) {
        setLoading('loading');
        setError(null);
      }

      const data = await cveApi.getAllCVEs({
        enableRetry: true,
        retryAttempts: 3,
        enableCache: false, // Disable cache for real-time updates
      });

      if (mounted.current) {
        setCVEs(data);
        lastCVECount.current = data.length;
        if (!silent) {
          setLoading('success');
        }
      }
    } catch (err) {
      if (mounted.current) {
        const apiError = err as ApiError;
        setError(apiError);
        if (!silent) {
          setLoading('error');
        }
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

      // Start polling to monitor background sync progress
      startPolling();

      await fetchCVEs();
      return syncResult;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setLoading('error');
      console.error('Failed to sync CVEs:', apiError);
      throw err;
    }
  }, [fetchCVEs, startPolling]);

  const clearCache = useCallback(() => {
    cveApi.clearCache();
  }, []);

  // Start polling for CVE updates during background sync
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    pollingIntervalRef.current = window.setInterval(async () => {
      if (!mounted.current) return;

      try {
        // Check sync status first
        const syncStatus = await cveApi.getSyncStatus({
          enableRetry: false,
          enableCache: false
        });

        if (syncStatus.isRunning) {
          // Sync is running, fetch updated CVEs silently
          await fetchCVEs(true);
        } else {
          // Sync completed, stop polling and do final fetch
          stopPolling();
          await fetchCVEs(true);
        }
      } catch (error) {
        console.error('Error during polling:', error);
      }
    }, 2000); // Poll every 2 seconds
  }, [fetchCVEs]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
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
      stopPolling();
    };
  }, [error, fetchCVEs, stopPolling]);

  useEffect(() => {
    mounted.current = true;
    fetchCVEs();

    // Check if sync is running and start polling if needed
    const checkSyncStatus = async () => {
      try {
        const syncStatus = await cveApi.getSyncStatus({
          enableRetry: false,
          enableCache: false
        });

        if (syncStatus.isRunning) {
          startPolling();
        }
      } catch (error) {
        console.error('Error checking initial sync status:', error);
      }
    };

    checkSyncStatus();

    return () => {
      mounted.current = false;
      stopPolling();
    };
  }, [fetchCVEs, startPolling, stopPolling]);

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