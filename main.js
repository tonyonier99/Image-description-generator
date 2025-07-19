// 標題自動切換
const radios = document.querySelectorAll('input[name="template"]');
const formTitle = document.getElementById('formTitle');
radios.forEach(radio => {
  radio.addEventListener('change', () => {
    formTitle.textContent =
      radio.value === '1'
        ? '模板一｜圖片介紹產生生器'
        : '模板二｜圖片介紹產生生器';
  });
});

// 預覽＆下載
const imgInput = document.getElementById('imgInput');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const descInput = document.getElementById('descInput');
const makeBtn = document.getElementById('makeBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const downloadBtn = document.getElementById('downloadBtn');

// 保持預覽區背景色
function clearCanvas() {
  ctx.fillStyle = '#faf7ef';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPreview(img) {
  clearCanvas();

  const template = document.querySelector('input[name="template"]:checked').value;
  // 等比例縮放圖片
  if (img) {
    const iw = img.width;
    const ih = img.height;
    const cw = canvas.width;
    const ch = 500; // 顯示圖片的區域高度

    // 計算縮放比例與置中座標
    const scale = Math.min(cw / iw, ch / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    const nx = (cw - nw) / 2;
    const ny = (ch - nh) / 2;

    ctx.drawImage(img, nx, ny, nw, nh);
  }

  // 樣式參數（可調整）
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
}

// 換行繪製
function wrapText(text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split('\n');
  ctx.save();
  for (let i = 0; i < paragraphs.length; i++) {
    let words = paragraphs[i].split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  ctx.restore();
}

// 生成預覽
makeBtn.addEventListener('click', () => {
  if (!imgInput.files[0]) {
    drawPreview();
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new window.Image();
    img.onload = function () {
      drawPreview(img);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(imgInput.files[0]);
});

// 預設清空畫布
clearCanvas();

// 下載圖片
downloadBtn.addEventListener('click', function () {
  const link = document.createElement('a');
  link.download = 'preview.png';
  link.href = canvas.toDataURL();
  link.click();
});