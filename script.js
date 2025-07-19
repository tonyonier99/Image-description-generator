// 全域變數
let canvas, ctx;
let uploadedImage = null;
let isGenerated = false;

// 設計規格 - 針對兩個模板的不同需求
const DESIGN_SPECS = {
    canvas: {
        width: 800,
        height: 1120
    },
    
    template1: {
        imageArea: {
            x: 54,
            y: 54,
            width: 692,
            height: 462,
            mode: 'cover',           // 智能填滿模式
            borderRadius: 0          // 無圓角
        },
        decorLine: {
            x: 54,
            y: 546,
            width: 6,
            height: 120,
            color: '#8B4513'
        },
        textArea: {
            x: 80,
            y: 546,
            maxWidth: 640,
            maxHeight: 500
        },
        titleStyle: {
            baseFontSize: 48,
            minFontSize: 32,
            maxFontSize: 58,
            fontWeight: 'bold',
            color: '#2c3e50',
            lineHeight: 1.2,
            marginBottom: 20
        },
        subtitleStyle: {
            baseFontSize: 24,
            minFontSize: 18,
            maxFontSize: 28,
            fontWeight: 'normal',
            color: '#7f8c8d',
            lineHeight: 1.3,
            marginBottom: 25
        },
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
        imageArea: {
            x: 54,
            y: 54,
            width: 692,
            height: 462,
            mode: 'contain',         // 完整顯示模式
            borderRadius: 20,        // 圓角半徑
            backgroundColor: '#f8f9fa' // 留白區域背景色
        },
        titleBar: {
            x: 0,
            y: 516,
            width: 800,
            height: 100,
            backgroundColor: 'rgba(185, 169, 104, 0.9)'
        },
        textArea: {
            x: 80,
            y: 636,
            maxWidth: 640,
            maxHeight: 420
        },
        titleStyle: {
            baseFontSize: 36,
            minFontSize: 28,
            maxFontSize: 42,
            fontWeight: 'bold',
            color: '#ffffff',
            lineHeight: 1.2,
            textAlign: 'center'
        },
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
    console.log('🎯 啟動模板專用圖片規範化系統');
    
    initializeCanvas();
    setupBasicEvents();
    
    console.log('✅ 初始化完成');
});

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

// 清空 Canvas 並顯示提示
function clearCanvas() {
    // 清空背景
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製模板一和模板二的圖片區域預覽
    drawImageAreaPreview();
    
    // 顯示提示文字
    ctx.fillStyle = '#666';
    ctx.font = '24px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('請上傳圖片並選擇模板', canvas.width / 2, canvas.height / 2 + 100);
    ctx.font = '16px "Noto Sans TC"';
    ctx.fillText('模板一：智能填滿 | 模板二：完整顯示+圓角', canvas.width / 2, canvas.height / 2 + 130);
}

// 繪製圖片區域預覽
function drawImageAreaPreview() {
    const template1Area = DESIGN_SPECS.template1.imageArea;
    const template2Area = DESIGN_SPECS.template2.imageArea;
    
    // 模板一區域預覽（直角）
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(template1Area.x, template1Area.y, template1Area.width, template1Area.height);
    
    // 模板二區域預覽（圓角）
    ctx.strokeStyle = '#28a745';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 10]);
    drawRoundedRect(ctx, template2Area.x, template2Area.y, template2Area.width, template2Area.height, template2Area.borderRadius, false, true);
    
    ctx.setLineDash([]);
    
    // 標籤
    ctx.fillStyle = '#007bff';
    ctx.font = '14px "Noto Sans TC"';
    ctx.textAlign = 'left';
    ctx.fillText('模板一：智能填滿', template1Area.x, template1Area.y - 10);
    
    ctx.fillStyle = '#28a745';
    ctx.fillText('模板二：完整顯示+圓角', template2Area.x, template2Area.y - 30);
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
    
    // 模板切換事件
    const templateInputs = document.querySelectorAll('input[name="template"]');
    templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            console.log(`🔄 切換到模板${this.value}`);
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
    
    console.log('✅ 事件監聽器設定完成');
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
            showImagePreview(e.target.result);
            document.getElementById('generate-btn').disabled = false;
            
            console.log(`✅ 圖片載入成功: ${img.width} × ${img.height}`);
            console.log(`📊 圖片比例: ${(img.width / img.height).toFixed(2)}`);
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
    console.log(`🎨 開始生成模板${template}...`);
    
    const title = document.getElementById('title').value.trim();
    const subtitle = document.getElementById('subtitle').value.trim();
    const description = document.getElementById('description').value.trim();
    
    // 嘗試載入背景圖
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
    // 清空canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製背景
    if (backgroundImg) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 根據模板選擇不同的圖片處理方式
    if (template === '1') {
        drawTemplate1Image();
        drawTemplate1Text(title, subtitle, description);
    } else {
        drawTemplate2Image();
        drawTemplate2Text(title, subtitle, description);
    }
    
    isGenerated = true;
    document.getElementById('download-btn').disabled = false;
    
    console.log(`✅ 模板${template}生成完成`);
}

// 模板一：智能填滿圖片 (Cover 模式)
function drawTemplate1Image() {
    const specs = DESIGN_SPECS.template1;
    const imageArea = specs.imageArea;
    
    console.log('🖼️ 模板一：智能填滿模式');
    
    // 保存canvas狀態
    ctx.save();
    
    // 設定裁切區域（直角）
    ctx.beginPath();
    ctx.rect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
    ctx.clip();
    
    // 計算Cover模式的尺寸和位置
    const imgRatio = uploadedImage.width / uploadedImage.height;
    const areaRatio = imageArea.width / imageArea.height;
    
    let sourceX, sourceY, sourceWidth, sourceHeight;
    
    if (imgRatio > areaRatio) {
        // 圖片比較寬，按高度縮放，裁切左右
        sourceHeight = uploadedImage.height;
        sourceWidth = uploadedImage.height * areaRatio;
        sourceX = (uploadedImage.width - sourceWidth) / 2;
        sourceY = 0;
    } else {
        // 圖片比較高，按寬度縮放，裁切上下
        sourceWidth = uploadedImage.width;
        sourceHeight = uploadedImage.width / areaRatio;
        sourceX = 0;
        sourceY = (uploadedImage.height - sourceHeight) / 2;
    }
    
    // 繪製圖片（填滿整個區域）
    ctx.drawImage(
        uploadedImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        imageArea.x, imageArea.y, imageArea.width, imageArea.height
    );
    
    // 恢復canvas狀態
    ctx.restore();
    
    // 繪製邊框
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
    
    console.log(`📏 Cover模式 - 原圖:${uploadedImage.width}×${uploadedImage.height} → 裁切:${sourceWidth.toFixed(0)}×${sourceHeight.toFixed(0)} → 顯示:${imageArea.width}×${imageArea.height}`);
}

// 模板二：完整顯示圓角圖片 (Contain 模式)
function drawTemplate2Image() {
    const specs = DESIGN_SPECS.template2;
    const imageArea = specs.imageArea;
    
    console.log('🖼️ 模板二：完整顯示+圓角模式');
    
    // 保存canvas狀態
    ctx.save();
    
    // 計算Contain模式的尺寸和位置
    const imgRatio = uploadedImage.width / uploadedImage.height;
    const areaRatio = imageArea.width / imageArea.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgRatio > areaRatio) {
        // 圖片比較寬，以寬度為準
        drawWidth = imageArea.width;
        drawHeight = imageArea.width / imgRatio;
        drawX = imageArea.x;
        drawY = imageArea.y + (imageArea.height - drawHeight) / 2;
    } else {
        // 圖片比較高，以高度為準
        drawHeight = imageArea.height;
        drawWidth = imageArea.height * imgRatio;
        drawX = imageArea.x + (imageArea.width - drawWidth) / 2;
        drawY = imageArea.y;
    }
    
    // 先填充背景色（圓角區域）
    ctx.fillStyle = imageArea.backgroundColor;
    drawRoundedRect(ctx, imageArea.x, imageArea.y, imageArea.width, imageArea.height, imageArea.borderRadius, true, false);
    
    // 設定圓角裁切路徑
    drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, imageArea.borderRadius, false, false);
    ctx.clip();
    
    // 繪製圖片
    ctx.drawImage(uploadedImage, drawX, drawY, drawWidth, drawHeight);
    
    // 恢復canvas狀態
    ctx.restore();
    
    // 繪製圓角邊框
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, imageArea.x, imageArea.y, imageArea.width, imageArea.height, imageArea.borderRadius, false, true);
    
    console.log(`📏 Contain模式 - 原圖:${uploadedImage.width}×${uploadedImage.height} → 顯示:${drawWidth.toFixed(0)}×${drawHeight.toFixed(0)} 位置:(${drawX.toFixed(0)},${drawY.toFixed(0)})`);
}

// 繪製圓角矩形的輔助函數
function drawRoundedRect(ctx, x, y, width, height, radius, fill = false, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

// 智能文字大小計算
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
    
    // 測試是否能在指定行數內顯示
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

// 模板一文字繪製
function drawTemplate1Text(title, subtitle, description) {
    const specs = DESIGN_SPECS.template1;
    let currentY = specs.textArea.y;
    
    // 繪製裝飾線
    ctx.fillStyle = specs.decorLine.color;
    ctx.fillRect(specs.decorLine.x, specs.decorLine.y, specs.decorLine.width, specs.decorLine.height);
    
    // 標題
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
    
    // 描述文字
    if (description) {
        const remainingHeight = specs.textArea.maxHeight - (currentY - specs.textArea.y);
        const maxDescriptionLines = Math.floor(remainingHeight / (specs.descriptionStyle.baseFontSize * specs.descriptionStyle.lineHeight));
        
        const descriptionFontSize = calculateSmartFontSize(description, specs.descriptionStyle, specs.textArea.maxWidth, maxDescriptionLines);
        ctx.font = `${specs.descriptionStyle.fontWeight} ${descriptionFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.descriptionStyle.color;
        ctx.textAlign = 'left';
        
        const descriptionLines = wrapText(description, specs.textArea.maxWidth);
        const descriptionLineHeight = descriptionFontSize * specs.descriptionStyle.lineHeight;
        
        const displayLines = descriptionLines.slice(0, maxDescriptionLines);
        
        displayLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, currentY + (index * descriptionLineHeight));
        });
    }
}

// 模板二文字繪製
function drawTemplate2Text(title, subtitle, description) {
    const specs = DESIGN_SPECS.template2;
    
    // 繪製標題背景條
    ctx.fillStyle = specs.titleBar.backgroundColor;
    ctx.fillRect(specs.titleBar.x, specs.titleBar.y, specs.titleBar.width, specs.titleBar.height);
    
    let titleBarY = specs.titleBar.y + 30;
    
    // 標題
    if (title) {
        const titleFontSize = calculateSmartFontSize(title, specs.titleStyle, specs.titleBar.width - 100, 1);
        ctx.font = `${specs.titleStyle.fontWeight} ${titleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.titleStyle.color;
        ctx.textAlign = 'center';
        
        ctx.fillText(title, specs.titleBar.width / 2, titleBarY);
        titleBarY += titleFontSize + 10;
    }
    
    // 副標題
    if (subtitle) {
        const subtitleFontSize = calculateSmartFontSize(subtitle, specs.subtitleStyle, specs.titleBar.width - 100, 1);
        ctx.font = `${specs.subtitleStyle.fontWeight} ${subtitleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.subtitleStyle.color;
        ctx.globalAlpha = specs.subtitleStyle.opacity || 1;
        ctx.textAlign = 'center';
        
        ctx.fillText(subtitle, specs.titleBar.width / 2, titleBarY);
        ctx.globalAlpha = 1.0;
    }
    
    // 描述文字
    if (description) {
        const maxDescriptionLines = Math.floor(specs.textArea.maxHeight / (specs.descriptionStyle.baseFontSize * specs.descriptionStyle.lineHeight));
        
        const descriptionFontSize = calculateSmartFontSize(description, specs.descriptionStyle, specs.textArea.maxWidth, maxDescriptionLines);
        ctx.font = `${specs.descriptionStyle.fontWeight} ${descriptionFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.descriptionStyle.color;
        ctx.textAlign = 'left';
        
        const descriptionLines = wrapText(description, specs.textArea.maxWidth);
        const descriptionLineHeight = descriptionFontSize * specs.descriptionStyle.lineHeight;
        
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
        const mode = template === '1' ? 'Cover' : 'Contain-RoundCorner';
        
        link.download = `圖片生成器_模板${template}_${mode}_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✅ 下載完成: 模板${template} (${mode}模式)`);
    } catch (error) {
        console.error('❌ 下載失敗:', error);
        alert('下載失敗，請重試！');
    }
}

// 錯誤處理
window.addEventListener('error', function(e) {
    console.error('發生錯誤:', e.error);
});
