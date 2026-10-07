import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Optional secret header check to prevent unauthorized trigger calls
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Identify submissions status = 'ARCHIVED' older than 5 years
    // SQL uses datetime('now', '-5 years') to evaluate against created_at
    const expiredSubmissions = await turso.execute(`
      SELECT id FROM submissions 
      WHERE status = 'ARCHIVED' 
        AND created_at IS NOT NULL 
        AND created_at <= datetime('now', '-5 years')
    `);

    const expiredIds = expiredSubmissions.rows.map((r: any) => String(r.id));

    if (expiredIds.length === 0) {
      return NextResponse.json({
        message: 'Retention policy check complete. No expired archived files found.',
        deletedCount: 0,
      });
    }

    // 2. Format ID parameters for SQL IN clause
    const placeholders = expiredIds.map(() => '?').join(',');

    // 3. Delete dependent child records first (Foreign Key Safety)
    await turso.execute({
      sql: `DELETE FROM control_answers WHERE submission_id IN (${placeholders})`,
      args: expiredIds,
    });

    await turso.execute({
      sql: `DELETE FROM evidence_files WHERE submission_id IN (${placeholders})`,
      args: expiredIds,
    });

    // 4. Delete the parent submission records
    const deleteResult = await turso.execute({
      sql: `DELETE FROM submissions WHERE id IN (${placeholders})`,
      args: expiredIds,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully purged ${expiredIds.length} submission(s) older than 5 years per retention policy.`,
      purgedSubmissionIds: expiredIds,
    });
  } catch (error: any) {
    console.error('Data Retention Purge Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}