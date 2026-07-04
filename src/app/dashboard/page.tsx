"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFitnessStore } from '@/store/useFitnessStore';
import { motion } from 'framer-motion';
import { 
  Play, Dumbbell, Flame, CheckCircle2, AlertTriangle, 
  HelpCircle, RefreshCw, ChevronRight, Terminal, Heart, Scale, Sparkles 
} from 'lucide-react';
import { MEDICAL_DISCLAIMER } from '@/lib/agent/guardrails';

export default function DashboardPage() {
  const router = useRouter();
  const { 
    profile, plan, fetchProfile, fetchPlan, generatePlan, 
    loading, error, warnings, developerTrace 
  } = useFitnessStore();

  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchPlan();
  }, []);

  useEffect(() => {
    // If no profile exists, push back to onboarding home page
    if (!profile && !loading) {
      router.push('/');
    }
  }, [profile, loading, router]);

  const handleRegenerate = async () => {
    const success = await generatePlan(true);
    if (success) {
      fetchPlan();
    }
  };

  if (loading || !profile || !plan) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Dumbbell className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm">Verileriniz yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Find the next pending workout day
  const todayWorkout = plan.days.find(d => d.status === 'pending');
  const completedCount = plan.days.filter(d => d.status === 'completed').length;
  const progressPercent = Math.round((completedCount / plan.days.length) * 100);

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome & Motivational Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Tekrar hoş geldin, <span className="text-emerald-400">Sporcu</span>!
            <Sparkles className="h-5 w-5 text-yellow-400 fill-yellow-500 animate-pulse" />
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Agent Haftası {plan.weekNumber} {plan.isDeloadWeek ? '(Hafif Haftası - Deload)' : ''} planınız devrede.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-right">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">BMI</span>
            <span className="text-sm font-bold text-white">{profile.bmi}</span>
          </div>
          <div className="flex flex-col items-end px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-right">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Günlük TDEE</span>
            <span className="text-sm font-bold text-emerald-400">{profile.tdee} kcal</span>
          </div>
          <div className="flex flex-col items-end px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 text-right">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase">Kilo</span>
            <span className="text-sm font-bold text-zinc-300">{profile.weightKg} kg</span>
          </div>
        </div>
      </div>

      {/* Safety Warnings Banner */}
      {warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-bold block mb-1">Yapay Zeka Güvenlik Uyarıları (Guardrail Alerts)</span>
            <ul className="list-disc pl-4 space-y-1">
              {warnings.map((warn, i) => <li key={i}>{warn}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Hero Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spotlight Today's Workout Card */}
        <div className="lg:col-span-2 flex flex-col justify-between p-6 rounded-2xl glass-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
                Günün Antrenmanı
              </span>
              {plan.isDeloadWeek && (
                <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                  Deload Aktif (-20% Yük)
                </span>
              )}
            </div>

            {todayWorkout ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{todayWorkout.focus}</h2>
                  <p className="text-zinc-400 text-xs mt-1">
                    Bu antrenman, hedefinize göre planlanmış {todayWorkout.exercises.length} adet güvenli egzersiz içerir.
                  </p>
                </div>

                <div className="divide-y divide-white/5 max-h-[180px] overflow-y-auto pr-1">
                  {todayWorkout.exercises.map((ex) => (
                    <div key={ex.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="font-semibold text-zinc-200">{ex.exerciseName}</span>
                      </div>
                      <div className="text-zinc-400">
                        {ex.targetSets} set × {ex.targetReps} tekrar @ <span className="text-emerald-400 font-medium">{ex.targetWeight} kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Harika İş!</h3>
                <p className="text-zinc-400 text-xs max-w-sm mx-auto mt-1">
                  Haftalık antrenman planınızdaki tüm günleri tamamladınız. AI Koç yeni haftayı hazırlamaya hazır!
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
            {todayWorkout ? (
              <Link 
                href={`/workout/${todayWorkout.id}`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
              >
                Antrenmana Başla
                <Play className="h-4 w-4 fill-black" />
              </Link>
            ) : (
              <button 
                onClick={handleRegenerate}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all cursor-pointer"
              >
                Yeni Haftayı Başlat
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              onClick={handleRegenerate}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Programı Yeniden Hesapla
            </button>
          </div>
        </div>

        {/* Right Column: Weekly Breakdown & Reflection summary */}
        <div className="flex flex-col justify-between p-6 rounded-2xl glass-card">
          <div>
            <h3 className="text-sm font-bold text-white mb-3">Haftalık İlerleme</h3>
            <div className="flex items-center gap-4 mb-5">
              <div className="relative h-14 w-14 flex items-center justify-center rounded-full bg-zinc-900 border-2 border-white/10">
                <span className="text-xs font-bold text-emerald-400">{progressPercent}%</span>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block font-semibold">Tamamlanan Günler</span>
                <span className="text-sm font-bold text-white">{completedCount} / {plan.days.length} Antrenman</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {plan.days.map((day) => (
                <div 
                  key={day.id} 
                  className={`p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all ${
                    day.status === 'completed' 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                      : 'bg-zinc-900/50 border-white/5 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${day.status === 'completed' ? 'text-emerald-500 fill-emerald-500/10' : 'text-zinc-700'}`} />
                    <span className="font-semibold">Gün {day.dayIndex + 1}: {day.focus}</span>
                  </div>
                  <span className="text-[10px] opacity-80">
                    {day.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/5 text-[10px] text-zinc-500 italic">
            * Antrenman bittikten sonra set RPE girdilerinize göre bir sonraki program otomatik güncellenir.
          </div>
        </div>

      </div>

      {/* Agent Trace Console Collapse Box */}
      <div className="border border-white/5 rounded-xl overflow-hidden bg-black/30">
        <button 
          onClick={() => setShowTrace(!showTrace)}
          className="w-full flex items-center justify-between p-3 px-4 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-xs font-bold text-zinc-400"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span>Developer AI Trace Console (Ajan Karar Günlükleri)</span>
          </div>
          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-mono">
            {showTrace ? 'Kapat' : 'Detayları Göster'}
          </span>
        </button>

        {showTrace && (
          <div className="p-4 border-t border-white/5 bg-black/60 font-mono text-[11px] space-y-3 max-h-[300px] overflow-y-auto">
            {developerTrace.length === 0 ? (
              <div className="text-zinc-600">Henüz bir ajan karar izi üretilmedi. Programınızı yeniden hesaplayarak kararları görebilirsiniz.</div>
            ) : (
              developerTrace.map((t, idx) => (
                <div key={idx} className="border-l border-emerald-500/30 pl-2 text-zinc-300">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-0.5">
                    <span>Tool: {t.tool}</span>
                    <span className={`px-1.5 rounded uppercase font-bold text-[9px] ${
                      t.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' :
                      t.status === 'warning' ? 'bg-orange-500/10 text-orange-400' :
                      t.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="font-semibold text-zinc-200">{t.action}</div>
                  <div className="text-zinc-400 text-[10px] mt-0.5">{t.details}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sticky Disclaimer */}
      <div className="text-center p-3 rounded-lg bg-zinc-900/40 border border-white/5 text-[10px] text-zinc-600 leading-relaxed">
        {MEDICAL_DISCLAIMER}
      </div>
    </div>
  );
}
