import exercisesData from '@/lib/data/exercises.json';
import { PerformanceLogRow } from '../perception';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  injuryWarnings: string[];
}

const exercises: ExerciseDefinition[] = exercisesData as ExerciseDefinition[];

// 1. BMI Calculation
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
}

// 2. TDEE Calculation (Mifflin-St Jeor)
export function calculateTDEE(profile: {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  daysPerWeek: number;
}): number {
  const s = profile.gender === 'erkek' ? 5 : profile.gender === 'kadın' ? -161 : -80;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + s;
  
  let multiplier = 1.2; // Sedentary
  if (profile.daysPerWeek >= 4) {
    multiplier = 1.55; // Active
  } else if (profile.daysPerWeek >= 2) {
    multiplier = 1.375; // Moderately active
  }
  return Math.round(bmr * multiplier);
}

// 3. Estimate One Rep Max (Epley Formula)
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return parseFloat((weight * (1 + reps / 30)).toFixed(1));
}

// 4. Select Exercises with filtering
export function selectExercises(
  goal: string,
  userEquipment: string[],
  injuries: string[],
  targetMuscleGroups: string[],
  experienceLevel: string
): ExerciseDefinition[] {
  // Normalize equipment: if user lists 'dumbbell', they can also do 'bodyweight'
  const allowedEquipment = [...userEquipment];
  if (!allowedEquipment.includes('bodyweight')) {
    allowedEquipment.push('bodyweight');
  }

  return exercises.filter(ex => {
    // 1. Check muscle group
    if (!targetMuscleGroups.includes(ex.muscleGroup)) return false;

    // 2. Check equipment compatibility
    if (!allowedEquipment.includes(ex.equipment)) return false;

    // 3. Check difficulty match
    if (experienceLevel === 'yeni başlayan' && ex.difficulty === 'advanced') return false;
    if (experienceLevel === 'orta' && ex.difficulty === 'advanced' && Math.random() > 0.4) {
      // Limit advanced moves slightly for intermediate
      return false;
    }

    // 4. Check injury warnings
    const hasInjuryConflict = ex.injuryWarnings.some(warning => 
      injuries.some(injury => injury.toLowerCase().includes(warning.toLowerCase()))
    );
    if (hasInjuryConflict) return false;

    return true;
  });
}

// 5. Generate Weekly Plan Structure
export interface PlannedExercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
}

export interface PlannedDay {
  dayIndex: number;
  focus: string;
  exercises: PlannedExercise[];
}

export function generateWeeklyPlan(
  profile: {
    id: string;
    goal: string;
    experienceLevel: string;
    daysPerWeek: number;
    equipment: string[];
    injuries: string[];
  },
  weekNumber: number,
  previousPerformanceLogs: PerformanceLogRow[] = [],
  isDeload: boolean = false
): PlannedDay[] {
  const { goal, experienceLevel, daysPerWeek, equipment, injuries } = profile;
  
  // Decide Reps and Sets based on Goal
  let reps = 10;
  let sets = 3;
  
  if (goal === 'kas kütlesi') {
    reps = 10; // 8-12 hypertrophy range
    sets = 3;
  } else if (goal === 'yağ yakımı') {
    reps = 12; // 12-15 range
    sets = 3;
  } else if (goal === 'güç') {
    reps = 5;  // 4-6 strength range
    sets = 4;
  } else if (goal === 'dayanıklılık') {
    reps = 15; // 15-20 range
    sets = 3;
  } else {
    reps = 10;
    sets = 3;
  }

  // Determine Daily Split Foci based on training days
  let splits: string[] = [];
  const muscleGroupsPerDay: Record<number, string[]> = {};
  
  if (daysPerWeek === 1) {
    splits = ['Full Body (Tüm Vücut)'];
    muscleGroupsPerDay[0] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Abs'];
  } else if (daysPerWeek === 2) {
    splits = ['Upper Body (Üst Vücut)', 'Lower Body (Alt Vücut)'];
    muscleGroupsPerDay[0] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'];
    muscleGroupsPerDay[1] = ['Legs', 'Abs'];
  } else if (daysPerWeek === 3) {
    splits = ['Push (İtiş)', 'Pull (Çekiş)', 'Legs & Abs (Bacak & Karın)'];
    muscleGroupsPerDay[0] = ['Chest', 'Shoulders', 'Triceps'];
    muscleGroupsPerDay[1] = ['Back', 'Biceps', 'Abs'];
    muscleGroupsPerDay[2] = ['Legs', 'Abs'];
  } else if (daysPerWeek === 4) {
    splits = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
    muscleGroupsPerDay[0] = ['Chest', 'Back', 'Shoulders'];
    muscleGroupsPerDay[1] = ['Legs', 'Abs'];
    muscleGroupsPerDay[2] = ['Chest', 'Biceps', 'Triceps'];
    muscleGroupsPerDay[3] = ['Legs', 'Abs'];
  } else {
    // 5 days
    splits = ['Chest & Abs', 'Back & Arms', 'Legs', 'Shoulders', 'Core & Arms'];
    muscleGroupsPerDay[0] = ['Chest', 'Abs'];
    muscleGroupsPerDay[1] = ['Back', 'Biceps', 'Triceps'];
    muscleGroupsPerDay[2] = ['Legs'];
    muscleGroupsPerDay[3] = ['Shoulders'];
    muscleGroupsPerDay[4] = ['Abs', 'Biceps', 'Triceps'];
  }

  const weeklyPlan: PlannedDay[] = [];

  for (let d = 0; d < daysPerWeek; d++) {
    const focus = splits[d] || 'Full Body';
    const targetMuscles = muscleGroupsPerDay[d] || ['Chest', 'Back', 'Legs'];
    
    // Select exercises for these muscle groups
    const dayExercises: PlannedExercise[] = [];
    
    targetMuscles.forEach(muscle => {
      const candidates = selectExercises(goal, equipment, injuries, [muscle], experienceLevel);
      
      // Pick 1-2 exercises per muscle group
      const count = (daysPerWeek >= 4) ? 1 : 2;
      const selected = candidates.slice(0, count);
      
      selected.forEach(ex => {
        // Calculate target weight based on progressive overload & previous logs
        let targetWeight = 0;
        
        // Find if this exercise was done before
        const prevLogs = previousPerformanceLogs.filter(log => log.exerciseName === ex.name);
        if (prevLogs.length > 0) {
          // Get the last completed log
          const lastLog = prevLogs[0];
          try {
            const actualWeights = JSON.parse(lastLog.actualWeight) as number[];
            const rpes = JSON.parse(lastLog.rpe) as number[];
            const avgRpe = rpes.reduce((a, b) => a + b, 0) / rpes.length;
            const maxWeight = Math.max(...actualWeights, 0);
            
            // Progressive overload calculations
            if (avgRpe <= 7) {
              // RPE is low, increase weight by 2.5% to 5%
              const increasePercent = avgRpe <= 5 ? 0.05 : 0.025;
              targetWeight = Math.round(maxWeight * (1 + increasePercent) * 2) / 2; // round to nearest 0.5kg
            } else if (avgRpe >= 9.5) {
              // RPE is too high, lower the weight slightly for safety
              targetWeight = Math.round(maxWeight * 0.95 * 2) / 2;
            } else {
              // RPE is perfect, maintain weight
              targetWeight = maxWeight;
            }
          } catch {
            targetWeight = 10; // safe default
          }
        } else {
          // Default starting weight based on equipment
          if (ex.equipment === 'bodyweight') {
            targetWeight = 0;
          } else if (ex.equipment === 'dumbbell') {
            targetWeight = experienceLevel === 'yeni başlayan' ? 5 : 10;
          } else if (ex.equipment === 'barbell') {
            targetWeight = ex.name.includes('Deadlift') || ex.name.includes('Squat') ? 40 : 20; // bar itself or bar + small weights
          } else {
            targetWeight = 15; // standard machine stack weight
          }
        }

        // Apply deload reduction if active
        let finalSets = sets;
        let finalWeight = targetWeight;
        
        if (isDeload) {
          finalSets = Math.max(2, sets - 1);
          finalWeight = Math.round(targetWeight * 0.8 * 2) / 2; // Reduce by 20%
        }

        dayExercises.push({
          id: ex.id + '_' + d + '_' + Math.random().toString(36).substr(2, 4),
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          equipment: ex.equipment,
          targetSets: finalSets,
          targetReps: reps,
          targetWeight: finalWeight
        });
      });
    });

    weeklyPlan.push({
      dayIndex: d,
      focus,
      exercises: dayExercises
    });
  }

  return weeklyPlan;
}

// 6. Autoregulation Algoritması (Feedback adjustment)
export function adjustPlanBasedOnFeedback(
  exercises: PlannedExercise[],
  rpeLogs: Record<string, { weight: number[]; reps: number[]; rpe: number[] }>
): PlannedExercise[] {
  return exercises.map(ex => {
    const feedback = rpeLogs[ex.id];
    if (!feedback) return ex;

    const avgRpe = feedback.rpe.reduce((a, b) => a + b, 0) / feedback.rpe.length;
    let newWeight = ex.targetWeight;
    const newSets = ex.targetSets;

    if (avgRpe <= 5) {
      // Extremely easy, load heavier
      newWeight = Math.round(ex.targetWeight * 1.05 * 2) / 2;
    } else if (avgRpe <= 7.5) {
      // Moderately easy, progressive overload
      newWeight = Math.round(ex.targetWeight * 1.025 * 2) / 2;
    } else if (avgRpe >= 9.5) {
      // Too heavy, back off
      newWeight = Math.round(ex.targetWeight * 0.925 * 2) / 2;
    }

    return {
      ...ex,
      targetWeight: newWeight,
      targetSets: newSets
    };
  });
}

// 7. Detect Plateau
export function detectPlateau(progressHistory: { date: string; weightKg: number }[]): boolean {
  if (progressHistory.length < 3) return false;
  // Look at last 3 weight checks. If body weight is target and strength flatlines (handled in perception log check)
  return false;
}

// 8. Schedule Deload Check
export function scheduleDeload(experienceLevel: string, currentWeek: number): boolean {
  // Beginners need deload less frequently (every 8 weeks)
  // Intermediate (every 6 weeks)
  // Advanced (every 4-5 weeks)
  if (experienceLevel === 'yeni başlayan') {
    return currentWeek > 0 && currentWeek % 8 === 0;
  } else if (experienceLevel === 'orta') {
    return currentWeek > 0 && currentWeek % 6 === 0;
  } else {
    return currentWeek > 0 && currentWeek % 5 === 0;
  }
}

// 9. Generate Motivational Message (Local fallbacks & Ollama status integration)
export async function generateMotivationalMessage(
  context: {
    name: string;
    goal: string;
    streak: number;
    bmi: number;
    recentWorkoutCompleted?: boolean;
    exerciseFeedback?: string;
  },
  ollamaModel?: string
): Promise<string> {
  const fallbacks = [
    `Harika gidiyorsun ${context.name}! ${context.streak > 0 ? `Tam ${context.streak} gündür seriyi bozmadın! 🔥` : ''} "${context.goal}" hedefine ulaşmak için bugün harika bir gün.`,
    `Disiplin, motivasyonun bittiği yerde başlar. ${context.name}, bugünkü antrenmanın seni hedefine bir adım daha yaklaştıracak. 👊`,
    `Unutma ${context.name}, gelişim zaman alır. Sabırlı ol, plana sadık kal ve her seti hisset. Güç seninle! 💪`,
    `TDEE ve BMI değerlerini analiz ettim. Vücudun tam antrenman modunda. Bugün sınırlarını zorlamaya hazır ol! ⚡`,
    `${context.streak >= 3 ? 'Harika bir seri yakaladın! Bu ivmeyi kaybetme. 🔥' : 'Bugün yeni bir başlangıç yapalım ve antrenmanımızı tamamlayalım!'}`,
    `Sakatlık filtrelerin devrede, güvendesin. Kendine odaklan ve her sette kası hisset! 😊`,
    `Kas gelişimi ve yağ yakımı istikrarla gelir. Bugün salon/ev seni bekler. Hadi harekete geç!`
  ];

  if (!ollamaModel) {
    // Return random fallback
    const idx = Math.floor(Math.random() * fallbacks.length);
    return fallbacks[idx];
  }

  // Try local Ollama model (with very short timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout

    const prompt = `Sen fitness koçu yapay zekasın. Kullanıcı adı: ${context.name}, hedefleri: ${context.goal}, güncel serisi (streak): ${context.streak} gün. 
    Kullanıcıya Türkçe dilinde, samimi, motive edici ve profesyonel kısa bir (maksimum 2-3 cümle) antrenman öncesi motivasyon mesajı yaz.`;

    const res = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return data.response.trim();
    }
  } catch {
    // Silently log and drop to fallback
    console.log('Ollama generated motivational message skipped, falling back to local template.');
  }

  const idx = Math.floor(Math.random() * fallbacks.length);
  return fallbacks[idx];
}
