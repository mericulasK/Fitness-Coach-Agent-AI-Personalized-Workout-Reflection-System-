import Database from 'better-sqlite3';
import path from 'path';
import { MIGRATIONS } from './schema';

const dbPath = path.resolve(process.cwd(), 'fitness_coach.db');

class DbClient {
  private static instance: Database.Database | null = null;

  public static getInstance(): Database.Database {
    if (!DbClient.instance) {
      // In Next.js server actions / routes, create-or-retrieve singleton
      DbClient.instance = new Database(dbPath);
      
      // Enable foreign key constraints in SQLite
      DbClient.instance.pragma('foreign_keys = ON');
      
      // Enable WAL (Write-Ahead Logging) mode for concurrent reader/writer support
      DbClient.instance.pragma('journal_mode = WAL');
      
      // Set busy timeout to 5 seconds to prevent locking errors
      DbClient.instance.pragma('busy_timeout = 5000');
      
      // Run migrations
      DbClient.instance.exec(MIGRATIONS);
    }
    return DbClient.instance;
  }
}

export const db = DbClient.getInstance();
export default db;
