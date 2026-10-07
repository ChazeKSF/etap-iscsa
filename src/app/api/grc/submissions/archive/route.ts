// app/api/grc/submissions/archive/route.ts
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { submissionId, archive } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    const newStatus = archive ? 'ARCHIVED' : 'PENDING REVIEW';

    await turso.execute({
      sql: `UPDATE submissions SET status = ? WHERE id = ?`,
      args: [newStatus, submissionId],
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Archive Toggle Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}