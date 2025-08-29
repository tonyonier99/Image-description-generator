# 遷移指南 (Migration Guide)

本文檔說明新的類別系統與資源命名規則的變更內容。

## 主要變更

### 1. 類別重新命名
- `BusinessCard` → `Card` (資料夾從 BusinessCard 改為 Card)
- 其他類別維持不變：`Classic`, `Menu`, `Room`

### 2. 新的資源命名規則

#### 範本檔案命名
- **舊格式**: `classic_1_demo.jpg`, `menu_1_demo.jpg`
- **新格式**: `{Category}_{Index}.{ext}`
- **範例**: 
  - `Classic_1.jpg` 或 `Classic_1.svg`
  - `Menu_1.svg`
  - `Room_1.svg`
  - `Card_1.svg`

#### 背景 (Empty) 檔案命名
- **舊格式**: `classic_1.png`, `menu_1.png`
- **新格式**: `{Category}_Empty_{Index}.{ext}`
- **範例**:
  - `Classic_Empty_1.png`
  - `Menu_Empty_1.png`
  - `Room_Empty_1.png`
  - `Card_Empty_1.png`

### 3. 新的資料夾結構

#### 舊結構
```
backgrounds/
├── Classic/
│   ├── classic_1.png
│   └── classic_2.png
├── Menu/
│   └── menu_1.png
└── BusinessCard/
    └── business_1.png

templates/
├── Classic/
│   ├── classic_1_demo.jpg
│   └── classic_2_demo.jpg
├── Menu/
│   └── menu_1_demo.jpg
└── BusinessCard/
    └── business_1_demo.jpg
```

#### 新結構
```
assets/templates/
├── Classic/
│   ├── Classic_1.jpg
│   ├── Classic_2.svg
│   ├── Classic_3.svg
│   ├── Classic_4.svg
│   ├── Classic_Empty_1.png
│   └── Classic_Empty_2.png
├── Menu/
│   ├── Menu_1.jpg
│   ├── Menu_2.svg
│   ├── Menu_3.svg
│   └── Menu_Empty_1.png
├── Room/
│   ├── Room_1.jpg
│   ├── Room_2.svg
│   ├── Room_3.svg
│   └── Room_Empty_1.png
└── Card/
    ├── Card_1.jpg
    ├── Card_2.svg
    └── Card_Empty_1.png
```

### 4. 設定檔案變更

#### 新的設定檔案結構 (`data/category-configs.json`)
```json
{
  "categories": [
    {
      "key": "classic",
      "label": "經典",
      "folder": "Classic",
      "ext": "svg",
      "count": 4,
      "options": [
        {
          "key": "title",
          "label": "主標題",
          "type": "text",
          "maxLength": 60
        }
      ]
    }
  ]
}
```

### 5. localStorage 鍵值

新系統使用以下 localStorage 鍵值：
- `idg:selected-category`: 當前選中的類別
- `idg:selected-template-by-category`: 各類別選中的範本索引
- `idg:category-configs-override`: 本地設定覆寫

### 6. 每類別獨立選項

新系統為每個類別提供完全獨立的可調整選項：
- 經典類別：主標題、副標題、強調色、邊框樣式
- 菜單類別：區段標題、品項、幣別、價格顏色
- 房型類別：房型名稱、入住人數、設施、景觀類型
- 名片類別：姓名、職稱、電話、Email、Logo位置

### 7. 本地管理後台

新的管理介面 (`/admin/`) 特色：
- **無需後端**：純前端實作，使用 localStorage
- **設定管理**：載入預設、匯出/匯入 JSON、清除覆寫
- **類別編輯**：新增、編輯、刪除類別及其選項
- **即時生效**：儲存後主應用程式立即使用新設定

### 8. 移除的檔案

以下檔案已從此版本中移除：
- `bg-template1.png`
- `bg-template2.png`
- `template1-demo.jpg`
- `template2-demo.jpg`

這些是舊版本的範本檔案，已由新的命名規則和資料夾結構取代。

## 如何使用新系統

### 開發者
1. 將現有資源移動到新的資料夾結構
2. 更新資源命名以符合新規則
3. 使用 `/admin/` 管理類別設定
4. 測試類別切換和範本選擇功能

### 使用者
1. 使用頂部的類別下拉選單切換不同類別
2. 每個類別顯示專屬的範本和選項
3. 選擇會自動保存到瀏覽器本地儲存
4. 可在管理頁面自訂類別和選項

## 向後相容性

新系統設計為向前相容：
- 若找不到新格式的檔案，會顯示佔位圖
- localStorage 設定會安全地初始化預設值
- 設定檔案載入失敗時會使用最小功能集合

## 疑難排解

### 找不到範本圖片
- 檢查檔案是否存在於正確的資料夾路徑
- 確認檔案命名符合 `{Category}_{Index}.{ext}` 格式
- 在設定中確認副檔名 (ext) 設定正確

### 類別選項沒有顯示
- 檢查 `data/category-configs.json` 是否可正常載入
- 確認 options 陣列格式正確
- 檢查瀏覽器開發者工具的 Console 是否有錯誤訊息

### 設定沒有保存
- 確認瀏覽器支援 localStorage
- 檢查是否有瀏覽器隱私設定阻擋本地儲存
- 嘗試清除瀏覽器快取重新載入