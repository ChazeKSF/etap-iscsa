import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch submissions ordered by ID DESC (newest at top)
    const subResult = await turso.execute(
      `SELECT id, business_unit, submitter_name, submitter_email, status, ai_analysis, created_at 
       FROM submissions 
       ORDER BY id DESC`
    );

    if (!subResult.rows || subResult.rows.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    // 2. Fetch all control answers
    const ansResult = await turso.execute(
      `SELECT id, submission_id, control_id, control_name, implemented, notes FROM control_answers`
    );

    // 3. Fetch evidence files (if table exists)
    let evidenceRows: any[] = [];
    try {
      const fileResult = await turso.execute(
        `SELECT id, submission_id, file_name, file_type, file_size, created_at FROM evidence_files`
      );
      evidenceRows = fileResult.rows || [];
    } catch {
      // Gracefully fallback if evidence_files table hasn't been created yet
      evidenceRows = [];
    }

    // 4. Map and join relations per submission
    const submissions = subResult.rows.map((sub: any) => {
      const answers = (ansResult.rows || []).filter(
        (ans: any) => String(ans.submission_id) === String(sub.id)
      );

      const evidenceFiles = evidenceRows.filter(
        (file: any) => String(file.submission_id) === String(sub.id)
      );

      return {
        id: String(sub.id),
        business_unit: sub.business_unit || 'Unassigned Unit',
        submitter_name: sub.submitter_name || 'Anonymous',
        submitter_email: sub.submitter_email || 'n/a',
        status: sub.status || 'PENDING REVIEW',
        created_at: sub.created_at || null,
        ai_analysis: sub.ai_analysis || null,
        answers,
        evidence_files: evidenceFiles,
      };
    });

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error('Turso Submissions Fetch Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}