// 全域變數
let canvas, ctx;
let titleInput, subtitleInput, descInput, imgInput, makeBtn, downloadBtn;
let uploadedImage = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 取得元素
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    titleInput = document.getElementById('title');
    subtitleInput = document.getElementById('subtitle');
    descInput = document.getElementById('desc');
    imgInput = document.getElementById('img-upload');
    makeBtn = document.getElementById('make-btn');
    downloadBtn = document.getElementById('download-btn');

    // 設定 canvas 大小
    canvas.width = 800;
    canvas.height = 800;

    // 事件監聽器
    imgInput.addEventListener('change', handleImageUpload);
    makeBtn.addEventListener('click', generatePreview);
    downloadBtn.addEventListener('click', downloadImage);

    // 初始化 canvas
    clearCanvas();
});

// 處理圖片上傳
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                uploadedImage = img;
                console.log('圖片上傳成功');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// 生成預覽
function generatePreview() {
    if (!uploadedImage) {
        alert('請先上傳圖片！');
        return;
    }
    drawPreview(uploadedImage);
}

// 清空 canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// 文字換行函數
function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
}

// 繪製預覽
function drawPreview(img) {
    clearCanvas();

    const template = document.querySelector('input[name="template"]:checked').value;
    
    // 載入底圖
    const bgImg = new Image();
    bgImg.src = template === '1' ? 'bg-template1.png' : 'bg-template2.png';
    
    bgImg.onload = function() {
        // 先畫底圖
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        
        // 再畫主圖片（等比例縮放）
        if (img) {
            const iw = img.width;
            const ih = img.height;
            const cw = canvas.width;
            const ch = 500; // 顯示圖片的區域高度

            const scale = Math.min(cw / iw, ch / ih);
            const nw = iw * scale;
            const nh = ih * scale;
            const nx = (cw - nw) / 2;
            const ny = (ch - nh) / 2;

            ctx.drawImage(img, nx, ny, nw, nh);
        }

        // 樣式參數
        const title = titleInput.value;
        const subtitle = subtitleInput.value;
        const desc = descInput.value;

        if (template === '1') {
            // 模板一
            ctx.font = 'bold 38px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#3c2c12';
            ctx.textAlign = 'center';
            ctx.fillText(title, canvas.width / 2, 560);

            ctx.font = '22px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#7d6c48';
            ctx.fillText(subtitle, canvas.width / 2, 610);

            ctx.font = '18px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#555';
            ctx.textAlign = 'left';
            wrapText(desc, 52, 650, canvas.width - 100, 28);
        } else {
            // 模板二
            ctx.fillStyle = '#bfa968';
            ctx.fillRect(0, 520, canvas.width, 76);

            ctx.font = 'bold 44px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(title, canvas.width / 2, 570);

            ctx.font = '22px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(subtitle, canvas.width / 2, 610);

            ctx.font = '18px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#3c2c12';
            ctx.textAlign = 'left';
            wrapText(desc, 52, 650, canvas.width - 100, 28);
        }
    };

    // 如果底圖載入失敗，也要繼續畫其他內容
    bgImg.onerror = function() {
        console.log('底圖載入失敗，使用預設背景');
        
        // 畫預設背景
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 繼續畫主圖和文字
        if (img) {
            const iw = img.width;
            const ih = img.height;
            const cw = canvas.width;
            const ch = 500;

            const scale = Math.min(cw / iw, ch / ih);
            const nw = iw * scale;
            const nh = ih * scale;
            const nx = (cw - nw) / 2;
            const ny = (ch - nh) / 2;

            ctx.drawImage(img, nx, ny, nw, nh);
        }

        // 繪製文字
        const title = titleInput.value;
        const subtitle = subtitleInput.value;
        const desc = descInput.value;

        if (template === '1') {
            ctx.font = 'bold 38px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#3c2c12';
            ctx.textAlign = 'center';
            ctx.fillText(title, canvas.width / 2, 560);

            ctx.font = '22px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#7d6c48';
            ctx.fillText(subtitle, canvas.width / 2, 610);

            ctx.font = '18px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#555';
            ctx.textAlign = 'left';
            wrapText(desc, 52, 650, canvas.width - 100, 28);
        } else {
            ctx.fillStyle = '#bfa968';
            ctx.fillRect(0, 520, canvas.width, 76);

            ctx.font = 'bold 44px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(title, canvas.width / 2, 570);

            ctx.font = '22px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(subtitle, canvas.width / 2, 610);

            ctx.font = '18px "Noto Sans TC", sans-serif';
            ctx.fillStyle = '#3c2c12';
            ctx.textAlign = 'left';
            wrapText(desc, 52, 650, canvas.width - 100, 28);
        }
    };
}

// 下載圖片
function downloadImage() {
    const link = document.createElement('a');
    link.download = 'generated-image.png';
    link.href = canvas.toDataURL();
    link.click();
}
