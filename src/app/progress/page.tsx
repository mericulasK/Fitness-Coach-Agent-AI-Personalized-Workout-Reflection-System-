"use client";

import React, { useState, useEffect } from 'react';
import { useFitnessStore } from '@/store/useFitnessStore';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Scale, Activity, Plus, Loader2, Dumbbell, Sparkles } from 'lucide-react';

export default function ProgressPage() {
  const { loading } = useFitnessStore();
  const [weightInput, setWeightInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Chart data state
  const [weightHistory, setWeightHistory] = useState<{ date: string; weightKg: number }[]>([]);
  const [volumeHistory, setVolumeHistory] = useState<{ date: string; volume: number }[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/progress');
      const data = await res.json();
      if (data.success) {
        setWeightHistory(data.weightHistory || []);
        setVolumeHistory(data.volumeHistory || []);
      }
    } catch (err) {
      console.error('Error fetching progress data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightInput || parseFloat(weightInput) <= 0) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg: parseFloat(weightInput) })
      });
      if (res.ok) {
        setWeightInput('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm">Grafikler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Gelişim Analizi
            <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kilonuz ve antrenman hacimleriniz grafiksel olarak takip edilir.
          </p>
        </div>

        {/* Quick Weight Logger Form */}
        <form onSubmit={handleLogWeight} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-44">
            <Scale className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="number"
              step="0.1"
              required
              placeholder="Yeni Kilo Gir (kg)"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-zinc-900 border border-white/5 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                Kaydet
                <Plus className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weight Line Chart */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between min-h-[360px]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-emerald-400" />
              Kilo Takip Grafiği (Bodyweight Trend)
            </h2>
            <span className="text-[10px] text-zinc-500">Zaman içindeki vücut ağırlığı değişiminiz.</span>
          </div>

          <div className="h-56 mt-4 w-full">
            {weightHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis domain={['dataMin - 3', 'dataMax + 3']} stroke="#71717a" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: 10 }}
                    itemStyle={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weightKg" 
                    name="Kilo"
                    stroke="#10b981" 
                    strokeWidth={2}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                Veri bulunamadı. Lütfen yeni bir kilo kaydı ekleyin.
              </div>
            )}
          </div>
        </div>

        {/* Volume Bar Chart */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between min-h-[360px]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4 text-emerald-400" />
              Antrenman Toplam Hacmi (Training Volume)
            </h2>
            <span className="text-[10px] text-zinc-500">Antrenman bazında kaldırılan toplam yük (Set × Tekrar × Ağırlık).</span>
          </div>

          <div className="h-56 mt-4 w-full">
            {volumeHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    labelStyle={{ color: '#a1a1aa', fontSize: 10 }}
                    itemStyle={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="volume" 
                    name="Hacim (kg)"
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                Veri bulunamadı. Antrenmanlarınızı tamamlayarak hacim toplayın!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-zinc-900 border border-white/5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Başlangıç Ağırlığı</span>
          <span className="text-xl font-black text-white mt-1 block">
            {weightHistory.length > 0 ? `${weightHistory[0].weightKg} kg` : '-'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-white/5">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Güncel Ağırlık</span>
          <span className="text-xl font-black text-white mt-1 block">
            {weightHistory.length > 0 ? `${weightHistory[weightHistory.length - 1].weightKg} kg` : '-'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 flex justify-between items-center">
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Değişim Oranı</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">
              {weightHistory.length >= 2 
                ? `${(weightHistory[weightHistory.length - 1].weightKg - weightHistory[0].weightKg).toFixed(1)} kg` 
                : '0 kg'}
            </span>
          </div>
          <Sparkles className="h-5 w-5 text-emerald-400 fill-emerald-500/10 animate-pulse" />
        </div>
      </div>

    </div>
  );
}
