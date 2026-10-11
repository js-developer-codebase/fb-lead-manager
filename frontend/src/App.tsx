import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FormMappingSetup } from './components/FormMappingSetup';
import { LeadsExplorer } from './components/LeadsExplorer';
import { DashboardOverview } from './components/DashboardOverview';
import { SettingsView } from './components/SettingsView';
import { SimulateModal } from './components/SimulateModal';
import { ApiService } from './services/api';
import { IAvailableForm } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mapping' | 'leads' | 'dashboard' | 'settings'>('mapping');
  const [isSimulateOpen, setIsSimulateOpen] = useState<boolean>(false);
  const [availableForms, setAvailableForms] = useState<IAvailableForm[]>([]);

  const loadForms = async () => {
    try {
      const forms = await ApiService.getAvailableForms();
      setAvailableForms(forms);
    } catch (err) {
      console.warn('Could not load available forms for modal:', err);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSimulateModal={() => setIsSimulateOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'mapping' && <FormMappingSetup />}
        {activeTab === 'leads' && <LeadsExplorer />}
        {activeTab === 'dashboard' && <DashboardOverview />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 Automated Facebook Lead Management & CRM Event Pipeline</p>
          <div className="flex items-center space-x-4">
            <span>Express API + BullMQ + Redis + MongoDB</span>
            <span>•</span>
            <span className="text-blue-600 font-medium">Meta CAPI Feedback Loop</span>
          </div>
        </div>
      </footer>

      {/* Lead Simulator Modal */}
      <SimulateModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        availableForms={availableForms}
        onLeadSimulated={() => {
          loadForms();
        }}
      />
    </div>
  );
};

export default App;
