import React, { useState } from 'react';
import type { CVE } from '../../types/cve';
import styles from './CVECard.module.css';

interface CVECardProps {
  cve: CVE;
  style?: React.CSSProperties;
  isDescriptionExpanded?: boolean;
  isRawDataExpanded?: boolean;
  onToggleDescription?: () => void;
  onToggleRawData?: () => void;
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

export const CVECard: React.FC<CVECardProps> = React.memo(({
  cve,
  style,
  isDescriptionExpanded: externalDescriptionExpanded,
  isRawDataExpanded: externalRawDataExpanded,
  onToggleDescription,
  onToggleRawData
}) => {
  const severityClass = getSeverityColor(cve.severity);
  const cvssInfo = formatCVSSScore(cve.cvss_score);

  // Use internal state when external handlers are not provided
  const [internalDescriptionExpanded, setInternalDescriptionExpanded] = useState(false);
  const [internalRawDataExpanded, setInternalRawDataExpanded] = useState(false);

  // Determine which state to use
  const isDescriptionExpanded = onToggleDescription ? externalDescriptionExpanded : internalDescriptionExpanded;
  const isRawDataExpanded = onToggleRawData ? externalRawDataExpanded : internalRawDataExpanded;

  // Create handlers that work with internal or external state
  const handleToggleDescription = onToggleDescription || (() => setInternalDescriptionExpanded(!internalDescriptionExpanded));
  const handleToggleRawData = onToggleRawData || (() => setInternalRawDataExpanded(!internalRawDataExpanded));
  
  const descriptionLimit = 200;
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
    <div className={styles.card} style={style}>
      <div className={styles.header}>
        <h3 className={styles.cveId}>{cve.cve_id}</h3>
        <div className={`${styles.severityBadge} ${styles[severityClass]}`}>
          {cve.severity}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.descriptionContainer}>
          <p className={styles.description}>
            {displayDescription}
          </p>
          {shouldTruncateDescription && (
            <button
              className={styles.expandButton}
              onClick={handleToggleDescription}
            >
              {isDescriptionExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>

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

        <div className={styles.rawDataSection}>
          <button
            className={styles.rawDataToggle}
            onClick={handleToggleRawData}
          >
            <span>Raw Data</span>
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