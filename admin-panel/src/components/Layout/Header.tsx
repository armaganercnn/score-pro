import React, { useState, useEffect } from 'react';
import { RefreshCw, Bell } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider';
import { supabase } from '../../supabase';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Genel Bakış';
      case '/coupons': return 'Kupon Yönetimi';
      case '/users': return 'Kullanıcı Listesi';
      case '/ai': return 'Yapay Zeka (AI) Motoru';
      case '/marketing': return 'Pazarlama & Destek';
      case '/cms': return 'İçerik Yönetimi';
      default: return 'Yönetim Paneli';
    }
  };

  useEffect(() => {
    const fetchTickets = async () => {
      const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      
      setOpenTicketsCount(count || 0);
    };

    fetchTickets();

    // Set up realtime subscription for tickets
    const subscription = supabase
      .channel('support_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="h-20 glass-panel flex items-center justify-between px-8 z-20 flex-shrink-0 sticky top-0">
      <div className="flex items-center space-x-4">
        <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        <h2 className="text-2xl font-bold text-white tracking-wide glow-text">
          {getPageTitle()}
        </h2>
      </div>
      
      <div className="flex items-center space-x-6">
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/marketing')}
            className="p-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors border border-slate-700/50 relative group"
            title="Destek Talepleri"
          >
            <Bell className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
            {openTicketsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] text-[9px] font-bold text-slate-900 flex items-center justify-center">
                {openTicketsCount}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="p-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors border border-slate-700/50 group" 
            title="Verileri Yenile"
          >
            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500 group-hover:text-emerald-400" />
          </button>
        </div>

        {/* Profile */}
        <div 
          className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer hover:scale-105 transition-transform border border-emerald-400/30"
          title={user?.email || 'Admin'}
        >
          {user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD'}
        </div>
      </div>
    </header>
  );
}
