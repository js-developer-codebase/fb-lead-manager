export interface IAvailableForm {
  id: string;
  name: string;
  pageId: string;
  status: string;
  isMapped?: boolean;
  projectName?: string | null;
  location?: string | null;
  totalLeadsCount?: number;
  syncedLeadsCount?: number;
}

export interface IFormMapping {
  _id?: string;
  formId: string;
  pageId: string;
  formName?: string;
  projectName: string;
  location: string;
  targetFields: {
    projectNameField: string;
    locationField: string;
    fullNameField: string;
    phoneField: string;
    emailField: string;
  };
  customQuestionMappings?: Array<{
    fbQuestionKey: string;
    crmFieldKey: string;
  }>;
  totalLeadsCount: number;
  syncedLeadsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ILead {
  _id: string;
  leadgenId: string;
  pageId: string;
  formId: string;
  projectName?: string;
  location?: string;
  leadData: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    rawFormAnswers: Record<string, any>;
  };
  crmSync: {
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    syncedAt?: string;
    crmLeadId?: string;
    requestPayload?: Record<string, any>;
    responsePayload?: Record<string, any>;
    errorMessage?: string;
    attempts: number;
  };
  capiSync: {
    sent: boolean;
    sentAt?: string;
    fbtraceId?: string;
    errorMessage?: string;
  };
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IDashboardStats {
  totalLeads: number;
  syncedLeads: number;
  failedLeads: number;
  pendingLeads: number;
  capiSentCount: number;
  successRate: number;
  projectStats: Array<{ projectName: string; count: number }>;
  locationStats: Array<{ location: string; count: number }>;
  queue: {
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  };
}

export interface IPageSetting {
  id: string;
  pageId: string;
  pageName: string;
  hasAccessToken: boolean;
  metaPixelId?: string;
  hasCapiToken: boolean;
  crmConfig: {
    endpointUrl: string;
    authType: 'BEARER' | 'API_KEY' | 'BASIC' | 'NONE';
    hasApiKey: boolean;
  };
  isActive: boolean;
  createdAt: string;
}
