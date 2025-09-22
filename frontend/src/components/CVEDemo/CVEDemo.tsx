import React, { useState, useEffect } from 'react';
import { useCVEs } from '../../hooks/useCVEs';
import { VirtualizedCVEList } from '../VirtualizedCVEList/VirtualizedCVEList';
import { VirtualizedCVEItemList } from '../VirtualizedCVEItemList/VirtualizedCVEItemList';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import styles from './CVEDemo.module.css';

type ViewMode = 'grid' | 'list';

export const CVEDemo: React.FC = () => {
  const { cves, loading, error, refetch, syncCVEs } = useCVEs();
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

  const displayCVEs = cves;

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
            <h1 className={styles.title}>CVE Component Demo</h1>
            <p className={styles.subtitle}>
              Showing {displayCVEs.length} of {cves.length} vulnerabilities
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
          <div className={styles.content}>
            {viewMode === 'grid' ? (
              <div className={styles.gridView}>
                <div className={styles.viewDescription}>
                  <h3>CVECard Component - Grid Layout</h3>
                  <p>Compact card view with expandable descriptions and raw data sections.</p>
                </div>
                <div className={styles.grid}>
                  <VirtualizedCVEList cves={displayCVEs} gridColumns={gridColumns} />
                </div>
              </div>
            ) : (
              <div className={styles.listView}>
                <div className={styles.viewDescription}>
                  <h3>CVEItem Component - List Layout</h3>
                  <p>Detailed item view with comprehensive information display and structured sections.</p>
                </div>
                <div className={styles.list}>
                  <VirtualizedCVEItemList cves={displayCVEs} />
                </div>
              </div>
            )}
          </div>
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
