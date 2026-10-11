import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Building2,
  MapPin,
  RefreshCw,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { ApiService } from '../services/api';
import { IDashboardStats } from '../types';

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto refresh every 15 seconds
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pipeline Analytics</h1>
          <p className="text-slate-600 text-sm mt-1">
            Real-time telemetry for Facebook Lead Ads ingestion, CRM delivery, and Meta CAPI.
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Leads</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats?.totalLeads ?? 0}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CRM Synced</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">{stats?.syncedLeads ?? 0}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta CAPI Sent</span>
            <div className="text-2xl font-extrabold text-purple-600 mt-0.5">{stats?.capiSentCount ?? 0}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CRM Success Rate</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{stats?.successRate ?? 100}%</div>
          </div>
        </div>
      </div>

      {/* Breakdown: Project Name & Location Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Leads by Project Name */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Leads by Project Name</h2>
          </div>

          {!stats?.projectStats || stats.projectStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No projects recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.projectStats.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800 truncate max-w-[240px]">{item.projectName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">
                      {item.count} leads
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads by Location [Place] */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <MapPin className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">Leads by Location [Place]</h2>
          </div>

          {!stats?.locationStats || stats.locationStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No locations recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.locationStats.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800 truncate max-w-[240px]">{item.location}</span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-bold text-xs rounded-full">
                      {item.count} leads
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BullMQ Queue Health Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-sm tracking-wide">BullMQ & Redis Engine Health</h3>
          </div>
          <span className="flex items-center space-x-1.5 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Worker Pool Online</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="p-3 bg-slate-800/80 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Active Jobs</span>
            <div className="text-xl font-bold text-white mt-1">{stats?.queue?.active ?? 0}</div>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Waiting In Queue</span>
            <div className="text-xl font-bold text-white mt-1">{stats?.queue?.waiting ?? 0}</div>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Completed Jobs</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">{stats?.queue?.completed ?? 0}</div>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Failed Retries</span>
            <div className="text-xl font-bold text-rose-400 mt-1">{stats?.queue?.failed ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
