import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { initDB, checkDBHealth, getDBStats } from './db.js';
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

app.get('/api/cves', (req, res) => {
  res.status(200).json({
    message: 'CVE data endpoint',
    data: []
  });
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