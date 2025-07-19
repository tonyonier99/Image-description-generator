// 全域變數
let canvas, ctx;
let uploadedImage = null;
let isGenerated = false;

// DOM 元素
const elements = {
    imageUpload: null,
    imagePreview: null,
    title: null,
    subtitle: null,
    description: null,
    generateBtn: null,
    downloadBtn: null,
    templateInputs: null
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeCanvas();
    console.log('圖片產生器初始化完成');
});

// 初始化元素
function initializeElements() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    elements.imageUpload = document.getElementById('image-upload');
    elements.imagePreview = document.getElementById('image-preview');
    elements.title = document.getElementById('title');
    elements.subtitle = document.getElementById('subtitle');
    elements.description = document.getElementById('description');
    elements.generateBtn = document.getElementById('generate-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.templateInputs = document.querySelectorAll('input[name="template"]');
}

// 設定事件監聽器
function setupEventListeners() {
    // 圖片上傳
    elements.imageUpload.addEventListener('change', handleImageUpload);
    
    // 生成按鈕
    elements.generateBtn.addEventListener('click', generateImage);
    
    // 下載按鈕
    elements.downloadBtn.addEventListener('click', downloadImage);
    
    // 模板選擇
    elements.templateInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    });
    
    // 即時預覽（可選）
    const textInputs = [elements.title, elements.subtitle, elements.description];
    textInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (uploadedImage && isGenerated) {
                generateImage();
            }
        });
    });
}

// 初始化 Canvas
function initializeCanvas() {
    canvas.width = 800;
    canvas.height = 1120;
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
            elements.generateBtn.disabled = false;
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
    elements.imagePreview.innerHTML = `<img src="${src}" alt="預覽圖片">`;
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
    const title = elements.title.value.trim();
    const subtitle = elements.subtitle.value.trim();
    const description = elements.description.value.trim();
    
    // 載入對應的底圖
    const backgroundImg = new Image();
    const bgImagePath = template === '1' ? 'bg-template1.png' : 'bg-template2.png';
    
    backgroundImg.onload = function() {
        // 清空 canvas 並繪製底圖
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        
        // 繪製用戶上傳的圖片
        drawMainImage(template);
        
        // 根據模板繪製文字內容
        if (template === '1') {
            drawTemplate1Text(title, subtitle, description);
        } else {
            drawTemplate2Text(title, subtitle, description);
        }
        
        isGenerated = true;
        elements.downloadBtn.disabled = false;
        console.log(`使用 ${bgImagePath} 底圖生成完成`);
    };
    
    backgroundImg.onerror = function() {
        console.log(`底圖 ${bgImagePath} 載入失敗，使用預設背景`);
        
        // 如果底圖載入失敗，使用預設背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 繪製用戶上傳的圖片
        drawMainImage(template);
        
        // 根據模板繪製內容
        if (template === '1') {
            drawTemplate1(title, subtitle, description);
        } else {
            drawTemplate2(title, subtitle, description);
        }
        
        isGenerated = true;
        elements.downloadBtn.disabled = false;
        console.log('使用預設背景生成完成');
    };
    
    backgroundImg.src = bgImagePath;
}

// 繪製主圖片（大幅增加圖片區域）
function drawMainImage(template) {
    let imageArea;
    
    if (template === '1') {
        // 模板一的圖片區域 - 大幅增加高度
        imageArea = {
            x: 50,      // 稍微減少左右邊距
            y: 10,      // 保持上邊距
            width: 700, // 增加寬度
            height: 500 // 大幅增加高度：350 → 500
        };
    } else {
        // 模板二的圖片區域 - 同樣增加
        imageArea = {
            x: 50,
            y: 10,
            width: 700,
            height: 500
        };
    }
    
    // 修正：使用 contain 模式，確保圖片完整顯示
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
    
    // 先清空圖片區域背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
    
    // 繪製圖片
    ctx.drawImage(uploadedImage, drawX, drawY, drawWidth, drawHeight);
    
    // 添加邊框（可選）
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
}

// 模板一文字樣式（調整Y位置配合更大的圖片區域）
function drawTemplate1Text(title, subtitle, description) {
    const titleArea = {
        x: canvas.width / 2,
        y: 550  // 調整位置：420 → 550
    };
    
    const subtitleArea = {
        x: canvas.width / 2,
        y: 600  // 調整位置：470 → 600
    };
    
    const descArea = {
        x: 80,   // 稍微減少左邊距
        y: 650,  // 調整位置：520 → 650
        width: 640,  // 增加寬度
        maxHeight: 450  // 調整最大高度
    };
    
    // 主標題
    if (title) {
        ctx.font = 'bold 36px "Noto Sans TC"';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'center';
        ctx.fillText(title, titleArea.x, titleArea.y);
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = '24px "Noto Sans TC"';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, subtitleArea.x, subtitleArea.y);
    }
    
    // 描述
    if (description) {
        ctx.font = '18px "Noto Sans TC"';
        ctx.fillStyle = '#34495e';
        ctx.textAlign = 'left';
        wrapTextInArea(description, descArea.x, descArea.y, descArea.width, 28, descArea.maxHeight);
    }
}

// 模板二文字樣式（調整Y位置配合更大的圖片區域）
function drawTemplate2Text(title, subtitle, description) {
    const titleBarArea = {
        x: 0,
        y: 530,  // 調整位置：380 → 530
        width: canvas.width,
        height: 80
    };
    
    const descArea = {
        x: 80,
        y: 630,  // 調整位置：480 → 630
        width: 640,
        maxHeight: 470  // 調整最大高度
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
        wrapTextInArea(description, descArea.x, descArea.y, descArea.width, 28, descArea.maxHeight);
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

// 模板一樣式（無底圖備用版本）
function drawTemplate1(title, subtitle, description) {
    const startY = 550;
    
    // 主標題
    if (title) {
        ctx.font = 'bold 36px "Noto Sans TC"';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, startY);
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = '24px "Noto Sans TC"';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, canvas.width / 2, startY + 50);
    }
    
    // 描述
    if (description) {
        ctx.font = '18px "Noto Sans TC"';
        ctx.fillStyle = '#34495e';
        ctx.textAlign = 'left';
        wrapTextInArea(description, 80, startY + 100, 640, 28, 450);
    }
    
    // 添加邊框裝飾
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 10, 700, 500);
}

// 模板二樣式（無底圖備用版本）
function drawTemplate2(title, subtitle, description) {
    const startY = 530;
    const barHeight = 80;
    
    // 標題背景條
    ctx.fillStyle = '#b9a968';
    ctx.fillRect(0, startY, canvas.width, barHeight);
    
    // 主標題
    if (title) {
        ctx.font = 'bold 32px "Noto Sans TC"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, startY + 35);
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = '20px "Noto Sans TC"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, canvas.width / 2, startY + 62);
    }
    
    // 描述
    if (description) {
        ctx.font = '18px "Noto Sans TC"';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'left';
        wrapTextInArea(description, 80, startY + barHeight + 20, 640, 28, 470);
    }
    
    // 添加邊框裝飾
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 10, 700, 500);
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
