import { lookup } from 'node:dns/promises';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const repository = process.env.GITHUB_REPOSITORY ?? process.env.CATALOG_REPOSITORY ?? 'qq076qq076/ai-build-stage';
const token = process.env.GITHUB_TOKEN;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'public/data/projects.json');
const requiredLabels = ['submission', 'status:approved', 'verified'];
const statusPrefix = 'status:';
const metadataImageKeys = ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src'];
const metadataResponseLimit = 512 * 1024;

const headings = {
  description: '作品介紹', demo: '作品網址', source: '原始碼網址', category: '分類', tags: '標籤',
  tools: '使用的 AI 工具', creatorName: '創作者名稱', creatorUrl: '創作者網址', agreements: '投稿確認',
};

const categoryMap = new Map([
  ['網站', 'web'], ['行動應用', 'mobile'], ['遊戲', 'game'], ['開發工具', 'developer-tool'],
  ['創意內容', 'creative'], ['生產力', 'productivity'], ['教育', 'education'], ['其他', 'other'],
]);
const httpsUrl = z.string().refine((value) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'URL 必須是有效的 HTTPS 網址');

const submissionSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string()
    .min(10, '作品介紹至少需要 10 個字。')
    .max(2_000, '作品介紹不可超過 2,000 個字。'),
  demoUrl: httpsUrl,
  sourceUrl: httpsUrl.optional(),
  category: z.string(),
  tags: z.array(z.string().min(2).max(24)).max(5),
  aiTools: z.array(z.string().min(1).max(48)).min(1).max(10),
  creatorName: z.string().max(80).optional(),
  creatorUrl: httpsUrl.optional(),
  agreed: z.literal(true),
});

function clean(value) {
  const trimmed = value.trim();
  return trimmed === '_No response_' ? '' : trimmed;
}

function optional(value) {
  const result = clean(value ?? '');
  return result || undefined;
}

function list(value, max = Infinity) {
  return clean(value ?? '').split(/[，,\n]/).map((item) => item.trim()).filter(Boolean).slice(0, max);
}

function plainText(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, key) => {
    const normalized = key.toLowerCase();
    if (normalized.startsWith('#x')) return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    if (normalized.startsWith('#')) return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[normalized] ?? entity;
  });
}

function safeMetadataUrl(value, base) {
  try {
    const url = new URL(decodeHtmlEntities(value.trim()), base);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) return undefined;
    if (/^(?:0|10|127|169\.254|192\.168)\./.test(hostname)) return undefined;
    if (/^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname)) return undefined;
    if (hostname === '[::]' || hostname === '[::1]') return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function isPrivateAddress(address) {
  const normalized = address.toLowerCase().split('%')[0];
  if (isIP(normalized) === 4) {
    const [first, second] = normalized.split('.').map(Number);
    return first === 0 || first === 10 || first === 127 || first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && (second === 0 || second === 168)) ||
      (first === 198 && (second === 18 || second === 19));
  }
  if (isIP(normalized) === 6) {
    return normalized === '::' || normalized === '::1' || normalized.startsWith('::ffff:') ||
      /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8');
  }
  return true;
}

async function publicMetadataUrl(value, base) {
  const url = safeMetadataUrl(value, base);
  if (!url) return undefined;
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) return undefined;
  return url;
}

function metaAttributes(tag) {
  const attributes = new Map();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

export function extractMetadataImage(html, pageUrl) {
  const candidates = new Map();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = metaAttributes(tag);
    const key = (attributes.get('property') ?? attributes.get('name') ?? '').toLowerCase();
    const content = attributes.get('content');
    if (metadataImageKeys.includes(key) && content && !candidates.has(key)) candidates.set(key, content);
  }
  for (const key of metadataImageKeys) {
    const candidate = candidates.get(key);
    const image = candidate ? safeMetadataUrl(candidate, pageUrl) : undefined;
    if (image) return image.href;
  }
  return undefined;
}

async function readResponseHead(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let received = 0;
  try {
    while (received < metadataResponseLimit) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = metadataResponseLimit - received;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      received += chunk.byteLength;
      html += decoder.decode(chunk, { stream: true });
      if (/<\/head\s*>/i.test(html)) break;
    }
    html += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
  return html;
}

async function fetchMetadataImage(pageUrl) {
  let current = await publicMetadataUrl(pageUrl);
  if (!current) return undefined;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AI-Build-Stage-Metadata/1.0',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(8_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      current = location ? await publicMetadataUrl(location, current) : undefined;
      if (!current) return undefined;
      continue;
    }
    if (!response.ok) return undefined;
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) return undefined;
    const image = extractMetadataImage(await readResponseHead(response), current);
    return image ? (await publicMetadataUrl(image))?.href : undefined;
  }
  return undefined;
}

export function parseIssueBody(body = '', issueTitle = '') {
  const sections = new Map();
  let current;
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^###\s+(.+?)\s*$/);
    if (match) { current = match[1]; sections.set(current, []); continue; }
    if (current) sections.get(current).push(line);
  }
  const get = (heading) => clean((sections.get(heading) ?? []).join('\n'));
  const name = clean(issueTitle).match(/^\[Project\]\s*:\s*(.+)$/i)?.[1]?.trim() ?? '';
  return submissionSchema.parse({
    name,
    description: get(headings.description),
    demoUrl: get(headings.demo),
    sourceUrl: optional(get(headings.source)),
    category: categoryMap.get(get(headings.category)) ?? 'other',
    tags: list(get(headings.tags), 5),
    aiTools: list(get(headings.tools), 10),
    creatorName: optional(get(headings.creatorName)),
    creatorUrl: optional(get(headings.creatorUrl)),
    agreed: /- \[[xX]\]/.test(get(headings.agreements)),
  });
}

export function slugify(value, issueNumber) {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return slug || `project-${issueNumber}`;
}

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ai-build-stage-catalog',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(url) {
  let attempt = 0;
  while (attempt < 4) {
    const response = await fetch(url, { headers: headers() });
    if (response.ok) return response;
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * 2 ** attempt + Math.random() * 250));
      attempt += 1;
      continue;
    }
    const message = await response.text();
    throw new Error(`GitHub API ${response.status}: ${message.slice(0, 400)}`);
  }
  throw new Error('GitHub API request failed');
}

async function fetchAll(url) {
  const results = [];
  let next = url;
  while (next) {
    const response = await request(next);
    results.push(...await response.json());
    const link = response.headers.get('link') ?? '';
    next = link.match(/<([^>]+)>; rel="next"/)?.[1] ?? '';
  }
  return results;
}

async function approvalDate(issueNumber, fallback) {
  const events = await fetchAll(`https://api.github.com/repos/${repository}/issues/${issueNumber}/events?per_page=100`);
  const approvals = events.filter((event) => event.event === 'labeled' && event.label?.name === 'status:approved');
  return approvals.at(-1)?.created_at ?? fallback;
}

async function normalizeIssue(issue) {
  const fields = parseIssueBody(issue.body ?? '', issue.title ?? '');
  const [approvedAt, previewImageUrl] = await Promise.all([
    approvalDate(issue.number, issue.updated_at),
    fetchMetadataImage(fields.demoUrl).catch((error) => {
      console.warn(`Issue #${issue.number} 無法讀取網站預覽圖片：${error instanceof Error ? error.message : '未知錯誤'}`);
      return undefined;
    }),
  ]);
  return {
    id: `gh:${repository}#${issue.number}`,
    slug: slugify(fields.name, issue.number),
    title: fields.name,
    description: plainText(fields.description),
    demoUrl: fields.demoUrl,
    ...(previewImageUrl ? { previewImageUrl } : {}),
    ...(fields.sourceUrl ? { sourceUrl: fields.sourceUrl } : {}),
    category: fields.category,
    tags: fields.tags,
    aiTools: fields.aiTools,
    creator: {
      name: fields.creatorName ?? issue.user.login,
      url: fields.creatorUrl ?? issue.user.html_url,
      githubLogin: issue.user.login,
    },
    featured: issue.labels.some((label) => label.name === 'featured'),
    verified: true,
    issue: {
      number: issue.number,
      nodeId: issue.node_id,
      url: issue.html_url,
      state: issue.state,
      reactions: { plusOne: issue.reactions?.['+1'] ?? 0 },
      commentsCount: issue.comments ?? 0,
    },
    submittedAt: issue.created_at,
    approvedAt,
    updatedAt: issue.updated_at,
  };
}

async function mapConcurrent(items, limit, mapper) {
  const output = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      output[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

async function validateOne(issueNumber) {
  const response = await request(`https://api.github.com/repos/${repository}/issues/${issueNumber}`);
  const issue = await response.json();
  if (!issue.labels?.some((label) => label.name === 'submission')) {
    console.log(`Issue #${issueNumber} 不是 submission，略過驗證。`);
    return;
  }
  parseIssueBody(issue.body ?? '', issue.title ?? '');
  const statuses = issue.labels.filter((label) => label.name.startsWith(statusPrefix));
  if (statuses.length !== 1) throw new Error(`Issue #${issueNumber} 必須恰有一個 status:* label。`);
  console.log(`Issue #${issueNumber} 投稿格式驗證通過。`);
}

async function buildCatalog() {
  const issues = await fetchAll(`https://api.github.com/repos/${repository}/issues?state=all&labels=submission&per_page=100`);
  const candidates = issues.filter((issue) => !issue.pull_request && requiredLabels.every((required) => issue.labels.some((label) => label.name === required)));
  for (const issue of candidates) {
    const statuses = issue.labels.filter((label) => label.name.startsWith(statusPrefix));
    if (statuses.length !== 1) throw new Error(`Issue #${issue.number} 有 ${statuses.length} 個 status:* labels，拒絕發布。`);
  }
  const projects = await mapConcurrent(candidates, 4, normalizeIssue);
  const seenSlugs = new Map();
  const seenDemos = new Map();
  for (const project of projects) {
    if (seenDemos.has(project.demoUrl)) throw new Error(`Issue #${project.issue.number} 與 #${seenDemos.get(project.demoUrl)} 使用相同 demo URL。`);
    seenDemos.set(project.demoUrl, project.issue.number);
    if (seenSlugs.has(project.slug)) project.slug = `${project.slug}-${project.issue.number}`;
    seenSlugs.set(project.slug, project.issue.number);
  }
  projects.sort((a, b) => Date.parse(b.approvedAt) - Date.parse(a.approvedAt) || a.id.localeCompare(b.id));
  const catalog = { schemaVersion: 2, generatedAt: new Date().toISOString(), repository, projects };
  await mkdir(dirname(outputPath), { recursive: true });
  const temporary = `${outputPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  await rename(temporary, outputPath);
  console.log(`Catalog generated: ${projects.length} approved + verified project(s).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const validateIndex = process.argv.indexOf('--validate-issue');
  if (validateIndex >= 0) {
    const issueNumber = Number(process.argv[validateIndex + 1]);
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error('請提供有效的 Issue number。');
    await validateOne(issueNumber);
  } else {
    if (!token) console.warn('未提供 GITHUB_TOKEN，公開 API 額度較低。');
    await buildCatalog();
  }
}
