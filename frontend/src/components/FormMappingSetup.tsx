import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Building2,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ArrowRight,
  Trash2,
  Eye,
  Check,
  ChevronDown
} from 'lucide-react';
import { ApiService } from '../services/api';
import { IAvailableForm, IFormMapping } from '../types';

export const FormMappingSetup: React.FC = () => {
  const [availableForms, setAvailableForms] = useState<IAvailableForm[]>([]);
  const [mappings, setMappings] = useState<IFormMapping[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form inputs
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [pushExisting, setPushExisting] = useState<boolean>(true);

  // Target CRM Field Mapping keys
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [targetFields, setTargetFields] = useState({
    projectNameField: 'project_name',
    locationField: 'location',
    fullNameField: 'name',
    phoneField: 'phone',
    emailField: 'email'
  });

  // Real-time Preview JSON
  const [livePreview, setLivePreview] = useState<Record<string, any>>({});

  // Load forms and mappings
  const loadData = async () => {
    setLoading(true);
    try {
      const [formsData, mappingsData] = await Promise.all([
        ApiService.getAvailableForms(),
        ApiService.getMappings()
      ]);
      setAvailableForms(formsData);
      setMappings(mappingsData);

      // Auto-select first form if none selected
      if (!selectedFormId && formsData.length > 0) {
        handleSelectForm(formsData[0].id, formsData, mappingsData);
      }
    } catch (err: any) {
      console.error('Failed to load form data:', err);
      setStatusMessage({ type: 'error', text: 'Failed to fetch Facebook forms: ' + (err.message || 'Error') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update preview whenever inputs change
  useEffect(() => {
    setLivePreview({
      [targetFields.projectNameField || 'project_name']: projectName || 'Godrej Palm Retreat',
      [targetFields.locationField || 'location']: location || 'Bangalore - Sarjapur Road',
      [targetFields.fullNameField || 'name']: 'Rohan Sharma',
      [targetFields.phoneField || 'phone']: '+919876543210',
      [targetFields.emailField || 'email']: 'rohan.sharma@example.com',
      fb_form_id: selectedFormId || '101123456789001',
      fb_leadgen_id: 'sample_leadgen_9921',
      lead_timestamp: new Date().toISOString()
    });
  }, [selectedFormId, projectName, location, targetFields]);

  const handleSelectForm = (
    formId: string,
    formsList: IAvailableForm[] = availableForms,
    mappingsList: IFormMapping[] = mappings
  ) => {
    setSelectedFormId(formId);
    const existing = mappingsList.find((m) => m.formId === formId);
    const formMeta = formsList.find((f) => f.id === formId);

    if (existing) {
      setProjectName(existing.projectName);
      setLocation(existing.location);
      if (existing.targetFields) {
        setTargetFields(existing.targetFields);
      }
    } else if (formMeta?.projectName || formMeta?.location) {
      setProjectName(formMeta.projectName || '');
      setLocation(formMeta.location || '');
    } else {
      // Default placeholder based on form name
      setProjectName(formMeta?.name?.replace(/Lead Ad Form|Form/gi, '').trim() || 'New Project');
      setLocation('Bengaluru');
    }
  };

  const handleSaveAndPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormId || !projectName.trim() || !location.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select a Form ID and enter both Project Name and Location.' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    const formMeta = availableForms.find((f) => f.id === selectedFormId);

    try {
      const response = await ApiService.saveMapping({
        formId: selectedFormId,
        pageId: formMeta?.pageId || 'default_page_id',
        formName: formMeta?.name,
        projectName: projectName.trim(),
        location: location.trim(),
        targetFields,
        pushExisting
      });

      setStatusMessage({
        type: 'success',
        text: `Mapping saved! ${response.enqueuedForCrm > 0 ? `Queued ${response.enqueuedForCrm} existing leads for CRM push.` : 'Ready to capture and route incoming leads.'}`
      });

      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to save mapping: ' + (err.response?.data?.error || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const handlePushAll = async (formId: string) => {
    try {
      const res = await ApiService.pushAllLeadsForForm(formId);
      setStatusMessage({ type: 'success', text: res.message || `Successfully queued ${res.enqueuedCount} leads for CRM.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error pushing leads: ' + err.message });
    }
  };

  const handleDeleteMapping = async (formId: string) => {
    if (!confirm('Are you sure you want to remove this form mapping?')) return;
    try {
      await ApiService.deleteMapping(formId);
      setStatusMessage({ type: 'success', text: 'Form mapping removed successfully.' });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Error deleting mapping: ' + err.message });
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facebook Ad Form to CRM Setup</h1>
        <p className="text-slate-600 text-sm mt-1">
          Select an ad form, assign its <strong>Project Name</strong> and <strong>Location [Place]</strong>, and push all leads to your external CRM.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Configuration */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Layers className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Map Facebook Form</h2>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1.5 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Forms</span>
            </button>
          </div>

          <form onSubmit={handleSaveAndPush} className="space-y-5">
            {/* 1. Facebook Form ID Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Facebook Ad / Lead Form <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedFormId}
                  onChange={(e) => handleSelectForm(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>-- Select a Lead Ad Form --</option>
                  {availableForms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.name} (Form ID: {form.id}) {form.isMapped ? '✓ Mapped' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Form IDs correspond to the Lead Ads configured in Meta Ads Manager.
              </p>
            </div>

            {/* 2. Project Name & Location Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Godrej Palm Retreat"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <span className="text-xs text-slate-400 mt-1 block">Injected into CRM as project/ad name</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Location [Place] <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bangalore - Sarjapur"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <span className="text-xs text-slate-400 mt-1 block">Injected into CRM as property city/location</span>
              </div>
            </div>

            {/* 3. Automatic Bulk Push Checkbox */}
            <div className="pt-2">
              <label className="relative flex items-start space-x-3 cursor-pointer p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors">
                <input
                  type="checkbox"
                  checked={pushExisting}
                  onChange={(e) => setPushExisting(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-blue-900 block">
                    Push all leads from this form to CRM immediately
                  </span>
                  <span className="text-blue-700/80">
                    Maps existing un-synced and pending leads for this form and dispatches them into the BullMQ queue.
                  </span>
                </div>
              </label>
            </div>

            {/* 4. Advanced Target CRM Field Names Collapsible */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center space-x-1"
              >
                <span>{showAdvanced ? 'Hide CRM Field Key Customization' : 'Customize CRM Field Property Names'}</span>
                <ChevronDown className={`h-3 w-3 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-600 block mb-1">Project Name Key</label>
                    <input
                      type="text"
                      value={targetFields.projectNameField}
                      onChange={(e) => setTargetFields({ ...targetFields, projectNameField: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Location Key</label>
                    <input
                      type="text"
                      value={targetFields.locationField}
                      onChange={(e) => setTargetFields({ ...targetFields, locationField: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Full Name Key</label>
                    <input
                      type="text"
                      value={targetFields.fullNameField}
                      onChange={(e) => setTargetFields({ ...targetFields, fullNameField: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Phone Key</label>
                    <input
                      type="text"
                      value={targetFields.phoneField}
                      onChange={(e) => setTargetFields({ ...targetFields, phoneField: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Mapping & Pushing to CRM...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Save Mapping & Push Leads to CRM</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Preview Pane: Real-time CRM Payload View */}
        <div className="lg:col-span-5 bg-slate-900 text-slate-200 p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileCode className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Live Outgoing CRM Payload
                </span>
              </div>
              <span className="bg-emerald-950 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-800 font-mono">
                application/json
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3 mb-4 leading-relaxed">
              Every lead generated by Facebook Form <strong>{selectedFormId || '(none)'}</strong> will automatically be augmented with your assigned Project Name and Location:
            </p>

            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800/80 leading-relaxed max-h-[380px]">
              {JSON.stringify(livePreview, null, 2)}
            </pre>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>BullMQ 5-Stage Retries</span>
            </span>
            <span>Meta CAPI Hashing Active</span>
          </div>
        </div>
      </div>

      {/* Configured Form Mappings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Active Form to CRM Mappings</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
            {mappings.length} Configured
          </span>
        </div>

        {mappings.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Layers className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm">No form mappings configured yet. Select a Facebook form above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Facebook Form ID</th>
                  <th className="px-6 py-3.5 font-bold">Project Name</th>
                  <th className="px-6 py-3.5 font-bold">Location [Place]</th>
                  <th className="px-6 py-3.5 font-bold">Leads Synced</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappings.map((m) => (
                  <tr key={m.formId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
                      {m.formId}
                      <span className="block text-[11px] font-sans text-slate-400">{m.formName}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                        <span>{m.projectName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        <span>{m.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium">
                      <span className="text-emerald-600 font-bold">{m.syncedLeadsCount}</span> / {m.totalLeadsCount}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Sync
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handlePushAll(m.formId)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-medium transition-colors"
                        title="Push all leads belonging to this form into CRM queue"
                      >
                        Push All Now
                      </button>
                      <button
                        onClick={() => handleDeleteMapping(m.formId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete mapping"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
