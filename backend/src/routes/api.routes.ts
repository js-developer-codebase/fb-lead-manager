import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';
import { FormMappingController } from '../controllers/form-mapping.controller.js';
import { LeadController } from '../controllers/lead.controller.js';
import { SettingController } from '../controllers/setting.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { AuthController } from '../controllers/auth.controller.js';
import { verifyFacebookSignature } from '../middlewares/signature.middleware.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// ==========================================
// 1. Facebook Webhook Handshake & Ingestion
// ==========================================
router.get('/webhooks/facebook', WebhookController.verifyWebhook);
router.post('/webhooks/facebook', verifyFacebookSignature, WebhookController.handleWebhook);

// ==========================================
// 2. Multi-Ad Form Mapping (Project Name & Location)
// ==========================================
router.get('/forms/available', FormMappingController.getAvailableForms);
router.get('/forms/mappings', FormMappingController.getMappings);
router.post('/forms/mappings', FormMappingController.saveMapping);
router.post('/forms/mappings/:formId/push-all', FormMappingController.pushAllLeadsForForm);
router.post('/forms/preview', FormMappingController.previewPayload);
router.delete('/forms/mappings/:formId', FormMappingController.deleteMapping);

// ==========================================
// 3. Leads Management & Retries
// ==========================================
router.get('/leads', LeadController.getLeads);
router.get('/leads/:id', LeadController.getLeadById);
router.post('/leads/:id/retry', LeadController.retryLead);
router.post('/leads/simulate', LeadController.simulateLead); // Dev & Testing lead generator

// ==========================================
// 4. Integrations & Settings
// ==========================================
router.get('/settings', SettingController.getSettings);
router.post('/settings/pages', SettingController.savePageSetting);
router.post('/settings/test-crm', SettingController.testCrm);

// ==========================================
// 5. Dashboard Metrics & Queue Status
// ==========================================
router.get('/dashboard/stats', DashboardController.getStats);

// ==========================================
// 6. Authentication
// ==========================================
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticateJwt, AuthController.getMe);

export default router;
