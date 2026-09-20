import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function GET() {
  try {
    const submissionsRes = await turso.execute(
      `SELECT * FROM submissions ORDER BY created_at DESC`
    );

    const submissions = [];
    for (const sub of submissionsRes.rows) {
      const answersRes = await turso.execute({
        sql: `SELECT * FROM control_answers WHERE submission_id = ?`,
        args: [sub.id as string],
      });

      submissions.push({
        ...sub,
        answers: answersRes.rows,
      });
    }

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error('Fetch Submissions Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}