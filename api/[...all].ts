import express from 'express';
import { apiRouter } from '../server/apiRouter';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Mount API router
app.use(apiRouter);

export default app;
