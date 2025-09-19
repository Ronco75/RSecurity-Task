import { fetchCVEsFromAPI, CVEServiceError } from './cve-service.js';
import { insertCVE, getDBStats, checkDBHealth } from './db.js';
import type { CVE } from './db.js';

export interface SyncResult {
  success: boolean;
  fetched: number;
  stored: number;
  errors: Array<{
    cve_id: string;
    error: string;
  }>;
  message: string;
  timestamp: string;
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync?: SyncResult;
}

export class SyncService {
  private static isRunning = false;
  private static lastSyncResult: SyncResult | null = null;

  static async checkDatabaseEmpty(): Promise<boolean> {
    try {
      const isHealthy = await checkDBHealth();
      if (!isHealthy) {
        throw new Error('Database is not healthy');
      }

      const stats = await getDBStats();
      return stats.total === 0;
    } catch (error) {
      console.error('Error checking database status:', error);
      throw new Error(`Failed to check database status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async syncCVEData(apiUrl?: string): Promise<SyncResult> {
    const timestamp = new Date().toISOString();

    if (this.isRunning) {
      throw new Error('Sync operation is already in progress');
    }

    this.isRunning = true;
    console.log(`[${timestamp}] Starting CVE data sync operation...`);

    try {
      const dbHealthy = await checkDBHealth();
      if (!dbHealthy) {
        throw new Error('Database is not healthy - cannot proceed with sync');
      }

      console.log('Database health check passed');
      console.log('Environment check - NIST_API_URL:', process.env.NIST_API_URL);

      const cves = await fetchCVEsFromAPI(apiUrl);

      if (!cves || cves.length === 0) {
        const result: SyncResult = {
          success: true,
          fetched: 0,
          stored: 0,
          errors: [],
          message: 'No CVE data received from NIST API',
          timestamp
        };

        this.lastSyncResult = result;
        console.log(`[${timestamp}] Sync completed: No data received`);
        return result;
      }

      console.log(`Fetched ${cves.length} CVEs from NIST API, starting database storage...`);

      let storedCount = 0;
      const errors: Array<{ cve_id: string; error: string }> = [];

      for (const cve of cves) {
        try {
          await insertCVE(cve);
          storedCount++;

          if (storedCount % 10 === 0) {
            console.log(`Progress: Stored ${storedCount}/${cves.length} CVEs`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to store CVE ${cve.cve_id}:`, errorMessage);
          errors.push({
            cve_id: cve.cve_id,
            error: errorMessage
          });
        }
      }

      const result: SyncResult = {
        success: true,
        fetched: cves.length,
        stored: storedCount,
        errors,
        message: `Successfully synced ${storedCount} CVEs${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
        timestamp
      };

      this.lastSyncResult = result;
      console.log(`[${timestamp}] Sync completed successfully:`, {
        fetched: result.fetched,
        stored: result.stored,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${timestamp}] Sync operation failed:`, errorMessage);

      const result: SyncResult = {
        success: false,
        fetched: 0,
        stored: 0,
        errors: [{
          cve_id: 'SYNC_ERROR',
          error: errorMessage
        }],
        message: `Sync operation failed: ${errorMessage}`,
        timestamp
      };

      this.lastSyncResult = result;
      throw error;

    } finally {
      this.isRunning = false;
      console.log(`[${timestamp}] Sync operation finished`);
    }
  }

  static getSyncStatus(): SyncStatus {
    const status: SyncStatus = {
      isRunning: this.isRunning
    };

    if (this.lastSyncResult) {
      status.lastSync = this.lastSyncResult;
    }

    return status;
  }

  static getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult;
  }

  static async performStartupSync(): Promise<boolean> {
    try {
      const isEmpty = await this.checkDatabaseEmpty();

      if (isEmpty) {
        console.log('Database is empty, performing initial sync...');
        await this.syncCVEData();
        console.log('Initial sync completed successfully');
        return true;
      } else {
        const stats = await getDBStats();
        console.log(`Database already contains ${stats.total} CVEs, skipping initial sync`);
        return false;
      }
    } catch (error) {
      console.error('Startup sync failed:', error);
      throw error;
    }
  }
}