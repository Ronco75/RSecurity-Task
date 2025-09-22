import React from 'react';
import type { FilterProps } from '../../types/filters';
import { TextSearch } from './components/TextSearch';
import { SeverityFilter } from './components/SeverityFilter';
import { CVSSSlider } from './components/CVSSSlider';
import styles from './CVEFilter.module.css';

export const CVEFilter: React.FC<FilterProps> = ({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}) => {
  const handleSearchChange = (searchText: string) => {
    onFiltersChange({ ...filters, searchText });
  };

  const handleSeverityChange = (selectedSeverities: Set<string>) => {
    onFiltersChange({ ...filters, selectedSeverities });
  };

  const handleCVSSChange = (min: number, max: number) => {
    onFiltersChange({
      ...filters,
      cvssRange: { min, max }
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchText: '',
      selectedSeverities: new Set(),
      cvssRange: { min: 0, max: 10 },
    });
  };

  const isFiltering = filters.searchText ||
                     filters.selectedSeverities.size > 0 ||
                     filters.cvssRange.min > 0 ||
                     filters.cvssRange.max < 10;

  const hasNoResults = isFiltering && filteredCount === 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>Filter CVEs</h3>
          <div className={styles.resultCount}>
            {isFiltering ? (
              <span className={hasNoResults ? styles.noResults : styles.filtered}>
                {filteredCount} of {totalCount} vulnerabilities
              </span>
            ) : (
              <span className={styles.total}>
                {totalCount} vulnerabilities
              </span>
            )}
          </div>
        </div>

        {isFiltering && (
          <button
            onClick={handleClearFilters}
            className={styles.clearButton}
            aria-label="Clear all filters"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear Filters
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <div className={styles.searchSection}>
            <TextSearch
              value={filters.searchText}
              onChange={handleSearchChange}
              placeholder="Search CVE ID or description..."
              debounceMs={300}
            />
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.severitySection}>
            <SeverityFilter
              selectedSeverities={filters.selectedSeverities}
              onChange={handleSeverityChange}
            />
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.cvssSection}>
            <CVSSSlider
              min={filters.cvssRange.min}
              max={filters.cvssRange.max}
              onChange={handleCVSSChange}
              step={0.1}
            />
          </div>
        </div>
      </div>

      {hasNoResults && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className={styles.emptyMessage}>
            No CVEs match your current filters
          </p>
          <button
            onClick={handleClearFilters}
            className={styles.emptyAction}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};