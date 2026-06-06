import React, { useState, useEffect } from 'react';
import { Users, Star, Ticket, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../supabase';

const mockData = [
  { name: 'Pzt', gelir: 0 },
  { name: 'Sal', gelir: 0 },
  { name: 'Çar', gelir: 0 },
  { name: 'Per', gelir: 0 },
  { name: 'Cum', gelir: 0 },
  { name: 'Cmt', gelir: 0 },
  { name: 'Paz', gelir: 0 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    activeCoupons: 0,
    monthlyRevenue: '0 ₺'
  });
  const [chartData, setChartData] = useState(mockData);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      try {
        // Total Users
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        // Premium Users
        const { count: premiumUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gt('premium_until', new Date().toISOString());

        // Active Coupons
        const { count: activeCoupons } = await supabase
          .from('coupons')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());

        // Revenue (Sum of financial transactions) and Chart Data
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const { data: revenueData } = await supabase
          .from('financial_transactions')
          .select('amount, created_at')
          .eq('status', 'completed');
        
        let totalRevenue = 0;
        
        // Prepare dynamic chart data based on days of week
        const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        const weeklyDataMap = new Map();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          weeklyDataMap.set(d.toDateString(), { name: days[d.getDay()], gelir: 0, date: d });
        }

        if (revenueData) {
          revenueData.forEach(tx => {
            totalRevenue += Number(tx.amount);
            
            const txDate = new Date(tx.created_at);
            if (txDate >= last7Days) {
              const dateString = txDate.toDateString();
              if (weeklyDataMap.has(dateString)) {
                weeklyDataMap.get(dateString).gelir += Number(tx.amount);
              }
            }
          });
        }

        const formattedChartData = Array.from(weeklyDataMap.values()).map(item => ({
          name: item.name,
          gelir: item.gelir
        }));

        setChartData(formattedChartData);

        setStats({
          totalUsers: totalUsers || 0,
          premiumUsers: premiumUsers || 0,
          activeCoupons: activeCoupons || 0,
          monthlyRevenue: `${totalRevenue.toLocaleString('tr-TR')} ₺`
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Sistem Verileri Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Welcome Banner */}
      <div className="glass-card p-8 bg-gradient-to-r from-emerald-900/40 to-transparent border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 glow-text">Hoş Geldiniz, Yönetici!</h2>
            <p className="text-slate-400">ScorePro sisteminin anlık durumu mükemmel görünüyor. İşte bugünün özeti.</p>
          </div>
          <div className="hidden md:flex p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Activity className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1 */}
        <div className="glass-card p-6 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-emerald-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm font-medium">Toplam Kullanıcı</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.totalUsers.toLocaleString('tr-TR')}</h3>
            <div className="flex items-center text-xs text-emerald-400 font-medium">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>%12 geçen aya göre</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-6 group hover:border-amber-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Star className="w-16 h-16 text-amber-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-sm font-medium">Premium Üyeler</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.premiumUsers.toLocaleString('tr-TR')}</h3>
            <div className="flex items-center text-xs text-emerald-400 font-medium">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>%5.4 geçen aya göre</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-6 group hover:border-blue-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Ticket className="w-16 h-16 text-blue-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Ticket className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm font-medium">Aktif Kuponlar</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.activeCoupons}</h3>
            <div className="flex items-center text-xs text-slate-500 font-medium">
              <span>Yayında olan kupon sayısı</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-6 group hover:border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="relative z-10">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm font-medium">Aylık Tahmini Gelir</span>
            </div>
            <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">
              {stats.monthlyRevenue}
            </h3>
            <div className="flex items-center text-xs text-red-400 font-medium">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              <span>%1.2 geçen haftaya göre</span>
            </div>
          </div>
        </div>

      </div>
      
      {/* Charts Area */}
      <div className="glass-card p-6 h-[400px] flex flex-col relative overflow-hidden group">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-emerald-400" />
          Haftalık Gelir Özeti (₺)
        </h3>
        <div className="flex-1 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#475569" tick={{fill: '#94a3b8'}} />
              <YAxis stroke="#475569" tick={{fill: '#94a3b8'}} />
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '0.5rem' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area type="monotone" dataKey="gelir" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGelir)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
