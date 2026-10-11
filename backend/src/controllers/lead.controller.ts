import { Request, Response } from 'express';
import { Lead } from '../models/Lead.js';
import { FormMapping } from '../models/FormMapping.js';
import { leadQueue } from '../queues/queue.connection.js';

export class LeadController {
  /**
   * Returns paginated and filtered list of leads
   */
  public static async getLeads(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const status = req.query.status as string;
      const formId = req.query.formId as string;
      const projectName = req.query.projectName as string;
      const location = req.query.location as string;
      const search = req.query.search as string;

      const filter: Record<string, any> = {};

      if (status && status !== 'ALL') {
        filter['crmSync.status'] = status;
      }
      if (formId) {
        filter['formId'] = formId;
      }
      if (projectName) {
        filter['projectName'] = { $regex: projectName, $options: 'i' };
      }
      if (location) {
        filter['location'] = { $regex: location, $options: 'i' };
      }
      if (search) {
        filter.$or = [
          { 'leadData.fullName': { $regex: search, $options: 'i' } },
          { 'leadData.email': { $regex: search, $options: 'i' } },
          { 'leadData.phoneNumber': { $regex: search, $options: 'i' } },
          { leadgenId: { $regex: search, $options: 'i' } }
        ];
      }

      const total = await Lead.countDocuments(filter);
      const leads = await Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        success: true,
        data: leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch leads', message: err.message });
    }
  }

  /**
   * Returns a single lead by ID or leadgenId
   */
  public static async getLeadById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lead = (await Lead.findById(id)) || (await Lead.findOne({ leadgenId: id }));

      if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      res.json({ success: true, lead });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch lead', message: err.message });
    }
  }

  /**
   * Retries pushing a specific lead to the CRM
   */
  public static async retryLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lead = (await Lead.findById(id)) || (await Lead.findOne({ leadgenId: id }));

      if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      // Re-queue the job in BullMQ
      await leadQueue.add(
        `retry-${lead.leadgenId}-${Date.now()}`,
        {
          leadgenId: lead.leadgenId,
          formId: lead.formId,
          pageId: lead.pageId,
          isManualRetry: true
        }
      );

      lead.crmSync.status = 'PENDING';
      await lead.save();

      res.json({ success: true, message: 'Lead re-queued for CRM dispatch', leadId: lead.leadgenId });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retry lead', message: err.message });
    }
  }

  /**
   * Helper endpoint for development/testing:
   * Simulates an incoming Facebook lead submission for any Form ID
   */
  public static async simulateLead(req: Request, res: Response): Promise<void> {
    try {
      const {
        formId = '101123456789001',
        pageId = 'default_page_id',
        fullName = 'Test Lead ' + Math.floor(Math.random() * 1000),
        email = `testlead${Math.floor(Math.random() * 10000)}@example.com`,
        phoneNumber = '+9198765' + Math.floor(10000 + Math.random() * 90000),
        customAnswers = {}
      } = req.body;

      const leadgenId = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Check if mapping exists
      const mapping = await FormMapping.findOne({ formId });

      const lead = await Lead.create({
        leadgenId,
        pageId,
        formId,
        projectName: mapping?.projectName || 'Unassigned Project',
        location: mapping?.location || 'Unassigned Location',
        leadData: {
          fullName,
          email,
          phoneNumber,
          rawFormAnswers: customAnswers
        },
        rawWebhookPayload: { simulated: true, created_time: new Date().toISOString() },
        rawGraphData: { simulated: true },
        crmSync: { status: 'PENDING', attempts: 0 },
        capiSync: { sent: false },
        retryCount: 0
      });

      // Enqueue in BullMQ
      await leadQueue.add(`sim-lead-${leadgenId}`, {
        leadgenId,
        formId,
        pageId
      });

      res.json({
        success: true,
        message: 'Simulated lead created and enqueued successfully',
        lead
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to simulate lead', message: err.message });
    }
  }
}
