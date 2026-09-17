# 安全、邊界情況、測試與驗收

> AI Build Stage 規格文件｜Draft v0.5｜2026-09-14  
> [返回規格索引](../SPEC.md)

本文件集中管理安全與濫用防護、錯誤／邊界情況、測試策略及全案驗收條件。

## 20. 安全、隱私與濫用防護

### 20.1 不可信內容

- Issue body、title、comments、使用者名稱與 URL 均視為不可信。
- 禁止未消毒 `v-html`；Markdown 經成熟 parser + sanitizer，allowlist 僅保留必要標籤與屬性。
- URL allowlist 僅 `https:`；外部連結使用 `noopener noreferrer`，不接受自訂 HTML iframe/embed，並移除投稿 Markdown 中的 `img`。
- CSP 至少限制 `default-src 'self'`、`img-src 'self' data:`；`data:` 僅供專案內建 UI asset，不接受投稿資料 URI，且不開放任意 script。

### 20.2 投稿濫用

- 使用 GitHub 登入與 repository Issue 權限作第一層防護。
- Issue Form checkbox 明示禁止惡意程式、抄襲、仇恨、色情、詐騙、侵權與秘密資料。
- 所有上架皆人工審核；Action validation 不等於內容核准。
- 啟用 GitHub 的 lock、block、report、spam 管理；重複或惡意投稿可鎖定並標記 rejected。
- demo URL 做 DNS/private network 檢查時須避免 SSRF；MVP 不在 Action 主動抓取任意 URL body，只做語法檢查與人工開啟。若未來自動截圖，必須使用隔離瀏覽器、網路出口政策與逾時／大小限制。

### 20.3 權限與供應鏈

- workflow 使用最小權限，避免 `pull_request_target` 執行 fork 程式。
- third-party Actions pin SHA，npm lockfile 提交版本控制，定期 dependency audit。
- GitHub Pages 不包含投稿者 email、IP 或未選擇公開的資料。
- repository README／guidelines 說明資料公開、刪除／撤回程序與 reaction/comment 受 GitHub 條款管理。

## 21. 錯誤與邊界情況

| 情況 | 預期處理 |
|---|---|
| Issue 缺欄位／格式被手動破壞 | validation 失敗；不發布；summary 指向 Issue 與欄位 |
| 多個狀態 label | 不發布；要求維護者修正 |
| approved Issue 被刪除／取消 verified | 下一次部署移除 Project；舊 URL 顯示下架／找不到，不顯示舊內容 |
| demo/source URL 失效 | 不在 runtime 阻塞頁面；提供回報連結；審核後下架或修正 |
| 重複 slug | deterministic 加上 `-<issueNumber>`；build warning |
| 重複 demo URL | build 失敗或隔離後提交人工審核，不同 Issue 不得同時上架 |
| API 分頁超過 100 | 完整跟隨 Link header，測試多頁 fixture |
| API 403/429/5xx | backoff；無法得到完整 catalog 時不覆蓋上一版成功部署 |
| GitHub outage | 靜態網站維持上一版；互動 CTA 可能不可用並由 GitHub 恢復 |
| reaction/comment 剛新增 | 顯示舊 snapshot 與 generatedAt，排程／事件後更新 |
| Issue comment 含惡意 HTML | 純文字或 sanitizer 後顯示 |
| Issue 作者改名／刪帳 | 保存最新可取得 login；無法取得時顯示 `unknown`，Issue number mapping 不變 |
| repository/private 設定變更 | Pages/API 可能失效；MVP 要求 repository 與 Issues 公開 |
| 大型 catalog | 超過效能門檻時拆 index/detail 與預渲染分批，不導入後端搜尋 |

## 22. 測試策略

### 22.1 單元測試

- Issue Form parser：正常、缺欄位、heading 變形、舊 schema、惡意 Markdown。
- URL／slug／tag normalization。
- label 狀態機與發布 predicate。
- 搜尋正規化、filter AND/OR、deterministic sorting。
- JSON schema validation 與 duplicate detection。

### 22.2 整合測試

- 以 fixture 模擬多頁 GitHub Issues API、reactions、comments、rate limit、deleted Issue。
- catalog generator 只輸出 approved + verified。
- GitHub Pages 的 root/project base path 都能正確載入 asset 與 JSON。
- 下架後 sitemap、featured、搜尋索引與 detail route 同時移除。

### 22.3 E2E／可及性／效能

- 桌機與手機：探索、搜尋、篩選、分享 URL、開啟 Issue interaction。
- 直接開啟 Project 深層網址與 404 recovery。
- axe 或同等工具檢查關鍵頁；鍵盤完成所有主要流程。
- 以 320、375、768、1024、1440px 建立首頁、Project 列表與詳情頁 visual regression baseline；檢查固定左上光源與 pressed/focus/reduced-motion/forced-colors 狀態。
- Lighthouse CI 建議門檻：Performance ≥ 85、Accessibility ≥ 95、Best Practices ≥ 90、SEO ≥ 90（mobile preset；CI 環境波動可設容差）。

## 23. 驗收條件

### 23.1 投稿與審核

- [ ] GitHub new issue 頁只提供 Project Issue Form 與明確的其他聯絡入口，不開放無模板投稿。
- [ ] Project 名稱取自 Issue title；表單只有 `description`、`demo_url`、`ai_tools`、`agreements` 為必填。
- [ ] 表單與 catalog schema 均不包含 `project_name`、`tagline`、`build_story`、`pricing` 或 `languages`。
- [ ] 表單與 catalog schema 均不包含 `cover_image_url` 或 `gallery_urls`；`previewImageUrl` 只由 Action 從網站 metadata 衍生。
- [ ] 新投稿自動得到 `submission`、`status:pending`。
- [ ] 只有同時具有 `submission`、`status:approved`、`verified` 且狀態唯一的 Issue 會進入 catalog。
- [ ] 移除 `verified` 或改成 rejected/withdrawn 後，Project 在下一次成功部署消失。

### 23.2 資料與部署

- [ ] Action 支援 API pagination、排除 PR、schema validation、slug/demo 去重與 rate-limit handling。
- [ ] build log／artifact／前端 bundle 不含 token 或 secret。
- [ ] Issue/label/comment 事件與 schedule 能觸發相應資料更新；reaction 最終在排程後反映。
- [ ] 驗證或 API 完整性失敗時不覆蓋上一版成功網站。
- [ ] GitHub Pages 可由乾淨 checkout 以 lockfile 重現建置與部署。
- [ ] Astro 使用 `output: 'static'` 且沒有 server adapter、API route、server island 或 on-demand page。
- [ ] 每個 approved + verified Project 都由 `[slug].astro`／`getStaticPaths()` 產生可直接開啟的實體 HTML；下架後該輸出與 sitemap entry 同時消失。
- [ ] GitHub Pages root site 與 project site 的 `site`／`base` 測試皆通過，沒有硬編碼 root-relative internal link。

### 23.3 瀏覽體驗

- [ ] 未登入使用者可瀏覽所有 approved Projects 並完成前端搜尋、篩選、排序。
- [ ] 關閉 JavaScript 時仍可閱讀首頁、完整 Project 詳情與預設 Project 列表；只有即時搜尋／篩選等增強功能停用。
- [ ] 篩選狀態可由 URL 分享並在 reload 復原。
- [ ] Project 列表每頁顯示 9 件，分頁可用鍵盤操作，且篩選後頁碼會重設並避免空白頁。
- [ ] Project 詳情具有來源 Issue、verified 說明、推薦數、評論數、資料時間。
- [ ] 推薦與評論 CTA 導向同一張 Project Issue；網站不要求或保存 GitHub token。
- [ ] GitHub API 即時讀取失敗／限流時，頁面仍使用 snapshot 完整可用。
- [ ] loading、empty、error、stale 與 404 狀態均有可理解 UI。

### 23.4 SEO、安全與品質

- [ ] 每個 approved Project 有獨立 canonical、Open Graph 與 sitemap entry；pending/rejected 不出現在 SEO 產物。
- [ ] 不可信 Markdown/comment 不可執行 script 或注入 HTML；URL scheme 與 external link 屬性符合規格。
- [ ] 關鍵頁通過自動可及性測試，手機／桌機主要流程 E2E 通過。
- [ ] 無 Cloudflare Worker、Supabase、Firebase、自建 API/Auth/DB 或任何寫入代理服務。

### 23.5 視覺系統

- [ ] 全站使用集中式 design tokens，背景、panel、recessed、accent 與 elevation 不出現未說明的 one-off 值。
- [ ] 陰影與 highlight 一致呈現左上 45° 光源；button pressed state 會下移並轉為 inset shadow。
- [ ] 首頁 Catalog Console、Project card hardware details、recessed search/filter 與 LED status 皆符合 8.6–8.14。
- [ ] Project 卡片不需要投稿圖片；metadata 圖片只能使用 HTTPS，讀取或載入失敗時回退至 repository 內的 CSS grid，且不顯示替代文字圖樣。
- [ ] 安全紅只用於主要 action、active/focus 或 error，不成為大面積一般背景。
- [ ] 320–1440px 版面保留工業擬物語言，且無 shadow clipping、水平捲動或小於 48px 的 mobile touch target。
- [ ] `prefers-reduced-motion` 與 `forced-colors` 模式完整可用；功能與狀態不只依賴陰影、動畫或顏色。
- [ ] 使用 `@lucide/astro` 且不引入 React/Vue 等 UI framework runtime，production 不產生第三方 font/texture request。
