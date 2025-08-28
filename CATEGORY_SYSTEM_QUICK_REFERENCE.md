# 類別系統快速參考

## 快速新增範本

### 1. 檔案命名規則
```
預覽圖: templates/{Category}/{id}_demo.jpg
背景圖: backgrounds/{Category}/{id}.png
```

### 2. 設定檔更新
```javascript
// 在 script.js 的 CATEGORY_TEMPLATES 中新增
{
    id: 'template_id',
    name: '範本名稱',
    description: '範本描述',
    demoImage: 'templates/Category/template_id_demo.jpg',
    backgroundImage: 'backgrounds/Category/template_id.png',
    templateKey: 'template1' // 或 'template2'
}
```

## 支援的類別

| 類別 | 英文代碼 | 說明 | 現有範本數量 |
|------|----------|------|-------------|
| 經典 | Classic | 傳統風格，一般用途 | 2 |
| 菜單 | Menu | 餐廳菜品展示 | 1 |
| 房型 | Room | 房間類型展示 | 1 |
| 名片 | BusinessCard | 商務專業風格 | 1 |

## 類別專屬選項

### Classic
- 邊框樣式 (無邊框/簡單/優雅)
- 文字對齊 (左/中/右)

### Menu  
- 價格顯示 (顯示/隱藏)
- 貨幣符號 (NT$/$$/€)
- 分類標籤 (顯示/隱藏)

### Room
- 房間坪數 (顯示/隱藏)
- 設施圖示 (完整/基本/無)
- 價格位置 (右上角/底部/覆蓋)

### BusinessCard
- QR Code (顯示/隱藏)
- Logo位置 (左上角/右上角/置中)
- 聯絡資訊布局 (垂直/水平)

## 核心技術架構

```javascript
// 主要配置物件
CATEGORY_TEMPLATES        // 範本配置
CATEGORY_SPECIFIC_OPTIONS // 類別選項配置
categorySpecificSettings  // 使用者設定

// 主要函數
loadTemplatesForCategory()      // 載入範本
loadCategorySpecificOptions()   // 載入選項
updateCategoryOption()          // 更新選項
getSelectedTemplateInfo()       // 取得範本資訊
getCurrentCategorySettings()    // 取得設定
```

## 目錄結構範例

```
├── templates/
│   ├── Classic/
│   │   ├── classic_1_demo.jpg ✓
│   │   └── classic_2_demo.jpg ✓  
│   ├── Menu/
│   │   └── menu_1_demo.jpg ✓
│   ├── Room/
│   │   └── room_1_demo.jpg ✓
│   └── BusinessCard/
│       └── business_1_demo.jpg ✓
└── backgrounds/
    ├── Classic/
    │   ├── classic_1.png ✓
    │   └── classic_2.png ✓
    ├── Menu/
    │   └── menu_1.png ✓
    ├── Room/
    │   └── room_1.png ✓
    └── BusinessCard/
        └── business_1.png ✓
```

## 向後相容

✅ 舊版檔案 (`bg-template1.png`, `template1-demo.jpg`) 保持可用
✅ 自動回退機制，新檔案載入失敗時使用舊檔案
✅ 現有功能完全不受影響