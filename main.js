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
    console.log('🚀 Initializing Live Preview Image Description Generator');
    
    initializeCanvas();
    setupEventListeners();
    updateCanvas();
});

// Initialize canvas
function initializeCanvas() {
    canvas = document.getElementById('canvas');
    if (!canvas) {
        console.error('❌ Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    console.log('✅ Canvas initialized:', CANVAS_WIDTH + 'x' + CANVAS_HEIGHT);
}

// Setup all event listeners
function setupEventListeners() {
    // Image upload
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
    
    // Text inputs
    const titleInput = document.getElementById('title');
    const subtitleInput = document.getElementById('subtitle');
    const descriptionInput = document.getElementById('description');
    
    if (titleInput) {
        titleInput.addEventListener('input', function() {
            currentSettings.title = this.value;
            updateCanvas();
        });
    }
    
    if (subtitleInput) {
        subtitleInput.addEventListener('input', function() {
            currentSettings.subtitle = this.value;
            updateCanvas();
        });
    }
    
    if (descriptionInput) {
        descriptionInput.addEventListener('input', function() {
            currentSettings.description = this.value;
            updateCanvas();
        });
    }
    
    // Color pickers
    const backgroundColorPicker = document.getElementById('background-color');
    const textColorPicker = document.getElementById('text-color');
    
    if (backgroundColorPicker) {
        backgroundColorPicker.addEventListener('input', function() {
            currentSettings.backgroundColor = this.value;
            updateCanvas();
        });
    }
    
    if (textColorPicker) {
        textColorPicker.addEventListener('input', function() {
            currentSettings.textColor = this.value;
            updateCanvas();
        });
    }
    
    // Download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadImage);
    }
    
    console.log('✅ Event listeners set up');
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPG, PNG, GIF)');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            uploadedImage = img;
            console.log('✅ Image loaded:', img.width + 'x' + img.height);
            updateCanvas();
        };
        img.onerror = function() {
            console.error('❌ Failed to load image');
            alert('Failed to load image. Please try another file.');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Update canvas with current settings
function updateCanvas() {
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = currentSettings.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw uploaded image if available
    if (uploadedImage) {
        drawImage();
    }
    
    // Draw text elements
    drawText();
}

// Draw uploaded image with proper scaling and centering
function drawImage() {
    if (!uploadedImage) return;
    
    const padding = 40;
    const maxWidth = CANVAS_WIDTH - (padding * 2);
    const maxHeight = CANVAS_HEIGHT * 0.7 - (padding * 2); // Leave space for text
    
    // Calculate scaled dimensions maintaining aspect ratio
    let { width, height } = calculateScaledDimensions(
        uploadedImage.width, 
        uploadedImage.height, 
        maxWidth, 
        maxHeight
    );
    
    // Center the image
    const x = (CANVAS_WIDTH - width) / 2;
    const y = padding;
    
    // Draw image
    ctx.drawImage(uploadedImage, x, y, width, height);
}

// Calculate scaled dimensions maintaining aspect ratio
function calculateScaledDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    const aspectRatio = originalWidth / originalHeight;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }
    
    return { width, height };
}

// Draw text elements
function drawText() {
    const textStartY = CANVAS_HEIGHT * 0.75; // Start text at 75% down the canvas
    let currentY = textStartY;
    
    // Title
    if (currentSettings.title) {
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.fillStyle = currentSettings.textColor;
        ctx.textAlign = 'center';
        
        const titleLines = wrapText(currentSettings.title, CANVAS_WIDTH - 80, ctx);
        titleLines.forEach(line => {
            ctx.fillText(line, CANVAS_WIDTH / 2, currentY);
            currentY += 60;
        });
        currentY += 20; // Extra spacing after title
    }
    
    // Subtitle
    if (currentSettings.subtitle) {
        ctx.font = '32px Inter, sans-serif';
        ctx.fillStyle = currentSettings.textColor;
        ctx.textAlign = 'center';
        
        const subtitleLines = wrapText(currentSettings.subtitle, CANVAS_WIDTH - 80, ctx);
        subtitleLines.forEach(line => {
            ctx.fillText(line, CANVAS_WIDTH / 2, currentY);
            currentY += 40;
        });
        currentY += 20; // Extra spacing after subtitle
    }
    
    // Description with background box
    if (currentSettings.description) {
        drawDescriptionBox(currentY);
    }
}

// Draw description text in a semi-transparent box
function drawDescriptionBox(startY) {
    const padding = 30;
    const boxWidth = CANVAS_WIDTH - (padding * 2);
    const lineHeight = 32;
    
    // Set font for measuring
    ctx.font = '24px Inter, sans-serif';
    
    // Wrap text
    const lines = wrapText(currentSettings.description, boxWidth - 40, ctx);
    const boxHeight = (lines.length * lineHeight) + 40;
    
    // Draw semi-transparent background box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(padding, startY - 20, boxWidth, boxHeight);
    
    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, startY - 20, boxWidth, boxHeight);
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    
    lines.forEach((line, index) => {
        const y = startY + 20 + (index * lineHeight);
        ctx.fillText(line, CANVAS_WIDTH / 2, y);
    });
}

// Wrap text to fit within specified width
function wrapText(text, maxWidth, context) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + ' ' + word).width;
        
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    
    return lines;
}

// Download canvas as PNG
function downloadImage() {
    if (!canvas) {
        alert('Canvas not available for download');
        return;
    }
    
    try {
        // Create download link
        const link = document.createElement('a');
        link.download = 'image-description.png';
        link.href = canvas.toDataURL('image/png');
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Image downloaded successfully');
        
        // Show success message
        showNotification('Image downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Download failed:', error);
        alert('Download failed. Please try again.');
    }
}

// Show notification message
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#6b7280'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('🎉 Live Preview Image Description Generator loaded successfully');
console.log('📅 Compatible with GitHub Pages - client-side only');
console.log('✨ Features: Live preview, image upload, text wrapping, PNG download');