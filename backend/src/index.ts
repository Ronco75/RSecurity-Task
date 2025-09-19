import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initDB, checkDBHealth, getDBStats, getAllCVEs } from './db.js';
import { SyncService } from './sync-service.js';

dotenv.config();

const app = express();
const { PORT } = process.env;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

if (!PORT) {
  throw new Error('PORT is not set in the environment (.env)');
}

app.use(express.json());

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    const dbHealthy = await checkDBHealth();
    const stats = dbHealthy ? await getDBStats() : { total: 0 };

    res.status(200).json({
      message: 'OK',
      database: {
        connected: dbHealthy,
        totalCVEs: stats.total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Health check failed',
      database: { connected: false },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/cves', async (req, res) => {
  try {
    const cves = await getAllCVEs();
    res.status(200).json({
      message: 'CVE data retrieved successfully',
      count: cves.length,
      data: cves
    });
  } catch (error) {
    console.error('Error fetching CVEs:', error);
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Failed to retrieve CVE data'
    });
  }
});

app.post('/api/cves/sync', async (req, res) => {
  try {
    const syncResult = await SyncService.syncCVEData(process.env.NIST_API_URL);

    res.status(200).json({
      success: syncResult.success,
      message: syncResult.message,
      fetched: syncResult.fetched,
      stored: syncResult.stored,
      errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
      timestamp: syncResult.timestamp
    });

  } catch (error) {
    console.error('Error during CVE sync operation:', error);

    const syncStatus = SyncService.getSyncStatus();

    // Handle different types of errors with appropriate status codes
    if (error instanceof Error && error.message.includes('already in progress')) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Sync operation is already in progress',
        syncStatus
      });
    } else if (error instanceof Error && error.message.includes('timeout')) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'NIST API request timed out'
      });
    } else if (error instanceof Error && error.message.includes('Network error')) {
      res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to connect to NIST API'
      });
    } else if (error instanceof Error && error.message.includes('NIST API returned error')) {
      res.status(502).json({
        error: 'Bad gateway',
        message: 'NIST API returned an error'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to sync CVE data'
      });
    }
  }
});

app.get('/api/cves/sync/status', async (req, res) => {
  try {
    const syncStatus = SyncService.getSyncStatus();
    res.status(200).json(syncStatus);
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get sync status'
    });
  }
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req: any, res: any) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await initDB();
    console.log('Database initialized successfully');

    // Check if database needs initial population
    try {
      const performedSync = await SyncService.performStartupSync();
      if (performedSync) {
        console.log('Database populated with initial CVE data');
      }
    } catch (syncError) {
      console.warn('Initial sync failed, but server will continue:', syncError);
      console.warn('You can manually trigger sync using POST /api/cves/sync');
    }

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Database path: ${process.env.DB_PATH || './data/cves.db'}`);
      console.log('Available endpoints:');
      console.log('  GET  /api/health - Health check');
      console.log('  GET  /api/cves - Get all CVEs');
      console.log('  POST /api/cves/sync - Sync CVE data from NIST API');
      console.log('  GET  /api/cves/sync/status - Get sync status');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();