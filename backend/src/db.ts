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

// Insert a new CVE record
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