import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config/environment.js';
import apiRoutes from './routes/api.routes.js';
import { createLeadWorker } from './workers/lead.worker.js';

const app = express();

// Security & utility middlewares
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));

// Capture raw body buffer for Facebook Webhook HMAC signature verification
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    mongoState: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {})
  });
});

// Database & Server Startup
async function startServer(): Promise<void> {
  try {
    console.log('[Database] Connecting to MongoDB at:', config.mongo.uri);
    await mongoose.connect(config.mongo.uri);
    console.log('[Database] Connected to MongoDB successfully.');

    // Start in-process BullMQ worker by default for development simplicity
    if (process.env.STANDALONE_WORKER !== 'true') {
      console.log('[BullMQ] Starting in-process lead worker...');
      createLeadWorker(5);
    }

    app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Automated Facebook Lead Pipeline API is running!`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`🌐 Webhook Listener: http://localhost:${config.port}/api/webhooks/facebook`);
      console.log(`⚙️  Environment: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });
  } catch (err: any) {
    console.error('[Server] Fatal startup error:', err.message);
    process.exit(1);
  }
}

startServer();
