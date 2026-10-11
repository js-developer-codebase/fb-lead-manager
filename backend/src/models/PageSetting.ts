import mongoose, { Schema, Document } from 'mongoose';

export interface ICrmConfig {
  endpointUrl: string;
  authType: 'BEARER' | 'API_KEY' | 'BASIC' | 'NONE';
  encryptedApiKey?: string;
  apiKeyIv?: string;
  apiKeyAuthTag?: string;
  customHeaders?: Record<string, string>;
}

export interface IPageSetting extends Document {
  pageId: string;
  pageName: string;
  encryptedAccessToken: string;
  iv: string;
  authTag: string;
  metaPixelId?: string;
  capiAccessTokenEncrypted?: string;
  capiIv?: string;
  capiAuthTag?: string;
  crmConfig: ICrmConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PageSettingSchema: Schema = new Schema<IPageSetting>(
  {
    pageId: { type: String, required: true, unique: true, index: true },
    pageName: { type: String, required: true },
    encryptedAccessToken: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    metaPixelId: { type: String },
    capiAccessTokenEncrypted: { type: String },
    capiIv: { type: String },
    capiAuthTag: { type: String },
    crmConfig: {
      endpointUrl: { type: String, default: '' },
      authType: { type: String, enum: ['BEARER', 'API_KEY', 'BASIC', 'NONE'], default: 'NONE' },
      encryptedApiKey: { type: String },
      apiKeyIv: { type: String },
      apiKeyAuthTag: { type: String },
      customHeaders: { type: Schema.Types.Mixed, default: {} }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const PageSetting = mongoose.model<IPageSetting>('PageSetting', PageSettingSchema);
