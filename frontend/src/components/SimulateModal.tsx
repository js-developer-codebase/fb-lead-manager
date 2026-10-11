import React, { useState } from 'react';
import { X, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { ApiService } from '../services/api';
import { IAvailableForm } from '../types';

interface SimulateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableForms: IAvailableForm[];
  onLeadSimulated: () => void;
}

export const SimulateModal: React.FC<SimulateModalProps> = ({
  isOpen,
  onClose,
  availableForms,
  onLeadSimulated
}) => {
  const [formId, setFormId] = useState<string>(availableForms[0]?.id || '101123456789001');
  const [fullName, setFullName] = useState<string>('Priya Desai');
  const [email, setEmail] = useState<string>('priya.desai@example.com');
  const [phoneNumber, setPhoneNumber] = useState<string>('+919876543210');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    try {
      await ApiService.simulateLead({
        formId,
        fullName,
        email,
        phoneNumber
      });
      setSuccessMsg('Simulated lead enqueued! BullMQ worker is routing it to your CRM.');
      onLeadSimulated();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert('Simulation error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Simulate Incoming Lead</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-slate-500">
              Injects a mock Facebook Lead Ad submission into BullMQ without requiring live Meta ad spend.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Form ID</label>
              <select
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
              >
                {availableForms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center space-x-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{loading ? 'Dispatching...' : 'Dispatch Lead Event'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
