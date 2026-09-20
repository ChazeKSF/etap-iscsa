import { NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    const result = await turso.execute({
      sql: `SELECT file_name, file_type, base64_data FROM evidence_files WHERE id = ?`,
      args: [fileId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = result.rows[0];
    return NextResponse.json({
      fileName: file.file_name,
      fileType: file.file_type,
      base64Data: file.base64_data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}