import { Request, Response } from 'express';
import { FormMapping } from '../models/FormMapping.js';
import { Lead } from '../models/Lead.js';
import { PageSetting } from '../models/PageSetting.js';
import { FacebookService } from '../services/facebook.service.js';
import { FormMapperService } from '../services/form-mapper.service.js';
import { leadQueue } from '../queues/queue.connection.js';

export class FormMappingController {
  /**
   * Returns list of all available Facebook Lead Ad forms
   * Combines forms from Meta Graph API + any forms discovered via incoming webhooks
   */
  public static async getAvailableForms(req: Request, res: Response): Promise<void> {
    try {
      const pageSettings = await PageSetting.find({ isActive: true });
      const availableFormsMap = new Map<string, { id: string; name: string; pageId: string; status: string }>();

      // 1. Fetch from Facebook Pages via Graph API
      for (const page of pageSettings) {
        try {
          const forms = await FacebookService.fetchPageForms(page.pageId);
          for (const f of forms) {
            availableFormsMap.set(f.id, {
              id: f.id,
              name: f.name || `Form ${f.id}`,
              pageId: page.pageId,
              status: f.status || 'ACTIVE'
            });
          }
        } catch (err: any) {
          console.warn(`[FormMappingController] Failed to fetch forms for page ${page.pageId}:`, err.message);
        }
      }

      // 2. Discover any additional forms from already captured leads in DB
      const dbFormIds = await Lead.distinct('formId');
      for (const formId of dbFormIds) {
        if (!availableFormsMap.has(formId)) {
          const sampleLead = await Lead.findOne({ formId });
          availableFormsMap.set(formId, {
            id: formId,
            name: `Discovered Form (${formId})`,
            pageId: sampleLead?.pageId || (pageSettings[0]?.pageId ?? 'default_page'),
            status: 'ACTIVE'
          });
        }
      }

      // If no pages connected yet, return mock choices so user can test right away
      if (availableFormsMap.size === 0) {
        availableFormsMap.set('101123456789001', {
          id: '101123456789001',
          name: 'Luxury Villas - Phase 1 Lead Ad Form',
          pageId: 'default_page_id',
          status: 'ACTIVE'
        });
        availableFormsMap.set('101123456789002', {
          id: '101123456789002',
          name: 'Premium Apartments - Festive Offer Form',
          pageId: 'default_page_id',
          status: 'ACTIVE'
        });
        availableFormsMap.set('101123456789003', {
          id: '101123456789003',
          name: 'Commercial Suites - Pre-launch Form',
          pageId: 'default_page_id',
          status: 'ACTIVE'
        });
      }

      // 3. Match with existing mappings
      const existingMappings = await FormMapping.find();
      const mappingsMap = new Map(existingMappings.map((m) => [m.formId, m]));

      const result = Array.from(availableFormsMap.values()).map((form) => {
        const mapping = mappingsMap.get(form.id);
        return {
          ...form,
          isMapped: !!mapping,
          projectName: mapping?.projectName || null,
          location: mapping?.location || null,
          totalLeadsCount: mapping?.totalLeadsCount || 0,
          syncedLeadsCount: mapping?.syncedLeadsCount || 0
        };
      });

      res.json({ success: true, count: result.length, forms: result });
    } catch (err: any) {
      console.error('[FormMappingController] Error fetching available forms:', err);
      res.status(500).json({ error: 'Failed to fetch available forms', message: err.message });
    }
  }

  /**
   * Returns all active configured Form Mappings
   */
  public static async getMappings(req: Request, res: Response): Promise<void> {
    try {
      const mappings = await FormMapping.find().sort({ updatedAt: -1 });
      res.json({ success: true, mappings });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch mappings', message: err.message });
    }
  }

  /**
   * Save or update mapping for a Form ID (Assign Project Name and Location)
   * Optionally triggers bulk push of existing leads to external CRM
   */
  public static async saveMapping(req: Request, res: Response): Promise<void> {
    try {
      const {
        formId,
        pageId = 'default_page_id',
        formName,
        projectName,
        location,
        targetFields,
        customQuestionMappings = [],
        pushExisting = false
      } = req.body;

      if (!formId || !projectName || !location) {
        res.status(400).json({
          error: 'Missing required fields: formId, projectName, and location are required.'
        });
        return;
      }

      const mapping = await FormMapping.findOneAndUpdate(
        { formId },
        {
          formId,
          pageId,
          formName: formName || `Form ${formId}`,
          projectName: projectName.trim(),
          location: location.trim(),
          targetFields: targetFields || {
            projectNameField: 'project_name',
            locationField: 'location',
            fullNameField: 'name',
            phoneField: 'phone',
            emailField: 'email'
          },
          customQuestionMappings,
          isActive: true
        },
        { upsert: true, new: true }
      );

      // Update all existing leads with this formId with the updated projectName and location
      await Lead.updateMany(
        { formId },
        {
          $set: {
            projectName: mapping.projectName,
            location: mapping.location
          }
        }
      );

      let enqueuedCount = 0;
      if (pushExisting) {
        // Enqueue all matching leads that are either PENDING or FAILED, or all
        const leads = await Lead.find({ formId });
        for (const lead of leads) {
          await leadQueue.add(
            `lead-${lead.leadgenId}-${Date.now()}`,
            {
              leadgenId: lead.leadgenId,
              formId: lead.formId,
              pageId: lead.pageId,
              isManualRetry: true
            }
          );
          enqueuedCount++;
        }
      }

      res.json({
        success: true,
        message: 'Form mapped successfully',
        mapping,
        enqueuedForCrm: enqueuedCount
      });
    } catch (err: any) {
      console.error('[FormMappingController] Error saving mapping:', err);
      res.status(500).json({ error: 'Failed to save mapping', message: err.message });
    }
  }

  /**
   * Bulk push all leads for a specific form_id to the CRM
   */
  public static async pushAllLeadsForForm(req: Request, res: Response): Promise<void> {
    try {
      const { formId } = req.params;
      const mapping = await FormMapping.findOne({ formId });

      if (!mapping) {
        res.status(404).json({ error: 'Form mapping not found. Please map this form first.' });
        return;
      }

      const leads = await Lead.find({ formId });
      let count = 0;

      for (const lead of leads) {
        await leadQueue.add(
          `lead-${lead.leadgenId}-${Date.now()}`,
          {
            leadgenId: lead.leadgenId,
            formId: lead.formId,
            pageId: lead.pageId,
            isManualRetry: true
          }
        );
        count++;
      }

      res.json({
        success: true,
        message: `Successfully queued ${count} leads for CRM dispatch.`,
        enqueuedCount: count
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to push leads', message: err.message });
    }
  }

  /**
   * Previews the JSON payload that will be sent to the CRM
   */
  public static previewPayload(req: Request, res: Response): void {
    const { projectName, location, targetFields } = req.body;
    const preview = FormMapperService.generatePreview(projectName, location, targetFields);
    res.json({ success: true, payload: preview });
  }

  /**
   * Delete a Form Mapping
   */
  public static async deleteMapping(req: Request, res: Response): Promise<void> {
    try {
      const { formId } = req.params;
      await FormMapping.findOneAndDelete({ formId });
      res.json({ success: true, message: 'Mapping deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete mapping', message: err.message });
    }
  }
}
