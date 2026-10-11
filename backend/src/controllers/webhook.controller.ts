import { Request, Response } from 'express';
import { config } from '../config/environment.js';
import { leadQueue } from '../queues/queue.connection.js';
import { Lead } from '../models/Lead.js';
import { AuditLog } from '../models/AuditLog.js';

export class WebhookController {
  /**
   * Facebook Webhook Handshake Verification (GET /api/webhooks/facebook)
   */
  public static verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.facebook.verifyToken) {
      console.log('[Webhook] Handshake verified successfully with Facebook');
      res.status(200).send(challenge);
      return;
    }

    console.warn('[Webhook] Handshake failed: Token mismatch or invalid mode');
    res.status(403).send('Forbidden: Token mismatch');
  }

  /**
   * Facebook Webhook Event Receiver (POST /api/webhooks/facebook)
   */
  public static async handleWebhook(req: Request, res: Response): Promise<void> {
    const body = req.body;

    // Fast 200 OK acknowledgment to prevent Facebook retry loops
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    if (body.object !== 'page') {
      return;
    }

    try {
      for (const entry of body.entry || []) {
        const pageId = entry.id;

        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const val = change.value;
            const leadgenId = val.leadgen_id;
            const formId = val.form_id;

            if (!leadgenId || !formId) {
              console.warn('[Webhook] Missing leadgen_id or form_id in webhook change value:', val);
              continue;
            }

            console.log(`[Webhook] Received new lead event: leadgenId=${leadgenId}, formId=${formId}, pageId=${pageId}`);

            // 1. Persist initial Lead record in MongoDB
            await Lead.findOneAndUpdate(
              { leadgenId },
              {
                $setOnInsert: {
                  leadgenId,
                  pageId,
                  formId,
                  rawWebhookPayload: val,
                  'crmSync.status': 'PENDING',
                  'crmSync.attempts': 0,
                  'capiSync.sent': false,
                  retryCount: 0
                }
              },
              { upsert: true, new: true }
            );

            // 2. Push job to BullMQ queue
            await leadQueue.add(
              `lead-${leadgenId}`,
              {
                leadgenId,
                formId,
                pageId
              },
              {
                jobId: leadgenId // Enforce job deduplication in BullMQ
              }
            );

            // 3. Log audit event
            await AuditLog.create({
              leadId: leadgenId,
              formId,
              action: 'WEBHOOK_RECEIVED',
              status: 'SUCCESS',
              details: { pageId, formId, createdTime: val.created_time }
            });
          }
        }
      }
    } catch (err: any) {
      console.error('[Webhook] Error processing incoming webhook batch:', err);
    }
  }
}
