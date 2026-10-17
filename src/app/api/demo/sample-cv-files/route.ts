import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const demoDir = path.resolve(process.cwd(), 'demo_cvs');
    if (!fs.existsSync(demoDir)) {
      return NextResponse.json({ error: 'demo_cvs directory not found' }, { status: 404 });
    }

    const fileNames = fs.readdirSync(demoDir).filter(f => f.endsWith('.txt') || f.endsWith('.pdf'));
    fileNames.sort();

    const files = fileNames.map(name => {
      const fullPath = path.join(demoDir, name);
      const buffer = fs.readFileSync(fullPath);
      return {
        name,
        size: buffer.length,
        type: name.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
        contentBase64: buffer.toString('base64'),
      };
    });

    return NextResponse.json({ files });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Failed to load demo files', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
