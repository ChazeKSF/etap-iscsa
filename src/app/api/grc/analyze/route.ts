import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { submissionId } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    // 1. Fetch submission details
    const subResult = await turso.execute({
      sql: `SELECT business_unit, submitter_name, submitter_email FROM submissions WHERE id = ?`,
      args: [submissionId],
    });

    if (subResult.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submission = subResult.rows[0];

    // 2. Fetch control responses and evidence file records
    const controlsResult = await turso.execute({
      sql: `SELECT control_id, control_name, implemented, notes FROM control_answers WHERE submission_id = ?`,
      args: [submissionId],
    });

    const evidenceResult = await turso.execute({
      sql: `SELECT file_name, file_type FROM evidence_files WHERE submission_id = ?`,
      args: [submissionId],
    });

    const evidenceFileList = evidenceResult.rows.map((f: any) => f.file_name).join(', ') || 'No attached files';

    // 3. System & User Prompts for ISO Lead Auditor Engine
const systemPrompt = `You are an independent Senior ISO/IEC 27001 Lead Auditor evaluating an Information Security Management System (ISCSA) assessment.

AUDITOR MANDATE (ZERO TRUST ASSUMPTION):
1. TREAT ALL "implemented" LABELS AS UNVERIFIED CLAIMS: Business Units frequently self-declare controls as "implemented" (1) when they are actually non-compliant, partially implemented, or lack operational proof. NEVER accept a self-declared "implemented" status at face value.
2. INDEPENDENT PROOF-BASED EVALUATION:
   - Evaluate EVERY SINGLE control purely on the strength, specificity, and maturity of the provided "notes" and "evidence_files", regardless of whether the BU marked it as 0 or 1.
   - If a control is marked "implemented" (1) but the notes or evidence are missing, vague, generic, or lack operational mechanisms (e.g., missing log retention periods, missing formal access recertification cycles, no automated enforcement), OVERRULE the BU's claim. Reclassify satisfaction as "Partially" or "No", document the exact Non-Conformity/Finding under "gaps", and generate prioritized "remediations".
   - If a control is marked "not implemented" (0), verify if any partial measures or existing controls are described in the notes to determine if it is "No" or "Partially" compliant.
3. STRICT ZERO HALLUCINATION RULE:
   - If and ONLY IF a control's provided notes and evidence files demonstrate complete, verifiable, operational ISO 27001 compliance (e.g., formal policy + technical implementation + recurring audit/monitoring proof), mark satisfaction as "Fully".
   - For "Fully" compliant controls, leave "gaps" as [] and "remediations" as []. Do NOT invent false findings if full evidence is present.

Output MUST be a valid JSON object matching this schema EXACTLY:
{
  "score": number, // Calculated overall posture percentage based on YOUR audited satisfaction ratings (0 - 100)
  "reports": [
    {
      "controlId": "string",
      "controlTitle": "string",
      "controlDescription": "string",
      "evidenceFile": "string",
      "submittedBy": "string",
      "generatedAt": "string",
      "satisfaction": "Fully" | "Partially" | "No",
      "justification": "string", // Explain explicitly why you accepted or OVERRULED the BU's self-declared status based on the evidence
      "gaps": [
        {
          "category": "string", // e.g., "Misdeclared Compliance", "Technical Enforcement", "Governance"
          "gapTitle": "string",
          "description": "string"
        }
      ],
      "remediations": [
        {
          "priority": "High" | "Medium" | "Low",
          "stepTitle": "string",
          "description": "string",
          "responsibleParty": "string"
        }
      ]
    }
  ]
}`;

    const userPrompt = `Audit the following submission for Business Unit: "${submission.business_unit}"
Submitter: ${submission.submitter_name} (${submission.submitter_email})
Attached Evidence Files: ${evidenceFileList}

Control Assessments:
${JSON.stringify(controlsResult.rows, null, 2)}`;

    // 4. Call local Ollama REST API with system prompt & JSON formatting
    const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        format: 'json', // Enforces structured JSON output from Ollama
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama connection error: ${ollamaResponse.statusText}`);
    }

    const data = await ollamaResponse.json();
    let analysisData;

    try {
      analysisData = JSON.parse(data.response);
    } catch {
      throw new Error('Failed to parse structured JSON response from local AI model.');
    }

    // 5. Store stringified structured report in Turso DB
    await turso.execute({
      sql: `UPDATE submissions SET ai_analysis = ? WHERE id = ?`,
      args: [JSON.stringify(analysisData), submissionId],
    });

    return NextResponse.json({ success: true, analysis: analysisData });
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