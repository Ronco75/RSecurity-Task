import React from 'react';
import type { SeverityFilterProps } from '../../../types/filters';
import { SEVERITY_OPTIONS } from '../../../types/filters';
import styles from './SeverityFilter.module.css';

export const SeverityFilter: React.FC<SeverityFilterProps> = ({
  selectedSeverities,
  onChange,
}) => {
  const handleSeverityToggle = (severity: string) => {
    const newSeverities = new Set(selectedSeverities);
    if (newSeverities.has(severity)) {
      newSeverities.delete(severity);
    } else {
      newSeverities.add(severity);
    }
    onChange(newSeverities);
  };

  const handleSelectAll = () => {
    if (selectedSeverities.size === SEVERITY_OPTIONS.length) {
      onChange(new Set());
    } else {
      onChange(new Set(SEVERITY_OPTIONS.map(option => option.value)));
    }
  };

  const allSelected = selectedSeverities.size === SEVERITY_OPTIONS.length;
  const noneSelected = selectedSeverities.size === 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Severity</span>
        <button
          type="button"
          onClick={handleSelectAll}
          className={styles.selectAllButton}
          aria-label={allSelected ? 'Deselect all severities' : 'Select all severities'}
        >
          {allSelected ? 'None' : 'All'}
        </button>
      </div>

      <div className={styles.options}>
        {SEVERITY_OPTIONS.map((option) => {
          const isSelected = selectedSeverities.has(option.value);

          return (
            <label
              key={option.value}
              className={`${styles.option} ${isSelected ? styles.selected : ''}`}
              style={{ '--severity-color': option.color } as React.CSSProperties}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSeverityToggle(option.value)}
                className={styles.checkbox}
                aria-label={`Filter by ${option.label} severity`}
              />
              <div className={styles.pill}>
                <div className={styles.indicator} />
                <span className={styles.text}>{option.label}</span>
              </div>
            </label>
          );
        })}
      </div>

      {!noneSelected && (
        <div className={styles.summary}>
          {selectedSeverities.size} of {SEVERITY_OPTIONS.length} selected
        </div>
      )}
    </div>
  );
};