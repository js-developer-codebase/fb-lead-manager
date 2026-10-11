import axios from 'axios';
import { config } from '../config/environment.js';
import { PageSetting } from '../models/PageSetting.js';
import { CryptoService } from './crypto.service.js';

export interface IFacebookLeadResponse {
  id: string;
  created_time: string;
  ad_id?: string;
  form_id: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

export interface IParsedLeadData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  rawAnswers: Record<string, any>;
}

export interface IFacebookFormItem {
  id: string;
  name: string;
  status: string;
  leadgen_export_csv_url?: string;
}

export class FacebookService {
  private static readonly GRAPH_URL = `https://graph.facebook.com/${config.facebook.graphApiVersion}`;

  /**
   * Retrieves decrypted Page Access Token for a given pageId
   */
  public static async getPageAccessToken(pageId: string): Promise<string | null> {
    const pageSetting = await PageSetting.findOne({ pageId, isActive: true });
    if (!pageSetting) return null;

    try {
      return CryptoService.decrypt(
        pageSetting.encryptedAccessToken,
        pageSetting.iv,
        pageSetting.authTag
      );
    } catch (err) {
      console.error(`[FacebookService] Failed to decrypt token for pageId ${pageId}:`, err);
      return null;
    }
  }

  /**
   * Fetches full lead payload from Meta Graph API
   */
  public static async fetchLeadDetails(leadgenId: string, pageId: string): Promise<IFacebookLeadResponse> {
    const token = await this.getPageAccessToken(pageId);

    // If no token or running in local mock test
    if (!token || token.startsWith('mock_')) {
      console.warn(`[FacebookService] Using mock lead fetch for leadgenId: ${leadgenId}`);
      return {
        id: leadgenId,
        created_time: new Date().toISOString(),
        form_id: 'mock_form_101',
        field_data: [
          { name: 'full_name', values: ['Rahul Sharma'] },
          { name: 'email', values: ['rahul.sharma@example.com'] },
          { name: 'phone_number', values: ['+919876543210'] },
          { name: 'what_is_your_preferred_location?', values: ['Bangalore'] }
        ]
      };
    }

    const response = await axios.get<IFacebookLeadResponse>(`${this.GRAPH_URL}/${leadgenId}`, {
      params: {
        access_token: token,
        fields: 'id,created_time,ad_id,form_id,field_data'
      },
      timeout: 10000
    });

    return response.data;
  }

  /**
   * Fetches list of active lead generation forms for a Facebook Page
   */
  public static async fetchPageForms(pageId: string): Promise<IFacebookFormItem[]> {
    const token = await this.getPageAccessToken(pageId);

    if (!token || token.startsWith('mock_')) {
      return [
        { id: '101123456789001', name: 'Luxury Villas - Phase 1 Lead Ad Form', status: 'ACTIVE' },
        { id: '101123456789002', name: 'Premium Apartments - Festive Offer Form', status: 'ACTIVE' },
        { id: '101123456789003', name: 'Commercial Suites - Pre-launch Form', status: 'ACTIVE' }
      ];
    }

    const response = await axios.get<{ data: IFacebookFormItem[] }>(
      `${this.GRAPH_URL}/${pageId}/leadgen_forms`,
      {
        params: {
          access_token: token,
          fields: 'id,name,status',
          limit: 100
        },
        timeout: 10000
      }
    );

    return response.data.data || [];
  }

  /**
   * Parses raw Facebook field_data array into clean standardized object
   */
  public static parseLeadFieldData(fieldData: Array<{ name: string; values: string[] }>): IParsedLeadData {
    const rawAnswers: Record<string, any> = {};
    let fullName: string | undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;
    let email: string | undefined;
    let phoneNumber: string | undefined;

    for (const field of fieldData || []) {
      const key = field.name.trim();
      const val = field.values && field.values.length > 0 ? field.values[0] : '';
      rawAnswers[key] = val;

      const lowerKey = key.toLowerCase();
      if (lowerKey === 'full_name' || lowerKey === 'name') {
        fullName = val;
      } else if (lowerKey === 'first_name') {
        firstName = val;
      } else if (lowerKey === 'last_name') {
        lastName = val;
      } else if (lowerKey === 'email') {
        email = val;
      } else if (lowerKey === 'phone_number' || lowerKey === 'phone' || lowerKey === 'mobile') {
        phoneNumber = val;
      }
    }

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName || ''} ${lastName || ''}`.trim();
    }

    return {
      fullName,
      firstName,
      lastName,
      email,
      phoneNumber,
      rawAnswers
    };
  }
}
