import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

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
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'OK' });
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});