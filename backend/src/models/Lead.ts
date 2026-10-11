import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  rawFormAnswers: Record<string, any>;
}

export interface ICrmSync {
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  syncedAt?: Date;
  crmLeadId?: string;
  requestPayload?: Record<string, any>;
  responsePayload?: Record<string, any>;
  errorMessage?: string;
  attempts: number;
}

export interface ICapiSync {
  sent: boolean;
  sentAt?: Date;
  fbtraceId?: string;
  errorMessage?: string;
}

export interface ILead extends Document {
  leadgenId: string;
  pageId: string;
  formId: string;
  projectName?: string;
  location?: string;
  leadData: ILeadData;
  rawWebhookPayload?: Record<string, any>;
  rawGraphData?: Record<string, any>;
  crmSync: ICrmSync;
  capiSync: ICapiSync;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema = new Schema<ILead>(
  {
    leadgenId: { type: String, required: true, unique: true, index: true },
    pageId: { type: String, required: true, index: true },
    formId: { type: String, required: true, index: true },
    projectName: { type: String, index: true },
    location: { type: String, index: true },
    leadData: {
      fullName: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      email: { type: String, index: true },
      phoneNumber: { type: String, index: true },
      rawFormAnswers: { type: Schema.Types.Mixed, default: {} }
    },
    rawWebhookPayload: { type: Schema.Types.Mixed },
    rawGraphData: { type: Schema.Types.Mixed },
    crmSync: {
      status: {
        type: String,
        enum: ['PENDING', 'SYNCED', 'FAILED'],
        default: 'PENDING',
        index: true
      },
      syncedAt: { type: Date },
      crmLeadId: { type: String },
      requestPayload: { type: Schema.Types.Mixed },
      responsePayload: { type: Schema.Types.Mixed },
      errorMessage: { type: String },
      attempts: { type: Number, default: 0 }
    },
    capiSync: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      fbtraceId: { type: String },
      errorMessage: { type: String }
    },
    retryCount: { type: Number, default: 0 },
    lastError: { type: String }
  },
  { timestamps: true }
);

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
