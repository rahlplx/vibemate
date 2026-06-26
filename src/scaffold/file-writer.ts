import * as fs from 'fs';
import * as path from 'path';

export function writeFile(
  baseDir: string,
  filePath: string,
  content: string
): void {
  const fullPath = path.join(baseDir, filePath);
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

export function writeFiles(
  baseDir: string,
  files: { path: string; content: string }[]
): void {
  for (const file of files) {
    writeFile(baseDir, file.path, file.content);
  }
}

export function fileExists(baseDir: string, filePath: string): boolean {
  const fullPath = path.join(baseDir, filePath);
  return fs.existsSync(fullPath);
}

export function readFile(baseDir: string, filePath: string): string | null {
  const fullPath = path.join(baseDir, filePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}
