export interface FilterState {
  searchText: string;
  selectedSeverities: Set<string>;
  cvssRange: {
    min: number;
    max: number;
  };
}

export interface FilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export interface TextSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export interface SeverityFilterProps {
  selectedSeverities: Set<string>;
  onChange: (severities: Set<string>) => void;
}

export interface CVSSSliderProps {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
  step?: number;
}

export const SEVERITY_OPTIONS = [
  { value: 'CRITICAL', label: 'Critical', color: '#dc2626' },
  { value: 'HIGH', label: 'High', color: '#ea580c' },
  { value: 'MEDIUM', label: 'Medium', color: '#d97706' },
  { value: 'LOW', label: 'Low', color: '#65a30d' },
  { value: 'NONE', label: 'None', color: '#6b7280' },
] as const;

export type SeverityValue = typeof SEVERITY_OPTIONS[number]['value'];

export const DEFAULT_FILTERS: FilterState = {
  searchText: '',
  selectedSeverities: new Set<string>(),
  cvssRange: {
    min: 0,
    max: 10,
  },
};

export interface FilterPersistence {
  save: (filters: FilterState) => void;
  load: () => FilterState;
  clear: () => void;
}