# Industrial Skeuomorphism 設計系統

> AI Build Stage 規格文件｜Draft v0.5｜2026-09-14  
> [返回規格索引](../SPEC.md)

本文件是 AI Build Stage 的視覺與互動實作基準，適用於所有 Astro 頁面、元件與狀態。

## 8.6 視覺方向：Industrial Skeuomorphism

網站採「Industrial Realism」：介面如精密儀器控制台，具有實體塑膠、金屬面板、凹槽螢幕與可按壓控制鍵的觸感。視覺需兼具 Dieter Rams 式清晰秩序與 Teenage Engineering 式模組趣味，但不得退化成厚重、低對比或裝飾過量的傳統 neumorphism。

核心原則：

1. **固定光源**：所有亮部來自左上 45°，陰影落在右下；同一畫面不可混用方向。
2. **材質有層級**：凹槽、機殼、面板、浮動控制鍵分屬不同 elevation，不以任意 shadow 裝飾。
3. **互動服從物理**：按鈕按下時位移並轉為 inset shadow；卡片 hover 僅輕微升起。
4. **製造細節可辨識**：螺絲、通風槽、LED、掃描線、刻印標籤用於建立品牌，但不能妨礙閱讀或點擊。
5. **功能色節制**：安全紅只用於主要操作、active/focus 與警示。一般資訊不以紅色大面積鋪底。
6. **純亮色模式**：MVP 不提供 dark mode；任何元件均不得依賴瀏覽器自動 dark color scheme。

## 8.7 Design tokens

所有 token 集中於 `src/styles/tokens.css`，Tailwind CSS 透過 Astro 官方支援的方式整合，theme 僅映射 CSS variables。元件不得直接散落 raw color/shadow 值；特殊示意元件可例外，但要以語意化 custom property 命名。

```css
:root {
  color-scheme: light;

  --color-chassis: #e0e5ec;
  --color-panel: #f0f2f5;
  --color-recessed: #d1d9e6;
  --color-ink: #2d3436;
  --color-ink-muted: #4a5568;
  --color-accent: #ff4757;
  --color-accent-ink: #ffffff;
  --color-shadow: #babecc;
  --color-highlight: #ffffff;
  --color-shadow-deep: #a3b1c6;
  --color-dark-panel: #2d3436;
  --color-dark-panel-muted: #a8b2d1;
  --color-ok: #22c55e;
  --color-warning: #eab308;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 32px;

  --shadow-card: 8px 8px 16px #babecc, -8px -8px 16px #ffffff;
  --shadow-floating: 12px 12px 24px #babecc, -12px -12px 24px #ffffff,
    inset 1px 1px 0 rgb(255 255 255 / 50%);
  --shadow-pressed: inset 6px 6px 12px #babecc, inset -6px -6px 12px #ffffff;
  --shadow-recessed: inset 4px 4px 8px #babecc, inset -4px -4px 8px #ffffff;
  --shadow-mechanical: 4px 4px 8px rgb(0 0 0 / 15%), -1px -1px 1px rgb(255 255 255 / 80%);
  --shadow-accent: 4px 4px 8px rgb(166 50 60 / 40%), -4px -4px 8px rgb(255 100 110 / 40%);
  --ease-mechanical: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

Elevation 對照：

| Level | 用途 | 表現 |
|---:|---|---|
| -1 | input、搜尋框、技術螢幕、槽溝 | `--shadow-recessed` |
| 0 | body／chassis | `--color-chassis`，無浮起陰影 |
| +1 | Project card、filter panel、section | `--shadow-card` |
| +2 | CTA、active badge、浮動控制鍵 | `--shadow-floating` 或 accent shadow |

## 8.8 Typography

- 主要字體：Inter，weights 400/500/600/700/800。
- 技術字體：JetBrains Mono；只用於數字、日期、Issue number、資料同步時間、badge、小型 uppercase label 與輸入內容。
- 字體以 npm package 或 repository 內自託管 WOFF2 提供；不得依賴 Google Fonts runtime request。
- Hero：mobile `3rem`、desktop 上限 `4.5rem`，weight 800，tracking `-0.03em`。
- Section heading：`2rem–2.5rem`，weight 700。
- Body：`1rem–1.125rem`、line-height `1.6–1.75`，閱讀欄寬不超過 `65ch`。
- Label／metadata：`0.75rem–0.875rem`、weight 700、uppercase、tracking `0.05em–0.08em`。
- 淺色面文字只允許非常輕的下緣 highlight；不可用模糊 text-shadow 犧牲清晰度。

## 8.9 核心元件外觀

### Physical button

- Primary：安全紅底、白字、uppercase、寬 tracking；同一 panel 原則上只有一個 primary action。
- Secondary：chassis 底、深色字、雙向 lift shadow；hover 可將文字轉 accent。
- Ghost：預設無 elevation，hover 才出現 recessed surface。
- `:active` 下移 2px、shadow 轉 inset，150ms 內完成；`:focus-visible` 使用 2px accent ring + offset，不能只用 glow。
- mobile touch target 最小 48×48px；disabled 仍須清楚可辨，不只以 opacity 表達。

### Bolted panel／Project card

- 16px radius、chassis/panel surface、`--shadow-card`，hover 最多上移 4px。
- Bolted panel 預設提供 32px 內容 padding，mobile 縮為 24px；頁面不得依賴跨元件 selector 補上必要內距。
- 四角螺絲用 pseudo-elements 或共用 `PanelHardware` 裝飾實作，距邊 12px；裝飾 `pointer-events: none`、`aria-hidden="true"`。
- 右上可放三個 recessed vent slots；在小尺寸卡片或 mobile 可隱藏，避免資訊密度過高。
- Project card 頂部圖片區固定為 4:3，優先顯示 build time 從作品網站 metadata 取得的預覽圖片並以 `object-fit: cover` 裁切。沒有圖片或載入失敗時顯示無文字的深色 CSS grid fallback；不要求投稿者提供圖片。
- 整張卡片只有一個主要詳情連結，內部 demo／Issue action 需避免 nested interactive elements。

### Recessed input／filter control

- 背景 `--color-chassis`、8px radius、`--shadow-recessed`，不以「完全無邊界」犧牲辨識；高對比模式需補 1px 實線 border。
- 技術輸入可用 monospace，搜尋文字仍可用 Inter 以提升閱讀性。
- 高度至少 48px；參考設計的 56px 適用主要搜尋框。
- focus 同時使用可見 outline/ring 與有限 glow，錯誤狀態包含文字訊息及 icon。

### Badge／LED

- verified、Issue number、category 與 sync status 採 monospace stamped label。
- LED 直徑 8–12px，綠色只表示 online/current、黃色表示 stale、紅色表示 action/error。
- pulse 僅用於真的會變動的狀態；靜態 verified 不動畫，且所有狀態均有文字，不只靠顏色。

## 8.10 品牌 signature elements

- Hero 右側建立純 CSS「Catalog Console」裝置：深色 4px bezel、recessed screen、scanlines、PWR LED、側邊實體鍵；螢幕內容顯示 catalog 數量、verified count、最新同步時間與抽象資料條，不使用 Project 圖片。
- 首頁「運作方式」以 recessed cylindrical pipe 串接投稿、審核、上架三個節點；mobile 隱藏 pipe，改為垂直流程。
- Project 詳情可用低對比 blueprint grid；dark technical panel 用於 Issue metadata/reactions 統計，不超過頁面主要可視區約三分之一。
- noise、carbon fiber、scanline 與 grid 皆使用本地 CSS／SVG asset，不向第三方 texture 網站發 request。Noise opacity 以 2–4% 起始；只有在實機可辨但不影響文字時才可提高。
- 不使用 testimonials、masking tape、push pins、price-tag holes 或 grayscale image effect，除非日後頁面真的出現對應語意；不得為了套風格而加入假內容。

## 8.11 Layout 與 responsive

- 主要 content max-width `72rem`；mobile 水平 padding 24px，desktop 48px。
- section vertical gap：mobile 64px、desktop 96px；card grid gap 24–32px。
- Hero：desktop 60/40 非對稱雙欄，mobile 文字在前、Catalog Console 在後。
- Project grid：mobile 1 欄、tablet 2 欄、desktop 3 欄；filter controls 在 mobile 進入可展開的 recessed drawer。
- Navbar desktop 為水平 ghost controls；mobile 使用 neumorphic menu button 與垂直 panel。
- 物理隱喻在所有 breakpoint 保留，但 mobile 可隱藏部分 screws/vents、縮短陰影距離並取消非必要位移。

## 8.12 Motion

- CSS transition/keyframes 優先；需要元素進退場時，以 Astro View Transitions 能力或小型原生 TypeScript progressive enhancement 處理，不導入 Framer Motion、Vue transition library 或通用 animation runtime。
- button press 150ms、icon 200ms、panel elevation 300ms、大型示意進場不超過 500ms。
- easing 使用 `--ease-mechanical`，overshoot 位移控制在 4px 內，避免介面顯得彈跳或暈動。
- 動畫只使用 transform/opacity；避免 layout-thrashing properties。
- `prefers-reduced-motion: reduce` 時關閉 LED pulse、旋轉、stagger、parallax 與非必要 transform，保留立即狀態切換。

## 8.13 Iconography

- 使用 `@lucide/astro`，不得安裝 React/Vue icon runtime；icon 在 build time 輸出 SVG，預設 stroke width 1.5。
- inline icon 16–18px、一般 control 20–24px、feature housing 28–32px。
- icon 應與文字 label 或資訊列成組；只有具備控制器語意時才使用 recessed/floating housing。首頁流程卡的 icon 不加圓形凸起底座，並與右側 technical label 對齊。純 icon button 必須有 accessible name 與 tooltip。
- GitHub brand mark 優先使用官方允許的 SVG asset，不能以近似 Lucide icon 冒充品牌標誌。

## 8.14 視覺效能與驗證

- 禁止以 JavaScript 逐 frame 計算陰影／光源；所有 texture、hardware detail 與 elevation 由 CSS 處理。
- 外部 font/texture request 為 0；首屏裝飾 asset 合計 gzip 目標小於 20 KB。
- 大量 box-shadow 可能增加 paint cost：列表同時可見卡片以 12 張為效能測試基準；低效能裝置可透過 media query 簡化多層陰影。
- 在 320、375、768、1024、1440px 寬度做 visual regression，特別檢查光源方向、shadow clipping、螺絲對齊、focus ring 與長中英文內容。
- Windows High Contrast／`forced-colors` 下移除擬物陰影，改用系統 border、ButtonText、Highlight，功能不可受影響。
