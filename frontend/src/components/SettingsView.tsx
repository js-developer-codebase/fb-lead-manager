import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Key, Globe, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ApiService } from '../services/api';
import { IPageSetting } from '../types';

export const SettingsView: React.FC = () => {
  const [pages, setPages] = useState<IPageSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inputs
  const [pageId, setPageId] = useState<string>('default_page_id');
  const [pageName, setPageName] = useState<string>('Homestore Main FB Page');
  const [accessToken, setAccessToken] = useState<string>('');
  const [metaPixelId, setMetaPixelId] = useState<string>('');
  const [capiAccessToken, setCapiAccessToken] = useState<string>('');

  // CRM Inputs
  const [crmEndpointUrl, setCrmEndpointUrl] = useState<string>('https://httpbin.org/post');
  const [crmAuthType, setCrmAuthType] = useState<'NONE' | 'BEARER' | 'API_KEY'>('NONE');
  const [crmApiKey, setCrmApiKey] = useState<string>('');
  const [testingCrm, setTestingCrm] = useState<boolean>(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getSettings();
      setPages(data);
      if (data.length > 0) {
        const p = data[0];
        setPageId(p.pageId);
        setPageName(p.pageName);
        setMetaPixelId(p.metaPixelId || '');
        if (p.crmConfig?.endpointUrl) {
          setCrmEndpointUrl(p.crmConfig.endpointUrl);
        }
        if (p.crmConfig?.authType) {
          setCrmAuthType(p.crmConfig.authType as any);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await ApiService.savePageSetting({
        pageId,
        pageName,
        accessToken: accessToken || undefined,
        metaPixelId: metaPixelId || undefined,
        capiAccessToken: capiAccessToken || undefined,
        crmEndpointUrl,
        crmAuthType,
        crmApiKey: crmApiKey || undefined
      });
      setMsg({ type: 'success', text: 'Settings encrypted and saved successfully!' });
      await loadSettings();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Error saving settings: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestCrm = async () => {
    setTestingCrm(true);
    try {
      const res = await ApiService.testCrm({
        endpointUrl: crmEndpointUrl,
        authType: crmAuthType,
        apiKey: crmApiKey || undefined
      });
      if (res.success) {
        alert('CRM Test Successful! Status Code: ' + res.statusCode);
      } else {
        alert('CRM Test Failed: ' + (res.error || 'Check endpoint and credentials'));
      }
    } catch (err: any) {
      alert('CRM Test Network Error: ' + err.message);
    } finally {
      setTestingCrm(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Integrations</h1>
        <p className="text-slate-600 text-sm mt-1">
          Configure Facebook Page Access Tokens (AES-256 encrypted at rest) and target CRM endpoints.
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 border ${
            msg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Facebook Page Credentials */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Facebook Page & Graph API Credentials</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Facebook Page ID
              </label>
              <input
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Page Friendly Name
              </label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Page Access Token (Long-lived)
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={pages[0]?.hasAccessToken ? '•••••••••••••••• (Encrypted in DB, enter to update)' : 'EAABsbCS1...'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Required by BullMQ worker to call Graph API <code>GET /{'{leadgen_id}'}</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Meta Pixel ID (For Conversions API)
              </label>
              <input
                type="text"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Conversions API Access Token
              </label>
              <input
                type="password"
                value={capiAccessToken}
                onChange={(e) => setCapiAccessToken(e.target.value)}
                placeholder="Optional CAPI System User Token"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* External CRM API Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <Globe className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Target External CRM Endpoint</h2>
            </div>
            <button
              type="button"
              onClick={handleTestCrm}
              disabled={testingCrm}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${testingCrm ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              CRM Webhook / REST POST URL
            </label>
            <input
              type="url"
              value={crmEndpointUrl}
              onChange={(e) => setCrmEndpointUrl(e.target.value)}
              placeholder="https://api.yourcrm.com/v1/leads"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Authentication Scheme
              </label>
              <select
                value={crmAuthType}
                onChange={(e) => setCrmAuthType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800"
              >
                <option value="NONE">No Auth / Public Webhook</option>
                <option value="BEARER">Bearer Token (Authorization Header)</option>
                <option value="API_KEY">API Key (X-API-Key Header)</option>
              </select>
            </div>

            {crmAuthType !== 'NONE' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  CRM Secret Key / Token
                </label>
                <input
                  type="password"
                  value={crmApiKey}
                  onChange={(e) => setCrmApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-800"
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          {saving ? 'Encrypting & Saving...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
};
