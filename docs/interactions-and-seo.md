# 互動、GitHub API 與 SEO

> AI Build Stage 規格文件｜Draft v0.5｜2026-09-14  
> [返回規格索引](../SPEC.md)

本文件定義 0-backend reactions/comments 體驗、GitHub API 讀取與 rate limit，以及靜態頁面的搜尋引擎與分享 metadata。

## 17. Like／reaction 與評論

### 17.1 MVP 寫入體驗

- 「推薦此作品」顯示目前 `+1` count，點擊後開啟 `issue.url`。旁邊文案：「在 GitHub 按 👍 推薦」。
- 「查看／留下評論」顯示 comment count，開啟 `${issue.url}#new_comment_field`；若 anchor 行為改變，至少安全落到 Issue 頁。
- 不宣稱使用者已推薦，因網站無法在匿名、無 token 情況確認當前 viewer 是否已 reaction。
- 不以 query parameter 自動觸發寫入，不要求使用者貼 PAT。

### 17.2 顯示資料

- Action snapshot 是預設且最可靠來源，所有訪客共用，無瀏覽器 API 配額依賴。
- 可選 progressive enhancement：詳情頁以匿名 REST API 即時刷新該 Issue 的公開 count。失敗或被限流時保留 snapshot，不影響瀏覽。
- 評論摘要若顯示，排除 bot moderation comment、最長 280 字、顯示作者／時間／GitHub permalink；完整內容仍在 GitHub。
- comment body 視為不可信輸入。若渲染 Markdown，使用嚴格 allowlist sanitizer；MVP 建議顯示純文字摘要。

### 17.3 資料新鮮度

- `issue_comment` 事件可快速重建 comments。
- reaction 新增／刪除沒有直接 GitHub Actions trigger，最慢於排程同步後更新；UI 應標示「資料更新時間」，不承諾即時。
- 可提供 repository Actions 的手動同步按鈕給維護者，但公開訪客不能觸發 privileged workflow。

## 18. GitHub API 與 rate limit

### 18.1 Action 端

- 使用 `GITHUB_TOKEN` 的 authenticated quota；實際剩餘量以 response headers 為準，不在程式中硬編碼額度假設。
- 每次請求讀取 `x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after`，在 secondary rate limit 時採 exponential backoff + jitter。
- 避免 N+1：先取 approved candidates，再只對候選 Issue 查需要的 comments/reactions；無評論摘要需求時不抓 comments body。
- 達到低水位時停止非必要 enrichment，或讓 job 明確失敗並保留上一版部署。

### 18.2 瀏覽器端

- 匿名 REST 請求的 rate limit 低且通常按來源 IP 計；NAT、公司網路與大量訪客可能共用限制。
- runtime API 只能是可選增強，不能是列表、搜尋或首屏渲染的必要條件。
- 讀取 `x-ratelimit-*`；403/429 時不重試風暴，該 session 停用即時刷新直到 reset。
- 不使用 JSONP、不經未受信任 CORS proxy、不把任何 token 放入 localStorage 或 bundle。

## 19. SEO 與分享

- 全站有唯一 title、description、canonical、Open Graph 與 Twitter Card。
- 首頁與列表 metadata 在 build time 產生。
- 每個 Project 詳情由 Astro `getStaticPaths()` 產生獨立 HTML 與 metadata，不靠瀏覽器端 script 修改 `<head>`。
- 生成 `sitemap.xml`，只包含 approved + verified Project；下架項目下一版移出。
- `robots.txt` 允許公開頁，禁止無意義的搜尋 query 組合被索引；canonical 指向未帶 filter 的主要 URL。
- Project JSON-LD 可使用 `SoftwareApplication`、`WebSite` 或適合類型；資料必須與畫面一致，不虛構評分。GitHub `+1` 不等同正式 review rating，不輸出 `aggregateRating`。
- Project 頁未提供專屬圖片時使用全站預設 Open Graph 圖，不從 Issue 內容推測或抓取圖片。

