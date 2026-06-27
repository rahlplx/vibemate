import { serveStatic } from 'hono/bun';
import { app } from './api.js';
import * as path from 'path';
import * as fs from 'fs';

const ROOT = process.cwd();

app.get('/ui/*', serveStatic({ root: './src' }));

app.get('/', (c) => {
  const htmlPath = path.join(ROOT, 'src', 'ui', 'index.html');
  try {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.json({ error: 'Dashboard not found' }, 404);
  }
});

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT || '3777');

console.log(`\n  Vibemate v1.0.0`);
console.log(`  Dashboard: http://localhost:${port}`);
console.log(`  API:       http://localhost:${port}/api\n`);

export default {
  port,
  fetch: app.fetch,
};
