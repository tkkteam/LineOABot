import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import config from './config/index.js';
import routes from './routes/index.js';
import { lineMiddleware, lineConfigured } from './services/lineClient.js';
import { handleEvent } from './services/lineService.js';
import { apiLimiter, webhookLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();

// ---------- Security ----------
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin: config.urls.corsOrigin === '*' ? true : config.urls.corsOrigin.split(','),
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ---------- LINE webhook (public, no JSON body parse — LINE SDK handles it) ----------
if (lineConfigured()) {
  app.post('/webhook', webhookLimiter, lineMiddleware, async (req, res) => {
    try {
      const events = req.body.events || [];
      // Fire-and-forget each event; never block the webhook response
      for (const event of events) {
        handleEvent(event).catch((err) =>
          logger.error('[line] event processing error', { message: err.message }),
        );
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      logger.error('[webhook] handler error', { message: err.message });
      return res.status(500).json({ success: false, message: 'webhook error' });
    }
  });
  logger.info('[webhook] /webhook registered');
} else {
  logger.warn('[webhook] LINE credentials missing — /webhook DISABLED');
}

// ---------- REST API ----------
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter, routes);

// ---------- Health check ----------
app.get('/health', (req, res) =>
  res.status(200).json({ success: true, status: 'ok', ts: new Date().toISOString() }),
);

// ---------- 404 + error handling ----------
app.use(notFound);
app.use(errorHandler);

export default app;
