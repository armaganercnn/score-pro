import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider';
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  MessageSquare,
  RefreshCw,
  BrainCircuit,
  Megaphone,
  FileText,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  return (
    <aside className="w-64 bg-[#1e293b] border-r border-slate-800 flex flex-col flex-shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-emerald-500 tracking-wider">SCORE<span className="text-white">PRO</span></h1>
        <p className="text-xs text-slate-400 mt-1">Yönetim Paneli v1.0</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        <NavLink 
          to="/"
          className={({ isActive }) => `flex items-center w-full px-4 py-3 rounded-xl transition-all ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mr-3" />
          <span>Genel Bakış</span>
        </NavLink>
        
        <NavLink 
          to="/coupons"
          className={({ isActive }) => `flex items-center w-full px-4 py-3 rounded-xl transition-all ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Ticket className="w-5 h-5 mr-3" />
          <span>Kupon Yönetimi</span>
        </NavLink>

        <NavLink 
          to="/ai"
          className={({ isActive }) => `flex items-center w-full px-4 py-3 rounded-xl transition-all ${
            isActive 
              ? 'bg-purple-500/10 text-purple-400 font-medium' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <BrainCircuit className="w-5 h-5 mr-3" />
          <span>Yapay Zeka (AI)</span>
        </NavLink>
        
        <NavLink 
          to="/users"
          className={({ isActive }) => `flex items-center w-full px-4 py-3 rounded-xl transition-all ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mr-3" />
          <span>Kullanıcılar</span>
        </NavLink>

        <NavLink 
          to="/marketing"
          className={({ isActive }) => `flex items-center w-full px-4 py-3 rounded-xl transition-all ${
            isActive 
              ? 'bg-amber-500/10 text-amber-400 font-medium' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-5 h-5 mr-3" />
          <span>Pazarlama & Bildirim</span>
        </NavLink>

        <NavLink 
          to="/cms"
          className={({ isActive }) => `flex items-center w-full px-4 py-3 rounded-xl transition-all ${
            isActive 
              ? 'bg-blue-500/10 text-blue-400 font-medium' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5 mr-3" />
          <span>İçerik (CMS)</span>
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm">
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs text-slate-400 font-medium">Sistem Yöneticisi</p>
            <p className="text-sm font-semibold text-white truncate">{user?.email || 'Admin'}</p>
          </div>
          <button onClick={signOut} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Çıkış Yap">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
