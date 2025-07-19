// 全域變數
let canvas, ctx;
let uploadedImage = null;
let isGenerated = false;

// 設計規格 - 基於你的AI檔案
const DESIGN_SPECS = {
    canvas: {
        width: 800,
        height: 1120
    },
    
    template1: {
        // 圖片區域 - 精確位置（基於你的設計稿）
        imageArea: {
            x: 54,
            y: 54,
            width: 692,
            height: 462
        },
        // 垂直裝飾線
        decorLine: {
            x: 54,
            y: 546,
            width: 6,
            height: 120,
            color: '#8B4513'
        },
        // 文字區域
        textArea: {
            x: 80,
            y: 546,
            maxWidth: 640,
            maxHeight: 500
        },
        // 標題樣式
        titleStyle: {
            baseFontSize: 48,
            minFontSize: 32,
            maxFontSize: 58,
            fontWeight: 'bold',
            color: '#2c3e50',
            lineHeight: 1.2,
            marginBottom: 20
        },
        // 副標題樣式
        subtitleStyle: {
            baseFontSize: 24,
            minFontSize: 18,
            maxFontSize: 28,
            fontWeight: 'normal',
            color: '#7f8c8d',
            lineHeight: 1.3,
            marginBottom: 25
        },
        // 內文樣式
        descriptionStyle: {
            baseFontSize: 18,
            minFontSize: 14,
            maxFontSize: 20,
            fontWeight: 'normal',
            color: '#34495e',
            lineHeight: 1.6
        }
    },
    
    template2: {
        // 圖片區域
        imageArea: {
            x: 54,
            y: 54,
            width: 692,
            height: 462
        },
        // 標題背景條
        titleBar: {
            x: 0,
            y: 516,
            width: 800,
            height: 100,
            backgroundColor: 'rgba(185, 169, 104, 0.9)'
        },
        // 文字區域
        textArea: {
            x: 80,
            y: 636,
            maxWidth: 640,
            maxHeight: 420
        },
        // 標題樣式（在背景條中）
        titleStyle: {
            baseFontSize: 36,
            minFontSize: 28,
            maxFontSize: 42,
            fontWeight: 'bold',
            color: '#ffffff',
            lineHeight: 1.2,
            textAlign: 'center'
        },
        // 副標題樣式（在背景條中）
        subtitleStyle: {
            baseFontSize: 20,
            minFontSize: 16,
            maxFontSize: 24,
            fontWeight: 'normal',
            color: '#ffffff',
            lineHeight: 1.3,
            textAlign: 'center',
            opacity: 0.9
        },
        // 內文樣式
        descriptionStyle: {
            baseFontSize: 18,
            minFontSize: 14,
            maxFontSize: 20,
            fontWeight: 'normal',
            color: '#2c3e50',
            lineHeight: 1.6
        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
    setupEventListeners();
    console.log('智能排版系統初始化完成');
});

// 初始化 Canvas
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = DESIGN_SPECS.canvas.width;
    canvas.height = DESIGN_SPECS.canvas.height;
    
    clearCanvas();
}

// 清空 Canvas
function clearCanvas() {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#999';
    ctx.font = '24px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('請上傳圖片並點擊生成', canvas.width / 2, canvas.height / 2);
}

// 設定事件監聽器
function setupEventListeners() {
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    document.getElementById('generate-btn').addEventListener('click', generateImage);
    document.getElementById('download-btn').addEventListener('click', downloadImage);
    
    const templateInputs = document.querySelectorAll('input[name="template"]');
    templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    });
    
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
}

// 處理圖片上傳
function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('請選擇圖片檔案！');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            uploadedImage = img;
            showImagePreview(e.target.result);
            document.getElementById('generate-btn').disabled = false;
            console.log('圖片上傳成功');
        };
        
        img.onerror = function() {
            alert('圖片載入失敗，請重新選擇！');
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// 顯示圖片預覽
function showImagePreview(src) {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = `<img src="${src}" alt="預覽圖片">`;
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
    const title = document.getElementById('title').value.trim();
    const subtitle = document.getElementById('subtitle').value.trim();
    const description = document.getElementById('description').value.trim();
    
    // 根據模板選擇對應的底圖
    const backgroundImg = new Image();
    const bgImagePath = template === '1' ? 'bg-template1.png' : 'bg-template2.png';
    
    backgroundImg.onload = function() {
        // 清空 canvas 並繪製底圖
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        
        // 繪製用戶上傳的圖片（智能裁切）
        drawSmartCroppedImage(template);
        
        // 根據模板繪製智能文字
        if (template === '1') {
            drawTemplate1SmartText(title, subtitle, description);
        } else {
            drawTemplate2SmartText(title, subtitle, description);
        }
        
        isGenerated = true;
        document.getElementById('download-btn').disabled = false;
        console.log(`智能排版模板 ${template} 生成完成`);
    };
    
    backgroundImg.onerror = function() {
        console.warn(`底圖 ${bgImagePath} 載入失敗，使用預設背景`);
        
        // 使用預設背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawSmartCroppedImage(template);
        
        if (template === '1') {
            drawTemplate1SmartText(title, subtitle, description);
        } else {
            drawTemplate2SmartText(title, subtitle, description);
        }
        
        isGenerated = true;
        document.getElementById('download-btn').disabled = false;
    };
    
    backgroundImg.src = bgImagePath;
}

// 智能圖片裁切和放置
function drawSmartCroppedImage(template) {
    const specs = DESIGN_SPECS[`template${template}`];
    const imageArea = specs.imageArea;
    
    // 計算圖片縮放比例（cover 模式 - 填滿區域，可能裁切）
    const imgRatio = uploadedImage.width / uploadedImage.height;
    const areaRatio = imageArea.width / imageArea.height;
    
    let sourceX, sourceY, sourceWidth, sourceHeight;
    
    if (imgRatio > areaRatio) {
        // 圖片比較寬，以高度為準，左右裁切
        sourceHeight = uploadedImage.height;
        sourceWidth = uploadedImage.height * areaRatio;
        sourceX = (uploadedImage.width - sourceWidth) / 2;
        sourceY = 0;
    } else {
        // 圖片比較高，以寬度為準，上下裁切
        sourceWidth = uploadedImage.width;
        sourceHeight = uploadedImage.width / areaRatio;
        sourceX = 0;
        sourceY = (uploadedImage.height - sourceHeight) / 2;
    }
    
    // 繪製裁切後的圖片，完全填滿指定區域
    ctx.drawImage(
        uploadedImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        imageArea.x, imageArea.y, imageArea.width, imageArea.height
    );
    
    console.log(`圖片智能裁切完成: 原始${uploadedImage.width}x${uploadedImage.height} → 裁切區域${sourceWidth.toFixed(0)}x${sourceHeight.toFixed(0)} → 顯示${imageArea.width}x${imageArea.height}`);
}

// 計算智能字體大小
function calculateSmartFontSize(text, style, maxWidth, maxLines = 999) {
    if (!text) return style.baseFontSize;
    
    const words = text.length;
    let fontSize = style.baseFontSize;
    
    // 根據文字長度調整基礎大小
    if (words > 50) {
        fontSize = Math.max(style.minFontSize, fontSize - 8);
    } else if (words > 30) {
        fontSize = Math.max(style.minFontSize, fontSize - 4);
    } else if (words > 15) {
        fontSize = Math.max(style.minFontSize, fontSize - 2);
    } else if (words < 8) {
        fontSize = Math.min(style.maxFontSize, fontSize + 4);
    }
    
    // 測試實際渲染寬度
    for (let testSize = fontSize; testSize >= style.minFontSize; testSize -= 2) {
        ctx.font = `${style.fontWeight} ${testSize}px "Noto Sans TC"`;
        const lines = wrapText(text, maxWidth);
        
        if (lines.length <= maxLines) {
            return testSize;
        }
    }
    
    return style.minFontSize;
}

// 文字換行處理
function wrapText(text, maxWidth) {
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

// 模板一智能文字繪製
function drawTemplate1SmartText(title, subtitle, description) {
    const specs = DESIGN_SPECS.template1;
    let currentY = specs.textArea.y;
    
    // 繪製垂直裝飾線
    ctx.fillStyle = specs.decorLine.color;
    ctx.fillRect(specs.decorLine.x, specs.decorLine.y, specs.decorLine.width, specs.decorLine.height);
    
    // 主標題
    if (title) {
        const titleFontSize = calculateSmartFontSize(title, specs.titleStyle, specs.textArea.maxWidth, 2);
        ctx.font = `${specs.titleStyle.fontWeight} ${titleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.titleStyle.color;
        ctx.textAlign = 'left';
        
        const titleLines = wrapText(title, specs.textArea.maxWidth);
        const titleLineHeight = titleFontSize * specs.titleStyle.lineHeight;
        
        currentY += titleLineHeight;
        titleLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, currentY + (index * titleLineHeight));
        });
        
        currentY += (titleLines.length - 1) * titleLineHeight + specs.titleStyle.marginBottom;
    }
    
    // 副標題
    if (subtitle) {
        const subtitleFontSize = calculateSmartFontSize(subtitle, specs.subtitleStyle, specs.textArea.maxWidth, 2);
        ctx.font = `${specs.subtitleStyle.fontWeight} ${subtitleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.subtitleStyle.color;
        ctx.textAlign = 'left';
        
        const subtitleLines = wrapText(subtitle, specs.textArea.maxWidth);
        const subtitleLineHeight = subtitleFontSize * specs.subtitleStyle.lineHeight;
        
        subtitleLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, currentY + (index * subtitleLineHeight));
        });
        
        currentY += (subtitleLines.length * subtitleLineHeight) + specs.subtitleStyle.marginBottom;
    }
    
    // 描述內文
    if (description) {
        const remainingHeight = specs.textArea.maxHeight - (currentY - specs.textArea.y);
        const maxDescriptionLines = Math.floor(remainingHeight / (specs.descriptionStyle.baseFontSize * specs.descriptionStyle.lineHeight));
        
        const descriptionFontSize = calculateSmartFontSize(description, specs.descriptionStyle, specs.textArea.maxWidth, maxDescriptionLines);
        ctx.font = `${specs.descriptionStyle.fontWeight} ${descriptionFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.descriptionStyle.color;
        ctx.textAlign = 'left';
        
        const descriptionLines = wrapText(description, specs.textArea.maxWidth);
        const descriptionLineHeight = descriptionFontSize * specs.descriptionStyle.lineHeight;
        
        // 只顯示能夠完整放入的行數
        const displayLines = descriptionLines.slice(0, maxDescriptionLines);
        
        displayLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, currentY + (index * descriptionLineHeight));
        });
    }
}

// 模板二智能文字繪製
function drawTemplate2SmartText(title, subtitle, description) {
    const specs = DESIGN_SPECS.template2;
    
    // 繪製標題背景條
    ctx.fillStyle = specs.titleBar.backgroundColor;
    ctx.fillRect(specs.titleBar.x, specs.titleBar.y, specs.titleBar.width, specs.titleBar.height);
    
    // 標題在背景條中的位置
    let titleBarY = specs.titleBar.y + 30;
    
    // 主標題（在背景條中）
    if (title) {
        const titleFontSize = calculateSmartFontSize(title, specs.titleStyle, specs.titleBar.width - 100, 1);
        ctx.font = `${specs.titleStyle.fontWeight} ${titleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.titleStyle.color;
        ctx.textAlign = 'center';
        
        ctx.fillText(title, specs.titleBar.width / 2, titleBarY);
        titleBarY += titleFontSize + 10;
    }
    
    // 副標題（在背景條中）
    if (subtitle) {
        const subtitleFontSize = calculateSmartFontSize(subtitle, specs.subtitleStyle, specs.titleBar.width - 100, 1);
        ctx.font = `${specs.subtitleStyle.fontWeight} ${subtitleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.subtitleStyle.color;
        ctx.globalAlpha = specs.subtitleStyle.opacity;
        ctx.textAlign = 'center';
        
        ctx.fillText(subtitle, specs.titleBar.width / 2, titleBarY);
        ctx.globalAlpha = 1.0;
    }
    
    // 描述內文（在背景條下方）
    if (description) {
        const maxDescriptionLines = Math.floor(specs.textArea.maxHeight / (specs.descriptionStyle.baseFontSize * specs.descriptionStyle.lineHeight));
        
        const descriptionFontSize = calculateSmartFontSize(description, specs.descriptionStyle, specs.textArea.maxWidth, maxDescriptionLines);
        ctx.font = `${specs.descriptionStyle.fontWeight} ${descriptionFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.descriptionStyle.color;
        ctx.textAlign = 'left';
        
        const descriptionLines = wrapText(description, specs.textArea.maxWidth);
        const descriptionLineHeight = descriptionFontSize * specs.descriptionStyle.lineHeight;
        
        // 只顯示能夠完整放入的行數
        const displayLines = descriptionLines.slice(0, maxDescriptionLines);
        
        displayLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, specs.textArea.y + ((index + 1) * descriptionLineHeight));
        });
    }
}

// 下載圖片
function downloadImage() {
    if (!isGenerated) {
        alert('請先生成圖片！');
        return;
    }
    
    try {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const template = getSelectedTemplate();
        
        link.download = `智能排版圖片_模板${template}_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('圖片下載完成');
    } catch (error) {
        console.error('下載失敗:', error);
        alert('下載失敗，請重試！');
    }
}

// 錯誤處理
window.addEventListener('error', function(e) {
    console.error('發生錯誤:', e.error);
});
