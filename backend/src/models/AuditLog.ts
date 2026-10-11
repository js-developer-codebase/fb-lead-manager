import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  leadId?: string;
  formId?: string;
  action: 'WEBHOOK_RECEIVED' | 'GRAPH_FETCH' | 'FORM_MAPPED' | 'CRM_DISPATCH' | 'CAPI_DISPATCH' | 'MANUAL_RETRY';
  status: 'SUCCESS' | 'ERROR';
  details: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema<IAuditLog>(
  {
    leadId: { type: String, index: true },
    formId: { type: String, index: true },
    action: {
      type: String,
      enum: ['WEBHOOK_RECEIVED', 'GRAPH_FETCH', 'FORM_MAPPED', 'CRM_DISPATCH', 'CAPI_DISPATCH', 'MANUAL_RETRY'],
      required: true
    },
    status: { type: String, enum: ['SUCCESS', 'ERROR'], required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
