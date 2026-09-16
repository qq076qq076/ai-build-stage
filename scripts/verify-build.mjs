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
  'og-image.jpg',
  'robots.txt',
  'sitemap.xml',
];

for (const file of requiredFiles) await access(resolve(dist, file));

const catalog = JSON.parse(await readFile(resolve(dist, 'data/projects.json'), 'utf8'));
if (catalog.schemaVersion !== 2 || !Array.isArray(catalog.projects)) {
  throw new Error('dist/data/projects.json 不符合 catalog 基本結構。');
}

const sitemap = await readFile(resolve(dist, 'sitemap.xml'), 'utf8');
for (const project of catalog.projects) {
  await access(resolve(dist, 'projects', project.slug, 'index.html'));
  if (!sitemap.includes(`/projects/${project.slug}/`)) throw new Error(`sitemap 缺少 Project：${project.slug}`);
}

const htmlFiles = [
  'index.html',
  '404.html',
  'projects/index.html',
  'guidelines/index.html',
  'about/index.html',
  ...catalog.projects.map((project) => `projects/${project.slug}/index.html`),
];
const secretPatterns = [/github_pat_[A-Za-z0-9_]+/, /ghp_[A-Za-z0-9]+/, /Bearer\s+[A-Za-z0-9._-]{20,}/i];
const seoMarkers = [
  'rel="canonical"',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'property="og:url"',
  'name="twitter:card"',
];
for (const file of htmlFiles) {
  const html = await readFile(resolve(dist, file), 'utf8');
  if (!html.includes('<html lang="zh-Hant">')) throw new Error(`${file} 缺少 zh-Hant 語言宣告。`);
  for (const marker of seoMarkers) {
    if (!html.includes(marker)) throw new Error(`${file} 缺少 SEO metadata：${marker}`);
  }
  if (!/<link rel="canonical" href="https:\/\//.test(html)) throw new Error(`${file} canonical 不是絕對 HTTPS URL。`);
  for (const property of ['image', 'url']) {
    if (!new RegExp(`<meta property="og:${property}" content="https://`).test(html)) {
      throw new Error(`${file} 的 og:${property} 不是絕對 HTTPS URL。`);
    }
  }
  if (secretPatterns.some((pattern) => pattern.test(html))) throw new Error(`${file} 疑似包含秘密資料。`);
}

console.log(`Pages 產物驗證通過：${requiredFiles.length} 個必要檔案，${catalog.projects.length} 個 Project。`);
