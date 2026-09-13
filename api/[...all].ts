import express from 'express';
import { apiRouter } from '../server/apiRouter.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure incoming path matches /api/* routes whether Vercel passes '/orders' or '/api/orders'
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  next();
});

// Mount API router
app.use(apiRouter);

export default app;
