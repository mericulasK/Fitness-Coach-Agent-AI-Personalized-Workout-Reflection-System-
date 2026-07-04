// Database schema definitions for SQLite

export const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS UserProfile (
  id TEXT PRIMARY KEY,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  heightCm REAL NOT NULL,
  weightKg REAL NOT NULL,
  goal TEXT NOT NULL,
  experienceLevel TEXT NOT NULL,
  daysPerWeek INTEGER NOT NULL,
  equipment TEXT NOT NULL, -- JSON array of strings
  injuries TEXT NOT NULL, -- JSON array of strings
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS WorkoutPlan (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  weekNumber INTEGER NOT NULL,
  startDate TEXT NOT NULL,
  isDeloadWeek INTEGER NOT NULL CHECK (isDeloadWeek IN (0, 1)),
  createdAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES UserProfile (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS WorkoutDay (
  id TEXT PRIMARY KEY,
  planId TEXT NOT NULL,
  dayIndex INTEGER NOT NULL,
  focus TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending' | 'completed'
  FOREIGN KEY (planId) REFERENCES WorkoutPlan (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Exercise (
  id TEXT PRIMARY KEY,
  dayId TEXT NOT NULL,
  exerciseName TEXT NOT NULL,
  targetSets INTEGER NOT NULL,
  targetReps INTEGER NOT NULL,
  targetWeight REAL NOT NULL,
  muscleGroup TEXT NOT NULL,
  equipment TEXT NOT NULL,
  orderIndex INTEGER NOT NULL,
  FOREIGN KEY (dayId) REFERENCES WorkoutDay (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS WorkoutLog (
  id TEXT PRIMARY KEY,
  exerciseId TEXT NOT NULL,
  actualSets TEXT NOT NULL, -- JSON array of numbers or strings containing reps/weight/RPE per set
  actualReps TEXT NOT NULL, -- JSON array of numbers
  actualWeight TEXT NOT NULL, -- JSON array of numbers
  rpe TEXT NOT NULL, -- JSON array of numbers or a single avg number
  completedAt TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (exerciseId) REFERENCES Exercise (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ProgressSnapshot (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  weightKg REAL NOT NULL,
  bodyMeasurements TEXT, -- JSON string for chest, arm, waist, etc.
  FOREIGN KEY (userId) REFERENCES UserProfile (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ChatMessage (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES UserProfile (id) ON DELETE CASCADE
);
`;
