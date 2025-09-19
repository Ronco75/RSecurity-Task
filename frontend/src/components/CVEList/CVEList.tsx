import React, { useMemo, useState, useEffect } from 'react';
import { useCVEs } from '../../hooks/useCVEs';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { CVECard } from '../CVECard/CVECard';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import styles from './CVEList.module.css';

const CARD_HEIGHT = 280;
const CONTAINER_HEIGHT = 600;

export const CVEList: React.FC = () => {
  const { cves, loading, error, refetch, syncCVEs } = useCVEs();
  const [containerHeight, setContainerHeight] = useState(CONTAINER_HEIGHT);

  useEffect(() => {
    const updateHeight = () => {
      const availableHeight = window.innerHeight - 200;
      setContainerHeight(Math.max(400, Math.min(800, availableHeight)));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const {
    visibleItems,
    totalHeight,
    containerStyle,
    getItemStyle,
    onScroll,
  } = useVirtualScroll({
    itemCount: cves.length,
    itemHeight: CARD_HEIGHT,
    containerHeight,
    overscan: 3,
  });

  const gridColumns = useMemo(() => {
    const width = window.innerWidth;
    if (width >= 1400) return 4;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  }, []);

  const chunkedCVEs = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < cves.length; i += gridColumns) {
      chunks.push(cves.slice(i, i + gridColumns));
    }
    return chunks;
  }, [cves, gridColumns]);

  const virtualizedChunks = useMemo(() => {
    return visibleItems.map(index => ({
      index,
      chunk: chunkedCVEs[index] || [],
    }));
  }, [visibleItems, chunkedCVEs]);

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
            <div
              className={styles.virtualContainer}
              style={{
                ...containerStyle,
                height: containerHeight,
              }}
              onScroll={onScroll}
            >
              <div
                className={styles.virtualContent}
                style={{ height: totalHeight }}
              >
                {virtualizedChunks.map(({ index, chunk }) => (
                  <div
                    key={index}
                    className={styles.row}
                    style={getItemStyle(index)}
                  >
                    <div className={styles.grid}>
                      {chunk.map((cve, chunkIndex) => (
                        <CVECard
                          key={`${cve.cve_id}-${index}-${chunkIndex}`}
                          cve={cve}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
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