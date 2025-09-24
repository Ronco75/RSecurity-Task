import { fetchCVEsFromAPI, fetchAllCVEsInChunks, CVEServiceError } from './cve-service.js';
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

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  currentChunk?: number;
  totalChunks?: number;
  phase: 'fetching' | 'storing' | 'complete';
  estimatedTimeRemaining?: number | undefined;
  startTime: number;
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync?: SyncResult;
  progress?: SyncProgress;
}

export class SyncService {
  private static isRunning = false;
  private static lastSyncResult: SyncResult | null = null;
  private static currentProgress: SyncProgress | null = null;
  private static backgroundSyncProcess: Promise<void> | null = null;

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

    if (this.currentProgress) {
      status.progress = this.currentProgress;
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

  static async startBackgroundSync(apiUrl?: string): Promise<void> {
    if (this.isRunning || this.backgroundSyncProcess) {
      console.log('Background sync is already running or scheduled');
      return;
    }

    console.log('Starting background CVE sync process...');

    this.backgroundSyncProcess = this.performBackgroundSync(apiUrl);

    // Don't await - let it run in background
    this.backgroundSyncProcess.catch((error) => {
      console.error('Background sync process failed:', error);
    }).finally(() => {
      this.backgroundSyncProcess = null;
    });
  }

  private static async performBackgroundSync(apiUrl?: string): Promise<void> {
    const timestamp = new Date().toISOString();

    if (this.isRunning) {
      throw new Error('Sync operation is already in progress');
    }

    this.isRunning = true;
    console.log(`[${timestamp}] Starting background CVE data sync...`);

    try {
      const dbHealthy = await checkDBHealth();
      if (!dbHealthy) {
        throw new Error('Database is not healthy - cannot proceed with sync');
      }

      const startTime = Date.now();
      this.currentProgress = {
        current: 0,
        total: 0,
        percentage: 0,
        phase: 'fetching',
        startTime
      };

      let totalFetched = 0;
      let totalStored = 0;
      const errors: Array<{ cve_id: string; error: string }> = [];

      // Use chunked fetching with progress callback
      const cves = await fetchAllCVEsInChunks(
        apiUrl,
        2000, // Chunk size
        (progress) => {
          // Update progress during fetching
          const eta = this.calculateETA(startTime, progress.current, progress.total);
          this.currentProgress = {
            current: progress.current,
            total: progress.total,
            percentage: progress.percentage,
            phase: 'fetching',
            startTime,
            estimatedTimeRemaining: eta
          };

          // Store CVEs as we receive them (progressive storage)
          this.storeCVEsInBackground(progress.cves).then((stored) => {
            totalStored += stored.success;
            errors.push(...stored.errors);
          }).catch((error) => {
            console.error('Error storing CVE chunk:', error);
          });
        }
      );

      totalFetched = cves.length;

      // Update progress to storing phase
      this.currentProgress = {
        current: totalFetched,
        total: totalFetched,
        percentage: 100,
        phase: 'storing',
        startTime
      };

      console.log(`Background sync fetched ${totalFetched} CVEs, stored ${totalStored} CVEs`);

      const result: SyncResult = {
        success: true,
        fetched: totalFetched,
        stored: totalStored,
        errors,
        message: `Successfully synced ${totalStored} CVEs in background${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
        timestamp
      };

      this.lastSyncResult = result;
      this.currentProgress = {
        current: totalStored,
        total: totalFetched,
        percentage: 100,
        phase: 'complete',
        startTime
      };

      console.log(`[${timestamp}] Background sync completed successfully:`, {
        fetched: result.fetched,
        stored: result.stored,
        errors: result.errors.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${timestamp}] Background sync operation failed:`, errorMessage);

      const result: SyncResult = {
        success: false,
        fetched: 0,
        stored: 0,
        errors: [{
          cve_id: 'BACKGROUND_SYNC_ERROR',
          error: errorMessage
        }],
        message: `Background sync operation failed: ${errorMessage}`,
        timestamp
      };

      this.lastSyncResult = result;
      this.currentProgress = null;
      throw error;

    } finally {
      this.isRunning = false;
      console.log(`[${timestamp}] Background sync operation finished`);
    }
  }

  private static async storeCVEsInBackground(cves: CVE[]): Promise<{ success: number; errors: Array<{ cve_id: string; error: string }> }> {
    let successCount = 0;
    const errors: Array<{ cve_id: string; error: string }> = [];

    for (const cve of cves) {
      try {
        await insertCVE(cve);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to store CVE ${cve.cve_id}:`, errorMessage);
        errors.push({
          cve_id: cve.cve_id,
          error: errorMessage
        });
      }
    }

    return { success: successCount, errors };
  }

  private static calculateETA(startTime: number, current: number, total: number): number | undefined {
    if (current === 0 || total === 0) return undefined;

    const elapsed = Date.now() - startTime;
    const rate = current / elapsed; // items per ms
    const remaining = total - current;

    return Math.round(remaining / rate);
  }

  static async performBackgroundStartupSync(): Promise<boolean> {
    try {
      const isEmpty = await this.checkDatabaseEmpty();

      if (isEmpty) {
        console.log('Database is empty, starting background initial sync...');
        await this.startBackgroundSync();
        console.log('Background initial sync started');
        return true;
      } else {
        const stats = await getDBStats();
        console.log(`Database already contains ${stats.total} CVEs, skipping initial sync`);
        return false;
      }
    } catch (error) {
      console.error('Background startup sync failed:', error);
      throw error;
    }
  }
}