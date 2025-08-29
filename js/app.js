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
let loadedFonts = [];
let selectedTextField = null;
let textStyles = {};

// Canvas dimensions - will be adjusted based on aspect ratio
let CANVAS_WIDTH = 1200;
let CANVAS_HEIGHT = 1680; // 5:7 aspect ratio

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
  await loadConfigs();
  await loadFonts();
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

// Load fonts from /fonts directory
async function loadFonts() {
  try {
    // Try to load font index
    const response = await fetch('fonts/index.json');
    let fontsConfig = { fonts: [] };
    
    if (response.ok) {
      fontsConfig = await response.json();
    }
    
    // Load fonts using FontFace API
    for (const fontDef of fontsConfig.fonts) {
      try {
        const fontFace = new FontFace(
          fontDef.family,
          `url(${fontDef.src})`,
          {
            weight: fontDef.weight || 'normal',
            style: fontDef.style || 'normal'
          }
        );
        
        await fontFace.load();
        document.fonts.add(fontFace);
        
        loadedFonts.push({
          family: fontDef.family,
          display: fontDef.display || fontDef.family,
          weight: fontDef.weight || 'normal',
          style: fontDef.style || 'normal'
        });
        
        console.log(`Font loaded: ${fontDef.family}`);
      } catch (error) {
        console.warn(`Failed to load font ${fontDef.family}:`, error);
      }
    }
    
    console.log(`Loaded ${loadedFonts.length} fonts`);
  } catch (error) {
    console.warn('Failed to load fonts index:', error);
  }
}

// Apply aspect ratio for category
function applyAspectRatio(category) {
  const aspectRatio = categoryStorage.getAspectRatio(category, '5:7');
  const [w, h] = aspectRatio.split(':').map(Number);
  
  // Update CSS variables
  document.documentElement.style.setProperty('--stage-w', w);
  document.documentElement.style.setProperty('--stage-h', h);
  
  // Update canvas dimensions
  CANVAS_WIDTH = 1200;
  CANVAS_HEIGHT = Math.round(CANVAS_WIDTH * h / w);
  
  if (canvas) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }
}

// Initialize canvas
function initializeCanvas() {
  canvas = document.getElementById('canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  
  // Apply current category aspect ratio
  applyAspectRatio(currentCategory);
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
  
  // Text tuning controls
  setupTextTuningControls();
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
  textStyles = categoryStorage.getTextStyles(currentCategory, {});
  categoryStorage.setSelectedCategory(currentCategory);
  
  // Apply aspect ratio for this category
  applyAspectRatio(currentCategory);
  
  updateUIForCategory();
  updateCanvas();
}

// Update UI for current category
function updateUIForCategory() {
  renderTemplatesGrid();
  renderCategoryOptions();
  updatePreviewControls();
  updateTextTuningPanel();
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
  // Get category config for text fields
  const category = getCurrentCategoryConfig();
  if (!category || !category.options) return;
  
  // Clear existing text layer
  const textLayer = document.getElementById('text-layer');
  if (textLayer) {
    textLayer.innerHTML = '';
  }
  
  // Start at a better position for portrait layout
  const startY = Math.floor(CANVAS_HEIGHT * 0.65);
  let y = startY;
  const centerX = CANVAS_WIDTH / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#333333';

  // Render text for each field
  category.options.forEach((field, index) => {
    if (field.type === 'text' || field.type === 'textarea') {
      const value = currentOptions[field.key] || '';
      if (value) {
        // Get field-specific styles or use defaults
        const fieldStyles = textStyles[field.key] || {};
        const fontSize = fieldStyles.fontSize || (field.key.includes('title') ? 36 : 24);
        const fontFamily = fieldStyles.fontFamily || 'Inter, sans-serif';
        const color = fieldStyles.color || '#333333';
        const align = fieldStyles.align || 'center';
        
        // Apply styles
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        
        // Calculate position
        const x = fieldStyles.x ? fieldStyles.x * CANVAS_WIDTH : centerX;
        const fieldY = fieldStyles.y ? fieldStyles.y * CANVAS_HEIGHT : y;
        
        // Draw text
        if (field.type === 'textarea') {
          const lines = wrapText(value, CANVAS_WIDTH - 100, ctx);
          lines.forEach((line, lineIndex) => {
            ctx.fillText(line, x, fieldY + (lineIndex * (fontSize + 8)));
          });
          y = fieldY + (lines.length * (fontSize + 8)) + 20;
        } else {
          ctx.fillText(value, x, fieldY);
          y = fieldY + fontSize + 20;
        }
        
        // Create text box for dragging if text layer exists
        if (textLayer) {
          createTextBox(textLayer, field, value, fieldStyles);
        }
      }
    }
  });
}

// Create draggable text box for the text layer
function createTextBox(textLayer, field, value, styles) {
  const textBox = document.createElement('div');
  textBox.className = 'text-box';
  textBox.dataset.field = field.key;
  textBox.dataset.align = styles.align || 'center';
  textBox.textContent = value;
  
  // Apply styles
  const fontSize = styles.fontSize || (field.key.includes('title') ? 36 : 24);
  const fontFamily = styles.fontFamily || 'Inter, sans-serif';
  const color = styles.color || '#333333';
  const x = styles.x || 0.5;
  const y = styles.y || 0.5;
  
  textBox.style.fontSize = `${fontSize}px`;
  textBox.style.fontFamily = fontFamily;
  textBox.style.color = color;
  textBox.style.left = `${x * 100}%`;
  textBox.style.top = `${y * 100}%`;
  textBox.style.transform = 'translate(-50%, -50%)';
  
  // Add click handler
  textBox.addEventListener('click', (e) => {
    e.stopPropagation();
    selectTextField(field.key);
  });
  
  // Add drag functionality
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  textBox.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = textLayer.getBoundingClientRect();
    startLeft = (parseFloat(textBox.style.left) / 100) * rect.width;
    startTop = (parseFloat(textBox.style.top) / 100) * rect.height;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const rect = textLayer.getBoundingClientRect();
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    const newLeft = Math.max(0, Math.min(1, (startLeft + deltaX) / rect.width));
    const newTop = Math.max(0, Math.min(1, (startTop + deltaY) / rect.height));
    
    textBox.style.left = `${newLeft * 100}%`;
    textBox.style.top = `${newTop * 100}%`;
    
    // Update styles
    if (!textStyles[field.key]) textStyles[field.key] = {};
    textStyles[field.key].x = newLeft;
    textStyles[field.key].y = newTop;
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      // Save to storage
      categoryStorage.setTextStyles(currentCategory, textStyles);
      updateCanvas();
    }
  });
  
  textLayer.appendChild(textBox);
}

// Select text field for tuning
function selectTextField(fieldKey) {
  selectedTextField = fieldKey;
  
  // Update visual selection
  document.querySelectorAll('.text-box').forEach(box => {
    box.classList.toggle('selected', box.dataset.field === fieldKey);
  });
  
  // Update tuning panel
  updateTextTuningPanel();
}

// Update text tuning panel
function updateTextTuningPanel() {
  const fieldSelect = document.getElementById('text-field-select');
  const tuningControls = document.getElementById('text-tuning-controls');
  
  if (!fieldSelect) return;
  
  // Populate field selector
  const category = getCurrentCategoryConfig();
  if (category && category.options) {
    fieldSelect.innerHTML = '<option value="">請選擇欄位</option>';
    category.options.forEach(field => {
      if (field.type === 'text' || field.type === 'textarea') {
        const option = document.createElement('option');
        option.value = field.key;
        option.textContent = field.label;
        option.selected = field.key === selectedTextField;
        fieldSelect.appendChild(option);
      }
    });
  }
  
  // Show/hide controls based on selection
  if (tuningControls) {
    tuningControls.style.display = selectedTextField ? 'block' : 'none';
    
    if (selectedTextField) {
      updateTextControlValues();
    }
  }
}

// Update text control values
function updateTextControlValues() {
  if (!selectedTextField) return;
  
  const styles = textStyles[selectedTextField] || {};
  
  // Update range inputs
  const elements = {
    'text-x': styles.x || 0.5,
    'text-y': styles.y || 0.5, 
    'text-font-size': styles.fontSize || 24,
    'text-line-height': styles.lineHeight || 1.4
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const input = document.getElementById(id);
    const valueSpan = document.getElementById(id + '-value');
    if (input) {
      input.value = value;
      if (valueSpan) {
        valueSpan.textContent = id === 'text-font-size' ? value + 'px' : value;
      }
    }
  });
  
  // Update selects and color
  const fontFamily = document.getElementById('text-font-family');
  const textAlign = document.getElementById('text-align');
  const textColor = document.getElementById('text-color');
  
  if (fontFamily) fontFamily.value = styles.fontFamily || 'Inter';
  if (textAlign) textAlign.value = styles.align || 'center';
  if (textColor) textColor.value = styles.color || '#333333';
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

// Download current canvas as PNG with proper export sizing
function downloadImage() {
  if (!canvas) {
    alert('Canvas not ready');
    return;
  }
  
  try {
    // Create export canvas with proper portrait dimensions
    const aspectRatio = categoryStorage.getAspectRatio(currentCategory, '5:7');
    const [w, h] = aspectRatio.split(':').map(Number);
    
    // Export at high resolution (1500px width, height computed by ratio)
    const exportWidth = 1500;
    const exportHeight = Math.round(exportWidth * h / w);
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    
    // Fill background
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportWidth, exportHeight);
    
    // Draw background image with cover algorithm
    if (backgroundImage) {
      drawImageWithCover(exportCtx, backgroundImage, 0, 0, exportWidth, exportHeight);
    }
    
    // Draw foreground template with cover algorithm  
    if (foregroundImage) {
      drawImageWithCover(exportCtx, foregroundImage, 0, 0, exportWidth, exportHeight);
    }
    
    // Draw uploaded image
    if (uploadedImage) {
      const padding = Math.floor(exportWidth * 0.05); // 5% padding
      const maxWidth = exportWidth - padding * 2;
      const maxHeight = Math.floor(exportHeight * 0.6) - padding;
      
      const dims = calculateScaledDimensions(uploadedImage.width, uploadedImage.height, maxWidth, maxHeight);
      const x = (exportWidth - dims.width) / 2;
      const y = padding;
      
      exportCtx.drawImage(uploadedImage, x, y, dims.width, dims.height);
    }
    
    // Draw text content at export scale
    drawTextContentForExport(exportCtx, exportWidth, exportHeight);
    
    // Download
    const link = document.createElement('a');
    link.download = `${currentCategory}-template-${currentTemplate + 1}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error(e);
    alert('Download failed');
  }
}

// Draw image with cover behavior (no stretching)
function drawImageWithCover(ctx, image, x, y, width, height) {
  const imageAspect = image.width / image.height;
  const targetAspect = width / height;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  if (imageAspect > targetAspect) {
    // Image is wider - fit height, center horizontally
    drawHeight = height;
    drawWidth = height * imageAspect;
    drawX = x + (width - drawWidth) / 2;
    drawY = y;
  } else {
    // Image is taller - fit width, center vertically
    drawWidth = width;
    drawHeight = width / imageAspect;
    drawX = x;
    drawY = y + (height - drawHeight) / 2;
  }
  
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

// Draw text content for export at higher resolution
function drawTextContentForExport(ctx, exportWidth, exportHeight) {
  const category = getCurrentCategoryConfig();
  if (!category || !category.options) return;
  
  const scaleX = exportWidth / CANVAS_WIDTH;
  const scaleY = exportHeight / CANVAS_HEIGHT;
  
  ctx.textAlign = 'center';
  
  category.options.forEach(field => {
    if ((field.type === 'text' || field.type === 'textarea') && currentOptions[field.key]) {
      const value = currentOptions[field.key];
      const fieldStyles = textStyles[field.key] || {};
      
      // Scale font size
      const fontSize = (fieldStyles.fontSize || (field.key.includes('title') ? 36 : 24)) * Math.min(scaleX, scaleY);
      const fontFamily = fieldStyles.fontFamily || 'Inter, sans-serif';
      const color = fieldStyles.color || '#333333';
      const align = fieldStyles.align || 'center';
      
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      
      // Scale position
      const x = (fieldStyles.x || 0.5) * exportWidth;
      const y = (fieldStyles.y || 0.65) * exportHeight;
      
      if (field.type === 'textarea') {
        const lines = wrapText(value, exportWidth - 100, ctx);
        lines.forEach((line, lineIndex) => {
          ctx.fillText(line, x, y + (lineIndex * (fontSize + 8)));
        });
      } else {
        ctx.fillText(value, x, y);
      }
    }
  });
}

// Preview mode and tuning functions
function handlePreviewModeChange(event) {
  currentPreviewMode = event.target.value;
  categoryStorage.setPreviewMode(currentCategory, currentPreviewMode);
  updatePreviewControls();
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

// Setup text tuning controls
function setupTextTuningControls() {
  // Text tuning toggle
  const textTuningHeader = document.querySelector('#text-tuning-toggle').closest('.tuning-header');
  if (textTuningHeader) {
    textTuningHeader.addEventListener('click', toggleTextTuningPanel);
  }
  
  // Field selector
  const fieldSelect = document.getElementById('text-field-select');
  if (fieldSelect) {
    fieldSelect.addEventListener('change', (e) => {
      selectedTextField = e.target.value;
      updateTextTuningPanel();
    });
  }
  
  // Font family dropdown - populate with loaded fonts
  const fontFamilySelect = document.getElementById('text-font-family');
  if (fontFamilySelect) {
    // Add system fonts
    fontFamilySelect.innerHTML = `
      <option value="Inter">Inter</option>
      <option value="Arial">Arial</option>
      <option value="serif">Serif</option>
    `;
    
    // Add loaded custom fonts
    loadedFonts.forEach(font => {
      const option = document.createElement('option');
      option.value = font.family;
      option.textContent = font.display;
      fontFamilySelect.appendChild(option);
    });
    
    fontFamilySelect.addEventListener('change', updateTextFieldStyle);
  }
  
  // Text controls
  const textControls = [
    'text-x', 'text-y', 'text-font-size', 'text-line-height'
  ];
  
  textControls.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        const valueSpan = document.getElementById(id + '-value');
        if (valueSpan) {
          valueSpan.textContent = id === 'text-font-size' ? e.target.value + 'px' : e.target.value;
        }
        updateTextFieldStyle();
      });
    }
  });
  
  // Text align and color
  const textAlign = document.getElementById('text-align');
  const textColor = document.getElementById('text-color');
  
  if (textAlign) textAlign.addEventListener('change', updateTextFieldStyle);
  if (textColor) textColor.addEventListener('change', updateTextFieldStyle);
  
  // Reset and apply buttons
  const resetBtn = document.getElementById('reset-text-field');
  const applyBtn = document.getElementById('apply-as-default');
  
  if (resetBtn) {
    resetBtn.addEventListener('click', resetTextField);
  }
  
  if (applyBtn) {
    applyBtn.addEventListener('click', applyAsDefault);
  }
  
  // Keyboard navigation for text boxes
  document.addEventListener('keydown', (e) => {
    if (selectedTextField && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      nudgeTextField(e.key, e.shiftKey);
    }
  });
}

// Update text field style from controls
function updateTextFieldStyle() {
  if (!selectedTextField) return;
  
  if (!textStyles[selectedTextField]) {
    textStyles[selectedTextField] = {};
  }
  
  const styles = textStyles[selectedTextField];
  
  // Get values from controls
  const x = document.getElementById('text-x')?.value;
  const y = document.getElementById('text-y')?.value;
  const fontSize = document.getElementById('text-font-size')?.value;
  const lineHeight = document.getElementById('text-line-height')?.value;
  const fontFamily = document.getElementById('text-font-family')?.value;
  const align = document.getElementById('text-align')?.value;
  const color = document.getElementById('text-color')?.value;
  
  // Update styles
  if (x !== undefined) styles.x = parseFloat(x);
  if (y !== undefined) styles.y = parseFloat(y);
  if (fontSize !== undefined) styles.fontSize = parseInt(fontSize);
  if (lineHeight !== undefined) styles.lineHeight = parseFloat(lineHeight);
  if (fontFamily !== undefined) styles.fontFamily = fontFamily;
  if (align !== undefined) styles.align = align;
  if (color !== undefined) styles.color = color;
  
  // Save and update
  categoryStorage.setTextStyles(currentCategory, textStyles);
  updateCanvas();
}

// Toggle text tuning panel
function toggleTextTuningPanel() {
  const toggle = document.getElementById('text-tuning-toggle');
  const content = document.getElementById('text-tuning-content');
  
  if (!toggle || !content) return;
  
  const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
  const newState = !isExpanded;
  
  toggle.setAttribute('aria-expanded', newState);
  content.style.display = newState ? 'block' : 'none';
  
  const icon = toggle.querySelector('.toggle-icon');
  if (icon) {
    icon.textContent = newState ? '▲' : '▼';
  }
  
  // Update field options when opened
  if (newState) {
    updateTextTuningPanel();
  }
}

// Reset text field to defaults
function resetTextField() {
  if (!selectedTextField) return;
  
  delete textStyles[selectedTextField];
  categoryStorage.setTextStyles(currentCategory, textStyles);
  updateTextControlValues();
  updateCanvas();
}

// Apply current settings as default
function applyAsDefault() {
  if (!selectedTextField) return;
  
  // This would save to admin config - for now just show message
  alert('功能開發中：將在管理面板中實現設為預設功能');
}

// Nudge text field with keyboard
function nudgeTextField(direction, shiftKey) {
  if (!selectedTextField) return;
  
  const step = shiftKey ? 0.01 : 0.001; // Shift = 10x larger step
  
  if (!textStyles[selectedTextField]) {
    textStyles[selectedTextField] = { x: 0.5, y: 0.5 };
  }
  
  const styles = textStyles[selectedTextField];
  
  switch (direction) {
    case 'ArrowUp':
      styles.y = Math.max(0, (styles.y || 0.5) - step);
      break;
    case 'ArrowDown':
      styles.y = Math.min(1, (styles.y || 0.5) + step);
      break;
    case 'ArrowLeft':
      styles.x = Math.max(0, (styles.x || 0.5) - step);
      break;
    case 'ArrowRight':
      styles.x = Math.min(1, (styles.x || 0.5) + step);
      break;
  }
  
  categoryStorage.setTextStyles(currentCategory, textStyles);
  updateTextControlValues();
  updateCanvas();
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