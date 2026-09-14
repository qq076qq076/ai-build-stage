# 未來擴充與實作計畫

> AI Build Stage 規格文件｜Draft v0.5｜2026-09-14  
> [返回規格索引](../SPEC.md)

本文件列出 0-backend 範圍內外的未來擴充、建議實作順序與尚待產品決策的事項。

## 24. 未來擴充

仍維持 0 backend 可做：

- 多語 UI 與多語搜尋正規化。
- Trending（以 Action 定期保存 reaction snapshot，計算時間窗增量）。
- GitHub-based contributor curation、年度精選、RSS/Atom feed。
- 預渲染每個詳情頁與離線 PWA。
- 以 repository 內受審核設定檔擴充 categories/tags。
- 使用 GitHub Discussions 作平台層級討論，但 Project 評論 canonical source 仍是原 Issue。

會改變 0-backend 邊界、必須另立 RFC 才能做：

- 網站內直接 reaction/comment、登入狀態與「我已推薦」。
- 私人投稿、草稿保存、個人收藏、通知與 moderation dashboard。
- 精準即時排行榜、跨 repository 寫入、推薦防作弊。
- 任何 GitHub OAuth App／GitHub App callback、token exchange 或寫入 proxy。

## 25. 建議實作順序

1. 初始化 Astro + TypeScript + Tailwind，設定 `output: 'static'`、file-based routes、測試、lint/typecheck、`@lucide/astro` 與集中式 design tokens；不安裝 UI framework integration 或 server adapter。
2. 建立 Issue Form、labels bootstrap 文件與 moderation runbook。
3. 定義 TypeScript/Zod schema、Issue fixtures、parser 與發布 predicate。
4. 實作 catalog Action script，再以本地 fixture 產出 JSON。
5. 先完成 PhysicalButton、BoltedPanel、RecessedInput、StatusLed 等基礎元件，再依 Industrial Skeuomorphism 規格完成首頁、列表、搜尋／篩選與 Project 詳情。
6. 加入 GitHub interaction CTA、snapshot counts、錯誤／stale 回退。
7. 完成 prerender/SEO、Pages workflow、安全 headers 可行範圍與 E2E。
8. 以測試 Issue 演練 pending → approved → updated → withdrawn 全流程後上線。

## 26. 待產品決策

以下不阻擋工程啟動，但應在公開上線前定案：

- repository owner/name、自訂網域與品牌名稱大小寫。
- category 與 tags 的最終受控詞彙。
- verified 的審核清單與拒絕／申訴政策。
- Project 詳情是否顯示最近 comments 摘要，或只顯示 count + GitHub 連結。
- reaction/comment 同步排程頻率與可接受的新鮮度 SLA。
- slug 首次發布時間的持久化方式，以及下架 URL 要顯示 tombstone 或一般 404。
- catalog 規模到多少筆時切換 summary/detail 分檔與完整預渲染。

