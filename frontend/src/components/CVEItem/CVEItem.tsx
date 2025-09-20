import React, { useState } from 'react';
import type { CVE } from '../../types/cve';
import styles from './CVEItem.module.css';

interface CVEItemProps {
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
      hour: '2-digit',
      minute: '2-digit',
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

export const CVEItem: React.FC<CVEItemProps> = React.memo(({ cve, style }) => {
  const severityClass = getSeverityColor(cve.severity);
  const cvssInfo = formatCVSSScore(cve.cvss_score);
  
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isRawDataExpanded, setIsRawDataExpanded] = useState(false);
  
  const descriptionLimit = 150;
  const shouldTruncateDescription = cve.description.length > descriptionLimit;
  
  const displayDescription = isDescriptionExpanded 
    ? cve.description 
    : shouldTruncateDescription 
      ? `${cve.description.substring(0, descriptionLimit)}...`
      : cve.description;

  const formatRawData = (rawData: string) => {
    try {
      const parsed = JSON.parse(rawData);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return rawData;
    }
  };

  return (
    <div className={styles.item} style={style}>
      {/* Header with CVE ID and Severity */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.cveId}>{cve.cve_id}</h2>
          <div className={styles.badges}>
            <div className={`${styles.severityBadge} ${styles[severityClass]}`}>
              {cve.severity.toUpperCase()}
            </div>
            <div className={`${styles.scorebadge} ${styles[cvssInfo.severity]}`}>
              CVSS {cvssInfo.display}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Description Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Description</h3>
          <div className={styles.descriptionContainer}>
            <p className={styles.description}>
              {displayDescription}
            </p>
            {shouldTruncateDescription && (
              <button
                className={styles.expandButton}
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                <span>{isDescriptionExpanded ? 'Show Less' : 'Show More'}</span>
                <span className={`${styles.expandIcon} ${isDescriptionExpanded ? styles.expanded : ''}`}>
                  ▼
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Metrics Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Metrics</h3>
          <div className={styles.metricsGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Severity</span>
              <span className={`${styles.metricValue} ${styles[severityClass]}`}>
                {cve.severity.toUpperCase()}
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>CVSS Score</span>
              <span className={`${styles.metricValue} ${styles[cvssInfo.severity]}`}>
                {cvssInfo.display}
              </span>
            </div>
          </div>
        </div>

        {/* Dates Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Timeline</h3>
          <div className={styles.datesGrid}>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Published</span>
              <span className={styles.dateValue}>
                {formatDate(cve.published_date)}
              </span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Last Modified</span>
              <span className={styles.dateValue}>
                {formatDate(cve.modified_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Raw Data Section */}
        <div className={styles.section}>
          <button
            className={styles.rawDataToggle}
            onClick={() => setIsRawDataExpanded(!isRawDataExpanded)}
          >
            <span className={styles.sectionTitle}>Raw Data</span>
            <span className={`${styles.toggleIcon} ${isRawDataExpanded ? styles.expanded : ''}`}>
              ▼
            </span>
          </button>
          {isRawDataExpanded && (
            <div className={styles.rawDataContent}>
              <pre className={styles.rawDataPre}>
                <code>{formatRawData(cve.raw_data)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CVEItem.displayName = 'CVEItem';
