// Main application logic for Image Description Generator
import { categoryStorage } from './storage.js';

// Global state
let currentCategory = 'classic';
let currentTemplate = 0;
let categoryConfigs = null;
let canvas, ctx;
let uploadedImage = null;
let currentOptions = {};
let currentPreviewMode = 'template';
let currentTransform = { scale: 1, offsetX: 0, offsetY: 0, rotate: 0 };
let backgroundImage = null;
let foregroundImage = null;

// Canvas dimensions
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 675;

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
  await loadConfigs();
  initializeCanvas();
  loadSavedState();
  setupEventListeners();
  renderCategoryDropdown();
  updateUIForCategory();
  updateCanvas();
});

// Load category configurations
async function loadConfigs() {
  try {
    // Try to load override from localStorage first
    const override = categoryStorage.getConfigsOverride();
    if (override) {
      categoryConfigs = override;
      console.log('Loaded category configs from localStorage override');
      return;
    }

    // Fall back to default config file
    const response = await fetch('data/category-configs.json');
    if (!response.ok) throw new Error('Failed to load config');
    categoryConfigs = await response.json();
    console.log('Loaded category configs from default file');
  } catch (error) {
    console.error('Failed to load category configs:', error);
    // Fallback to minimal config
    categoryConfigs = {
      categories: [
        {
          key: 'classic',
          label: '經典',
          folder: 'Classic',
          ext: 'svg',
          count: 2,
          options: [
            { key: 'title', label: '主標題', type: 'text' },
            { key: 'subtitle', label: '副標題', type: 'text' }
          ]
        }
      ]
    };
  }
}

// Initialize canvas
function initializeCanvas() {
  canvas = document.getElementById('canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}

// Load saved state from localStorage
function loadSavedState() {
  currentCategory = categoryStorage.getSelectedCategory('classic');
  currentTemplate = categoryStorage.getSelectedTemplate(currentCategory, 0);
  currentPreviewMode = categoryStorage.getPreviewMode(currentCategory, 'template');
  currentTransform = categoryStorage.getPreviewTransform(currentCategory, { scale: 1, offsetX: 0, offsetY: 0, rotate: 0 });
}

// Setup event listeners
function setupEventListeners() {
  // Image upload
  const imageUpload = document.getElementById('image-upload');
  if (imageUpload) {
    imageUpload.addEventListener('change', handleImageUpload);
  }

  // Download button
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadImage);
  }

  // Category dropdown
  const categorySelect = document.getElementById('category-select');
  if (categorySelect) {
    categorySelect.addEventListener('change', handleCategoryChange);
  }

  // Preview mode selector
  const previewModeSelect = document.getElementById('preview-mode-select');
  if (previewModeSelect) {
    previewModeSelect.addEventListener('change', handlePreviewModeChange);
  }

  // Tuning toggle
  const tuningToggle = document.getElementById('tuning-toggle');
  const tuningHeader = document.querySelector('.tuning-header');
  if (tuningHeader) {
    tuningHeader.addEventListener('click', toggleTuningPanel);
  }

  // Transform controls
  setupTransformControls();
}

// Render category dropdown
function renderCategoryDropdown() {
  const categorySelect = document.getElementById('category-select');
  if (!categorySelect || !categoryConfigs) return;

  categorySelect.innerHTML = categoryConfigs.categories.map(category => 
    `<option value="${category.key}" ${category.key === currentCategory ? 'selected' : ''}>
      ${category.label}
    </option>`
  ).join('');
}

// Handle category change
function handleCategoryChange(event) {
  currentCategory = event.target.value;
  currentTemplate = categoryStorage.getSelectedTemplate(currentCategory, 0);
  currentPreviewMode = categoryStorage.getPreviewMode(currentCategory, 'template');
  currentTransform = categoryStorage.getPreviewTransform(currentCategory, { scale: 1, offsetX: 0, offsetY: 0, rotate: 0 });
  categoryStorage.setSelectedCategory(currentCategory);
  updateUIForCategory();
  updateCanvas();
}

// Update UI for current category
function updateUIForCategory() {
  renderTemplatesGrid();
  renderCategoryOptions();
  updatePreviewControls();
  loadTemplateImages();
}

// Render templates grid for current category
function renderTemplatesGrid() {
  const templateGrid = document.getElementById('template-grid');
  if (!templateGrid) return;

  const category = getCurrentCategoryConfig();
  if (!category) return;

  const templates = Array.from({ length: category.count }, (_, index) => {
    const templateNumber = index + 1;
    const templatePath = `assets/templates/${category.folder}/${category.folder}_${templateNumber}.${category.ext}`;
    
    return {
      index,
      name: `${category.label} ${templateNumber}`,
      path: templatePath
    };
  });

  templateGrid.innerHTML = templates.map((template, index) => 
    `<label class="template-card">
      <input type="radio" name="template" value="${template.index}" 
             ${template.index === currentTemplate ? 'checked' : ''}
             onchange="handleTemplateChange(${template.index})">
      <div class="template-preview">
        <img src="${template.path}" alt="${template.name}" class="template-image" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="template-fallback" style="display: none;">
          <div class="demo-title">${template.name}</div>
        </div>
      </div>
      <span class="template-name">${template.name}</span>
    </label>`
  ).join('');
}

// Handle template change
window.handleTemplateChange = function(templateIndex) {
  currentTemplate = templateIndex;
  categoryStorage.setSelectedTemplate(currentCategory, templateIndex);
  
  // Reload foreground image for new template
  const category = getCurrentCategoryConfig();
  if (category) {
    loadImageWithFallback(
      `assets/templates/${category.folder}/${category.folder}_${currentTemplate + 1}`,
      ['jpg', 'svg', 'png'],
      (img) => {
        foregroundImage = img;
        updateCanvas();
      },
      () => {
        console.warn('Foreground image not found for template', currentTemplate + 1);
        foregroundImage = null;
        updateCanvas();
      }
    );
  } else {
    updateCanvas();
  }
};

// Render category-specific options
function renderCategoryOptions() {
  const optionsContainer = document.getElementById('category-options');
  if (!optionsContainer) return;

  const category = getCurrentCategoryConfig();
  if (!category || !category.options) {
    optionsContainer.innerHTML = '<div class="no-options">此類別暫無專屬選項</div>';
    return;
  }

  optionsContainer.innerHTML = category.options.map(option => {
    const value = currentOptions[option.key] || '';
    return renderOptionField(option, value);
  }).join('');
}

// Render individual option field
function renderOptionField(option, value) {
  const { key, label, type } = option;

  switch (type) {
    case 'text':
      return `
        <div class="input-group">
          <label for="option-${key}">${label}</label>
          <input type="text" id="option-${key}" value="${value}" 
                 onchange="handleOptionChange('${key}', this.value)"
                 ${option.maxLength ? `maxlength="${option.maxLength}"` : ''}>
        </div>`;

    case 'textarea':
      return `
        <div class="input-group">
          <label for="option-${key}">${label}</label>
          <textarea id="option-${key}" rows="3" 
                    onchange="handleOptionChange('${key}', this.value)">${value}</textarea>
        </div>`;

    case 'color':
      return `
        <div class="input-group">
          <label for="option-${key}">${label}</label>
          <input type="color" id="option-${key}" value="${value || '#000000'}" 
                 onchange="handleOptionChange('${key}', this.value)">
        </div>`;

    case 'number':
      return `
        <div class="input-group">
          <label for="option-${key}">${label}</label>
          <input type="number" id="option-${key}" value="${value}" 
                 onchange="handleOptionChange('${key}', this.value)"
                 ${option.min !== undefined ? `min="${option.min}"` : ''}
                 ${option.max !== undefined ? `max="${option.max}"` : ''}>
        </div>`;

    case 'select':
      return `
        <div class="input-group">
          <label for="option-${key}">${label}</label>
          <select id="option-${key}" onchange="handleOptionChange('${key}', this.value)">
            ${option.options.map(opt => 
              `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
            ).join('')}
          </select>
        </div>`;

    default:
      return '';
  }
}

// Handle option value change
window.handleOptionChange = function(key, value) {
  currentOptions[key] = value;
  updateCanvas();
};

// Get current category configuration
function getCurrentCategoryConfig() {
  if (!categoryConfigs) return null;
  return categoryConfigs.categories.find(cat => cat.key === currentCategory);
}

// Handle image upload
function handleImageUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('請選擇圖片檔案');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      uploadedImage = img;
      updateCanvas();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Update canvas with current settings
function updateCanvas() {
  if (!ctx) return;

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw based on preview mode
  switch (currentPreviewMode) {
    case 'template':
      drawTemplate();
      break;
    case 'background':
      drawBackground();
      break;
    case 'composite':
      drawComposite();
      break;
    default:
      drawTemplate();
  }

  // Draw uploaded image
  if (uploadedImage) {
    drawUploadedImage();
  }

  // Draw text content
  drawTextContent();
}

// Draw template only
function drawTemplate() {
  if (foregroundImage) {
    ctx.drawImage(foregroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    // Fallback to simple background
    drawBackgroundTemplate();
  }
}

// Draw background only
function drawBackground() {
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    // Fallback to simple background
    drawBackgroundTemplate();
  }
}

// Draw composite (background + transformed foreground)
function drawComposite() {
  // Draw background first
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    drawBackgroundTemplate();
  }

  // Draw transformed foreground
  if (foregroundImage) {
    ctx.save();
    
    // Calculate center point
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    
    // Apply transformations
    ctx.translate(centerX + currentTransform.offsetX, centerY + currentTransform.offsetY);
    ctx.rotate((currentTransform.rotate * Math.PI) / 180);
    ctx.scale(currentTransform.scale, currentTransform.scale);
    
    // Draw foreground centered
    ctx.drawImage(foregroundImage, -CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.restore();
  }
}

// Draw background template
function drawBackgroundTemplate() {
  const category = getCurrentCategoryConfig();
  if (!category) return;

  const templatePath = `assets/templates/${category.folder}/${category.folder}_Empty_1.${category.ext}`;
  
  // For now, just draw a simple background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Add a border
  ctx.strokeStyle = '#e9ecef';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 100);
}

// Draw uploaded image
function drawUploadedImage() {
  const padding = 60;
  const maxWidth = CANVAS_WIDTH - padding * 2;
  const maxHeight = Math.floor(CANVAS_HEIGHT * 0.6) - padding;

  const dims = calculateScaledDimensions(uploadedImage.width, uploadedImage.height, maxWidth, maxHeight);
  const x = (CANVAS_WIDTH - dims.width) / 2;
  const y = padding;

  ctx.drawImage(uploadedImage, x, y, dims.width, dims.height);
}

// Draw text content based on current options
function drawTextContent() {
  const startY = Math.floor(CANVAS_HEIGHT * 0.7);
  let y = startY;
  const centerX = CANVAS_WIDTH / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#333333';

  // Draw each text option
  Object.entries(currentOptions).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      const fontSize = key.includes('title') ? 36 : 24;
      ctx.font = `${fontSize}px Inter, sans-serif`;
      
      const lines = wrapText(value, CANVAS_WIDTH - 100, ctx);
      lines.forEach(line => {
        ctx.fillText(line, centerX, y);
        y += fontSize + 8;
      });
      y += 16;
    }
  });
}

// Utility: calculate scaled dimensions
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

// Utility: wrap text
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
  if (!canvas) {
    alert('Canvas not ready');
    return;
  }
  try {
    const link = document.createElement('a');
    link.download = `${currentCategory}-template-${currentTemplate + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error(e);
    alert('Download failed');
  }
}

// Preview mode and tuning functions
function handlePreviewModeChange(event) {
  currentPreviewMode = event.target.value;
  categoryStorage.setPreviewMode(currentCategory, currentPreviewMode);
  updateCanvas();
}

function updatePreviewControls() {
  // Update preview mode selector
  const previewModeSelect = document.getElementById('preview-mode-select');
  if (previewModeSelect) {
    previewModeSelect.value = currentPreviewMode;
  }

  // Update transform controls
  updateTransformControls();
  
  // Show/hide tuning panel based on mode
  const tuningPanel = document.querySelector('.tuning-panel');
  if (tuningPanel) {
    tuningPanel.style.display = currentPreviewMode === 'composite' ? 'block' : 'none';
  }
}

function updateTransformControls() {
  const scaleRange = document.getElementById('scale-range');
  const offsetXRange = document.getElementById('offsetX-range');
  const offsetYRange = document.getElementById('offsetY-range');
  const rotateRange = document.getElementById('rotate-range');
  
  const scaleValue = document.getElementById('scale-value');
  const offsetXValue = document.getElementById('offsetX-value');
  const offsetYValue = document.getElementById('offsetY-value');
  const rotateValue = document.getElementById('rotate-value');

  if (scaleRange) {
    scaleRange.value = currentTransform.scale;
    if (scaleValue) scaleValue.textContent = currentTransform.scale.toFixed(1);
  }
  if (offsetXRange) {
    offsetXRange.value = currentTransform.offsetX;
    if (offsetXValue) offsetXValue.textContent = currentTransform.offsetX;
  }
  if (offsetYRange) {
    offsetYRange.value = currentTransform.offsetY;
    if (offsetYValue) offsetYValue.textContent = currentTransform.offsetY;
  }
  if (rotateRange) {
    rotateRange.value = currentTransform.rotate;
    if (rotateValue) rotateValue.textContent = currentTransform.rotate + '°';
  }
}

function setupTransformControls() {
  // Scale control
  const scaleRange = document.getElementById('scale-range');
  if (scaleRange) {
    scaleRange.addEventListener('input', (e) => {
      currentTransform.scale = parseFloat(e.target.value);
      document.getElementById('scale-value').textContent = currentTransform.scale.toFixed(1);
      categoryStorage.setPreviewTransform(currentCategory, currentTransform);
      updateCanvas();
    });
  }

  // Offset X control
  const offsetXRange = document.getElementById('offsetX-range');
  if (offsetXRange) {
    offsetXRange.addEventListener('input', (e) => {
      currentTransform.offsetX = parseInt(e.target.value);
      document.getElementById('offsetX-value').textContent = currentTransform.offsetX;
      categoryStorage.setPreviewTransform(currentCategory, currentTransform);
      updateCanvas();
    });
  }

  // Offset Y control
  const offsetYRange = document.getElementById('offsetY-range');
  if (offsetYRange) {
    offsetYRange.addEventListener('input', (e) => {
      currentTransform.offsetY = parseInt(e.target.value);
      document.getElementById('offsetY-value').textContent = currentTransform.offsetY;
      categoryStorage.setPreviewTransform(currentCategory, currentTransform);
      updateCanvas();
    });
  }

  // Rotate control
  const rotateRange = document.getElementById('rotate-range');
  if (rotateRange) {
    rotateRange.addEventListener('input', (e) => {
      currentTransform.rotate = parseInt(e.target.value);
      document.getElementById('rotate-value').textContent = currentTransform.rotate + '°';
      categoryStorage.setPreviewTransform(currentCategory, currentTransform);
      updateCanvas();
    });
  }
}

function toggleTuningPanel() {
  const tuningToggle = document.getElementById('tuning-toggle');
  const tuningContent = document.getElementById('tuning-content');
  
  if (!tuningToggle || !tuningContent) return;
  
  const isExpanded = tuningToggle.getAttribute('aria-expanded') === 'true';
  const newExpanded = !isExpanded;
  
  tuningToggle.setAttribute('aria-expanded', newExpanded);
  tuningContent.style.display = newExpanded ? 'block' : 'none';
}

function loadTemplateImages() {
  const category = getCurrentCategoryConfig();
  if (!category) return;

  // Load background image (Empty template) - try png first for Empty templates
  loadImageWithFallback(
    `assets/templates/${category.folder}/${category.folder}_Empty_1`,
    ['png', 'jpg', 'svg'],
    (img) => {
      backgroundImage = img;
      updateCanvas();
    },
    () => {
      console.warn('Background image not found');
      backgroundImage = null;
      updateCanvas();
    }
  );

  // Load foreground image (current template)
  loadImageWithFallback(
    `assets/templates/${category.folder}/${category.folder}_${currentTemplate + 1}`,
    ['jpg', 'svg', 'png'],
    (img) => {
      foregroundImage = img;
      updateCanvas();
    },
    () => {
      console.warn('Foreground image not found');
      foregroundImage = null;
      updateCanvas();
    }
  );
}

// Helper function to load images with multiple extension fallbacks
function loadImageWithFallback(basePath, extensions, onSuccess, onFailure) {
  function tryExtension(index) {
    if (index >= extensions.length) {
      onFailure();
      return;
    }
    
    const img = new Image();
    const fullPath = `${basePath}.${extensions[index]}`;
    
    img.onload = () => onSuccess(img);
    img.onerror = () => tryExtension(index + 1);
    img.src = fullPath;
  }
  
  tryExtension(0);
}