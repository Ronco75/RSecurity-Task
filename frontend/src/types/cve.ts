export interface CVE {
  id?: number;
  cve_id: string;
  description: string;
  severity: string;
  published_date: string;
  modified_date: string;
  cvss_score: number;
  raw_data: string;
}

export interface CVEApiResponse {
  message: string;
  count: number;
  data: CVE[];
}

export interface HealthResponse {
  message: string;
  database: {
    connected: boolean;
    totalCVEs?: number;
  };
  timestamp: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  fetched?: number;
  stored?: number;
  errors?: string[];
  timestamp?: string;
}

export interface SyncStatusResponse {
  isActive: boolean;
  status: string;
  message?: string;
  startTime?: string;
  progress?: {
    processed: number;
    total: number;
  };
}

export interface ApiError {
  message: string;
  status?: number;
  error?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  syncStatus?: SyncStatusResponse;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface SeverityColors {
  [key: string]: string;
}

export interface VirtualScrollItem {
  index: number;
  height: number;
  offset: number;
}

export interface NetworkState {
  isOnline: boolean;
  downlink?: number;
  effectiveType?: string;
}

export interface RequestConfig {
  enableRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
  deduplication?: boolean;
}