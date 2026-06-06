import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Shield, Crown, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../../supabase';

interface UserData {
  id: string;
  name: string;
  email: string;
  premium_until: string | null;
  created_at: string;
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleMakePremium = async (id: string, currentlyPremium: boolean) => {
    let premium_until = null;
    
    if (currentlyPremium) {
      if (!window.confirm('Premium yetkisini tamamen kaldırmak istiyor musunuz?')) return;
    } else {
      const daysStr = window.prompt('Kaç günlük premium yetkisi vermek istiyorsunuz?', '30');
      if (daysStr === null) return; // User cancelled
      
      const days = parseInt(daysStr, 10);
      if (isNaN(days) || days <= 0) {
        alert('Lütfen geçerli bir gün sayısı girin.');
        return;
      }
      
      const date = new Date();
      date.setDate(date.getDate() + days);
      premium_until = date.toISOString();
    }

    const { error } = await supabase
      .from('users')
      .update({ premium_until })
      .eq('id', id);

    if (error) {
      alert('Güncelleme hatası: ' + error.message);
    } else {
      fetchUsers();
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenEdit = (user: UserData) => {
    setEditUserId(user.id);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { 
           action: 'update', 
           userId: editUserId, 
           email: editEmail || undefined, 
           password: editPassword || undefined, 
           name: editName || undefined
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const dbUpdates: any = {};
      if (editName) dbUpdates.name = editName;
      if (editEmail) dbUpdates.email = editEmail;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('users').update(dbUpdates).eq('id', editUserId);
      }

      setEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert('Güncelleme hatası: ' + err.message);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    const confirmMsg = `${user.email} e-posta adresine sahip kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?\nBu işlem geri alınamaz!`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', userId: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.from('users').delete().eq('id', user.id);

      fetchUsers();
    } catch (err: any) {
      alert('Silme hatası: ' + err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: newEmail, password: newPassword, name: newName }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      alert('Kullanıcı başarıyla oluşturuldu!');
      setCreateModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      fetchUsers();
    } catch (err: any) {
      alert('Kullanıcı eklenirken hata oluştu: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="İsim, e-posta veya ID ile ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder-slate-500"
          />
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Manuel Kayıt Oluştur
        </button>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/30 border-b border-slate-700/50 text-slate-400 text-sm">
                <th className="px-6 py-4 font-semibold">Kullanıcı Bilgileri</th>
                <th className="px-6 py-4 font-semibold">Kayıt Tarihi</th>
                <th className="px-6 py-4 font-semibold">Statü</th>
                <th className="px-6 py-4 font-semibold">Premium Bitiş</th>
                <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => {
                  const isPremium = user.premium_until ? new Date(user.premium_until) > new Date() : false;
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold mr-3 uppercase">
                            {user.name ? user.name.charAt(0) : user.email?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium group-hover:text-emerald-400 transition-colors">{user.name || 'İsimsiz Kullanıcı'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        {isPremium ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Crown className="w-3.5 h-3.5 mr-1" /> Premium
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            Standart
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {user.premium_until ? new Date(user.premium_until).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleMakePremium(user.id, isPremium)}
                            className={`p-1.5 rounded transition-colors ${isPremium ? 'text-amber-400 hover:bg-amber-400/10' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700'}`} 
                            title={isPremium ? "Premium Yetkisini Al" : "Premium Yap"}
                          >
                            <Crown className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors" 
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user)} 
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" 
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-700/50 flex justify-between items-center bg-slate-900/30">
            <span className="text-sm text-slate-400">
              Toplam {filteredUsers.length} kayıttan {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} arası gösteriliyor.
            </span>
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Önceki
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Drawer */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-md h-full border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Edit2 className="w-5 h-5 mr-2 text-emerald-400" /> Kullanıcı Düzenle
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Kullanıcı Adı / İsim</label>
                  <input required value={editName} onChange={e => setEditName(e.target.value)} type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="Ad Soyad" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-posta Adresi</label>
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="test@test.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Yeni Şifre (Boş bırakılabilir)</label>
                  <input value={editPassword} onChange={e => setEditPassword(e.target.value)} type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="En az 6 karakter" />
                </div>
              </div>
              
              <div className="p-5 border-t border-slate-800 bg-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex-shrink-0 flex justify-end space-x-3">
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-semibold">İptal</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold transition-all shadow-lg hover:scale-105">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Drawer */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-md h-full border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-emerald-400" /> Yeni Kullanıcı Ekle
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">İsim Soyisim</label>
                  <input required value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-posta</label>
                  <input required value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="test@test.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Şifre</label>
                  <input required value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="En az 6 karakter" />
                </div>
              </div>
              <div className="p-5 border-t border-slate-800 bg-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex-shrink-0 flex justify-end space-x-3">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-semibold">İptal</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold transition-all shadow-lg hover:scale-105">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
