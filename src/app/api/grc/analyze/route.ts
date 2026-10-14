import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function POST(req: Request) {
  try {
    const { submissionId } = await req.json();

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submissionId in request body.' },
        { status: 400 }
      );
    }

    // 1. Fetch Submission Data from Turso
    const subResult = await turso.execute({
      sql: `SELECT id, business_unit, submitter_name, submitter_email FROM submissions WHERE id = ?`,
      args: [submissionId],
    });

    if (!subResult.rows || subResult.rows.length === 0) {
      return NextResponse.json(
        { error: `Submission with ID ${submissionId} not found.` },
        { status: 404 }
      );
    }

    const submission = subResult.rows[0];

    // 2. Fetch Control Answers for this Submission
    const ansResult = await turso.execute({
      sql: `SELECT control_id, control_name, implemented, notes FROM control_answers WHERE submission_id = ?`,
      args: [submissionId],
    });

    const answers = ansResult.rows || [];

    // 3. Resolve LLM Endpoint & Credentials safely
    let rawBaseUrl = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
    let rawModel = process.env.LLM_MODEL || 'openai/gpt-oss-120b';
    const apiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is missing from environment variables (GROQ_API_KEY / LLM_API_KEY).' },
        { status: 500 }
      );
    }

    // AUTO-CORRECT: If variables were accidentally swapped in .env
    if (rawBaseUrl.includes('openai/gpt') || !rawBaseUrl.startsWith('http')) {
      const temp = rawBaseUrl;
      rawBaseUrl = rawModel.startsWith('http') ? rawModel : 'https://api.groq.com/openai/v1';
      rawModel = temp;
    }

    // Clean base URL to prevent trailing slashes
    const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const endpointUrl = `${cleanBaseUrl}/chat/completions`;

    // 4. Construct System & User Prompts
    const systemPrompt = `You are an expert ISO/IEC 27001 Lead Auditor evaluating Business Unit self-assessments.
Your task is to review control implementations and output a JSON evaluation report.

STRICT RESPONSE FORMAT:
Return ONLY a valid JSON object matching this schema without markdown blocks:
{
  "score": number (0-100),
  "reports": [
    {
      "controlId": "string",
      "controlTitle": "string",
      "satisfaction": "Fully" | "Partially" | "No",
      "justification": "string",
      "gaps": [
        {
          "category": "string",
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

    const userPrompt = JSON.stringify({
      businessUnit: submission.business_unit,
      submitter: `${submission.submitter_name} (${submission.submitter_email})`,
      declarations: answers.map((ans: any) => ({
        controlId: ans.control_id,
        controlTitle: ans.control_name,
        implemented: ans.implemented === 1 || ans.implemented === true || ans.implemented === '1',
        notes: ans.notes || 'None provided',
      })),
    });

    // 5. Execute LLM Fetch Call
    const llmResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: rawModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!llmResponse.ok) {
      const errBody = await llmResponse.text();
      throw new Error(`LLM provider returned status ${llmResponse.status}: ${errBody}`);
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content || '';

    // Clean JSON response string
    const jsonString = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedAnalysis = JSON.parse(jsonString);

    // 6. Cache Analysis in Database
    await turso.execute({
      sql: `UPDATE submissions SET ai_analysis = ? WHERE id = ?`,
      args: [JSON.stringify(parsedAnalysis), submissionId],
    });

    return NextResponse.json({
      success: true,
      analysis: parsedAnalysis,
    });

  } catch (error: any) {
    console.error('AI Analyze Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}