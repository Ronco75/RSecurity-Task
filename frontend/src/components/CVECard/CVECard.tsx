import React from 'react';
import type { CVE } from '../../types/cve';
import styles from './CVECard.module.css';

interface CVECardProps {
  cve: CVE;
  style?: React.CSSProperties;
}

const getSeverityColor = (severity: string): string => {
  const lowerSeverity = severity.toLowerCase();
  if (lowerSeverity.includes('critical')) return 'critical';
  if (lowerSeverity.includes('high')) return 'high';
  if (lowerSeverity.includes('medium')) return 'medium';
  if (lowerSeverity.includes('low')) return 'low';
  return 'unknown';
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatCVSSScore = (score: number): { display: string; severity: string } => {
  if (score >= 9.0) return { display: score.toFixed(1), severity: 'critical' };
  if (score >= 7.0) return { display: score.toFixed(1), severity: 'high' };
  if (score >= 4.0) return { display: score.toFixed(1), severity: 'medium' };
  if (score > 0) return { display: score.toFixed(1), severity: 'low' };
  return { display: 'N/A', severity: 'unknown' };
};

export const CVECard: React.FC<CVECardProps> = React.memo(({ cve, style }) => {
  const severityClass = getSeverityColor(cve.severity);
  const cvssInfo = formatCVSSScore(cve.cvss_score);

  return (
    <div className={styles.card} style={style}>
      <div className={styles.header}>
        <h3 className={styles.cveId}>{cve.cve_id}</h3>
        <div className={`${styles.severityBadge} ${styles[severityClass]}`}>
          {cve.severity}
        </div>
      </div>

      <div className={styles.content}>
        <p className={styles.description}>
          {cve.description.length > 200
            ? `${cve.description.substring(0, 200)}...`
            : cve.description
          }
        </p>

        <div className={styles.metrics}>
          <div className={styles.cvssScore}>
            <span className={styles.label}>CVSS Score:</span>
            <span className={`${styles.score} ${styles[cvssInfo.severity]}`}>
              {cvssInfo.display}
            </span>
          </div>
        </div>

        <div className={styles.dates}>
          <div className={styles.dateItem}>
            <span className={styles.label}>Published:</span>
            <span className={styles.date}>
              {formatDate(cve.published_date)}
            </span>
          </div>
          <div className={styles.dateItem}>
            <span className={styles.label}>Modified:</span>
            <span className={styles.date}>
              {formatDate(cve.modified_date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});