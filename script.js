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
    canvas.height = 1000;
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
    
    // 清空 canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製圖片
    drawMainImage();
    
    // 根據模板繪製內容
    if (template === '1') {
        drawTemplate1(title, subtitle, description);
    } else {
        drawTemplate2(title, subtitle, description);
    }
    
    isGenerated = true;
    elements.downloadBtn.disabled = false;
    
    console.log('圖片生成完成');
}

// 繪製主圖片
function drawMainImage() {
    const imageArea = {
        x: 50,
        y: 50,
        width: canvas.width - 100,
        height: 400
    };
    
    // 計算縮放比例
    const scale = Math.min(
        imageArea.width / uploadedImage.width,
        imageArea.height / uploadedImage.height
    );
    
    const scaledWidth = uploadedImage.width * scale;
    const scaledHeight = uploadedImage.height * scale;
    
    // 置中計算
    const x = imageArea.x + (imageArea.width - scaledWidth) / 2;
    const y = imageArea.y + (imageArea.height - scaledHeight) / 2;
    
    // 繪製圖片
    ctx.drawImage(uploadedImage, x, y, scaledWidth, scaledHeight);
    
    // 添加邊框
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.strokeRect(imageArea.x, imageArea.y, imageArea.width, imageArea.height);
}

// 模板一樣式
function drawTemplate1(title, subtitle, description) {
    const startY = 500;
    
    // 主標題
    if (title) {
        ctx.font = 'bold 48px "Noto Sans TC"';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, startY);
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = '28px "Noto Sans TC"';
        ctx.fillStyle = '#7f8c8d';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, canvas.width / 2, startY + 60);
    }
    
    // 描述
    if (description) {
        ctx.font = '20px "Noto Sans TC"';
        ctx.fillStyle = '#34495e';
        ctx.textAlign = 'left';
        wrapText(description, 80, startY + 120, canvas.width - 160, 32);
    }
}

// 模板二樣式
function drawTemplate2(title, subtitle, description) {
    const startY = 500;
    const barHeight = 100;
    
    // 標題背景條
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, startY, canvas.width, barHeight);
    
    // 主標題
    if (title) {
        ctx.font = 'bold 42px "Noto Sans TC"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, startY + 40);
    }
    
    // 副標題
    if (subtitle) {
        ctx.font = '24px "Noto Sans TC"';
        ctx.fillStyle = '#ecf0f1';
        ctx.textAlign = 'center';
        ctx.fillText(subtitle, canvas.width / 2, startY + 75);
    }
    
    // 描述
    if (description) {
        ctx.font = '20px "Noto Sans TC"';
        ctx.fillStyle = '#2c3e50';
        ctx.textAlign = 'left';
        wrapText(description, 80, startY + barHeight + 50, canvas.width - 160, 32);
    }
}

// 文字換行函數
function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, x, currentY);
            line = words[i];
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    
    if (line !== '') {
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
        
        link.download = `圖片描述_${timestamp}.png`;
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