# 後台管理（Decap CMS，GitHub PAT 登入）

本專案提供可視化後台（/admin）。登入方式為貼上 GitHub Personal Access Token（PAT），不需要額外的 OAuth 服務。

## 如何建立與使用 PAT
1. 建立 Fine-grained PAT（建議）
   - 前往 https://github.com/settings/tokens?type=beta
   - Resource owner：選擇你的帳號
   - Repository access：只勾選本倉庫（tonyonier99/Image-description-generator）
   - 設定權限：
     - Contents：Read and Write
     - Pull requests：Read and Write
     - Metadata：Read-only（預設）
   - 產生 Token，複製保存
2. 或使用 classic PAT（不建議、但可行）
   - 前往 https://github.com/settings/tokens
   - 勾選 repo scope（整體權限較大，請謹慎）
3. 登入
   - 造訪 /admin
   - 貼上 PAT，點「使用 Token 登入」
   - Token 只會存在當前分頁的 sessionStorage，關閉分頁即清除
4. 登出
   - 在 CMS 右上角登出，或手動關閉分頁；若需強制清除，可清 sessionStorage 的 decap:github_token

## 編輯流程
- 預設啟用 PR 審核流程（editorial_workflow）
- 你在 CMS 內修改 `config/categories.config.json` 與 `config/templates.manifest.json` 後，系統會自動建立 PR，待核後生效

## 資源與命名
- 類別：經典、菜單、房型、名片（各自獨立欄位配置）
- 模板命名：`<Category>_<編號>`；底圖命名：`<Category>_Empty_<編號>`
- 建議路徑：
  - `assets/templates/<Category>/*.png(jpg)`
  - `assets/templates/<Category>/empty/*.png(jpg)`

## 安全建議
- 只在信任的環境使用，網站請使用 HTTPS（GitHub Pages 預設）
- 儘量使用 Fine-grained PAT 並限制在本倉庫
- 如不再需要，請至 GitHub 設定頁面撤銷 Token
