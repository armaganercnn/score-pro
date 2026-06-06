import React, { useState, useEffect } from 'react';
import { FileText, Save, Eye, Globe } from 'lucide-react';
import { supabase } from '../../supabase';

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState('about');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetchContent(activeTab);
  }, [activeTab]);

  const fetchContent = async (slug: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cms_pages')
      .select('content, updated_at')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 indicates no rows returned (which is fine for new pages)
      console.error('Error fetching CMS content:', error);
      setContent('');
      setLastUpdated(null);
    } else if (data) {
      setContent(data.content || '');
      setLastUpdated(data.updated_at);
    } else {
      setContent('');
      setLastUpdated(null);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const titleMap: Record<string, string> = {
      about: 'Hakkımızda',
      terms: 'Kullanım Koşulları',
      privacy: 'Gizlilik Politikası',
      faq: 'Sıkça Sorulan Sorular'
    };

    // Use upsert to insert or update based on the unique slug
    const { error } = await supabase
      .from('cms_pages')
      .upsert({ 
        slug: activeTab, 
        title: titleMap[activeTab] || 'Sayfa', 
        content: content, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'slug' });

    if (error) {
      alert('Kayıt sırasında hata oluştu: ' + error.message);
    } else {
      fetchContent(activeTab); // refresh lastUpdated
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="glass-card p-6 border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-transparent">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
          <FileText className="w-6 h-6 mr-3 text-blue-400" />
          İçerik Yönetimi (CMS)
        </h2>
        <p className="text-slate-400 text-sm">
          Mobil uygulamadaki "Hakkımızda", "Kullanım Koşulları", "SSS" gibi statik sayfaların metinlerini güncellemenizi sağlar. Uygulama güncellenmeden anında yayına alınır.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Sidebar Nav */}
        <div className="md:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('about')}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'about' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
          >
            Hakkımızda
          </button>
          <button 
            onClick={() => setActiveTab('terms')}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'terms' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
          >
            Kullanım Koşulları
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'privacy' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
          >
            Gizlilik Politikası
          </button>
          <button 
            onClick={() => setActiveTab('faq')}
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'faq' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
          >
            Sıkça Sorulan Sorular (SSS)
          </button>
        </div>

        {/* Editor Area */}
        <div className="md:col-span-3 glass-card flex flex-col h-full min-h-[500px]">
          <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/30">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center">
              <Globe className="w-4 h-4 mr-2 text-blue-400" />
              {activeTab === 'about' && 'Hakkımızda Sayfasını Düzenle'}
              {activeTab === 'terms' && 'Kullanım Koşullarını Düzenle'}
              {activeTab === 'privacy' && 'Gizlilik Politikasını Düzenle'}
              {activeTab === 'faq' && 'SSS Sayfasını Düzenle'}
            </h3>
            <div className="flex space-x-2">
              <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded transition-colors flex items-center">
                <Eye className="w-3.5 h-3.5 mr-1" /> Önizleme
              </button>
              <button 
                onClick={handleSave}
                disabled={loading || saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-colors flex items-center disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 mr-1" /> {saving ? 'Kaydediliyor...' : 'Kaydet ve Yayınla'}
              </button>
            </div>
          </div>

          <div className="flex-1 p-0 relative">
            {loading && (
               <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10 backdrop-blur-sm">
                 <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
               </div>
            )}
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[400px] p-6 bg-transparent border-none focus:outline-none text-slate-300 leading-relaxed custom-scrollbar resize-none font-mono text-sm"
              placeholder={`<h1>${activeTab.toUpperCase()} Sayfası İçeriği</h1>\n\n<p>Buraya HTML veya düz metin yazabilirsiniz...</p>`}
            ></textarea>
          </div>
          
          <div className="p-3 bg-slate-900/50 border-t border-slate-800/50 text-xs text-slate-500 flex justify-between">
            <span>HTML etiketleri desteklenmektedir.</span>
            <span>
              {lastUpdated ? `Son güncelleme: ${new Date(lastUpdated).toLocaleString('tr-TR')}` : 'Henüz içerik girilmemiş.'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
