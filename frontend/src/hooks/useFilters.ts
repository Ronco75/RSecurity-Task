import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CVE } from '../types/cve';
import type { FilterState, FilterPersistence } from '../types/filters';
import { DEFAULT_FILTERS } from '../types/filters';

const STORAGE_KEY = 'cve-filters';

const createFilterPersistence = (): FilterPersistence => {
  return {
    save: (filters: FilterState) => {
      try {
        const serialized = {
          searchText: filters.searchText,
          selectedSeverities: Array.from(filters.selectedSeverities),
          cvssRange: filters.cvssRange,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      } catch (error) {
        console.warn('Failed to save filters to localStorage:', error);
      }
    },

    load: (): FilterState => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_FILTERS;

        const parsed = JSON.parse(stored);
        return {
          searchText: parsed.searchText || '',
          selectedSeverities: new Set(parsed.selectedSeverities || []),
          cvssRange: parsed.cvssRange || DEFAULT_FILTERS.cvssRange,
        };
      } catch (error) {
        console.warn('Failed to load filters from localStorage:', error);
        return DEFAULT_FILTERS;
      }
    },

    clear: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear filters from localStorage:', error);
      }
    },
  };
};

interface UseFiltersReturn {
  filters: FilterState;
  filteredCVEs: CVE[];
  totalCount: number;
  filteredCount: number;
  updateFilters: (newFilters: Partial<FilterState>) => void;
  clearFilters: () => void;
  isFiltering: boolean;
}

export const useFilters = (cves: CVE[]): UseFiltersReturn => {
  const persistence = useMemo(() => createFilterPersistence(), []);
  const [filters, setFilters] = useState<FilterState>(() => persistence.load());

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    persistence.clear();
  }, [persistence]);

  useEffect(() => {
    persistence.save(filters);
  }, [filters, persistence]);

  const filteredCVEs = useMemo(() => {
    let result = cves;

    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase().trim();
      result = result.filter(cve =>
        cve.cve_id.toLowerCase().includes(searchLower) ||
        cve.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.selectedSeverities.size > 0) {
      result = result.filter(cve =>
        filters.selectedSeverities.has(cve.severity.toUpperCase())
      );
    }

    if (filters.cvssRange.min > 0 || filters.cvssRange.max < 10) {
      result = result.filter(cve =>
        cve.cvss_score >= filters.cvssRange.min &&
        cve.cvss_score <= filters.cvssRange.max
      );
    }

    return result;
  }, [cves, filters]);

  const isFiltering = useMemo(() => {
    return (
      filters.searchText.trim() !== '' ||
      filters.selectedSeverities.size > 0 ||
      filters.cvssRange.min > 0 ||
      filters.cvssRange.max < 10
    );
  }, [filters]);

  return {
    filters,
    filteredCVEs,
    totalCount: cves.length,
    filteredCount: filteredCVEs.length,
    updateFilters,
    clearFilters,
    isFiltering,
  };
};