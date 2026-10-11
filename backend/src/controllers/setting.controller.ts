import { Request, Response } from 'express';
import { PageSetting } from '../models/PageSetting.js';
import { CryptoService } from '../services/crypto.service.js';
import { CrmService } from '../services/crm.service.js';
import { FacebookService } from '../services/facebook.service.js';

export class SettingController {
  /**
   * Retrieves all connected Facebook Pages and general settings
   */
  public static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const pages = await PageSetting.find().select('-iv -authTag -capiIv -capiAuthTag');
      // Obfuscate token for security in UI
      const safePages = pages.map((p) => ({
        id: p._id,
        pageId: p.pageId,
        pageName: p.pageName,
        hasAccessToken: !!p.encryptedAccessToken,
        metaPixelId: p.metaPixelId,
        hasCapiToken: !!p.capiAccessTokenEncrypted,
        crmConfig: {
          endpointUrl: p.crmConfig?.endpointUrl,
          authType: p.crmConfig?.authType,
          hasApiKey: !!p.crmConfig?.encryptedApiKey
        },
        isActive: p.isActive,
        createdAt: p.createdAt
      }));

      res.json({ success: true, pages: safePages });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch settings', message: err.message });
    }
  }

  /**
   * Saves or updates a Facebook Page connection and CRM configuration
   */
  public static async savePageSetting(req: Request, res: Response): Promise<void> {
    try {
      const {
        pageId,
        pageName,
        accessToken,
        metaPixelId,
        capiAccessToken,
        crmEndpointUrl,
        crmAuthType = 'NONE',
        crmApiKey,
        customHeaders
      } = req.body;

      if (!pageId || !pageName) {
        res.status(400).json({ error: 'pageId and pageName are required' });
        return;
      }

      let existing = await PageSetting.findOne({ pageId });
      let encryptedToken = existing?.encryptedAccessToken || '';
      let iv = existing?.iv || '';
      let authTag = existing?.authTag || '';

      if (accessToken) {
        const encrypted = CryptoService.encrypt(accessToken);
        encryptedToken = encrypted.ciphertext;
        iv = encrypted.iv;
        authTag = encrypted.authTag;
      }

      let capiEncrypted = existing?.capiAccessTokenEncrypted;
      let capiIv = existing?.capiIv;
      let capiAuthTag = existing?.capiAuthTag;

      if (capiAccessToken) {
        const encrypted = CryptoService.encrypt(capiAccessToken);
        capiEncrypted = encrypted.ciphertext;
        capiIv = encrypted.iv;
        capiAuthTag = encrypted.authTag;
      }

      let crmApiKeyEncrypted = existing?.crmConfig?.encryptedApiKey;
      let apiKeyIv = existing?.crmConfig?.apiKeyIv;
      let apiKeyAuthTag = existing?.crmConfig?.apiKeyAuthTag;

      if (crmApiKey) {
        const encrypted = CryptoService.encrypt(crmApiKey);
        crmApiKeyEncrypted = encrypted.ciphertext;
        apiKeyIv = encrypted.iv;
        apiKeyAuthTag = encrypted.authTag;
      }

      const updated = await PageSetting.findOneAndUpdate(
        { pageId },
        {
          pageId,
          pageName,
          encryptedAccessToken: encryptedToken,
          iv,
          authTag,
          metaPixelId,
          capiAccessTokenEncrypted: capiEncrypted,
          capiIv,
          capiAuthTag,
          crmConfig: {
            endpointUrl: crmEndpointUrl || '',
            authType: crmAuthType,
            encryptedApiKey: crmApiKeyEncrypted,
            apiKeyIv,
            apiKeyAuthTag,
            customHeaders: customHeaders || {}
          },
          isActive: true
        },
        { upsert: true, new: true }
      );

      res.json({ success: true, message: 'Settings saved successfully', page: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save page setting', message: err.message });
    }
  }

  /**
   * Tests external CRM connection
   */
  public static async testCrm(req: Request, res: Response): Promise<void> {
    try {
      const { endpointUrl, authType, apiKey, customHeaders } = req.body;
      const result = await CrmService.testConnection(endpointUrl, authType, apiKey, customHeaders);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
