import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider';
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  BrainCircuit, 
  Megaphone, 
  FileText, 
  LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  return (
    <aside className="w-64 bg-[#0d0d0e] border-r border-white/5 flex flex-col flex-shrink-0 z-30">
      <div className="p-6">
        <h1 className="text-xl font-extrabold text-white tracking-tight">
          SCORE<span className="text-[#30D158] font-semibold">PRO</span>
        </h1>
        <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mt-1">YÖNETİM PANELİ v1.0</p>
      </div>
      
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
        <NavLink 
          to="/"
          className={({ isActive }) => `flex items-center w-full px-4 py-2.5 rounded-xl transition-all duration-300 ${
            isActive 
              ? 'bg-[#30D158]/10 text-[#30D158] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]' 
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mr-3 shrink-0" />
          <span className="text-sm">Genel Bakış</span>
        </NavLink>
        
        <NavLink 
          to="/coupons"
          className={({ isActive }) => `flex items-center w-full px-4 py-2.5 rounded-xl transition-all duration-300 ${
            isActive 
              ? 'bg-[#30D158]/10 text-[#30D158] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]' 
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          <Ticket className="w-5 h-5 mr-3 shrink-0" />
          <span className="text-sm">Kupon Yönetimi</span>
        </NavLink>

        <NavLink 
          to="/ai"
          className={({ isActive }) => `flex items-center w-full px-4 py-2.5 rounded-xl transition-all duration-300 ${
            isActive 
              ? 'bg-[#BF5AF2]/10 text-[#BF5AF2] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]' 
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          <BrainCircuit className="w-5 h-5 mr-3 shrink-0" />
          <span className="text-sm">Yapay Zeka (AI)</span>
        </NavLink>
        
        <NavLink 
          to="/users"
          className={({ isActive }) => `flex items-center w-full px-4 py-2.5 rounded-xl transition-all duration-300 ${
            isActive 
              ? 'bg-[#30D158]/10 text-[#30D158] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]' 
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          <Users className="w-5 h-5 mr-3 shrink-0" />
          <span className="text-sm">Kullanıcılar</span>
        </NavLink>

        <NavLink 
          to="/marketing"
          className={({ isActive }) => `flex items-center w-full px-4 py-2.5 rounded-xl transition-all duration-300 ${
            isActive 
              ? 'bg-[#FF9F0A]/10 text-[#FF9F0A] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]' 
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          <Megaphone className="w-5 h-5 mr-3 shrink-0" />
          <span className="text-sm">Pazarlama & Bildirim</span>
        </NavLink>

        <NavLink 
          to="/cms"
          className={({ isActive }) => `flex items-center w-full px-4 py-2.5 rounded-xl transition-all duration-300 ${
            isActive 
              ? 'bg-[#0A84FF]/10 text-[#0A84FF] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]' 
              : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
          }`}
        >
          <FileText className="w-5 h-5 mr-3 shrink-0" />
          <span className="text-sm">İçerik (CMS)</span>
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-[#30D158] font-bold text-xs">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="flex-1 truncate">
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">YÖNETİCİ</p>
            <p className="text-xs font-medium text-neutral-200 truncate">{user?.email || 'Admin'}</p>
          </div>
          <button 
            onClick={signOut} 
            className="p-2 text-neutral-500 hover:text-[#FF453A] hover:bg-[#FF453A]/10 rounded-xl transition-all active:scale-95" 
            title="Çıkış Yap"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
