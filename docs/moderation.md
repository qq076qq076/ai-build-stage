# 作品審核操作手冊

> [返回規格索引](../SPEC.md)

## 必要 labels

| Label | 建議顏色 | 用途 |
|---|---|---|
| `submission` | `#1d76db` | Project 投稿 |
| `status:pending` | `#eab308` | 等待審核 |
| `status:changes-requested` | `#fbca04` | 等待補件 |
| `status:approved` | `#0e8a16` | 審核通過 |
| `status:rejected` | `#d73a4a` | 不符合規範 |
| `status:withdrawn` | `#6a737d` | 撤回或下架 |
| `verified` | `#22c55e` | 具備公開資格 |
| `featured` | `#ff4757` | 首頁精選 |

## 審核步驟

1. 確認 validation workflow 通過。
2. 開啟作品網址，確認內容可公開瀏覽且不是 localhost、私人網段、登入牆或惡意連結。
3. 確認投稿者有說明使用的 AI 工具，且作品不是只有構想。
4. 搜尋既有 Issues，避免相同 demo URL 重複上架。
5. 如需補件，將唯一狀態改成 `status:changes-requested` 並留言說明。
6. 通過時移除原 `status:*`，加入 `status:approved` 與 `verified`。
7. 需要下架時，移除 `verified` 並將唯一狀態改成 `status:withdrawn`。

任何時候只能有一個 `status:*` label。Issue 關閉本身不代表下架，公開資格只由 labels 決定。

## Verified 的意義

`verified` 只表示維護者依投稿規範確認資料與連結，不代表平台保證作品品質、安全性、準確性或商業適用性。

