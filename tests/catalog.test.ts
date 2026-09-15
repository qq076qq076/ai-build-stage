import { describe, expect, it } from 'vitest';
import { projectCatalogSchema, projectSchema, type Project } from '../src/lib/catalog';
import { matchesProject, normalizeSearchText, sortProjects } from '../src/lib/search';
import { parseIssueBody, slugify } from '../scripts/build-catalog.mjs';

const project: Project = {
  id: 'gh:example/stage#12',
  slug: 'mechanical-notes',
  title: 'Mechanical Notes',
  description: '將散落的研究資料整理成可搜尋的卡片。',
  demoUrl: 'https://example.com/demo',
  category: 'productivity',
  tags: ['筆記'],
  aiTools: ['Codex'],
  creator: { name: 'Maker', githubLogin: 'maker' },
  featured: false,
  verified: true,
  issue: { number: 12, url: 'https://github.com/example/stage/issues/12', state: 'open', reactions: { plusOne: 8 }, commentsCount: 3 },
  submittedAt: '2026-09-01T00:00:00.000Z',
  approvedAt: '2026-09-02T00:00:00.000Z',
  updatedAt: '2026-09-03T00:00:00.000Z',
};

describe('catalog schema', () => {
  it('接受符合規格且不含圖片欄位的 Project', () => {
    expect(projectSchema.parse(project)).toEqual(project);
    expect(projectCatalogSchema.parse({ schemaVersion: 2, generatedAt: '2026-09-14T00:00:00.000Z', repository: 'example/stage', projects: [project] }).projects).toHaveLength(1);
  });

  it('拒絕非 HTTPS demo URL', () => {
    expect(() => projectSchema.parse({ ...project, demoUrl: 'http://example.com' })).toThrow();
  });
});

describe('search and sort', () => {
  it('正規化全形與大小寫文字', () => {
    expect(normalizeSearchText('  ＣＯＤＥＸ  工具 ')).toBe('codex 工具');
  });

  it('依工具與關鍵字篩選', () => {
    expect(matchesProject(project, { query: '研究', category: 'productivity', tool: 'codex', sort: 'newest' })).toBe(true);
    expect(matchesProject(project, { query: '遊戲', category: '', tool: '', sort: 'newest' })).toBe(false);
  });

  it('依推薦數排序並保持 deterministic fallback', () => {
    const another: Project = { ...project, id: 'gh:example/stage#13', slug: 'second', issue: { ...project.issue, number: 13, reactions: { plusOne: 20 } } };
    expect(sortProjects([project, another], 'recommended')[0]?.id).toBe(another.id);
  });
});

describe('Issue Form parser', () => {
  it('從 Issue title 取得名稱並解析四個必要欄位', () => {
    const fields = parseIssueBody(`### 作品介紹
這是一段超過五十個字的完整作品介紹，用來說明專案如何協助使用者整理研究資料，並且確保投稿格式能夠通過自動驗證程序。

### 作品網址
https://example.com

### 使用的 AI 工具
Codex, ChatGPT

### 投稿確認
- [x] 我同意投稿規範
`, '[Project]: Mechanical Notes');
    expect(fields.name).toBe('Mechanical Notes');
    expect(fields.aiTools).toEqual(['Codex', 'ChatGPT']);
    expect(fields.category).toBe('other');
    expect(fields.tags).toEqual([]);
  });

  it('拒絕沒有專案名稱的 Issue title', () => {
    expect(() => parseIssueBody(`### 作品介紹
這是一段超過五十個字的完整作品介紹，用來說明專案如何協助使用者整理研究資料，並且確保投稿格式能夠通過自動驗證程序。

### 作品網址
https://example.com

### 使用的 AI 工具
Codex

### 投稿確認
- [x] 我同意投稿規範
`, '[Project]: ')).toThrow();
  });

  it('中文名稱使用 Issue number 作為穩定 slug fallback', () => {
    expect(slugify('純中文作品', 42)).toBe('project-42');
  });
});
