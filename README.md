# AI Build Stage

AI Build Stage 是一個展示「使用 AI 製作的專案」的公開平台。創作者可以透過 GitHub Issue 投稿，訪客則能在網站上瀏覽、搜尋與篩選作品，並前往作品對應的 Issue 推薦或留言。

平台採用 0 backend 架構，不建置自有 API、帳號系統或資料庫；GitHub Issues 是專案內容與社群互動的唯一資料來源，GitHub Pages 則負責提供公開網站。

## 專案用途

- 集中展示社群使用 AI 完成的網站、工具、應用程式與實驗作品。
- 提供格式一致且容易參與的 GitHub Issue 投稿入口。
- 確保網站上的每個作品都對應一張經過審核的 Issue。
- 讓訪客能依關鍵字、分類、工具與標籤探索作品。
- 將推薦與評論保留在 GitHub，維持公開、可追溯的互動紀錄。

## GitHub Pages 連接

公開網站預定由 [GitHub Pages](https://qq076qq076.github.io/ai-build-stage/) 提供，內容來源與發布關係如下：

```text
GitHub Issue Form 投稿
        ↓
維護者審核 Issue
        ↓
加上 approved 與 verified labels
        ↓
GitHub Actions 整理通過審核的專案資料
        ↓
GitHub Pages 顯示公開作品目錄與專案頁面
```

只有同時具有 `submission`、`status:approved` 與 `verified` labels 的 Issue 才會出現在 GitHub Pages。每個公開 Project 都保留其來源 Issue 編號與連結，作為投稿、審核狀態和互動資料的共同識別。

## 推薦與評論

- **推薦／Like：** 使用對應 Issue 的 `+1` reaction。
- **評論：** 使用對應 Issue 的 comments。
- **身分與權限：** 由 GitHub 帳號及 GitHub 原生權限處理。
- **網站角色：** GitHub Pages 負責展示資料；互動操作會引導使用者前往對應 Issue。

這項設計讓平台不需要額外導入 Cloudflare Worker、Supabase、Firebase、自建 API、Auth 或資料庫。

## 投稿與專案文件

- [建立新投稿](https://github.com/qq076qq076/ai-build-stage/issues/new/choose)
- [審核操作說明](./docs/moderation.md)
- [產品與技術規格](./SPEC.md)
