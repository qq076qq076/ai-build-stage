import { describe, expect, it } from 'vitest';
import { projectCatalogSchema, projectSchema, type Project } from '../src/lib/catalog';
import { getPaginationItems, getTotalPages } from '../src/lib/pagination';
import { matchesProject, normalizeSearchText, sortProjects } from '../src/lib/search';
import { extractMetadataImage, formatDescription, parseIssueBody, slugify } from '../scripts/build-catalog.mjs';

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
  it('接受符合規格且沒有預覽圖片的 Project', () => {
    expect(projectSchema.parse(project)).toEqual(project);
    expect(projectCatalogSchema.parse({ schemaVersion: 2, generatedAt: '2026-09-14T00:00:00.000Z', repository: 'example/stage', projects: [project] }).projects).toHaveLength(1);
  });

  it('拒絕非 HTTPS demo URL', () => {
    expect(() => projectSchema.parse({ ...project, demoUrl: 'http://example.com' })).toThrow();
  });

  it('接受衍生的 HTTPS 預覽圖片並拒絕不安全網址', () => {
    expect(projectSchema.parse({ ...project, previewImageUrl: 'https://example.com/cover.jpg' }).previewImageUrl).toBe('https://example.com/cover.jpg');
    expect(() => projectSchema.parse({ ...project, previewImageUrl: 'http://example.com/cover.jpg' })).toThrow();
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

describe('作品分頁', () => {
  it('每頁九件並至少保留一頁', () => {
    expect(getTotalPages(0)).toBe(1);
    expect(getTotalPages(9)).toBe(1);
    expect(getTotalPages(10)).toBe(2);
    expect(getTotalPages(27)).toBe(3);
  });

  it('頁數較多時顯示目前頁附近、首尾與省略符號', () => {
    expect(getPaginationItems(6, 12)).toEqual([1, 'ellipsis', 4, 5, 6, 7, 8, 'ellipsis', 12]);
    expect(getPaginationItems(99, 12)).toEqual([1, 'ellipsis', 10, 11, 12]);
  });
});

describe('Issue Form parser', () => {
  it('從 Issue title 取得名稱並解析四個必要欄位', () => {
    const fields = parseIssueBody(`### 作品介紹
單機五子棋，可選擇不同強度挑戰電腦。

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
單機五子棋，可選擇不同強度挑戰電腦。

### 作品網址
https://example.com

### 使用的 AI 工具
Codex

### 投稿確認
- [x] 我同意投稿規範
`, '[Project]: ')).toThrow();
  });

  it('以繁體中文說明過短的作品介紹', () => {
    expect(() => parseIssueBody(`### 作品介紹
太短

### 作品網址
https://example.com

### 使用的 AI 工具
Codex

### 投稿確認
- [x] 我同意投稿規範
`, '[Project]: Mechanical Notes')).toThrow('作品介紹至少需要 10 個字。');
  });

  it('中文名稱使用 Issue number 作為穩定 slug fallback', () => {
    expect(slugify('純中文作品', 42)).toBe('project-42');
  });
});

describe('網站 metadata 圖片', () => {
  it('依優先順序取得 Open Graph 圖片並解析相對網址', () => {
    const html = `<head>
      <meta name="twitter:image" content="https://cdn.example.com/twitter.jpg">
      <meta content="/images/cover.jpg?size=large&amp;format=webp" property="og:image">
    </head>`;
    expect(extractMetadataImage(html, 'https://example.com/projects/demo')).toBe('https://example.com/images/cover.jpg?size=large&format=webp');
  });

  it('沒有圖片或圖片不是 HTTPS 時回傳 undefined', () => {
    expect(extractMetadataImage('<head><title>Demo</title></head>', 'https://example.com')).toBeUndefined();
    expect(extractMetadataImage('<meta property="og:image" content="http://example.com/cover.jpg">', 'https://example.com')).toBeUndefined();
  });
});

describe('作品介紹排版', () => {
  it('保留段落、手動換行與清單結構', () => {
    const input = `## 第一段
第一行  內容
第二行



第二段
- 項目一
* 項目二`;
    expect(formatDescription(input)).toBe(`第一段
第一行 內容
第二行

第二段
• 項目一
• 項目二`);
  });
});
