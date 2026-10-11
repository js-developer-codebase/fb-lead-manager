import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomQuestionMapping {
  fbQuestionKey: string;
  crmFieldKey: string;
}

export interface ITargetFields {
  projectNameField: string;
  locationField: string;
  fullNameField: string;
  phoneField: string;
  emailField: string;
}

export interface IFormMapping extends Document {
  formId: string;
  pageId: string;
  formName?: string;
  projectName: string;
  location: string;
  targetFields: ITargetFields;
  customQuestionMappings: ICustomQuestionMapping[];
  totalLeadsCount: number;
  syncedLeadsCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FormMappingSchema: Schema = new Schema<IFormMapping>(
  {
    formId: { type: String, required: true, unique: true, index: true },
    pageId: { type: String, required: true, index: true },
    formName: { type: String, default: '' },
    projectName: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    targetFields: {
      projectNameField: { type: String, default: 'project_name' },
      locationField: { type: String, default: 'location' },
      fullNameField: { type: String, default: 'name' },
      phoneField: { type: String, default: 'phone' },
      emailField: { type: String, default: 'email' }
    },
    customQuestionMappings: [
      {
        fbQuestionKey: { type: String, required: true },
        crmFieldKey: { type: String, required: true }
      }
    ],
    totalLeadsCount: { type: Number, default: 0 },
    syncedLeadsCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const FormMapping = mongoose.model<IFormMapping>('FormMapping', FormMappingSchema);
