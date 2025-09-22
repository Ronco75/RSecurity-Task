import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CVEItem } from '../CVEItem/CVEItem';
import type { CVE } from '../../types/cve';
import styles from './VirtualizedCVEItemList.module.css';

interface VirtualizedCVEItemListProps {
  cves: CVE[];
}

const ESTIMATED_ITEM_HEIGHT = 450; // Estimated height per CVE item
const BUFFER_SIZE = 5; // Number of items to render outside viewport
const DEFAULT_CONTAINER_HEIGHT = 800;

export const VirtualizedCVEItemList: React.FC<VirtualizedCVEItemListProps> = ({ cves }) => {
  const [containerHeight, setContainerHeight] = useState(DEFAULT_CONTAINER_HEIGHT);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container height on mount and resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateContainerHeight();
    window.addEventListener('resize', updateContainerHeight);
    return () => window.removeEventListener('resize', updateContainerHeight);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible range with estimated heights
  const startIndex = Math.max(0, Math.floor(scrollTop / ESTIMATED_ITEM_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(
    cves.length - 1,
    Math.ceil((scrollTop + containerHeight) / ESTIMATED_ITEM_HEIGHT) + BUFFER_SIZE
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (cves[i]) {
      visibleItems.push(i);
    }
  }

  if (cves.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        No CVE data to display
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div className={styles.scrollContent}>
        <div style={{ height: startIndex * ESTIMATED_ITEM_HEIGHT }} />
        {visibleItems.map((index) => {
          const cve = cves[index];
          if (!cve) return null;

          return (
            <div key={cve.cve_id} className={styles.itemWrapper}>
              <CVEItem cve={cve} />
            </div>
          );
        })}
        <div style={{ height: (cves.length - endIndex - 1) * ESTIMATED_ITEM_HEIGHT }} />
      </div>
    </div>
  );
};