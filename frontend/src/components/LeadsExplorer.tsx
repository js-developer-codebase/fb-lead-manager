import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Building2,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RotateCw,
  X,
  FileCode
} from 'lucide-react';
import { ApiService } from '../services/api';
import { ILead } from '../types';

export const LeadsExplorer: React.FC = () => {
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getLeads({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        projectName: projectFilter || undefined,
        location: locationFilter || undefined
      });
      setLeads(res.data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, projectFilter, locationFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleRetryLead = async (id: string) => {
    setRetryingId(id);
    try {
      await ApiService.retryLead(id);
      await fetchLeads();
      if (selectedLead && (selectedLead._id === id || selectedLead.leadgenId === id)) {
        const updated = await ApiService.getLeadById(id);
        setSelectedLead(updated);
      }
    } catch (err: any) {
      alert('Retry error: ' + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads Explorer</h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time feed of leads captured from Facebook Lead Ads and routed to external CRM.
          </p>
        </div>
        <button
          onClick={fetchLeads}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone number..."
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>

        {/* Project Name Filter */}
        <div className="w-full md:w-48">
          <input
            type="text"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            placeholder="Filter by Project..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Location Filter */}
        <div className="w-full md:w-48">
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="Filter by Location..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="SYNCED">✓ Synced CRM</option>
            <option value="PENDING">⏳ Pending / In Queue</option>
            <option value="FAILED">✕ Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin mb-2" />
            <span className="text-sm">Loading leads...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-medium">No leads found matching criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting filters or simulate a lead using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Lead Contact</th>
                  <th className="px-6 py-3.5 font-bold">Project Name</th>
                  <th className="px-6 py-3.5 font-bold">Location [Place]</th>
                  <th className="px-6 py-3.5 font-bold">Facebook Form ID</th>
                  <th className="px-6 py-3.5 font-bold">CRM Status</th>
                  <th className="px-6 py-3.5 font-bold">Captured</th>
                  <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{lead.leadData.fullName || 'Anonymous'}</div>
                      <div className="text-xs text-slate-500">{lead.leadData.email || 'No Email'}</div>
                      <div className="text-xs text-slate-400">{lead.leadData.phoneNumber || 'No Phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-900">
                        <Building2 className="h-3.5 w-3.5 text-blue-500" />
                        <span>{lead.projectName || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-rose-500" />
                        <span>{lead.location || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{lead.formId}</td>
                    <td className="px-6 py-4">
                      {lead.crmSync.status === 'SYNCED' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          <span>Synced</span>
                        </span>
                      ) : lead.crmSync.status === 'FAILED' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View payload and sync details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {lead.crmSync.status !== 'SYNCED' && (
                        <button
                          onClick={() => handleRetryLead(lead._id)}
                          disabled={retryingId === lead._id}
                          className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-semibold transition-colors"
                          title="Retry CRM Dispatch"
                        >
                          {retryingId === lead._id ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Lead Details & CRM Sync</h3>
                <span className="text-xs font-mono text-slate-500">ID: {selectedLead.leadgenId}</span>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-400 block">Mapped Project</span>
                  <span className="font-semibold text-slate-800">{selectedLead.projectName || 'None'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-400 block">Mapped Location</span>
                  <span className="font-semibold text-slate-800">{selectedLead.location || 'None'}</span>
                </div>
              </div>

              {/* CRM Payload Dispatched */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <FileCode className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    CRM Dispatched Payload
                  </span>
                </div>
                <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedLead.crmSync.requestPayload || {}, null, 2)}
                </pre>
              </div>

              {/* CRM Response */}
              <div>
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block mb-2">
                  CRM Response & Log
                </span>
                <div className="p-3.5 bg-slate-50 rounded-xl text-xs font-mono border border-slate-200">
                  {selectedLead.crmSync.errorMessage ? (
                    <span className="text-rose-600 font-semibold">{selectedLead.crmSync.errorMessage}</span>
                  ) : (
                    <span className="text-slate-700">
                      {JSON.stringify(selectedLead.crmSync.responsePayload || 'Awaiting response', null, 2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Attempts: {selectedLead.crmSync.attempts}
              </span>
              <button
                onClick={() => handleRetryLead(selectedLead._id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-1.5"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Retry CRM Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
