import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Loading...',
}) => {
  return (
    <div className={styles.container}>
      <div className={`${styles.spinner} ${styles[size]}`} role="status" aria-label="Loading">
        <div className={styles.spinnerInner}></div>
      </div>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};