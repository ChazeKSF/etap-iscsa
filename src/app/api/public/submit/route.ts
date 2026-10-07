// app/api/public/submit/route.ts
import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { businessUnit, submitterName, submitterEmail, answers, evidenceFiles } = body;

    if (!businessUnit || !submitterName || !submitterEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const submissionId = `csa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Insert main submission
    await turso.execute({
      sql: `INSERT INTO submissions (id, business_unit, submitter_name, submitter_email, status) VALUES (?, ?, ?, ?, ?)`,
      args: [submissionId, businessUnit, submitterName, submitterEmail, 'PENDING'],
    });

    // 2. Execute control answers in PARALLEL rather than sequential awaits
    if (Array.isArray(answers) && answers.length > 0) {
      const answerPromises = answers.map((ctrl) =>
        turso.execute({
          sql: `INSERT INTO control_answers (id, submission_id, control_id, control_name, implemented, notes) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            `ctrl_${crypto.randomUUID()}`,
            submissionId,
            ctrl.controlId,
            ctrl.controlName,
            ctrl.implemented ? 1 : 0,
            ctrl.notes || '',
          ],
        })
      );
      await Promise.all(answerPromises);
    }

    // 3. Insert evidence files in PARALLEL
    if (Array.isArray(evidenceFiles) && evidenceFiles.length > 0) {
      const filePromises = evidenceFiles.map((file) => {
        const fileSize = Number(file.fileSize ?? file.file_size ?? 0);
        return turso.execute({
          sql: `INSERT INTO evidence_files (id, submission_id, file_name, file_type, file_size, base64_data) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            `file_${crypto.randomUUID()}`,
            submissionId,
            file.fileName || file.file_name || 'unnamed',
            file.fileType || file.file_type || 'application/octet-stream',
            fileSize,
            file.base64Data || file.base64_data,
          ],
        });
      });
      await Promise.all(filePromises);
    }

    return NextResponse.json({ success: true, submissionId });
  } catch (error: any) {
    console.error('Public Submission Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record submission' },
      { status: 500 }
    );
  }
}