import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/apiRouter';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for proper protocol and IP handling behind Nginx / Cloud Run
  app.set('trust proxy', 1);

  // JSON Body Parser with 25MB limit for high-resolution business logos
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Error middleware for payload / JSON parsing errors (prevents returning raw HTML to clients)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      if (err.type === 'entity.too.large') {
        return res.status(413).json({
          error: 'The uploaded logo or payload exceeds the 25MB size limit. Please upload a smaller image file.',
        });
      }
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Malformed JSON payload provided.' });
      }
    }
    next(err);
  });

  // Middleware: Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ----------------------------------------------------
  // Mount API Router (Health, Orders, PayPal Webhook, Contact, Admin)
  // ----------------------------------------------------
  app.use(apiRouter);

  // API 404 Handler (ensures unknown /api routes return JSON, not HTML fallback)
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.path} not found.` });
  });

  // Global Uncaught Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Unhandled Server Error]:', err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(err.status || 500).json({
      error: err.message || 'An unexpected internal server error occurred.',
    });
  });

  // ----------------------------------------------------
  // Vite Middleware (Dev) / Static Serve (Prod)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RevTap Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
