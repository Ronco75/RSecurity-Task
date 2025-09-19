import { useState, useCallback, useMemo } from 'react';

interface UseVirtualScrollProps {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number[];
  scrollTop: number;
  totalHeight: number;
  containerStyle: React.CSSProperties;
  getItemStyle: (index: number) => React.CSSProperties;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

export const useVirtualScroll = ({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualScrollProps): VirtualScrollResult => {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = itemCount * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const items: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push(i);
    }
    return items;
  }, [startIndex, endIndex]);

  const containerStyle: React.CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
  };

  const getItemStyle = useCallback(
    (index: number): React.CSSProperties => ({
      position: 'absolute',
      top: index * itemHeight,
      left: 0,
      right: 0,
      height: itemHeight,
    }),
    [itemHeight]
  );

  const onScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    startIndex,
    endIndex,
    visibleItems,
    scrollTop,
    totalHeight,
    containerStyle,
    getItemStyle,
    onScroll,
  };
};