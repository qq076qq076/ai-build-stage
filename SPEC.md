# AI Build Stage — 規格索引

> 文件狀態：Draft v0.6  
> 最後更新：2026-09-15  
> 適用範圍：MVP 產品、Astro 前端、GitHub Issues、GitHub Actions、GitHub Pages  
> 核心約束：0 backend；不得導入自建 API、資料庫或驗證服務

## 1. 文件目的

本文件是 AI Build Stage 的規格入口與最高層決策摘要。詳細需求依主題拆分於 `docs/`，工程、設計與審核工作應以對應主題文件為準。

## 2. 規格文件導覽

| 文件 | 主題 | 主要讀者 |
|---|---|---|
| [產品定位與使用者體驗](./docs/product.md) | 產品定位、目標使用者、MVP／非目標、資訊架構、頁面與 UX | Product、Design、Frontend |
| [Industrial Skeuomorphism 設計系統](./docs/design-system.md) | tokens、字體、元件、responsive、motion、icon 與 visual QA | Design、Frontend |
| [技術架構與資料模型](./docs/architecture.md) | 0-backend、Astro static architecture、mapping、schema、搜尋／篩選 | Frontend、Platform |
| [GitHub 投稿、審核與發布流程](./docs/github-workflows.md) | Issue Form、labels/status、moderation、Actions、Pages deploy | Maintainer、Platform |
| [互動、GitHub API 與 SEO](./docs/interactions-and-seo.md) | reactions/comments、API rate limit、SEO 與分享 | Frontend、Product |
| [安全、邊界情況、測試與驗收](./docs/security-and-quality.md) | 安全、濫用防護、錯誤、測試與 acceptance criteria | 全體工程、QA |
| [未來擴充與實作計畫](./docs/roadmap.md) | roadmap、實作順序、待決策事項 | Product、Engineering Lead |

### 建議閱讀順序

1. 所有人先閱讀本索引與產品文件。
2. Frontend 接著閱讀設計系統、技術架構、互動與 SEO。
3. Platform／Maintainer 閱讀 GitHub workflow 與安全品質文件。
4. 開始實作前確認 roadmap 中的待產品決策是否會影響當期工作。

## 3. 核心產品決策

- 平台展示大家使用 AI 製作的公開 Project。
- 投稿使用 GitHub Issue Form；不建立平台自有帳號或表單 backend。
- 每個上架 Project 必須對應一張 GitHub Issue。
- 只有同時帶有 `submission`、`status:approved`、`verified` 且狀態唯一的 Issue 可以公開。
- 搜尋、篩選與排序在瀏覽器端完成。
- Like／推薦只計對應 Issue 的 `+1` reaction；評論 canonical source 是同一 Issue 的 comments。
- 寫入 reactions/comments 時導向 GitHub，由 GitHub 處理登入與濫用防護；網站本身不持有寫入 token。
- 投稿表單不包含 `cover_image_url` 或 `gallery_urls`，Project 展示不依賴投稿圖片。
- Project 名稱直接取自 Issue title 的 `[Project]:` 後方文字，不在表單內重複填寫。
- MVP 表單只有 `description`、`demo_url`、`ai_tools`、`agreements` 四個必填項目；其他欄位選填或由 GitHub 推導。

## 4. 核心技術決策

- 前端使用 Astro + TypeScript + Tailwind CSS。
- Astro 設定 `output: 'static'`；不使用 server adapter、API route、server island 或 on-demand rendering。
- Project 詳情透過 `[slug].astro` 與 `getStaticPaths()` 產生可直接存取的實體 HTML。
- 一般頁面不載入 UI framework runtime；Project Explorer 使用最小原生 TypeScript progressive enhancement。
- GitHub Issues 是內容及互動的 system of record。
- GitHub Actions 負責驗證、資料正規化、catalog 生成、測試與部署。
- GitHub Pages 是唯一正式執行環境；不加入 Cloudflare Worker、Supabase、Firebase、自建 API/Auth/DB。
- 瀏覽器匿名 GitHub API 只能是可選的唯讀增強；靜態 snapshot 必須能獨立完成主要瀏覽體驗。

## 5. 核心設計決策

- 視覺風格為 Industrial Skeuomorphism／Industrial Realism。
- 固定使用左上 45° 光源、工業冷灰機殼、recessed controls、bolted panels 與節制的安全紅。
- Project 卡片不使用投稿圖片，以 category、initials 或 slug 衍生的 CSS schematic pattern 建立辨識度。
- tokens 集中於 `src/styles/tokens.css`；icon 使用 `@lucide/astro`。
- MVP 僅提供 light mode，並完整支援 keyboard、WCAG AA、`prefers-reduced-motion` 與 `forced-colors`。

## 6. 規格優先順序

若需求或文件互相衝突，依下列順序判定：

1. 0-backend 與秘密不得進入公開網站的安全邊界。
2. 只有 approved + verified Issue 能被發布的資料完整性規則。
3. [安全與驗收規格](./docs/security-and-quality.md)。
4. [技術架構](./docs/architecture.md)與[GitHub workflow](./docs/github-workflows.md)。
5. [產品與 UX](./docs/product.md)及[設計系統](./docs/design-system.md)。
6. [未來擴充](./docs/roadmap.md)；其中內容不自動納入 MVP。

如仍無法判定，須在 implementation PR 中提出決策記錄，不得默默擴張 backend、認證或資料儲存範圍。

## 7. 文件維護規則

- 改動公開資料欄位時，同步更新 `docs/architecture.md`、Issue parser 測試與 schema version。
- 改動投稿／審核流程時，同步更新 `docs/github-workflows.md` 與 `docs/security-and-quality.md` 的驗收條件。
- 改動色彩、elevation、元件互動時，集中更新 `docs/design-system.md`，不得只在單一元件建立 one-off 規則。
- 會導入 backend、OAuth callback、寫入 proxy 或 runtime server 的提案必須另立 RFC，不能直接修改成既定 MVP。
- 各主題文件沿用原規格章節編號，方便 issue、commit 與 review comment 穩定引用。
