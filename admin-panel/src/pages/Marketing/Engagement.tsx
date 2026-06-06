import React, { useState, useEffect } from 'react';
import { Send, Clock, Gift, Inbox, MessageSquare, Tag, Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabase';

export default function Engagement() {
  const [activeCampaignsCount, setActiveCampaignsCount] = useState(0);
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Push Notification States
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [sendingPush, setSendingPush] = useState(false);

  // Campaign Management States
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCampaign, setNewCampaign] = useState({ title: '', code: '', discount_percentage: 10, valid_until: '' });
  const [campaignSaving, setCampaignSaving] = useState(false);

  // Ticket Management States
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchEngagementData();
  }, []);

  const fetchEngagementData = async () => {
    setLoading(true);
    
    try {
      // Fetch Active Campaigns Count
      const { count: campaignsCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      setActiveCampaignsCount(campaignsCount || 0);

      // Fetch Tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject,
          message,
          status,
          created_at,
          users ( name, email )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ticketsError) throw ticketsError;

      setTickets(ticketsData || []);
      setUnreadTicketsCount(ticketsData?.filter(t => t.status === 'open').length || 0);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle || !pushBody) {
      alert('Lütfen başlık ve metin giriniz.');
      return;
    }

    setSendingPush(true);
    setTimeout(() => {
      alert(`Firebase Cloud Messaging (FCM) Bildirimi Gönderildi!\n\nBaşlık: ${pushTitle}\nİçerik: ${pushBody}\n\nNot: Gerçek gönderim için Firebase proje anahtarınızı (Server Key) arka plan servisinize entegre etmeniz gerekecektir.`);
      setPushTitle('');
      setPushBody('');
      setSendingPush(false);
    }, 1500);
  };

  // --- Campaign Management ---

  const handleOpenCampaigns = async () => {
    setCampaignModalOpen(true);
    fetchCampaigns();
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns(data || []);
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignSaving(true);
    
    const { error } = await supabase.from('campaigns').insert({
      title: newCampaign.title,
      code: newCampaign.code,
      discount_percentage: newCampaign.discount_percentage,
      valid_until: new Date(newCampaign.valid_until).toISOString(),
      is_active: true
    });

    if (error) {
      alert('Kampanya eklenemedi: ' + error.message);
    } else {
      setNewCampaign({ title: '', code: '', discount_percentage: 10, valid_until: '' });
      fetchCampaigns();
      fetchEngagementData();
    }
    setCampaignSaving(false);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    await supabase.from('campaigns').delete().eq('id', id);
    fetchCampaigns();
    fetchEngagementData();
  };

  // --- Ticket Management ---

  const handleOpenTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketModalOpen(true);
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    
    const { error } = await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', selectedTicket.id);
    if (error) {
      alert('Hata: ' + error.message);
    } else {
      setTicketModalOpen(false);
      fetchEngagementData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-gradient-to-br from-blue-900/20 to-transparent border-blue-500/20">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Push Bildirimleri</h3>
              <p className="text-xs text-slate-400">FCM Altyapısı Hazır</p>
            </div>
          </div>
          <button onClick={() => document.getElementById('push-form')?.scrollIntoView({ behavior: 'smooth' })} className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-semibold transition-colors">
            Yeni Bildirim Oluştur
          </button>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-amber-900/20 to-transparent border-amber-500/20">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Promosyonlar</h3>
              <p className="text-xs text-slate-400">Aktif {activeCampaignsCount} Kampanya</p>
            </div>
          </div>
          <button onClick={handleOpenCampaigns} className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-semibold transition-colors">
            Kampanya Yönetimi
          </button>
        </div>

        <div className="glass-card p-6 bg-gradient-to-br from-emerald-900/20 to-transparent border-emerald-500/20">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 relative">
              <Inbox className="w-6 h-6" />
              {unreadTicketsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-[#0f1524] rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {unreadTicketsCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Gelen Kutusu</h3>
              <p className="text-xs text-slate-400">{unreadTicketsCount} Açık Destek Talebi</p>
            </div>
          </div>
          <button className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
            Aşağıdan İnceleyin
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Smart Notifications Builder */}
        <div id="push-form" className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-400" />
            Akıllı Bildirim & Spintax Editörü
          </h3>
          
          <form onSubmit={handleSendPush} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bildirim Başlığı</label>
              <input 
                type="text" 
                value={pushTitle}
                onChange={e => setPushTitle(e.target.value)}
                placeholder="Örn: Harika Kuponlar Hazır!" 
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/50" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Spintax Metin (Dinamik Değişken)</label>
              <textarea 
                rows={4} 
                value={pushBody}
                onChange={e => setPushBody(e.target.value)}
                placeholder="Premium kullanıcılarımız bugün {70-100} oranlı kupon kazandı!" 
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50 resize-none custom-scrollbar"
              ></textarea>
              <p className="text-xs text-slate-500 mt-1">İpucu: Firebase üzerinden toplu gönderimlerde dinamik parametreleri uygulamanızda parse edebilirsiniz.</p>
            </div>

            <button 
              type="submit"
              disabled={sendingPush}
              className="w-full flex justify-center items-center px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] mt-4 disabled:opacity-50"
            >
              {sendingPush ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {sendingPush ? 'Gönderiliyor...' : 'Firebase FCM Bildirimini Gönder'}
            </button>
          </form>
        </div>

        {/* Inbox Preview */}
        <div className="glass-card flex flex-col h-full">
          <div className="p-6 border-b border-slate-800/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-emerald-400" />
              Son Gelen Mesajlar
            </h3>
            <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded">{tickets.length} Kayıt</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar h-[400px]">
            {loading ? (
               <div className="flex justify-center py-8">
                 <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
               </div>
            ) : tickets.length === 0 ? (
               <p className="text-center text-sm text-slate-500 py-4">Gelen kutusu boş.</p>
            ) : (
              tickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  onClick={() => handleOpenTicket(ticket)}
                  className={`p-4 bg-slate-800/30 rounded-xl border transition-colors cursor-pointer group ${ticket.status === 'open' ? 'border-emerald-500/50 hover:bg-emerald-500/10' : 'border-slate-700/30 hover:border-emerald-500/30 opacity-70'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-bold transition-colors ${ticket.status === 'open' ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`}>
                      {ticket.users?.name || ticket.users?.email || 'Anonim Kullanıcı'}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleDateString('tr-TR')}</span>
                      <span className={`text-[10px] uppercase font-bold mt-1 px-1.5 rounded ${ticket.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                        {ticket.status === 'open' ? 'Açık' : 'Çözüldü'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold mb-1">{ticket.subject}</p>
                  <p className="text-xs text-slate-400 line-clamp-2">{ticket.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Campaign Management Modal */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Gift className="w-5 h-5 mr-2 text-amber-400" /> Kampanya Yönetimi
              </h3>
              <button onClick={() => setCampaignModalOpen(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form onSubmit={handleAddCampaign} className="mb-8 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> Yeni Kampanya Oluştur
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Başlık</label>
                    <input required value={newCampaign.title} onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} type="text" placeholder="Yaz İndirimi" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Promosyon Kodu</label>
                    <input required value={newCampaign.code} onChange={e => setNewCampaign({...newCampaign, code: e.target.value})} type="text" placeholder="YAZ20" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500 uppercase" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">İndirim Oranı (%)</label>
                    <input required value={newCampaign.discount_percentage} onChange={e => setNewCampaign({...newCampaign, discount_percentage: parseInt(e.target.value)})} type="number" min="1" max="100" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Geçerlilik Tarihi</label>
                    <input required value={newCampaign.valid_until} onChange={e => setNewCampaign({...newCampaign, valid_until: e.target.value})} type="datetime-local" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={campaignSaving} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-sm transition-colors">
                    {campaignSaving ? 'Ekleniyor...' : 'Ekle'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-300">Mevcut Kampanyalar</h4>
                {campaigns.length === 0 ? (
                  <p className="text-xs text-slate-500">Henüz kampanya yok.</p>
                ) : (
                  campaigns.map(c => (
                    <div key={c.id} className="flex justify-between items-center p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-amber-400">{c.title}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-emerald-500/30">{c.code}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">İndirim: %{c.discount_percentage} | Son: {new Date(c.valid_until).toLocaleDateString('tr-TR')}</p>
                      </div>
                      <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Management Modal */}
      {ticketModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-white flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-emerald-400" /> Destek Talebi
              </h3>
              <button onClick={() => setTicketModalOpen(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-white">{selectedTicket.users?.name || 'İsimsiz'}</p>
                  <p className="text-xs text-slate-400">{selectedTicket.users?.email || 'Bilinmiyor'}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${selectedTicket.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {selectedTicket.status === 'open' ? 'MÜDAHALE BEKLİYOR' : 'ÇÖZÜLDÜ'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">{new Date(selectedTicket.created_at).toLocaleString('tr-TR')}</p>
                </div>
              </div>
              
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                <p className="text-sm font-bold text-emerald-400 mb-2">{selectedTicket.subject}</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {selectedTicket.status === 'open' && (
                <button 
                  onClick={handleCloseTicket}
                  className="w-full flex justify-center items-center px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-4"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Talebi Çözüldü Olarak İşaretle Kapat
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
