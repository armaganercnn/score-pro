import React, { useState, useEffect } from 'react';
import { Plus, Ticket, Calculator, CalendarClock, Eye, Trash2, X, PlusCircle } from 'lucide-react';
import { supabase } from '../../supabase';
import Flatpickr from 'react-flatpickr';
import { Turkish } from 'flatpickr/dist/l10n/tr.js';

interface Coupon {
  id: string;
  title: string;
  description: string;
  total_odds: number;
  is_premium: boolean;
  status: string;
  expires_at: string;
  created_at: string;
}

interface CouponItemInput {
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  prediction: string;
  odds: string;
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalOdds, setTotalOdds] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [couponItems, setCouponItems] = useState<CouponItemInput[]>([]);

  // Details Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedCouponItems, setSelectedCouponItems] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch coupons
    const { data: couponsData, error: couponsError } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (couponsError) console.error('Error fetching coupons:', couponsError);
    else setCoupons(couponsData || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-calculate total odds
  useEffect(() => {
    if (couponItems.length === 0) {
      setTotalOdds('');
      return;
    }
    
    const calculatedOdds = couponItems.reduce((acc, item) => {
      const oddsValue = parseFloat(item.odds);
      if (!isNaN(oddsValue) && oddsValue > 0) {
        return acc * oddsValue;
      }
      return acc;
    }, 1);

    if (calculatedOdds > 1) {
      setTotalOdds(calculatedOdds.toFixed(2));
    } else {
      setTotalOdds('');
    }
  }, [couponItems]);

  const handleOpenModal = () => {
    setTitle('');
    setDescription('');
    setTotalOdds('');
    setIsPremium(false);
    setCouponItems([]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setExpiresAt(tomorrow.toISOString());
    setModalOpen(true);
  };

  const handleAddItem = () => {
    setCouponItems([...couponItems, { home_team: '', away_team: '', league: 'Süper Lig', match_date: '', prediction: '', odds: '' }]);
  };

  const handleUpdateItem = (index: number, field: keyof CouponItemInput, value: string) => {
    const newItems = [...couponItems];
    newItems[index][field] = value;
    setCouponItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...couponItems];
    newItems.splice(index, 1);
    setCouponItems(newItems);
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Insert Coupon
      const { data: insertedCoupon, error: couponError } = await supabase.from('coupons').insert({
        title,
        description,
        total_odds: parseFloat(totalOdds),
        is_premium: isPremium,
        expires_at: new Date(expiresAt).toISOString(),
        status: 'active'
      }).select().single();

      if (couponError) throw couponError;

      // 2. Insert matches and link to coupon
      if (insertedCoupon && couponItems.length > 0) {
        for (const item of couponItems) {
          if (!item.home_team || !item.away_team) continue; // skip empty

          // Create the match in the matches table
          const { data: matchData, error: matchError } = await supabase.from('matches').insert({
            home_team: item.home_team,
            away_team: item.away_team,
            league: item.league || 'Genel',
            match_date: item.match_date ? new Date(item.match_date).toISOString() : new Date().toISOString()
          }).select().single();

          if (matchError) {
            console.error('Error inserting match:', matchError);
            continue; // if one fails, try next
          }

          // Link the match to the coupon
          if (matchData) {
            await supabase.from('coupon_items').insert({
              coupon_id: insertedCoupon.id,
              match_id: matchData.id,
              prediction: item.prediction,
              odds: parseFloat(item.odds) || 1.0,
              status: 'pending'
            });
          }
        }
      }

      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('Kupon eklenirken hata oluştu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
    
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) {
      alert('Silme hatası: ' + error.message);
    } else {
      fetchData();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'passive' : 'active';
    const { error } = await supabase.from('coupons').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert('Durum değiştirme hatası: ' + error.message);
    } else {
      fetchData();
    }
  };

  const handleOpenDetails = async (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDetailsModalOpen(true);
    setLoadingDetails(true);

    const { data, error } = await supabase
      .from('coupon_items')
      .select(`
        *,
        matches (
          home_team,
          away_team,
          league,
          match_date
        )
      `)
      .eq('coupon_id', coupon.id);

    if (error) {
      console.error('Error fetching coupon details:', error);
    } else {
      setSelectedCouponItems(data || []);
    }
    setLoadingDetails(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="glass-card p-4 flex-1 w-full max-w-sm flex items-center bg-gradient-to-r from-emerald-900/20 to-transparent">
          <Calculator className="w-8 h-8 text-emerald-400 mr-4" />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Otomatik Oran Motoru</p>
            <p className="text-emerald-400 text-sm font-medium">Aktif ve Çalışıyor</p>
          </div>
        </div>

        <button 
          onClick={handleOpenModal}
          className="flex items-center px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          Yeni Kupon Sihirbazı
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Coupons Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => {
            const isExpired = new Date(coupon.expires_at) < new Date();
            const statusDisplay = isExpired ? 'expired' : coupon.status;

            return (
              <div key={coupon.id} className={`glass-card p-6 flex flex-col justify-between group ${statusDisplay === 'expired' ? 'opacity-60 grayscale hover:grayscale-0 transition-all' : 'hover:border-emerald-500/50'}`}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${coupon.is_premium ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}>
                      <Ticket className="w-6 h-6" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Toplam Oran</p>
                      <p className={`text-2xl font-black ${coupon.is_premium ? 'text-amber-400' : 'text-emerald-400'}`}>{coupon.total_odds}</p>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">{coupon.title}</h3>
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{coupon.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-slate-400 mb-4">
                    <span className="flex items-center">
                      {coupon.is_premium ? <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span> : <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>}
                      {coupon.is_premium ? 'VIP Premium' : 'Ücretsiz'}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center text-xs text-slate-300">
                    <CalendarClock className="w-4 h-4 mr-2 text-slate-500" />
                    Bitiş: <span className="ml-1 text-white font-medium">{new Date(coupon.expires_at).toLocaleString('tr-TR')}</span>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                  <button 
                    onClick={() => handleToggleStatus(coupon.id, coupon.status)}
                    disabled={statusDisplay === 'expired'}
                    className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${statusDisplay === 'active' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : statusDisplay === 'expired' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                    title={statusDisplay === 'expired' ? "Süresi dolmuş" : "Durumu Değiştir"}
                  >
                    {statusDisplay === 'active' ? 'YAYINDA (Gizle)' : statusDisplay === 'expired' ? 'SÜRESİ BİTTİ' : 'PASİF (Yayınla)'}
                  </button>
                  <div className="flex space-x-2">
                    <button onClick={() => handleDelete(coupon.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Sil">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenDetails(coupon)} className="flex items-center text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                      <Eye className="w-4 h-4 mr-1" />
                      Detaylar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Empty State Card */}
          <div onClick={handleOpenModal} className="glass-card p-6 border-dashed border-2 border-slate-700 hover:border-emerald-500/50 flex flex-col items-center justify-center text-center cursor-pointer group bg-transparent hover:bg-emerald-900/10 transition-all min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-slate-900 text-slate-400 transition-colors shadow-lg">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-300 group-hover:text-emerald-400 transition-colors mb-2">Hızlı Kupon Ekle</h3>
            <p className="text-sm text-slate-500">Sihirbazı kullanarak maçları seçin, oranlar otomatik hesaplansın.</p>
          </div>
        </div>
      )}

      {/* Create Drawer (Slide-over) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-2xl h-full border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Ticket className="w-5 h-5 mr-2 text-emerald-400" /> Yeni Kupon Sihirbazı
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kupon Başlığı</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none" placeholder="Örn: Hafta Sonu Bankosu" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Otomatik Pasife Alınma Zamanı</label>
                  <Flatpickr
                    data-enable-time
                    value={expiresAt}
                    onChange={([date]) => setExpiresAt(date.toISOString())}
                    options={{ enableTime: true, time_24hr: true, locale: Turkish, dateFormat: "d.m.Y H:i" }}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    placeholder="Tarih ve Saat Seçin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Açıklama / Analiz</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none resize-none" placeholder="Kupon analizini buraya yazın..."></textarea>
                </div>
              </div>
              
              <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white uppercase">Kupona Yeni Maçlar Ekle</h4>
                  <button onClick={handleAddItem} type="button" className="text-xs flex items-center px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg font-bold transition-colors">
                    <PlusCircle className="w-4 h-4 mr-1" /> Maç Ekle
                  </button>
                </div>
                
                {couponItems.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 bg-slate-900/30 rounded-lg border border-dashed border-slate-700">Henüz maç eklemediniz. Sağ üstten ekleyebilirsiniz.</p>
                ) : (
                  <div className="space-y-3">
                    {couponItems.map((item, index) => (
                      <div key={index} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 relative group flex flex-col gap-3 transition-colors hover:border-slate-600">
                        <button type="button" onClick={() => handleRemoveItem(index)} className="absolute -top-2 -right-2 bg-slate-800 hover:bg-red-500 text-slate-400 hover:text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg border border-slate-700 hover:border-red-500">
                          <X className="w-4 h-4" />
                        </button>
                        
                        <div className="flex flex-col sm:flex-row gap-2 items-center">
                           <input type="text" placeholder="Ev Sahibi" value={item.home_team} onChange={(e) => handleUpdateItem(index, 'home_team', e.target.value)} className="w-full sm:w-[45%] bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:border-emerald-500 outline-none font-semibold placeholder:font-normal" />
                           <span className="hidden sm:flex text-[10px] text-slate-500 font-black">VS</span>
                           <input type="text" placeholder="Deplasman" value={item.away_team} onChange={(e) => handleUpdateItem(index, 'away_team', e.target.value)} className="w-full sm:w-[45%] bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:border-emerald-500 outline-none font-semibold placeholder:font-normal" />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                           <select value={item.league} onChange={(e) => handleUpdateItem(index, 'league', e.target.value)} className="w-full sm:w-[28%] bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 focus:border-emerald-500 outline-none">
                                <option value="Süper Lig">Süper Lig</option>
                                <option value="Premier League">Premier League</option>
                                <option value="La Liga">La Liga</option>
                                <option value="Serie A">Serie A</option>
                                <option value="Bundesliga">Bundesliga</option>
                                <option value="Ligue 1">Ligue 1</option>
                                <option value="Champions League">Şampiyonlar Ligi</option>
                                <option value="Europa League">Avrupa Ligi</option>
                                <option value="Diğer">Diğer</option>
                           </select>
                           <Flatpickr
                             data-enable-time
                             value={item.match_date}
                             onChange={([date]) => handleUpdateItem(index, 'match_date', date.toISOString())}
                             options={{ enableTime: true, time_24hr: true, locale: Turkish, dateFormat: "d.m.Y H:i" }}
                             className="w-full sm:w-[28%] bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-[11px] text-slate-300 focus:border-emerald-500 outline-none"
                             placeholder="Maç Tarihi"
                           />
                           <input type="text" placeholder="Tahmin (MS1 vb.)" value={item.prediction} onChange={(e) => handleUpdateItem(index, 'prediction', e.target.value)} className="w-full sm:w-[28%] bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-emerald-400 font-bold focus:border-emerald-500 outline-none placeholder:text-slate-500 placeholder:font-normal" />
                           <input type="number" step="0.01" placeholder="Oran" value={item.odds} onChange={(e) => handleUpdateItem(index, 'odds', e.target.value)} className="w-full sm:w-[16%] bg-emerald-900/20 border border-emerald-500/30 rounded px-2 py-1.5 text-sm text-white font-black focus:border-emerald-500 outline-none text-center" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Sticky Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0 z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Toplam Oran</span>
                <div className="flex items-center">
                  <span className="text-3xl font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{totalOdds || '1.00'}</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <label className="flex items-center cursor-pointer p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${isPremium ? 'bg-amber-500' : 'bg-slate-700'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPremium ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-xs font-bold text-slate-300">
                    <span className="text-amber-400">VIP</span> Kullanıcılar
                  </div>
                </label>
                
                <button type="button" onClick={handleAddCoupon} disabled={saving || couponItems.length === 0 || !title || !description} className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 rounded-xl font-black text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center">
                  {saving ? 'KAYDEDİLİYOR...' : 'KUPONU YAYINLA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      {detailsModalOpen && selectedCoupon && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1e293b] w-full max-w-md h-full border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Eye className="w-5 h-5 mr-2 text-emerald-400" /> Kupon Detayları
              </h3>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-6">
                <h4 className="text-2xl font-black text-white mb-2">{selectedCoupon.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">{selectedCoupon.description}</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className={`px-3 py-1.5 rounded-lg font-bold shadow-sm ${selectedCoupon.is_premium ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                    {selectedCoupon.is_premium ? 'Premium Kupon' : 'Ücretsiz Kupon'}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 shadow-sm flex items-center">
                    Toplam Oran: <strong className="text-emerald-400 ml-2 text-sm">{selectedCoupon.total_odds}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <div className="h-px bg-slate-800 flex-1"></div>
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest">İçerdiği Maçlar</h5>
                <div className="h-px bg-slate-800 flex-1"></div>
              </div>
              
              {loadingDetails ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
              ) : selectedCouponItems.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">Bu kupona eklenmiş maç bulunmuyor.</p>
              ) : (
                <div className="space-y-4">
                  {selectedCouponItems.map((item, idx) => (
                    <div key={item.id || idx} className="bg-slate-800/40 hover:bg-slate-800/60 transition-colors border border-slate-700/50 rounded-xl p-5 shadow-sm group">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold text-emerald-400/90 bg-emerald-400/10 px-2.5 py-1 rounded-md border border-emerald-400/20">{item.matches?.league || 'Genel'}</span>
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-900/50 px-2 py-1 rounded flex items-center">
                          <CalendarClock className="w-3 h-3 mr-1" />
                          {new Date(item.matches?.match_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="font-black text-slate-200 mb-3 text-lg group-hover:text-emerald-300 transition-colors">
                        {item.matches?.home_team} <span className="text-slate-500 font-normal mx-1">-</span> {item.matches?.away_team}
                      </div>
                      <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Tahmin</span>
                          <span className="text-sm font-bold text-white">{item.prediction}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Oran</span>
                          <span className="text-lg font-black text-emerald-400">{item.odds}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-800 bg-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] flex-shrink-0">
              <button onClick={() => setDetailsModalOpen(false)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold shadow-sm">
                Paneli Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
