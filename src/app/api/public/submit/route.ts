import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { businessUnit, submitterName, submitterEmail, answers, evidenceFiles } = body;

    if (!businessUnit || !submitterName || !submitterEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const submissionId = `csa_${Date.now()}`;

    // 1. Insert main submission
    await turso.execute({
      sql: `INSERT INTO submissions (id, business_unit, submitter_name, submitter_email, status) VALUES (?, ?, ?, ?, ?)`,
      args: [submissionId, businessUnit, submitterName, submitterEmail, 'PENDING'],
    });

    // 2. Insert control answers
    if (Array.isArray(answers)) {
      for (const ctrl of answers) {
        await turso.execute({
          sql: `INSERT INTO control_answers (id, submission_id, control_id, control_name, implemented, notes) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            `ctrl_${Date.now()}_${ctrl.controlId}`,
            submissionId,
            ctrl.controlId,
            ctrl.controlName,
            ctrl.implemented ? 1 : 0,
            ctrl.notes || '',
          ],
        });
      }
    }

    // 3. Insert all attached evidence files
    if (Array.isArray(evidenceFiles) && evidenceFiles.length > 0) {
      for (let i = 0; i < evidenceFiles.length; i++) {
        const file = evidenceFiles[i];
        if (file && file.base64Data) {
          await turso.execute({
            sql: `INSERT INTO evidence_files (id, submission_id, file_name, file_type, base64_data) VALUES (?, ?, ?, ?, ?)`,
            args: [
              `file_${Date.now()}_${i}`,
              submissionId,
              file.fileName,
              file.fileType,
              file.base64Data,
            ],
          });
        }
      }
    }

    return NextResponse.json({ success: true, submissionId });
  } catch (error: any) {
    console.error('Public Submission Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record submission' }, { status: 500 });
  }
}