# AI Build Stage

AI Build Stage 是以 GitHub Issues 作為內容與互動來源的 AI 作品展示平台。網站使用 Astro 在建置時產生靜態 HTML，並部署到 GitHub Pages；沒有自建 API、帳號系統或資料庫。

## 本機開發

需求：Node.js 22 與 npm。

```sh
npm ci
npm run dev
```

常用檢查：

```sh
npm run check
npm test
npm run build
npm run verify:build
```

公開 catalog 位於 `public/data/projects.json`。本機可使用既有 snapshot；GitHub Actions 部署時會執行 `npm run catalog:build`，只納入同時具有 `submission`、`status:approved`、`verified` 的 Issues。

## 投稿與審核

- 投稿入口：GitHub Issue Form
- 審核操作：[docs/moderation.md](./docs/moderation.md)
- 完整規格：[SPEC.md](./SPEC.md)

Like／推薦使用 Issue 的 `+1` reaction，評論使用同一張 Issue 的 comments。網站只讀取並展示資料，寫入時會帶使用者前往 GitHub。

必要 labels 由 `.github/labels.json` 定義；該檔案或同步程式變更並推送到 `main` 時，`sync-labels.yml` 會以最小 `issues: write` 權限建立或更新 labels。
