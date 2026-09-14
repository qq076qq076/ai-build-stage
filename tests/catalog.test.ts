import { describe, expect, it } from 'vitest';
import { projectCatalogSchema, projectSchema, type Project } from '../src/lib/catalog';
import { matchesProject, normalizeSearchText, sortProjects } from '../src/lib/search';

const project: Project = {
  id: 'gh:example/stage#12',
  slug: 'mechanical-notes',
  title: 'Mechanical Notes',
  tagline: '用 AI 整理研究筆記',
  description: '將散落的研究資料整理成可搜尋的卡片。',
  demoUrl: 'https://example.com/demo',
  category: 'productivity',
  tags: ['筆記'],
  aiTools: ['Codex'],
  creator: { name: 'Maker', githubLogin: 'maker' },
  pricing: 'free',
  languages: ['zh-TW'],
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
    expect(projectCatalogSchema.parse({ schemaVersion: 1, generatedAt: '2026-09-14T00:00:00.000Z', repository: 'example/stage', projects: [project] }).projects).toHaveLength(1);
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
