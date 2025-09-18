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

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ message: 'OK' });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});