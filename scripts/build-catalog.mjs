import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const repository = process.env.GITHUB_REPOSITORY ?? process.env.CATALOG_REPOSITORY ?? 'qq076qq076/ai-build-stage';
const token = process.env.GITHUB_TOKEN;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(root, 'public/data/projects.json');
const requiredLabels = ['submission', 'status:approved', 'verified'];
const statusPrefix = 'status:';

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
  description: z.string().min(50).max(2_000),
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
  const approvedAt = await approvalDate(issue.number, issue.updated_at);
  return {
    id: `gh:${repository}#${issue.number}`,
    slug: slugify(fields.name, issue.number),
    title: fields.name,
    description: plainText(fields.description),
    demoUrl: fields.demoUrl,
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
  const projects = [];
  for (const issue of candidates) {
    const statuses = issue.labels.filter((label) => label.name.startsWith(statusPrefix));
    if (statuses.length !== 1) throw new Error(`Issue #${issue.number} 有 ${statuses.length} 個 status:* labels，拒絕發布。`);
    projects.push(await normalizeIssue(issue));
  }
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
