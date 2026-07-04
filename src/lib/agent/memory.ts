import db from '../db/client';
import { NormalizedProfile } from './perception';

interface UserProfileRow {
  id: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  goal: string;
  experienceLevel: string;
  daysPerWeek: number;
  equipment: string;
  injuries: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkoutPlanRow {
  id: string;
  userId: string;
  weekNumber: number;
  startDate: string;
  isDeloadWeek: number;
  createdAt: string;
}

interface WorkoutDayRow {
  id: string;
  planId: string;
  dayIndex: number;
  focus: string;
  status: string;
}

interface ExerciseRow {
  id: string;
  dayId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  muscleGroup: string;
  equipment: string;
  orderIndex: number;
}

interface WorkoutLogRow {
  id: string;
  exerciseId: string;
  actualSets: string;
  actualReps: string;
  actualWeight: string;
  rpe: string;
  completedAt: string;
  notes?: string;
}

interface ProgressSnapshotRow {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
  bodyMeasurements: string;
}

interface ChatMessageRow {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// 1. User Profile Management
export function saveUserProfile(profile: NormalizedProfile): void {
  const existing = db.prepare('SELECT id FROM UserProfile WHERE id = ?').get(profile.id);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE UserProfile
      SET age = ?, gender = ?, heightCm = ?, weightKg = ?, goal = ?, experienceLevel = ?,
          daysPerWeek = ?, equipment = ?, injuries = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      profile.age,
      profile.gender,
      profile.heightCm,
      profile.weightKg,
      profile.goal,
      profile.experienceLevel,
      profile.daysPerWeek,
      JSON.stringify(profile.equipment),
      JSON.stringify(profile.injuries),
      now,
      profile.id
    );
  } else {
    db.prepare(`
      INSERT INTO UserProfile (id, age, gender, heightCm, weightKg, goal, experienceLevel, daysPerWeek, equipment, injuries, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.id,
      profile.age,
      profile.gender,
      profile.heightCm,
      profile.weightKg,
      profile.goal,
      profile.experienceLevel,
      profile.daysPerWeek,
      JSON.stringify(profile.equipment),
      JSON.stringify(profile.injuries),
      now,
      now
    );
  }

  // Also auto-save a progress snapshot on profile update
  saveProgressSnapshot(profile.id, profile.weightKg);
}

export function getUserProfile(userId: string = 'default_user'): NormalizedProfile | null {
  const row = db.prepare('SELECT * FROM UserProfile WHERE id = ?').get(userId) as UserProfileRow | undefined;
  if (!row) return null;

  // Calculate BMI & TDEE on the fly
  const heightM = row.heightCm / 100;
  const bmi = heightM > 0 ? parseFloat((row.weightKg / (heightM * heightM)).toFixed(1)) : 0;
  
  const s = row.gender === 'erkek' ? 5 : row.gender === 'kadın' ? -161 : -80;
  const bmr = 10 * row.weightKg + 6.25 * row.heightCm - 5 * row.age + s;
  let multiplier = 1.2;
  if (row.daysPerWeek >= 4) {
    multiplier = 1.55;
  } else if (row.daysPerWeek >= 2) {
    multiplier = 1.375;
  }
  const tdee = Math.round(bmr * multiplier);

  return {
    id: row.id,
    age: row.age,
    gender: row.gender,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    goal: row.goal as 'kas kütlesi' | 'yağ yakımı' | 'güç' | 'genel fitness' | 'dayanıklılık',
    experienceLevel: row.experienceLevel as 'yeni başlayan' | 'orta' | 'ileri',
    daysPerWeek: row.daysPerWeek,
    equipment: JSON.parse(row.equipment),
    injuries: JSON.parse(row.injuries),
    bmi,
    tdee
  };
}

// 2. Workout Plan Management
export interface DbWorkoutPlan {
  id: string;
  userId: string;
  weekNumber: number;
  startDate: string;
  isDeloadWeek: boolean;
  days: {
    id: string;
    dayIndex: number;
    focus: string;
    status: string;
    exercises: {
      id: string;
      exerciseName: string;
      targetSets: number;
      targetReps: number;
      targetWeight: number;
      muscleGroup: string;
      equipment: string;
      orderIndex: number;
      completedLog?: {
        actualSets: number[];
        actualReps: number[];
        actualWeight: number[];
        rpe: number[];
        notes?: string;
      };
    }[];
  }[];
}

export function saveWorkoutPlan(plan: DbWorkoutPlan): void {
  // Use a transaction for sqlite atomic integrity
  const transaction = db.transaction(() => {
    // Delete existing plans for the user
    db.prepare('DELETE FROM WorkoutPlan WHERE userId = ?').run(plan.userId);

    // Insert plan
    db.prepare(`
      INSERT INTO WorkoutPlan (id, userId, weekNumber, startDate, isDeloadWeek, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(plan.id, plan.userId, plan.weekNumber, plan.startDate, plan.isDeloadWeek ? 1 : 0, new Date().toISOString());

    // Insert days & exercises
    plan.days.forEach(day => {
      db.prepare(`
        INSERT INTO WorkoutDay (id, planId, dayIndex, focus, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(day.id, plan.id, day.dayIndex, day.focus, day.status);

      day.exercises.forEach((ex, idx) => {
        db.prepare(`
          INSERT INTO Exercise (id, dayId, exerciseName, targetSets, targetReps, targetWeight, muscleGroup, equipment, orderIndex)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(ex.id, day.id, ex.exerciseName, ex.targetSets, ex.targetReps, ex.targetWeight, ex.muscleGroup, ex.equipment, idx);
      });
    });
  });

  transaction();
}

export function getActiveWorkoutPlan(userId: string = 'default_user'): DbWorkoutPlan | null {
  const planRow = db.prepare('SELECT * FROM WorkoutPlan WHERE userId = ? ORDER BY createdAt DESC LIMIT 1').get(userId) as WorkoutPlanRow | undefined;
  if (!planRow) return null;

  const days = db.prepare('SELECT * FROM WorkoutDay WHERE planId = ? ORDER BY dayIndex ASC').all(planRow.id) as WorkoutDayRow[];
  
  const mappedDays = days.map(day => {
    const exercises = db.prepare('SELECT * FROM Exercise WHERE dayId = ? ORDER BY orderIndex ASC').all(day.id) as ExerciseRow[];
    
    const mappedExercises = exercises.map(ex => {
      // Find completed log if exists
      const log = db.prepare('SELECT * FROM WorkoutLog WHERE exerciseId = ?').get(ex.id) as WorkoutLogRow | undefined;
      
      return {
        id: ex.id,
        exerciseName: ex.exerciseName,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetWeight: ex.targetWeight,
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment,
        orderIndex: ex.orderIndex,
        completedLog: log ? {
          actualSets: JSON.parse(log.actualSets),
          actualReps: JSON.parse(log.actualReps),
          actualWeight: JSON.parse(log.actualWeight),
          rpe: JSON.parse(log.rpe),
          notes: log.notes
        } : undefined
      };
    });

    return {
      id: day.id,
      dayIndex: day.dayIndex,
      focus: day.focus,
      status: day.status,
      exercises: mappedExercises
    };
  });

  return {
    id: planRow.id,
    userId: planRow.userId,
    weekNumber: planRow.weekNumber,
    startDate: planRow.startDate,
    isDeloadWeek: planRow.isDeloadWeek === 1,
    days: mappedDays
  };
}

// 3. Log Workout
export interface LogInput {
  exerciseId: string;
  actualSets: number[];
  actualReps: number[];
  actualWeight: number[];
  rpe: number[];
  notes?: string;
}

export function logExerciseCompletion(log: LogInput): void {
  const id = 'log_' + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();

  // Save log
  db.prepare(`
    INSERT OR REPLACE INTO WorkoutLog (id, exerciseId, actualSets, actualReps, actualWeight, rpe, completedAt, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    log.exerciseId,
    JSON.stringify(log.actualSets),
    JSON.stringify(log.actualReps),
    JSON.stringify(log.actualWeight),
    JSON.stringify(log.rpe),
    now,
    log.notes || ''
  );

  // Update WorkoutDay status if all exercises are logged
  const exerciseRow = db.prepare('SELECT dayId FROM Exercise WHERE id = ?').get(log.exerciseId) as ExerciseRow | undefined;
  if (exerciseRow) {
    const dayId = exerciseRow.dayId;
    const allExercises = db.prepare('SELECT id FROM Exercise WHERE dayId = ?').all(dayId) as { id: string }[];
    
    let allCompleted = true;
    for (const ex of allExercises) {
      const logged = db.prepare('SELECT id FROM WorkoutLog WHERE exerciseId = ?').get(ex.id);
      if (!logged) {
        allCompleted = false;
        break;
      }
    }

    if (allCompleted) {
      db.prepare("UPDATE WorkoutDay SET status = 'completed' WHERE id = ?").run(dayId);
    }
  }
}

// 4. Progress Snapshot
export function saveProgressSnapshot(userId: string, weightKg: number, measurements?: unknown): void {
  const id = 'snap_' + Math.random().toString(36).substr(2, 9);
  const dateStr = new Date().toISOString().split('T')[0];

  // Insert or update for today
  db.prepare(`
    INSERT OR REPLACE INTO ProgressSnapshot (id, userId, date, weightKg, bodyMeasurements)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, dateStr, weightKg, measurements ? JSON.stringify(measurements) : '{}');
}

export function getProgressSnapshots(userId: string): { date: string; weightKg: number }[] {
  const rows = db.prepare(`
    SELECT date, weightKg
    FROM ProgressSnapshot
    WHERE userId = ?
    ORDER BY date ASC
  `).all(userId) as ProgressSnapshotRow[];
  return rows.map(r => ({ date: r.date, weightKg: r.weightKg }));
}

// 5. Chat History
export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export function saveChatMessage(userId: string, role: 'user' | 'assistant', content: string): void {
  const id = 'msg_' + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ChatMessage (id, userId, role, content, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, role, content, now);
}

export function getChatHistory(userId: string): ChatMsg[] {
  const rows = db.prepare(`
    SELECT role, content
    FROM ChatMessage
    WHERE userId = ?
    ORDER BY timestamp ASC
    LIMIT 50
  `).all(userId) as ChatMessageRow[];

  return rows.map(r => ({
    role: r.role,
    content: r.content
  }));
}
