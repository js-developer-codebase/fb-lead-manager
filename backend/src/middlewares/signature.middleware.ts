import { Request, Response, NextFunction } from 'express';
import { CryptoService } from '../services/crypto.service.js';
import { config } from '../config/environment.js';

export interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

export function verifyFacebookSignature(req: RequestWithRawBody, res: Response, next: NextFunction): void {
  // Allow bypassing signature check in local development if explicitly testing with mock payloads
  if (config.nodeEnv === 'development' && (!config.facebook.appSecret || config.facebook.appSecret.startsWith('mock_'))) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
    return;
  }

  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const isValid = CryptoService.verifyHubSignature(rawBody, signature, config.facebook.appSecret);

  if (!isValid) {
    console.warn('[Webhook] Invalid X-Hub-Signature-256 signature received');
    res.status(403).json({ error: 'Invalid HMAC signature' });
    return;
  }

  next();
}
