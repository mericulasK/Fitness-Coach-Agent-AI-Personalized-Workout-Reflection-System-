import db from '../db/client';

export interface RawProfileInput {
  id?: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  goal: 'kas kütlesi' | 'yağ yakımı' | 'güç' | 'genel fitness' | 'dayanıklılık';
  experienceLevel: 'yeni başlayan' | 'orta' | 'ileri';
  daysPerWeek: number;
  equipment: string[];
  injuries: string[];
}

export interface NormalizedProfile extends RawProfileInput {
  id: string;
  bmi: number;
  tdee: number;
}

export function normalizeProfile(raw: RawProfileInput): NormalizedProfile {
  const id = raw.id || 'default_user';
  
  // Calculate BMI
  const heightM = raw.heightCm / 100;
  const bmi = heightM > 0 ? parseFloat((raw.weightKg / (heightM * heightM)).toFixed(1)) : 0;

  // Calculate TDEE (using Mifflin-St Jeor formula + base multiplier)
  // BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + s
  // s = +5 for male, -161 for female, defaults to -80 for other/neutral
  const s = raw.gender === 'erkek' ? 5 : raw.gender === 'kadın' ? -161 : -80;
  const bmr = 10 * raw.weightKg + 6.25 * raw.heightCm - 5 * raw.age + s;
  
  // Base physical activity factor defaults to active (1.375 - 1.55 depending on training days)
  let activityMultiplier = 1.2; // Sedentary
  if (raw.daysPerWeek >= 4) {
    activityMultiplier = 1.55; // Active
  } else if (raw.daysPerWeek >= 2) {
    activityMultiplier = 1.375; // Moderately active
  }
  
  const tdee = Math.round(bmr * activityMultiplier);

  return {
    ...raw,
    id,
    bmi,
    tdee
  };
}

export interface HistoricalContext {
  previousLogs: any[];
  exerciseVolumeHistory: Record<string, number[]>; // Exercise name -> array of volumes (weight * reps * sets)
  recentPlateaus: string[]; // List of exercises indicating plateaus
  streakDays: number;
}

export function getHistoricalContext(userId: string): HistoricalContext {
  try {
    // 1. Get previous logs
    const logs = db.prepare(`
      SELECT wl.*, e.exerciseName, e.muscleGroup, e.targetWeight, e.targetReps, e.targetSets, wd.dayIndex, wp.weekNumber
      FROM WorkoutLog wl
      JOIN Exercise e ON wl.exerciseId = e.id
      JOIN WorkoutDay wd ON e.dayId = wd.id
      JOIN WorkoutPlan wp ON wd.planId = wp.id
      WHERE wp.userId = ?
      ORDER BY wl.completedAt DESC
      LIMIT 100
    `).all(userId) as any[];

    // 2. Estimate volume history per exercise
    const exerciseVolumeHistory: Record<string, number[]> = {};
    const weightHistory: Record<string, number[]> = {};

    logs.forEach(log => {
      const name = log.exerciseName;
      try {
        const reps = JSON.parse(log.actualReps) as number[];
        const weights = JSON.parse(log.actualWeight) as number[];
        
        let volume = 0;
        for (let i = 0; i < reps.length; i++) {
          volume += (reps[i] || 0) * (weights[i] || 0);
        }
        
        if (!exerciseVolumeHistory[name]) {
          exerciseVolumeHistory[name] = [];
        }
        exerciseVolumeHistory[name].push(volume);

        // Track raw weights for plateau check
        if (!weightHistory[name]) {
          weightHistory[name] = [];
        }
        // Take max weight used in this workout
        weightHistory[name].push(Math.max(...weights, 0));
      } catch (err) {
        // Safe skip JSON parsing errors
      }
    });

    // 3. Detect recent plateaus (e.g. same maximum weight in last 3 workouts)
    const recentPlateaus: string[] = [];
    Object.keys(weightHistory).forEach(name => {
      const weights = weightHistory[name];
      if (weights.length >= 3) {
        const last3 = weights.slice(0, 3);
        // If max weight did not change at all in the last 3 workouts, flag it
        if (last3[0] > 0 && last3[0] === last3[1] && last3[1] === last3[2]) {
          recentPlateaus.push(name);
        }
      }
    });

    // 4. Calculate current streak (consecutive days of completed workouts)
    const completedDays = db.prepare(`
      SELECT DISTINCT DATE(completedAt) as date
      FROM WorkoutLog wl
      JOIN Exercise e ON wl.exerciseId = e.id
      JOIN WorkoutDay wd ON e.dayId = wd.id
      JOIN WorkoutPlan wp ON wd.planId = wp.id
      WHERE wp.userId = ?
      ORDER BY date DESC
      LIMIT 30
    `).all(userId) as { date: string }[];

    let streakDays = 0;
    if (completedDays.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const lastCompletedDate = completedDays[0].date;
      
      // If last completion was today or yesterday, count streak
      if (lastCompletedDate === todayStr || lastCompletedDate === yesterdayStr) {
        streakDays = 1;
        let prevDate = new Date(lastCompletedDate);
        
        for (let i = 1; i < completedDays.length; i++) {
          const checkDate = new Date(completedDays[i].date);
          const diffTime = Math.abs(prevDate.getTime() - checkDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            streakDays++;
            prevDate = checkDate;
          } else if (diffDays > 1) {
            break;
          }
        }
      }
    }

    return {
      previousLogs: logs,
      exerciseVolumeHistory,
      recentPlateaus,
      streakDays
    };
  } catch (error) {
    console.error('Error fetching historical context:', error);
    return {
      previousLogs: [],
      exerciseVolumeHistory: {},
      recentPlateaus: [],
      streakDays: 0
    };
  }
}
