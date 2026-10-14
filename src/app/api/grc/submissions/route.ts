import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch Submissions
    const subResult = await turso.execute(
      `SELECT id, business_unit, submitter_name, submitter_email, status, ai_analysis, created_at 
       FROM submissions 
       ORDER BY id DESC`
    );

    if (!subResult.rows || subResult.rows.length === 0) {
      return NextResponse.json({ submissions: [] });
    }

    // 2. Fetch Control Answers
    let ansRows: any[] = [];
    try {
      const ansResult = await turso.execute(
        `SELECT id, submission_id, control_id, control_name, implemented, notes FROM control_answers`
      );
      ansRows = ansResult.rows || [];
    } catch (err: any) {
      console.error('Error fetching control_answers:', err.message);
    }

    // 3. Fetch Evidence Files
    let evidenceRows: any[] = [];
    try {
      const fileResult = await turso.execute(
        `SELECT * FROM evidence_files`
      );
      evidenceRows = fileResult.rows || [];
    } catch (err: any) {
      console.error('Error fetching evidence_files:', err.message);
    }

    // 4. Map and normalize relationships
    const submissions = subResult.rows.map((sub: any) => {
      const subIdStr = String(sub.id).trim();
      const subIdNum = Number(sub.id);

      // Match answers
      const answers = ansRows
        .filter((ans: any) => {
          const ansSubId = String(ans.submission_id).trim();
          return ansSubId === subIdStr || (!isNaN(subIdNum) && Number(ansSubId) === subIdNum);
        })
        .map((ans: any) => ({
          ...ans,
          controlId: ans.control_id,
          controlName: ans.control_name,
          implemented: ans.implemented === 1 || ans.implemented === true || ans.implemented === '1',
        }));

      // Match evidence files & map dual key formats for UI safety
      const evidenceFiles = evidenceRows
        .filter((file: any) => {
          const fileSubId = String(file.submission_id).trim();
          return fileSubId === subIdStr || (!isNaN(subIdNum) && Number(fileSubId) === subIdNum);
        })
        .map((file: any) => {
          const fileName = file.file_name || file.fileName || file.name || 'Attached Evidence';
          const fileUrl = file.file_url || file.fileUrl || file.url || '#';
          const fileSize = file.file_size || file.fileSize || file.size || 0;
          const fileType = file.file_type || file.fileType || file.type || '';

          return {
            id: String(file.id),
            submission_id: subIdStr,
            submissionId: subIdStr,
            file_name: fileName,
            fileName: fileName,
            name: fileName,
            file_url: fileUrl,
            fileUrl: fileUrl,
            url: fileUrl,
            file_size: fileSize,
            fileSize: fileSize,
            size: fileSize,
            file_type: fileType,
            fileType: fileType,
            type: fileType,
            created_at: file.created_at || null,
          };
        });

      // Parse AI Analysis
      let parsedAiAnalysis = null;
      if (sub.ai_analysis) {
        try {
          parsedAiAnalysis = typeof sub.ai_analysis === 'string' 
            ? JSON.parse(sub.ai_analysis) 
            : sub.ai_analysis;
        } catch {
          parsedAiAnalysis = sub.ai_analysis;
        }
      }

      return {
        id: subIdStr,
        business_unit: sub.business_unit || 'Unassigned Unit',
        businessUnit: sub.business_unit || 'Unassigned Unit',
        submitter_name: sub.submitter_name || 'Anonymous',
        submitterName: sub.submitter_name || 'Anonymous',
        submitter_email: sub.submitter_email || 'n/a',
        submitterEmail: sub.submitter_email || 'n/a',
        status: sub.status || 'PENDING REVIEW',
        created_at: sub.created_at || null,
        createdAt: sub.created_at || null,
        ai_analysis: parsedAiAnalysis,
        aiAnalysis: parsedAiAnalysis,
        answers,
        evidence_files: evidenceFiles,
        evidenceFiles: evidenceFiles,
      };
    });

    return NextResponse.json({ submissions });
  } catch (error: any) {
    console.error('Turso Submissions GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}