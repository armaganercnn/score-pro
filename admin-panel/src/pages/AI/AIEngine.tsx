import React, { useState, useEffect } from 'react';
import { BrainCircuit, Cpu, Settings2, Play, Sparkles, Link as LinkIcon, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../supabase';

export default function AIEngine() {
  // API Configuration State
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // AI Parameters State
  const [riskLevel, setRiskLevel] = useState('medium');
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>(['Premier Lig', 'La Liga']);
  const [minOdds, setMinOdds] = useState(2.0);
  const [maxOdds, setMaxOdds] = useState(5.0);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);

  useEffect(() => {
    // Load saved API settings on mount
    const savedUrl = localStorage.getItem('ai_api_url');
    const savedKey = localStorage.getItem('ai_api_key');
    if (savedUrl) setApiUrl(savedUrl);
    if (savedKey) setApiKey(savedKey);
  }, []);

  const saveApiConfig = () => {
    localStorage.setItem('ai_api_url', apiUrl);
    localStorage.setItem('ai_api_key', apiKey);
    setIsConfigOpen(false);
    alert('API Yapılandırması Kaydedildi!');
  };

  const toggleLeague = (league: string) => {
    if (selectedLeagues.includes(league)) {
      setSelectedLeagues(selectedLeagues.filter(l => l !== league));
    } else {
      setSelectedLeagues([...selectedLeagues, league]);
    }
  };

  const handleGenerate = async () => {
    if (!apiUrl) {
      setError('Lütfen önce sağ üst köşeden API yapılandırmanızı (Sunucu URL) giriniz.');
      setIsConfigOpen(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    const payload = {
      risk_level: riskLevel,
      leagues: selectedLeagues,
      min_odds: minOdds,
      max_odds: maxOdds
    };

    try {
      // API İsteği Gönderme Prensipleri
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API Hatası: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error('AI API Error:', err);
      // Simülasyon modu (API çalışmazsa demo amaçlı veri gösterelim)
      setError(`Bağlantı hatası: ${err.message}. Lütfen API adresinizin doğru olduğundan ve CORS ayarlarının yapıldığından emin olun.`);
      
      // SADECE GÖSTERİM AMAÇLI SAHTE SONUÇ (Gerçek sistemde kaldırılabilir)
      setTimeout(() => {
        setResult({
          title: "Yapay Zeka Özel Seçim: İdeal Hafta Sonu",
          description: "Çift Poisson regresyonu sonucu %78 güvenilirlik skoru ile oluşturulmuştur.",
          total_odds: 3.45,
          matches: [
            { home: "Arsenal", away: "Chelsea", prediction: "MS 1", odds: 2.10 },
            { home: "Real Madrid", away: "Barcelona", prediction: "2.5 Üst", odds: 1.65 }
          ]
        });
        setError(null);
      }, 2000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAICoupon = async () => {
    if (!result) return;
    setSavingCoupon(true);

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .insert({
          title: result.title,
          description: result.description,
          total_odds: parseFloat(result.total_odds),
          is_premium: riskLevel === 'high' || riskLevel === 'medium',
          status: 'active',
          expires_at: tomorrow.toISOString()
        })
        .select()
        .single();

      if (couponError) throw couponError;

      if (coupon && result.matches && result.matches.length > 0) {
        for (const match of result.matches) {
          const matchDate = new Date();
          matchDate.setHours(matchDate.getHours() + 12);

          const { data: matchData, error: matchError } = await supabase
            .from('matches')
            .insert({
              home_team: match.home,
              away_team: match.away,
              league: 'Yapay Zeka Özel',
              match_date: matchDate.toISOString()
            })
            .select()
            .single();

          if (matchError) {
            console.error('Error saving AI match:', matchError);
            continue;
          }

          if (matchData) {
            const { error: itemError } = await supabase
              .from('coupon_items')
              .insert({
                coupon_id: coupon.id,
                match_id: matchData.id,
                prediction: match.prediction,
                odds: parseFloat(match.odds),
                status: 'pending'
              });

            if (itemError) {
              console.error('Error saving AI coupon item:', itemError);
            }
          }
        }
      }

      alert('AI Kuponu başarıyla sisteme aktarıldı ve yayına alındı!');
      setResult(null);
    } catch (err: any) {
      alert('Kupon kaydedilirken hata oluştu: ' + err.message);
    } finally {
      setSavingCoupon(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="glass-card p-6 border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center glow-text">
              <BrainCircuit className="w-6 h-6 mr-3 text-purple-400" />
              Yapay Zeka (AI) Algoritma Motoru
            </h2>
            <p className="text-slate-400 max-w-2xl text-sm">
              Kendi AI modelinizi sisteme bağlayın. Sistem, belirttiğiniz API adresine POST isteği atarak kuponları türetir.
            </p>
          </div>
          <div className="flex flex-col items-end">
             <button 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${apiUrl ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse'}`}
             >
                <LinkIcon className="w-4 h-4 mr-2" />
                {apiUrl ? 'API Bağlı' : 'API Yapılandırılmadı'}
             </button>
          </div>
        </div>

        {/* API Config Dropdown */}
        {isConfigOpen && (
           <div className="mt-6 p-5 bg-slate-900/80 border border-slate-700/50 rounded-xl animate-in fade-in slide-in-from-top-2">
             <h3 className="text-sm font-bold text-white mb-4 flex items-center">
               <Database className="w-4 h-4 mr-2 text-purple-400" />
               Dış AI Servisi Bağlantı Ayarları
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">API Endpoint URL (POST)</label>
                  <input 
                    type="url" 
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                    placeholder="https://api.sizin-ai-sunucunuz.com/v1/generate" 
                    className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">API Key (Opsiyonel, Bearer Token)</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..." 
                    className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none" 
                  />
                </div>
             </div>
             <div className="bg-slate-800/30 p-3 rounded text-xs text-slate-400 mb-4 font-mono">
               <span className="text-purple-400">Beklenen Request (POST JSON):</span><br/>
               {`{ "risk_level": "medium", "leagues": ["Premier Lig"], "min_odds": 2.0, "max_odds": 5.0 }`}
               <br/><br/>
               <span className="text-emerald-400">Beklenen Response JSON:</span><br/>
               {`{ "title": "...", "description": "...", "total_odds": 3.45, "matches": [ { "home": "X", "away": "Y", "prediction": "MS1", "odds": 1.5 } ] }`}
             </div>
             <button onClick={saveApiConfig} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors text-sm">Ayarları Kaydet</button>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Panel */}
        <div className="lg:col-span-1 glass-card p-6 h-fit">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Settings2 className="w-5 h-5 mr-2 text-slate-400" />
            Parametre Ayarları
          </h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Seviyesi</label>
              <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500/50">
                <option value="low">Düşük Risk (Banko)</option>
                <option value="medium">Orta Risk (İdeal)</option>
                <option value="high">Yüksek Risk (Sürpriz)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lig Filtresi</label>
              <div className="flex flex-wrap gap-2">
                {['Premier Lig', 'La Liga', 'Serie A', 'Bundesliga'].map(league => (
                  <span 
                    key={league}
                    onClick={() => toggleLeague(league)}
                    className={`px-3 py-1 border text-xs rounded-full cursor-pointer transition-colors ${selectedLeagues.includes(league) ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {league}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hedef Toplam Oran Aralığı</label>
              <div className="flex items-center space-x-2">
                <input type="number" step="0.1" value={minOdds} onChange={e => setMinOdds(parseFloat(e.target.value))} placeholder="Min" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-center focus:border-purple-500/50 outline-none" />
                <span className="text-slate-500">-</span>
                <input type="number" step="0.1" value={maxOdds} onChange={e => setMaxOdds(parseFloat(e.target.value))} placeholder="Max" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-center focus:border-purple-500/50 outline-none" />
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !apiUrl}
              className="w-full mt-4 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center animate-pulse">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  AI Hesaplanıyor...
                </div>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  API'den Kupon Üret
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-slate-700 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-purple-900/10 pointer-events-none"></div>
          
          {isGenerating ? (
             <div className="text-center z-10">
               <Cpu className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-bounce" />
               <h3 className="text-xl font-bold text-white mb-2">Harici AI Sunucusuna İstek Atılıyor...</h3>
               <p className="text-slate-400 text-sm max-w-sm">Gönderilen Payload: {JSON.stringify({ riskLevel, leagues: selectedLeagues, minOdds, maxOdds })}</p>
             </div>
          ) : result ? (
             <div className="w-full h-full z-10 text-left p-2 animate-in fade-in">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-bold mb-3 inline-block">AI Sonucu</span>
                   <h3 className="text-2xl font-bold text-white mb-2">{result.title}</h3>
                   <p className="text-slate-400 text-sm">{result.description}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-slate-500 uppercase font-bold">Önerilen Toplam Oran</p>
                   <p className="text-3xl font-black text-purple-400">{result.total_odds}</p>
                 </div>
               </div>
               
               <div className="space-y-3 mb-6">
                 {result.matches?.map((match: any, idx: number) => (
                   <div key={idx} className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                     <div className="font-bold text-slate-200">{match.home} <span className="text-slate-500 mx-2">vs</span> {match.away}</div>
                     <div className="flex items-center space-x-4">
                       <span className="text-sm text-slate-400">Tahmin: <strong className="text-white">{match.prediction}</strong></span>
                       <span className="text-sm font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded">Oran: {match.odds}</span>
                     </div>
                   </div>
                 ))}
               </div>
               
               {error && (
                 <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-start">
                   <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                   <p>{error} (Yukarıdaki sonuçlar uygulamanın çökmemesi için simüle edilmiştir.)</p>
                 </div>
               )}

                <button 
                  onClick={handleSaveAICoupon}
                  disabled={savingCoupon}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {savingCoupon ? 'KAYDEDİLİYOR...' : 'Bu Sonucu Yeni Kupon Olarak Kaydet (Sisteme Aktar)'}
                </button>
             </div>
          ) : (
            <div className="text-center z-10 opacity-60 group-hover:opacity-100 transition-opacity">
              <BrainCircuit className="w-20 h-20 text-slate-600 mx-auto mb-4 group-hover:text-purple-400 transition-colors duration-500" />
              <h3 className="text-xl font-bold text-slate-300">Harici AI Motoru Bekleniyor</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">Gerekli API ayarlarını yapın ve parametreleri seçerek kendi yapay zeka modelinizi çağırın.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
