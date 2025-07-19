// 全域變數
let canvas, ctx;
let uploadedImage = null;
let isGenerated = false;

// 拖曳相關變數
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let imageOffsetX = 0;  // 圖片在區域內的偏移
let imageOffsetY = 0;
let imageScale = 1;    // 圖片縮放比例

// 設計規格 - 基於你的AI檔案
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
            height: 462
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
            height: 462
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
    initializeCanvas();
    setupEventListeners();
    setupDragListeners();
    addResetButton();
    console.log('拖曳功能已啟用');
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
    ctx.fillText('生成後可拖曳圖片調整位置', canvas.width / 2, canvas.height / 2 + 40);
}

// 設定基本事件監聽器
function setupEventListeners() {
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    document.getElementById('generate-btn').addEventListener('click', generateImage);
    document.getElementById('download-btn').addEventListener('click', downloadImage);
    
    const templateInputs = document.querySelectorAll('input[name="template"]');
    templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (uploadedImage && isGenerated) {
                resetImagePosition();
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

// 設定拖曳事件監聽器
function setupDragListeners() {
    // 滑鼠事件
    canvas.addEventListener('mousedown', handleDragStart);
    canvas.addEventListener('mousemove', handleDragMove);
    canvas.addEventListener('mouseup', handleDragEnd);
    canvas.addEventListener('mouseleave', handleDragEnd);
    
    // 觸控事件（手機支援）
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleDragEnd);
    
    // 滾輪縮放
    canvas.addEventListener('wheel', handleWheel);
}

// 添加重置按鈕
function addResetButton() {
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons && !document.getElementById('reset-btn')) {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn';
        resetBtn.innerHTML = '重置圖片位置';
        resetBtn.onclick = resetImagePosition;
        resetBtn.style.background = '#6c757d';
        resetBtn.style.color = 'white';
        resetBtn.disabled = true;
        resetBtn.id = 'reset-btn';
        
        actionButtons.appendChild(resetBtn);
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
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            uploadedImage = img;
            resetImagePosition();
            showImagePreview(e.target.result);
            document.getElementById('generate-btn').disabled = false;
            console.log('圖片上傳成功');
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// 重置圖片位置
function resetImagePosition() {
    imageOffsetX = 0;
    imageOffsetY = 0;
    imageScale = 1;
    
    if (uploadedImage && isGenerated) {
        generateImage();
    }
}

// 顯示圖片預覽
function showImagePreview(src) {
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.innerHTML = `<img src="${src}" alt="預覽圖片">`;
    }
}

// 取得選中的模板
function getSelectedTemplate() {
    const selectedTemplate = document.querySelector('input[name="template"]:checked');
    return selectedTemplate ? selectedTemplate.value : '1';
}

// 獲取滑鼠在Canvas上的相對位置
function getCanvasPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// 檢查點是否在圖片區域內
function isPointInImageArea(x, y) {
    const template = getSelectedTemplate();
    const specs = DESIGN_SPECS[`template${template}`];
    const imageArea = specs.imageArea;
    
    return x >= imageArea.x && 
           x <= imageArea.x + imageArea.width && 
           y >= imageArea.y && 
           y <= imageArea.y + imageArea.height;
}

// 處理拖曳開始
function handleDragStart(e) {
    if (!isGenerated || !uploadedImage) return;
    
    const pos = getCanvasPosition(e);
    
    if (isPointInImageArea(pos.x, pos.y)) {
        isDragging = true;
        dragStartX = pos.x;
        dragStartY = pos.y;
        canvas.style.cursor = 'grabbing';
        
        e.preventDefault();
    }
}

// 處理拖曳移動
function handleDragMove(e) {
    if (!isDragging) {
        const pos = getCanvasPosition(e);
        if (isGenerated && uploadedImage && isPointInImageArea(pos.x, pos.y)) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'default';
        }
        return;
    }
    
    const pos = getCanvasPosition(e);
    const deltaX = pos.x - dragStartX;
    const deltaY = pos.y - dragStartY;
    
    imageOffsetX += deltaX;
    imageOffsetY += deltaY;
    
    dragStartX = pos.x;
    dragStartY = pos.y;
    
    generateImage();
    
    e.preventDefault();
}

// 處理拖曳結束
function handleDragEnd(e) {
    if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'default';
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
    
    if (isPointInImageArea(pos.x, pos.y)) {
        e.preventDefault();
        
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = imageScale * scaleFactor;
        
        if (newScale >= 0.5 && newScale <= 3) {
            imageScale = newScale;
            generateImage();
        }
    }
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
    
    const backgroundImg = new Image();
    const bgImagePath = template === '1' ? 'bg-template1.png' : 'bg-template2.png';
    
    backgroundImg.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        
        drawDraggableImage(template);
        
        if (template === '1') {
            drawTemplate1SmartText(title, subtitle, description);
        } else {
            drawTemplate2SmartText(title, subtitle, description);
        }
        
        isGenerated = true;
        document.getElementById('download-btn').disabled = false;
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.disabled = false;
    };
    
    backgroundImg.onerror = function() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawDraggableImage(template);
        
        if (template === '1') {
            drawTemplate1SmartText(title, subtitle, description);
        } else {
            drawTemplate2SmartText(title, subtitle, description);
        }
        
        isGenerated = true;
        document.getElementById('download-btn').disabled = false;
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.disabled = false;
    };
    
    backgroundImg.src = bgImagePath;
}

// 繪製可拖曳的圖片
function drawDraggableImage(template) {
    const specs = DESIGN_SPECS[`template${template}`];
    const imageArea = specs.imageArea;
    
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
    
    const drawX = imageArea.x + (imageArea.width - scaledWidth) / 2 + imageOffsetX;
    const drawY = imageArea.y + (imageArea.height - scaledHeight) / 2 + imageOffsetY;
    
    ctx.drawImage(uploadedImage, drawX, drawY, scaledWidth, scaledHeight);
    
    ctx.restore();
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
}

// 智能文字大小計算
function calculateSmartFontSize(text, style, maxWidth, maxLines = 999) {
    if (!text) return style.baseFontSize;
    
    const words = text.length;
    let fontSize = style.baseFontSize;
    
    if (words > 50) {
        fontSize = Math.max(style.minFontSize, fontSize - 8);
    } else if (words > 30) {
        fontSize = Math.max(style.minFontSize, fontSize - 4);
    } else if (words > 15) {
        fontSize = Math.max(style.minFontSize, fontSize - 2);
    } else if (words < 8) {
        fontSize = Math.min(style.maxFontSize, fontSize + 4);
    }
    
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
    
    ctx.fillStyle = specs.decorLine.color;
    ctx.fillRect(specs.decorLine.x, specs.decorLine.y, specs.decorLine.width, specs.decorLine.height);
    
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

// 模板二智能文字繪製
function drawTemplate2SmartText(title, subtitle, description) {
    const specs = DESIGN_SPECS.template2;
    
    ctx.fillStyle = specs.titleBar.backgroundColor;
    ctx.fillRect(specs.titleBar.x, specs.titleBar.y, specs.titleBar.width, specs.titleBar.height);
    
    let titleBarY = specs.titleBar.y + 30;
    
    if (title) {
        const titleFontSize = calculateSmartFontSize(title, specs.titleStyle, specs.titleBar.width - 100, 1);
        ctx.font = `${specs.titleStyle.fontWeight} ${titleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.titleStyle.color;
        ctx.textAlign = 'center';
        
        ctx.fillText(title, specs.titleBar.width / 2, titleBarY);
        titleBarY += titleFontSize + 10;
    }
    
    if (subtitle) {
        const subtitleFontSize = calculateSmartFontSize(subtitle, specs.subtitleStyle, specs.titleBar.width - 100, 1);
        ctx.font = `${specs.subtitleStyle.fontWeight} ${subtitleFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.subtitleStyle.color;
        ctx.globalAlpha = specs.subtitleStyle.opacity;
        ctx.textAlign = 'center';
        
        ctx.fillText(subtitle, specs.titleBar.width / 2, titleBarY);
        ctx.globalAlpha = 1.0;
    }
    
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
        
        link.download = `可拖曳圖片_模板${template}_${timestamp}.png`;
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
