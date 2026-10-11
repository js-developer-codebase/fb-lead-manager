import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config/environment.js';

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redisConnection.on('error', (err) => {
  console.warn('[Redis] Connection warning/error:', err.message);
});

export const LEAD_QUEUE_NAME = 'lead-processing-queue';

export interface ILeadJobData {
  leadgenId: string;
  formId: string;
  pageId: string;
  isManualRetry?: boolean;
}

export const leadQueue = new Queue<ILeadJobData>(LEAD_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5s, 10s, 20s, 40s, 80s
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }
  }
});
