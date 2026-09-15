# GitHub 投稿、審核與發布流程

> AI Build Stage 規格文件｜Draft v0.5｜2026-09-14  
> [返回規格索引](../SPEC.md)

本文件定義 Issue Form、labels/status、人工審核、GitHub Actions 與 GitHub Pages build/deploy。

## 9. 投稿、審核與上架流程

### 9.1 狀態機

```text
new submission
  └─► status:pending
        ├─► status:changes-requested ──creator edits──► status:pending
        ├─► status:rejected
        └─► status:approved + verified ──► published
                 ├─content edit──► revalidate──► remains published or pending
                 └─policy/security issue──► status:withdrawn ──► unpublished
```

每張 submission Issue 在任一時間必須恰有一個 `status:*` label。`verified` 是公開資格標記，只有 `status:approved` 與 `verified` 同時存在才可上架；雙條件可降低誤加單一 label 的發布風險。

### 9.2 流程

1. 創作者提交 Issue Form，自動加入 `submission`、`status:pending`。
2. validation Action 檢查最小必填 section、URL、系統產生的 slug 與 label 狀態，並為未填的選填欄位套用預設值；需要修改時由審核者留言。
3. 審核者檢查 demo 可用性、內容政策、重複項目與投稿聲明。
4. 通過時移除舊 `status:*`，加入 `status:approved`、`verified`；可再加 category、tag 與 `featured`。
5. label 事件觸發 deploy Action。Action 只查詢同時具備兩個發布 label 且未被 pull request／鎖定政策排除的 Issues。
6. Action parse、validate、normalize、排序，生成 JSON 與網站；驗證失敗不得發布不完整資料。
7. Issue 更新後重新部署。若移除 `verified`、改成 rejected/withdrawn 或刪除 Issue，下一次成功部署移除該 Project。

### 9.3 更新與撤回

- 創作者直接編輯原 Issue，不得另開 Issue 取代同一 Project。
- 重大欄位變更（demo URL、owner、內容類型）應重新審核；workflow 可自動把 `status:approved` 改成 `status:pending`，但只在 repository policy 明確授權時啟用。
- 創作者可留言請求撤回；維護者加 `status:withdrawn` 並移除 `verified`。
- Issue 關閉本身不代表下架；發布條件以 labels 為準。需要避免歧義時，規範 approved Issue 保持 open。

## 10. GitHub Issue Form

檔案：`.github/ISSUE_TEMPLATE/project-submission.yml`

### 10.1 欄位

| ID | 類型 | 必填 | 規則／用途 |
|---|---|---:|---|
| `description` | textarea | 是 | 50–2,000 字；允許 Markdown，輸出需消毒 |
| `demo_url` | input | 是 | 公開 `https://` URL；不得為 localhost/private IP |
| `source_url` | input | 否 | `https://` repository URL |
| `category` | dropdown | 否 | 單選、受控詞彙；未填時為 `other` |
| `tags` | input | 否 | 逗號分隔，最多 5 個，每項 2–24 字；未填時為空陣列 |
| `ai_tools` | input | 是 | 逗號分隔，至少 1 個，最多 10 個 |
| `creator_name` | input | 否 | 公開顯示名稱；未填時使用 Issue 作者的 GitHub login |
| `creator_url` | input | 否 | 公開 HTTPS 個人／團隊連結；未填時使用 Issue 作者的 GitHub profile URL |
| `agreements` | checkboxes | 是 | 單一必要確認：有權提交內容、理解資料公開，並同意投稿規範 |

Project 顯示名稱取自 Issue title 的 `[Project]:` 後方文字，須為 2–80 字。MVP 表單只有四個必填項目：`description`、`demo_url`、`ai_tools` 與 `agreements`。`slug`、GitHub 作者帳號、投稿時間、Issue URL 與 Issue number 均由 Action/GitHub 自動產生，不出現在表單中。`project_name`、`tagline`、`build_story`、`pricing`、`languages`、`cover_image_url` 與 `gallery_urls` 均不提供、也不解析。

### 10.2 表單穩定性

- 每個欄位的 Markdown heading 必須固定；parser 以 heading + sentinel comment 或 GitHub form 產生的固定結構解析。
- Issue title 格式：`[Project]: <project_name>`，Project 名稱以此為唯一來源；parser 必須驗證前綴與名稱長度。
- 表單預設 labels：`submission`, `status:pending`。
- 選填欄位若 GitHub Issue Form 無法直接呈現預設值，parser 必須依上表套用預設值；不得因空值造成驗證失敗。
- 禁用 blank issues；提供 security／general contact links，避免非投稿內容混入。
- Form schema 改版時更新 `schema_version` hidden marker（目前為 Issue body comment `<!-- schema-version: 2 -->`），parser 至少支援現行版與前一版。

## 11. Labels 與狀態

### 11.1 必要 labels

| Label | 意義 | 公開條件 |
|---|---|---:|
| `submission` | Project 投稿 Issue | 必須 |
| `status:pending` | 等待審核 | 否 |
| `status:changes-requested` | 等待投稿者補件 | 否 |
| `status:approved` | 內容審核通過 | 必須 |
| `status:rejected` | 不符合規範 | 否 |
| `status:withdrawn` | 已撤回／下架 | 否 |
| `verified` | 已完成發布資格驗證 | 必須 |
| `featured` | 首頁精選 | 否，僅影響排序／區塊 |

### 11.2 分類 labels

建議使用 `category:web`, `category:mobile`, `category:game`, `category:developer-tool`, `category:creative`, `category:productivity`, `category:education`, `category:other`。Issue Form category 與 label 應由 Action 對照，避免人工 label 與 body 值不一致。

### 11.3 衝突處理

- 同時存在多個 `status:*`：資料驗證失敗，該 Issue 不發布並在 Action summary 列出。
- 只有 `verified` 或只有 `status:approved`：不發布。
- `featured` 但未 approved：不發布且顯示 warning。
- 不明 category/tag：category 回退 `other` 前仍需人工確認；不得默默改變使用者內容。

## 14. GitHub Actions

### 14.1 `validate-submission.yml`

觸發：`issues` 的 `opened`, `edited`, `reopened`, `labeled`, `unlabeled`。

職責：

- 僅處理含 `submission` label 的 Issue。
- 解析 schema version 與固定欄位。
- 驗證最小必填欄位、長度、受控詞彙、URL scheme、系統產生的 slug 與互斥 status；選填欄位套用規格預設值。
- 在 job summary 輸出錯誤；如需回覆 Issue，需設定最小 `issues: write`，並避免每次 edit 重複洗版（更新既有 bot comment）。
- 不自動批准內容。

### 14.2 `deploy-pages.yml`

觸發：

- push 到預設分支（前端／script 變更）。
- `issues` 的 `opened`, `edited`, `deleted`, `transferred`, `closed`, `reopened`, `labeled`, `unlabeled`。
- `issue_comment` 的 `created`, `edited`, `deleted`，用於評論數／摘要更新。
- `schedule` 每 6 小時一次，補捉 reactions 變更（GitHub Actions 對 reaction 沒有直接 workflow event）。
- `workflow_dispatch` 手動重建。

建議 jobs：

1. `catalog`：取得 Issue、分頁、解析、驗證、生成 JSON／SEO。
2. `test`：typecheck、unit tests、schema validation、link policy tests。
3. `build`：執行 Astro static production build，驗證 `site`、`base` 與所有靜態 routes。
4. `deploy`：upload Pages artifact 並部署 environment。

### 14.3 權限與併發

```yaml
permissions:
  contents: read
  issues: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true
```

- 使用 Actions 自動提供的 `GITHUB_TOKEN`，不得建立長期 PAT。
- `GITHUB_TOKEN` 只存在 Action runner，不可寫入 bundle、JSON、log 或 artifact。
- 若 validation workflow 要回覆 Issue，將 `issues: write` 限定在該 workflow/job；來自 fork 的不可信程式不得在有寫入 token 的 context 執行。
- 所有 third-party Actions pin 到完整 commit SHA，並由 Dependabot/Renovate 管理更新。
- repository Settings 將 Pages source 設為 GitHub Actions，部署 environment 可加 required reviewers（視維護流程而定）。

### 14.4 GitHub API 查詢

優先使用 REST API，易於 cache 與分頁：

- 搜尋或列出 repository Issues，再於本地嚴格檢查三個必要 labels。
- 使用 `per_page=100` 並跟隨 `Link` pagination，不能假設只有一頁。
- reaction count 可使用 Issue 回應中的 reaction rollup；評論摘要需分頁讀取 comments。
- 排除 pull requests（Issue API 可能同時回傳 PR）。
- 使用 `If-None-Match`／ETag 的效益在 ephemeral runner 有限；若要跨 run cache，僅 cache 非敏感 response 並以 repository + query + schema version 作 key。

## 15. GitHub Pages build 與 deploy

- Node 使用 Active LTS 並鎖定 major/minor；套件以 lockfile 的 immutable install 安裝。
- build 前先產生資料，確保 UI 與 schema 同步。
- `astro.config.mjs` 使用 `output: 'static'`，不得安裝 deployment adapter；production build 不得依賴 runtime server env。
- 僅允許 `PUBLIC_*` 的公開環境變數，例如 repository URL、site URL、build SHA；秘密只能在 Action build process 使用，不能透過 Astro client bundle 暴露。
- Action 驗證 `dist/index.html`、`dist/data/projects.json`、404、robots 與 sitemap 存在。
- `site` 與 `base` 需同時支援 `<owner>.github.io` root site 與 `/<repo>/` project site；internal links 以 Astro base-aware helper 產生。
- 部署採 Astro 官方維護的 GitHub Pages Action 搭配 `actions/deploy-pages`；所有 Actions 仍 pin 完整 commit SHA，不在規格內鎖死會過期的 tag 版本。
- 自訂網域若啟用，提交 `CNAME` 並啟用 HTTPS enforcement。
- 部署失敗時保留上一版成功 Pages，不發布半成品；Action summary 提供失敗 Issue number 與欄位，不輸出 secrets。
