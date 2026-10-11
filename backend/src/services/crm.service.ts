import axios, { AxiosRequestConfig } from 'axios';
import { PageSetting } from '../models/PageSetting.js';
import { CryptoService } from './crypto.service.js';
import { config } from '../config/environment.js';

export interface ICrmDispatchResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
}

export class CrmService {
  /**
   * Pushes mapped lead payload to external CRM API
   */
  public static async pushLead(pageId: string, payload: Record<string, any>): Promise<ICrmDispatchResult> {
    const pageSetting = await PageSetting.findOne({ pageId, isActive: true });

    let endpointUrl = pageSetting?.crmConfig?.endpointUrl || config.crm.defaultEndpoint;
    const authType = pageSetting?.crmConfig?.authType || 'NONE';
    const customHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(pageSetting?.crmConfig?.customHeaders || {})
    };

    if (authType === 'BEARER' && pageSetting?.crmConfig?.encryptedApiKey) {
      const apiKey = CryptoService.decrypt(
        pageSetting.crmConfig.encryptedApiKey,
        pageSetting.crmConfig.apiKeyIv || '',
        pageSetting.crmConfig.apiKeyAuthTag || ''
      );
      customHeaders['Authorization'] = `Bearer ${apiKey}`;
    } else if (authType === 'API_KEY' && pageSetting?.crmConfig?.encryptedApiKey) {
      const apiKey = CryptoService.decrypt(
        pageSetting.crmConfig.encryptedApiKey,
        pageSetting.crmConfig.apiKeyIv || '',
        pageSetting.crmConfig.apiKeyAuthTag || ''
      );
      customHeaders['X-API-Key'] = apiKey;
    }

    // Default fallback if no endpoint configured
    if (!endpointUrl) {
      endpointUrl = 'https://httpbin.org/post';
    }

    try {
      const response = await axios.post(endpointUrl, payload, {
        headers: customHeaders,
        timeout: 10000
      });

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (err: any) {
      const errorMsg = err.response
        ? `CRM responded with HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err.message || 'Unknown network error';

      return {
        success: false,
        statusCode: err.response?.status,
        error: errorMsg
      };
    }
  }

  /**
   * Tests connection to the configured external CRM endpoint
   */
  public static async testConnection(
    endpointUrl: string,
    authType: string,
    apiKey?: string,
    customHeaders?: Record<string, string>
  ): Promise<ICrmDispatchResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders || {})
    };

    if (authType === 'BEARER' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authType === 'API_KEY' && apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const testPayload = {
      test_event: true,
      timestamp: new Date().toISOString(),
      message: 'Ping from Automated Facebook Lead Management Pipeline'
    };

    try {
      const response = await axios.post(endpointUrl, testPayload, {
        headers,
        timeout: 8000
      });

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: err.response?.status,
        error: err.response ? JSON.stringify(err.response.data) : err.message
      };
    }
  }
}
