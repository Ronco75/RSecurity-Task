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
  success: boolean;
  data: CVE[];
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
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