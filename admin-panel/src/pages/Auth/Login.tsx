import React, { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuth } from '../../components/Auth/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#30D158]/5 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#0A84FF]/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="glass-card w-full max-w-md p-8 relative z-10 border-white/5 shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="w-7 h-7 text-[#30D158]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            SCORE<span className="text-[#30D158]">PRO</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 font-medium">Güvenli Yönetici Girişi</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] p-3.5 rounded-xl flex items-center text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">E-posta</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white transition-all outline-none placeholder:text-neutral-700 text-sm focus:border-[#30D158]/40 focus:ring-4 focus:ring-[#30D158]/10"
              placeholder="admin@scorepro.com"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Şifre</label>
            <div className="relative">
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white transition-all outline-none placeholder:text-neutral-700 text-sm focus:border-[#30D158]/40 focus:ring-4 focus:ring-[#30D158]/10"
                placeholder="••••••••"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="apple-button-primary w-full py-3 mt-6 text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
            ) : (
              <>
                Sisteme Giriş Yap
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-neutral-500 font-semibold tracking-wider uppercase">
            ScorePro Admin Panel &copy; 2026
          </p>
        </div>

      </div>
    </div>
  );
}
