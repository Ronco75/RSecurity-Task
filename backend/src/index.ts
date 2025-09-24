import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB, checkDBHealth, getDBStats, getAllCVEs } from './db.js';
import { SyncService } from './sync-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || '8080';

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

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
    const { background = false } = req.body || {};

    if (background) {
      // Start background sync (non-blocking)
      await SyncService.startBackgroundSync(process.env.NIST_API_URL || 'https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:o:microsoft:windows_10:1607');

      res.status(202).json({
        success: true,
        message: 'Background sync started',
        background: true,
        timestamp: new Date().toISOString()
      });
    } else {
      // Traditional blocking sync
      const syncResult = await SyncService.syncCVEData(process.env.NIST_API_URL || 'https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:o:microsoft:windows_10:1607');

      res.status(200).json({
        success: syncResult.success,
        message: syncResult.message,
        fetched: syncResult.fetched,
        stored: syncResult.stored,
        errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
        timestamp: syncResult.timestamp
      });
    }

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

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../public')));

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await initDB();
    console.log('Database initialized successfully');

    // Check if database needs initial population and start background sync
    try {
      const performedBackgroundSync = await SyncService.performBackgroundStartupSync();
      if (performedBackgroundSync) {
        console.log('Background sync started - CVE data will be populated progressively');
        console.log('Server is immediately available while sync runs in background');
      }
    } catch (syncError) {
      console.warn('Background sync failed to start, but server will continue:', syncError);
      console.warn('You can manually trigger sync using POST /api/cves/sync');
    }

    // Setup SPA routing before starting server
    setupSPARouting();

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Database path: ${process.env.DB_PATH || './data/cves.db'}`);
      console.log(`NIST API URL: ${process.env.NIST_API_URL || 'https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=cpe:2.3:o:microsoft:windows_10:1607'}`);
      console.log('Available endpoints:');
      console.log('  GET  /api/health - Health check');
      console.log('  GET  /api/cves - Get all CVEs');
      console.log('  POST /api/cves/sync - Sync CVE data from NIST API (blocking)');
      console.log('  POST /api/cves/sync {"background": true} - Start background sync (non-blocking)');
      console.log('  GET  /api/cves/sync/status - Get sync status and progress');
      console.log('');
      console.log('✅ Server is immediately available for requests');
      console.log('🔄 Background sync runs independently if database was empty');
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle SPA routing - must be after startServer call
const setupSPARouting = () => {
  // Serve index.html for all non-API routes (SPA fallback)
  app.use((req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Skip if it's a static file request (has extension)
    if (req.path.includes('.') && !req.path.endsWith('/')) {
      return next();
    }
    // Serve index.html for SPA routes
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
};

startServer().catch((error) => {
  console.error('Unhandled error during startup:', error);
  process.exit(1);
});