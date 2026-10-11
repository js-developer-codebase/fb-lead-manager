import mongoose from 'mongoose';
import { config } from './config/environment.js';
import { createLeadWorker } from './workers/lead.worker.js';

async function startStandaloneWorker(): Promise<void> {
  console.log('[Worker Process] Initializing standalone BullMQ worker process...');
  try {
    await mongoose.connect(config.mongo.uri);
    console.log('[Worker Process] Connected to MongoDB.');

    const worker = createLeadWorker(10);
    console.log('[Worker Process] BullMQ Lead Worker active and listening for jobs.');

    process.on('SIGTERM', async () => {
      console.log('[Worker Process] SIGTERM received. Closing worker...');
      await worker.close();
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (err: any) {
    console.error('[Worker Process] Fatal error:', err.message);
    process.exit(1);
  }
}

startStandaloneWorker();
