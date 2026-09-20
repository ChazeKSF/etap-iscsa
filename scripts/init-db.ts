import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

async function initDB() {
  console.log('🚀 Initializing Turso SQLite Database Schema for eTap GRC...');

  try {
    // 1. Submissions Table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        business_unit TEXT NOT NULL,
        submitter_email TEXT NOT NULL,
        submitter_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        ai_analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "submissions" created.');

    // 2. Control Answers Table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS control_answers (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL,
        control_id TEXT NOT NULL,
        control_name TEXT NOT NULL,
        implemented INTEGER NOT NULL, -- 1 for true, 0 for false
        notes TEXT,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Table "control_answers" created.');

    // 3. Evidence Files Table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS evidence_files (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        base64_data TEXT NOT NULL,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Table "evidence_files" created.');

    // 4. Submission Tags Table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS submission_tags (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL,
        label TEXT NOT NULL,
        color TEXT DEFAULT '#3b82f6',
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Table "submission_tags" created.');

    console.log('\n🎉 Database Schema Initialization Complete!');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    process.exit(1);
  }
}

initDB();