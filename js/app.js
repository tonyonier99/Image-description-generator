// Main application logic for Image Description Generator
import { categoryStorage } from './storage.js';

// Global state
let currentCategory = 'classic';
let currentTemplate = 0;
let categoryConfigs = null;
let canvas, ctx;
let uploadedImage = null;
let currentOptions = {};

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
  categoryStorage.setSelectedCategory(currentCategory);
  updateUIForCategory();
  updateCanvas();
}

// Update UI for current category
function updateUIForCategory() {
  renderTemplatesGrid();
  renderCategoryOptions();
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
  updateCanvas();
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

  // Draw background template if available
  drawBackgroundTemplate();

  // Draw uploaded image
  if (uploadedImage) {
    drawUploadedImage();
  }

  // Draw text content
  drawTextContent();
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