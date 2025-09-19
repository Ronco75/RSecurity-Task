import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initDB, checkDBHealth, getDBStats, getAllCVEs, insertCVE } from './db.js';
import { fetchCVEsFromAPI } from './cve-service.js';

dotenv.config();

const app = express();
const { PORT } = process.env;

app.use(cors({
  origin: 'https://localhost:8080',
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

app.post('/api/cves/fetch', async (req, res) => {
  try {
    console.log('Starting CVE data fetch from NIST API...');
    console.log('Environment check - NIST_API_URL:', process.env.NIST_API_URL);

    // Fetch CVEs from NIST API
    const cves = await fetchCVEsFromAPI(process.env.NIST_API_URL);

    if (!cves || cves.length === 0) {
      return res.status(200).json({
        message: 'No CVE data received from NIST API',
        fetched: 0,
        stored: 0
      });
    }

    // Store each CVE in the database
    let storedCount = 0;
    const errors = [];

    for (const cve of cves) {
      try {
        await insertCVE(cve);
        storedCount++;
        console.log(`Stored CVE ${cve.cve_id}`);
        console.log(`Stored ${storedCount} CVEs`);
      } catch (error) {
        console.error(`Failed to store CVE ${cve.cve_id}:`, error);
        errors.push({
          cve_id: cve.cve_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.status(200).json({
      message: 'CVE data fetch completed',
      fetched: cves.length,
      stored: storedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error during CVE fetch operation:', error);

    // Handle different types of errors with appropriate status codes
    if (error instanceof Error && error.message.includes('timeout')) {
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
        message: error instanceof Error ? error.message : 'Failed to fetch CVE data'
      });
    }
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

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Database path: ${process.env.DB_PATH || './data/cves.db'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();