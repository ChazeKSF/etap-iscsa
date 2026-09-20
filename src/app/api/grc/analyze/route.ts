import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function POST(req: Request) {
  try {
    const { submissionId } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    // 1. Fetch submission details
    const subResult = await turso.execute({
      sql: `SELECT business_unit, submitter_name FROM submissions WHERE id = ?`,
      args: [submissionId],
    });

    if (subResult.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = subResult.rows[0];

    // 2. Fetch control responses
    const controlsResult = await turso.execute({
      sql: `SELECT control_id, control_name, implemented, notes FROM control_answers WHERE submission_id = ?`,
      args: [submissionId],
    });

    const gaps = controlsResult.rows.filter((c) => Number(c.implemented) === 0);
    const implemented = controlsResult.rows.filter((c) => Number(c.implemented) === 1);

    // 3. Construct prompt for Ollama
    const prompt = `You are an expert ISO 27001 Lead Auditor and GRC Analyst.
Analyze this Information Security Compliance Self-Assessment (ISCSA) for Business Unit: "${submission.business_unit}".

SUMMARY:
- Total Controls Assessed: ${controlsResult.rows.length}
- Fully Implemented: ${implemented.length}
- Identified Gaps (Non-Compliant): ${gaps.length}

IDENTIFIED GAPS:
${
  gaps.length > 0
    ? gaps
        .map(
          (g) =>
            `- [${g.control_id}] ${g.control_name}\n  Notes/Context:${g.notes || 'No notes provided'}`
        )
        .join('\n')
    : 'None! All assessed controls are reported as implemented.'
}

TASK:
Provide a concise, professional GRC Gap & Risk Analysis with the following sections:
1. Executive Assessment (1-2 sentences on overall posture)
2. Critical Risk Exposure (Key risks introduced by the identified gaps)
3. Actionable Mitigation Roadmap (3-4 prioritized recommendations for remediation)

Keep the response structured, clear, and focused on ISO 27001 compliance standard requirements. Do not use conversational filler.`;

    // 4. Call local Ollama REST API
    const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama connection error: ${ollamaResponse.statusText}`);
    }

    const data = await ollamaResponse.json();
    const analysisText = data.response;

    // 5. Store generated analysis in Turso DB
    await turso.execute({
      sql: `UPDATE submissions SET ai_analysis = ? WHERE id = ?`,
      args: [analysisText, submissionId],
    });

    return NextResponse.json({ success: true, analysis: analysisText });
  } catch (error: any) {
    console.error('Ollama Analysis Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate AI analysis. Make sure Ollama is running locally.',
      },
      { status: 500 }
    );
  }
}