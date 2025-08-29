// Live Preview Image Description Generator
// Client-side only, GitHub Pages compatible

// Global variables
let canvas, ctx;
let uploadedImage = null;
let currentSettings = {
    title: '',
    subtitle: '',
    description: '',
    backgroundColor: '#ffffff',
    textColor: '#333333'
};

// Canvas dimensions
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 675;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
    setupEventListeners();
    updateCanvas();
});

// Initialize canvas
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}

// Setup all event listeners
function setupEventListeners() {
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
    const titleInput = document.getElementById('title');
    const subtitleInput = document.getElementById('subtitle');
    const descriptionInput = document.getElementById('description');

    if (titleInput) titleInput.addEventListener('input', e => { currentSettings.title = e.target.value; updateCanvas(); });
    if (subtitleInput) subtitleInput.addEventListener('input', e => { currentSettings.subtitle = e.target.value; updateCanvas(); });
    if (descriptionInput) descriptionInput.addEventListener('input', e => { currentSettings.description = e.target.value; updateCanvas(); });

    const bgPicker = document.getElementById('background-color');
    const textPicker = document.getElementById('text-color');
    if (bgPicker) bgPicker.addEventListener('input', e => { currentSettings.backgroundColor = e.target.value; updateCanvas(); });
    if (textPicker) textPicker.addEventListener('input', e => { currentSettings.textColor = e.target.value; updateCanvas(); });

    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadImage);
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            uploadedImage = img;
            const infoEl = document.getElementById('image-info');
            if (infoEl) infoEl.textContent = `Image: ${img.width}×${img.height} — ${file.name}`;
            updateCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Update canvas with current settings
function updateCanvas() {
    if (!ctx) return;

    // Background
    ctx.fillStyle = currentSettings.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw uploaded image (scaled & centered)
    if (uploadedImage) drawImage();

    // Draw texts
    drawText();
}

// Draw image scaled to fit within area (leave space for text)
function drawImage() {
    const padding = 40;
    const maxWidth = CANVAS_WIDTH - padding * 2;
    const maxHeight = Math.floor(CANVAS_HEIGHT * 0.68) - padding * 2; // keep room for text under image

    const dims = calculateScaledDimensions(uploadedImage.width, uploadedImage.height, maxWidth, maxHeight);
    const x = (CANVAS_WIDTH - dims.width) / 2;
    const y = padding;

    ctx.drawImage(uploadedImage, x, y, dims.width, dims.height);
}

// Utility: aspect-ratio scaling
function calculateScaledDimensions(ow, oh, maxW, maxH) {
    const ratio = ow / oh;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
        h = maxH;
        w = h * ratio;
    }
    return { width: w, height: h };
}

// Draw text regions: title, subtitle, description box
function drawText() {
    const centerX = CANVAS_WIDTH / 2;
    let y = Math.floor(CANVAS_HEIGHT * 0.72);

    ctx.textAlign = 'center';
    ctx.fillStyle = currentSettings.textColor;

    if (currentSettings.title) {
        ctx.font = 'bold 48px Inter, sans-serif';
        const lines = wrapText(currentSettings.title, CANVAS_WIDTH - 80, ctx);
        lines.forEach(line => {
            ctx.fillText(line, centerX, y);
            y += 56;
        });
        y += 8;
    }

    if (currentSettings.subtitle) {
        ctx.font = 'bold 28px Inter, sans-serif';
        const lines = wrapText(currentSettings.subtitle, CANVAS_WIDTH - 100, ctx);
        lines.forEach(line => {
            ctx.fillText(line, centerX, y);
            y += 38;
        });
        y += 6;
    }

    if (currentSettings.description) {
        drawDescriptionBox(y);
    }
}

// Draw a semi-transparent description box with wrapped text
function drawDescriptionBox(startY) {
    const padding = 28;
    const boxX = padding;
    const boxW = CANVAS_WIDTH - padding * 2;
    const textW = boxW - 36;

    ctx.font = '20px Inter, sans-serif';
    const lines = wrapText(currentSettings.description, textW, ctx);
    const lineHeight = 28;
    const boxH = lines.length * lineHeight + 32;

    // Box background (semi-transparent)
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(boxX, startY, boxW, boxH);

    // Optional border
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, startY, boxW, boxH);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const textX = CANVAS_WIDTH / 2;
    let ty = startY + 24;
    lines.forEach(line => {
        ctx.fillText(line, textX, ty);
        ty += lineHeight;
    });
}

// Word-wrap helper
function wrapText(text, maxWidth, context) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let current = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(current + ' ' + word).width;
        if (width < maxWidth) {
            current += ' ' + word;
        } else {
            lines.push(current);
            current = word;
        }
    }
    lines.push(current);
    return lines;
}

// Download current canvas as PNG
function downloadImage() {
    if (!canvas) { alert('Canvas not ready'); return; }
    try {
        const link = document.createElement('a');
        link.download = 'image-description.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Image downloaded', 'success');
    } catch (e) {
        console.error(e);
        alert('Download failed');
    }
}

// Small notification UI
function showNotification(text, type='info') {
    const n = document.createElement('div');
    n.textContent = text;
    n.style.cssText = 'position:fixed;top:18px;right:18px;padding:10px 14px;border-radius:8px;color:#fff;z-index:2000;font-weight:600';
    n.style.background = type === 'success' ? '#10B981' : '#6B7280';
    document.body.appendChild(n);
    setTimeout(()=>{ n.style.opacity='0'; setTimeout(()=>n.remove(),300); }, 2500);
}
