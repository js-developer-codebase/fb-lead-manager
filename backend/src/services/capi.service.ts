import axios from 'axios';
import { PageSetting } from '../models/PageSetting.js';
import { CryptoService } from './crypto.service.js';
import { config } from '../config/environment.js';

export interface ICapiResult {
  sent: boolean;
  fbtraceId?: string;
  error?: string;
}

export class CapiService {
  private static readonly GRAPH_URL = `https://graph.facebook.com/${config.facebook.graphApiVersion}`;

  /**
   * Dispatches conversion event to Meta Conversions API
   */
  public static async sendLeadEvent(
    pageId: string,
    leadId: string,
    email?: string,
    phone?: string,
    eventTime: number = Math.floor(Date.now() / 1000)
  ): Promise<ICapiResult> {
    const pageSetting = await PageSetting.findOne({ pageId, isActive: true });
    if (!pageSetting || !pageSetting.metaPixelId) {
      // Pixel not configured
      return { sent: false, error: 'Meta Pixel ID not configured for this page' };
    }

    let capiToken: string | null = null;
    if (pageSetting.capiAccessTokenEncrypted) {
      try {
        capiToken = CryptoService.decrypt(
          pageSetting.capiAccessTokenEncrypted,
          pageSetting.capiIv || '',
          pageSetting.capiAuthTag || ''
        );
      } catch (err) {
        console.error('[CapiService] Failed to decrypt CAPI token:', err);
      }
    }

    if (!capiToken) {
      return { sent: false, error: 'Conversions API token not configured or decryption failed' };
    }

    const userData: Record<string, any> = {};

    if (email) {
      userData['em'] = [CryptoService.hashEmail(email)];
    }
    if (phone) {
      userData['ph'] = [CryptoService.hashPhone(phone)];
    }
    userData['lead_id'] = leadId;

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: eventTime,
          action_source: 'system_generated',
          user_data: userData
        }
      ]
    };

    try {
      const response = await axios.post(
        `${this.GRAPH_URL}/${pageSetting.metaPixelId}/events`,
        payload,
        {
          params: { access_token: capiToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 8000
        }
      );

      return {
        sent: true,
        fbtraceId: response.data?.fbtrace_id
      };
    } catch (err: any) {
      const errorMsg = err.response
        ? `CAPI Error ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err.message || 'CAPI Network error';

      return {
        sent: false,
        error: errorMsg
      };
    }
  }
}
