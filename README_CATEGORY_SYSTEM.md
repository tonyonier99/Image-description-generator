# 圖片描述產生器 - 類別系統文件

## 概述

本專案已升級為支援多類別的範本系統，提供更豐富的模板選擇和類別專屬的可調整選項。

## 類別系統架構

### 支援的類別

1. **Classic (經典)** - 傳統風格，適合一般圖片說明
2. **Menu (菜單)** - 適合餐廳菜品展示
3. **Room (房型)** - 適合房間類型展示  
4. **BusinessCard (名片)** - 專業商務風格

### 檔案結構

```
Image-description-generator/
├── templates/                    # 範本預覽圖片
│   ├── Classic/
│   │   ├── classic_1_demo.jpg
│   │   └── classic_2_demo.jpg
│   ├── Menu/
│   │   └── menu_1_demo.jpg
│   ├── Room/
│   │   └── room_1_demo.jpg
│   └── BusinessCard/
│       └── business_1_demo.jpg
├── backgrounds/                  # 範本背景圖片
│   ├── Classic/
│   │   ├── classic_1.png
│   │   └── classic_2.png
│   ├── Menu/
│   │   └── menu_1.png
│   ├── Room/
│   │   └── room_1.png
│   └── BusinessCard/
│       └── business_1.png
├── fonts/                        # 字體檔案
├── index.html                    # 主要 HTML 檔案
├── script.js                     # 主要 JavaScript 檔案
├── style.css                     # 主要 CSS 檔案
├── bg-template1.png             # 舊版相容檔案
├── bg-template2.png             # 舊版相容檔案
├── template1-demo.jpg           # 舊版相容檔案
└── template2-demo.jpg           # 舊版相容檔案
```

## 命名規範

### 範本檔案命名

- **範本預覽圖**: `templates/{Category}/{template_id}_demo.jpg`
- **範本背景圖**: `backgrounds/{Category}/{template_id}.png`

其中：
- `{Category}`: Classic, Menu, Room, BusinessCard
- `{template_id}`: 範本唯一識別碼，格式為 `{category_prefix}_{number}`

### 範例

```
templates/Classic/classic_1_demo.jpg
templates/Classic/classic_2_demo.jpg
templates/Menu/menu_1_demo.jpg
templates/Room/room_1_demo.jpg
templates/BusinessCard/business_1_demo.jpg

backgrounds/Classic/classic_1.png
backgrounds/Classic/classic_2.png
backgrounds/Menu/menu_1.png
backgrounds/Room/room_1.png
backgrounds/BusinessCard/business_1.png
```

## 新增範本步驟

### 1. 準備檔案

1. **準備範本預覽圖片** (建議尺寸: 400x300px 或保持 4:3 比例)
2. **準備範本背景圖片** (尺寸: 800x1120px)

### 2. 檔案放置

```bash
# 放置預覽圖片
templates/{Category}/{new_template_id}_demo.jpg

# 放置背景圖片  
backgrounds/{Category}/{new_template_id}.png
```

### 3. 更新配置

在 `script.js` 中找到 `CATEGORY_TEMPLATES` 設定，添加新範本：

```javascript
const CATEGORY_TEMPLATES = {
    Classic: [
        // 現有範本...
        {
            id: 'classic_3',
            name: '新經典範本',
            description: '新的經典風格範本',
            demoImage: 'templates/Classic/classic_3_demo.jpg',
            backgroundImage: 'backgrounds/Classic/classic_3.png',
            templateKey: 'template1' // 或 'template2'，繼承現有樣式
        }
    ],
    // 其他類別...
}
```

## 類別專屬選項

### 配置結構

每個類別可以定義專屬的可調整選項，在 `CATEGORY_SPECIFIC_OPTIONS` 中設定：

```javascript
const CATEGORY_SPECIFIC_OPTIONS = {
    Category: [
        {
            id: 'option_id',           // 唯一識別碼
            label: '選項名稱',          // 顯示名稱
            type: 'select',            // 目前僅支援 select
            options: [                 // 選項列表
                { value: 'value1', label: '選項1' },
                { value: 'value2', label: '選項2' }
            ],
            default: 'value1'          // 預設值
        }
    ]
}
```

### 現有選項

#### Classic (經典)
- **邊框樣式**: 無邊框, 簡單邊框, 優雅邊框
- **文字對齊**: 靠左, 置中, 靠右

#### Menu (菜單)  
- **價格顯示**: 顯示價格, 隱藏價格
- **貨幣符號**: NT$, $, €
- **分類標籤**: 顯示分類, 隱藏分類

#### Room (房型)
- **房間坪數**: 顯示坪數, 隱藏坪數  
- **設施圖示**: 完整設施, 基本設施, 無圖示
- **價格位置**: 右上角, 底部, 圖片覆蓋

#### BusinessCard (名片)
- **QR Code**: 顯示QR碼, 隱藏QR碼
- **Logo位置**: 左上角, 右上角, 置中
- **聯絡資訊布局**: 垂直排列, 水平排列

### 新增類別專屬選項

```javascript
// 在 CATEGORY_SPECIFIC_OPTIONS 中新增
NewCategory: [
    {
        id: 'new_option',
        label: '新選項',
        type: 'select',
        options: [
            { value: 'option1', label: '選項1' },
            { value: 'option2', label: '選項2' }
        ],
        default: 'option1'
    }
]
```

## 向後相容性

系統提供完整的向後相容機制：

### 檔案回退機制

1. **優先載入新路徑**: `backgrounds/{Category}/{template_id}.png`
2. **失敗時回退舊路徑**: `bg-template1.png` 或 `bg-template2.png`
3. **最終回退**: 使用預設背景

### 範例程式碼

```javascript
// 載入背景圖
backgroundImg.onerror = function() {
    // 嘗試向後相容的路徑
    const fallbackPath = template === '1' ? 'bg-template1.png' : 'bg-template2.png';
    if (bgImagePath !== fallbackPath) {
        const fallbackImg = new Image();
        fallbackImg.src = fallbackPath;
        // 處理載入...
    }
};
```

## 擴充指南

### 新增新類別

1. **更新類別列表**
```javascript
// 在 HTML select 中新增選項
<option value="NewCategory">新類別 (NewCategory)</option>
```

2. **配置範本**
```javascript
const CATEGORY_TEMPLATES = {
    // 現有類別...
    NewCategory: [
        {
            id: 'new_1',
            name: '新類別範本',
            description: '適合新用途',
            demoImage: 'templates/NewCategory/new_1_demo.jpg',
            backgroundImage: 'backgrounds/NewCategory/new_1.png',
            templateKey: 'template1'
        }
    ]
}
```

3. **建立資料夾結構**
```bash
mkdir -p templates/NewCategory
mkdir -p backgrounds/NewCategory
```

4. **新增類別專屬選項** (可選)
```javascript
const CATEGORY_SPECIFIC_OPTIONS = {
    // 現有類別...
    NewCategory: [
        {
            id: 'new_category_option',
            label: '新類別選項',
            type: 'select',
            options: [
                { value: 'option1', label: '選項1' },
                { value: 'option2', label: '選項2' }
            ],
            default: 'option1'
        }
    ]
}
```

### 自訂範本樣式

如需自訂新的範本樣式（不同於現有的 template1/template2），需要：

1. **擴充 userTextStyles 和 textOffsets**
```javascript
let userTextStyles = {
    template1: { /* 現有設定 */ },
    template2: { /* 現有設定 */ },
    template3: { /* 新範本設定 */ }
}
```

2. **更新 DESIGN_SPECS**
```javascript
const DESIGN_SPECS = {
    template1: { /* 現有規格 */ },
    template2: { /* 現有規格 */ },
    template3: { /* 新範本規格 */ }
}
```

3. **修改繪製邏輯**
在 `drawCompleteImage` 函數中新增對應的繪製邏輯。

## 技術架構

### 主要組件

1. **類別管理器** (`setupCategoryEventListeners`)
2. **範本載入器** (`loadTemplatesForCategory`)  
3. **選項管理器** (`loadCategorySpecificOptions`)
4. **相容性處理器** (背景圖片載入錯誤處理)

### 資料流

```
使用者選擇類別 → 載入對應範本 → 載入類別選項 → 使用者調整設定 → 生成圖片
```

### 關鍵函數

- `getSelectedCategory()`: 取得當前選中的類別
- `getSelectedTemplateInfo()`: 取得選中範本的詳細資訊
- `getCurrentCategorySettings()`: 取得當前類別的專屬設定
- `updateCategoryOption()`: 更新類別專屬選項

## 疑難排解

### 常見問題

1. **範本圖片不顯示**
   - 檢查檔案路徑是否正確
   - 確認圖片檔案存在
   - 查看瀏覽器開發者工具的錯誤訊息

2. **背景圖片載入失敗**
   - 系統會自動回退到舊版檔案
   - 檢查 console 日誌確認載入狀態

3. **類別選項不生效**
   - 確認選項配置正確
   - 檢查 `updateCategoryOption` 函數是否正常執行

### Debug 資訊

系統提供豐富的 console 日誌：
- `📂 切換類別: {category}`
- `🎛️ 載入 {category} 類別專屬選項: {count} 個`
- `✅ 背景圖載入成功: {path}`
- `⚙️ 更新 {category} 選項 {optionId}: {value}`

## 版本資訊

- **當前版本**: 類別系統 v1.0
- **相容性**: 完全向後相容舊版檔案
- **瀏覽器支援**: Chrome, Firefox, Safari, Edge (現代版本)

## 授權

本專案遵循原有授權條款。新增的類別系統功能同樣適用。