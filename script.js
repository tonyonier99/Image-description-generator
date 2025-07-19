// 全域變數
let canvas, ctx;
let uploadedImage = null;
let isGenerated = false;

// 拖曳變數
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let imageOffsetX = 0;
let imageOffsetY = 0;

// 設計規格
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
    console.log('開始初始化...');
    
    try {
        initializeCanvas();
        setupEventListeners();
        setupSimpleDrag();
        addResetButton();
        console.log('✅ 初始化完成');
    } catch (error) {
        console.error('❌ 初始化失敗:', error);
    }
});

// 初始化 Canvas
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    if (!canvas) {
        throw new Error('找不到 canvas 元素');
    }
    
    ctx = canvas.getContext('2d');
    canvas.width = DESIGN_SPECS.canvas.width;
    canvas.height = DESIGN_SPECS.canvas.height;
    
    clearCanvas();
    console.log('✅ Canvas 初始化完成');
}

// 清空 Canvas
function clearCanvas() {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#999';
    ctx.font = '24px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('請上傳圖片並點擊生成', canvas.width / 2, canvas.height / 2);
    ctx.fillText('生成後可拖曳圖片', canvas.width / 2, canvas.height / 2 + 40);
}

// 設定基本事件
function setupEventListeners() {
    const imageUpload = document.getElementById('image-upload');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    if (!imageUpload || !generateBtn || !downloadBtn) {
        throw new Error('找不到必要的DOM元素');
    }
    
    imageUpload.addEventListener('change', handleImageUpload);
    generateBtn.addEventListener('click', generateImage);
    downloadBtn.addEventListener('click', downloadImage);
    
    // 模板切換
    const templateInputs = document.querySelectorAll('input[name="template"]');
    templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (uploadedImage && isGenerated) {
                resetImagePosition();
                generateImage();
            }
        });
    });
    
    // 文字輸入
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

// 簡化版拖曳設定
function setupSimpleDrag() {
    console.log('設定拖曳功能...');
    
    // 滑鼠按下
    canvas.addEventListener('mousedown', function(e) {
        console.log('🖱️ 滑鼠按下');
        
        if (!isGenerated || !uploadedImage) {
            console.log('❌ 圖片未生成或未上傳');
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        console.log(`滑鼠位置: ${mouseX}, ${mouseY}`);
        
        // 檢查是否在圖片區域內
        const template = getSelectedTemplate();
        const imageArea = DESIGN_SPECS[`template${template}`].imageArea;
        
        if (mouseX >= imageArea.x && mouseX <= imageArea.x + imageArea.width &&
            mouseY >= imageArea.y && mouseY <= imageArea.y + imageArea.height) {
            
            isDragging = true;
            lastMouseX = mouseX;
            lastMouseY = mouseY;
            canvas.style.cursor = 'grabbing';
            
            console.log('✅ 開始拖曳');
            e.preventDefault();
        }
    });
    
    // 滑鼠移動
    canvas.addEventListener('mousemove', function(e) {
        if (!isDragging) {
            // 改變游標
            if (isGenerated && uploadedImage) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
                const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
                
                const template = getSelectedTemplate();
                const imageArea = DESIGN_SPECS[`template${template}`].imageArea;
                
                if (mouseX >= imageArea.x && mouseX <= imageArea.x + imageArea.width &&
                    mouseY >= imageArea.y && mouseY <= imageArea.y + imageArea.height) {
                    canvas.style.cursor = 'grab';
                } else {
                    canvas.style.cursor = 'default';
                }
            }
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        const deltaX = mouseX - lastMouseX;
        const deltaY = mouseY - lastMouseY;
        
        imageOffsetX += deltaX;
        imageOffsetY += deltaY;
        
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        
        console.log(`🖱️ 拖曳中 offset: ${imageOffsetX}, ${imageOffsetY}`);
        
        // 重新繪製
        generateImage();
        
        e.preventDefault();
    });
    
    // 滑鼠放開
    canvas.addEventListener('mouseup', function(e) {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'default';
            console.log('✅ 停止拖曳');
        }
    });
    
    // 滑鼠離開canvas
    canvas.addEventListener('mouseleave', function(e) {
        if (isDragging) {
            isDragging = false;
            canvas.style.cursor = 'default';
            console.log('✅ 滑鼠離開，停止拖曳');
        }
    });
    
    console.log('✅ 拖曳功能設定完成');
}

// 添加重置按鈕
function addResetButton() {
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons && !document.getElementById('reset-btn')) {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn';
        resetBtn.innerHTML = '🔄 重置位置';
        resetBtn.onclick = resetImagePosition;
        resetBtn.style.background = '#6c757d';
        resetBtn.style.color = 'white';
        resetBtn.style.marginLeft = '10px';
        resetBtn.disabled = true;
        resetBtn.id = 'reset-btn';
        
        actionButtons.appendChild(resetBtn);
        console.log('✅ 重置按鈕已添加');
    }
}

// 重置圖片位置
function resetImagePosition() {
    imageOffsetX = 0;
    imageOffsetY = 0;
    console.log('🔄 重置圖片位置');
    
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
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        
        img.onload = function() {
            uploadedImage = img;
            resetImagePosition();
            showImagePreview(e.target.result);
            document.getElementById('generate-btn').disabled = false;
            console.log('✅ 圖片上傳成功:', img.width, 'x', img.height);
        };
        
        img.onerror = function() {
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
        preview.innerHTML = `<img src="${src}" alt="預覽圖片" style="max-width: 100%; height: auto;">`;
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
    
    console.log('🎨 開始生成圖片...');
    
    const template = getSelectedTemplate();
    const title = document.getElementById('title').value.trim();
    const subtitle = document.getElementById('subtitle').value.trim();
    const description = document.getElementById('description').value.trim();
    
    // 嘗試載入背景圖
    const backgroundImg = new Image();
    const bgImagePath = template === '1' ? 'bg-template1.png' : 'bg-template2.png';
    
    backgroundImg.onload = function() {
        console.log('✅ 背景圖載入成功');
        drawComplete(backgroundImg, template, title, subtitle, description);
    };
    
    backgroundImg.onerror = function() {
        console.log('⚠️ 背景圖載入失敗，使用預設背景');
        drawComplete(null, template, title, subtitle, description);
    };
    
    backgroundImg.src = bgImagePath;
}

// 完整繪製
function drawComplete(backgroundImg, template, title, subtitle, description) {
    // 清空canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製背景
    if (backgroundImg) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 繪製拖曳圖片
    drawDraggableImage(template);
    
    // 繪製文字
    if (template === '1') {
        drawTemplate1Text(title, subtitle, description);
    } else {
        drawTemplate2Text(title, subtitle, description);
    }
    
    isGenerated = true;
    document.getElementById('download-btn').disabled = false;
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.disabled = false;
    
    console.log('✅ 圖片生成完成');
}

// 繪製可拖曳圖片
function drawDraggableImage(template) {
    const specs = DESIGN_SPECS[`template${template}`];
    const imageArea = specs.imageArea;
    
    console.log(`🖼️ 繪製圖片 offset: ${imageOffsetX}, ${imageOffsetY}`);
    
    // 保存canvas狀態
    ctx.save();
    
    // 設定裁切區域
    ctx.beginPath();
    ctx.rect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
    ctx.clip();
    
    // 計算圖片顯示大小（保持比例填滿）
    const imgRatio = uploadedImage.width / uploadedImage.height;
    const areaRatio = imageArea.width / imageArea.height;
    
    let drawWidth, drawHeight;
    
    if (imgRatio > areaRatio) {
        // 圖片比較寬
        drawHeight = imageArea.height;
        drawWidth = imageArea.height * imgRatio;
    } else {
        // 圖片比較高
        drawWidth = imageArea.width;
        drawHeight = imageArea.width / imgRatio;
    }
    
    // 計算繪製位置（考慮偏移）
    const drawX = imageArea.x + (imageArea.width - drawWidth) / 2 + imageOffsetX;
    const drawY = imageArea.y + (imageArea.height - drawHeight) / 2 + imageOffsetY;
    
    // 繪製圖片
    ctx.drawImage(uploadedImage, drawX, drawY, drawWidth, drawHeight);
    
    // 恢復canvas狀態
    ctx.restore();
    
    // 繪製邊框
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
}

// 文字換行
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

// 模板一文字
function drawTemplate1Text(title, subtitle, description) {
    const specs = DESIGN_SPECS.template1;
    let currentY = specs.textArea.y;
    
    // 裝飾線
    ctx.fillStyle = specs.decorLine.color;
    ctx.fillRect(specs.decorLine.x, specs.decorLine.y, specs.decorLine.width, specs.decorLine.height);
    
    // 標題
    if (title) {
        ctx.font = `${specs.titleStyle.fontWeight} ${specs.titleStyle.baseFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.titleStyle.color;
        ctx.textAlign = 'left';
        
        const titleLines = wrapText(title, specs.textArea.maxWidth);
        currentY += specs.titleStyle.baseFontSize * specs.titleStyle.lineHeight;
        
        titleLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, currentY + (index * specs.titleStyle.baseFontSize * specs.titleStyle.lineHeight));
        });
        
        currentY += (titleLines.length - 1) * specs.titleStyle.baseFontSize * specs.titleStyle.lineHeight + specs.titleStyle.marginBottom;
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = `${specs.subtitleStyle.fontWeight} ${specs.subtitleStyle.baseFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.subtitleStyle.color;
        ctx.textAlign = 'left';
        
        const subtitleLines = wrapText(subtitle, specs.textArea.maxWidth);
        
        subtitleLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, currentY + (index * specs.subtitleStyle.baseFontSize * specs.subtitleStyle.lineHeight));
        });
        
        currentY += (subtitleLines.length * specs.subtitleStyle.baseFontSize * specs.subtitleStyle.lineHeight) + specs.subtitleStyle.marginBottom;
    }
    
    // 描述
    if (description) {
        ctx.font = `${specs.descriptionStyle.fontWeight} ${specs.descriptionStyle.baseFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.descriptionStyle.color;
        ctx.textAlign = 'left';
        
        const descriptionLines = wrapText(description, specs.textArea.maxWidth);
        
        descriptionLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, currentY + (index * specs.descriptionStyle.baseFontSize * specs.descriptionStyle.lineHeight));
        });
    }
}

// 模板二文字
function drawTemplate2Text(title, subtitle, description) {
    const specs = DESIGN_SPECS.template2;
    
    // 標題背景條
    ctx.fillStyle = specs.titleBar.backgroundColor;
    ctx.fillRect(specs.titleBar.x, specs.titleBar.y, specs.titleBar.width, specs.titleBar.height);
    
    let titleBarY = specs.titleBar.y + 40;
    
    // 標題
    if (title) {
        ctx.font = `${specs.titleStyle.fontWeight} ${specs.titleStyle.baseFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.titleStyle.color;
        ctx.textAlign = 'center';
        
        ctx.fillText(title, specs.titleBar.width / 2, titleBarY);
        titleBarY += specs.titleStyle.baseFontSize + 10;
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = `${specs.subtitleStyle.fontWeight} ${specs.subtitleStyle.baseFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.subtitleStyle.color;
        ctx.globalAlpha = specs.subtitleStyle.opacity || 1;
        ctx.textAlign = 'center';
        
        ctx.fillText(subtitle, specs.titleBar.width / 2, titleBarY);
        ctx.globalAlpha = 1.0;
    }
    
    // 描述
    if (description) {
        ctx.font = `${specs.descriptionStyle.fontWeight} ${specs.descriptionStyle.baseFontSize}px "Noto Sans TC"`;
        ctx.fillStyle = specs.descriptionStyle.color;
        ctx.textAlign = 'left';
        
        const descriptionLines = wrapText(description, specs.textArea.maxWidth);
        
        descriptionLines.forEach((line, index) => {
            ctx.fillText(line, specs.textArea.x, specs.textArea.y + ((index + 1) * specs.descriptionStyle.baseFontSize * specs.descriptionStyle.lineHeight));
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
        
        link.download = `拖曳圖片_模板${template}_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ 圖片下載完成');
    } catch (error) {
        console.error('❌ 下載失敗:', error);
        alert('下載失敗，請重試！');
    }
}
