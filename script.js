// 全域變數
let canvas, ctx;
let uploadedImage = null;
let isGenerated = false;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
    setupEventListeners();
    console.log('圖片產生器初始化完成');
});

// 初始化 Canvas
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // 設定 Canvas 實際尺寸
    canvas.width = 800;
    canvas.height = 1120; // 增加高度配合 1.5倍圖片區域
    
    clearCanvas();
}

// 清空 Canvas
function clearCanvas() {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 添加提示文字
    ctx.fillStyle = '#999';
    ctx.font = '24px "Noto Sans TC"';
    ctx.textAlign = 'center';
    ctx.fillText('請上傳圖片並點擊生成', canvas.width / 2, canvas.height / 2);
}

// 設定事件監聽器
function setupEventListeners() {
    // 圖片上傳
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    
    // 生成按鈕
    document.getElementById('generate-btn').addEventListener('click', generateImage);
    
    // 下載按鈕
    document.getElementById('download-btn').addEventListener('click', downloadImage);
    
    // 模板選擇
    const templateInputs = document.querySelectorAll('input[name="template"]');
    templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    });
    
    // 即時預覽
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
    
    reader.onerror = function() {
        alert('檔案讀取失敗，請重新選擇！');
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
    
    // 清空 canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製用戶上傳的圖片（1.5倍高度）
    drawMainImage();
    
    // 根據模板繪製文字內容
    if (template === '1') {
        drawTemplate1Text(title, subtitle, description);
    } else {
        drawTemplate2Text(title, subtitle, description);
    }
    
    isGenerated = true;
    document.getElementById('download-btn').disabled = false;
    console.log(`模板 ${template} 生成完成`);
}

// 繪製主圖片（高度增加 1.5 倍）
function drawMainImage() {
    const imageArea = {
        x: 50,
        y: 10,
        width: 700,
        height: 750 // 500 × 1.5 = 750
    };
    
    // 計算圖片縮放比例
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
    
    // 繪製圖片
    ctx.drawImage(uploadedImage, drawX, drawY, drawWidth, drawHeight);
    
    // 添加邊框
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
}

// 模板一文字樣式（左對齊 + 垂直線）
function drawTemplate1Text(title, subtitle, description) {
    // 垂直裝飾線
    const decorLine = {
        x: 80,
        y: 790,
        width: 6,
        height: 280,
        color: '#8B4513'
    };
    
    const textStartX = decorLine.x + decorLine.width + 25;
    
    // 繪製垂直裝飾線
    ctx.fillStyle = decorLine.color;
    ctx.fillRect(decorLine.x, decorLine.y, decorLine.width, decorLine.height);
    
    // 主標題
    if (title) {
        ctx.font = 'bold 42px "Noto Sans TC"';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'left';
        ctx.fillText(title, textStartX, 830);
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = '24px "Noto Sans TC"';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'left';
        ctx.fillText(subtitle, textStartX, 870);
    }
    
    // 描述
    if (description) {
        ctx.font = '18px "Noto Sans TC"';
        ctx.fillStyle = '#34495e';
        ctx.textAlign = 'left';
        wrapTextInArea(description, textStartX, 910, 600, 26, 180);
    }
}

// 模板二文字樣式（標題背景條）
function drawTemplate2Text(title, subtitle, description) {
    const titleBarArea = {
        x: 0,
        y: 780,
        width: canvas.width,
        height: 80
    };
    
    // 標題背景條
    ctx.fillStyle = 'rgba(185, 169, 104, 0.9)';
    ctx.fillRect(titleBarArea.x, titleBarArea.y, titleBarArea.width, titleBarArea.height);
    
    // 主標題
    if (title) {
        ctx.font = 'bold 32px "Noto Sans TC"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, titleBarArea.y + 35);
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = '20px "Noto Sans TC"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, canvas.width / 2, titleBarArea.y + 62);
    }
    
    // 描述
    if (description) {
        ctx.font = '18px "Noto Sans TC"';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'left';
        wrapTextInArea(description, 80, 880, 640, 26, 200);
    }
}

// 在指定區域內換行文字
function wrapTextInArea(text, x, y, maxWidth, lineHeight, maxHeight) {
    const words = text.split('');
    let line = '';
    let currentY = y;
    const maxLines = Math.floor(maxHeight / lineHeight);
    let lineCount = 0;
    
    for (let i = 0; i < words.length && lineCount < maxLines; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, x, currentY);
            line = words[i];
            currentY += lineHeight;
            lineCount++;
        } else {
            line = testLine;
        }
    }
    
    if (line !== '' && lineCount < maxLines) {
        ctx.fillText(line, x, currentY);
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
        
        link.download = `圖片描述_模板${template}_${timestamp}.png`;
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
