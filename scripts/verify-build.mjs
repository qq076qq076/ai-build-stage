import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');
const requiredFiles = [
  'index.html',
  '404.html',
  'projects/index.html',
  'guidelines/index.html',
  'about/index.html',
  'data/projects.json',
  'robots.txt',
  'sitemap.xml',
];

for (const file of requiredFiles) await access(resolve(dist, file));

const catalog = JSON.parse(await readFile(resolve(dist, 'data/projects.json'), 'utf8'));
if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.projects)) {
  throw new Error('dist/data/projects.json 不符合 catalog 基本結構。');
}

const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
for (const project of catalog.projects) {
  await access(resolve(dist, 'projects', project.slug, 'index.html'));
  if (!sitemap.includes(`/projects/${project.slug}/`)) throw new Error(`sitemap 缺少 Project：${project.slug}`);
}

const htmlFiles = ['index.html', '404.html', 'projects/index.html', 'guidelines/index.html', 'about/index.html'];
const secretPatterns = [/github_pat_[A-Za-z0-9_]+/, /ghp_[A-Za-z0-9]+/, /Bearer\s+[A-Za-z0-9._-]{20,}/i];
for (const file of htmlFiles) {
  const html = await readFile(resolve(dist, file), 'utf8');
  if (!html.includes('<html lang="zh-Hant">')) throw new Error(`${file} 缺少 zh-Hant 語言宣告。`);
  if (!html.includes('rel="canonical"')) throw new Error(`${file} 缺少 canonical link。`);
  if (secretPatterns.some((pattern) => pattern.test(html))) throw new Error(`${file} 疑似包含秘密資料。`);
}

console.log(`Pages 產物驗證通過：${requiredFiles.length} 個必要檔案，${catalog.projects.length} 個 Project。`);
