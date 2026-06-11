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
    <header className="h-16 glass-panel flex items-center justify-between px-8 z-20 flex-shrink-0 sticky top-0 border-b border-white/5">
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-bold text-white tracking-tight">
          {getPageTitle()}
        </h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/marketing')}
            className="p-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-lg transition-all border border-white/5 active:scale-95 relative group"
            title="Destek Talepleri"
          >
            <Bell className="w-4.5 h-4.5 group-hover:text-[#30D158] transition-colors" />
            {openTicketsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#30D158] rounded-full text-[9px] font-bold text-black flex items-center justify-center shadow-[0_2px_5px_rgba(48,209,88,0.4)]">
                {openTicketsCount}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="p-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-lg transition-all border border-white/5 group active:scale-95" 
            title="Verileri Yenile"
          >
            <RefreshCw className="w-4.5 h-4.5 group-hover:rotate-180 transition-transform duration-700 group-hover:text-[#30D158]" />
          </button>
        </div>
        
        <div className="h-px w-4 bg-white/10 rotate-90"></div>

        {/* Profile */}
        <div 
          className="h-8 w-8 rounded-full bg-[#30D158] flex items-center justify-center font-bold text-black shadow-[0_2px_8px_rgba(48,209,88,0.2)] cursor-pointer hover:scale-105 active:scale-95 transition-transform text-xs"
          title={user?.email || 'Admin'}
        >
          {user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD'}
        </div>
      </div>
    </header>
  );
}
