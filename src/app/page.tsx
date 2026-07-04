"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFitnessStore } from '@/store/useFitnessStore';
import { motion } from 'framer-motion';
import { 
  Dumbbell, User, Target, Calendar, AlertTriangle, 
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, 
  BrainCircuit, Sparkles, Weight
} from 'lucide-react';
import { MEDICAL_DISCLAIMER } from '@/lib/agent/guardrails';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, saveProfile, loading, error, clearError, developerTrace } = useFitnessStore();
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Wizard state variables
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('erkek');
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(70);
  const [goal, setGoal] = useState<'kas kütlesi' | 'yağ yakımı' | 'güç' | 'genel fitness' | 'dayanıklılık'>('kas kütlesi');
  const [experienceLevel, setExperienceLevel] = useState<'yeni başlayan' | 'orta' | 'ileri'>('orta');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  
  // Array selections
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['bodyweight', 'dumbbell']);
  const [selectedInjuries, setSelectedInjuries] = useState<string[]>([]);
  
  // Show agent processing log
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && profile && !redirecting && !isProcessing) {
      setRedirecting(true);
      router.replace('/dashboard');
    }
  }, [profile, mounted, redirecting, isProcessing, router]);

  const handleEquipmentToggle = (eq: string) => {
    setSelectedEquipment(prev => 
      prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
    );
  };

  const handleInjuryToggle = (inj: string) => {
    setSelectedInjuries(prev => 
      prev.includes(inj) ? prev.filter(i => i !== inj) : [...prev, inj]
    );
  };

  const calculateBMI = () => {
    const hM = heightCm / 100;
    return (weightKg / (hM * hM)).toFixed(1);
  };

  const getBMICategory = (bmiVal: number) => {
    if (bmiVal < 18.5) return { label: 'Zayıf', color: 'text-blue-400' };
    if (bmiVal < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (bmiVal < 30) return { label: 'Fazla Kilolu', color: 'text-orange-400' };
    return { label: 'Obez', color: 'text-red-400' };
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    clearError();
    setIsProcessing(true);
    
    const profileData = {
      id: 'default_user',
      age,
      gender,
      heightCm,
      weightKg,
      goal,
      experienceLevel,
      daysPerWeek,
      equipment: selectedEquipment,
      injuries: selectedInjuries
    };

    // Run AI orchestrator
    const success = await saveProfile(profileData);
    
    if (success) {
      // Allow user to read the agent logs before auto-forwarding (4 second trace view)
      // Set redirecting=true immediately to prevent the useEffect profile watcher
      // from triggering a premature redirect while isProcessing is shown.
      setTimeout(() => {
        setIsProcessing(false);
        setRedirecting(true);
        router.replace('/dashboard');
      }, 4000);
    } else {
      setIsProcessing(false);
    }
  };

  // SSR HYDRATION SAFETY: Return a consistent loading skeleton until client is mounted.
  // IMPORTANT: Both server and client render this same spinner initially (mounted=false on both).
  // After hydration, useEffect fires, setMounted(true), and re-renders to the full wizard.
  // This avoids the server/client DOM mismatch that caused the hydration error.
  if (!mounted || redirecting || (profile && !isProcessing)) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm">
            {redirecting || profile ? 'Panelinize yönlendiriliyorsunuz...' : 'Yükleniyor...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center max-w-2xl mx-auto py-10 w-full">
      {/* Onboarding Header */}
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-4">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Kişisel Fitness Koçunuz
        </h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-md">
          Yaşam tarzınıza, ekipmanlarınıza ve sağlık durumunuza göre uyarlanan yerel yapay zeka motoru.
        </p>
      </div>

      {/* Progress Line */}
      <div className="w-full mb-8">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>Aşama {step} / {totalSteps}</span>
          <span className="font-semibold text-emerald-400">
            {Math.round((step / totalSteps) * 100)}% Tamamlandı
          </span>
        </div>
        <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
            initial={{ width: 0 }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="w-full glass-card rounded-2xl p-6 md:p-8 min-h-[420px] flex flex-col justify-between relative overflow-hidden">
        {isProcessing ? (
          /* Live Agent Debug Screen */
          <div className="flex flex-col flex-1 justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-semibold tracking-wider uppercase">Agent Akıl Yürütme Konsolu (Trace Log)</span>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                Yapay zeka planlama motoru (Orchestrator) kural setlerini, BMI/TDEE formüllerini ve sakatlık kısıtlamalarını çalıştırıyor:
              </p>
              <div className="bg-black/60 border border-white/5 rounded-lg p-4 font-mono text-[11px] h-60 overflow-y-auto space-y-2.5">
                {developerTrace.length === 0 ? (
                  <div className="text-zinc-600 animate-pulse">Orkestratör yükleniyor...</div>
                ) : (
                  developerTrace.map((t, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.4 }}
                      className="border-l-2 border-emerald-500/40 pl-2"
                    >
                      <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                        <span>[{t.tool}]</span>
                        <span className={`text-[9px] uppercase font-bold px-1 rounded ${
                          t.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' :
                          t.status === 'warning' ? 'bg-orange-500/10 text-orange-400' :
                          t.status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <div className="text-zinc-300 font-semibold">{t.action}</div>
                      <div className="text-zinc-400 text-[10px] italic">{t.details}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <span className="text-xs text-zinc-500 flex items-center justify-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                Profil ve antrenman programınız başarıyla hafızaya kaydediliyor...
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1">
            {/* Steps Container */}
            <div className="flex-1 flex flex-col justify-center">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center md:text-left">
                    <h2 className="text-xl font-bold flex items-center gap-2 justify-center md:justify-start">
                      <User className="h-5 w-5 text-emerald-400" />
                      Temel Bilgileriniz
                    </h2>
                    <p className="text-zinc-400 text-xs mt-1">Yaşınız ve biyolojik cinsiyetiniz metabolizma hesaplamaları için gereklidir.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Yaşınız ({age})</label>
                      <input 
                        type="range" 
                        min="12" 
                        max="80" 
                        value={age} 
                        onChange={(e) => setAge(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                        <span>12</span>
                        <span>80</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Biyolojik Cinsiyet</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setGender('erkek')}
                          className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                            gender === 'erkek'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 glow-primary'
                              : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/10'
                          }`}
                        >
                          Erkek
                        </button>
                        <button
                          onClick={() => setGender('kadın')}
                          className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                            gender === 'kadın'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 glow-primary'
                              : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/10'
                          }`}
                        >
                          Kadın
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Weight className="h-5 w-5 text-emerald-400" />
                      Vücut Ölçüleriniz
                    </h2>
                    <p className="text-zinc-400 text-xs mt-1">Boy ve kilonuz yardımıyla BMI (Vücut Kitle Endeksi) değeriniz otomatik hesaplanır.</p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span>Boy</span>
                        <span className="text-emerald-400 font-bold">{heightCm} cm</span>
                      </label>
                      <input 
                        type="range" 
                        min="120" 
                        max="220" 
                        value={heightCm} 
                        onChange={(e) => setHeightCm(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="flex justify-between text-xs font-semibold text-zinc-400 mb-1">
                        <span>Ağırlık</span>
                        <span className="text-emerald-400 font-bold">{weightKg} kg</span>
                      </label>
                      <input 
                        type="range" 
                        min="40" 
                        max="160" 
                        value={weightKg} 
                        onChange={(e) => setWeightKg(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Live BMI Preview */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-white/5">
                      <span className="text-xs text-zinc-400 font-medium">Hesaplanan BMI (Vücut Kitle Endeksi)</span>
                      <div className="text-right">
                        <span className="text-lg font-black text-white mr-1.5">{calculateBMI()}</span>
                        <span className={`text-xs font-semibold ${getBMICategory(parseFloat(calculateBMI())).color}`}>
                          ({getBMICategory(parseFloat(calculateBMI())).label})
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Target className="h-5 w-5 text-emerald-400" />
                      Hedefiniz Nedir?
                    </h2>
                    <p className="text-zinc-400 text-xs mt-1">Egzersiz set ve tekrar katsayıları seçtiğiniz hedefe göre dinamik planlanacaktır.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                    {[
                      { key: 'kas kütlesi', title: 'Kas Kütlesi (Hipertrofi)', desc: '8-12 tekrar aralığı, kas inşası öncelikli hacimli setler.' },
                      { key: 'yağ yakımı', title: 'Yağ Yakımı (Definisyon)', desc: '12-15 yüksek tekrar, kısa dinlenme süreleri ve kalori tüketimi.' },
                      { key: 'güç', title: 'Güç / Powerlifting', desc: '4-6 düşük tekrar, yüksek ağırlık yüklemesi ve uzun dinlenme.' },
                      { key: 'genel fitness', title: 'Genel Fitness', desc: '10-12 tekrar, esneklik, kondisyon ve kas tonusu.' },
                      { key: 'dayanıklılık', title: 'Dayanıklılık', desc: '15+ çoklu tekrar, kas kondisyonunu ve oksijen kapasitesini artırma.' }
                    ].map((g) => (
                      <button
                        key={g.key}
                        onClick={() => setGoal(g.key as 'kas kütlesi' | 'yağ yakımı' | 'güç' | 'genel fitness' | 'dayanıklılık')}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          goal === g.key
                            ? 'bg-emerald-500/10 border-emerald-500 glow-primary'
                            : 'bg-zinc-900 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${goal === g.key ? 'text-emerald-400' : 'text-zinc-200'}`}>{g.title}</span>
                        <span className="text-[10px] text-zinc-400 mt-1">{g.desc}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-emerald-400" />
                      Antrenman Sıklığı ve Deneyim
                    </h2>
                    <p className="text-zinc-400 text-xs mt-1">Haftalık gün sayınıza göre split program (İtiş-Çekiş-Bacak veya Fullbody) oluşturulur.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Haftada Kaç Gün Antrenman Yapabilirsiniz? ({daysPerWeek} Gün)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((d) => (
                          <button
                            key={d}
                            onClick={() => setDaysPerWeek(d)}
                            className={`flex-1 py-3 rounded-lg border text-sm font-semibold transition-all ${
                              daysPerWeek === d
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                : 'bg-zinc-900 border-white/5 text-zinc-400'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Deneyim Seviyeniz</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'yeni başlayan', label: 'Yeni Başlayan' },
                          { key: 'orta', label: 'Orta Seviye' },
                          { key: 'ileri', label: 'İleri Seviye' }
                        ].map((exp) => (
                          <button
                            key={exp.key}
                            onClick={() => setExperienceLevel(exp.key as 'yeni başlayan' | 'orta' | 'ileri')}
                            className={`py-3 rounded-lg border text-xs font-medium transition-all ${
                              experienceLevel === exp.key
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                : 'bg-zinc-900 border-white/5 text-zinc-400'
                            }`}
                          >
                            {exp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-emerald-400" />
                      Ekipman ve Kısıtlamalar
                    </h2>
                    <p className="text-zinc-400 text-xs mt-1">Mevcut araçlarınıza göre hareket havuzundan seçim yapılır, sakatlıklar ise elenir.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Erişilebilir Ekipmanlarınız</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'bodyweight', label: 'Vücut Ağırlığı' },
                          { key: 'dumbbell', label: 'Dambıllar' },
                          { key: 'barbell', label: 'Halter (Barbell)' },
                          { key: 'cables', label: 'Kablolar' },
                          { key: 'machine', label: 'Spor Salonu Makineleri' }
                        ].map((eq) => {
                          const active = selectedEquipment.includes(eq.key);
                          return (
                            <button
                              key={eq.key}
                              onClick={() => handleEquipmentToggle(eq.key)}
                              className={`p-2.5 rounded-lg border text-xs transition-all ${
                                active
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold'
                                  : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-white/10'
                              }`}
                            >
                              {eq.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Eklem Ağrıları / Sakatlık / Kısıtlamalar (Varsa)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { key: 'diz sorunu', label: 'Diz' },
                          { key: 'bel sorunu', label: 'Bel' },
                          { key: 'omuz sorunu', label: 'Omuz' },
                          { key: 'bilek sorunu', label: 'El Bileği' }
                        ].map((inj) => {
                          const active = selectedInjuries.includes(inj.key);
                          return (
                            <button
                              key={inj.key}
                              onClick={() => handleInjuryToggle(inj.key)}
                              className={`p-2 rounded-lg border text-xs transition-all flex items-center justify-between ${
                                active
                                  ? 'bg-red-500/10 border-red-500/50 text-red-400 font-semibold'
                                  : 'bg-zinc-900 border-white/5 text-zinc-400'
                              }`}
                            >
                              <span>{inj.label}</span>
                              {active && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 6 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      Son Kontrol ve Onay
                    </h2>
                    <p className="text-zinc-400 text-xs mt-1">Lütfen girdiğiniz parametreleri onaylayıp planı oluşturun.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-900 border border-white/5 text-xs">
                    <div>
                      <span className="text-zinc-500 block">Kullanıcı Yaş/Cinsiyet:</span>
                      <span className="font-semibold text-white">{age} Yaş, {gender === 'erkek' ? 'Erkek' : 'Kadın'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Boy & Kilo (BMI):</span>
                      <span className="font-semibold text-white">{heightCm}cm / {weightKg}kg ({calculateBMI()})</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Seçilen Hedef:</span>
                      <span className="font-semibold text-emerald-400 capitalize">{goal}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Sıklık & Seviye:</span>
                      <span className="font-semibold text-white">Haftada {daysPerWeek} Gün, {experienceLevel}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-zinc-500 block">Ekipman Havuzu:</span>
                      <span className="font-semibold text-zinc-300 text-[10px]">
                        {selectedEquipment.join(', ') || 'Hiçbiri (Sadece vücut ağırlığı)'}
                      </span>
                    </div>
                    {selectedInjuries.length > 0 && (
                      <div className="col-span-2 text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>Kısıtlamalar: {selectedInjuries.join(', ')} (Agent bu hareketleri pasifize edecektir)</span>
                      </div>
                    )}
                  </div>

                  {/* Medical Disclaimer Banner */}
                  <div className="p-3 rounded-lg bg-zinc-800/40 border border-white/5 text-[10px] text-zinc-500 leading-relaxed">
                    {MEDICAL_DISCLAIMER}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/5">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  step === 1
                    ? 'border-transparent text-zinc-600 cursor-not-allowed'
                    : 'border-white/5 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Geri
              </button>

              {error && (
                <span className="text-xs text-red-400 font-medium px-2 truncate max-w-[200px] sm:max-w-xs">{error}</span>
              )}

              {step === totalSteps ? (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 rounded-lg shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Hazırlanıyor...
                    </>
                  ) : (
                    <>
                      Planımı Oluştur
                      <Sparkles className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all cursor-pointer"
                >
                  İleri
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
