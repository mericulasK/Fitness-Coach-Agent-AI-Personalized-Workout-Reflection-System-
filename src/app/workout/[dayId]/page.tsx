"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFitnessStore } from '@/store/useFitnessStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Dumbbell, Timer, ArrowLeft, 
  ChevronRight, Plus, Minus, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SetInput {
  weight: number;
  reps: number;
  rpe: number;
  logged: boolean;
}

export default function WorkoutSessionPage() {
  const router = useRouter();
  const params = useParams();
  const dayId = params.dayId as string;

  const { plan, fetchPlan, logExercise, loading, planFetched } = useFitnessStore();

  const [activeExIdx, setActiveExIdx] = useState(0);
  
  // Sets inputs map for each exercise: exerciseId -> array of sets
  const [setsMap, setSetsMap] = useState<Record<string, SetInput[]>>({});
  
  // Timer States
  const [timerMax, setTimerMax] = useState(60);
  const [timerVal, setTimerVal] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Workout completed modal
  const [workoutFinished, setWorkoutFinished] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  useEffect(() => {
    if (planFetched && !plan && !loading) {
      router.push('/dashboard');
    }
  }, [planFetched, plan, loading, router]);

  // Initialize Sets state when plan is loaded
  useEffect(() => {
    if (plan) {
      const activeDay = plan.days.find(d => d.id === dayId);
      if (activeDay) {
        const initialMap: Record<string, SetInput[]> = {};
        activeDay.exercises.forEach(ex => {
          // Pre-populate sets
          const completed = ex.completedLog;
          if (completed) {
            initialMap[ex.id] = completed.actualWeight.map((w, idx) => ({
              weight: w,
              reps: completed.actualReps[idx],
              rpe: completed.rpe[idx],
              logged: true
            }));
          } else {
            initialMap[ex.id] = Array.from({ length: ex.targetSets }).map(() => ({
              weight: ex.targetWeight,
              reps: ex.targetReps,
              rpe: 8, // RPE 8 is standard default
              logged: false
            }));
          }
        });
        setSetsMap(initialMap);
      }
    }
  }, [plan, dayId]);

  // Timer interval control
  useEffect(() => {
    if (isTimerRunning && timerVal > 0) {
      timerRef.current = setTimeout(() => {
        setTimerVal(prev => prev - 1);
      }, 1000);
    } else if (timerVal === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      // Play a small beep or haptic indicator if supported
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerVal, isTimerRunning]);

  if (!plan) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Dumbbell className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const activeDay = plan.days.find(d => d.id === dayId);
  if (!activeDay) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Antrenman günü bulunamadı.
      </div>
    );
  }

  const activeEx = activeDay.exercises[activeExIdx];
  const activeExSets = activeEx ? (setsMap[activeEx.id] || []) : [];

  const handleSetChange = (setIdx: number, field: keyof SetInput, val: number) => {
    setSetsMap(prev => {
      const arr = [...(prev[activeEx.id] || [])];
      arr[setIdx] = {
        ...arr[setIdx],
        [field]: val
      };
      return {
        ...prev,
        [activeEx.id]: arr
      };
    });
  };

  const startTimer = (durationSeconds: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimerMax(durationSeconds);
    setTimerVal(durationSeconds);
    setIsTimerRunning(true);
  };

  const handleLogSet = (setIdx: number) => {
    setSetsMap(prev => {
      const arr = [...(prev[activeEx.id] || [])];
      arr[setIdx] = {
        ...arr[setIdx],
        logged: true
      };
      return {
        ...prev,
        [activeEx.id]: arr
      };
    });

    // Start rest timer (e.g. 60 seconds)
    startTimer(60);
  };

  const handleLogExercise = async () => {
    if (!activeEx || !activeExSets) return;

    const actualSets = activeExSets.map((s, idx) => idx + 1);
    const actualReps = activeExSets.map(s => s.reps);
    const actualWeight = activeExSets.map(s => s.weight);
    const rpe = activeExSets.map(s => s.rpe);

    const success = await logExercise({
      exerciseId: activeEx.id,
      actualSets,
      actualReps,
      actualWeight,
      rpe,
      notes: ''
    });

    if (success) {
      // Check if there is a next exercise
      if (activeExIdx < activeDay.exercises.length - 1) {
        setActiveExIdx(prev => prev + 1);
      } else {
        // Workout Finished! Trigger celebration
        triggerCelebration();
      }
    }
  };

  const triggerCelebration = () => {
    setWorkoutFinished(true);
    // Trigger canvas confetti
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#34d399', '#60a5fa']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#34d399', '#60a5fa']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // Calculate circular stroke values
  const strokeRadius = 40;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = isTimerRunning
    ? strokeCircumference - (timerVal / timerMax) * strokeCircumference
    : strokeCircumference;

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 max-w-4xl mx-auto w-full pb-10">
      
      {/* Exercises Sidebar Navigator */}
      <div className="w-full md:w-80 flex flex-col gap-3">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors py-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Panele Geri Dön
        </button>

        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="border-b border-white/5 pb-2">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Antrenman Akışı</span>
            <h2 className="text-sm font-bold text-white mt-0.5">{activeDay.focus}</h2>
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {activeDay.exercises.map((ex, idx) => {
              const isActive = idx === activeExIdx;
              const isLogged = !!ex.completedLog;
              
              return (
                <button
                  key={ex.id}
                  onClick={() => setActiveExIdx(idx)}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-semibold glow-primary'
                      : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] text-zinc-500 font-mono">#{idx+1}</span>
                    <span className="truncate">{ex.exerciseName}</span>
                  </div>
                  {isLogged ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="text-[9px] text-zinc-500 font-mono">{ex.targetSets} Set</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Circular Timer Widget */}
        <div className="glass-card rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <span className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase mb-3 flex items-center gap-1">
            <Timer className="h-3.5 w-3.5 text-emerald-400" />
            Dinlenme Sayacı
          </span>

          <div className="relative h-28 w-28 flex items-center justify-center">
            {/* SVG Circle */}
            <svg className="absolute top-0 left-0 h-full w-full -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={strokeRadius}
                className="stroke-zinc-800"
                strokeWidth="4"
                fill="transparent"
              />
              <motion.circle
                cx="56"
                cy="56"
                r={strokeRadius}
                className="stroke-emerald-400"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={strokeCircumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-white">{timerVal}s</span>
              <span className="text-[9px] text-zinc-500 uppercase font-semibold">kalan</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4 w-full">
            <button
              onClick={() => {
                if (timerVal > 0) setTimerVal(prev => prev + 30);
                else startTimer(30);
              }}
              className="flex-1 py-1.5 rounded bg-zinc-900 border border-white/5 text-[10px] text-zinc-400 font-bold hover:bg-zinc-800 transition-colors"
            >
              +30sn
            </button>
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setTimerVal(0);
              }}
              className="flex-1 py-1.5 rounded bg-zinc-900 border border-white/5 text-[10px] text-zinc-400 font-bold hover:bg-zinc-800 transition-colors"
            >
              Sıfırla
            </button>
          </div>
        </div>
      </div>

      {/* Active Exercise Detail Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 rounded-2xl glass-card relative min-h-[480px]">
        {activeEx ? (
          <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{activeEx.muscleGroup} • {activeEx.equipment}</span>
                <h1 className="text-xl font-bold text-white mt-0.5">{activeEx.exerciseName}</h1>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 font-semibold block">Hedef Yük</span>
                <span className="text-base font-black text-emerald-400">{activeEx.targetWeight} kg</span>
              </div>
            </div>

            {/* Set Table */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-500 font-bold uppercase pb-1 border-b border-white/5">
                <span className="col-span-2 text-center">Set</span>
                <span className="col-span-3 text-center">Ağırlık (kg)</span>
                <span className="col-span-3 text-center">Tekrar</span>
                <span className="col-span-2 text-center">Zorluk (RPE)</span>
                <span className="col-span-2 text-right">Durum</span>
              </div>

              <div className="space-y-2.5">
                {activeExSets.map((s, sIdx) => (
                  <div 
                    key={sIdx}
                    className={`grid grid-cols-12 gap-2 items-center p-1.5 rounded-lg border transition-all ${
                      s.logged 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-400' 
                        : 'bg-zinc-900 border-white/5 text-white'
                    }`}
                  >
                    <span className="col-span-2 text-center text-xs font-mono font-bold">#{sIdx+1}</span>
                    
                    {/* Weight Control */}
                    <div className="col-span-3 flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => handleSetChange(sIdx, 'weight', Math.max(0, s.weight - 2.5))}
                        disabled={s.logged}
                        className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-10 text-center">{s.weight}</span>
                      <button 
                        onClick={() => handleSetChange(sIdx, 'weight', s.weight + 2.5)}
                        disabled={s.logged}
                        className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Reps Control */}
                    <div className="col-span-3 flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => handleSetChange(sIdx, 'reps', Math.max(1, s.reps - 1))}
                        disabled={s.logged}
                        className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{s.reps}</span>
                      <button 
                        onClick={() => handleSetChange(sIdx, 'reps', s.reps + 1)}
                        disabled={s.logged}
                        className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* RPE Selector */}
                    <div className="col-span-2 flex justify-center">
                      <select
                        value={s.rpe}
                        disabled={s.logged}
                        onChange={(e) => handleSetChange(sIdx, 'rpe', parseInt(e.target.value))}
                        className="bg-zinc-800 border border-white/5 text-xs text-white rounded p-1 text-center outline-none focus:border-emerald-500 disabled:opacity-75"
                      >
                        {[5, 6, 7, 8, 9, 10].map(val => (
                          <option key={val} value={val}>RPE {val}</option>
                        ))}
                      </select>
                    </div>

                    {/* Completion Action */}
                    <div className="col-span-2 flex justify-end pr-1">
                      {s.logged ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Tamam
                        </span>
                      ) : (
                        <button
                          onClick={() => handleLogSet(sIdx)}
                          className="px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 rounded text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Kaydet
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Bottom Actions */}
        <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 max-w-[200px]">
            * RPE: 10 (Maksimum zorluk), 8 (Mükemmel), 6 (Çok kolay)
          </span>

          <button
            onClick={handleLogExercise}
            disabled={loading || activeExSets.some(s => !s.logged)}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg shadow-lg disabled:shadow-none transition-all disabled:cursor-not-allowed cursor-pointer"
          >
            {activeExIdx < activeDay.exercises.length - 1 ? (
              <>
                Sıradaki Egzersize Geç
                <ChevronRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Antrenmanı Tamamla ve Bitir
                <CheckCircle2 className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Workout Complete Modal Celebration */}
      <AnimatePresence>
        {workoutFinished && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
              
              <div className="h-16 w-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 text-emerald-400 mb-5">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <h2 className="text-xl font-black text-white">Tebrikler! 🎉</h2>
              <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto">
                Bugünkü workout seansını başarıyla tamamladınız. RPE verileriniz yansıtma motorumuza işlendi ve overload limitleri kontrol edildi.
              </p>

              <button
                onClick={() => {
                  setWorkoutFinished(false);
                  router.push('/dashboard');
                }}
                className="mt-6 w-full py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
              >
                Panele Dön ve İlerlemeyi Gör
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
