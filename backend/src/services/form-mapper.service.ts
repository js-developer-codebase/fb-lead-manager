import { FormMapping, IFormMapping } from '../models/FormMapping.js';
import { ILead, ILeadData } from '../models/Lead.js';

export class FormMapperService {
  /**
   * Finds or creates a fallback FormMapping for an incoming formId
   */
  public static async getOrCreateMapping(formId: string, pageId: string): Promise<IFormMapping> {
    let mapping = await FormMapping.findOne({ formId });

    if (!mapping) {
      mapping = await FormMapping.create({
        formId,
        pageId,
        formName: `Auto-detected Form (${formId})`,
        projectName: `Unassigned Project (${formId})`,
        location: 'Default Location',
        targetFields: {
          projectNameField: 'project_name',
          locationField: 'location',
          fullNameField: 'name',
          phoneField: 'phone',
          emailField: 'email'
        },
        customQuestionMappings: [],
        isActive: true
      });
    }

    return mapping;
  }

  /**
   * Constructs the structured CRM payload using the form's mapped Project Name and Location
   */
  public static buildCrmPayload(
    leadData: ILeadData,
    mapping: IFormMapping,
    leadgenId: string,
    createdAt: Date
  ): Record<string, any> {
    const fields = mapping.targetFields || {
      projectNameField: 'project_name',
      locationField: 'location',
      fullNameField: 'name',
      phoneField: 'phone',
      emailField: 'email'
    };

    const payload: Record<string, any> = {
      // 1. Mapped Project Name & Location
      [fields.projectNameField || 'project_name']: mapping.projectName,
      [fields.locationField || 'location']: mapping.location,

      // 2. Lead Contact Info
      [fields.fullNameField || 'name']: leadData.fullName || '',
      [fields.phoneField || 'phone']: leadData.phoneNumber || '',
      [fields.emailField || 'email']: leadData.email || '',

      // 3. Metadata
      fb_form_id: mapping.formId,
      fb_leadgen_id: leadgenId,
      lead_timestamp: createdAt.toISOString()
    };

    // 4. Custom questionnaire answers
    if (mapping.customQuestionMappings && mapping.customQuestionMappings.length > 0) {
      for (const customQ of mapping.customQuestionMappings) {
        const answer = leadData.rawFormAnswers ? leadData.rawFormAnswers[customQ.fbQuestionKey] : undefined;
        if (answer !== undefined) {
          payload[customQ.crmFieldKey] = answer;
        }
      }
    }

    return payload;
  }

  /**
   * Generates a preview payload for testing/previewing in the Admin UI
   */
  public static generatePreview(
    projectName: string,
    location: string,
    targetFields?: Partial<IFormMapping['targetFields']>
  ): Record<string, any> {
    const fields = {
      projectNameField: targetFields?.projectNameField || 'project_name',
      locationField: targetFields?.locationField || 'location',
      fullNameField: targetFields?.fullNameField || 'name',
      phoneField: targetFields?.phoneField || 'phone',
      emailField: targetFields?.emailField || 'email'
    };

    return {
      [fields.projectNameField]: projectName || 'Green Meadows Villa',
      [fields.locationField]: location || 'East Bangalore - Sarjapur',
      [fields.fullNameField]: 'John Doe',
      [fields.phoneField]: '+919876543210',
      [fields.emailField]: 'johndoe@example.com',
      fb_form_id: '101123456789001',
      fb_leadgen_id: '998877665544332',
      lead_timestamp: new Date().toISOString()
    };
  }
}
