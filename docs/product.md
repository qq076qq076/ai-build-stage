# 產品定位與使用者體驗

> AI Build Stage 規格文件｜Draft v0.5｜2026-09-14  
> [返回規格索引](../SPEC.md)

本文件定義產品定位、目標使用者、MVP 邊界、資訊架構、頁面與核心 UX。視覺細節另見 [設計系統](./design-system.md)。

## 2. 產品定位

AI Build Stage 是一個展示「由人使用 AI 工具製作」之專案的公開舞台。它讓創作者用低摩擦方式投稿，讓瀏覽者探索、搜尋與篩選作品，並透過 GitHub Issue reactions 與 comments 提供推薦及評價。

平台不是 AI 作品代管服務，也不是社群帳號系統。每個上架 Project 都是一張經管理者審核的 GitHub Issue 的公開投影；GitHub 是內容、身份與互動的 system of record，GitHub Pages 是唯讀展示層，GitHub Actions 是建置與發布層。

### 2.1 成功指標

MVP 上線後追蹤下列指標，指標資料僅使用 GitHub Insights、Issues 與可選的隱私友善靜態站分析：

- 有效投稿數、通過率與平均審核時間。
- 已上架 Project 數與類別覆蓋度。
- Project Issue 的 `+1` reaction 數與 comment 數。
- 投稿表單的無效／重複投稿比例。
- GitHub Pages 部署成功率與資料新鮮度。

## 3. 目標使用者

### 3.1 創作者

- 使用 AI 輔助完成網站、App、遊戲、工具、內容或開源專案。
- 擁有 GitHub 帳號，願意以公開 Issue 投稿。
- 需要一個作品曝光頁與可被驗證的互動紀錄。

### 3.2 瀏覽者／評價者

- 想找 AI 專案靈感、案例、工具或可使用的作品。
- 不登入也能瀏覽與搜尋；要推薦或留言時使用 GitHub 帳號。

### 3.3 審核者／維護者

- 驗證連結、內容完整度、分類、授權與基本安全性。
- 透過 labels 與 Issue comment 管理狀態，不操作另一套後台。

## 4. MVP 範圍與非目標

### 4.1 MVP

- Astro + TypeScript + Tailwind CSS 的靜態網站，採 Industrial Skeuomorphism（工業擬物）視覺系統。
- 頁面與一般元件以 `.astro` 實作並在 build time 產生 HTML；只有搜尋、篩選、排序與 mobile menu 等必要互動載入少量瀏覽器端 TypeScript。
- 首頁、Project 列表、Project 詳情、投稿說明與關於／規範頁。
- GitHub Issue Form 投稿。
- 由 label 驅動的人工審核與上架流程。
- GitHub Action 將 approved Issue 轉換成版本化的靜態 JSON。
- 前端本機搜尋、排序與多條件篩選。
- Project 詳情顯示來源 Issue、推薦數、評論數與前往 GitHub 互動的操作。
- GitHub Pages 自動 build/deploy、SEO metadata、sitemap 與錯誤回退。

### 4.2 非目標

- 平台自有帳號、登入、session、權限與會員資料。
- Cloudflare Worker、Supabase、Firebase、自建 API/Auth/DB 或其他常駐後端。
- 在 GitHub Pages 內代替使用者直接送出 reaction/comment。
- 私人 Project、付費牆、聊天、私訊、通知中心。
- 檔案、圖片、影片或作品原始碼代管。
- 即時全文搜尋服務、個人化推薦演算法、排名防作弊系統。
- 在 MVP 中自動判定作品是否真的使用 AI；由投稿聲明與人工審核處理。

## 7. 資訊架構

### 7.1 全站導覽

- 首頁 `/`
- 探索 Projects `/projects`
- Project 詳情 `/projects/:slug`
- 投稿 `/submit`
- 投稿與社群規範 `/guidelines`
- 關於 `/about`
- 404 `/404.html`

### 7.2 URL 原則

- `slug` 由 Issue title 中的 Project 名稱正規化後產生；衝突時以 `-{issueNumber}` 結尾。
- Project URL 發布後應穩定。標題變更不得自動改 slug。
- 使用 Astro file-based routing，不使用 SPA router 或 hash history。`src/pages/projects/[slug].astro` 以 `getStaticPaths()` 生成 `projects/<slug>/index.html`，使 GitHub Pages 可直接開啟深層網址並提供完整 SEO metadata。
- `astro.config.mjs` 必須設定正式 `site`；若部署為 `<owner>.github.io/<repo>/` project site，同時設定 `base: '/<repo>'`，所有 internal link 與 public asset URL 使用 `import.meta.env.BASE_URL` 或共用 URL helper，禁止硬編碼 root-relative path。

## 8. 頁面與 UX 規格

### 8.1 首頁

- Hero：一句價值主張、主要 CTA「探索作品」、次要 CTA「投稿作品」。
- Featured：由 `featured` label 選出，最多 6 個；不足時以最新 approved 補足。
- Latest：依 `approvedAt` 由新到舊。
- 類別捷徑、平台運作方式與 GitHub 公開透明說明。
- 顯示資料最後同步時間。

### 8.2 Project 列表

- 搜尋欄支援 title、description、creator、tags、AI tools。
- 篩選：category、tags、AI tools 與 source availability。
- 排序：最新上架、最近更新、最多推薦、最多評論、名稱 A–Z。
- 篩選狀態同步到 query string，重新整理與分享網址後可復原。
- 顯示結果數、清除全部條件、空結果建議。
- 卡片至少顯示 title、description 摘要、creator、主要 category、最多 3 tags、推薦數與上架日期；頂部 4:3 圖片由 Action 自動讀取作品網站 metadata，不要求投稿者提供圖片，沒有圖片時顯示無文字的 CSS grid。

### 8.3 Project 詳情

- title 與完整 description；不設 Project 專屬圖片投稿欄位，卡片預覽圖片僅為自動衍生資料。
- demo、source code（若有）、creator 與 AI tools。
- tags、category、submitted/approved/updated 時間。
- 清楚顯示「Verified submission」與來源 Issue #number 連結；verified 只代表已依平台規則審核，不代表安全、品質或商業背書。
- 推薦數只計 `+1` reaction；不把 Issue body 作者的文字「like」或 comment emoji 納入。
- 評論區 MVP 顯示 comment count 與可選的最近評論唯讀摘要；主要 CTA 前往 GitHub 留言。
- 外部 demo/source 連結以新分頁開啟，加入 `rel="noopener noreferrer"`。

### 8.4 投稿頁

- 說明資格、公開資料、審核流程、禁止內容與更新方式。
- CTA 連至 GitHub Issue Form 的 `new?template=project-submission.yml`。
- 未登入 GitHub 時由 GitHub 處理登入後返回。

### 8.5 全站狀態

- Loading：骨架畫面，不阻塞導覽。
- Error：說明資料暫時無法載入，提供重試與來源 repository 連結。
- Empty：區分「尚無專案」與「篩選無結果」。
- Stale：資料超過 24 小時未同步時顯示非阻斷提示。
- 可及性：鍵盤可操作、可見 focus、表單有 label、裝飾圖樣不暴露為無意義內容、顏色對比至少 WCAG 2.1 AA、尊重 reduced motion。
