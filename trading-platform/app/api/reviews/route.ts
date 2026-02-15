import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync(
      `gh issue list --repo $(git remote get-url origin | sed 's/.*github.com\\///' | sed 's/\\.git$//') --search "label:review state:open" --json number,title,author,createdAt,body -q '.' 2>/dev/null || echo "[]"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const issues = JSON.parse(stdout || '[]');
    
    const comments = issues.map((issue: any, index: number) => ({
      id: index,
      prNumber: issue.number,
      prTitle: issue.title.replace('[Review] PR #', '').split(':').slice(1).join(':').trim() || issue.title,
      author: issue.author?.login || 'unknown',
      comment: issue.body?.substring(0, 200) || 'No comment',
      createdAt: issue.createdAt?.split('T')[0] || 'N/A',
      resolved: false,
    }));

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Failed to fetch review comments:', error);
    return NextResponse.json({ comments: [], error: 'Failed to fetch' }, { status: 500 });
  }
}
