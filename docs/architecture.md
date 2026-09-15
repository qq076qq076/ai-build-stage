# 技術架構與資料模型

> AI Build Stage 規格文件｜Draft v0.5｜2026-09-14  
> [返回規格索引](../SPEC.md)

本文件定義 0-backend 邊界、Astro 靜態架構、Project ↔ Issue mapping、公開資料 schema，以及前端搜尋與篩選的實作方式。

## 5. 技術可行性與 0-backend 邊界

純 GitHub Pages JavaScript 無法安全保存可寫入 Issues API 的 token，也無法在沒有 OAuth/backend 的前提下代表使用者對 Issue 新增 reaction 或 comment。因此 MVP 採以下明確界線：

- 網站內可顯示由 Issue reactions/comments 產生的數字與摘要。
- 「推薦」按鈕開啟對應 Issue，提示使用者按 GitHub 的 👍 reaction；「留言」按鈕開啟該 Issue 的 comment 區。
- 寫入動作發生在 GitHub，登入、CSRF、濫用防護與權限由 GitHub 處理。
- 回到網站後，數字會在下一次資料同步／部署更新；可選擇以匿名 GitHub API 做即時唯讀刷新，但不可把 token 放進前端。

這仍符合「Like／評論以對應 Issue 為資料來源」與 0 backend。若未來要求按鈕不離開網站且能直接寫入，必須重新評估 GitHub App/OAuth callback 服務；該需求不屬於本規格的 0-backend MVP。

## 6. 系統架構

```text
Creator
  │ submit
  ▼
GitHub Issue Form ──► Issue: status:pending
                           │ moderator review
                           ▼
                    status:approved + verified
                           │ issues/labels event or scheduled sync
                           ▼
GitHub Action ──GitHub API──► validate/normalize/generate projects.json
      │                              │
      ├── generate routes/SEO files ─┤
      ▼                              ▼
  Astro static build            static assets
      └──────────────► GitHub Pages
                              │
                 browser search/filter/read
                              │
                   interaction CTA opens
                              ▼
             source Issue reactions/comments
```

### 6.1 建議目錄

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── project-submission.yml
│   │   └── config.yml
│   └── workflows/
│       ├── validate-submission.yml
│       └── deploy-pages.yml
├── docs/
│   ├── moderation.md
│   └── data-contract.md
├── public/
│   ├── data/projects.json
│   ├── textures/noise.svg
│   ├── robots.txt
│   └── _redirects-or-404-notes.md
├── scripts/
│   ├── fetch-projects.ts
│   ├── validate-projects.ts
│   └── generate-seo.ts
├── src/
│   ├── components/
│   │   ├── catalog/
│   │   └── ui/
│   ├── layouts/
│   ├── pages/
│   │   ├── projects/
│   │   │   └── [slug].astro
│   │   ├── index.astro
│   │   └── projects.astro
│   ├── scripts/
│   ├── styles/
│   │   ├── tokens.css
│   │   └── base.css
│   ├── types/
│   └── utils/
├── SPEC.md
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── package-lock.json
```

`public/data/projects.json` 可在 Action 的 build job 中產生，不一定提交回 repository。建議不自動 commit 產物，避免循環觸發與 noisy history；部署 artifact 應可由相同 Issue 狀態重現。

### 6.2 Astro rendering 與 islands 邊界

- `astro.config.mjs` 明確設定 `output: 'static'`；不得安裝 server adapter、建立 Astro API route、使用 server island 或將任何頁面改為 on-demand rendering。
- 首頁、投稿、規範、關於與每個 Project 詳情都輸出完整靜態 HTML，預設不送出 framework runtime。
- `src/pages/projects/[slug].astro` 透過 `getStaticPaths()` 讀取已驗證 catalog，為每個 approved + verified Project 產生實體頁面。
- Project Explorer 的搜尋／篩選／排序使用單一 `.astro` component 內的標準 `<script>` 或獨立 TypeScript module；不因一個互動區塊引入 React、Vue、Svelte 等 UI framework。
- 若日後確實需要 framework client island，必須另立 RFC，說明 hydration directive、bundle 成本與為何原生 script/custom element 不足；禁止 server-side island，因其違反 0 backend。
- build-time frontmatter 可讀本地 JSON，不可在訪客請求時讀 GitHub API。瀏覽器端匿名 GitHub API 仍只作可選的唯讀增強。

## 12. Project ↔ Issue mapping

- 一個 Project 對應且只對應一張 submission Issue。
- `project.id` 使用不會因 repository 搬移而立即碰撞的字串：`gh:<owner>/<repo>#<issueNumber>`。
- `issue.number` 是 repository 內的 stable primary key；`issue.nodeId` 可一併保存供未來 GraphQL 使用。
- `issue.url` 是所有互動的 canonical source。
- 重複判定主要依 normalized `demoUrl`，其次依 `sourceUrl` 與名稱；重複投稿應拒絕或合併回原 Issue。
- Issue transfer、repository rename 或 fork 會改變外部識別；MVP 不自動跨 repository migration，需由維護者執行資料遷移與 redirect 清單。

## 13. 公開資料 schema

輸出：`public/data/projects.json`。

```ts
export interface ProjectCatalog {
  schemaVersion: 2;
  generatedAt: string; // ISO 8601 UTC
  repository: string;  // owner/repo
  projects: Project[];
}

export interface Project {
  id: `gh:${string}/${string}#${number}`;
  slug: string;
  title: string;
  description: string;
  demoUrl: string;
  sourceUrl?: string;
  category: ProjectCategory;
  tags: string[];
  aiTools: string[];
  creator: {
    name: string;
    url?: string;
    githubLogin: string;
  };
  featured: boolean;
  verified: true;
  issue: {
    number: number;
    nodeId?: string;
    url: string;
    state: 'open' | 'closed';
    reactions: { plusOne: number };
    commentsCount: number;
  };
  submittedAt: string;
  approvedAt: string;
  updatedAt: string;
}
```

### 13.1 Schema 規則

- JSON 只包含 approved + verified Projects，不輸出 pending/rejected Issue 的內容。
- Project `title` 取自 Issue title 的 `[Project]:` 後方文字；`category='other'`、`tags=[]`，creator name/URL 使用 Issue 作者資料；`sourceUrl` 無值時省略。
- HTML/Markdown 顯示前必須消毒；如不需要富文字，將 Markdown 轉成受限 HTML 或純文字。
- 所有 URL 必須 parse 後檢查 `https:`；禁止 `javascript:`、`data:`、`file:` 與帶憑證 URL。
- `plusOne` 取 GitHub reaction `+1` 的 count；bot 自己的 reaction 若存在亦計入，除非另有明確排除規則。
- `approvedAt` 不使用 label API 難以穩定取得的隱含時間。建議 Action 第一次發布時維護一份 `data/approval-dates.json`，或由審核 bot 寫入格式固定的 approved comment；MVP 若不保留此資料，使用首次被產物觀測到的時間並記錄其限制。
- 產物以 JSON Schema 或 Zod 驗證；任一單項錯誤時預設整體 build 失敗，避免靜默漏件。可由 workflow 參數切換成隔離錯誤項目，但必須在 summary 明列。

## 16. 搜尋、篩選與排序

### 16.1 實作

- Astro build 先輸出可索引的完整 Project 列表；Project Explorer script 在瀏覽器載入一次 catalog 並增強為即時搜尋／篩選。JavaScript 未載入時仍能看到預設排序的 Projects 與一般分頁連結。
- 資料量小於 2,000 筆時在主執行緒建立正規化索引即可；互動程式集中在單一原生 TypeScript module/custom element，避免頁面級 hydration runtime。
- 正規化：Unicode NFKC、lowercase、trim、合併空白；中文以 substring，拉丁文字可 token prefix/fuzzy search。
- 若使用 Fuse.js，限制 keys 與 threshold，並 lazy-load 搜尋模組；也可先以原生 substring 實作 MVP。
- filters 使用 AND（不同維度）＋ OR（同一維度多選）。例如 category=game AND (tool=Claude OR tool=Codex)。
- 排序必須 deterministic，分數相同時依 `approvedAt desc`、再依 `id asc`。
- 所有使用者輸入只作字串比較，不插入 `innerHTML`。

### 16.2 效能門檻

- catalog gzip 目標小於 500 KB；超過時拆成 summary index 與 detail 檔。
- 搜尋輸入 debounce 100–200 ms。
- 列表超過 100 張卡片時分頁或虛擬化；MVP 預設每頁 24 筆。
- Project 卡片的 CSS 視覺圖樣不得增加網路請求，並需尊重 `prefers-reduced-motion`。
