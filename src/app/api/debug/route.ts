// app/api/debug/route.ts
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const submissions = await turso.execute('SELECT * FROM submissions ORDER BY rowid DESC LIMIT 10;');
    const evidenceFiles = await turso.execute('SELECT id, submission_id, file_name, file_size FROM evidence_files ORDER BY rowid DESC LIMIT 10;');
    const controlAnswers = await turso.execute('SELECT * FROM control_answers ORDER BY rowid DESC LIMIT 10;');

    return NextResponse.json({
      submissionsCount: submissions.rows.length,
      submissions: submissions.rows,
      evidenceFilesCount: evidenceFiles.rows.length,
      evidenceFiles: evidenceFiles.rows,
      controlAnswersCount: controlAnswers.rows.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}