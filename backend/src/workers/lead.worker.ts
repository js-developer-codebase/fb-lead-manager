import { Worker, Job } from 'bullmq';
import { redisConnection, LEAD_QUEUE_NAME, ILeadJobData } from '../queues/queue.connection.js';
import { Lead } from '../models/Lead.js';
import { FormMapping } from '../models/FormMapping.js';
import { AuditLog } from '../models/AuditLog.js';
import { FacebookService } from '../services/facebook.service.js';
import { FormMapperService } from '../services/form-mapper.service.js';
import { CrmService } from '../services/crm.service.js';
import { CapiService } from '../services/capi.service.js';

export async function processLeadJob(job: Job<ILeadJobData>): Promise<any> {
  const { leadgenId, formId, pageId, isManualRetry } = job.data;
  console.log(`[LeadWorker] Processing job #${job.id} for leadgenId: ${leadgenId}, formId: ${formId} (Attempt: ${job.attemptsMade + 1})`);

  // 1. Fetch or initialize Lead document
  let lead = await Lead.findOne({ leadgenId });
  if (!lead) {
    lead = await Lead.create({
      leadgenId,
      pageId,
      formId,
      crmSync: { status: 'PENDING', attempts: 0 },
      capiSync: { sent: false },
      retryCount: 0
    });
  }

  // 2. Fetch Lead details from Facebook Graph API if not already fetched
  let leadData = lead.leadData;
  if (!leadData || !leadData.fullName || !leadData.email || !leadData.phoneNumber) {
    try {
      const fbResponse = await FacebookService.fetchLeadDetails(leadgenId, pageId);
      const parsed = FacebookService.parseLeadFieldData(fbResponse.field_data);

      lead.rawGraphData = fbResponse;
      lead.leadData = {
        fullName: parsed.fullName,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        email: parsed.email,
        phoneNumber: parsed.phoneNumber,
        rawFormAnswers: parsed.rawAnswers
      };
      leadData = lead.leadData;
      await lead.save();

      await AuditLog.create({
        leadId: leadgenId,
        formId,
        action: 'GRAPH_FETCH',
        status: 'SUCCESS',
        details: { parsed }
      });
    } catch (err: any) {
      console.error(`[LeadWorker] Failed to fetch Graph API details for leadgenId ${leadgenId}:`, err.message);
      await AuditLog.create({
        leadId: leadgenId,
        formId,
        action: 'GRAPH_FETCH',
        status: 'ERROR',
        details: { error: err.message }
      });
      throw err; // Trigger BullMQ retry
    }
  }

  // 3. Resolve FormMapping for this formId (Project Name & Location)
  const mapping = await FormMapperService.getOrCreateMapping(formId, pageId);
  lead.projectName = mapping.projectName;
  lead.location = mapping.location;

  // Increment total leads count on mapping if first time
  if (job.attemptsMade === 0 && !isManualRetry) {
    await FormMapping.updateOne({ formId }, { $inc: { totalLeadsCount: 1 } });
  }

  // 4. Construct CRM payload
  const crmPayload = FormMapperService.buildCrmPayload(
    leadData,
    mapping,
    leadgenId,
    lead.createdAt || new Date()
  );
  lead.crmSync.requestPayload = crmPayload;

  // 5. Push to External CRM API
  lead.crmSync.attempts = (lead.crmSync.attempts || 0) + 1;
  const crmResult = await CrmService.pushLead(pageId, crmPayload);

  if (crmResult.success) {
    lead.crmSync.status = 'SYNCED';
    lead.crmSync.syncedAt = new Date();
    lead.crmSync.responsePayload = crmResult.data;
    lead.crmSync.crmLeadId = crmResult.data?.id || crmResult.data?.lead_id || undefined;
    lead.crmSync.errorMessage = undefined;

    // Increment synced counter on mapping
    await FormMapping.updateOne({ formId }, { $inc: { syncedLeadsCount: 1 } });

    await AuditLog.create({
      leadId: leadgenId,
      formId,
      action: 'CRM_DISPATCH',
      status: 'SUCCESS',
      details: { response: crmResult.data }
    });

    // 6. Conversions API Feedback Loop
    try {
      const capiResult = await CapiService.sendLeadEvent(
        pageId,
        leadgenId,
        leadData.email,
        leadData.phoneNumber
      );
      if (capiResult.sent) {
        lead.capiSync.sent = true;
        lead.capiSync.sentAt = new Date();
        lead.capiSync.fbtraceId = capiResult.fbtraceId;
        await AuditLog.create({
          leadId: leadgenId,
          formId,
          action: 'CAPI_DISPATCH',
          status: 'SUCCESS',
          details: { fbtraceId: capiResult.fbtraceId }
        });
      }
    } catch (capiErr: any) {
      console.warn(`[LeadWorker] CAPI feedback failed for ${leadgenId}:`, capiErr.message);
    }

    await lead.save();
    return { status: 'SYNCED', crmResult };
  } else {
    lead.crmSync.status = 'FAILED';
    lead.crmSync.errorMessage = crmResult.error;
    lead.retryCount = job.attemptsMade + 1;
    lead.lastError = crmResult.error;
    await lead.save();

    await AuditLog.create({
      leadId: leadgenId,
      formId,
      action: 'CRM_DISPATCH',
      status: 'ERROR',
      details: { error: crmResult.error }
    });

    throw new Error(`CRM Sync failed: ${crmResult.error}`);
  }
}

export function createLeadWorker(concurrency: number = 5): Worker<ILeadJobData> {
  const worker = new Worker<ILeadJobData>(
    LEAD_QUEUE_NAME,
    async (job) => {
      return await processLeadJob(job);
    },
    {
      connection: redisConnection,
      concurrency
    }
  );

  worker.on('completed', (job) => {
    console.log(`[LeadWorker] Job #${job.id} COMPLETED for leadgenId: ${job.data.leadgenId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[LeadWorker] Job #${job?.id} FAILED for leadgenId: ${job?.data.leadgenId}. Error: ${err.message}`);
  });

  return worker;
}
