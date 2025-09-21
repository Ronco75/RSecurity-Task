import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CVECard } from '../CVECard/CVECard';
import type { CVE } from '../../types/cve';
import styles from './VirtualizedCVEList.module.css';

interface VirtualizedCVEListProps {
  cves: CVE[];
  gridColumns: number;
}

const CARD_HEIGHT = 360; // More accurate height for CVE cards (including gaps)
const ITEMS_TO_RENDER_BUFFER = 6; // Number of items to render outside viewport (reduced for better performance)

export const VirtualizedCVEList: React.FC<VirtualizedCVEListProps> = ({ cves, gridColumns }) => {
  const [expandedStates, setExpandedStates] = useState<Record<string, { description: boolean; rawData: boolean }>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800); // Better default height
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleDescription = useCallback((cveId: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [cveId]: {
        ...prev[cveId],
        description: !prev[cveId]?.description,
      }
    }));
  }, []);

  const handleToggleRawData = useCallback((cveId: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [cveId]: {
        ...prev[cveId],
        rawData: !prev[cveId]?.rawData,
      }
    }));
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

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

  const itemsPerRow = gridColumns;
  const totalRows = Math.ceil(cves.length / itemsPerRow);

  // Calculate which rows are visible with better bounds checking
  const visibleRowCount = Math.ceil(containerHeight / CARD_HEIGHT);
  const startRow = Math.floor(scrollTop / CARD_HEIGHT);
  const endRow = Math.min(
    totalRows - 1,
    startRow + visibleRowCount + ITEMS_TO_RENDER_BUFFER
  );

  const visibleStartRow = Math.max(0, startRow - ITEMS_TO_RENDER_BUFFER);
  const visibleEndRow = Math.min(totalRows - 1, endRow);


  if (cves.length === 0) {
    return <div className={styles.emptyContainer}>No CVE data to display</div>;
  }

  const visibleItems = [];
  for (let row = visibleStartRow; row <= visibleEndRow; row++) {
    const rowItems = [];
    for (let col = 0; col < itemsPerRow; col++) {
      const itemIndex = row * itemsPerRow + col;
      const cve = cves[itemIndex];

      if (!cve) {
        rowItems.push(<div key={`${row}-${col}`} className={styles.gridItem} />);
        continue;
      }

      const cveId = cve.cve_id;
      const expandedState = expandedStates[cveId] || { description: false, rawData: false };

      rowItems.push(
        <div key={cve.cve_id} className={styles.gridItem}>
          <CVECard
            cve={cve}
            isDescriptionExpanded={expandedState.description}
            isRawDataExpanded={expandedState.rawData}
            onToggleDescription={() => handleToggleDescription(cveId)}
            onToggleRawData={() => handleToggleRawData(cveId)}
          />
        </div>
      );
    }

    visibleItems.push(
      <div
        key={row}
        className={styles.gridRow}
        style={{
          transform: `translateY(${row * CARD_HEIGHT}px)`,
          position: 'absolute',
          width: '100%',
          height: CARD_HEIGHT,
        }}
      >
        {rowItems}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onScroll={handleScroll}
    >
      <div
        className={styles.scrollContent}
        style={{ height: totalRows * CARD_HEIGHT }}
      >
        {visibleItems}
      </div>
    </div>
  );
};