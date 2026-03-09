import React, { useState } from 'react';
import RegistrationForm from './components/RegistrationForm';
import CardPreview from './components/CardPreview';
import AdminDashboard from './components/AdminDashboard';
import PrivacyModal from './components/PrivacyModal';
import { Enterprise } from './types';
import { LayoutTemplate } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'register' | 'card' | 'admin'>('register');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [currentEnterprise, setCurrentEnterprise] = useState<Enterprise | null>(null);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);

  const handleRegister = (data: Omit<Enterprise, 'id' | 'views' | 'saves' | 'forwards' | 'createTime'>) => {
    const newEnterprise: Enterprise = {
      ...data,
      id: Math.random().toString(36).substring(7),
      views: 0,
      saves: 0,
      forwards: 0,
      createTime: Date.now(),
    };
    setEnterprises([...enterprises, newEnterprise]);
    setCurrentEnterprise(newEnterprise);
    setCurrentView('card');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!privacyAccepted && <PrivacyModal onAccept={() => setPrivacyAccepted(true)} />}
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-lg">
            <LayoutTemplate className="w-6 h-6" />
            <span>汇智云联名片</span>
          </div>
          <nav className="flex gap-4">
            <button 
              onClick={() => setCurrentView('register')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'register' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              企业入驻
            </button>
            {currentEnterprise && (
              <button 
                onClick={() => setCurrentView('card')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'card' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                我的名片
              </button>
            )}
            <button 
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              管理后台
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {currentView === 'register' && <RegistrationForm onRegister={handleRegister} />}
        {currentView === 'card' && currentEnterprise && <CardPreview enterprise={currentEnterprise} />}
        {currentView === 'admin' && <AdminDashboard enterprises={enterprises} />}
      </main>
    </div>
  );
}
