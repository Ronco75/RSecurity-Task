import React, { useState, useEffect, useCallback } from 'react';
import type { TextSearchProps } from '../../../types/filters';
import styles from './TextSearch.module.css';

export const TextSearch: React.FC<TextSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search CVE ID or description...',
  debounceMs = 300,
}) => {
  const [inputValue, setInputValue] = useState(value);

  const debouncedOnChange = useCallback(
    (searchValue: string) => {
      const timeoutId = setTimeout(() => {
        onChange(searchValue);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    },
    [onChange, debounceMs]
  );

  useEffect(() => {
    const cleanup = debouncedOnChange(inputValue);
    return cleanup;
  }, [inputValue, debouncedOnChange]);

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const handleClear = () => {
    setInputValue('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        <div className={styles.searchIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
          aria-label="Search CVEs"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};