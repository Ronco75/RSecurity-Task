import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const { PORT } = process.env;

if (!PORT) {
  throw new Error('PORT is not set in the environment (.env)');
}

// Middleware to parse JSON
app.use(express.json());

// Hello World route
app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});