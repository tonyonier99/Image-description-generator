# 使用 GitHub 作為後端（Git-based Backend）

本專案的前端顯示內容由版本控管的 JSON 檔案提供，修改 JSON 後重新整理頁面即可生效。所有改動經由 GitHub PR 可追蹤與審核。

## 結構
- `config/categories.config.json`：各類別（經典、菜單、房型、名片）的欄位 schema
- `config/templates.manifest.json`：各類別模板（templates）與底圖（empties）數量
- 資源命名規範：
  - 範本：`<Category>_<編號>`（例：`Classic_1`）
  - 底圖：`<Category>_Empty_<編號>`（例：`Classic_Empty_1`）
- 建議資源路徑：
  - `assets/templates/<Category>/*.png(jpg)`
  - `assets/templates/<Category>/empty/*.png(jpg)`

## 如何調整顯示內容
1. 進入 GitHub 倉庫，編輯 `config/categories.config.json` 或 `config/templates.manifest.json`
2. 送出 PR 或直接 commit 到分支（依你的流程）
3. 前端重新整理頁面即讀取最新 JSON

## 類別下拉與設定保存
- 類別下拉預設 `Classic`
- 目前選擇的類別會保存於 `localStorage`，重整後仍保留

## 擴充新類別
1. 在 `categories.config.json` 新增類別節點，包含 `label` 與 `fields`
2. 在 `templates.manifest.json` 新增該類別的 `templates` 與 `empties` 數量
3. 依命名規範放置檔案至相對應資料夾
4. 重新整理頁面即可使用

## 可視化後台（選配）
若你希望透過圖形化介面調整 JSON 而非直接改檔，已提供 Decap CMS（GitHub PAT 登入），
在 `/admin` 頁面貼上 PAT 即可編輯設定並產生 PR。
