module.exports = {
  apps: [
    {
      name: 'express-api',
      script: './backend/dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        STANDALONE_WORKER: 'false' // or 'true' if running process 2 separately
      }
    },
    {
      name: 'bullmq-worker',
      script: './backend/dist/worker.js',
      instances: 2, // 2 worker threads for high concurrency
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
