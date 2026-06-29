import { execFileSync } from 'child_process';

export interface CommitSummary {
  hash: string;
  author: string;
  date: string;
  message: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface CommitAnalysis {
  totalCommits: number;
  topContributors: { author: string; count: number }[];
  commitFrequency: 'active' | 'moderate' | 'stale';
  recentCommits: CommitSummary[];
  languagesFromDiffs: string[];
}

const EXT_LANG_MAP: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TSX', '.js': 'JavaScript', '.jsx': 'JSX',
  '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.rb': 'Ruby',
  '.java': 'Java', '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
  '.swift': 'Swift', '.kt': 'Kotlin', '.vue': 'Vue', '.svelte': 'Svelte',
};

export function analyzeCommits(repoPath: string, depth: number = 100): CommitAnalysis {
  try {
    const log = execFileSync(
      'git',
      ['log', '--format=%H|%an|%ai|%s', '-n', String(depth)],
      { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!log) return emptyAnalysis();

    const lines = log.split('\n').filter(Boolean);
    const authorCounts: Record<string, number> = {};
    const recentCommits: CommitSummary[] = [];

    for (const line of lines) {
      const [hash, author, date, ...rest] = line.split('|');
      const message = rest.join('|');
      if (author) authorCounts[author] = (authorCounts[author] || 0) + 1;
      if (recentCommits.length < 20 && hash) {
        recentCommits.push({
          hash: hash.trim(),
          author: author?.trim() ?? '',
          date: date?.trim() ?? '',
          message: message?.trim() ?? '',
          filesChanged: 0,
          insertions: 0,
          deletions: 0,
        });
      }
    }

    const topContributors = Object.entries(authorCounts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const commitFrequency = inferFrequency(recentCommits.map(c => c.date));
    const languagesFromDiffs = lines.length > 1
      ? extractLanguagesFromDiffs(repoPath, Math.min(lines.length - 1, 20))
      : [];

    return { totalCommits: lines.length, topContributors, commitFrequency, recentCommits, languagesFromDiffs };
  } catch {
    return emptyAnalysis();
  }
}

function emptyAnalysis(): CommitAnalysis {
  return { totalCommits: 0, topContributors: [], commitFrequency: 'stale', recentCommits: [], languagesFromDiffs: [] };
}

function inferFrequency(dates: string[]): 'active' | 'moderate' | 'stale' {
  if (dates.length === 0) return 'stale';
  const mostRecent = new Date(dates[0]);
  if (isNaN(mostRecent.getTime())) return 'stale';
  const daysSince = (Date.now() - mostRecent.getTime()) / 86_400_000;
  if (daysSince < 7) return 'active';
  if (daysSince < 30) return 'moderate';
  return 'stale';
}

function extractLanguagesFromDiffs(repoPath: string, lookback: number): string[] {
  try {
    const files = execFileSync(
      'git',
      ['diff', '--name-only', `HEAD~${lookback}`, 'HEAD'],
      { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!files) return [];
    const langs = new Set<string>();
    for (const file of files.split('\n').filter(Boolean)) {
      const ext = '.' + file.split('.').pop()?.toLowerCase();
      const lang = EXT_LANG_MAP[ext];
      if (lang) langs.add(lang);
    }
    return Array.from(langs);
  } catch {
    return [];
  }
}
