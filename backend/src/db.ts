import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

// Database instance
let db: sqlite3.Database;

// CVE interface for type safety
export interface CVE {
  id?: number;
  cve_id: string;
  description: string;
  severity: string;
  published_date: string;
  modified_date: string;
  cvss_score: number;
  raw_data: string;
}

// Check if database is connected and accessible
export const checkDBHealth = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!db) {
      resolve(false);
      return;
    }

    db.get('SELECT 1', [], (err) => {
      if (err) {
        console.error('Database health check failed:', err.message);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
};

// Initialize database connection and create tables
export const initDB = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Use environment variable or default path
    const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'cves.db');

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database at:', dbPath);

      // Optimize database for bulk operations
      db.run('PRAGMA journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      db.run('PRAGMA synchronous = NORMAL'); // Faster writes, still safe
      db.run('PRAGMA cache_size = 10000'); // Increase cache size (10MB)
      db.run('PRAGMA temp_store = memory'); // Use memory for temp storage
      db.run('PRAGMA mmap_size = 268435456'); // Enable memory mapping (256MB)
    });

    // Create CVEs table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS cves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cve_id VARCHAR(20) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        severity VARCHAR(10) NOT NULL,
        published_date TEXT NOT NULL,
        modified_date TEXT NOT NULL,
        cvss_score DECIMAL(3,1) DEFAULT 0.0,
        raw_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
        reject(err);
        return;
      }
      console.log('CVEs table ready');

      // Create index on cve_id for faster queries
      db.run('CREATE INDEX IF NOT EXISTS idx_cve_id ON cves(cve_id)', (err) => {
        if (err) {
          console.error('Error creating index:', err.message);
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
};

// Insert a new CVE record (single insert - kept for compatibility)
export const insertCVE = async (cve: CVE): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call initDB() first.'));
      return;
    }

    const insertSQL = `
      INSERT OR REPLACE INTO cves
      (cve_id, description, severity, published_date, modified_date, cvss_score, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      cve.cve_id,
      cve.description,
      cve.severity,
      cve.published_date,
      cve.modified_date,
      cve.cvss_score,
      cve.raw_data
    ];

    db.run(insertSQL, params, function(err) {
      if (err) {
        console.error('Error inserting CVE:', err.message);
        reject(err);
        return;
      }
      console.log(`CVE inserted with ID: ${this.lastID}, CVE-ID: ${cve.cve_id}`);
      resolve(this.lastID);
    });
  });
};

// Batch insert CVE records for much better performance
export const insertCVEsBatch = async (cves: CVE[], batchSize: number = 500): Promise<{ inserted: number; errors: Array<{ cve_id: string; error: string }> }> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call initDB() first.'));
      return;
    }

    if (cves.length === 0) {
      resolve({ inserted: 0, errors: [] });
      return;
    }

    let totalInserted = 0;
    const errors: Array<{ cve_id: string; error: string }> = [];
    let processed = 0;

    // Process in batches to avoid memory issues and improve performance
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, cves.length);
      const batch = cves.slice(startIndex, endIndex);

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const insertSQL = `
          INSERT OR REPLACE INTO cves
          (cve_id, description, severity, published_date, modified_date, cvss_score, raw_data)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const stmt = db.prepare(insertSQL);
        let batchInserted = 0;

        batch.forEach((cve) => {
          const params = [
            cve.cve_id,
            cve.description,
            cve.severity,
            cve.published_date,
            cve.modified_date,
            cve.cvss_score,
            cve.raw_data
          ];

          stmt.run(params, function(err) {
            if (err) {
              errors.push({
                cve_id: cve.cve_id,
                error: err.message
              });
            } else {
              batchInserted++;
            }
          });
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('Error finalizing statement:', err.message);
            errors.push({
              cve_id: 'BATCH_FINALIZE_ERROR',
              error: err.message
            });
          }
        });

        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing batch transaction:', err.message);
            errors.push({
              cve_id: 'BATCH_COMMIT_ERROR',
              error: err.message
            });
          } else {
            totalInserted += batchInserted;
            console.log(`Batch ${Math.floor(startIndex / batchSize) + 1}: Inserted ${batchInserted}/${batch.length} CVEs (Total: ${totalInserted}/${cves.length})`);
          }

          processed += batch.length;

          // Process next batch or finish
          if (endIndex < cves.length) {
            processBatch(endIndex);
          } else {
            resolve({ inserted: totalInserted, errors });
          }
        });
      });
    };

    // Start processing
    processBatch(0);
  });
};

// Get all CVEs from database
export const getAllCVEs = async (): Promise<CVE[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call initDB() first.'));
      return;
    }

    const selectSQL = `
      SELECT id, cve_id, description, severity, published_date,
             modified_date, cvss_score, raw_data, created_at
      FROM cves
      ORDER BY published_date DESC
    `;

    db.all(selectSQL, [], (err, rows) => {
      if (err) {
        console.error('Error fetching CVEs:', err.message);
        reject(err);
        return;
      }
      resolve(rows as CVE[]);
    });
  });
};

// Get a specific CVE by its ID
export const getCVEById = async (cveId: string): Promise<CVE | null> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call initDB() first.'));
      return;
    }

    const selectSQL = `
      SELECT id, cve_id, description, severity, published_date,
             modified_date, cvss_score, raw_data, created_at
      FROM cves
      WHERE cve_id = ?
    `;

    db.get(selectSQL, [cveId], (err, row) => {
      if (err) {
        console.error('Error fetching CVE by ID:', err.message);
        reject(err);
        return;
      }
      resolve(row as CVE || null);
    });
  });
};

// Get database stats
export const getDBStats = async (): Promise<{ total: number }> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call initDB() first.'));
      return;
    }

    db.get('SELECT COUNT(*) as total FROM cves', [], (err, row: any) => {
      if (err) {
        console.error('Error getting database stats:', err.message);
        reject(err);
        return;
      }
      resolve({ total: row.total });
    });
  });
};

// Close database connection
export const closeDB = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
        return;
      }
      console.log('Database connection closed');
      resolve();
    });
  });
};