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

// Guide and safe area state
let guidesEnabled = false;
let safeAreaEnabled = false;
let snapEnabled = false;
let safeAreaPadding = 0.08;

// Export settings state
let exportSettings = {
  preset: 'current',
  format: 'png',
  quality: 0.9,
  customWidth: 1200,
  customHeight: 1680
};

// Undo/redo system state
let historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

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
  setupUndoRedoSystem();
  checkAdminUnlock(); // Check if admin should be unlocked
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
    // First try to load admin-configured fonts
    const adminFonts = localStorage.getItem('idg:fonts-config');
    let fontsConfig = { fonts: [] };
    
    if (adminFonts) {
      fontsConfig = JSON.parse(adminFonts);
      console.log('Loading fonts from admin configuration');
    } else {
      // Fall back to fonts/index.json
      const response = await fetch('fonts/index.json');
      if (response.ok) {
        fontsConfig = await response.json();
        console.log('Loading fonts from fonts/index.json');
      }
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
    console.warn('Failed to load fonts:', error);
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
  
  // Guides and safe area controls
  setupGuidesControls();
  
  // Export controls
  setupExportControls();
  
  // Settings controls
  setupSettingsControls();
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
  const oldValue = currentOptions[key];
  currentOptions[key] = value;
  updateCanvas();
  
  // Save history state for text content changes
  if (oldValue !== value) {
    saveHistoryState(`Text content "${key}" changed`);
  }
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
        // Get field-specific styles, admin defaults, or fallback defaults
        const adminDefaults = getAdminTextDefaults(currentCategory, field.key);
        const fieldStyles = textStyles[field.key] || {};
        
        const baseFontSize = fieldStyles.fontSize || adminDefaults.fontSize || (field.key.includes('title') ? 36 : 24);
        const fontFamily = fieldStyles.fontFamily || adminDefaults.fontFamily || 'Inter, sans-serif';
        const color = fieldStyles.color || adminDefaults.color || '#333333';
        const align = fieldStyles.align || adminDefaults.align || 'center';
        
        // Auto-fit settings
        const autoFitEnabled = fieldStyles.autoFit || false;
        const autoFitStrategy = fieldStyles.autoFitStrategy || 'shrink';
        const minFontSize = fieldStyles.minFontSize || 12;
        const maxFontSize = fieldStyles.maxFontSize || 120;
        const maxWidthRatio = fieldStyles.maxWidth || 0.8;
        const maxWidth = CANVAS_WIDTH * maxWidthRatio;
        
        // Calculate position with admin defaults
        const x = fieldStyles.x ? fieldStyles.x * CANVAS_WIDTH : 
                  adminDefaults.x ? adminDefaults.x * CANVAS_WIDTH : centerX;
        const fieldY = fieldStyles.y ? fieldStyles.y * CANVAS_HEIGHT : 
                      adminDefaults.y ? adminDefaults.y * CANVAS_HEIGHT : y;
        
        let fontSize = baseFontSize;
        let lines = [];
        
        // Apply auto-fit if enabled
        if (autoFitEnabled) {
          const maxHeight = CANVAS_HEIGHT * 0.2; // Limit text height to 20% of canvas
          ctx.font = `${baseFontSize}px ${fontFamily}`;
          
          if (field.type === 'textarea') {
            const result = autoFitText(value, maxWidth, maxHeight, baseFontSize, minFontSize, maxFontSize, autoFitStrategy, ctx);
            fontSize = result.fontSize;
            lines = result.lines;
          } else {
            // Single line text - just check if it fits and shrink if needed
            ctx.font = `${baseFontSize}px ${fontFamily}`;
            if (ctx.measureText(value).width > maxWidth && autoFitStrategy !== 'reflow') {
              for (fontSize = baseFontSize; fontSize >= minFontSize; fontSize -= 1) {
                ctx.font = `${fontSize}px ${fontFamily}`;
                if (ctx.measureText(value).width <= maxWidth) {
                  break;
                }
              }
            }
            lines = [value];
          }
        } else {
          // Use normal wrapping
          ctx.font = `${fontSize}px ${fontFamily}`;
          if (field.type === 'textarea') {
            lines = wrapText(value, maxWidth, ctx);
          } else {
            lines = [value];
          }
        }
        
        // Prepare text effects styles
        const textEffectStyles = {
          strokeEnabled: fieldStyles.strokeEnabled || false,
          strokeWidth: fieldStyles.strokeWidth || 2,
          strokeColor: fieldStyles.strokeColor || '#ffffff',
          bgEnabled: fieldStyles.bgEnabled || false,
          bgColor: fieldStyles.bgColor || '#000000',
          bgOpacity: fieldStyles.bgOpacity || 0.7,
          bgPadding: fieldStyles.bgPadding || 8,
          bgRadius: fieldStyles.bgRadius || 4,
          fontSize,
          fontFamily,
          color,
          align
        };
        
        // Draw text with effects
        lines.forEach((line, lineIndex) => {
          const lineY = fieldY + (lineIndex * (fontSize * 1.4));
          drawTextWithEffects(ctx, line, x, lineY, textEffectStyles);
        });
        
        y = fieldY + (lines.length * (fontSize * 1.4)) + 20;
        
        // Create text box for dragging if text layer exists
        if (textLayer) {
          createTextBox(textLayer, field, value, { ...fieldStyles, fontSize, maxWidth: maxWidthRatio });
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
  
  // Apply styles with admin defaults
  const adminDefaults = getAdminTextDefaults(currentCategory, field.key);
  const fontSize = styles.fontSize || adminDefaults.fontSize || (field.key.includes('title') ? 36 : 24);
  const fontFamily = styles.fontFamily || adminDefaults.fontFamily || 'Inter, sans-serif';
  const color = styles.color || adminDefaults.color || '#333333';
  const x = styles.x !== undefined ? styles.x : (adminDefaults.x !== undefined ? adminDefaults.x : 0.5);
  const y = styles.y !== undefined ? styles.y : (adminDefaults.y !== undefined ? adminDefaults.y : 0.5);
  const maxWidth = styles.maxWidth || 0.8;
  const locked = styles.locked || false;
  
  textBox.style.fontSize = `${fontSize}px`;
  textBox.style.fontFamily = fontFamily;
  textBox.style.color = color;
  textBox.style.left = `${x * 100}%`;
  textBox.style.top = `${y * 100}%`;
  textBox.style.transform = 'translate(-50%, -50%)';
  textBox.style.maxWidth = `${maxWidth * 100}%`;
  textBox.style.whiteSpace = 'pre-wrap';
  textBox.style.textAlign = styles.align || 'center';
  
  // Add lock indicator
  if (locked) {
    textBox.classList.add('locked');
    textBox.style.cursor = 'not-allowed';
    textBox.title = '此文字框已鎖定';
  }
  
  // Create width handle
  const widthHandle = document.createElement('div');
  widthHandle.className = 'width-handle';
  widthHandle.style.position = 'absolute';
  widthHandle.style.right = '-8px';
  widthHandle.style.top = '50%';
  widthHandle.style.transform = 'translateY(-50%)';
  widthHandle.style.width = '16px';
  widthHandle.style.height = '100%';
  widthHandle.style.background = 'rgba(33, 150, 243, 0.5)';
  widthHandle.style.cursor = 'ew-resize';
  widthHandle.style.borderRadius = '0 4px 4px 0';
  widthHandle.title = `寬度: ${Math.round(maxWidth * 100)}%`;
  
  if (!locked) {
    textBox.appendChild(widthHandle);
  }
  
  // Add click handler for field selection
  textBox.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!locked) {
      selectTextField(field.key);
    }
  });
  
  if (!locked) {
    // Add drag functionality for position
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startLeft, startTop, startWidth;
    
    textBox.addEventListener('mousedown', (e) => {
      if (e.target === widthHandle) return; // Let width handle handle this
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = textLayer.getBoundingClientRect();
      startLeft = (parseFloat(textBox.style.left) / 100) * rect.width;
      startTop = (parseFloat(textBox.style.top) / 100) * rect.height;
      e.preventDefault();
    });
    
    // Width handle drag functionality
    widthHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = maxWidth;
      e.stopPropagation();
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const rect = textLayer.getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newX = startLeft + deltaX;
        let newY = startTop + deltaY;
        
        // Apply snapping if enabled
        const snapped = snapToGuides(newX, newY);
        newX = snapped.x;
        newY = snapped.y;
        
        const newLeft = Math.max(0, Math.min(1, newX / rect.width));
        const newTop = Math.max(0, Math.min(1, newY / rect.height));
        
        textBox.style.left = `${newLeft * 100}%`;
        textBox.style.top = `${newTop * 100}%`;
        
        // Update styles
        if (!textStyles[field.key]) textStyles[field.key] = {};
        textStyles[field.key].x = newLeft;
        textStyles[field.key].y = newTop;
      } else if (isResizing) {
        const rect = textLayer.getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const widthChange = deltaX / rect.width;
        const newWidth = Math.max(0.2, Math.min(1, startWidth + widthChange));
        
        textBox.style.maxWidth = `${newWidth * 100}%`;
        widthHandle.title = `寬度: ${Math.round(newWidth * 100)}%`;
        
        // Update styles
        if (!textStyles[field.key]) textStyles[field.key] = {};
        textStyles[field.key].maxWidth = newWidth;
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        // Save to storage
        categoryStorage.setTextStyles(currentCategory, textStyles);
        updateCanvas();
        
        // Save history state
        const action = isDragging ? 'moved' : 'resized';
        saveHistoryState(`Text field "${field.key}" ${action}`);
      }
    });
  }
  
  textLayer.appendChild(textBox);
}

// Get admin-configured text defaults for a field
function getAdminTextDefaults(categoryKey, fieldKey) {
  try {
    const textDefaults = JSON.parse(localStorage.getItem('idg:text-defaults') || '{}');
    return textDefaults[categoryKey]?.[fieldKey] || {};
  } catch (error) {
    console.warn('Failed to load admin text defaults:', error);
    return {};
  }
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
    'text-line-height': styles.lineHeight || 1.4,
    'text-min-font-size': styles.minFontSize || 12,
    'text-max-font-size': styles.maxFontSize || 120,
    'text-max-width': styles.maxWidth || 0.8,
    'text-stroke-width': styles.strokeWidth || 2,
    'text-bg-padding': styles.bgPadding || 8,
    'text-bg-radius': styles.bgRadius || 4,
    'text-bg-opacity': styles.bgOpacity || 0.7
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const input = document.getElementById(id);
    const valueSpan = document.getElementById(id + '-value');
    if (input) {
      input.value = value;
      if (valueSpan) {
        let displayValue = value;
        if (id.includes('font-size') || id.includes('stroke-width') || id.includes('bg-padding') || id.includes('bg-radius')) {
          displayValue += 'px';
        } else if (id === 'text-max-width') {
          displayValue = Math.round(value * 100) + '%';
        }
        valueSpan.textContent = displayValue;
      }
    }
  });
  
  // Update checkboxes
  const checkboxes = {
    'text-autofit': styles.autoFit || false,
    'text-locked': styles.locked || false,
    'text-stroke-enabled': styles.strokeEnabled || false,
    'text-bg-enabled': styles.bgEnabled || false
  };
  
  Object.entries(checkboxes).forEach(([id, value]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.checked = value;
      
      // Handle auto-fit controls visibility
      if (id === 'text-autofit') {
        const autofitControls = document.getElementById('autofit-size-controls');
        if (autofitControls) {
          autofitControls.style.display = value ? 'flex' : 'none';
        }
      }
    }
  });
  
  // Update selects and colors
  const fontFamily = document.getElementById('text-font-family');
  const textAlign = document.getElementById('text-align');
  const textColor = document.getElementById('text-color');
  const autoFitStrategy = document.getElementById('text-autofit-strategy');
  const strokeColor = document.getElementById('text-stroke-color');
  const bgColor = document.getElementById('text-bg-color');
  
  if (fontFamily) fontFamily.value = styles.fontFamily || 'Inter';
  if (textAlign) textAlign.value = styles.align || 'center';
  if (textColor) textColor.value = styles.color || '#333333';
  if (autoFitStrategy) autoFitStrategy.value = styles.autoFitStrategy || 'shrink';
  if (strokeColor) strokeColor.value = styles.strokeColor || '#ffffff';
  if (bgColor) bgColor.value = styles.bgColor || '#000000';
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

// Utility: auto-fit text based on strategy
function autoFitText(text, maxWidth, maxHeight, baseFont, minFont, maxFont, strategy, context) {
  if (!text || !context) return { fontSize: baseFont, lines: [] };
  
  // Test if text fits at base size
  context.font = `${baseFont}px ${context.font.split(' ').slice(1).join(' ')}`;
  let lines = wrapText(text, maxWidth, context);
  let fontSize = baseFont;
  
  // Calculate line height (approximate)
  const lineHeight = fontSize * 1.4;
  const totalHeight = lines.length * lineHeight;
  
  if (totalHeight <= maxHeight && lines.every(line => context.measureText(line).width <= maxWidth)) {
    return { fontSize, lines };
  }
  
  switch (strategy) {
    case 'shrink':
      // Shrink font size until it fits
      for (fontSize = baseFont; fontSize >= minFont; fontSize -= 1) {
        context.font = `${fontSize}px ${context.font.split(' ').slice(1).join(' ')}`;
        lines = wrapText(text, maxWidth, context);
        const currentHeight = lines.length * fontSize * 1.4;
        
        if (currentHeight <= maxHeight && lines.every(line => context.measureText(line).width <= maxWidth)) {
          break;
        }
      }
      break;
      
    case 'reflow':
      // Keep font size, adjust line wrapping by reducing effective width
      fontSize = baseFont;
      context.font = `${fontSize}px ${context.font.split(' ').slice(1).join(' ')}`;
      let testWidth = maxWidth;
      
      while (testWidth > maxWidth * 0.3) {
        lines = wrapText(text, testWidth, context);
        const currentHeight = lines.length * fontSize * 1.4;
        
        if (currentHeight <= maxHeight) {
          break;
        }
        testWidth -= 10;
      }
      break;
      
    case 'hybrid':
      // Try reflow first, then shrink if needed
      fontSize = baseFont;
      context.font = `${fontSize}px ${context.font.split(' ').slice(1).join(' ')}`;
      let effectiveWidth = maxWidth;
      
      // First try reducing width
      while (effectiveWidth > maxWidth * 0.5) {
        lines = wrapText(text, effectiveWidth, context);
        const currentHeight = lines.length * fontSize * 1.4;
        
        if (currentHeight <= maxHeight) {
          maxWidth = effectiveWidth; // Update for final calculation
          break;
        }
        effectiveWidth -= 10;
      }
      
      // Then shrink font if still doesn't fit
      for (fontSize = baseFont; fontSize >= minFont; fontSize -= 1) {
        context.font = `${fontSize}px ${context.font.split(' ').slice(1).join(' ')}`;
        lines = wrapText(text, maxWidth, context);
        const currentHeight = lines.length * fontSize * 1.4;
        
        if (currentHeight <= maxHeight) {
          break;
        }
      }
      break;
  }
  
  return { fontSize: Math.max(fontSize, minFont), lines };
}

// Utility: draw text with effects (stroke and background)
function drawTextWithEffects(ctx, text, x, y, styles) {
  const {
    strokeEnabled = false,
    strokeWidth = 2,
    strokeColor = '#ffffff',
    bgEnabled = false,
    bgColor = '#000000',
    bgOpacity = 0.7,
    bgPadding = 8,
    bgRadius = 4,
    fontSize = 24,
    fontFamily = 'Inter',
    color = '#333333',
    align = 'center'
  } = styles;
  
  // Set up text properties
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = align;
  
  // Measure text for background
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize; // Approximate
  
  // Calculate background position based on alignment
  let bgX = x;
  if (align === 'center') {
    bgX = x - textWidth / 2;
  } else if (align === 'right') {
    bgX = x - textWidth;
  }
  
  // Draw background box if enabled
  if (bgEnabled) {
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = bgOpacity;
    
    const boxX = bgX - bgPadding;
    const boxY = y - textHeight - bgPadding / 2;
    const boxWidth = textWidth + bgPadding * 2;
    const boxHeight = textHeight + bgPadding;
    
    if (bgRadius > 0) {
      drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, bgRadius);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }
    
    ctx.restore();
  }
  
  // Draw text stroke if enabled
  if (strokeEnabled) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  
  // Draw text fill
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Utility: draw rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Safe area and guides functionality
function updateSafeAreaOverlay() {
  const overlay = document.getElementById('safe-area-overlay');
  const border = overlay.querySelector('.safe-area-border');
  
  if (!safeAreaEnabled) {
    overlay.style.display = 'none';
    return;
  }
  
  overlay.style.display = 'block';
  
  const container = document.querySelector('.canvas-container');
  const rect = container.getBoundingClientRect();
  const padding = safeAreaPadding;
  
  const left = rect.width * padding;
  const top = rect.height * padding;
  const width = rect.width * (1 - padding * 2);
  const height = rect.height * (1 - padding * 2);
  
  border.style.left = `${left}px`;
  border.style.top = `${top}px`;
  border.style.width = `${width}px`;
  border.style.height = `${height}px`;
}

function updateGuidesOverlay() {
  const overlay = document.getElementById('guides-overlay');
  
  if (!guidesEnabled) {
    overlay.style.display = 'none';
    return;
  }
  
  overlay.style.display = 'block';
}

function snapToGuides(x, y, threshold = 10) {
  if (!snapEnabled) return { x, y };
  
  const container = document.querySelector('.canvas-container');
  const rect = container.getBoundingClientRect();
  
  // Center lines
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // Third lines
  const thirdX1 = rect.width / 3;
  const thirdX2 = (rect.width * 2) / 3;
  const thirdY1 = rect.height / 3;
  const thirdY2 = (rect.height * 2) / 3;
  
  // Safe area boundaries
  const safeLeft = rect.width * safeAreaPadding;
  const safeRight = rect.width * (1 - safeAreaPadding);
  const safeTop = rect.height * safeAreaPadding;
  const safeBottom = rect.height * (1 - safeAreaPadding);
  
  let snappedX = x;
  let snappedY = y;
  
  // Snap to vertical guides
  const verticalGuides = [0, safeLeft, thirdX1, centerX, thirdX2, safeRight, rect.width];
  for (const guide of verticalGuides) {
    if (Math.abs(x - guide) < threshold) {
      snappedX = guide;
      break;
    }
  }
  
  // Snap to horizontal guides
  const horizontalGuides = [0, safeTop, thirdY1, centerY, thirdY2, safeBottom, rect.height];
  for (const guide of horizontalGuides) {
    if (Math.abs(y - guide) < threshold) {
      snappedY = guide;
      break;
    }
  }
  
  return { x: snappedX, y: snappedY };
}

// Export presets functionality
function getExportDimensions() {
  const preset = exportSettings.preset;
  
  switch (preset) {
    case 'ig-post':
      return { width: 1080, height: 1350 };
    case 'ig-story':
    case 'ig-reel':
      return { width: 1080, height: 1920 };
    case 'facebook':
      return { width: 1200, height: 630 };
    case 'twitter':
      return { width: 1200, height: 675 };
    case 'linkedin':
      return { width: 1200, height: 627 };
    case 'custom':
      return { width: exportSettings.customWidth, height: exportSettings.customHeight };
    case 'current':
    default:
      return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  }
}

function updateExportControls() {
  const preset = document.getElementById('export-preset').value;
  const customControls = document.getElementById('custom-size-controls');
  const format = document.getElementById('export-format').value;
  const qualityControl = document.getElementById('quality-control');
  
  // Show/hide custom size controls
  customControls.style.display = preset === 'custom' ? 'flex' : 'none';
  
  // Show/hide quality control for lossy formats
  qualityControl.style.display = (format === 'jpeg' || format === 'webp') ? 'flex' : 'none';
  
  // Update export settings
  exportSettings.preset = preset;
  exportSettings.format = format;
  
  if (preset === 'custom') {
    exportSettings.customWidth = parseInt(document.getElementById('export-width').value) || 1200;
    exportSettings.customHeight = parseInt(document.getElementById('export-height').value) || 1680;
  }
}

// Download current canvas as PNG with proper export sizing
function downloadImage() {
  if (!canvas) {
    alert('Canvas not ready');
    return;
  }
  
  try {
    // Get export dimensions from settings
    const dimensions = getExportDimensions();
    const exportWidth = dimensions.width;
    const exportHeight = dimensions.height;
    
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
    
    // Convert to appropriate format
    let mimeType, quality, extension;
    
    switch (exportSettings.format) {
      case 'jpeg':
        mimeType = 'image/jpeg';
        quality = exportSettings.quality;
        extension = 'jpg';
        break;
      case 'webp':
        mimeType = 'image/webp';
        quality = exportSettings.quality;
        extension = 'webp';
        break;
      case 'png':
      default:
        mimeType = 'image/png';
        quality = undefined;
        extension = 'png';
        break;
    }
    
    // Download
    const link = document.createElement('a');
    const preset = exportSettings.preset === 'current' ? 'custom' : exportSettings.preset;
    link.download = `${currentCategory}-${preset}-${exportWidth}x${exportHeight}.${extension}`;
    link.href = exportCanvas.toDataURL(mimeType, quality);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const adminDefaults = getAdminTextDefaults(currentCategory, field.key);
      const fieldStyles = textStyles[field.key] || {};
      
      // Scale font size
      const fontSize = (fieldStyles.fontSize || adminDefaults.fontSize || (field.key.includes('title') ? 36 : 24)) * Math.min(scaleX, scaleY);
      const fontFamily = fieldStyles.fontFamily || adminDefaults.fontFamily || 'Inter, sans-serif';
      const color = fieldStyles.color || adminDefaults.color || '#333333';
      const align = fieldStyles.align || adminDefaults.align || 'center';
      
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      
      // Scale position
      const x = (fieldStyles.x !== undefined ? fieldStyles.x : (adminDefaults.x !== undefined ? adminDefaults.x : 0.5)) * exportWidth;
      const y = (fieldStyles.y !== undefined ? fieldStyles.y : (adminDefaults.y !== undefined ? adminDefaults.y : 0.65)) * exportHeight;
      
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
      saveHistoryState('Transform scale changed');
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
      saveHistoryState('Transform offset X changed');
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
      saveHistoryState('Transform offset Y changed');
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
      saveHistoryState('Transform rotate changed');
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
    'text-x', 'text-y', 'text-font-size', 'text-line-height',
    'text-min-font-size', 'text-max-font-size', 'text-max-width',
    'text-stroke-width', 'text-bg-padding', 'text-bg-radius', 'text-bg-opacity'
  ];
  
  textControls.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        const valueSpan = document.getElementById(id + '-value');
        if (valueSpan) {
          let displayValue = e.target.value;
          if (id === 'text-font-size' || id === 'text-min-font-size' || id === 'text-max-font-size') {
            displayValue += 'px';
          } else if (id === 'text-max-width') {
            displayValue = Math.round(parseFloat(e.target.value) * 100) + '%';
          } else if (id === 'text-stroke-width' || id === 'text-bg-padding' || id === 'text-bg-radius') {
            displayValue += 'px';
          }
          valueSpan.textContent = displayValue;
        }
        updateTextFieldStyle();
      });
    }
  });
  
  // Checkbox controls
  const checkboxControls = ['text-autofit', 'text-locked', 'text-stroke-enabled', 'text-bg-enabled'];
  checkboxControls.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (id === 'text-autofit') {
          // Show/hide autofit controls
          const autofitControls = document.getElementById('autofit-size-controls');
          if (autofitControls) {
            autofitControls.style.display = e.target.checked ? 'flex' : 'none';
          }
        }
        updateTextFieldStyle();
      });
    }
  });
  
  // Select controls
  const selectControls = ['text-align', 'text-autofit-strategy'];
  selectControls.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.addEventListener('change', updateTextFieldStyle);
    }
  });
  
  // Color controls
  const colorControls = ['text-color', 'text-stroke-color', 'text-bg-color'];
  colorControls.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('change', updateTextFieldStyle);
    }
  });
  
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
  
  // Auto-fit controls
  const autoFit = document.getElementById('text-autofit')?.checked;
  const autoFitStrategy = document.getElementById('text-autofit-strategy')?.value;
  const minFontSize = document.getElementById('text-min-font-size')?.value;
  const maxFontSize = document.getElementById('text-max-font-size')?.value;
  const maxWidth = document.getElementById('text-max-width')?.value;
  const locked = document.getElementById('text-locked')?.checked;
  
  // Text effects controls
  const strokeEnabled = document.getElementById('text-stroke-enabled')?.checked;
  const strokeWidth = document.getElementById('text-stroke-width')?.value;
  const strokeColor = document.getElementById('text-stroke-color')?.value;
  const bgEnabled = document.getElementById('text-bg-enabled')?.checked;
  const bgColor = document.getElementById('text-bg-color')?.value;
  const bgOpacity = document.getElementById('text-bg-opacity')?.value;
  const bgPadding = document.getElementById('text-bg-padding')?.value;
  const bgRadius = document.getElementById('text-bg-radius')?.value;
  
  // Update styles object
  if (x !== undefined) styles.x = parseFloat(x);
  if (y !== undefined) styles.y = parseFloat(y);
  if (fontSize !== undefined) styles.fontSize = parseInt(fontSize);
  if (lineHeight !== undefined) styles.lineHeight = parseFloat(lineHeight);
  if (fontFamily !== undefined) styles.fontFamily = fontFamily;
  if (align !== undefined) styles.align = align;
  if (color !== undefined) styles.color = color;
  
  // Auto-fit properties
  if (autoFit !== undefined) styles.autoFit = autoFit;
  if (autoFitStrategy !== undefined) styles.autoFitStrategy = autoFitStrategy;
  if (minFontSize !== undefined) styles.minFontSize = parseInt(minFontSize);
  if (maxFontSize !== undefined) styles.maxFontSize = parseInt(maxFontSize);
  if (maxWidth !== undefined) styles.maxWidth = parseFloat(maxWidth);
  if (locked !== undefined) styles.locked = locked;
  
  // Text effects properties
  if (strokeEnabled !== undefined) styles.strokeEnabled = strokeEnabled;
  if (strokeWidth !== undefined) styles.strokeWidth = parseInt(strokeWidth);
  if (strokeColor !== undefined) styles.strokeColor = strokeColor;
  if (bgEnabled !== undefined) styles.bgEnabled = bgEnabled;
  if (bgColor !== undefined) styles.bgColor = bgColor;
  if (bgOpacity !== undefined) styles.bgOpacity = parseFloat(bgOpacity);
  if (bgPadding !== undefined) styles.bgPadding = parseInt(bgPadding);
  if (bgRadius !== undefined) styles.bgRadius = parseInt(bgRadius);
  
  // Save and update
  categoryStorage.setTextStyles(currentCategory, textStyles);
  updateCanvas();
  
  // Save history state for significant changes
  if (fontSize !== undefined || x !== undefined || y !== undefined || 
      fontFamily !== undefined || align !== undefined || color !== undefined ||
      autoFit !== undefined || strokeEnabled !== undefined || bgEnabled !== undefined) {
    saveHistoryState(`Text field "${selectedTextField}" updated`);
  }
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
  
  // Save history state
  saveHistoryState(`Text field "${selectedTextField}" nudged ${direction}`);
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

// Setup guides and safe area controls
function setupGuidesControls() {
  const safeAreaToggle = document.getElementById('safe-area-toggle');
  const guidesToggle = document.getElementById('guides-toggle');
  const snapToggle = document.getElementById('snap-toggle');
  const safeAreaPreset = document.getElementById('safe-area-preset');
  
  if (safeAreaToggle) {
    safeAreaToggle.addEventListener('change', (e) => {
      safeAreaEnabled = e.target.checked;
      updateSafeAreaOverlay();
    });
  }
  
  if (guidesToggle) {
    guidesToggle.addEventListener('change', (e) => {
      guidesEnabled = e.target.checked;
      updateGuidesOverlay();
    });
  }
  
  if (snapToggle) {
    snapToggle.addEventListener('change', (e) => {
      snapEnabled = e.target.checked;
    });
  }
  
  if (safeAreaPreset) {
    safeAreaPreset.addEventListener('change', (e) => {
      const value = e.target.value;
      if (value !== 'custom') {
        safeAreaPadding = parseFloat(value);
        updateSafeAreaOverlay();
      }
    });
  }
  
  // Window resize handler to update overlays
  window.addEventListener('resize', () => {
    setTimeout(() => {
      updateSafeAreaOverlay();
      updateGuidesOverlay();
    }, 100);
  });
}

// Setup export controls
function setupExportControls() {
  const exportPreset = document.getElementById('export-preset');
  const exportFormat = document.getElementById('export-format');
  const exportQuality = document.getElementById('export-quality');
  const exportWidth = document.getElementById('export-width');
  const exportHeight = document.getElementById('export-height');
  
  if (exportPreset) {
    exportPreset.addEventListener('change', updateExportControls);
  }
  
  if (exportFormat) {
    exportFormat.addEventListener('change', updateExportControls);
  }
  
  if (exportQuality) {
    exportQuality.addEventListener('input', (e) => {
      exportSettings.quality = parseFloat(e.target.value);
      const valueSpan = document.getElementById('export-quality-value');
      if (valueSpan) {
        valueSpan.textContent = Math.round(exportSettings.quality * 100) + '%';
      }
    });
  }
  
  if (exportWidth) {
    exportWidth.addEventListener('input', (e) => {
      exportSettings.customWidth = parseInt(e.target.value) || 1200;
    });
  }
  
  if (exportHeight) {
    exportHeight.addEventListener('input', (e) => {
      exportSettings.customHeight = parseInt(e.target.value) || 1680;
    });
  }
  
  // Update controls on initialization
  updateExportControls();
}

// Undo/Redo system
function saveHistoryState(description = 'Action') {
  // Create a snapshot of the current state
  const state = {
    timestamp: Date.now(),
    description,
    textStyles: JSON.parse(JSON.stringify(textStyles)),
    currentOptions: JSON.parse(JSON.stringify(currentOptions)),
    currentTransform: JSON.parse(JSON.stringify(currentTransform))
  };
  
  // Remove any states after the current index (when we're not at the end)
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  
  // Add new state
  historyStack.push(state);
  
  // Limit history size
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  } else {
    historyIndex++;
  }
  
  console.log(`History saved: ${description} (${historyIndex + 1}/${historyStack.length})`);
}

function undo() {
  if (historyIndex <= 0) {
    console.log('Nothing to undo');
    return false;
  }
  
  historyIndex--;
  const state = historyStack[historyIndex];
  
  // Restore state
  textStyles = JSON.parse(JSON.stringify(state.textStyles));
  currentOptions = JSON.parse(JSON.stringify(state.currentOptions));
  currentTransform = JSON.parse(JSON.stringify(state.currentTransform));
  
  // Update UI
  updateTextControlValues();
  updateTransformControls();
  updateUIForCategory();
  updateCanvas();
  
  // Save to storage
  categoryStorage.setTextStyles(currentCategory, textStyles);
  categoryStorage.setPreviewTransform(currentCategory, currentTransform);
  
  console.log(`Undo: ${state.description} (${historyIndex + 1}/${historyStack.length})`);
  return true;
}

function redo() {
  if (historyIndex >= historyStack.length - 1) {
    console.log('Nothing to redo');
    return false;
  }
  
  historyIndex++;
  const state = historyStack[historyIndex];
  
  // Restore state
  textStyles = JSON.parse(JSON.stringify(state.textStyles));
  currentOptions = JSON.parse(JSON.stringify(state.currentOptions));
  currentTransform = JSON.parse(JSON.stringify(state.currentTransform));
  
  // Update UI
  updateTextControlValues();
  updateTransformControls();
  updateUIForCategory();
  updateCanvas();
  
  // Save to storage
  categoryStorage.setTextStyles(currentCategory, textStyles);
  categoryStorage.setPreviewTransform(currentCategory, currentTransform);
  
  console.log(`Redo: ${state.description} (${historyIndex + 1}/${historyStack.length})`);
  return true;
}

function setupUndoRedoSystem() {
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.shiftKey && e.key.toLowerCase() === 'z') {
        // Ctrl/Cmd + Shift + Z = Redo
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === 'z') {
        // Ctrl/Cmd + Z = Undo
        e.preventDefault();
        undo();
      }
    }
  });
  
  // Save initial state
  setTimeout(() => {
    saveHistoryState('Initial state');
  }, 1000);
}

// Settings import/export functionality
function exportUserSettings() {
  try {
    // Collect all settings to export (excluding blobs/images)
    const settings = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      category: currentCategory,
      textStyles: categoryStorage.getTextStyles(currentCategory),
      exportPreferences: exportSettings,
      safeAreaSettings: {
        enabled: safeAreaEnabled,
        padding: safeAreaPadding,
        guidesEnabled: guidesEnabled,
        snapEnabled: snapEnabled
      },
      // Include config overrides if any
      configOverrides: categoryStorage.getConfigsOverride(),
      // Include current options (text content)
      currentOptions: currentOptions
    };
    
    // Create download
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `idg-settings-${currentCategory}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Settings exported successfully');
    alert('設定已匯出！');
  } catch (error) {
    console.error('Failed to export settings:', error);
    alert('匯出設定失敗！');
  }
}

function importSettings(file) {
  try {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const settings = JSON.parse(e.target.result);
        
        // Validate settings format
        if (!settings.version || !settings.textStyles) {
          throw new Error('Invalid settings file format');
        }
        
        // Import text styles
        if (settings.textStyles) {
          textStyles = settings.textStyles;
          categoryStorage.setTextStyles(currentCategory, textStyles);
        }
        
        // Import export settings
        if (settings.exportPreferences) {
          Object.assign(exportSettings, settings.exportPreferences);
        }
        
        // Import safe area settings
        if (settings.safeAreaSettings) {
          safeAreaEnabled = settings.safeAreaSettings.enabled || false;
          safeAreaPadding = settings.safeAreaSettings.padding || 0.08;
          guidesEnabled = settings.safeAreaSettings.guidesEnabled || false;
          snapEnabled = settings.safeAreaSettings.snapEnabled || false;
          
          // Update UI controls
          const safeAreaToggle = document.getElementById('safe-area-toggle');
          const guidesToggle = document.getElementById('guides-toggle');
          const snapToggle = document.getElementById('snap-toggle');
          
          if (safeAreaToggle) safeAreaToggle.checked = safeAreaEnabled;
          if (guidesToggle) guidesToggle.checked = guidesEnabled;
          if (snapToggle) snapToggle.checked = snapEnabled;
          
          updateSafeAreaOverlay();
          updateGuidesOverlay();
        }
        
        // Import current options (text content)
        if (settings.currentOptions) {
          currentOptions = settings.currentOptions;
        }
        
        // Update UI
        updateTextControlValues();
        updateExportControls();
        updateUIForCategory();
        updateCanvas();
        
        console.log('Settings imported successfully');
        alert('設定已匯入！');
        
        // Save history state
        saveHistoryState('Settings imported');
        
      } catch (parseError) {
        console.error('Failed to parse settings file:', parseError);
        alert('設定檔案格式錯誤！');
      }
    };
    
    reader.readAsText(file);
  } catch (error) {
    console.error('Failed to import settings:', error);
    alert('匯入設定失敗！');
  }
}

function setupSettingsControls() {
  const exportBtn = document.getElementById('export-settings-btn');
  const importBtn = document.getElementById('import-settings-btn');
  const importInput = document.getElementById('import-settings-input');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportUserSettings);
  }
  
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => {
      importInput.click();
    });
    
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importSettings(file);
      }
    });
  }
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

// Admin unlock functionality
function checkAdminUnlock() {
  const adminLink = document.getElementById('adminLink');
  if (!adminLink) return;
  
  // Check if admin is unlocked via localStorage
  const isUnlocked = localStorage.getItem('idg:admin-unlocked') === '1';
  
  // Check if URL hash contains 'admin'
  const hashContainsAdmin = window.location.hash.includes('admin');
  
  if (isUnlocked || hashContainsAdmin) {
    revealAdminLink();
  }
  
  // Setup keyboard shortcut Alt+Shift+A
  document.addEventListener('keydown', handleAdminUnlockShortcut);
}

function handleAdminUnlockShortcut(e) {
  // Alt+Shift+A to unlock admin
  if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    unlockAdmin();
  }
}

function unlockAdmin() {
  localStorage.setItem('idg:admin-unlocked', '1');
  revealAdminLink();
  console.log('Admin unlocked via keyboard shortcut');
}

function revealAdminLink() {
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    adminLink.removeAttribute('hidden');
    console.log('Admin link revealed');
  }
}