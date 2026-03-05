import 'dotenv/config';
import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import healthRouter from './routes/health.js';
import configRouter from './routes/admin/config.js';
import keywordsRouter from './routes/admin/keywords.js';
import testConnectionRouter from './routes/admin/testConnection.js';
import intelligenceRouter from './routes/intelligence.js';
import composerRouter from './routes/composer.js';
import mediaRouter from './routes/media/index.js';
import analyticsRouter from './routes/analytics/index.js';
import { startScheduler } from './scheduler.js';
import { startComposerScheduler } from './composer/scheduler.js';

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(corsMiddleware);
const captureRawBody = (req: express.Request, _res: express.Response, buf: Buffer): void => {
  if (buf.length > 0) {
    (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
  }
};
app.use(express.json({ verify: captureRawBody }));
app.use(express.urlencoded({ extended: true, verify: captureRawBody })); // Slack sends URL-encoded payloads

// Routes
app.use(healthRouter);
app.use(configRouter);
app.use(keywordsRouter);
app.use(testConnectionRouter);
app.use(intelligenceRouter);
app.use(composerRouter);
app.use(mediaRouter);
app.use(analyticsRouter);

// Start
app.listen(port, () => {
  console.log(`[Pulse] Backend running on http://localhost:${port}`);
  startScheduler();
  startComposerScheduler();
});
