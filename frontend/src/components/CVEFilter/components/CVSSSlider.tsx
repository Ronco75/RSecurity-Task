import React, { useState, useCallback } from 'react';
import type { CVSSSliderProps } from '../../../types/filters';
import styles from './CVSSSlider.module.css';

export const CVSSSlider: React.FC<CVSSSliderProps> = ({
  min,
  max,
  onChange,
  step = 0.1,
}) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);

  const handleMinChange = useCallback((value: number) => {
    const newMin = Math.max(0, Math.min(value, max - step));
    onChange(newMin, max);
  }, [max, step, onChange]);

  const handleMaxChange = useCallback((value: number) => {
    const newMax = Math.min(10, Math.max(value, min + step));
    onChange(min, newMax);
  }, [min, step, onChange]);

  const handleInputChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    if (type === 'min') {
      handleMinChange(numValue);
    } else {
      handleMaxChange(numValue);
    }
  };

  const getSliderStyle = () => {
    const minPercent = (min / 10) * 100;
    const maxPercent = (max / 10) * 100;

    return {
      left: `${minPercent}%`,
      width: `${maxPercent - minPercent}%`,
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>CVSS Score Range</span>
        <div className={styles.values}>
          {min.toFixed(1)} - {max.toFixed(1)}
        </div>
      </div>

      <div className={styles.sliderContainer}>
        <div className={styles.track}>
          <div className={styles.range} style={getSliderStyle()} />
        </div>

        <input
          type="range"
          min="0"
          max="10"
          step={step}
          value={min}
          onChange={(e) => handleMinChange(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging('min')}
          onMouseUp={() => setIsDragging(null)}
          className={`${styles.slider} ${styles.minSlider} ${isDragging === 'min' ? styles.dragging : ''}`}
          aria-label="Minimum CVSS score"
        />

        <input
          type="range"
          min="0"
          max="10"
          step={step}
          value={max}
          onChange={(e) => handleMaxChange(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging('max')}
          onMouseUp={() => setIsDragging(null)}
          className={`${styles.slider} ${styles.maxSlider} ${isDragging === 'max' ? styles.dragging : ''}`}
          aria-label="Maximum CVSS score"
        />
      </div>

      <div className={styles.inputs}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Min</label>
          <input
            type="number"
            min="0"
            max="10"
            step={step}
            value={min.toFixed(1)}
            onChange={(e) => handleInputChange('min', e.target.value)}
            className={styles.numberInput}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>Max</label>
          <input
            type="number"
            min="0"
            max="10"
            step={step}
            value={max.toFixed(1)}
            onChange={(e) => handleInputChange('max', e.target.value)}
            className={styles.numberInput}
          />
        </div>
      </div>

      <div className={styles.scale}>
        {[0, 2, 4, 6, 8, 10].map(value => (
          <div key={value} className={styles.scaleItem}>
            <div className={styles.scaleTick} />
            <span className={styles.scaleLabel}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};