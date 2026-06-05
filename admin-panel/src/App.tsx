import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  Plus, 
  Star, 
  Trash2, 
  Edit, 
  X, 
  MessageSquare, 
  AlertCircle, 
  Calendar,
  RefreshCw,
  UserCheck
} from 'lucide-react';

interface Coupon {
  id: string;
  title: string;
  description: string;
  match_time: string;
  expires_at: string;
  is_premium: boolean;
  created_at?: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  premium_until: string | null;
  created_at: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'coupons' | 'users' | 'messages'>('dashboard');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    activeCoupons: 0,
  });

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  // User Premium Edit Modal State
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [premiumDate, setPremiumDate] = useState('');

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Coupons
      const { data: couponData, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (couponError) throw couponError;
      setCoupons(couponData || []);

      // 2. Fetch Profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profileError) throw profileError;
      setProfiles(profileData || []);

      // 3. Fetch Contact Messages
      const { data: messageData, error: messageError } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (messageError) throw messageError;
      setMessages(messageData || []);

      // 4. Calculate Stats
      const totalUsersVal = profileData?.length || 0;
      const premiumUsersVal = profileData?.filter(p => p.premium_until && new Date(p.premium_until) > new Date()).length || 0;
      const activeCouponsVal = couponData?.filter(c => c.expires_at && new Date(c.expires_at) > new Date()).length || 0;

      setStats({
        totalUsers: totalUsersVal,
        premiumUsers: premiumUsersVal,
        activeCoupons: activeCouponsVal,
      });

    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Veriler yüklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatToDatetimeLocal = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleOpenAddModal = () => {
    setEditingCoupon(null);
    setTitle('');
    setDescription('');
    
    // Default match time: 2 hours from now, rounded
    const defaultMatch = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const defaultExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000);
    
    setMatchTime(formatToDatetimeLocal(defaultMatch.toISOString()));
    setExpiresAt(formatToDatetimeLocal(defaultExpiry.toISOString()));
    setIsPremium(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setTitle(coupon.title);
    setDescription(coupon.description);
    setMatchTime(formatToDatetimeLocal(coupon.match_time));
    setExpiresAt(formatToDatetimeLocal(coupon.expires_at));
    setIsPremium(coupon.is_premium);
    setModalOpen(true);
  };

  const handleSubmitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
        match_time: new Date(matchTime).toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
        is_premium: isPremium,
      };

      if (editingCoupon) {
        // Update
        const { error } = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingCoupon.id);
        
        if (error) throw error;
        showNotification('success', 'Kupon başarıyla güncellendi!');
      } else {
        // Insert
        const { error } = await supabase
          .from('coupons')
          .insert(payload);
        
        if (error) throw error;
        showNotification('success', 'Yeni kupon başarıyla eklendi!');
      }
      
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Kupon kaydedilemedi: ' + err.message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showNotification('success', 'Kupon silindi.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Kupon silinirken hata oluştu: ' + err.message);
    }
  };

  const handleOpenPremiumModal = (profile: Profile) => {
    setSelectedProfile(profile);
    const defaultDate = profile.premium_until 
      ? formatToDatetimeLocal(profile.premium_until) 
      : formatToDatetimeLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 days
    setPremiumDate(defaultDate);
    setPremiumModalOpen(true);
  };

  const handleUpdatePremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          premium_until: premiumDate ? new Date(premiumDate).toISOString() : null
        })
        .eq('id', selectedProfile.id);

      if (error) throw error;
      showNotification('success', 'Kullanıcı abonelik durumu güncellendi.');
      setPremiumModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Abonelik güncellenemedi: ' + err.message);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showNotification('success', 'Mesaj silindi.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Mesaj silinemedi: ' + err.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e293b] border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-emerald-500 tracking-wider">SCORE<span className="text-white">PRO</span></h1>
          <p className="text-xs text-slate-400 mt-1">Yönetim Paneli v1.0</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            <span>Genel Bakış</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'coupons' 
                ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Ticket className="w-5 h-5 mr-3" />
            <span>Kupon Yönetimi</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${
              activeTab === 'users' 
                ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5 mr-3" />
            <span>Kullanıcılar</span>
          </button>

          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex items-center w-full px-4 py-3 rounded-xl transition-all relative ${
              activeTab === 'messages' 
                ? 'bg-emerald-500/10 text-emerald-400 font-medium' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-5 h-5 mr-3" />
            <span>Mesajlar</span>
            {messages.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-slate-900 text-xs px-2 py-0.5 rounded-full font-bold">
                {messages.length}
              </span>
            )}
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm">
              L
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Lokal Sunucu</p>
              <p className="text-sm font-semibold text-white">Yönetici</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center w-full px-4 py-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>Verileri Yenile</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Toast Notification */}
        {notification && (
          <div className={`absolute top-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300 ${
            notification.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">{notification.text}</span>
          </div>
        )}

        {/* Header */}
        <header className="h-20 bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 z-10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            {activeTab === 'dashboard' && 'Genel Bakış'}
            {activeTab === 'coupons' && 'Kupon Yönetimi'}
            {activeTab === 'users' && 'Kullanıcı Listesi'}
            {activeTab === 'messages' && 'Gelen Mesajlar'}
          </h2>
          <div className="flex items-center space-x-4">
            <button 
              onClick={fetchData}
              className={`p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors ${loading ? 'animate-spin' : ''}`}
              title="Yenile"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              A
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm">Veritabanından veriler çekiliyor...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm font-medium mb-1">Toplam Kullanıcı</p>
                          <h3 className="text-3xl font-bold text-white">{stats.totalUsers}</h3>
                        </div>
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-emerald-400">
                          <Users className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm font-medium mb-1">Premium Üyeler</p>
                          <h3 className="text-3xl font-bold text-white">{stats.premiumUsers}</h3>
                        </div>
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-amber-400">
                          <Star className="w-6 h-6" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm font-medium mb-1">Aktif Kuponlar</p>
                          <h3 className="text-3xl font-bold text-white">{stats.activeCoupons}</h3>
                        </div>
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400">
                          <Ticket className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Coupons & Activities */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Coupons Table */}
                    <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden">
                      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Son Eklenen Kuponlar</h3>
                        <button 
                          onClick={() => setActiveTab('coupons')} 
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          Tümünü Yönet
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                              <th className="px-6 py-4">Başlık</th>
                              <th className="px-6 py-4">Bitiş Tarihi</th>
                              <th className="px-6 py-4">Durum</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {coupons.slice(0, 5).map((coupon) => {
                              const isExpired = new Date(coupon.expires_at) < new Date();
                              return (
                                <tr key={coupon.id} className="hover:bg-slate-800/25 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-200">{coupon.title}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-xs">{coupon.description}</div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-slate-400">
                                    {new Date(coupon.expires_at).toLocaleString('tr-TR')}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      {coupon.is_premium ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">PREMIUM</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ÜCRETSİZ</span>
                                      )}
                                      {isExpired ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">SÜRESİ DOLDU</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">AKTİF</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {coupons.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                                  Henüz hiç kupon eklenmemiş.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Quick Stats & Message Inbox Preview */}
                    <div className="space-y-6">
                      <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <MessageSquare className="w-5 h-5 mr-2 text-emerald-400" />
                          Son Gelen Mesajlar
                        </h3>
                        <div className="space-y-4">
                          {messages.slice(0, 3).map((msg) => (
                            <div key={msg.id} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-emerald-400">{msg.name}</span>
                                <span className="text-[10px] text-slate-500">{new Date(msg.created_at).toLocaleDateString('tr-TR')}</span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-2">{msg.message}</p>
                            </div>
                          ))}
                          {messages.length === 0 && (
                            <p className="text-xs text-center text-slate-500 py-4">Gelen kutusu boş.</p>
                          )}
                          {messages.length > 0 && (
                            <button 
                              onClick={() => setActiveTab('messages')}
                              className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 font-semibold pt-2"
                            >
                              Tüm Mesajları Gör
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 2: COUPONS MANAGEMENT */}
              {activeTab === 'coupons' && (
                <div className="space-y-6">
                  {/* Actions Bar */}
                  <div className="flex justify-between items-center bg-[#1e293b] p-4 rounded-xl border border-slate-800">
                    <p className="text-sm text-slate-400">
                      Toplam <strong className="text-white">{coupons.length}</strong> kupon listeleniyor.
                    </p>
                    <button 
                      onClick={handleOpenAddModal}
                      className="flex items-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Plus className="w-5 h-5 mr-1" />
                      Yeni Kupon Ekle
                    </button>
                  </div>

                  {/* Coupons Table */}
                  <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <th className="px-6 py-4">Kupon Bilgisi</th>
                            <th className="px-6 py-4">Maç Tarihi</th>
                            <th className="px-6 py-4">Bitiş Tarihi</th>
                            <th className="px-6 py-4">Abonelik Türü</th>
                            <th className="px-6 py-4">Durum</th>
                            <th className="px-6 py-4 text-right">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {coupons.map((coupon) => {
                            const isExpired = new Date(coupon.expires_at) < new Date();
                            return (
                              <tr key={coupon.id} className="hover:bg-slate-800/25 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-white">{coupon.title}</div>
                                  <div className="text-sm text-slate-400 mt-1 max-w-md">{coupon.description}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                  {new Date(coupon.match_time).toLocaleString('tr-TR')}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                  {new Date(coupon.expires_at).toLocaleString('tr-TR')}
                                </td>
                                <td className="px-6 py-4">
                                  {coupon.is_premium ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      <Star className="w-3.5 h-3.5 mr-1" /> Premium
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      Ücretsiz
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {isExpired ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                      SÜRESİ BİTTİ
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      AKTİF
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end space-x-2">
                                    <button 
                                      onClick={() => handleOpenEditModal(coupon)}
                                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                      title="Düzenle"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteCoupon(coupon.id)}
                                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                      title="Sil"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {coupons.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                Kayıtlı kupon bulunamadı. Yeni bir kupon ekleyerek başlayın!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: USERS LIST */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-800">
                    <p className="text-sm text-slate-400">
                      Sistemde kayıtlı <strong className="text-white">{profiles.length}</strong> kullanıcı profili bulunuyor.
                    </p>
                  </div>

                  <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-800/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <th className="px-6 py-4">Kullanıcı Bilgileri</th>
                            <th className="px-6 py-4">Kayıt Tarihi</th>
                            <th className="px-6 py-4">Premium Bitiş Tarihi</th>
                            <th className="px-6 py-4">Durum</th>
                            <th className="px-6 py-4 text-right">Abonelik Yönetimi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {profiles.map((profile) => {
                            const isPremiumActive = profile.premium_until && new Date(profile.premium_until) > new Date();
                            return (
                              <tr key={profile.id} className="hover:bg-slate-800/25 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-white">{profile.name || 'İsimsiz Kullanıcı'}</div>
                                  <div className="text-sm text-slate-400 mt-0.5">{profile.email}</div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-1">{profile.id}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                  {new Date(profile.created_at).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300">
                                  {profile.premium_until 
                                    ? new Date(profile.premium_until).toLocaleString('tr-TR')
                                    : 'Abonelik Yok'
                                  }
                                </td>
                                <td className="px-6 py-4">
                                  {isPremiumActive ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      <Star className="w-3.5 h-3.5 mr-1" /> VIP Premium
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                      Standart
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => handleOpenPremiumModal(profile)}
                                    className="inline-flex items-center px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                    Premium Süresi Düzenle
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {profiles.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                Kayıtlı kullanıcı bulunamadı. Mobil uygulamadan üye oluşturulduğunda burada listelenecektir.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CONTACT MESSAGES */}
              {activeTab === 'messages' && (
                <div className="space-y-6">
                  <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-800">
                    <p className="text-sm text-slate-400">
                      Gelen mesaj kutusunda toplam <strong className="text-white">{messages.length}</strong> mesaj bulunuyor.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {messages.map((msg) => (
                      <div key={msg.id} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-white text-base">{msg.name}</h4>
                              <p className="text-xs text-emerald-400 mt-0.5">{msg.email}</p>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(msg.created_at).toLocaleString('tr-TR')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 p-4 rounded-xl border border-slate-700/20 whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        </div>
                        <div className="flex justify-end mt-4 pt-2 border-t border-slate-800/50">
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="flex items-center px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 text-xs font-semibold rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Mesajı Sil
                          </button>
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="col-span-full bg-[#1e293b] py-16 text-center text-slate-500 rounded-2xl border border-slate-800">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        Gelen kutusu tamamen temiz!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* MODAL 1: ADD/EDIT COUPON */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-emerald-400" />
                {editingCoupon ? 'Kuponu Düzenle' : 'Yeni Kupon Ekle'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitCoupon} className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kupon Başlığı</label>
                <input 
                  type="text" 
                  required
                  placeholder="örn: Günün Bankosu, Şampiyonlar Ligi Kombinesi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kupon Detayı / Maçlar</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Kupon detayını, tahminleri ve oranları yazın..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    Maç Zamanı
                  </label>
                  <input 
                    type="datetime-local" 
                    required
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-red-400" />
                    Bitiş Süresi
                  </label>
                  <input 
                    type="datetime-local" 
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <p className="text-[10px] text-slate-500">Bu süreden sonra kupon yayından kalkar.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/30 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Premium (VIP) Kupon</h4>
                    <p className="text-xs text-slate-400">Sadece VIP üyeler görebilir.</p>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={isPremium}
                  onChange={(e) => setIsPremium(e.target.checked)}
                  className="w-5 h-5 bg-slate-800 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 focus:ring-offset-2"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-sm"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-colors text-sm shadow-lg shadow-emerald-500/10"
                >
                  {editingCoupon ? 'Güncelle' : 'Kuponu Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PREMIUM EXPIRY DATE EDIT */}
      {premiumModalOpen && selectedProfile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center">
                <UserCheck className="w-5 h-5 mr-2 text-emerald-400" />
                Premium Süresi Ayarla
              </h3>
              <button 
                onClick={() => setPremiumModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdatePremium} className="p-6 space-y-4">
              <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <p className="text-xs text-slate-400 font-bold uppercase">Kullanıcı E-Posta</p>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedProfile.email}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">{selectedProfile.id}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Premium Bitiş Zamanı
                </label>
                <input 
                  type="datetime-local" 
                  value={premiumDate}
                  onChange={(e) => setPremiumDate(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <p className="text-[10px] text-slate-500">Bu tarih ve saatten sonra kullanıcının Premium üyeliği biter. Boş bırakırsanız üyelik hemen iptal olur.</p>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-800 mt-4">
                <button 
                  type="button"
                  onClick={() => setPremiumModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-sm"
                >
                  Vazgeç
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-colors text-sm shadow-lg shadow-emerald-500/10"
                >
                  Süreyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
