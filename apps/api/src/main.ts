/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'dotenv/config';
import express from 'express';
import * as path from 'path';
import { expressOpenApi } from './service/express-openapi';
import cors from 'cors';
import { sequelize } from './service/sequelize';
import { assistantRouter } from './agent/route';

const app = express();
// Allowed CORS origins, comma-separated in CORS_ORIGIN (e.g. the webapp dev
// and Vite preview servers). Falls back to the local defaults.
const allowedOrigins = (
  process.env.CORS_ORIGIN ?? 'http://localhost:4200,http://localhost:4300'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
  res.send({ message: 'Welcome to ConnexAI Tech Test API' });
});

app.use('/assistant', assistantRouter);

expressOpenApi(app);

const port = process.env.PORT || 3333;
const server = app.listen(port, async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }

  console.log(`Listening at http://localhost:${port}`);
});
server.on('error', console.error);
