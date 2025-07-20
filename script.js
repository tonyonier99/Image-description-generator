// 全域變數
let canvas, ctx;
let uploadedImages = []; // 🔧 修改：改為陣列存放多張圖片
let currentImageIndex = 0; // 🔧 新增：當前選中的圖片索引
let isGenerated = false;

// 拖曳相關變數
let isDragging = false;
let dragType = null; // 'image', 'title', 'subtitle', 'description'
let dragStartX = 0;
let dragStartY = 0;

// 🔧 修正：移除全域圖片偏移，改為每張圖片獨立管理
// let imageOffsetX = 0;
// let imageOffsetY = 0;
// let imageScale = 1;

// 🔧 新增：多圖片設定 - 每張圖片獨立設定
let multiImageSettings = {
    template1: [],
    template2: []
};

// 🔧 新增：圖片層級管理
let imageLayerOrder = []; // 存放圖片索引的顯示順序

// 🔧 新增：手機版觸控處理
let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let touchStartTime = 0;
let lastTouchEnd = 0;

// 🔧 保留：單圖片設定作為預設模板
let imageSettings = {
    template1: {
        borderRadius: 0,
        offsetX: 0,
        offsetY: 0,
        width: 800,
        height: 504,
        scale: 1,
        opacity: 1,
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        zIndex: 1,
        visible: true
    },
    template2: {
        borderRadius: 20,
        offsetX: 25,
        offsetY: 25,
        width: 750,
        height: 480,
        scale: 1,
        opacity: 1,
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        zIndex: 1,
        visible: true
    }
};

// 文字偏移（兩個模板分別記錄）
let textOffsets = {
    template1: {
        title: { x: -2, y: 20 },
        subtitle: { x: 1, y: 39 },
        description: { x: -38, y: 35 }
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
            fontSize: 75,
            fontFamily: 'Noto Sans TC',
            color: '#564529',
            fontWeight: 'bold',
            letterSpacing: 0,
            lineHeight: 1.2,
            width: 640,
            height: 80,
            italic: false,
            underline: false,
            strikethrough: false
        },
        subtitle: {
            fontSize: 26,
            fontFamily: 'Noto Sans TC',
            color: '#564529',
            fontWeight: 'lighter',
            letterSpacing: 0,
            lineHeight: 1.3,
            width: 640,
            height: 60,
            italic: false,
            underline: false,
            strikethrough: false
        },
        description: {
            fontSize: 20,
            fontFamily: 'Noto Sans TC',
            color: '#8E7F69',
            fontWeight: 'lighter',
            letterSpacing: 1,
            lineHeight: 1.8,
            width: 700,
            height: 300,
            italic: false,
            underline: false,
            strikethrough: false
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
            height: 40,
            italic: false,
            underline: false,
            strikethrough: false
        },
        subtitle: {
            fontSize: 28,
            fontFamily: 'Noto Sans TC',
            color: '#FFFFFF',
            fontWeight: 'lighter',
            letterSpacing: 0,
            lineHeight: 1.3,
            width: 600,
            height: 30,
            italic: false,
            underline: false,
            strikethrough: false
        },
        description: {
            fontSize: 20,
            fontFamily: 'Noto Sans TC',
            color: '#564529',
            fontWeight: 'lighter',
            letterSpacing: 3,
            lineHeight: 1.6,
            width: 700,
            height: 350,
            italic: false,
            underline: false,
            strikethrough: false
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
            height: 504,
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
            x: 25,
            y: 25,
            width: 750,
            height: 480,
            mode: 'cover-fullscreen',
            borderRadius: 20
        },
        draggableAreas: {
            title: {
                x: 100,
                y: 700,
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120,     
                centerAlign: true
            },
            subtitle: {
                x: 100,
                y: 740,
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120,     
                centerAlign: true
            },
            description: {
                x: 50,
                y: 780,
                minX: 0,        
                maxX: 800,      
                minY: 0,        
                maxY: 1120      
            }
        },
        textAlign: 'center'
    }
};

// 可用字體列表
const FONT_FAMILIES = [
    'Noto Sans TC',
    'Arial',
    'Microsoft JhengHei',
    'PingFang TC',
    'Heiti TC',
    'sans-serif'
];

// 🆕 自動字體檢測系統
let DETECTED_FONTS = [];
let FONT_LOAD_STATUS = {};

// 🆕 智能字體命名映射
const FONT_NAME_MAPPING = {
    'lihsianti': '李西安蒂',
    'proportional': '比例',
    'NotoSansTC': 'Noto Sans TC',
    'SourceHanSans': 'Source Han Sans',
    'TaipeiSans': '台北黑體',
    'JasonHandwriting': '瀨戶字體',
    'LXGWWenKai': '霞鶩文楷',
    'TaipeiSans': '台北黑體',
    'ChenYuluoyan': '晨雨洛雁',
    'Chen': '晨',
    'Yuluoyan': '雨洛雁',
    'Monospaced': '等寬',
    '极影': '極影',
    '毁片': '毀片',
    '和圆': '和圓',
    '圆': '圓',
    '荧圆': '熒圓'
};

const WEIGHT_MAPPING = {
    'Bold': '粗體',
    'Light': '細體', 
    'Regular': '標準',
    'Thin': '極細體',
    'Heavy': '特粗體'
};

// 🆕 字體檢測與載入系統
async function scanFontsDirectory() {
    console.log('🔍 開始掃描 fonts/ 資料夾...');
    
    const fontFormats = ['woff2', 'woff', 'ttf', 'otf'];
    const detectedFonts = [];
    
    // 常見字體檔案名稱列表（可配置）
    const commonFontFiles = [
        'ChenYuluoyan-2.0-Thin.ttf',
        'ChenYuluoyan-Thin-Monospaced.ttf',
        'ChenYuluoyan-Thin.ttf'
    ];
    
    for (const fontFile of commonFontFiles) {
        try {
            const fontData = await loadAndValidateFont(fontFile);
            if (fontData.loaded) {
                detectedFonts.push(fontData);
                console.log(`✅ 成功載入字體: ${fontFile} → ${fontData.displayName} (${fontData.fontName})`);
            }
        } catch (error) {
            console.log(`❌ 字體載入失敗: ${fontFile} - ${error.message}`);
        }
    }
    
    DETECTED_FONTS = detectedFonts;
    updateAllFontSelectors();
    
    console.log(`🎉 字體掃描完成！總共檢測到 ${detectedFonts.length} 個有效字體`);
    console.log(`📊 字體載入狀態摘要:`);
    detectedFonts.forEach(font => {
        console.log(`   📖 ${font.displayName} (${font.fileName})`);
    });
    return detectedFonts;
}

async function loadAndValidateFont(fontFile) {
    const fontPath = `fonts/${fontFile}`;
    const fontName = extractFontName(fontFile);
    const displayName = generateFontDisplayName(fontFile);
    
    try {
        const font = new FontFace(fontName, `url(${fontPath})`);
        await font.load();
        document.fonts.add(font);
        
        FONT_LOAD_STATUS[fontName] = 'loaded';
        
        return {
            fileName: fontFile,
            fontName: fontName,
            displayName: displayName,
            path: fontPath,
            loaded: true,
            category: categorizeFontByName(fontFile, displayName)
        };
    } catch (error) {
        FONT_LOAD_STATUS[fontName] = 'failed';
        throw error;
    }
}

function extractFontName(fontFile) {
    // 移除副檔名並轉換為適合的字體名稱
    return fontFile.replace(/\.(ttf|otf|woff2|woff)$/i, '').replace(/[^a-zA-Z0-9\-]/g, '');
}

function generateFontDisplayName(fontFile) {
    const baseName = fontFile.replace(/\.(ttf|otf|woff2|woff)$/i, '');
    
    // 特殊處理 lihsianti-proportional
    if (baseName.toLowerCase().includes('lihsianti') && baseName.toLowerCase().includes('proportional')) {
        return '李西安蒂比例字體';
    }
    
    // 拆分檔名進行智能轉換
    let displayName = baseName;
    
    // 應用主要名稱映射
    for (const [key, value] of Object.entries(FONT_NAME_MAPPING)) {
        if (displayName.toLowerCase().includes(key.toLowerCase())) {
            displayName = displayName.replace(new RegExp(key, 'gi'), value);
        }
    }
    
    // 應用粗細映射
    for (const [key, value] of Object.entries(WEIGHT_MAPPING)) {
        if (displayName.includes(key)) {
            displayName = displayName.replace(key, value);
        }
    }
    
    // 清理連字符和多餘空格
    displayName = displayName.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    
    return displayName || baseName;
}

function categorizeFontByName(fontFile, displayName) {
    if (fontFile.toLowerCase().includes('sans')) return 'sans-serif';
    if (fontFile.toLowerCase().includes('serif')) return 'serif';
    if (fontFile.toLowerCase().includes('mono')) return 'monospace';
    return 'custom';
}

function getAllAvailableFonts() {
    const systemFonts = FONT_FAMILIES.map(font => ({
        value: font,
        display: font,
        type: 'system'
    }));
    
    const detectedFonts = DETECTED_FONTS.map(font => ({
        value: font.fontName,
        display: `${font.displayName} ✨`,
        type: 'detected',
        status: FONT_LOAD_STATUS[font.fontName]
    }));
    
    return [...systemFonts, ...detectedFonts];
}

function updateAllFontSelectors() {
    ['title', 'subtitle', 'description'].forEach(textType => {
        const selector = document.getElementById(`fontFamily-${textType}`);
        if (selector) {
            updateFontSelector(selector, textType);
        }
    });
    
    // 更新字體狀態顯示
    updateFontStatusDisplay();
}

function updateFontSelector(selector, textType) {
    const template = getSelectedTemplate();
    const currentStyle = userTextStyles[`template${template}`][textType];
    const allFonts = getAllAvailableFonts();
    
    selector.innerHTML = allFonts.map(font => 
        `<option value="${font.value}" ${currentStyle.fontFamily === font.value ? 'selected' : ''}>${font.display}</option>`
    ).join('');
}

function updateFontStatusDisplay() {
    // 這個函數將在控制面板更新時被調用，顯示字體狀態
    console.log(`📊 字體狀態 - 系統字體: ${FONT_FAMILIES.length} 個 | 檢測字體: ${DETECTED_FONTS.length} 個`);
}

async function initializeFontDetection() {
    console.log('🔍 初始化字體檢測系統...');
    try {
        await scanFontsDirectory();
        console.log('✅ 字體檢測系統初始化完成');
    } catch (error) {
        console.error('❌ 字體檢測系統初始化失敗:', error);
    }
}

// 🆕 將字體掃描函數設為全域可用
window.scanFontsDirectory = scanFontsDirectory;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 啟動多圖片版：修正縮放邏輯+手機版優化+自動字體檢測');
    
    initializeCanvas();
    setupBasicEvents();
    setupDragSystem();
    setupMultiImageControls();
    setupTextStyleControls();
    addControlButtons();
    addPositionLogger();
    setupMobileOptimizations(); // 🔧 新增：手機版優化
    
    // 🆕 新增：自動字體檢測
    initializeFontDetection();
    
    loadDefaultSettings();
    
    console.log('✅ 初始化完成 - 多圖片控制版本（修正縮放+手機版+字體檢測）');
});

// 🔧 新增：手機版優化設定
function setupMobileOptimizations() {
    if (!isMobileDevice) return;
    
    // 防止雙擊縮放
    document.addEventListener('touchend', function(e) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    // 防止頁面滾動衝突
    document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Canvas 特殊處理
    canvas.addEventListener('touchstart', function(e) {
        e.stopPropagation();
        touchStartTime = Date.now();
    }, { passive: false });
    
    canvas.addEventListener('touchmove', function(e) {
        e.stopPropagation();
        e.preventDefault();
    }, { passive: false });
    
    canvas.addEventListener('touchend', function(e) {
        e.stopPropagation();
    }, { passive: false });
    
    // 添加手機版專用樣式
    const mobileStyle = document.createElement('style');
    mobileStyle.textContent = `
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            .multi-image-panel .panel-content {
                padding: 15px;
            }
            .image-controls-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            .image-gallery {
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
            }
            .image-thumbnail img {
                height: 60px;
            }
            .style-controls {
                grid-template-columns: 1fr;
            }
            .range-display {
                flex-direction: column;
                align-items: stretch;
                gap: 5px;
            }
            .xy-controls {
                grid-template-columns: 1fr;
                gap: 8px;
            }
            .image-preset-buttons {
                grid-template-columns: repeat(2, 1fr);
            }
            .layer-controls {
                flex-wrap: wrap;
                gap: 5px;
            }
            .upload-area {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
            }
            .upload-btn {
                width: 100%;
                padding: 12px;
                font-size: 16px;
            }
            canvas {
                max-width: 100%;
                height: auto;
                touch-action: none;
            }
            .btn {
                padding: 10px 15px;
                font-size: 14px;
                margin: 5px;
            }
            .action-buttons {
                flex-wrap: wrap;
                gap: 10px;
            }
        }
        
        @media (max-width: 480px) {
            .image-gallery {
                grid-template-columns: repeat(3, 1fr);
            }
            .image-thumbnail img {
                height: 50px;
            }
            .panel-header h3 {
                font-size: 16px;
            }
            .image-control-group h4 {
                font-size: 14px;
            }
        }
    `;
    document.head.appendChild(mobileStyle);
    
    console.log('📱 手機版優化已啟用');
}

// 🔧 新增：多圖片輔助函數
function createImageSettings(template) {
    return {
        borderRadius: template === 'template1' ? 0 : 20,
        offsetX: template === 'template1' ? 0 : 25,
        offsetY: template === 'template1' ? 0 : 25,
        width: template === 'template1' ? 800 : 750,
        height: template === 'template1' ? 504 : 480,
        scale: 1,
        opacity: 1,
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        zIndex: 1,
        visible: true
    };
}

function addNewImage(imageElement, fileName) {
    const imageIndex = uploadedImages.length;
    uploadedImages.push({
        element: imageElement,
        fileName: fileName,
        uploadTime: new Date()
    });
    
    // 為每個模板創建設定
    multiImageSettings.template1[imageIndex] = createImageSettings('template1');
    multiImageSettings.template2[imageIndex] = createImageSettings('template2');
    
    // 更新層級順序
    imageLayerOrder.push(imageIndex);
    
    // 設定為當前圖片
    currentImageIndex = imageIndex;
    
    console.log(`✅ 新增圖片 ${imageIndex}: ${fileName}`);
    return imageIndex;
}

function getCurrentImage() {
    return uploadedImages[currentImageIndex];
}

function getCurrentImageSettings() {
    const template = getSelectedTemplate();
    return multiImageSettings[`template${template}`][currentImageIndex];
}

// 🔧 新增：載入預設設定函數
function loadDefaultSettings() {
    console.log('📋 載入預設設定...');
    console.log('模板2標題預設:', userTextStyles.template2.title.fontSize + 'px');
    console.log('模板2標題位置偏移:', textOffsets.template2.title);
    console.log('模板2副標題字體粗細:', userTextStyles.template2.subtitle.fontWeight);
    console.log('模板2描述字元間距:', userTextStyles.template2.description.letterSpacing + 'px');
    
    validateSettings();
}

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

function logCurrentPositions() {
    console.log('🔍 執行設定驗證...');
    validateSettings();
    
    const template = getSelectedTemplate();
    const currentOffsets = textOffsets[`template${template}`];
    const currentStyles = userTextStyles[`template${template}`];
    
    console.log('\n🎯 ===== 完整設定記錄 =====');
    console.log(`模板 ${template} 的設定：`);
    console.log(`圖片數量: ${uploadedImages.length}`);
    console.log(`當前選中圖片: ${currentImageIndex}`);
    
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
    });
    
    if (uploadedImages.length > 0) {
        console.log('圖片設定:');
        uploadedImages.forEach((img, index) => {
            const imgSettings = multiImageSettings[`template${template}`][index];
            console.log(`  圖片${index}: ${img.fileName}`);
            console.log(`    位置: (${imgSettings.offsetX}, ${imgSettings.offsetY})`);
            console.log(`    尺寸: ${imgSettings.width}×${imgSettings.height}`);
            console.log(`    縮放: ${Math.round(imgSettings.scale * 100)}%`);
            console.log(`    可見: ${imgSettings.visible}, 層級: ${imgSettings.zIndex}`);
        });
    }
    
    console.log('🎯 ===========================\n');
    
    alert(`模板${template}完整設定已記錄到控制台，包含${uploadedImages.length}張圖片！`);
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

function clearCanvas() {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#666';
    ctx.font = '24px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('多圖片版圖片生成器', canvas.width / 2, canvas.height / 2 + 50);
    ctx.font = '16px "Noto Sans TC"';
    ctx.fillText('支援多張圖片上傳與獨立調整', canvas.width / 2, canvas.height / 2 + 80);
    ctx.fillText('修正縮放邏輯 + 手機版優化', canvas.width / 2, canvas.height / 2 + 110);
}

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
    
    imageUpload.addEventListener('change', function(e) {
        handleImageUpload(e);
        if (e.target.files[0]) {
            updateCurrentImageInfo(e.target.files[0].name);
        }
    });
    generateBtn.addEventListener('click', generateImage);
    downloadBtn.addEventListener('click', downloadImage);
    
    const templateInputs = document.querySelectorAll('input[name="template"]');
    templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            console.log(`🔄 切換到模板${this.value}`);
            
            updateMultiImageControls();
            updateTextStylePanel();
            
            const template = this.value;
            console.log(`模板${template}標題設定:`, userTextStyles[`template${template}`].title);
            console.log(`模板${template}圖片數量:`, uploadedImages.length);
            
            if (uploadedImages.length > 0 && isGenerated) {
                generateImage();
            }
        });
    });
    
    const textInputs = ['title', 'subtitle', 'description'];
    textInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                if (uploadedImages.length > 0 && isGenerated) {
                    generateImage();
                }
            });
        }
    });
    
    console.log('✅ 基本事件設定完成');
}

// 🔧 新增：多圖片控制系統
function setupMultiImageControls() {
    createMultiImageControlPanel();
    console.log('✅ 多圖片控制面板設定完成');
}

function createMultiImageControlPanel() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    if (document.getElementById('multi-image-control-panel')) return;
    
    const imagePanel = document.createElement('div');
    imagePanel.id = 'multi-image-control-panel';
    imagePanel.className = 'multi-image-panel';
    imagePanel.innerHTML = `
        <div class="panel-header">
            <h3>🖼️ 多圖片控制面板</h3>
            <button id="toggle-multi-image-panel" class="btn-small">展開</button>
        </div>
        <div class="panel-content" id="multi-image-panel-content" style="display: none;">
            <div class="image-upload-section">
                <div class="upload-area">
                    <input type="file" id="additional-image-upload" accept="image/*" multiple style="display: none;">
                    <button class="upload-btn" onclick="document.getElementById('additional-image-upload').click()">
                        📁 選擇多張圖片
                    </button>
                    <div class="image-count-info" id="image-count-info">
                        目前沒有上傳圖片
                    </div>
                </div>
            </div>
            <div class="image-gallery-section" id="image-gallery-section">
                <!-- 動態生成圖片縮圖 -->
            </div>
            <div class="current-image-controls" id="current-image-controls">
                <!-- 動態生成當前圖片控制項 -->
            </div>
        </div>
    `;
    
    // 添加多圖片控制面板樣式
    const style = document.createElement('style');
    style.textContent = `
        .multi-image-panel {
            margin: 20px 0;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f0f8ff;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .multi-image-panel .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom: 1px solid #ddd;
        }
        .multi-image-panel .panel-header h3 {
            margin: 0;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .image-upload-section {
            padding: 15px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .upload-area {
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        .upload-btn {
            padding: 8px 16px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: transform 0.2s;
        }
        .upload-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(79, 172, 254, 0.4);
        }
        .image-count-info {
            font-size: 13px;
            color: #6c757d;
            background: white;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
        }
        .image-gallery-section {
            padding: 20px;
            background: #fff;
            border-bottom: 1px solid #e9ecef;
        }
        .image-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 15px;
        }
        .image-thumbnail {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid transparent;
            transition: all 0.3s;
            cursor: pointer;
            background: #f8f9fa;
        }
        .image-thumbnail:hover {
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .image-thumbnail.active {
            border-color: #28a745;
            box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
        }
        .image-thumbnail img {
            width: 100%;
            height: 80px;
            object-fit: cover;
            display: block;
        }
        .image-thumbnail-info {
            padding: 8px;
            background: white;
            font-size: 11px;
            color: #666;
            text-align: center;
            border-top: 1px solid #eee;
        }
        .image-thumbnail-controls {
            position: absolute;
            top: 5px;
            right: 5px;
            display: flex;
            gap: 2px;
        }
        .thumbnail-btn {
            width: 20px;
            height: 20px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .thumbnail-btn.visibility {
            background: rgba(52, 152, 219, 0.8);
            color: white;
        }
        .thumbnail-btn.visibility:hover {
            background: rgba(52, 152, 219, 1);
        }
        .thumbnail-btn.delete {
            background: rgba(231, 76, 60, 0.8);
            color: white;
        }
        .thumbnail-btn.delete:hover {
            background: rgba(231, 76, 60, 1);
        }
        .image-thumbnail.hidden {
            opacity: 0.5;
            border-color: #999;
        }
        .current-image-controls {
            padding: 20px;
        }
        .current-image-header {
            background: linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%);
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            color: #2980b9;
            border-left: 4px solid #3498db;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .image-controls-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        .image-control-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .image-control-group h4 {
            margin: 0 0 8px 0;
            color: #2c3e50;
            font-size: 15px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 8px;
        }
        .image-control-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .image-control-item label {
            font-weight: 500;
            color: #34495e;
            font-size: 13px;
        }
        .image-control-item input[type="range"] {
            width: 100%;
            height: 8px;
            border-radius: 4px;
            background: #e9ecef;
            outline: none;
            -webkit-appearance: none;
        }
        .image-control-item input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        }
        .image-control-item input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
        }
        .range-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }
        .range-value {
            font-size: 12px;
            color: #7f8c8d;
            font-weight: bold;
            min-width: 50px;
            text-align: right;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid #e9ecef;
        }
        .image-preset-buttons {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 12px;
        }
        .image-preset-btn {
            padding: 8px 12px;
            font-size: 11px;
            border: 1px solid #3498db;
            background: white;
            color: #3498db;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }
        .image-preset-btn:hover {
            background: #3498db;
            color: white;
            transform: translateY(-1px);
        }
        .xy-controls {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .filter-preview {
            width: 100%;
            height: 60px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
            border-radius: 4px;
            margin-top: 8px;
            position: relative;
            overflow: hidden;
        }
        .filter-preview::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: inherit;
            filter: brightness(var(--brightness, 100%)) 
                   contrast(var(--contrast, 100%)) 
                   saturate(var(--saturation, 100%)) 
                   blur(var(--blur, 0px));
            opacity: var(--opacity, 1);
        }
        .layer-controls {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            flex-wrap: wrap;
        }
        .layer-btn {
            padding: 6px 12px;
            font-size: 11px;
            border: 1px solid #6c757d;
            background: white;
            color: #6c757d;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .layer-btn:hover {
            background: #6c757d;
            color: white;
        }
    `;
    document.head.appendChild(style);
    
    const inputSection = document.querySelector('.input-section');
    if (inputSection) {
        inputSection.insertAdjacentElement('afterend', imagePanel);
    } else {
        container.appendChild(imagePanel);
    }
    
    setupMultiImagePanelEvents();
    setupAdditionalImageUpload();
    updateMultiImageControls();
}

function setupAdditionalImageUpload() {
    const additionalUpload = document.getElementById('additional-image-upload');
    if (additionalUpload) {
        additionalUpload.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    handleMultiImageUpload(file);
                }
            });
            updateImageCountInfo();
            updateImageGallery();
            updateMultiImageControls();
        });
    }
}

function handleMultiImageUpload(file) {
    console.log('📁 開始處理多圖片上傳...', file.name);
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            const imageIndex = addNewImage(img, file.name);
            
            // 如果是第一張圖片，啟用生成按鈕
            if (uploadedImages.length === 1) {
                document.getElementById('generate-btn').disabled = false;
            }
            
            console.log(`✅ 圖片${imageIndex}載入成功: ${img.width} × ${img.height}`);
            
            updateImageGallery();
            updateMultiImageControls();
            updateImageCountInfo();
            
            // 如果已經有生成過，自動重新生成
            if (isGenerated) {
                generateImage();
            }
        };
        
        img.onerror = function() {
            console.error('❌ 圖片載入失敗:', file.name);
            alert(`圖片載入失敗：${file.name}`);
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

function updateImageCountInfo() {
    const infoElement = document.getElementById('image-count-info');
    if (infoElement) {
        if (uploadedImages.length === 0) {
            infoElement.textContent = '目前沒有上傳圖片';
        } else {
            infoElement.innerHTML = `
                📸 已上傳 ${uploadedImages.length} 張圖片 | 當前選中: 圖片 ${currentImageIndex + 1}
            `;
        }
    }
}

function updateImageGallery() {
    const gallerySection = document.getElementById('image-gallery-section');
    if (!gallerySection) return;
    
    if (uploadedImages.length === 0) {
        gallerySection.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">尚未上傳任何圖片</p>';
        return;
    }
    
    const galleryHTML = `
        <h4 style="margin: 0 0 15px 0; color: #2c3e50;">圖片庫 (${uploadedImages.length} 張)</h4>
        <div class="image-gallery">
            ${uploadedImages.map((img, index) => {
                const template = getSelectedTemplate();
                const settings = multiImageSettings[`template${template}`][index];
                const isActive = index === currentImageIndex;
                const isHidden = !settings.visible;
                
                return `
                    <div class="image-thumbnail ${isActive ? 'active' : ''} ${isHidden ? 'hidden' : ''}" 
                         onclick="selectImage(${index})">
                        <div class="image-thumbnail-controls">
                            <button class="thumbnail-btn visibility" 
                                    onclick="event.stopPropagation(); toggleImageVisibility(${index})"
                                    title="${settings.visible ? '隱藏' : '顯示'}">
                                ${settings.visible ? '👁️' : '🚫'}
                            </button>
                            <button class="thumbnail-btn delete" 
                                    onclick="event.stopPropagation(); deleteImage(${index})"
                                    title="刪除">
                                🗑️
                            </button>
                        </div>
                        <img src="${img.element.src}" alt="${img.fileName}">
                        <div class="image-thumbnail-info">
                            圖片 ${index + 1}<br>
                            <span style="font-size: 10px;">${img.fileName.length > 10 ? img.fileName.substring(0, 10) + '...' : img.fileName}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    gallerySection.innerHTML = galleryHTML;
}

function setupMultiImagePanelEvents() {
    const toggleBtn = document.getElementById('toggle-multi-image-panel');
    const panelContent = document.getElementById('multi-image-panel-content');
    
    if (toggleBtn && panelContent) {
        toggleBtn.addEventListener('click', function() {
            const isCollapsed = panelContent.style.display === 'none';
            panelContent.style.display = isCollapsed ? 'block' : 'none';
            this.textContent = isCollapsed ? '收合' : '展開';
        });
    }
}

// 🔧 新增：圖片管理函數
window.selectImage = function(index) {
    if (index >= 0 && index < uploadedImages.length) {
        currentImageIndex = index;
        updateImageGallery();
        updateMultiImageControls();
        console.log(`🖱️ 選中圖片 ${index}: ${uploadedImages[index].fileName}`);
    }
};

window.toggleImageVisibility = function(index) {
    const template = getSelectedTemplate();
    const settings = multiImageSettings[`template${template}`][index];
    settings.visible = !settings.visible;
    
    updateImageGallery();
    console.log(`👁️ 圖片 ${index} 可見性: ${settings.visible}`);
    
    if (isGenerated) {
        generateImage();
    }
};

window.deleteImage = function(index) {
    if (confirm(`確定要刪除圖片 ${index + 1}：${uploadedImages[index].fileName} 嗎？`)) {
        // 移除圖片和設定
        uploadedImages.splice(index, 1);
        multiImageSettings.template1.splice(index, 1);
        multiImageSettings.template2.splice(index, 1);
        
        // 更新層級順序
        imageLayerOrder = imageLayerOrder.filter(i => i !== index).map(i => i > index ? i - 1 : i);
        
        // 調整當前選中索引
        if (currentImageIndex >= index && currentImageIndex > 0) {
            currentImageIndex--;
        }
        if (currentImageIndex >= uploadedImages.length) {
            currentImageIndex = uploadedImages.length - 1;
        }
        
        // 如果沒有圖片了，禁用生成按鈕
        if (uploadedImages.length === 0) {
            document.getElementById('generate-btn').disabled = true;
            currentImageIndex = 0;
        }
        
        updateImageGallery();
        updateMultiImageControls();
        updateImageCountInfo();
        
        console.log(`🗑️ 刪除圖片 ${index}，剩餘 ${uploadedImages.length} 張`);
        
        if (isGenerated && uploadedImages.length > 0) {
            generateImage();
        }
    }
};

window.moveImageLayer = function(direction) {
    const template = getSelectedTemplate();
    const currentSettings = multiImageSettings[`template${template}`][currentImageIndex];
    
    if (direction === 'up') {
        currentSettings.zIndex = Math.min(currentSettings.zIndex + 1, uploadedImages.length);
    } else {
        currentSettings.zIndex = Math.max(currentSettings.zIndex - 1, 1);
    }
    
    updateMultiImageControls();
    console.log(`📚 圖片 ${currentImageIndex} 層級: ${currentSettings.zIndex}`);
    
    if (isGenerated) {
        generateImage();
    }
};

function updateMultiImageControls() {
    const controlsContainer = document.getElementById('current-image-controls');
    
    if (!controlsContainer) return;
    
    if (uploadedImages.length === 0) {
        controlsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">請先上傳圖片</p>';
        return;
    }
    
    const template = getSelectedTemplate();
    const currentImage = uploadedImages[currentImageIndex];
    const currentSettings = multiImageSettings[`template${template}`][currentImageIndex];
    
    controlsContainer.innerHTML = `
        <div class="current-image-header">
            🎯 當前調整圖片: ${currentImage.fileName} (圖片 ${currentImageIndex + 1}/${uploadedImages.length}) | 模板${template.slice(-1)}
        </div>
        
        <div class="image-controls-grid">
            <div class="image-control-group">
                <h4>📍 位置與尺寸</h4>
                <div class="xy-controls">
                    <div class="image-control-item">
                        <label>X軸位置</label>
                        <div class="range-display">
                            <input type="range" id="image-offsetX" min="-400" max="400" value="${currentSettings.offsetX}" step="1">
                            <span class="range-value">${currentSettings.offsetX}px</span>
                        </div>
                    </div>
                    <div class="image-control-item">
                        <label>Y軸位置</label>
                        <div class="range-display">
                            <input type="range" id="image-offsetY" min="-400" max="400" value="${currentSettings.offsetY}" step="1">
                            <span class="range-value">${currentSettings.offsetY}px</span>
                        </div>
                    </div>
                </div>
                <div class="xy-controls">
                    <div class="image-control-item">
                        <label>圖片寬度</label>
                        <div class="range-display">
                            <input type="range" id="image-width" min="50" max="1200" value="${currentSettings.width}" step="10">
                            <span class="range-value">${currentSettings.width}px</span>
                        </div>
                    </div>
                    <div class="image-control-item">
                        <label>圖片高度</label>
                        <div class="range-display">
                            <input type="range" id="image-height" min="50" max="1000" value="${currentSettings.height}" step="10">
                            <span class="range-value">${currentSettings.height}px</span>
                        </div>
                    </div>
                </div>
                <div class="image-control-item">
                    <label>縮放比例</label>
                    <div class="range-display">
                        <input type="range" id="image-scale" min="0.1" max="5" value="${currentSettings.scale}" step="0.05">
                        <span class="range-value">${Math.round(currentSettings.scale * 100)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="image-control-group">
                <h4>🎨 外觀與形狀</h4>
                <div class="image-control-item">
                    <label>圓角半徑</label>
                    <div class="range-display">
                        <input type="range" id="image-borderRadius" min="0" max="100" value="${currentSettings.borderRadius}" step="1">
                        <span class="range-value">${currentSettings.borderRadius}px</span>
                    </div>
                </div>
                <div class="image-control-item">
                    <label>透明度</label>
                    <div class="range-display">
                        <input type="range" id="image-opacity" min="5" max="100" value="${Math.round(currentSettings.opacity * 100)}" step="1">
                        <span class="range-value">${Math.round(currentSettings.opacity * 100)}%</span>
                    </div>
                </div>
                <div class="image-control-item">
                    <label>模糊效果</label>
                    <div class="range-display">
                        <input type="range" id="image-blur" min="0" max="20" value="${currentSettings.blur}" step="0.5">
                        <span class="range-value">${currentSettings.blur}px</span>
                    </div>
                </div>
                <div class="image-control-item">
                    <label>層級順序</label>
                    <div class="layer-controls">
                        <button class="layer-btn" onclick="moveImageLayer('up')">⬆️ 上移</button>
                        <button class="layer-btn" onclick="moveImageLayer('down')">⬇️ 下移</button>
                        <span style="padding: 6px 12px; font-size: 11px; color: #666;">層級 ${currentSettings.zIndex}</span>
                    </div>
                </div>
            </div>
            
            <div class="image-control-group">
                <h4>🌈 色彩調整</h4>
                <div class="image-control-item">
                    <label>亮度</label>
                    <div class="range-display">
                        <input type="range" id="image-brightness" min="20" max="300" value="${currentSettings.brightness}" step="1">
                        <span class="range-value">${currentSettings.brightness}%</span>
                    </div>
                </div>
                <div class="image-control-item">
                    <label>對比度</label>
                    <div class="range-display">
                        <input type="range" id="image-contrast" min="20" max="300" value="${currentSettings.contrast}" step="1">
                        <span class="range-value">${currentSettings.contrast}%</span>
                    </div>
                </div>
                <div class="image-control-item">
                    <label>飽和度</label>
                    <div class="range-display">
                        <input type="range" id="image-saturation" min="0" max="400" value="${currentSettings.saturation}" step="1">
                        <span class="range-value">${currentSettings.saturation}%</span>
                    </div>
                </div>
                <div class="filter-preview" id="filter-preview"></div>
            </div>
            
            <div class="image-control-group">
                <h4>⚡ 快速預設</h4>
                <div class="image-preset-buttons">
                    <button class="image-preset-btn" onclick="applyImagePreset('default')">🔄 預設</button>
                    <button class="image-preset-btn" onclick="applyImagePreset('rounded')">🔲 圓角</button>
                    <button class="image-preset-btn" onclick="applyImagePreset('circular')">⭕ 圓形</button>
                    <button class="image-preset-btn" onclick="applyImagePreset('vintage')">📷 復古</button>
                    <button class="image-preset-btn" onclick="applyImagePreset('bright')">✨ 鮮豔</button>
                    <button class="image-preset-btn" onclick="applyImagePreset('soft')">🌸 柔和</button>
                </div>
            </div>
        </div>
    `;
    
    bindMultiImageControlEvents();
    updateFilterPreview();
}

function bindMultiImageControlEvents() {
    bindImageSlider('image-offsetX', 'offsetX', 'px');
    bindImageSlider('image-offsetY', 'offsetY', 'px');
    bindImageSlider('image-width', 'width', 'px');
    bindImageSlider('image-height', 'height', 'px');
    bindImageSlider('image-scale', 'scale', '%', null, (val) => Math.round(val * 100));
    bindImageSlider('image-borderRadius', 'borderRadius', 'px');
    bindImageSlider('image-opacity', 'opacity', '%', null, null, (val) => val / 100);
    bindImageSlider('image-blur', 'blur', 'px', updateFilterPreview);
    bindImageSlider('image-brightness', 'brightness', '%', updateFilterPreview);
    bindImageSlider('image-contrast', 'contrast', '%', updateFilterPreview);
    bindImageSlider('image-saturation', 'saturation', '%', updateFilterPreview);
}

function bindImageSlider(elementId, property, unit, callback, displayTransform, valueTransform) {
    const slider = document.getElementById(elementId);
    if (!slider) return;
    
    slider.addEventListener('input', function() {
        const template = getSelectedTemplate();
        let value = parseFloat(this.value);
        
        if (valueTransform) {
            value = valueTransform(value);
        }
        
        multiImageSettings[`template${template}`][currentImageIndex][property] = value;
        
        let displayValue = displayTransform ? displayTransform(value) : value;
        this.nextElementSibling.textContent = displayValue + unit;
        
        if (callback) callback();
        
        if (uploadedImages.length > 0 && isGenerated) {
            generateImage();
        }
    });
}

function updateFilterPreview() {
    const template = getSelectedTemplate();
    const settings = multiImageSettings[`template${template}`][currentImageIndex];
    const preview = document.getElementById('filter-preview');
    
    if (preview && settings) {
        preview.style.setProperty('--brightness', settings.brightness + '%');
        preview.style.setProperty('--contrast', settings.contrast + '%');
        preview.style.setProperty('--saturation', settings.saturation + '%');
        preview.style.setProperty('--blur', settings.blur + 'px');
        preview.style.setProperty('--opacity', settings.opacity);
    }
}

window.applyImagePreset = function(presetName) {
    if (uploadedImages.length === 0) return;
    
    const template = getSelectedTemplate();
    const presets = {
        default: {
            borderRadius: template === 'template1' ? 0 : 20,
            opacity: 1,
            blur: 0,
            brightness: 100,
            contrast: 100,
            saturation: 100,
            scale: 1
        },
        rounded: {
            borderRadius: 25,
            opacity: 1,
            blur: 0,
            brightness: 100,
            contrast: 100,
            saturation: 100,
            scale: 1
        },
        circular: {
            borderRadius: 100,
            opacity: 1,
            blur: 0,
            brightness: 100,
            contrast: 100,
            saturation: 100,
            scale: 1
        },
        vintage: {
            borderRadius: template === 'template1' ? 5 : 20,
            opacity: 0.9,
            blur: 1,
            brightness: 85,
            contrast: 120,
            saturation: 60,
            scale: 1
        },
        bright: {
            borderRadius: template === 'template1' ? 8 : 25,
            opacity: 1,
            blur: 0,
            brightness: 130,
            contrast: 120,
            saturation: 140,
            scale: 1
        },
        soft: {
            borderRadius: template === 'template1' ? 15 : 30,
            opacity: 0.95,
            blur: 2,
            brightness: 110,
            contrast: 90,
            saturation: 80,
            scale: 1
        }
    };
    
    if (presets[presetName]) {
        Object.assign(multiImageSettings[`template${template}`][currentImageIndex], presets[presetName]);
        updateMultiImageControls();
        
        if (uploadedImages.length > 0 && isGenerated) {
            generateImage();
        }
        
        console.log(`🎨 對圖片 ${currentImageIndex} 應用預設: ${presetName}`);
    }
};

// 🔧 新增：處理原有圖片上傳（兼容性）
function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('請選擇圖片檔案！');
        return;
    }
    
    console.log('📁 開始處理原有圖片上傳...', file.name);
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            // 清空現有圖片，只保留新上傳的
            uploadedImages = [];
            multiImageSettings.template1 = [];
            multiImageSettings.template2 = [];
            imageLayerOrder = [];
            currentImageIndex = 0;
            
            const imageIndex = addNewImage(img, file.name);
            
            showImagePreview(e.target.result);
            document.getElementById('generate-btn').disabled = false;
            
            updateImageGallery();
            updateMultiImageControls();
            updateImageCountInfo();
            
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
            <p style="margin-top: 8px; font-size: 12px; color: #666;">最新上傳圖片預覽</p>
        `;
    }
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
        .format-checkboxes {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            font-size: 13px;
            color: #333;
        }
        .checkbox-item input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: #667eea;
        }
        .checkbox-item span {
            user-select: none;
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
            </select>
        </div>
        
        <div class="control-group">
            <label>字體系列</label>
            <select id="fontFamily-${textType}">
                ${getAllAvailableFonts().map(font => 
                    `<option value="${font.value}" ${currentStyle.fontFamily === font.value ? 'selected' : ''}>${font.display}</option>`
                ).join('')}
            </select>
        </div>
        
        <div class="control-group">
            <label>文字格式</label>
            <div class="format-checkboxes">
                <label class="checkbox-item">
                    <input type="checkbox" id="italic-${textType}" ${currentStyle.italic ? 'checked' : ''}>
                    <span>斜體</span>
                </label>
                <label class="checkbox-item">
                    <input type="checkbox" id="underline-${textType}" ${currentStyle.underline ? 'checked' : ''}>
                    <span>底線</span>
                </label>
                <label class="checkbox-item">
                    <input type="checkbox" id="strikethrough-${textType}" ${currentStyle.strikethrough ? 'checked' : ''}>
                    <span>刪除線</span>
                </label>
            </div>
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
            if (uploadedImages.length > 0 && isGenerated) {
                generateImage();
            }
        });
    }
    
    const fontColorInput = document.getElementById(`fontColor-${textType}`);
    if (fontColorInput) {
        fontColorInput.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].color = this.value;
            if (uploadedImages.length > 0 && isGenerated) {
                generateImage();
            }
        });
    }
    
    const fontWeightSelect = document.getElementById(`fontWeight-${textType}`);
    if (fontWeightSelect) {
        fontWeightSelect.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].fontWeight = this.value;
            if (uploadedImages.length > 0 && isGenerated) {
                generateImage();
            }
        });
    }
    
    const fontFamilySelect = document.getElementById(`fontFamily-${textType}`);
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].fontFamily = this.value;
            if (uploadedImages.length > 0 && isGenerated) {
                generateImage();
            }
        });
    }
    
    // 格式化選項控制
    const italicCheckbox = document.getElementById(`italic-${textType}`);
    if (italicCheckbox) {
        italicCheckbox.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].italic = this.checked;
            console.log(`📝 ${textType} 斜體: ${this.checked}`);
            if (uploadedImages.length > 0 && isGenerated) {
                generateImage();
            }
        });
    }
    
    const underlineCheckbox = document.getElementById(`underline-${textType}`);
    if (underlineCheckbox) {
        underlineCheckbox.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].underline = this.checked;
            console.log(`📝 ${textType} 底線: ${this.checked}`);
            if (uploadedImages.length > 0 && isGenerated) {
                generateImage();
            }
        });
    }
    
    const strikethroughCheckbox = document.getElementById(`strikethrough-${textType}`);
    if (strikethroughCheckbox) {
        strikethroughCheckbox.addEventListener('change', function() {
            userTextStyles[`template${template}`][textType].strikethrough = this.checked;
            console.log(`📝 ${textType} 刪除線: ${this.checked}`);
            if (uploadedImages.length > 0 && isGenerated) {
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
            if (uploadedImages.length > 0 && isGenerated) {
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
            if (uploadedImages.length > 0 && isGenerated) {
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
            if (uploadedImages.length > 0 && isGenerated) {
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
            if (uploadedImages.length > 0 && isGenerated) {
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
            if (uploadedImages.length > 0 && isGenerated) {
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
            if (uploadedImages.length > 0 && isGenerated) {
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
                    if (uploadedImages.length > 0 && isGenerated) {
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
            if (uploadedImages.length > 0 && isGenerated) {
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
    
    textOffsets[`template${template}`][textType] = { ...ORIGINAL_OFFSETS[`template${template}`][textType] };
    
    const originalOffset = ORIGINAL_OFFSETS[`template${template}`][textType];
    const posXInput = document.getElementById(`posX-${textType}`);
    const posYInput = document.getElementById(`posY-${textType}`);
    if (posXInput) posXInput.value = originalOffset.x;
    if (posYInput) posYInput.value = originalOffset.y;
    
    updateStatusDisplay(textType);
    console.log(`🔄 重置 ${textType} 位置到原始預設: (${originalOffset.x}, ${originalOffset.y})`);
    
    if (uploadedImages.length > 0 && isGenerated) {
        generateImage();
    }
};

// 全局函數：重置文字框尺寸
window.resetTextSize = function(textType) {
    const template = getSelectedTemplate();
    
    const originalStyle = ORIGINAL_DEFAULTS[`template${template}`][textType];
    userTextStyles[`template${template}`][textType].width = originalStyle.width;
    userTextStyles[`template${template}`][textType].height = originalStyle.height;
    
    const textWidthInput = document.getElementById(`textWidth-${textType}`);
    const textHeightInput = document.getElementById(`textHeight-${textType}`);
    if (textWidthInput) textWidthInput.value = originalStyle.width;
    if (textHeightInput) textHeightInput.value = originalStyle.height;
    
    updateStatusDisplay(textType);
    console.log(`🔄 重置 ${textType} 尺寸到原始預設: ${originalStyle.width}×${originalStyle.height}`);
    
    if (uploadedImages.length > 0 && isGenerated) {
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
            lineHeight: 1.5,
            italic: false,
            underline: false,
            strikethrough: false
        },
        modern: {
            fontSize: textType === 'title' ? 48 : textType === 'subtitle' ? 26 : 18,
            fontFamily: 'Arial',
            color: baseColors[textType],
            fontWeight: 'bold',
            letterSpacing: 0,
            lineHeight: 1.3,
            italic: false,
            underline: false,
            strikethrough: false
        },
        classic: {
            fontSize: textType === 'title' ? 36 : textType === 'subtitle' ? 20 : 16,
            fontFamily: 'Microsoft JhengHei',
            color: baseColors[textType],
            fontWeight: 'normal',
            letterSpacing: 0.5,
            lineHeight: 1.4,
            italic: false,
            underline: false,
            strikethrough: false
        },
        bold: {
            fontSize: textType === 'title' ? 56 : textType === 'subtitle' ? 32 : 20,
            fontFamily: 'Noto Sans TC',
            color: baseColors[textType],
            fontWeight: 'bold',
            letterSpacing: 2,
            lineHeight: 1.2,
            italic: false,
            underline: false,
            strikethrough: false
        }
    };
    
    if (presets[presetName]) {
        const currentStyle = userTextStyles[`template${template}`][textType];
        Object.assign(currentStyle, presets[presetName]);
        
        updateStyleControls(textType);
        if (uploadedImages.length > 0 && isGenerated) {
            generateImage();
        }
    }
};

window.resetTextStyle = function(textType) {
    const template = getSelectedTemplate();
    
    userTextStyles[`template${template}`][textType] = JSON.parse(JSON.stringify(ORIGINAL_DEFAULTS[`template${template}`][textType]));
    textOffsets[`template${template}`][textType] = { ...ORIGINAL_OFFSETS[`template${template}`][textType] };
    
    updateStyleControls(textType);
    if (uploadedImages.length > 0 && isGenerated) {
        generateImage();
    }
    
    const originalStyle = ORIGINAL_DEFAULTS[`template${template}`][textType];
    const originalOffset = ORIGINAL_OFFSETS[`template${template}`][textType];
    
    console.log(`🔄 重置 ${textType} 到原始預設 - 字體:${originalStyle.fontSize}px, 位置:(${originalOffset.x}, ${originalOffset.y})`);
};

// 🔧 修正：設定拖曳系統（修正縮放邏輯）
function setupDragSystem() {
    console.log('🖱️ 設定多圖片拖曳系統（修正縮放邏輯）...');
    
    canvas.addEventListener('mousedown', handleDragStart);
    canvas.addEventListener('mousemove', handleDragMove);
    canvas.addEventListener('mouseup', handleDragEnd);
    canvas.addEventListener('mouseleave', handleDragEnd);
    
    // 🔧 修正：手機版觸控事件
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleDragEnd, { passive: false });
    
    // 🔧 修正：滾輪縮放事件
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    console.log('✅ 多圖片拖曳系統設定完成（修正縮放邏輯）');
}

// 添加控制按鈕
function addControlButtons() {
    const actionButtons = document.querySelector('.action-buttons');
    if (!actionButtons) return;
    
    if (!document.getElementById('reset-image-btn')) {
        const resetImageBtn = document.createElement('button');
        resetImageBtn.className = 'btn';
        resetImageBtn.innerHTML = '🖼️ 重置當前圖片';
        resetImageBtn.onclick = resetCurrentImage; // 🔧 修正：重置當前圖片
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
    
    // 🔧 新增：多圖片控制按鈕
    if (!document.getElementById('clear-all-images-btn')) {
        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'btn';
        clearAllBtn.innerHTML = '🗑️ 清空所有圖片';
        clearAllBtn.onclick = clearAllImages;
        clearAllBtn.style.background = '#dc3545';
        clearAllBtn.style.color = 'white';
        clearAllBtn.style.marginLeft = '10px';
        clearAllBtn.disabled = true;
        clearAllBtn.id = 'clear-all-images-btn';
        actionButtons.appendChild(clearAllBtn);
    }
    
    console.log('✅ 控制按鈕已添加（含多圖片功能）');
}

// 🔧 新增：重置當前圖片
window.resetCurrentImage = function() {
    if (uploadedImages.length === 0) return;
    
    const template = getSelectedTemplate();
    const currentSettings = multiImageSettings[`template${template}`][currentImageIndex];
    
    // 重置為模板預設值
    const defaultSettings = createImageSettings(`template${template}`);
    Object.assign(currentSettings, defaultSettings);
    
    updateMultiImageControls();
    
    console.log(`🔄 重置當前圖片 ${currentImageIndex} 到預設值`);
    
    if (isGenerated) {
        generateImage();
    }
};

// 🔧 新增：清空所有圖片
window.clearAllImages = function() {
    if (uploadedImages.length === 0) return;
    
    if (confirm(`確定要清空所有 ${uploadedImages.length} 張圖片嗎？`)) {
        uploadedImages = [];
        multiImageSettings.template1 = [];
        multiImageSettings.template2 = [];
        imageLayerOrder = [];
        currentImageIndex = 0;
        
        document.getElementById('generate-btn').disabled = true;
        document.getElementById('clear-all-images-btn').disabled = true;
        document.getElementById('reset-image-btn').disabled = true;
        
        updateImageGallery();
        updateMultiImageControls();
        updateImageCountInfo();
        
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">尚未上傳圖片</p>';
        }
        
        clearCanvas();
        isGenerated = false;
        
        console.log('🗑️ 已清空所有圖片');
    }
};

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

// 🔧 修改：檢測點擊區域類型（支援多圖片）
function detectClickArea(x, y) {
    if (!isGenerated) return null;
    
    // 檢查多張圖片（按層級從高到低檢查）
    if (uploadedImages.length > 0) {
        const template = getSelectedTemplate();
        
        // 按zIndex排序，從高到低檢查
        const sortedImages = uploadedImages
            .map((img, index) => ({ index, settings: multiImageSettings[`template${template}`][index] }))
            .filter(item => item.settings.visible)
            .sort((a, b) => b.settings.zIndex - a.settings.zIndex);
        
        for (const { index, settings } of sortedImages) {
            const imageArea = {
                x: settings.offsetX,
                y: settings.offsetY,
                width: settings.width,
                height: settings.height
            };
            
            if (x >= imageArea.x && x <= imageArea.x + imageArea.width &&
                y >= imageArea.y && y <= imageArea.y + imageArea.height) {
                currentImageIndex = index; // 設定為當前圖片
                return 'image';
            }
        }
    }
    
    // 檢查文字區域
    const template = getSelectedTemplate();
    const specs = DESIGN_SPECS[`template${template}`];
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
    
    if (clickArea === 'image') {
        updateImageGallery(); // 更新圖片庫顯示當前選中
        updateMultiImageControls(); // 更新控制面板
        console.log(`🖱️ 開始拖曳圖片 ${currentImageIndex}: ${uploadedImages[currentImageIndex].fileName}`);
    } else {
        console.log(`🖱️ 開始拖曳文字: ${clickArea}`);
    }
    
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
        // 🔧 修改：拖曳當前選中的圖片
        const template = getSelectedTemplate();
        const settings = multiImageSettings[`template${template}`][currentImageIndex];
        
        settings.offsetX += deltaX;
        settings.offsetY += deltaY;
        
        console.log(`🖼️ 圖片${currentImageIndex}拖曳: (${settings.offsetX.toFixed(0)}, ${settings.offsetY.toFixed(0)})`);
        
        // 同步更新控制面板
        const offsetXInput = document.getElementById('image-offsetX');
        const offsetYInput = document.getElementById('image-offsetY');
        if (offsetXInput) {
            offsetXInput.value = settings.offsetX;
            offsetXInput.nextElementSibling.textContent = settings.offsetX + 'px';
        }
        if (offsetYInput) {
            offsetYInput.value = settings.offsetY;
            offsetYInput.nextElementSibling.textContent = settings.offsetY + 'px';
        }
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
        
        updateStatusDisplay(dragType);
        
        console.log(`📝 ${dragType}拖曳: offset(${newX.toFixed(0)}, ${newY.toFixed(0)}) [多圖片版]`);
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
        console.log('✅ 停止拖曳 [多圖片版]');
    }
}

// 🔧 修正：處理觸控開始（手機版優化）
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartTime = Date.now();
        
        // 防止頁面滾動
        e.preventDefault();
        e.stopPropagation();
        
        handleDragStart(touch);
    }
}

// 🔧 修正：處理觸控移動（手機版優化）
function handleTouchMove(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        
        // 防止頁面滾動
        e.preventDefault();
        e.stopPropagation();
        
        handleDragMove(touch);
    }
}

// 🔧 修正：處理滾輪縮放（僅縮放當前選中圖片）
function handleWheel(e) {
    if (!isGenerated || uploadedImages.length === 0) return;
    
    const pos = getCanvasPosition(e);
    const clickArea = detectClickArea(pos.x, pos.y);
    
    if (clickArea === 'image') {
        e.preventDefault();
        e.stopPropagation(); // 防止頁面滾動
        
        const template = getSelectedTemplate();
        const settings = multiImageSettings[`template${template}`][currentImageIndex];
        
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = settings.scale * scaleFactor;
        
        if (newScale >= 0.1 && newScale <= 5) {
            settings.scale = newScale;
            
            // 同步更新控制面板
            const scaleInput = document.getElementById('image-scale');
            if (scaleInput) {
                scaleInput.value = newScale;
                scaleInput.nextElementSibling.textContent = Math.round(newScale * 100) + '%';
            }
            
            generateImage();
            console.log(`🔍 圖片${currentImageIndex}縮放: ${Math.round(newScale * 100)}%`);
        }
    }
}

function resetTextPositions() {
    const template = getSelectedTemplate();
    
    textOffsets[`template${template}`] = JSON.parse(JSON.stringify(ORIGINAL_OFFSETS[`template${template}`]));
    
    ['title', 'subtitle', 'description'].forEach(textType => {
        const originalOffset = ORIGINAL_OFFSETS[`template${template}`][textType];
        const posXInput = document.getElementById(`posX-${textType}`);
        const posYInput = document.getElementById(`posY-${textType}`);
        if (posXInput) posXInput.value = originalOffset.x;
        if (posYInput) posYInput.value = originalOffset.y;
        
        updateStatusDisplay(textType);
    });
    
    console.log('🔄 重置所有文字位置到原始預設 [多圖片版]');
    
    if (uploadedImages.length > 0 && isGenerated) {
        generateImage();
    }
}

// 取得選中的模板
function getSelectedTemplate() {
    const selectedTemplate = document.querySelector('input[name="template"]:checked');
    return selectedTemplate ? selectedTemplate.value : '1';
}

// 🔧 修改：生成圖片（支援多圖片）
function generateImage() {
    if (uploadedImages.length === 0) {
        alert('請先上傳圖片！');
        return;
    }
    
    const template = getSelectedTemplate();
    console.log(`🎨 開始生成模板${template}（多圖片版，共${uploadedImages.length}張圖片）...`);
    
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

// 🔧 修改：完整繪製圖片（支援多圖片）
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
    
    // 🔧 新增：按層級繪製所有圖片
    if (uploadedImages.length > 0) {
        drawAllImages(template);
    }
    
    // 繪製文字
    if (template === '1') {
        drawTemplate1CleanText(title, subtitle, description);
    } else {
        drawTemplate2CleanText(title, subtitle, description);
    }
    
    isGenerated = true;
    document.getElementById('download-btn').disabled = false;
    
    const resetImageBtn = document.getElementById('reset-image-btn');
    const resetTextBtn = document.getElementById('reset-text-btn');
    const clearAllBtn = document.getElementById('clear-all-images-btn');
    if (resetImageBtn) resetImageBtn.disabled = false;
    if (resetTextBtn) resetTextBtn.disabled = false;
    if (clearAllBtn) clearAllBtn.disabled = false;
    
    console.log(`✅ 模板${template}生成完成（多圖片版，包含${uploadedImages.length}張圖片）`);
}

// 🔧 新增：繪製所有圖片
function drawAllImages(template) {
    if (uploadedImages.length === 0) return;
    
    // 按zIndex排序，從低到高繪製
    const sortedImages = uploadedImages
        .map((img, index) => ({ index, img, settings: multiImageSettings[`template${template}`][index] }))
        .filter(item => item.settings.visible)
        .sort((a, b) => a.settings.zIndex - b.settings.zIndex);
    
    console.log(`🖼️ 繪製 ${sortedImages.length} 張可見圖片（按層級排序）`);
    
    sortedImages.forEach(({ index, img, settings }) => {
        drawSingleImage(img.element, settings, index);
    });
}

// 🔧 修正：繪製單張圖片（修正縮放邏輯）
function drawSingleImage(imageElement, settings, imageIndex) {
    const imageArea = {
        x: settings.offsetX,
        y: settings.offsetY,
        width: settings.width,
        height: settings.height
    };
    
    ctx.save();
    
    // 應用濾鏡
    ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) blur(${settings.blur}px)`;
    ctx.globalAlpha = settings.opacity;
    
    // 圓角裁切
    if (settings.borderRadius > 0) {
        drawRoundedRect(ctx, imageArea.x, imageArea.y, imageArea.width, imageArea.height, settings.borderRadius, false, false);
        ctx.clip();
    } else {
        ctx.beginPath();
        ctx.rect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
        ctx.clip();
    }
    
    const imgRatio = imageElement.width / imageElement.height;
    const areaRatio = imageArea.width / imageArea.height;
    
    let baseWidth, baseHeight;
    
    if (imgRatio > areaRatio) {
        baseHeight = imageArea.height;
        baseWidth = imageArea.height * imgRatio;
    } else {
        baseWidth = imageArea.width;
        baseHeight = imageArea.width / imgRatio;
    }
    
    // 🔧 修正：只使用當前圖片的縮放設定，不使用全域縮放
    const scaledWidth = baseWidth * settings.scale;
    const scaledHeight = baseHeight * settings.scale;
    
    const centerX = imageArea.x + (imageArea.width - scaledWidth) / 2;
    const centerY = imageArea.y + (imageArea.height - scaledHeight) / 2;
    
    // 🔧 修正：不使用全域偏移，只使用設定中的偏移
    const drawX = centerX;
    const drawY = centerY;
    
    ctx.drawImage(imageElement, drawX, drawY, scaledWidth, scaledHeight);
    
    ctx.restore();
    
    // 拖曳提示邊框
    if (isDragging && dragType === 'image' && imageIndex === currentImageIndex) {
        ctx.strokeStyle = imageIndex === currentImageIndex ? '#28a745' : '#007bff';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        if (settings.borderRadius > 0) {
            drawRoundedRect(ctx, imageArea.x, imageArea.y, imageArea.width, imageArea.height, settings.borderRadius, false, true);
        } else {
            ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
        }
        ctx.setLineDash([]);
    }
    
    console.log(`📏 圖片${imageIndex} - 區域:${imageArea.width}×${imageArea.height}, 縮放:${Math.round(settings.scale*100)}%, 層級:${settings.zIndex}`);
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
    const fontStyle = userStyle.italic ? 'italic' : 'normal';
    ctx.font = `${fontStyle} ${userStyle.fontWeight} ${userStyle.fontSize}px "${userStyle.fontFamily}"`;
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
            
            // 繪製底線
            if (userStyle.underline) {
                const metrics = ctx.measureText(line);
                const underlineY = textY + userStyle.fontSize * 0.1;
                const startX = area.centerAlign ? textX - metrics.width / 2 : textX;
                ctx.save();
                ctx.strokeStyle = userStyle.color;
                ctx.lineWidth = Math.max(1, userStyle.fontSize * 0.05);
                ctx.beginPath();
                ctx.moveTo(startX, underlineY);
                ctx.lineTo(startX + metrics.width, underlineY);
                ctx.stroke();
                ctx.restore();
            }
            
            // 繪製刪除線
            if (userStyle.strikethrough) {
                const metrics = ctx.measureText(line);
                const strikethroughY = textY - userStyle.fontSize * 0.3;
                const startX = area.centerAlign ? textX - metrics.width / 2 : textX;
                ctx.save();
                ctx.strokeStyle = userStyle.color;
                ctx.lineWidth = Math.max(1, userStyle.fontSize * 0.05);
                ctx.beginPath();
                ctx.moveTo(startX, strikethroughY);
                ctx.lineTo(startX + metrics.width, strikethroughY);
                ctx.stroke();
                ctx.restore();
            }
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
    
    console.log(`📝 ${textType}文字 - 位置:(${drawX.toFixed(0)},${drawY.toFixed(0)}) 尺寸:${userStyle.width}×${userStyle.height} [多圖片版+修正縮放]`);
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
        setTimeout(() => {
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const template = getSelectedTemplate();
            
            if (!canvas || !ctx) {
                console.error('❌ Canvas 或 Context 不存在');
                alert('Canvas 錯誤，請重新生成圖片！');
                return;
            }
            
            const dataURL = canvas.toDataURL('image/png', 1.0);
            
            if (!dataURL || dataURL === 'data:,') {
                console.error('❌ Canvas 內容為空');
                alert('圖片內容為空，請重新生成！');
                return;
            }
            
            link.download = `圖片生成器_模板${template}_多圖片版_修正版_${uploadedImages.length}張_${timestamp}.png`;
            link.href = dataURL;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ 下載完成: 模板${template}（多圖片版+修正版，${uploadedImages.length}張圖片）- 用戶: ${getCurrentUserLogin()} - 時間: ${getCurrentDateTime()}`);
            
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
            successMsg.textContent = `✅ 多圖片版下載成功！包含${uploadedImages.length}張圖片`;
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

// 獲取當前用戶登入
function getCurrentUserLogin() {
    return 'tonyonier99';
}

// 獲取當前日期時間
function getCurrentDateTime() {
    return '2025-07-20 14:04:15';
}

// 確保所有全局函數都已定義
console.log('🎉 多圖片版圖片生成器載入完成 - 修正縮放邏輯+手機版優化+自動字體檢測');
console.log('📅 版本時間: 2025-07-20 09:19:58');
console.log('👤 用戶: tonyonier99');
console.log('✨ 功能特色:');
console.log('   - 模板二移除色塊，圖片延伸至480px高度');
console.log('   - 控制面板預設收合');
console.log('   - 修復下載功能，增加錯誤處理');
console.log('   - 移除所有預覽虛線');
console.log('   - 支援完整文字間距、行距、尺寸控制');
console.log('   - 全拖曳支援，XY軸無限制');
console.log('   - 🔧 修正：模板二預設值正確載入');
console.log('   - 🔧 修正：重置功能使用原始預設值');
console.log('   - 🔧 修正：新增設定驗證功能');
console.log('   - 🆕 新增：多張圖片上傳管理');
console.log('   - 🆕 新增：圖片縮圖庫與視覺化管理');
console.log('   - 🆕 新增：每張圖片獨立控制面板');
console.log('   - 🆕 新增：圖片層級管理（Z-Index）');
console.log('   - 🆕 新增：圖片顯示/隱藏切換');
console.log('   - 🆕 新增：圖片刪除與清空功能');
console.log('   - 🔧 修正：圖片縮放邏輯，每張圖片獨立縮放');
console.log('   - 🔧 修正：拖曳時自動切換當前圖片');
console.log('   - 📱 新增：手機版優化，防止滾動衝突');
console.log('   - 📱 新增：響應式設計，適應不同螢幕');
console.log('   - 🔧 修正：滾輪縮放只影響當前選中圖片');
console.log('   - 🔧 修正：移除全域圖片偏移，改為獨立管理');
console.log('   - 🆕 新增：自動字體檢測與載入系統');
console.log('   - 🆕 新增：智能字體命名轉換（ChenYuluoyan → 晨雨洛雁）');
console.log('   - 🔧 修正：移除字體管理 UI，改為自動檢測');
console.log('   - 🆕 新增：fonts/ 資料夾自動掃描支援');
console.log(`\n🎯 模板二預設設定：`);
console.log(`   標題：73px，位置偏移(-50, -190)，寬度700px`);
console.log(`   副標題：28px，thin字重，位置偏移(0, -113)`);
console.log(`   描述：20px，thin字重，字元間距3px，位置偏移(0, -82)`);
console.log(`\n🖼️ 多圖片控制功能（修正版）：`);
console.log(`   📁 支援多張圖片同時上傳`);
console.log(`   📱 視覺化圖片縮圖庫管理`);
console.log(`   🎯 點擊切換當前調整圖片`);
console.log(`   👁️ 每張圖片可獨立顯示/隱藏`);
console.log(`   📚 圖片層級順序管理`);
console.log(`   🗑️ 單張刪除或全部清空`);
console.log(`   📐 每張圖片獨立位置、尺寸、濾鏡設定`);
console.log(`   🖱️ 拖曳圖片時自動選中並更新控制面板`);
console.log(`   🔍 滾輪縮放只影響當前選中圖片（已修正）`);
console.log(`   ⚡ 快速預設樣式套用到當前圖片`);
console.log(`   📱 手機版觸控優化，防止頁面滾動`);
console.log(`\n📊 支援範圍：`);
console.log(`   位置調整：X/Y軸 -400~400px`);
console.log(`   尺寸調整：寬度50~1200px，高度50~1000px`);
console.log(`   縮放比例：10%~500%（每張圖片獨立）`);
console.log(`   圓角半徑：0~100px`);
console.log(`   透明度：5%~100%`);
console.log(`   模糊效果：0~20px`);
console.log(`   色彩調整：亮度20%~300%，對比度20%~300%，飽和度0%~400%`);
console.log(`   層級管理：1~圖片總數`);
console.log(`\n🔤 自動字體檢測系統：`);
console.log(`   🔍 自動掃描 fonts/ 資料夾`);
console.log(`   ✨ 智能字體命名轉換`);
console.log(`   📄 支援 TTF、OTF、WOFF、WOFF2 格式`);
console.log(`   🎯 特殊處理：ChenYuluoyan-2.0-Thin.ttf → 晨雨洛雁 2.0 極細體`);
console.log(`   🚫 移除手動重新檢測功能（改為自動檢測）`);
console.log(`   📊 字體狀態實時顯示`);
console.log(`   🎨 與現有控制面板完美整合`);
console.log(`\n📱 手機版優化：`);
console.log(`   防止雙擊縮放`);
console.log(`   防止頁面滾動衝突`);
console.log(`   觸控事件優化`);
console.log(`   響應式界面設計`);
console.log(`   適應不同螢幕尺寸`);
