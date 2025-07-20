// 全域變數
let canvas, ctx;
let uploadedImage = null;
let isGenerated = false;

// 拖曳相關變數
let isDragging = false;
let dragType = null; // 'image', 'title', 'subtitle', 'description'
let dragStartX = 0;
let dragStartY = 0;

// 圖片偏移和縮放
let imageOffsetX = 0;
let imageOffsetY = 0;
let imageScale = 1;

// 文字偏移（兩個模板分別記錄）
let textOffsets = {
    template1: {
        title: { x: 0, y: 0 },
        subtitle: { x: 0, y: 0 },
        description: { x: 0, y: 0 }
    },
    template2: {
        title: { x: -50, y: -190 },
        subtitle: { x: 0, y: -113 },
        description: { x: 0, y: -82 }
    }
};

// 用戶自定義文字樣式（增強版，包含間距和尺寸）
let userTextStyles = {
    template1: {
        title: {
            fontSize: 48,
            fontFamily: 'Noto Sans TC',
            color: '#564529',
            fontWeight: 'bold',
            letterSpacing: 0,      // 字元間距
            lineHeight: 1.2,       // 行距倍數
            width: 640,            // 文字框寬度
            height: 80             // 文字框高度
        },
        subtitle: {
            fontSize: 24,
            fontFamily: 'Noto Sans TC',
            color: '#564529',
            fontWeight: 'normal',
            letterSpacing: 0,
            lineHeight: 1.3,
            width: 640,
            height: 60
        },
        description: {
            fontSize: 18,
            fontFamily: 'Noto Sans TC',
            color: '#8E7F69',
            fontWeight: 'normal',
            letterSpacing: 0,
            lineHeight: 1.6,
            width: 640,
            height: 380
        }
    },
    template2: {
        title: {
            fontSize: 73,
            fontFamily: 'Noto Sans TC',
            color: '#FFFFFF',
            fontWeight: 'bold',
            letterSpacing: 0,
            lineHeight: 1.2,
            width: 700,
            height: 40
        },
        subtitle: {
            fontSize: 28,
            fontFamily: 'Noto Sans TC',
            color: '#FFFFFF',
            fontWeight: 'lighter',
            letterSpacing: 0,
            lineHeight: 1.3,
            width: 600,
            height: 30
        },
        description: {
            fontSize: 20,
            fontFamily: 'Noto Sans TC',
            color: '#564529',
            fontWeight: 'lighter',
            letterSpacing: 3,
            lineHeight: 1.6,
            width: 700,
            height: 350
        }
    }
};

// 🔧 新增：預設值備份（確保重置時使用正確的數值）
const ORIGINAL_DEFAULTS = JSON.parse(JSON.stringify(userTextStyles));
const ORIGINAL_OFFSETS = JSON.parse(JSON.stringify(textOffsets));

// 設計規格 - 模板二移除色塊，圖片延伸
const DESIGN_SPECS = {
    canvas: {
        width: 800,
        height: 1120
    },
    
    template1: {
        imageArea: {
            x: 0,              
            y: 0,              
            width: 800,        
            height: 504,       // 45% of 1120 = 504px
            mode: 'cover-fullscreen',
            borderRadius: 0
        },
        draggableAreas: {
            title: {
                x: 80,
                y: 530,        
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120      
            },
            subtitle: {
                x: 80,
                y: 620,        
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120      
            },
            description: {
                x: 80,
                y: 690,        
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120      
            }
        },
        textAlign: 'left'
    },
    
    template2: {
        imageArea: {
            x: 25,             // 左間距25px
            y: 25,             // 上間距25px  
            width: 750,        // 寬度750px
            height: 480,       // 圖片延伸，增加高度到480px
            mode: 'cover-fullscreen',
            borderRadius: 20
        },
        // 移除 titleBar 設定
        draggableAreas: {
            title: {
                x: 100,
                y: 700,        // 在圖片下方
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120,     
                centerAlign: true
            },
            subtitle: {
                x: 100,
                y: 740,        // 調整位置
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120,     
                centerAlign: true
            },
            description: {
                x: 50,
                y: 780,        // 調整位置
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120      
            }
        },
        textAlign: 'center'
    }
};

// 🔧 自動字體檢測與載入系統
// 支援的字體檔案格式
const SUPPORTED_FONT_FORMATS = ['.woff2', '.woff', '.ttf', '.otf'];

// 專案字體庫（作為後備）
const PROJECT_FONT_LIBRARY = [
    'Noto Sans TC',
    'Arial',
    'Microsoft JhengHei',
    'PingFang TC',
    'Heiti TC',
    'sans-serif'
];

// 檢測到的字體列表（動態更新）
let detectedFonts = [];

// 合併後的可用字體列表
let FONT_FAMILIES = [...PROJECT_FONT_LIBRARY];

// 🚀 自動字體檢測與載入系統 - 核心功能

/**
 * 掃描字體資料夾中的所有字體檔案
 * @returns {Promise<Array>} 檢測到的字體檔案列表
 */
async function scanFontsDirectory() {
    console.log('🔍 開始掃描 fonts/ 資料夾...');
    
    // 常見字體檔案名稱模式（因為無法直接掃描目錄）
    const commonFontPatterns = [
        'lihsianti-proportional.ttf', // 現有檔案
        'NotoSansTC-Regular.woff2',
        'NotoSansTC-Bold.woff2',
        'NotoSansTC-Light.woff2',
        'SourceHanSans-Regular.ttf',
        'SourceHanSans-Bold.ttf',
        'TaipeiSans-Regular.woff',
        'TaipeiSans-Light.woff',
        'TaipeiSans-Bold.woff',
        'JasonHandwriting1.woff2',
        'LXGWWenKai-Regular.woff2',
        'LXGWWenKai-Bold.woff2',
        // 可以根據需要添加更多模式
    ];
    
    const foundFonts = [];
    
    for (const fontFile of commonFontPatterns) {
        try {
            const response = await fetch(`fonts/${fontFile}`, { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            if (response.ok) {
                foundFonts.push(fontFile);
                console.log(`✅ 找到字體檔案: ${fontFile}`);
            }
        } catch (error) {
            // 檔案不存在或無法訪問，跳過
            console.log(`⏭️ 跳過: ${fontFile}`);
        }
    }
    
    console.log(`🎯 共找到 ${foundFonts.length} 個字體檔案`);
    return foundFonts;
}

/**
 * 智能字體命名系統
 * @param {string} fileName - 字體檔案名稱
 * @returns {string} 友好的顯示名稱
 */
function generateFontDisplayName(fileName) {
    // 移除檔案副檔名
    let name = fileName.replace(/\.(woff2|woff|ttf|otf)$/i, '');
    
    // 字體名稱對照表
    const fontNameMap = {
        'lihsianti-proportional': '李西安蒂比例字體',
        'NotoSansTC': 'Noto Sans TC',
        'SourceHanSans': 'Source Han Sans',
        'TaipeiSans': '台北黑體',
        'JasonHandwriting1': '瀨戶字體',
        'LXGWWenKai': '霞鶩文楷',
    };
    
    // 字重對照表
    const weightMap = {
        'Regular': '標準',
        'Bold': '粗體',
        'Light': '細體',
        'Thin': '極細體',
        'Black': '特粗體',
        'Medium': '中等',
        'SemiBold': '半粗體'
    };
    
    // 分離主要名稱和字重
    let mainName = name;
    let weight = '';
    
    // 檢測字重
    for (const [eng, chi] of Object.entries(weightMap)) {
        if (name.includes('-' + eng) || name.includes(eng)) {
            weight = chi;
            mainName = name.replace('-' + eng, '').replace(eng, '');
            break;
        }
    }
    
    // 轉換主要名稱
    for (const [pattern, displayName] of Object.entries(fontNameMap)) {
        if (mainName.includes(pattern)) {
            mainName = displayName;
            break;
        }
    }
    
    // 處理駝峰命名和連字符
    if (!fontNameMap[mainName.toLowerCase()]) {
        mainName = mainName
            .replace(/([a-z])([A-Z])/g, '$1 $2') // 駝峰轉空格
            .replace(/-/g, ' ') // 連字符轉空格
            .replace(/_/g, ' '); // 下劃線轉空格
    }
    
    // 組合最終名稱
    return weight ? `${mainName} ${weight}` : mainName;
}

/**
 * 自動字體分類系統
 * @param {string} fileName - 字體檔案名稱
 * @param {string} displayName - 顯示名稱
 * @returns {string} 字體類別
 */
function categorizeFontByName(fileName, displayName) {
    const name = fileName.toLowerCase() + ' ' + displayName.toLowerCase();
    
    // 分類規則
    if (name.includes('sans') || name.includes('gothic') || name.includes('黑體')) {
        return '無襯線字體';
    } else if (name.includes('serif') || name.includes('明體')) {
        return '襯線字體';
    } else if (name.includes('hand') || name.includes('script') || name.includes('calligraphy') || 
               name.includes('handwriting') || name.includes('瀨戶') || name.includes('手寫')) {
        return '手寫字體';
    } else if (name.includes('noto') || name.includes('source') || name.includes('文楷') || 
               name.includes('台北') || name.includes('思源') || name.includes('李西安蒂')) {
        return '繁體中文字體';
    } else {
        return '專案字體';
    }
}

/**
 * 載入並驗證字體
 * @param {string} fontFile - 字體檔案名稱
 * @returns {Promise<Object>} 字體載入結果
 */
async function loadAndValidateFont(fontFile) {
    console.log(`🔄 正在載入字體: ${fontFile}`);
    
    try {
        const fontUrl = `fonts/${fontFile}`;
        const displayName = generateFontDisplayName(fontFile);
        const category = categorizeFontByName(fontFile, displayName);
        
        // 使用 FontFace API 載入字體
        const fontFace = new FontFace(displayName, `url(${fontUrl})`);
        
        // 載入字體
        const loadedFont = await fontFace.load();
        
        // 添加到文檔中
        document.fonts.add(loadedFont);
        
        // 測試字體是否能正常使用
        const isLoaded = document.fonts.check(`16px "${displayName}"`);
        
        if (isLoaded) {
            console.log(`✅ 字體載入成功: ${displayName} (${category})`);
            return {
                fileName: fontFile,
                displayName: displayName,
                category: category,
                fontFamily: displayName,
                status: 'loaded',
                error: null
            };
        } else {
            throw new Error('字體載入驗證失敗');
        }
        
    } catch (error) {
        console.error(`❌ 字體載入失敗: ${fontFile}`, error);
        return {
            fileName: fontFile,
            displayName: generateFontDisplayName(fontFile),
            category: categorizeFontByName(fontFile, generateFontDisplayName(fontFile)),
            fontFamily: null,
            status: 'failed',
            error: error.message
        };
    }
}

/**
 * 自動檢測並載入所有字體
 * @returns {Promise<Array>} 檢測結果
 */
async function detectAndLoadAllFonts() {
    console.log('🚀 啟動自動字體檢測系統...');
    
    try {
        // 掃描字體檔案
        const fontFiles = await scanFontsDirectory();
        
        if (fontFiles.length === 0) {
            console.log('⚠️ 未找到任何字體檔案');
            return [];
        }
        
        // 並行載入所有字體
        const loadPromises = fontFiles.map(file => loadAndValidateFont(file));
        const results = await Promise.all(loadPromises);
        
        // 分離成功和失敗的字體
        const successfulFonts = results.filter(font => font.status === 'loaded');
        const failedFonts = results.filter(font => font.status === 'failed');
        
        console.log(`🎉 字體檢測完成! 成功: ${successfulFonts.length}, 失敗: ${failedFonts.length}`);
        
        // 更新檢測到的字體列表
        detectedFonts = successfulFonts;
        
        // 更新字體選擇器
        updateFontSelectorsWithDetectedFonts(successfulFonts);
        
        return results;
        
    } catch (error) {
        console.error('❌ 字體檢測系統錯誤:', error);
        return [];
    }
}

/**
 * 動態更新字體選擇器
 * @param {Array} fonts - 檢測到的字體列表
 */
function updateFontSelectorsWithDetectedFonts(fonts) {
    console.log('🔄 更新字體選擇器...');
    
    // 合併專案字體和檢測到的字體
    const detectedFontNames = fonts.map(font => font.fontFamily);
    FONT_FAMILIES = [...PROJECT_FONT_LIBRARY, ...detectedFontNames];
    
    // 更新所有字體選擇器（如果存在的話）
    const fontSelectors = document.querySelectorAll('select[id*="fontFamily"]');
    fontSelectors.forEach(selector => {
        const currentValue = selector.value;
        
        // 清空並重新填充選項
        selector.innerHTML = '';
        
        // 添加專案字體分組
        if (PROJECT_FONT_LIBRARY.length > 0) {
            const projectGroup = document.createElement('optgroup');
            projectGroup.label = '系統字體';
            PROJECT_FONT_LIBRARY.forEach(font => {
                const option = document.createElement('option');
                option.value = font;
                option.textContent = font;
                if (font === currentValue) option.selected = true;
                projectGroup.appendChild(option);
            });
            selector.appendChild(projectGroup);
        }
        
        // 添加檢測到的字體分組
        if (fonts.length > 0) {
            const detectedGroup = document.createElement('optgroup');
            detectedGroup.label = '檢測到的字體';
            fonts.forEach(font => {
                const option = document.createElement('option');
                option.value = font.fontFamily;
                option.textContent = `${font.displayName} (${font.category})`;
                if (font.fontFamily === currentValue) option.selected = true;
                detectedGroup.appendChild(option);
            });
            selector.appendChild(detectedGroup);
        }
    });
    
    console.log(`✅ 字體選擇器已更新，共 ${FONT_FAMILIES.length} 個字體可用`);
}

/**
 * 生成字體選項HTML
 * @param {string} selectedFont - 當前選中的字體
 * @returns {string} HTML選項字符串
 */
function generateFontOptions(selectedFont) {
    let optionsHTML = '';
    
    // 系統字體分組
    if (PROJECT_FONT_LIBRARY.length > 0) {
        optionsHTML += '<optgroup label="系統字體">';
        PROJECT_FONT_LIBRARY.forEach(font => {
            const selected = font === selectedFont ? 'selected' : '';
            optionsHTML += `<option value="${font}" ${selected}>${font}</option>`;
        });
        optionsHTML += '</optgroup>';
    }
    
    // 檢測到的字體分組
    if (detectedFonts.length > 0) {
        optionsHTML += '<optgroup label="檢測到的字體">';
        detectedFonts.forEach(font => {
            if (font.status === 'loaded') {
                const selected = font.fontFamily === selectedFont ? 'selected' : '';
                optionsHTML += `<option value="${font.fontFamily}" ${selected}>${font.displayName} (${font.category})</option>`;
            }
        });
        optionsHTML += '</optgroup>';
    }
    
    // 如果沒有分組，使用基本列表
    if (PROJECT_FONT_LIBRARY.length === 0 && detectedFonts.length === 0) {
        FONT_FAMILIES.forEach(font => {
            const selected = font === selectedFont ? 'selected' : '';
            optionsHTML += `<option value="${font}" ${selected}>${font}</option>`;
        });
    }
    
    return optionsHTML;
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 啟動最終版：模板二無色塊+預設收合+修復下載');
    
    initializeCanvas();
    setupBasicEvents();
    setupDragSystem();
    setupTextStyleControls();
    addControlButtons();
    addPositionLogger();
    
    // 🔧 新增：載入並驗證預設設定
    loadDefaultSettings();
    
    // 🚀 新增：啟動自動字體檢測系統
    initializeFontDetectionSystem();
    
    console.log('✅ 初始化完成 - 模板二已移除色塊，圖片延伸');
});

// 🚀 新增：初始化字體檢測系統
async function initializeFontDetectionSystem() {
    console.log('🎨 初始化字體檢測系統...');
    
    // 添加字體管理UI
    addFontManagementUI();
    
    // 自動檢測字體（延遲執行，避免阻塞初始化）
    setTimeout(async () => {
        await detectAndLoadAllFonts();
        updateFontManagementStatus();
    }, 1000);
}

// 🎨 添加字體管理介面
function addFontManagementUI() {
    const stylePanel = document.getElementById('text-style-panel');
    if (!stylePanel) return;
    
    // 在樣式控制面板後添加字體管理面板
    const fontManagementPanel = document.createElement('div');
    fontManagementPanel.id = 'font-management-panel';
    fontManagementPanel.className = 'style-panel';
    fontManagementPanel.innerHTML = `
        <div class="panel-header">
            <h3>🔤 字體管理系統</h3>
            <button id="refresh-fonts-btn" class="btn-small">🔄 重新檢測</button>
        </div>
        <div class="panel-content" id="font-management-content">
            <div class="font-status" id="font-detection-status">
                <div class="status-item">
                    <span class="status-label">檢測狀態：</span>
                    <span class="status-value" id="detection-status">初始化中...</span>
                </div>
                <div class="status-item">
                    <span class="status-label">找到字體：</span>
                    <span class="status-value" id="fonts-count">0 個</span>
                </div>
                <div class="status-item">
                    <span class="status-label">載入成功：</span>
                    <span class="status-value" id="loaded-fonts-count">0 個</span>
                </div>
            </div>
            <div class="font-instructions">
                <h4>💡 如何添加新字體：</h4>
                <ol>
                    <li>將字體檔案(.woff2, .woff, .ttf, .otf)放入 <code>fonts/</code> 資料夾</li>
                    <li>點擊「重新檢測」按鈕</li>
                    <li>字體將自動出現在選擇器中！</li>
                </ol>
                <p><strong>支援格式：</strong>WOFF2 (推薦), WOFF, TTF, OTF</p>
            </div>
            <div class="detected-fonts-list" id="detected-fonts-list">
                <!-- 動態生成檢測到的字體列表 -->
            </div>
        </div>
    `;
    
    // 添加樣式
    const fontManagementStyle = document.createElement('style');
    fontManagementStyle.textContent = `
        .font-status {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2196f3;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .status-item:last-child {
            margin-bottom: 0;
        }
        .status-label {
            font-weight: 500;
            color: #1565c0;
        }
        .status-value {
            font-weight: bold;
            color: #0d47a1;
        }
        .font-instructions {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #4caf50;
        }
        .font-instructions h4 {
            margin: 0 0 10px 0;
            color: #2e7d32;
        }
        .font-instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .font-instructions code {
            background: #f1f8e9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            color: #388e3c;
        }
        .detected-fonts-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .font-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            transition: all 0.3s ease;
        }
        .font-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .font-item.loaded {
            border-color: #4caf50;
            background: #f8fff8;
        }
        .font-item.failed {
            border-color: #f44336;
            background: #fff8f8;
        }
        .font-name {
            font-weight: bold;
            margin-bottom: 4px;
        }
        .font-details {
            font-size: 12px;
            color: #666;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .font-preview {
            margin-top: 8px;
            padding: 8px;
            background: #f9f9f9;
            border-radius: 4px;
            font-size: 14px;
        }
        .status-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-loaded {
            background: #4caf50;
            color: white;
        }
        .status-failed {
            background: #f44336;
            color: white;
        }
        .status-loading {
            background: #ff9800;
            color: white;
        }
        .btn-small:hover {
            transform: translateY(-1px);
        }
        .loading-spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(fontManagementStyle);
    
    // 插入到樣式面板後面
    stylePanel.insertAdjacentElement('afterend', fontManagementPanel);
    
    // 綁定重新檢測按鈕事件
    const refreshBtn = document.getElementById('refresh-fonts-btn');
    refreshBtn.addEventListener('click', async function() {
        this.innerHTML = '<span class="loading-spinner"></span> 檢測中...';
        this.disabled = true;
        
        try {
            await detectAndLoadAllFonts();
            updateFontManagementStatus();
            
            // 顯示成功訊息
            showNotification('✅ 字體重新檢測完成！', 'success');
            
        } catch (error) {
            console.error('字體檢測失敗:', error);
            showNotification('❌ 字體檢測失敗，請重試', 'error');
        } finally {
            this.innerHTML = '🔄 重新檢測';
            this.disabled = false;
        }
    });
    
    console.log('✅ 字體管理介面已添加');
}

// 🔄 更新字體管理狀態顯示
function updateFontManagementStatus() {
    const detectionStatus = document.getElementById('detection-status');
    const fontsCount = document.getElementById('fonts-count');
    const loadedFontsCount = document.getElementById('loaded-fonts-count');
    const fontsList = document.getElementById('detected-fonts-list');
    
    if (!detectionStatus) return;
    
    const successfulFonts = detectedFonts.filter(font => font.status === 'loaded');
    const totalFonts = detectedFonts.length;
    
    // 更新狀態文字
    detectionStatus.textContent = totalFonts > 0 ? '✅ 檢測完成' : '⚠️ 未找到字體';
    fontsCount.textContent = `${totalFonts} 個`;
    loadedFontsCount.textContent = `${successfulFonts.length} 個`;
    
    // 更新字體列表
    if (fontsList) {
        if (detectedFonts.length === 0) {
            fontsList.innerHTML = `
                <div class="font-item">
                    <div class="font-name">😴 尚未檢測到任何字體</div>
                    <div class="font-details">
                        <span>請將字體檔案放入 fonts/ 資料夾後重新檢測</span>
                    </div>
                </div>
            `;
        } else {
            fontsList.innerHTML = detectedFonts.map(font => `
                <div class="font-item ${font.status}">
                    <div class="font-name">${font.displayName}</div>
                    <div class="font-details">
                        <span>${font.fileName} • ${font.category}</span>
                        <span class="status-badge status-${font.status}">
                            ${font.status === 'loaded' ? '✓ 已載入' : '✗ 失敗'}
                        </span>
                    </div>
                    ${font.status === 'loaded' ? `
                        <div class="font-preview" style="font-family: '${font.fontFamily}'">
                            範例文字：The quick brown fox 快速的棕色狐狸
                        </div>
                    ` : ''}
                    ${font.error ? `<div class="font-error" style="color: #f44336; font-size: 11px; margin-top: 4px;">錯誤: ${font.error}</div>` : ''}
                </div>
            `).join('');
        }
    }
}

// 🔔 顯示通知訊息
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: #4caf50;' : type === 'error' ? 'background: #f44336;' : 'background: #2196f3;'}
    `;
    
    document.body.appendChild(notification);
    
    // 滑入動畫
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自動消失
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 🔧 新增：載入預設設定函數
function loadDefaultSettings() {
    console.log('📋 載入預設設定...');
    console.log('模板2標題預設:', userTextStyles.template2.title.fontSize + 'px');
    console.log('模板2標題位置偏移:', textOffsets.template2.title);
    console.log('模板2副標題字體粗細:', userTextStyles.template2.subtitle.fontWeight);
    console.log('模板2描述字元間距:', userTextStyles.template2.description.letterSpacing + 'px');
    
    // 立即驗證設定
    validateSettings();
}

// 🔧 新增：驗證設定函數
function validateSettings() {
    const template2Settings = userTextStyles.template2;
    const template2Offsets = textOffsets.template2;
    
    console.log('\n🔍 ===== 設定驗證 =====');
    console.log('模板2標題設定:');
    console.log(`  字體大小: ${template2Settings.title.fontSize}px (應該是73px)`);
    console.log(`  位置偏移: x=${template2Offsets.title.x}, y=${template2Offsets.title.y} (應該是x=-50, y=-190)`);
    console.log(`  寬度: ${template2Settings.title.width}px (應該是700px)`);
    
    console.log('模板2副標題設定:');
    console.log(`  字體大小: ${template2Settings.subtitle.fontSize}px (應該是28px)`);
    console.log(`  字體粗細: ${template2Settings.subtitle.fontWeight} (應該是thin)`);
    console.log(`  位置偏移: x=${template2Offsets.subtitle.x}, y=${template2Offsets.subtitle.y} (應該是x=0, y=-113)`);
    
    console.log('模板2描述設定:');
    console.log(`  字體大小: ${template2Settings.description.fontSize}px (應該是20px)`);
    console.log(`  字體粗細: ${template2Settings.description.fontWeight} (應該是thin)`);
    console.log(`  字元間距: ${template2Settings.description.letterSpacing}px (應該是3px)`);
    console.log(`  位置偏移: x=${template2Offsets.description.x}, y=${template2Offsets.description.y} (應該是x=0, y=-82)`);
    console.log('🔍 ==================\n');
    
    // 檢查是否與預期一致
    const isCorrect = 
        template2Settings.title.fontSize === 73 &&
        template2Offsets.title.x === -50 &&
        template2Offsets.title.y === -190 &&
        template2Settings.subtitle.fontSize === 28 &&
        template2Settings.subtitle.fontWeight === 'thin' &&
        template2Settings.description.letterSpacing === 3;
    
    if (isCorrect) {
        console.log('✅ 設定驗證通過！');
    } else {
        console.log('❌ 設定驗證失敗，請檢查是否有其他地方覆蓋了設定');
    }
    
    return isCorrect;
}

// 添加位置記錄器
function addPositionLogger() {
    const actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) return;
    
    if (!document.getElementById('log-positions-btn')) {
        const logBtn = document.createElement('button');
        logBtn.className = 'btn';
        logBtn.innerHTML = '📍 記錄當前位置';
        logBtn.onclick = logCurrentPositions;
        logBtn.style.background = '#17a2b8';
        logBtn.style.color = 'white';
        logBtn.style.marginLeft = '10px';
        logBtn.id = 'log-positions-btn';
        actionButtons.appendChild(logBtn);
    }
    
    console.log('✅ 位置記錄器已添加');
}

// 記錄當前位置（完整版）
function logCurrentPositions() {
    // 🔧 新增：先驗證當前設定
    console.log('🔍 執行設定驗證...');
    validateSettings();
    
    const template = getSelectedTemplate();
    const currentOffsets = textOffsets[`template${template}`];
    const currentStyles = userTextStyles[`template${template}`];
    
    console.log('\n🎯 ===== 完整文字設定記錄 =====');
    console.log(`模板 ${template} 的文字設定：`);
    
    Object.keys(currentOffsets).forEach(textType => {
        const offset = currentOffsets[textType];
        const style = currentStyles[textType];
        const baseArea = DESIGN_SPECS[`template${template}`].draggableAreas[textType];
        const finalX = baseArea.x + offset.x;
        const finalY = baseArea.y + offset.y;
        
        console.log(`${textType}:`);
        console.log(`  位置 - 偏移: (${offset.x}, ${offset.y}), 最終: (${finalX}, ${finalY})`);
        console.log(`  樣式 - 大小: ${style.fontSize}px, 顏色: ${style.color}, 粗細: ${style.fontWeight}`);
        console.log(`  間距 - 字元間距: ${style.letterSpacing}px, 行距: ${style.lineHeight}`);
        console.log(`  框架 - 寬: ${style.width}px, 高: ${style.height}px`);
        console.log(`  字體 - 系列: ${style.fontFamily}`);
    });
    
    // 模板二新配置信息
    if (template === '2') {
        const imageArea = DESIGN_SPECS.template2.imageArea;
        console.log(`模板二新配置信息:`);
        console.log(`  圖片區域: X=${imageArea.x}, Y=${imageArea.y}, 寬=${imageArea.width}, 高=${imageArea.height}`);
        console.log(`  已移除標題橫桿色塊`);
        console.log(`  圖片延伸高度: ${imageArea.height}px`);
        console.log(`  上左右間距: ${imageArea.x}px`);
    }
    
    console.log('🎯 ===========================\n');
    
    alert(`模板${template}完整設定已記錄到控制台，請查看開發者工具！`);
}

// 初始化 Canvas
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('❌ 找不到 canvas 元素');
        return;
    }
    
    ctx = canvas.getContext('2d');
    canvas.width = DESIGN_SPECS.canvas.width;
    canvas.height = DESIGN_SPECS.canvas.height;
    
    clearCanvas();
    console.log('✅ Canvas 設定完成');
}

// 清空 Canvas（移除所有預覽虛線）
function clearCanvas() {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 不再繪製模板預覽虛線
    
    // 提示文字
    ctx.fillStyle = '#666';
    ctx.font = '24px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('最終版圖片生成器', canvas.width / 2, canvas.height / 2 + 50);
    ctx.font = '16px "Noto Sans TC"';
    ctx.fillText('模板二無色塊，圖片延伸', canvas.width / 2, canvas.height / 2 + 80);
    ctx.fillText('支援字元間距、行距、文字框大小調整', canvas.width / 2, canvas.height / 2 + 110);
}

// 移除原本的繪製模板預覽函數，因為不再需要虛線
function drawTemplatePreview() {
    // 空函數，不再顯示任何預覽虛線
}

// 設定基本事件
function setupBasicEvents() {
    const imageUpload = document.getElementById('image-upload');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    if (!imageUpload || !generateBtn || !downloadBtn) {
        console.error('❌ 找不到必要的DOM元素');
        return;
    }
    
    imageUpload.addEventListener('change', handleImageUpload);
    generateBtn.addEventListener('click', generateImage);
    downloadBtn.addEventListener('click', downloadImage);
    
    // 🔧 修正：模板切換事件 - 不要重置樣式，保持用戶的預設值
    const templateInputs = document.querySelectorAll('input[name="template"]');
    templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            console.log(`🔄 切換到模板${this.value}`);
            
            // 不要重置樣式，保持用戶的預設值
            updateTextStylePanel();
            
            // 記錄當前模板的設定
            const template = this.value;
            console.log(`模板${template}標題設定:`, userTextStyles[`template${template}`].title);
            console.log(`模板${template}位置偏移:`, textOffsets[`template${template}`]);
            
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    });
    
    // 文字輸入即時更新
    const textInputs = ['title', 'subtitle', 'description'];
    textInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                if (uploadedImage && isGenerated) {
                    generateImage();
                }
            });
        }
    });
    
    console.log('✅ 基本事件設定完成');
}

// 設定文字樣式控制面板
function setupTextStyleControls() {
    createTextStylePanel();
    updateTextStylePanel();
    console.log('✅ 文字樣式控制面板設定完成');
}

// 創建文字樣式控制面板（預設收合）
function createTextStylePanel() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    if (document.getElementById('text-style-panel')) return;
    
    const stylePanel = document.createElement('div');
    stylePanel.id = 'text-style-panel';
    stylePanel.className = 'style-panel';
    stylePanel.innerHTML = `
        <div class="panel-header">
            <h3>🎨 完整文字控制面板</h3>
            <button id="toggle-style-panel" class="btn-small">展開</button>
        </div>
        <div class="panel-content" id="style-panel-content" style="display: none;">
            <div class="style-tabs">
                <button class="style-tab active" data-text="title">標題</button>
                <button class="style-tab" data-text="subtitle">副標題</button>
                <button class="style-tab" data-text="description">描述</button>
            </div>
            <div class="style-controls" id="style-controls">
                <!-- 動態生成內容 -->
            </div>
        </div>
    `;
    
    // 添加完整CSS樣式
    const style = document.createElement('style');
    style.textContent = `
        .style-panel {
            margin: 20px 0;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f8f9fa;
            overflow: hidden;
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: #e9ecef;
            border-bottom: 1px solid #ddd;
        }
        .panel-header h3 {
            margin: 0;
            color: #495057;
        }
        .btn-small {
            padding: 5px 10px;
            font-size: 12px;
            border: 1px solid #ccc;
            background: white;
            border-radius: 4px;
            cursor: pointer;
        }
        .btn-small:hover {
            background: #f8f9fa;
        }
        .panel-content {
            padding: 20px;
        }
        .style-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .style-tab {
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .style-tab.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }
        .style-tab:hover:not(.active) {
            background: #f8f9fa;
        }
        .style-controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .control-group label {
            font-weight: 500;
            color: #495057;
            font-size: 14px;
        }
        .control-group input,
        .control-group select,
        .control-group textarea {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .control-group input[type="range"] {
            padding: 0;
        }
        .control-group input[type="color"] {
            height: 40px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .control-group input[type="number"] {
            width: 80px;
        }
        .range-value {
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .preset-buttons {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }
        .preset-btn {
            padding: 4px 8px;
            font-size: 11px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 3px;
            cursor: pointer;
        }
        .preset-btn:hover {
            background: #f8f9fa;
        }
        .xy-controls {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        .xy-input {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
        }
        .xy-input label {
            font-size: 12px;
            color: #666;
        }
        .xy-input input {
            width: 70px;
            text-align: center;
        }
        .section-divider {
            grid-column: 1 / -1;
            height: 1px;
            background: #ddd;
            margin: 10px 0;
        }
        .section-title {
            grid-column: 1 / -1;
            font-weight: bold;
            color: #495057;
            margin: 10px 0 5px 0;
            font-size: 16px;
        }
        .textarea-control {
            grid-column: 1 / -1;
        }
        .textarea-control textarea {
            width: 100%;
            min-height: 80px;
            resize: vertical;
            font-family: 'Noto Sans TC', sans-serif;
        }
        .position-info {
            grid-column: 1 / -1;
            background: #e3f2fd;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            color: #1565c0;
        }
        .template-info {
            grid-column: 1 / -1;
            background: #e8f5e8;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            color: #2e7d32;
        }
        .control-group-inline {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .control-group-inline .control-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        .control-group-inline label {
            font-size: 12px;
            margin: 0;
        }
        .two-column {
            grid-column: span 2;
        }
    `;
    document.head.appendChild(style);
    
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
        inputSection.insertAdjacentElement('afterend', stylePanel);
    } else {
        container.appendChild(stylePanel);
    }
    
    setupStylePanelEvents();
}

// 設定樣式面板事件
function setupStylePanelEvents() {
    const toggleBtn = document.getElementById('toggle-style-panel');
    const panelContent = document.getElementById('style-panel-content');
    
    if (toggleBtn && panelContent) {
        toggleBtn.addEventListener('click', function() {
            const isCollapsed = panelContent.style.display === 'none';
            panelContent.style.display = isCollapsed ? 'block' : 'none';
            this.textContent = isCollapsed ? '收合' : '展開';
        });
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('style-tab')) {
            document.querySelectorAll('.style-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            e.target.classList.add('active');
            updateStyleControls(e.target.dataset.text);
        }
    });
}

// 更新文字樣式面板
function updateTextStylePanel() {
    const activeTab = document.querySelector('.style-tab.active');
    if (activeTab) {
        updateStyleControls(activeTab.dataset.text);
    } else {
        updateStyleControls('title');
    }
}

// 更新樣式控制項（完整版）
function updateStyleControls(textType) {
    const template = getSelectedTemplate();
    const controlsContainer = document.getElementById('style-controls');
    
    if (!controlsContainer) return;
    
    const currentStyle = userTextStyles[`template${template}`][textType];
    const currentOffset = textOffsets[`template${template}`][textType];
    const currentText = document.getElementById(textType)?.value || '';
    const baseArea = DESIGN_SPECS[`template${template}`].draggableAreas[textType];
    const finalX = baseArea.x + currentOffset.x;
    const finalY = baseArea.y + currentOffset.y;
    
    // 模板二新配置信息
    const templateInfo = template === '2' ? `
        <div class="template-info">
            📐 模板二新配置：<br>
            圖片延伸：X=${DESIGN_SPECS.template2.imageArea.x}, Y=${DESIGN_SPECS.template2.imageArea.y}, 寬=${DESIGN_SPECS.template2.imageArea.width}, 高=${DESIGN_SPECS.template2.imageArea.height}<br>
            已移除標題橫桿色塊，圖片區域向下延伸<br>
            上左右間距一致：25px
        </div>
    ` : '';
    
    controlsContainer.innerHTML = `
        ${templateInfo}
        
        <div class="position-info">
            ✨ 當前狀態：${textType} | 位置：X=${finalX}, Y=${finalY} | 偏移：(${currentOffset.x}, ${currentOffset.y})<br>
            文字框：寬${currentStyle.width}px × 高${currentStyle.height}px | 字距:${currentStyle.letterSpacing}px | 行距:${currentStyle.lineHeight}
        </div>
        
        <div class="section-title">📝 文字內容</div>
        
        ${textType === 'description' ? `
        <div class="textarea-control">
            <label>描述內容（支援換行）</label>
            <textarea id="description-textarea" placeholder="輸入描述內容，按 Enter 換行">${currentText}</textarea>
        </div>
        ` : ''}
        
        <div class="section-title">🎨 基本樣式</div>
        
        <div class="control-group">
            <label>字體大小</label>
            <input type="range" id="fontSize-${textType}" min="12" max="80" value="${currentStyle.fontSize}">
            <div class="range-value">${currentStyle.fontSize}px</div>
        </div>
        
        <div class="control-group">
            <label>字體顏色</label>
            <input type="color" id="fontColor-${textType}" value="${currentStyle.color}">
            <div class="preset-buttons">
                <button class="preset-btn" data-color="#564529">深棕</button>
                <button class="preset-btn" data-color="#8E7F69">淺棕</button>
                <button class="preset-btn" data-color="#FFFFFF">白色</button>
                <button class="preset-btn" data-color="#000000">黑色</button>
                <button class="preset-btn" data-color="#e74c3c">紅色</button>
                <button class="preset-btn" data-color="#27ae60">綠色</button>
                <button class="preset-btn" data-color="#f39c12">橙色</button>
            </div>
        </div>
        
        <div class="control-group">
            <label>字體粗細</label>
            <select id="fontWeight-${textType}">
                <option value="normal" ${currentStyle.fontWeight === 'normal' ? 'selected' : ''}>普通</option>
                <option value="bold" ${currentStyle.fontWeight === 'bold' ? 'selected' : ''}>粗體</option>
                <option value="lighter" ${currentStyle.fontWeight === 'lighter' ? 'selected' : ''}>細體</option>
                <option value="thin" ${currentStyle.fontWeight === 'thin' ? 'selected' : ''}>極細體</option>
                <option value="600" ${currentStyle.fontWeight === '600' ? 'selected' : ''}>半粗體</option>
                <option value="800" ${currentStyle.fontWeight === '800' ? 'selected' : ''}>特粗體</option>
            </select>
        </div>
        
        <div class="control-group">
            <label>字體系列</label>
            <select id="fontFamily-${textType}">
                ${generateFontOptions(currentStyle.fontFamily)}
            </select>
        </div>
        
        <div class="section-divider"></div>
        <div class="section-title">📏 間距與排版</div>
        
        <div class="control-group two-column">
            <label>文字間距與行距</label>
            <div class="control-group-inline">
                <div class="control-item">
                    <label>字元間距 (px)</label>
                    <input type="number" id="letterSpacing-${textType}" value="${currentStyle.letterSpacing}" min="-10" max="20" step="0.5">
                </div>
                <div class="control-item">
                    <label>行距倍數</label>
                    <input type="number" id="lineHeight-${textType}" value="${currentStyle.lineHeight}" min="0.8" max="3" step="0.1">
                </div>
            </div>
        </div>
        
        <div class="control-group two-column">
            <label>文字框尺寸</label>
            <div class="control-group-inline">
                <div class="control-item">
                    <label>寬度 (px)</label>
                    <input type="number" id="textWidth-${textType}" value="${currentStyle.width}" min="100" max="800" step="10">
                </div>
                <div class="control-item">
                    <label>高度 (px)</label>
                    <input type="number" id="textHeight-${textType}" value="${currentStyle.height}" min="20" max="600" step="10">
                </div>
            </div>
        </div>
        
        <div class="section-divider"></div>
        <div class="section-title">📍 位置控制</div>
        
        <div class="control-group two-column">
            <label>精確位置調整</label>
            <div class="xy-controls">
                <div class="xy-input">
                    <label>X軸</label>
                    <input type="number" id="posX-${textType}" value="${currentOffset.x}" min="-1000" max="1000" step="1">
                </div>
                <div class="xy-input">
                    <label>Y軸</label>
                    <input type="number" id="posY-${textType}" value="${currentOffset.y}" min="-1000" max="1000" step="1">
                </div>
                <button class="preset-btn" onclick="resetTextPosition('${textType}')">重置位置</button>
                <button class="preset-btn" onclick="resetTextSize('${textType}')">重置尺寸</button>
            </div>
        </div>
        
        <div class="control-group">
            <label>快速預設</label>
            <div class="preset-buttons">
                <button class="preset-btn" onclick="applyPreset('${textType}', 'elegant')">優雅</button>
                <button class="preset-btn" onclick="applyPreset('${textType}', 'modern')">現代</button>
                <button class="preset-btn" onclick="applyPreset('${textType}', 'classic')">經典</button>
                <button class="preset-btn" onclick="applyPreset('${textType}', 'bold')">醒目</button>
                <button class="preset-btn" onclick="resetTextStyle('${textType}')">重置全部</button>
            </div>
        </div>
    `;
    
    bindStyleControlEvents(textType);
}

// 綁定樣式控制事件（完整版）
function bindStyleControlEvents(textType) {
    const template = getSelectedTemplate();
    
    // 基本樣式控制
    const fontSizeInput = document.getElementById(`fontSize-${textType}`);
    if (fontSizeInput) {
        fontSizeInput.addEventListener('input', function() {
            userTextStyles[`template${template}`][textType].fontSize = parseInt(this.value);
            this.nextElementSibling.textContent = this.value + 'px';
            updateStatusDisplay(textType);
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    const fontColorInput = document.getElementById(`fontColor-${textType}`);
    if (fontColorInput) {
        fontColorInput.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].color = this.value;
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    const fontWeightSelect = document.getElementById(`fontWeight-${textType}`);
    if (fontWeightSelect) {
        fontWeightSelect.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].fontWeight = this.value;
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    const fontFamilySelect = document.getElementById(`fontFamily-${textType}`);
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].fontFamily = this.value;
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    // 字元間距控制
    const letterSpacingInput = document.getElementById(`letterSpacing-${textType}`);
    if (letterSpacingInput) {
        letterSpacingInput.addEventListener('input', function() {
            userTextStyles[`template${template}`][textType].letterSpacing = parseFloat(this.value);
            updateStatusDisplay(textType);
            console.log(`🔤 ${textType} 字元間距: ${this.value}px`);
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    // 行距控制
    const lineHeightInput = document.getElementById(`lineHeight-${textType}`);
    if (lineHeightInput) {
        lineHeightInput.addEventListener('input', function() {
            userTextStyles[`template${template}`][textType].lineHeight = parseFloat(this.value);
            updateStatusDisplay(textType);
            console.log(`📏 ${textType} 行距: ${this.value}`);
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    // 文字框寬度控制
    const textWidthInput = document.getElementById(`textWidth-${textType}`);
    if (textWidthInput) {
        textWidthInput.addEventListener('input', function() {
            userTextStyles[`template${template}`][textType].width = parseInt(this.value);
            updateStatusDisplay(textType);
            console.log(`📐 ${textType} 寬度: ${this.value}px`);
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    // 文字框高度控制
    const textHeightInput = document.getElementById(`textHeight-${textType}`);
    if (textHeightInput) {
        textHeightInput.addEventListener('input', function() {
            userTextStyles[`template${template}`][textType].height = parseInt(this.value);
            updateStatusDisplay(textType);
            console.log(`📐 ${textType} 高度: ${this.value}px`);
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    // XY軸位置控制
    const posXInput = document.getElementById(`posX-${textType}`);
    const posYInput = document.getElementById(`posY-${textType}`);
    
    if (posXInput) {
        posXInput.addEventListener('input', function() {
            const newX = parseInt(this.value) || 0;
            textOffsets[`template${template}`][textType].x = newX;
            updateStatusDisplay(textType);
            console.log(`📍 ${textType} X軸: ${newX}`);
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    if (posYInput) {
        posYInput.addEventListener('input', function() {
            const newY = parseInt(this.value) || 0;
            textOffsets[`template${template}`][textType].y = newY;
            updateStatusDisplay(textType);
            console.log(`📍 ${textType} Y軸: ${newY}`);
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    }
    
    // 描述內容換行支援
    if (textType === 'description') {
        const descriptionTextarea = document.getElementById('description-textarea');
        if (descriptionTextarea) {
            descriptionTextarea.addEventListener('input', function() {
                const descInput = document.getElementById('description');
                if (descInput) {
                    descInput.value = this.value;
                    if (uploadedImage && isGenerated) {
                        generateImage();
                    }
                }
            });
        }
    }
    
    // 顏色預設按鈕
    document.querySelectorAll(`[data-color]`).forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.dataset.color;
            userTextStyles[`template${template}`][textType].color = color;
            if (fontColorInput) {
                fontColorInput.value = color;
            }
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    });
}

// 更新狀態顯示
function updateStatusDisplay(textType) {
    const template = getSelectedTemplate();
    const currentStyle = userTextStyles[`template${template}`][textType];
    const currentOffset = textOffsets[`template${template}`][textType];
    const baseArea = DESIGN_SPECS[`template${template}`].draggableAreas[textType];
    const finalX = baseArea.x + currentOffset.x;
    const finalY = baseArea.y + currentOffset.y;
    
    const positionInfo = document.querySelector('.position-info');
    if (positionInfo) {
        positionInfo.innerHTML = `
            ✨ 當前狀態：${textType} | 位置：X=${finalX}, Y=${finalY} | 偏移：(${currentOffset.x}, ${currentOffset.y})<br>
            文字框：寬${currentStyle.width}px × 高${currentStyle.height}px | 字距:${currentStyle.letterSpacing}px | 行距:${currentStyle.lineHeight}
        `;
    }
}

// 全局函數：重置單個文字位置
window.resetTextPosition = function(textType) {
    const template = getSelectedTemplate();
    
    // 🔧 修正：重置到原始預設偏移
    textOffsets[`template${template}`][textType] = { ...ORIGINAL_OFFSETS[`template${template}`][textType] };
    
    const originalOffset = ORIGINAL_OFFSETS[`template${template}`][textType];
    const posXInput = document.getElementById(`posX-${textType}`);
    const posYInput = document.getElementById(`posY-${textType}`);
    if (posXInput) posXInput.value = originalOffset.x;
    if (posYInput) posYInput.value = originalOffset.y;
    
    updateStatusDisplay(textType);
    console.log(`🔄 重置 ${textType} 位置到原始預設: (${originalOffset.x}, ${originalOffset.y})`);
    
    if (uploadedImage && isGenerated) {
        generateImage();
    }
};

// 全局函數：重置文字框尺寸
window.resetTextSize = function(textType) {
    const template = getSelectedTemplate();
    
    // 🔧 修正：使用原始預設尺寸
    const originalStyle = ORIGINAL_DEFAULTS[`template${template}`][textType];
    userTextStyles[`template${template}`][textType].width = originalStyle.width;
    userTextStyles[`template${template}`][textType].height = originalStyle.height;
    
    const textWidthInput = document.getElementById(`textWidth-${textType}`);
    const textHeightInput = document.getElementById(`textHeight-${textType}`);
    if (textWidthInput) textWidthInput.value = originalStyle.width;
    if (textHeightInput) textHeightInput.value = originalStyle.height;
    
    updateStatusDisplay(textType);
    console.log(`🔄 重置 ${textType} 尺寸到原始預設: ${originalStyle.width}×${originalStyle.height}`);
    
    if (uploadedImage && isGenerated) {
        generateImage();
    }
};

// 全局函數：應用預設樣式
window.applyPreset = function(textType, presetName) {
    const template = getSelectedTemplate();
    const baseColors = template === '1' 
        ? { title: '#564529', subtitle: '#564529', description: '#8E7F69' }
        : { title: '#FFFFFF', subtitle: '#FFFFFF', description: '#564529' };
    
    const presets = {
        elegant: {
            fontSize: textType === 'title' ? 42 : textType === 'subtitle' ? 24 : 16,
            fontFamily: 'Noto Sans TC',
            color: baseColors[textType],
            fontWeight: 'normal',
            letterSpacing: 1,
            lineHeight: 1.5
        },
        modern: {
            fontSize: textType === 'title' ? 48 : textType === 'subtitle' ? 26 : 18,
            fontFamily: 'Arial',
            color: baseColors[textType],
            fontWeight: 'bold',
            letterSpacing: 0,
            lineHeight: 1.3
        },
        classic: {
            fontSize: textType === 'title' ? 36 : textType === 'subtitle' ? 20 : 16,
            fontFamily: 'Microsoft JhengHei',
            color: baseColors[textType],
            fontWeight: '600',
            letterSpacing: 0.5,
            lineHeight: 1.4
        },
        bold: {
            fontSize: textType === 'title' ? 56 : textType === 'subtitle' ? 32 : 20,
            fontFamily: 'Noto Sans TC',
            color: baseColors[textType],
            fontWeight: 'bold',
            letterSpacing: 2,
            lineHeight: 1.2
        }
    };
    
    if (presets[presetName]) {
        // 保留尺寸和位置，只更新樣式
        const currentStyle = userTextStyles[`template${template}`][textType];
        Object.assign(currentStyle, presets[presetName]);
        
        updateStyleControls(textType);
        if (uploadedImage && isGenerated) {
            generateImage();
        }
    }
};

// 🔧 修正：重置文字樣式函數 - 使用原始預設值
window.resetTextStyle = function(textType) {
    const template = getSelectedTemplate();
    
    // 使用原始備份的預設值，而不是硬編碼
    userTextStyles[`template${template}`][textType] = JSON.parse(JSON.stringify(ORIGINAL_DEFAULTS[`template${template}`][textType]));
    textOffsets[`template${template}`][textType] = { ...ORIGINAL_OFFSETS[`template${template}`][textType] };
    
    updateStyleControls(textType);
    if (uploadedImage && isGenerated) {
        generateImage();
    }
    
    const originalStyle = ORIGINAL_DEFAULTS[`template${template}`][textType];
    const originalOffset = ORIGINAL_OFFSETS[`template${template}`][textType];
    
    console.log(`🔄 重置 ${textType} 到原始預設 - 字體:${originalStyle.fontSize}px, 位置:(${originalOffset.x}, ${originalOffset.y})`);
};

// 設定拖曳系統
function setupDragSystem() {
    console.log('🖱️ 設定最終版拖曳系統...');
    
    canvas.addEventListener('mousedown', handleDragStart);
    canvas.addEventListener('mousemove', handleDragMove);
    canvas.addEventListener('mouseup', handleDragEnd);
    canvas.addEventListener('mouseleave', handleDragEnd);
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleDragEnd);
    
    canvas.addEventListener('wheel', handleWheel);
    
    console.log('✅ 最終版拖曳系統設定完成');
}

// 添加控制按鈕
function addControlButtons() {
    const actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) return;
    
    if (!document.getElementById('reset-image-btn')) {
        const resetImageBtn = document.createElement('button');
        resetImageBtn.className = 'btn';
        resetImageBtn.innerHTML = '🖼️ 重置圖片';
        resetImageBtn.onclick = resetImagePosition;
        resetImageBtn.style.background = '#6c757d';
        resetImageBtn.style.color = 'white';
        resetImageBtn.style.marginLeft = '10px';
        resetImageBtn.disabled = true;
        resetImageBtn.id = 'reset-image-btn';
        actionButtons.appendChild(resetImageBtn);
    }
    
    if (!document.getElementById('reset-text-btn')) {
        const resetTextBtn = document.createElement('button');
        resetTextBtn.className = 'btn';
        resetTextBtn.innerHTML = '📝 重置文字';
        resetTextBtn.onclick = resetTextPositions;
        resetTextBtn.style.background = '#28a745';
        resetTextBtn.style.color = 'white';
        resetTextBtn.style.marginLeft = '10px';
        resetTextBtn.disabled = true;
        resetTextBtn.id = 'reset-text-btn';
        actionButtons.appendChild(resetTextBtn);
    }
    
    console.log('✅ 控制按鈕已添加');
}

// 獲取Canvas相對位置
function getCanvasPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// 檢測點擊區域類型（使用動態尺寸）
function detectClickArea(x, y) {
    if (!isGenerated) return null;
    
    const template = getSelectedTemplate();
    const specs = DESIGN_SPECS[`template${template}`];
    
    // 檢查圖片區域
    const imageArea = specs.imageArea;
    if (x >= imageArea.x && x <= imageArea.x + imageArea.width &&
        y >= imageArea.y && y <= imageArea.y + imageArea.height) {
        return 'image';
    }
    
    // 檢查文字區域（使用動態尺寸）
    const draggableAreas = specs.draggableAreas;
    const currentOffsets = textOffsets[`template${template}`];
    const currentStyles = userTextStyles[`template${template}`];
    
    for (const textType of ['title', 'subtitle', 'description']) {
        const area = draggableAreas[textType];
        const currentOffset = currentOffsets[textType];
        const currentStyle = currentStyles[textType];
        
        const actualX = area.x + currentOffset.x;
        const actualY = area.y + currentOffset.y;
        const actualWidth = currentStyle.width;
        const actualHeight = currentStyle.height;
        
        if (x >= actualX - 10 && x <= actualX + actualWidth + 10 &&
            y >= actualY - 10 && y <= actualY + actualHeight + 10) {
            
            const input = document.getElementById(textType);
            if (input && input.value.trim()) {
                return textType;
            }
        }
    }
    
    return null;
}

// 處理拖曳開始
function handleDragStart(e) {
    const pos = getCanvasPosition(e);
    const clickArea = detectClickArea(pos.x, pos.y);
    
    if (!clickArea) return;
    
    isDragging = true;
    dragType = clickArea;
    dragStartX = pos.x;
    dragStartY = pos.y;
    
    canvas.style.cursor = 'grabbing';
    
    console.log(`🖱️ 開始拖曳: ${dragType} 在位置 (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}) [最終版]`);
    
    e.preventDefault();
}

// 處理拖曳移動
function handleDragMove(e) {
    const pos = getCanvasPosition(e);
    
    if (!isDragging) {
        const clickArea = detectClickArea(pos.x, pos.y);
        canvas.style.cursor = clickArea ? 'grab' : 'default';
        return;
    }
    
    const deltaX = pos.x - dragStartX;
    const deltaY = pos.y - dragStartY;
    
    if (dragType === 'image') {
        imageOffsetX += deltaX;
        imageOffsetY += deltaY;
        console.log(`🖼️ 圖片拖曳: offset(${imageOffsetX.toFixed(0)}, ${imageOffsetY.toFixed(0)})`);
    } else {
        const template = getSelectedTemplate();
        const currentOffset = textOffsets[`template${template}`][dragType];
        
        let newX = currentOffset.x + deltaX;
        let newY = currentOffset.y + deltaY;
        
        textOffsets[`template${template}`][dragType].x = newX;
        textOffsets[`template${template}`][dragType].y = newY;
        
        // 同步更新XY輸入框
        const posXInput = document.getElementById(`posX-${dragType}`);
        const posYInput = document.getElementById(`posY-${dragType}`);
        if (posXInput) posXInput.value = newX;
        if (posYInput) posYInput.value = newY;
        
        // 更新狀態顯示
        updateStatusDisplay(dragType);
        
        console.log(`📝 ${dragType}拖曳: offset(${newX.toFixed(0)}, ${newY.toFixed(0)}) [最終版]`);
    }
    
    dragStartX = pos.x;
    dragStartY = pos.y;
    
    generateImage();
    e.preventDefault();
}

// 處理拖曳結束
function handleDragEnd(e) {
    if (isDragging) {
        isDragging = false;
        dragType = null;
        canvas.style.cursor = 'default';
        console.log('✅ 停止拖曳 [最終版]');
    }
}

// 處理觸控開始
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleDragStart(touch);
    }
}

// 處理觸控移動
function handleTouchMove(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleDragMove(touch);
    }
    e.preventDefault();
}

// 處理滾輪縮放
function handleWheel(e) {
    if (!isGenerated || !uploadedImage) return;
    
    const pos = getCanvasPosition(e);
    const clickArea = detectClickArea(pos.x, pos.y);
    
    if (clickArea === 'image') {
        e.preventDefault();
        
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = imageScale * scaleFactor;
        
        if (newScale >= 0.5 && newScale <= 3) {
            imageScale = newScale;
            generateImage();
            console.log(`🔍 圖片縮放: ${imageScale.toFixed(2)}x`);
        }
    }
}

// 重置圖片位置
function resetImagePosition() {
    imageOffsetX = 0;
    imageOffsetY = 0;
    imageScale = 1;
    
    console.log('🔄 重置圖片位置');
    
    if (uploadedImage && isGenerated) {
        generateImage();
    }
}

// 🔧 修正：重置文字位置 - 使用原始預設偏移
function resetTextPositions() {
    const template = getSelectedTemplate();
    
    // 重置到原始預設偏移
    textOffsets[`template${template}`] = JSON.parse(JSON.stringify(ORIGINAL_OFFSETS[`template${template}`]));
    
    ['title', 'subtitle', 'description'].forEach(textType => {
        const originalOffset = ORIGINAL_OFFSETS[`template${template}`][textType];
        const posXInput = document.getElementById(`posX-${textType}`);
        const posYInput = document.getElementById(`posY-${textType}`);
        if (posXInput) posXInput.value = originalOffset.x;
        if (posYInput) posYInput.value = originalOffset.y;
        
        updateStatusDisplay(textType);
    });
    
    console.log('🔄 重置所有文字位置到原始預設 [最終版]');
    
    if (uploadedImage && isGenerated) {
        generateImage();
    }
}

// 處理圖片上傳
function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('請選擇圖片檔案！');
        return;
    }
    
    console.log('📁 開始處理上傳圖片...');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            uploadedImage = img;
            resetImagePosition();
            resetTextPositions();
            showImagePreview(e.target.result);
            document.getElementById('generate-btn').disabled = false;
            
            console.log(`✅ 圖片載入成功: ${img.width} × ${img.height}`);
        };
        
        img.onerror = function() {
            console.error('❌ 圖片載入失敗');
            alert('圖片載入失敗！');
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// 顯示圖片預覽
function showImagePreview(src) {
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.innerHTML = `
            <img src="${src}" alt="預覽圖片" style="max-width: 100%; height: auto; border-radius: 8px;">
            <p style="margin-top: 8px; font-size: 12px; color: #666;">原始圖片預覽</p>
        `;
    }
}

// 取得選中的模板
function getSelectedTemplate() {
    const selectedTemplate = document.querySelector('input[name="template"]:checked');
    return selectedTemplate ? selectedTemplate.value : '1';
}

// 生成圖片
function generateImage() {
    if (!uploadedImage) {
        alert('請先上傳圖片！');
        return;
    }
    
    const template = getSelectedTemplate();
    console.log(`🎨 開始生成模板${template}（最終版）...`);
    
    const title = document.getElementById('title').value.trim();
    const subtitle = document.getElementById('subtitle').value.trim();
    const description = document.getElementById('description').value.trim();
    
    // 載入背景圖
    const backgroundImg = new Image();
    const bgImagePath = template === '1' ? 'bg-template1.png' : 'bg-template2.png';
    
    backgroundImg.onload = function() {
        console.log('✅ 背景圖載入成功');
        drawCompleteImage(backgroundImg, template, title, subtitle, description);
    };
    
    backgroundImg.onerror = function() {
        console.log('⚠️ 背景圖載入失敗，使用預設背景');
        drawCompleteImage(null, template, title, subtitle, description);
    };
    
    backgroundImg.src = bgImagePath;
}

// 完整繪製圖片
function drawCompleteImage(backgroundImg, template, title, subtitle, description) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製背景
    if (backgroundImg) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        console.log('✅ 底圖已載入');
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.log('⚠️ 使用純白背景');
    }
    
    // 根據模板繪製
    if (template === '1') {
        drawTemplate1_45PercentImage();
        drawTemplate1CleanText(title, subtitle, description);
    } else {
        drawTemplate2ExtendedImage();
        drawTemplate2CleanText(title, subtitle, description);
    }
    
    isGenerated = true;
    document.getElementById('download-btn').disabled = false;
    
    const resetImageBtn = document.getElementById('reset-image-btn');
    const resetTextBtn = document.getElementById('reset-text-btn');
    if (resetImageBtn) resetImageBtn.disabled = false;
    if (resetTextBtn) resetTextBtn.disabled = false;
    
    console.log(`✅ 模板${template}生成完成（最終版）`);
}

// 模板一：45%滿版圖片
function drawTemplate1_45PercentImage() {
    const specs = DESIGN_SPECS.template1;
    const imageArea = specs.imageArea;
    
    console.log('🖼️ 模板一：45%滿版圖片（800×504）');
    
    ctx.save();
    
    ctx.beginPath();
    ctx.rect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
    ctx.clip();
    
    const imgRatio = uploadedImage.width / uploadedImage.height;
    const areaRatio = imageArea.width / imageArea.height;
    
    let baseWidth, baseHeight;
    
    if (imgRatio > areaRatio) {
        baseHeight = imageArea.height;
        baseWidth = imageArea.height * imgRatio;
    } else {
        baseWidth = imageArea.width;
        baseHeight = imageArea.width / imgRatio;
    }
    
    const scaledWidth = baseWidth * imageScale;
    const scaledHeight = baseHeight * imageScale;
    
    const centerX = imageArea.x + (imageArea.width - scaledWidth) / 2;
    const centerY = imageArea.y + (imageArea.height - scaledHeight) / 2;
    
    const drawX = centerX + imageOffsetX;
    const drawY = centerY + imageOffsetY;
    
    ctx.drawImage(uploadedImage, drawX, drawY, scaledWidth, scaledHeight);
    
    ctx.restore();
    
    // 拖曳提示邊框
    if (isDragging && dragType === 'image') {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
        ctx.setLineDash([]);
    }
    
    console.log(`📏 45%滿版圖片 - 區域:${imageArea.width}×${imageArea.height}(45%)`);
}

// 模板二：延伸圓角圖片（無色塊）
function drawTemplate2ExtendedImage() {
    const specs = DESIGN_SPECS.template2;
    const imageArea = specs.imageArea;
    
    console.log(`🖼️ 模板二：延伸圓角圖片 (${imageArea.width}×${imageArea.height}) 位置:(${imageArea.x},${imageArea.y})`);
    
    ctx.save();
    
    drawRoundedRect(ctx, imageArea.x, imageArea.y, imageArea.width, imageArea.height, imageArea.borderRadius, false, false);
    ctx.clip();
    
    const imgRatio = uploadedImage.width / uploadedImage.height;
    const areaRatio = imageArea.width / imageArea.height;
    
    let baseWidth, baseHeight;
    
    if (imgRatio > areaRatio) {
        baseHeight = imageArea.height;
        baseWidth = imageArea.height * imgRatio;
    } else {
        baseWidth = imageArea.width;
        baseHeight = imageArea.width / imgRatio;
    }
    
    const scaledWidth = baseWidth * imageScale;
    const scaledHeight = baseHeight * imageScale;
    
    const centerX = imageArea.x + (imageArea.width - scaledWidth) / 2;
    const centerY = imageArea.y + (imageArea.height - scaledHeight) / 2;
    
    const drawX = centerX + imageOffsetX;
    const drawY = centerY + imageOffsetY;
    
    ctx.drawImage(uploadedImage, drawX, drawY, scaledWidth, scaledHeight);
    
    ctx.restore();
    
    // 拖曳提示
    if (isDragging && dragType === 'image') {
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        drawRoundedRect(ctx, imageArea.x, imageArea.y, imageArea.width, imageArea.height, imageArea.borderRadius, false, true);
        ctx.setLineDash([]);
    }
    
    console.log(`📏 模板二延伸圖片 - 區域:${imageArea.width}×${imageArea.height} (無色塊)`);
}

// 模板一：純文字
function drawTemplate1CleanText(title, subtitle, description) {
    const specs = DESIGN_SPECS.template1;
    
    console.log('📝 模板一：純文字（完整控制）');
    
    drawDraggableTextWithSpacing('template1', 'title', title, specs.draggableAreas.title);
    drawDraggableTextWithSpacing('template1', 'subtitle', subtitle, specs.draggableAreas.subtitle);
    drawDraggableTextWithSpacing('template1', 'description', description, specs.draggableAreas.description);
}

// 模板二：純文字（無色塊版本）
function drawTemplate2CleanText(title, subtitle, description) {
    const specs = DESIGN_SPECS.template2;
    
    console.log('📝 模板二：純文字（無色塊版本）');
    
    // 不再繪製標題橫桿色塊
    
    drawDraggableTextWithSpacing('template2', 'title', title, specs.draggableAreas.title);
    drawDraggableTextWithSpacing('template2', 'subtitle', subtitle, specs.draggableAreas.subtitle);
    drawDraggableTextWithSpacing('template2', 'description', description, specs.draggableAreas.description);
}

// 繪製單個可拖曳文字（支援完整間距控制）
function drawDraggableTextWithSpacing(templateKey, textType, text, area) {
    if (!text) return;
    
    const offset = textOffsets[templateKey][textType];
    const drawX = area.x + offset.x;
    const drawY = area.y + offset.y;
    
    // 獲取用戶自定義樣式
    const userStyle = userTextStyles[templateKey][textType];
    
    // 設定基本文字樣式
    ctx.font = `${userStyle.fontWeight} ${userStyle.fontSize}px "${userStyle.fontFamily}"`;
    ctx.fillStyle = userStyle.color;
    ctx.textAlign = area.centerAlign ? 'center' : 'left';
    
    // 設定字元間距
    if (userStyle.letterSpacing !== 0) {
        ctx.letterSpacing = userStyle.letterSpacing + 'px';
    } else {
        ctx.letterSpacing = 'normal';
    }
    
    // 使用自定義文字框寬度
    const textBoxWidth = userStyle.width;
    
    // 處理換行（支援手動換行和自動換行）
    let lines;
    if (textType === 'description' && text.includes('\n')) {
        // 支援手動換行
        lines = [];
        text.split('\n').forEach(line => {
            if (line.trim()) {
                lines.push(...wrapTextWithWidth(line, textBoxWidth));
            } else {
                lines.push(''); // 保留空行
            }
        });
    } else {
        // 自動換行
        lines = wrapTextWithWidth(text, textBoxWidth);
    }
    
    // 使用自定義行距
    const lineHeight = userStyle.fontSize * userStyle.lineHeight;
    
    lines.forEach((line, index) => {
        const textX = area.centerAlign ? drawX + textBoxWidth / 2 : drawX;
        const textY = drawY + userStyle.fontSize + (index * lineHeight);
        if (line !== '') { // 不繪製空行
            ctx.fillText(line, textX, textY);
        }
    });
    
    // 拖曳提示邊框（使用自定義尺寸）
    if (isDragging && dragType === textType) {
        ctx.strokeStyle = '#28a745';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(drawX - 5, drawY, userStyle.width + 10, userStyle.height + 10);
        ctx.setLineDash([]);
    }
    
    // 重置字元間距
    ctx.letterSpacing = 'normal';
    
    console.log(`📝 ${textType}文字 - 位置:(${drawX.toFixed(0)},${drawY.toFixed(0)}) 尺寸:${userStyle.width}×${userStyle.height} 字距:${userStyle.letterSpacing} 行距:${userStyle.lineHeight} [最終版]`);
}

// 輔助函數：繪製圓角矩形
function drawRoundedRect(ctx, x, y, width, height, radius, fill = false, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// 文字換行處理（使用自定義寬度）
function wrapTextWithWidth(text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine !== '') {
        lines.push(currentLine);
    }
    
    return lines;
}

// 原始文字換行處理（向後兼容）
function wrapText(text, maxWidth) {
    return wrapTextWithWidth(text, maxWidth);
}

// 下載圖片（修復版本）
function downloadImage() {
    if (!isGenerated) {
        alert('請先生成圖片！');
        return;
    }
    
    try {
        // 使用 setTimeout 確保畫布完全渲染
        setTimeout(() => {
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const template = getSelectedTemplate();
            
            // 確保 canvas 存在且有內容
            if (!canvas || !ctx) {
                console.error('❌ Canvas 或 Context 不存在');
                alert('Canvas 錯誤，請重新生成圖片！');
                return;
            }
            
            // 使用高品質 PNG 格式
            const dataURL = canvas.toDataURL('image/png', 1.0);
            
            if (!dataURL || dataURL === 'data:,') {
                console.error('❌ Canvas 內容為空');
                alert('圖片內容為空，請重新生成！');
                return;
            }
            
            link.download = `圖片生成器_模板${template}_最終版_${timestamp}.png`;
            link.href = dataURL;
            link.style.display = 'none';
            
            // 添加到 DOM，觸發下載，然後移除
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ 下載完成: 模板${template}（最終版）- 用戶: tonyonier99 - 時間: 2025-07-19 19:11:31`);
            
            // 顯示成功訊息
            const successMsg = document.createElement('div');
            successMsg.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 1000;
                font-size: 14px;
            `;
            successMsg.textContent = '✅ 圖片下載成功！';
            document.body.appendChild(successMsg);
            
            setTimeout(() => {
                if (document.body.contains(successMsg)) {
                    document.body.removeChild(successMsg);
                }
            }, 3000);
            
        }, 100);
        
    } catch (error) {
        console.error('❌ 下載失敗:', error);
        alert(`下載失敗：${error.message}`);
        
        // 顯示錯誤訊息
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
        `;
        errorMsg.textContent = '❌ 下載失敗，請重試！';
        document.body.appendChild(errorMsg);
        
        setTimeout(() => {
            if (document.body.contains(errorMsg)) {
                document.body.removeChild(errorMsg);
            }
        }, 3000);
    }
}

// 確保所有全局函數都已定義
console.log('🎉 最終版圖片生成器載入完成 - 自動字體檢測系統版');
console.log('📅 版本時間: 2025-07-20 12:06:55');
console.log('👤 用戶: tonyonier99');
console.log('✨ 功能特色:');
console.log('   - 🚀 全新：自動字體檢測與載入系統');
console.log('   - 🤖 智能字體命名：檔案名自動轉換為友好顯示名稱');
console.log('   - 🏷️ 自動分類：無襯線、襯線、手寫、中文字體等');
console.log('   - ⚡ 熱重載：支援動態檢測新增字體');
console.log('   - 🎯 用戶友好：僅需將字體檔案放入 fonts/ 資料夾');
console.log('   - 📊 載入檢測：FontFace API 自動驗證字體可用性');
console.log('   - 🔄 管理介面：重新檢測按鈕、載入狀態顯示');
console.log('   - 模板二移除色塊，圖片延伸至480px高度');
console.log('   - 控制面板預設收合');
console.log('   - 修復下載功能，增加錯誤處理');
console.log('   - 支援完整文字間距、行距、尺寸控制');
console.log('   - 全拖曳支援，XY軸無限制');
console.log(`\n🎯 支援的字體格式：${SUPPORTED_FONT_FORMATS.join(', ')}`);
console.log(`📁 現有字體檔案：lihsianti-proportional.ttf → "李西安蒂比例字體"`);
console.log(`🔤 系統將自動檢測並載入 fonts/ 資料夾中的所有字體檔案`);