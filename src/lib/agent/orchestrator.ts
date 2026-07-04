import { RawProfileInput, normalizeProfile, getHistoricalContext } from './perception';
import { generateWeeklyPlan, scheduleDeload } from './tools';
import { validateProfileInput, checkProgressiveOverload, checkInjuryWarnings } from './guardrails';
import { saveUserProfile, saveWorkoutPlan, getActiveWorkoutPlan, DbWorkoutPlan } from './memory';

export interface DeveloperTraceStep {
  tool: string;
  action: string;
  status: 'passed' | 'warning' | 'error' | 'info';
  details: string;
}

export interface OrchestrationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  trace: DeveloperTraceStep[];
  plan?: DbWorkoutPlan;
}

export async function orchestrateWeeklyPlanGeneration(
  rawInput: RawProfileInput,
  forceRegenerate: boolean = false
): Promise<OrchestrationResult> {
  const trace: DeveloperTraceStep[] = [];
  const warnings: string[] = [];

  trace.push({
    tool: 'Orchestrator',
    action: 'Initializing Plan Generation',
    status: 'info',
    details: `User ID: ${rawInput.id || 'default_user'}. Force regenerate: ${forceRegenerate}`
  });

  // 1. Perception Phase
  trace.push({
    tool: 'Perception (perception.ts)',
    action: 'Normalizing User Profile',
    status: 'info',
    details: 'Calculating BMI, TDEE, and mapping workout variables.'
  });
  
  const profile = normalizeProfile(rawInput);
  
  trace.push({
    tool: 'Perception (perception.ts)',
    action: 'Profile Normalized',
    status: 'info',
    details: `Normalized profile: Age ${profile.age}, BMI ${profile.bmi}, TDEE ${profile.tdee} kcal, Goals: ${profile.goal}.`
  });

  // 2. Guardrails - Input Verification
  trace.push({
    tool: 'Guardrails (guardrails.ts)',
    action: 'Validating Inputs',
    status: 'info',
    details: 'Verifying that metrics (age, height, weight) are within safe human bounds.'
  });

  const inputValidation = validateProfileInput(profile);
  if (!inputValidation.passed) {
    trace.push({
      tool: 'Guardrails (guardrails.ts)',
      action: 'Validation Failed',
      status: 'error',
      details: inputValidation.errors.join(' | ')
    });
    return {
      success: false,
      errors: inputValidation.errors,
      warnings: [],
      trace
    };
  }
  
  trace.push({
    tool: 'Guardrails (guardrails.ts)',
    action: 'Validation Passed',
    status: 'passed',
    details: 'All profile inputs passed safety checks.'
  });

  // Save/Update user profile in Memory
  saveUserProfile(profile);
  
  trace.push({
    tool: 'Memory (memory.ts)',
    action: 'Profile Saved',
    status: 'info',
    details: 'User profile persisted to SQLite database.'
  });

  // Check if there is already a plan active
  if (!forceRegenerate) {
    const existingPlan = getActiveWorkoutPlan(profile.id);
    if (existingPlan) {
      trace.push({
        tool: 'Memory (memory.ts)',
        action: 'Fetching Active Plan',
        status: 'passed',
        details: `Retrieved active plan Week ${existingPlan.weekNumber} directly from memory (No re-generation required).`
      });
      return {
        success: true,
        errors: [],
        warnings: [],
        trace,
        plan: existingPlan
      };
    }
  }

  // Fetch performance logs (long-term memory context)
  trace.push({
    tool: 'Memory (memory.ts)',
    action: 'Fetching Training History',
    status: 'info',
    details: 'Scanning database for previous performance logs and volume patterns.'
  });
  
  const history = getHistoricalContext(profile.id);
  
  trace.push({
    tool: 'Perception (perception.ts)',
    action: 'Training History Normalized',
    status: 'info',
    details: `Loaded ${history.previousLogs.length} historical logs. Streak: ${history.streakDays} days. Plateaus: [${history.recentPlateaus.join(', ')}]`
  });

  // Determine current week number
  let nextWeekNum = 1;
  const currentPlan = getActiveWorkoutPlan(profile.id);
  if (currentPlan) {
    nextWeekNum = currentPlan.weekNumber + 1;
  }

  // 3. Planning & Tools - Deload Scheduling
  trace.push({
    tool: 'Tools (tools/index.ts)',
    action: 'Checking Deload Schedule',
    status: 'info',
    details: `Evaluating training age/level (${profile.experienceLevel}) and upcoming Week ${nextWeekNum}.`
  });

  const isDeload = scheduleDeload(profile.experienceLevel, nextWeekNum);
  
  trace.push({
    tool: 'Tools (tools/index.ts)',
    action: 'Deload Calculated',
    status: 'info',
    details: isDeload 
      ? `Week ${nextWeekNum} is scheduled as a DELOAD week. Volume and weight will be decreased by 20-30%.`
      : `Week ${nextWeekNum} is a normal training week.`
  });

  // 4. Planning & Tools - Generation
  trace.push({
    tool: 'Tools (tools/index.ts)',
    action: 'Generating Exercises & Intensities',
    status: 'info',
    details: `Filtering exercises for equipment: [${profile.equipment.join(', ')}] and focus splits.`
  });

  const rawWeeklyDays = generateWeeklyPlan(profile, nextWeekNum, history.previousLogs, isDeload);

  // 5. Guardrails - Post-generation safety check (Injuries & Overload limits)
  trace.push({
    tool: 'Guardrails (guardrails.ts)',
    action: 'Evaluating Workout Plan Safety',
    status: 'info',
    details: 'Verifying weekly load increments (<10%) and checking for injury warning matches.'
  });

  const finalDays = rawWeeklyDays.map(day => {
    const safeExercises = day.exercises.map(ex => {
      let finalWeight = ex.targetWeight;
      
      // Check progressive overload limit
      const prevLogs = history.previousLogs.filter(l => l.exerciseName === ex.name);
      if (prevLogs.length > 0) {
        try {
          const actualWeights = JSON.parse(prevLogs[0].actualWeight) as number[];
          const lastMaxWeight = Math.max(...actualWeights, 0);
          
          const overloadCheck = checkProgressiveOverload(ex.name, ex.targetWeight, lastMaxWeight);
          if (!overloadCheck.passed) {
            finalWeight = overloadCheck.allowedWeight;
            const msg = overloadCheck.warning || '';
            warnings.push(msg);
            trace.push({
              tool: 'Guardrails (guardrails.ts)',
              action: 'Progressive Overload Cap Triggered',
              status: 'warning',
              details: msg
            });
          }
        } catch {
          // Safe ignore
        }
      }

      // Check for injuries warning
      // Find matching exercise warnings
      const injuryCheck = checkInjuryWarnings(ex.name, ex.muscleGroup === 'Legs' ? ['diz sorunu'] : [], profile.injuries);
      if (!injuryCheck.safe) {
        const msg = injuryCheck.warning || '';
        warnings.push(msg);
        trace.push({
          tool: 'Guardrails (guardrails.ts)',
          action: 'Injury Exclusion Warning',
          status: 'warning',
          details: msg
        });
      }

      return {
        ...ex,
        targetWeight: finalWeight
      };
    });

    return {
      id: 'day_' + Math.random().toString(36).substr(2, 9),
      dayIndex: day.dayIndex,
      focus: day.focus,
      status: 'pending',
      exercises: safeExercises.map((se, sIdx) => ({
        id: se.id,
        exerciseName: se.name,
        targetSets: se.targetSets,
        targetReps: se.targetReps,
        targetWeight: se.targetWeight,
        muscleGroup: se.muscleGroup,
        equipment: se.equipment,
        orderIndex: sIdx
      }))
    };
  });

  const generatedPlan: DbWorkoutPlan = {
    id: 'plan_' + Math.random().toString(36).substr(2, 9),
    userId: profile.id,
    weekNumber: nextWeekNum,
    startDate: new Date().toISOString().split('T')[0],
    isDeloadWeek: isDeload,
    days: finalDays
  };

  // 6. Memory - Commit generated plan to SQLite
  trace.push({
    tool: 'Memory (memory.ts)',
    action: 'Persisting Weekly Plan',
    status: 'info',
    details: 'Writing days, exercise mapping, and target goals to SQLite.'
  });

  saveWorkoutPlan(generatedPlan);
  
  trace.push({
    tool: 'Orchestrator',
    action: 'Plan Generation Completed',
    status: 'passed',
    details: `Week ${nextWeekNum} Workout Plan successfully saved to local DB.`
  });

  return {
    success: true,
    errors: [],
    warnings,
    trace,
    plan: generatedPlan
  };
}
