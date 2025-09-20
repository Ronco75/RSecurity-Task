import React, { useMemo, useState, useEffect } from 'react';
import { useCVEs } from '../../hooks/useCVEs';
import { CVECard } from '../CVECard/CVECard';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import styles from './CVEList.module.css';

export const CVEList: React.FC = () => {
  const { cves, loading, error, refetch, syncCVEs } = useCVEs();
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
            <h1 className={styles.title}>CVE Database</h1>
            <p className={styles.subtitle}>
              {cves.length} vulnerabilities found
            </p>
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

        {cves.length === 0 && loading !== 'loading' ? (
          <div className={styles.emptyState}>
            <h3>No CVE data available</h3>
            <p>Click "Sync CVEs" to fetch the latest vulnerability data.</p>
            <button onClick={syncCVEs} className={styles.syncButton}>
              Sync CVEs
            </button>
          </div>
        ) : (
          <div className={styles.listContainer}>
            <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
              {cves.map((cve) => (
                <CVECard
                  key={cve.cve_id}
                  cve={cve}
                />
              ))}
            </div>
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