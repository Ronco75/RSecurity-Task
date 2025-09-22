import React, { useState, useEffect } from 'react';
import { useCVEs } from '../../hooks/useCVEs';
import { useFilters } from '../../hooks/useFilters';
import { VirtualizedCVEList } from '../VirtualizedCVEList/VirtualizedCVEList';
import { VirtualizedCVEItemList } from '../VirtualizedCVEItemList/VirtualizedCVEItemList';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { CVEFilter } from '../CVEFilter/CVEFilter';
import styles from './CVEDemo.module.css';

type ViewMode = 'grid' | 'list';

export const CVEDemo: React.FC = () => {
  const { cves, loading, error, refetch, syncCVEs } = useCVEs();
  const { filters, filteredCVEs, totalCount, filteredCount, updateFilters } = useFilters(cves);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [gridColumns, setGridColumns] = useState(() => {
    const width = window.innerWidth;
    if (width >= 1400) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  });

  useEffect(() => {
    const updateGridColumns = () => {
      const width = window.innerWidth;
      if (width >= 1400) setGridColumns(4);
      else if (width >= 1024) setGridColumns(3);
      else if (width >= 768) setGridColumns(2);
      else setGridColumns(1);
    };

    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, []);

  const displayCVEs = filteredCVEs;

  if (loading === 'loading' && cves.length === 0) {
    return (
      <div className={styles.container}>
        <LoadingSpinner size="large" message="Loading CVE data..." />
      </div>
    );
  }

  if (error && cves.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>Failed to load CVE data</h2>
          <p className={styles.errorMessage}>{error.message}</p>
          <div className={styles.errorActions}>
            <button onClick={refetch} className={styles.retryButton}>
              Try Again
            </button>
            <button onClick={syncCVEs} className={styles.syncButton}>
              Sync CVEs
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <ErrorBoundary>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>RSecurity Task - Ron Cohen</h1>
            <p className={styles.subtitle}>
              Showing {filteredCount} of {totalCount} vulnerabilities
            </p>
          </div>
          
          <div className={styles.controls}>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleButton} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => setViewMode('grid')}
              >
                Grid View
              </button>
              <button
                className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
              >
                List View
              </button>
            </div>
            
            <div className={styles.actions}>
              <button
                onClick={refetch}
                disabled={loading === 'loading'}
                className={styles.refreshButton}
              >
                {loading === 'loading' ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={syncCVEs}
                disabled={loading === 'loading'}
                className={styles.syncButton}
              >
                Sync CVEs
              </button>
            </div>
          </div>
        </div>

        {cves.length === 0 && loading !== 'loading' ? (
          <div className={styles.emptyState}>
            <h3>No CVE data available</h3>
            <p>Click "Sync CVEs" to fetch the latest vulnerability data.</p>
            <button onClick={syncCVEs} className={styles.syncButton}>
              Sync CVEs
            </button>
          </div>
        ) : (
          <>
            <CVEFilter
              filters={filters}
              onFiltersChange={updateFilters}
              totalCount={totalCount}
              filteredCount={filteredCount}
            />

            <div className={styles.content}>
              {viewMode === 'grid' ? (
                <div className={styles.gridView}>
                  <div className={styles.grid}>
                    <VirtualizedCVEList cves={displayCVEs} gridColumns={gridColumns} />
                  </div>
                </div>
              ) : (
                <div className={styles.listView}>
                  <div className={styles.list}>
                    <VirtualizedCVEItemList cves={displayCVEs} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {error && cves.length > 0 && (
          <div className={styles.errorBanner}>
            <span>Warning: {error.message}</span>
            <button onClick={() => window.location.reload()}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
