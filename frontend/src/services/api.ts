import axios, { type AxiosResponse, type CancelTokenSource } from 'axios';
import type {
  CVE,
  CVEApiResponse,
  HealthResponse,
  SyncResponse,
  SyncStatusResponse,
  ApiError,
  RequestConfig,
  NetworkState
} from '../types/cve';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Log API configuration for debugging
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:');
  console.log(`   Environment: ${import.meta.env.MODE}`);
  console.log(`   API Base URL: ${API_BASE_URL}`);
  console.log(`   VITE_API_BASE_URL: ${import.meta.env.VITE_API_BASE_URL || 'Not set'}`);
}
const DEFAULT_TIMEOUT = 10000;
const MAX_RETRY_ATTEMPTS = 3;
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest {
  promise: Promise<unknown>;
  cancelToken: CancelTokenSource;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, PendingRequest>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, timeout: number = CACHE_TIMEOUT): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + timeout,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  setPendingRequest(key: string, request: PendingRequest): void {
    this.pendingRequests.set(key, request);
  }

  getPendingRequest(key: string): PendingRequest | null {
    return this.pendingRequests.get(key) || null;
  }

  deletePendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }
}

class NetworkMonitor {
  private listeners: ((state: NetworkState) => void)[] = [];
  private currentState: NetworkState = { isOnline: navigator.onLine };

  constructor() {
    this.setupEventListeners();
    this.updateNetworkInfo();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => this.updateState({ isOnline: true }));
    window.addEventListener('offline', () => this.updateState({ isOnline: false }));

    if ('connection' in navigator) {
      const connection = (navigator as Record<string, unknown>).connection as Record<string, unknown>;
      if (typeof connection.addEventListener === 'function') {
        connection.addEventListener('change', () => this.updateNetworkInfo());
      }
    }
  }

  private updateNetworkInfo(): void {
    if ('connection' in navigator) {
      const connection = (navigator as Record<string, unknown>).connection as Record<string, unknown>;
      this.updateState({
        isOnline: navigator.onLine,
        downlink: connection.downlink as number,
        effectiveType: connection.effectiveType as string,
      });
    }
  }

  private updateState(state: Partial<NetworkState>): void {
    this.currentState = { ...this.currentState, ...state };
    this.listeners.forEach(listener => listener(this.currentState));
  }

  getState(): NetworkState {
    return this.currentState;
  }

  addListener(listener: (state: NetworkState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: NetworkState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
}

const cache = new ApiCache();
const networkMonitor = new NetworkMonitor();

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const calculateRetryDelay = (attempt: number, baseDelay: number = 1000): number => {
  return Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, 10000);
};

const createCacheKey = (url: string, params?: Record<string, unknown>): string => {
  return `${url}${params ? JSON.stringify(params) : ''}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and caching
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error(`[API Error] ${error.response?.status || 'Network Error'} ${error.config?.url}`, error);
    }

    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      status: error.response?.status,
      error: error.response?.data?.error,
    };

    return Promise.reject(apiError);
  }
);

const makeRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  cacheKey?: string,
  config: RequestConfig = {}
): Promise<T> => {
  const {
    enableRetry = true,
    retryAttempts = MAX_RETRY_ATTEMPTS,
    retryDelay = 1000,
    enableCache = true,
    cacheTimeout = CACHE_TIMEOUT,
    deduplication = true,
  } = config;

  if (cacheKey && enableCache) {
    const cachedData = cache.get<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    if (deduplication) {
      const pendingRequest = cache.getPendingRequest(cacheKey);
      if (pendingRequest) {
        return pendingRequest.promise as Promise<T>;
      }
    }
  }

  const cancelTokenSource = axios.CancelToken.source();

  const executeRequest = async (attempt: number = 0): Promise<T> => {
    try {
      if (!networkMonitor.getState().isOnline) {
        throw new Error('No internet connection');
      }

      const response = await requestFn();

      if (cacheKey && enableCache) {
        cache.set(cacheKey, response.data, cacheTimeout);
        cache.deletePendingRequest(cacheKey);
      }

      return response.data;
    } catch (error: unknown) {
      if (cacheKey) {
        cache.deletePendingRequest(cacheKey);
      }

      if (axios.isCancel(error)) {
        throw new Error('Request cancelled');
      }

      const apiError = error as ApiError;
      const shouldRetry = enableRetry &&
                         attempt < retryAttempts &&
                         (apiError.status ? apiError.status >= 500 : true);

      if (shouldRetry) {
        const delay = calculateRetryDelay(attempt, retryDelay);
        await sleep(delay);
        return executeRequest(attempt + 1);
      }

      throw error;
    }
  };

  const requestPromise = executeRequest();

  if (cacheKey && deduplication) {
    cache.setPendingRequest(cacheKey, {
      promise: requestPromise,
      cancelToken: cancelTokenSource,
    });
  }

  return requestPromise;
};

export const cveApi = {
  async getAllCVEs(config?: RequestConfig): Promise<CVE[]> {
    const cacheKey = createCacheKey('/api/cves');

    const response = await makeRequest<CVEApiResponse>(
      () => api.get('/api/cves'),
      cacheKey,
      config
    );

    return response.data;
  },

  async syncCVEs(config?: RequestConfig): Promise<SyncResponse> {
    cache.delete(createCacheKey('/api/cves'));

    return makeRequest<SyncResponse>(
      () => api.post('/api/cves/sync'),
      undefined,
      { ...config, enableCache: false }
    );
  },

  async getSyncStatus(config?: RequestConfig): Promise<SyncStatusResponse> {
    return makeRequest<SyncStatusResponse>(
      () => api.get('/api/cves/sync/status'),
      createCacheKey('/api/cves/sync/status'),
      { ...config, cacheTimeout: 5000 }
    );
  },

  async getHealth(config?: RequestConfig): Promise<HealthResponse> {
    return makeRequest<HealthResponse>(
      () => api.get('/api/health'),
      createCacheKey('/api/health'),
      { ...config, cacheTimeout: 30000 }
    );
  },

  cancelPendingRequests(): void {
    cache.clear();
  },

  clearCache(): void {
    cache.clear();
  },

  getNetworkState(): NetworkState {
    return networkMonitor.getState();
  },

  onNetworkChange(callback: (state: NetworkState) => void): () => void {
    networkMonitor.addListener(callback);
    return () => networkMonitor.removeListener(callback);
  },
};

export const transformCVEForDisplay = (cve: CVE) => ({
  ...cve,
  displaySeverity: cve.severity?.toUpperCase() || 'UNKNOWN',
  formattedPublishedDate: new Date(cve.published_date).toLocaleDateString(),
  formattedModifiedDate: new Date(cve.modified_date).toLocaleDateString(),
  severityColor: getSeverityColor(cve.severity),
  scoreCategory: getScoreCategory(cve.cvss_score),
});

export const getSeverityColor = (severity: string): string => {
  const severityMap: { [key: string]: string } = {
    'critical': '#dc2626',
    'high': '#ea580c',
    'medium': '#d97706',
    'low': '#65a30d',
    'none': '#6b7280',
  };
  return severityMap[severity?.toLowerCase()] || '#6b7280';
};

export const getScoreCategory = (score: number): string => {
  if (score >= 9.0) return 'Critical';
  if (score >= 7.0) return 'High';
  if (score >= 4.0) return 'Medium';
  if (score >= 0.1) return 'Low';
  return 'None';
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => func(...args), delay);
  };
};

export default api;