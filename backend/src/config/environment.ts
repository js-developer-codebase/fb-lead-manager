import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',

  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/lead_management'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  },

  security: {
    masterKey: process.env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_lead_pipeline_change_in_prod',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  facebook: {
    appId: process.env.FB_APP_ID || '',
    appSecret: process.env.FB_APP_SECRET || '',
    verifyToken: process.env.FB_VERIFY_TOKEN || 'verify_lead_token_homestore',
    graphApiVersion: process.env.FB_GRAPH_API_VERSION || 'v21.0'
  },

  crm: {
    defaultEndpoint: process.env.DEFAULT_CRM_ENDPOINT || 'https://httpbin.org/post',
    defaultAuthToken: process.env.DEFAULT_CRM_AUTH_TOKEN || ''
  }
};
