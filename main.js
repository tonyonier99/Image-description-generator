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
    // 繼續畫主圖和文字...
    if (img) {
      // 等比例縮放主圖的程式碼...
    }
    // 文字繪製的程式碼...
  };
}
