// Main application logic for Image Description Generator
import { categoryStorage } from './storage.js';
import { CanvasTransform } from './modules/CanvasTransform.js';
import { TemplateStateStore } from './modules/TemplateStateStore.js';
import { LayerManager } from './modules/LayerManager.js';
import { TemplateThumbs } from './modules/TemplateThumbs.js';
import { GuidesOverlay } from './modules/GuidesOverlay.js';
import { DiagnosticSystem } from './modules/DiagnosticSystem.js';

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

// Backend integration (optional)
let backendUrl = null;
let authToken = null;
let backendEnabled = false;

// New module instances
let canvasTransform = null;
let templateStateStore = null;
let layerManager = null;
let templateThumbs = null;
let guidesOverlay = null;
let diagnosticSystem = null;

// Multi-image layer system
let imageLayers = [];
let selectedLayer = null;
let maxImageSlots = {
  'classic': 2,
  'menu': 4,
  'room': 4,
  'card': 3
};

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

// Image Layer Management System
// Slot-based Image Layer Management System
class SlotLayerManager {
  constructor() {
    this.slots = new Map(); // slotId -> layer data
    this.selectedSlot = null;
    this.currentCategory = null;
  }
  
  // Initialize slots for a category
  initializeCategory(categoryConfig) {
    this.currentCategory = categoryConfig;
    this.slots.clear();
    
    // Create slots from category configuration
    if (categoryConfig && categoryConfig.slots) {
      categoryConfig.slots.forEach(slotConfig => {
        this.slots.set(slotConfig.id, {
          id: slotConfig.id,
          name: slotConfig.name,
          type: slotConfig.type,
          fixed: slotConfig.fixed || false,
          reorderable: slotConfig.reorderable || false,
          defaultMask: slotConfig.defaultMask || 'none',
          defaultStroke: slotConfig.defaultStroke || null,
          accepts: slotConfig.accepts || [],
          visible: true,
          image: null,
          // Transform properties
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
          flipH: false,
          flipV: false,
          // Crop properties
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
          // Mask properties
          mask: slotConfig.defaultMask || 'none',
          maskParams: {},
          // Effects
          opacity: 1,
          blendMode: 'normal',
          // Edge feathering properties
          edgeFeather: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            radialEnabled: false,
            radialSize: 20,
            linearEnabled: false,
            linearAngle: 90,
            linearSize: 50
          },
          brightness: 0,
          contrast: 0,
          saturation: 0,
          blur: 0,
          // Stroke/border
          stroke: slotConfig.defaultStroke ? { ...slotConfig.defaultStroke } : null,
          // Feather/shadow
          feather: 0,
          shadow: null,
          // Z-index for ordering
          zIndex: slotConfig.type === 'template' ? 0 : this.slots.size
        });
        
        // Auto-select template slot if marked as default
        if (slotConfig.defaultSelected) {
          this.selectedSlot = slotConfig.id;
        }
      });
    }
    
    this.updateSlotsList();
  }
  
  // Set image for a slot
  setSlotImage(slotId, image, imageName = null) {
    const slot = this.slots.get(slotId);
    if (slot && slot.type !== 'template') {
      slot.image = image;
      slot.imageName = imageName || `Image ${slotId}`;
      this.updateSlotsList();
      return true;
    }
    return false;
  }
  
  // Set template for the template slot
  setTemplate(templateImage) {
    const templateSlot = Array.from(this.slots.values()).find(slot => slot.type === 'template');
    if (templateSlot) {
      templateSlot.image = templateImage;
      this.updateSlotsList();
      return true;
    }
    return false;
  }
  
  // Select a slot
  selectSlot(slotId) {
    if (this.slots.has(slotId)) {
      this.selectedSlot = slotId;
      this.updateSlotsList();
      this.updateImageAdjustmentPanel();
      return true;
    }
    return false;
  }
  
  // Get selected slot data
  getSelectedSlot() {
    return this.selectedSlot ? this.slots.get(this.selectedSlot) : null;
  }
  
  // Remove image from slot (but keep slot)
  clearSlot(slotId) {
    const slot = this.slots.get(slotId);
    if (slot && slot.type !== 'template' && !slot.fixed) {
      slot.image = null;
      slot.imageName = null;
      this.updateSlotsList();
      return true;
    }
    return false;
  }
  
  // Update slot property
  updateSlotProperty(slotId, property, value) {
    const slot = this.slots.get(slotId);
    if (slot) {
      if (property.includes('.')) {
        const [parent, child] = property.split('.');
        if (!slot[parent]) slot[parent] = {};
        slot[parent][child] = value;
      } else {
        slot[property] = value;
      }
      return true;
    }
    return false;
  }
  
  // Reorder slots (for reorderable slots only)
  reorderSlots(fromSlotId, toSlotId) {
    const fromSlot = this.slots.get(fromSlotId);
    const toSlot = this.slots.get(toSlotId);
    
    if (fromSlot && toSlot && fromSlot.reorderable && toSlot.reorderable) {
      // Swap z-indices
      const tempZIndex = fromSlot.zIndex;
      fromSlot.zIndex = toSlot.zIndex;
      toSlot.zIndex = tempZIndex;
      this.updateSlotsList();
      return true;
    }
    return false;
  }
  
  // Get all slots sorted by z-index
  getSortedSlots() {
    return Array.from(this.slots.values()).sort((a, b) => a.zIndex - b.zIndex);
  }
  
  // Render all slots on canvas
  renderOnCanvas(ctx, width, height) {
    const sortedSlots = this.getSortedSlots();
    
    sortedSlots.forEach(slot => {
      if (!slot.visible || !slot.image) return;
      
      ctx.save();
      
      // 🔧 NEW: Special handling for template/background slots with full-cover
      if (slot.type === 'template') {
        this.renderBackgroundSlot(ctx, slot, width, height);
      } else {
        this.renderRegularSlot(ctx, slot, width, height);
      }
      
      ctx.restore();
    });
  }
  
  // 🔧 NEW: Render background slot with full-cover behavior
  renderBackgroundSlot(ctx, slot, width, height) {
    const img = slot.image;
    
    // Calculate cover fit dimensions (like CSS background-size: cover)
    const canvasRatio = width / height;
    const imageRatio = img.width / img.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imageRatio > canvasRatio) {
      // Image is wider, fit height and crop width
      drawHeight = height;
      drawWidth = height * imageRatio;
      drawX = (width - drawWidth) / 2;
      drawY = 0;
    } else {
      // Image is taller, fit width and crop height
      drawWidth = width;
      drawHeight = width / imageRatio;
      drawX = 0;
      drawY = (height - drawHeight) / 2;
    }
    
    // Set blend mode and opacity
    ctx.globalCompositeOperation = slot.blendMode;
    ctx.globalAlpha = slot.opacity;
    
    // Apply filters if specified
    if (slot.brightness || slot.contrast || slot.saturation || slot.blur) {
      const filterString = [
        slot.brightness !== 0 ? `brightness(${100 + slot.brightness}%)` : '',
        slot.contrast !== 0 ? `contrast(${100 + slot.contrast}%)` : '',
        slot.saturation !== 0 ? `saturate(${100 + slot.saturation}%)` : '',
        slot.blur > 0 ? `blur(${slot.blur}px)` : ''
      ].filter(f => f).join(' ');
      
      if (filterString) {
        ctx.filter = filterString;
      }
    }
    
    // Draw image with cover behavior
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }
  
  // 🔧 NEW: Render regular slot with existing behavior  
  renderRegularSlot(ctx, slot, width, height) {
    // Set blend mode and opacity
    ctx.globalCompositeOperation = slot.blendMode;
    ctx.globalAlpha = slot.opacity;
    
    // Calculate position and size
    const centerX = width / 2 + slot.offsetX;
    const centerY = height / 2 + slot.offsetY;
    
    // Apply transformations
    ctx.translate(centerX, centerY);
    if (slot.rotation) ctx.rotate((slot.rotation * Math.PI) / 180);
    if (slot.flipH || slot.flipV) ctx.scale(slot.flipH ? -1 : 1, slot.flipV ? -1 : 1);
    
    // Calculate dimensions with crop and scale
    const { crop } = slot;
    const sourceX = crop.left;
    const sourceY = crop.top;
    const sourceWidth = slot.image.width - crop.left - crop.right;
    const sourceHeight = slot.image.height - crop.top - crop.bottom;
    
    const scaledWidth = sourceWidth * slot.scale;
    const scaledHeight = sourceHeight * slot.scale;
    
    // Apply mask if specified
    if (slot.mask && slot.mask !== 'none') {
      this.applyMask(ctx, slot.mask, slot.maskParams, scaledWidth, scaledHeight);
    }
    
    // Apply filters
    if (slot.brightness || slot.contrast || slot.saturation || slot.blur) {
      const filterString = [
        slot.brightness !== 0 ? `brightness(${100 + slot.brightness}%)` : '',
        slot.contrast !== 0 ? `contrast(${100 + slot.contrast}%)` : '',
        slot.saturation !== 0 ? `saturate(${100 + slot.saturation}%)` : '',
        slot.blur > 0 ? `blur(${slot.blur}px)` : ''
      ].filter(f => f).join(' ');
      
      if (filterString) {
        ctx.filter = filterString;
      }
    }
    
    // Draw image
    ctx.drawImage(
      slot.image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight
    );
    
    // Apply stroke if specified
    if (slot.stroke && slot.stroke.enabled) {
      ctx.strokeStyle = slot.stroke.color;
      ctx.lineWidth = slot.stroke.width;
      ctx.strokeRect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    }
  }
  
  // Apply mask to the current context
  applyMask(ctx, maskType, maskParams, width, height) {
    ctx.beginPath();
    
    switch (maskType) {
      case 'circle':
        const radius = Math.min(width, height) / 2;
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        break;
      case 'ellipse':
        ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, 2 * Math.PI);
        break;
      case 'roundRect':
        const cornerRadius = maskParams.radius || 20;
        this.roundRect(ctx, -width / 2, -height / 2, width, height, cornerRadius);
        break;
      case 'capsule':
        const capsuleRadius = Math.min(width, height) / 2;
        this.roundRect(ctx, -width / 2, -height / 2, width, height, capsuleRadius);
        break;
      default:
        // No mask, just clip to rectangle
        ctx.rect(-width / 2, -height / 2, width, height);
    }
    
    ctx.clip();
  }
  
  // Helper to draw rounded rectangle
  roundRect(ctx, x, y, width, height, radius) {
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
  
  // Update the slots list UI
  updateSlotsList() {
    const container = document.getElementById('image-layers-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get slots sorted by z-index (reversed to show top layers first in UI)
    const sortedSlots = this.getSortedSlots().reverse();
    
    sortedSlots.forEach(slot => {
      const slotItem = document.createElement('div');
      slotItem.className = `slot-item ${this.selectedSlot === slot.id ? 'selected' : ''}`;
      slotItem.dataset.slotId = slot.id;
      
      const hasImage = slot.image !== null;
      const isTemplate = slot.type === 'template';
      
      slotItem.innerHTML = `
        <div class="slot-preview">
          <canvas width="40" height="40"></canvas>
          ${!hasImage && !isTemplate ? '<div class="slot-placeholder">+</div>' : ''}
        </div>
        <div class="slot-info">
          <div class="slot-name">${slot.name}</div>
          <div class="slot-status">${hasImage ? (slot.imageName || 'Image loaded') : (isTemplate ? '底圖' : 'Empty')}</div>
        </div>
        <div class="slot-controls">
          <button class="slot-visibility" title="顯示/隱藏" data-slot-id="${slot.id}">
            ${slot.visible ? '👁' : '👁‍🗨'}
          </button>
          ${!isTemplate && !slot.fixed ? `
            <button class="slot-upload" title="上傳圖片" data-slot-id="${slot.id}">📁</button>
            ${hasImage ? `<button class="slot-clear" title="清除" data-slot-id="${slot.id}">🗑</button>` : ''}
          ` : ''}
          ${slot.reorderable ? `<div class="slot-drag-handle" title="拖拽排序">⋮⋮</div>` : ''}
        </div>
      `;
      
      // Draw preview thumbnail
      const canvas = slotItem.querySelector('canvas');
      const previewCtx = canvas.getContext('2d');
      if (slot.image) {
        // Clear canvas
        previewCtx.clearRect(0, 0, 40, 40);
        
        // Calculate scale to fit in 40x40
        const scale = Math.min(40 / slot.image.width, 40 / slot.image.height);
        const scaledWidth = slot.image.width * scale;
        const scaledHeight = slot.image.height * scale;
        const offsetX = (40 - scaledWidth) / 2;
        const offsetY = (40 - scaledHeight) / 2;
        
        previewCtx.drawImage(slot.image, offsetX, offsetY, scaledWidth, scaledHeight);
      }
      
      // Add event listeners
      slotItem.addEventListener('click', () => this.selectSlot(slot.id));
      
      // Visibility toggle
      slotItem.querySelector('.slot-visibility').addEventListener('click', (e) => {
        e.stopPropagation();
        slot.visible = !slot.visible;
        this.updateSlotsList();
        updateCanvas();
      });
      
      // Upload button
      const uploadBtn = slotItem.querySelector('.slot-upload');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openFileDialog(slot.id);
        });
      }
      
      // Clear button
      const clearBtn = slotItem.querySelector('.slot-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('確定要清除這個圖片嗎？')) {
            this.clearSlot(slot.id);
            updateCanvas();
          }
        });
      }
      
      container.appendChild(slotItem);
    });
  }
  
  // Open file dialog for slot
  openFileDialog(slotId) {
    const slot = this.slots.get(slotId);
    if (!slot || slot.type === 'template') return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = slot.accepts.join(',') || 'image/*';
    input.style.display = 'none';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // 🔍 診斷：追蹤圖片上傳 - 檔案選擇
        if (diagnosticSystem) {
          diagnosticSystem.trackImageUpload('file_selected', { 
            fileName: file.name, 
            fileSize: file.size, 
            fileType: file.type 
          });
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          // 🔍 診斷：追蹤圖片上傳 - FileReader 完成
          if (diagnosticSystem) {
            diagnosticSystem.trackImageUpload('filereader_complete', { 
              dataURLLength: event.target.result.length 
            });
          }
          
          const img = new Image();
          img.onload = () => {
            // 🔍 診斷：追蹤圖片上傳 - 圖片載入完成
            if (diagnosticSystem) {
              diagnosticSystem.trackImageUpload('image_loaded', { 
                width: img.width, 
                height: img.height 
              });
            }
            
            this.setSlotImage(slotId, img, file.name);
            updateCanvas();
            
            // 🔍 診斷：追蹤圖片上傳 - 設置到圖層完成
            if (diagnosticSystem) {
              diagnosticSystem.trackImageUpload('layer_set_complete', { slotId });
            }
          };
          
          img.onerror = (error) => {
            // 🔍 診斷：追蹤圖片上傳 - 圖片載入失敗
            if (diagnosticSystem) {
              diagnosticSystem.trackImageUpload('image_load_error', { error: error.message || 'Unknown error' });
            }
          };
          
          img.src = event.target.result;
        };
        
        reader.onerror = (error) => {
          // 🔍 診斷：追蹤圖片上傳 - FileReader 錯誤
          if (diagnosticSystem) {
            diagnosticSystem.trackImageUpload('filereader_error', { error: error.message || 'Unknown error' });
          }
        };
        
        reader.readAsDataURL(file);
      }
    });
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }
  
  // Update image adjustment panel
  updateImageAdjustmentPanel() {
    const selectedSlot = this.getSelectedSlot();
    const infoElement = document.getElementById('selected-layer-info');
    
    if (infoElement) {
      if (selectedSlot) {
        infoElement.textContent = `已選擇: ${selectedSlot.name}${selectedSlot.image ? ` (${selectedSlot.imageName || 'Image'})` : ' (空白)'}`;
      } else {
        infoElement.textContent = '請選擇一個圖層進行調整';
      }
    }
    
    // Update adjustment controls if slot is selected
    if (selectedSlot) {
      this.updateAdjustmentControls(selectedSlot);
    }
  }
  
  // Update adjustment control values
  updateAdjustmentControls(slot) {
    const controls = [
      { id: 'image-scale', property: 'scale', suffix: '' },
      { id: 'image-offset-x', property: 'offsetX', suffix: 'px' },
      { id: 'image-offset-y', property: 'offsetY', suffix: 'px' },
      { id: 'image-rotation', property: 'rotation', suffix: '°' },
      { id: 'image-opacity', property: 'opacity', suffix: '' },
      { id: 'image-flip-h', property: 'flipH', suffix: '' },
      { id: 'image-flip-v', property: 'flipV', suffix: '' },
      { id: 'image-blend-mode', property: 'blendMode', suffix: '' },
      { id: 'image-mask-radius', property: 'maskParams.radius', suffix: 'px', default: 10 },
      { id: 'image-feather', property: 'feather', suffix: 'px' },
      { id: 'image-stroke-width', property: 'stroke.width', suffix: 'px', default: 2 },
      { id: 'image-filter-intensity', property: 'filterIntensity', suffix: '%', default: 100 },
      { id: 'image-brightness', property: 'brightness', suffix: '%' },
      { id: 'image-contrast', property: 'contrast', suffix: '%' },
      { id: 'image-saturation', property: 'saturation', suffix: '%' },
      { id: 'image-blur', property: 'blur', suffix: 'px' },
      // Edge feathering controls
      { id: 'edge-feather-top', property: 'edgeFeather.top', suffix: 'px' },
      { id: 'edge-feather-right', property: 'edgeFeather.right', suffix: 'px' },
      { id: 'edge-feather-bottom', property: 'edgeFeather.bottom', suffix: 'px' },
      { id: 'edge-feather-left', property: 'edgeFeather.left', suffix: 'px' },
      { id: 'edge-feather-radial-enabled', property: 'edgeFeather.radialEnabled', suffix: '' },
      { id: 'edge-feather-radial-size', property: 'edgeFeather.radialSize', suffix: 'px' },
      { id: 'edge-feather-linear-enabled', property: 'edgeFeather.linearEnabled', suffix: '' },
      { id: 'edge-feather-linear-angle', property: 'edgeFeather.linearAngle', suffix: '°' },
      { id: 'edge-feather-linear-size', property: 'edgeFeather.linearSize', suffix: 'px' }
    ];
    
    controls.forEach(({ id, property, suffix, default: defaultValue }) => {
      const input = document.getElementById(id);
      const valueSpan = document.getElementById(id + '-value');
      
      if (input) {
        let value = this.getNestedProperty(slot, property);
        if (value === undefined && defaultValue !== undefined) {
          value = defaultValue;
        }
        
        if (input.type === 'checkbox') {
          input.checked = !!value;
        } else {
          input.value = value || 0;
        }
        
        if (valueSpan) {
          valueSpan.textContent = (value || 0) + suffix;
        }
      }
    });
    
    // Special controls
    const maskType = document.getElementById('image-mask-type');
    if (maskType) {
      maskType.value = slot.mask || 'none';
    }
    
    const strokeEnabled = document.getElementById('image-stroke-enabled');
    if (strokeEnabled) {
      strokeEnabled.checked = slot.stroke && slot.stroke.enabled;
      
      // Show/hide stroke controls
      const strokeControls = document.getElementById('stroke-controls');
      if (strokeControls) {
        strokeControls.style.display = strokeEnabled.checked ? 'flex' : 'none';
      }
    }
    
    const strokeColor = document.getElementById('image-stroke-color');
    if (strokeColor && slot.stroke) {
      strokeColor.value = slot.stroke.color || '#ffffff';
    }
    
    // Crop controls
    const cropControls = ['top', 'right', 'bottom', 'left'];
    cropControls.forEach(side => {
      const input = document.getElementById(`image-crop-${side}`);
      const valueSpan = document.getElementById(`image-crop-${side}-value`);
      
      if (input) {
        input.value = slot.crop[side];
        if (valueSpan) {
          valueSpan.textContent = slot.crop[side] + 'px';
        }
      }
    });
  }
  
  // Helper to get nested property values
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
}

// Apply filter preset to a slot
function applyFilterPreset(slotId, preset) {
  const presets = {
    'none': { brightness: 0, contrast: 0, saturation: 0, blur: 0 },
    'vintage': { brightness: -10, contrast: 15, saturation: -20, blur: 0 },
    'vivid': { brightness: 5, contrast: 25, saturation: 30, blur: 0 },
    'soft': { brightness: 5, contrast: -10, saturation: -5, blur: 0.5 },
    'hdr': { brightness: 0, contrast: 30, saturation: 10, blur: 0 },
    'bw': { brightness: 0, contrast: 10, saturation: -100, blur: 0 },
    'sepia': { brightness: 10, contrast: 5, saturation: -50, blur: 0 }
  };
  
  const settings = presets[preset] || presets['none'];
  
  Object.keys(settings).forEach(property => {
    slotLayerManager.updateSlotProperty(slotId, property, settings[property]);
  });
  
  // Update UI controls
  const selectedSlot = slotLayerManager.getSelectedSlot();
  if (selectedSlot) {
    slotLayerManager.updateAdjustmentControls(selectedSlot);
  }
}

// Initialize the slot-based layer manager
const slotLayerManager = new SlotLayerManager();

// Make slotLayerManager globally accessible for modules
window.slotLayerManager = slotLayerManager;

// Initialize application
document.addEventListener('DOMContentLoaded', async function() {
  await loadConfigs();
  await loadFonts();
  // Wait for fonts to be ready before continuing
  await document.fonts.ready;
  console.log('All fonts loaded and ready');
  
  initializeCanvas();
  initializeModules();
  loadSavedState();
  setupEventListeners();
  renderCategoryDropdown();
  updateUIForCategory();
  updateCanvas();
  setupUndoRedoSystem();
  checkAdminUnlock(); // Check if admin should be unlocked
  
  // Initialize backend (optional)
  await initializeBackend();
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
          ext: 'jpg',
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
    
    // Make loadedFonts available globally for LayerManager
    window.loadedFonts = loadedFonts;
    
    // Update font dropdowns in LayerManager if it exists
    if (layerManager && layerManager.populateFontDropdown) {
      layerManager.populateFontDropdown();
    }
    
    // Refresh text field selector to include text boxes
    if (layerManager && layerManager.refreshTextFieldSelect) {
      layerManager.refreshTextFieldSelect();
    }
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

// Initialize modules
function initializeModules() {
  // Initialize template state store
  templateStateStore = new TemplateStateStore();
  
  // Initialize template thumbs
  templateThumbs = new TemplateThumbs();
  
  // Initialize layer manager
  layerManager = new LayerManager(canvas, ctx, templateStateStore);
  
  // Initialize canvas transform controls
  canvasTransform = new CanvasTransform(canvas, layerManager);
  
  // Initialize guides overlay
  guidesOverlay = new GuidesOverlay(canvas);
  
  // Initialize diagnostic system
  diagnosticSystem = new DiagnosticSystem();
  
  console.log('✅ All modules initialized');
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
  
  // Multi-image controls
  setupMultiImageControls();
  
  // Guides and safe area controls
  setupGuidesControls();
  
  // Export controls
  setupExportControls();
  
  // Settings controls
  setupSettingsControls();
  
  // View menu controls
  setupViewMenuControls();
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
  const categoryConfig = getCurrentCategoryConfig();
  
  // Initialize layer manager for the current category
  if (layerManager) {
    layerManager.initializeCategory(categoryConfig);
  }
  
  // Initialize slot system for the current category (legacy support)
  if (typeof slotLayerManager !== 'undefined') {
    slotLayerManager.initializeCategory(categoryConfig);
  }
  
  renderTemplatesGrid();
  renderCategoryOptions();
  updateTextTuningPanel();
  loadTemplateImages();
}

// Render templates grid for current category
function renderTemplatesGrid() {
  const templateGrid = document.getElementById('template-grid');
  if (!templateGrid || !templateThumbs) return;

  const category = getCurrentCategoryConfig();
  if (!category) return;

  // Use the new TemplateThumbs module to generate the grid
  templateGrid.innerHTML = templateThumbs.generateTemplateGrid(
    category, 
    currentTemplate, 
    window.handleTemplateChange
  );
}

// Handle template change with debouncing
let templateChangeTimeout;
window.handleTemplateChange = function(templateIndex) {
  // Clear any pending template change
  if (templateChangeTimeout) {
    clearTimeout(templateChangeTimeout);
  }
  
  // Debounce template changes to prevent flashing
  templateChangeTimeout = setTimeout(() => {
    handleTemplateChangeInternal(templateIndex);
  }, 100);
};

function handleTemplateChangeInternal(templateIndex) {
  console.log(`🔄 Starting template switch from ${currentTemplate} to ${templateIndex}`);
  
  // Save current template state before switching
  if (layerManager && templateStateStore) {
    layerManager.saveState(currentCategory, currentTemplate);
  }
  
  const oldTemplate = currentTemplate;
  currentTemplate = templateIndex;
  categoryStorage.setSelectedTemplate(currentCategory, templateIndex);
  
  // For same category switches, preserve layer state and only update background
  const category = getCurrentCategoryConfig();
  if (category) {
    // Update template grid selection
    updateTemplateGridSelection(templateIndex);
    
    // Load new background/template image without clearing layers
    loadTemplateImages();
    
    console.log(`✅ Preserved layers during template switch: ${oldTemplate} → ${templateIndex}`);
  }
  
  // Update canvas with preserved layers
  if (layerManager) {
    layerManager.updateCanvas();
  } else {
    updateCanvas();
  }
}

function updateTemplateGridSelection(templateIndex) {
  const templateGrid = document.getElementById('template-grid');
  if (!templateGrid) return;
  
  const inputs = templateGrid.querySelectorAll('input[type="radio"]');
  inputs.forEach((input, index) => {
    input.checked = (index === templateIndex);
  });
}

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
                 oninput="handleOptionChange('${key}', this.value)"
                 ${option.maxLength ? `maxlength="${option.maxLength}"` : ''}>
        </div>`;

    case 'textarea':
      return `
        <div class="input-group">
          <label for="option-${key}">${label}</label>
          <textarea id="option-${key}" rows="3" 
                    oninput="handleOptionChange('${key}', this.value)">${value}</textarea>
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

// Expose functions to global scope for LayerManager compatibility
window.drawTextContent = drawTextContent;
window.getCurrentCategoryConfig = getCurrentCategoryConfig;
window.getCurrentOptions = () => currentOptions;
window.updateTextTuningPanel = updateTextTuningPanel;

// Handle option value change
window.handleOptionChange = function(key, value) {
  const oldValue = currentOptions[key];
  currentOptions[key] = value;
  
  console.log('✅ Text updated:', key, '=', value, 'currentOptions:', currentOptions);
  
  // 🔄 NEW: If this field is currently selected in text tuning panel, sync back
  if (selectedTextField === key) {
    syncTextInputToTuningPanel(key, value);
  }
  
  // Schedule render with requestAnimationFrame for smooth updates
  scheduleRender();
  
  // Save history state for text content changes
  if (oldValue !== value) {
    saveHistoryState(`Text content "${key}" changed`);
  }
};

// Throttled rendering using requestAnimationFrame
let renderScheduled = false;
let renderTimeoutId = null;

function scheduleRender() {
  if (!renderScheduled) {
    renderScheduled = true;
    
    // Cancel any pending timeout
    if (renderTimeoutId) {
      clearTimeout(renderTimeoutId);
    }
    
    // 🔍 診斷：記錄渲染調度
    if (diagnosticSystem) {
      diagnosticSystem.logEvent('render_scheduled', { timestamp: performance.now() });
    }
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      // Additional check to prevent multiple renders in same frame
      if (renderScheduled) {
        console.log('🎨 Executing scheduled render');
        updateCanvas();
        renderScheduled = false;
      }
    });
    
    // Fallback timeout to ensure render happens even if RAF fails
    renderTimeoutId = setTimeout(() => {
      if (renderScheduled) {
        console.log('🎨 Executing fallback render');
        updateCanvas();
        renderScheduled = false;
      }
    }, 16); // ~60fps
  } else {
    console.log('🎨 Render already scheduled, skipping');
    
    // 🔍 診斷：記錄跳過的渲染
    if (diagnosticSystem) {
      diagnosticSystem.logEvent('render_skipped', { timestamp: performance.now() });
    }
  }
}

// Get current category configuration
function getCurrentCategoryConfig() {
  if (!categoryConfigs) return null;
  return categoryConfigs.categories.find(cat => cat.key === currentCategory);
}

// Handle image upload (DEPRECATED - using slot-based uploads now)
function handleImageUpload(event) {
  // This function is no longer used since we moved to slot-based uploading
  console.warn('handleImageUpload called but uploads should go through slots now');
}

// Update canvas with current settings
function updateCanvas() {
  if (!ctx) return;

  // Clear canvas and reset transforms to prevent rendering artifacts
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Use new layer manager if available
  if (layerManager && layerManager.updateCanvas) {
    console.log('🎨 Using LayerManager for canvas update');
    layerManager.updateCanvas();
    return;
  }

  console.log('🎨 Using legacy canvas rendering');
  
  // Fallback to legacy canvas rendering
  // Fill with background color
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

  // Draw slot layers (legacy support)
  if (typeof slotLayerManager !== 'undefined') {
    slotLayerManager.renderOnCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Draw uploaded image (legacy support)
  if (uploadedImage && (typeof slotLayerManager === 'undefined' || slotLayerManager.slots.size === 0)) {
    drawUploadedImage();
  }

  // Draw text content
  console.log('🎨 About to call drawTextContent');
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
  // Prevent multiple calls in the same render cycle
  if (drawTextContent._isRendering) {
    console.log('🔤 Text rendering already in progress, skipping duplicate call');
    return;
  }
  drawTextContent._isRendering = true;
  
  // Get category config for text fields
  const category = getCurrentCategoryConfig();
  if (!category || !category.options) {
    console.log('❌ No category config found for text rendering');
    drawTextContent._isRendering = false;
    return;
  }
  
  // Get current options (use global accessor for compatibility)
  const options = typeof window.getCurrentOptions === 'function' ? window.getCurrentOptions() : currentOptions;
  console.log('🎨 Drawing text content, options:', options);
  
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
      const value = options[field.key] || '';
      console.log(`🔤 Rendering field ${field.key}: "${value}"`);
      
      // 🔍 診斷：記錄文字渲染開始
      if (diagnosticSystem) {
        diagnosticSystem.onTextRenderStart(field.key);
      }
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
  
  // Populate field selector with both category fields and text boxes
  let optionsHTML = '<option value="">請選擇文字欄位</option>';
  
  // Add category fields
  const category = getCurrentCategoryConfig();
  if (category && category.options) {
    const categoryFields = category.options
      .filter(field => field.type === 'text' || field.type === 'textarea')
      .map(field => `<option value="${field.key}" ${field.key === selectedTextField ? 'selected' : ''}>${field.label}</option>`)
      .join('');
    optionsHTML += categoryFields;
  }
  
  // Add LayerManager text boxes
  if (layerManager && layerManager.textBoxes && layerManager.textBoxes.length > 0) {
    const textBoxOptions = layerManager.textBoxes
      .map(textBox => `<option value="${textBox.id}" ${textBox.id === selectedTextField ? 'selected' : ''}>${textBox.name}</option>`)
      .join('');
    optionsHTML += textBoxOptions;
  }
  
  fieldSelect.innerHTML = optionsHTML;
  
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
  
  // Use the new padding value if available, otherwise fall back to global safeAreaPadding
  const safeAreaPaddingSlider = document.getElementById('safeAreaPadding');
  const padding = safeAreaPaddingSlider ? 
    parseFloat(safeAreaPaddingSlider.value) / 100 : 
    safeAreaPadding;
  
  const left = rect.width * padding;
  const top = rect.height * padding;
  const width = rect.width * (1 - padding * 2);
  const height = rect.height * (1 - padding * 2);
  
  border.style.left = `${left}px`;
  border.style.top = `${top}px`;
  border.style.width = `${width}px`;
  border.style.height = `${height}px`;
  
  // Apply the color from the color picker if available
  const safeAreaColorPicker = document.getElementById('safeAreaColor');
  if (safeAreaColorPicker) {
    border.style.borderColor = safeAreaColorPicker.value;
  }
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

// Ensure all assets are loaded before export
async function ensureAllAssetsLoaded() {
  console.log('🔄 Ensuring all assets are loaded...');
  
  // Wait for background image to load if needed
  if (!backgroundImage && templateThumbs) {
    const category = getCurrentCategoryConfig();
    if (category) {
      try {
        backgroundImage = await templateThumbs.getBackgroundForCanvas(category.folder, currentTemplate);
        if (layerManager) {
          layerManager.setBackgroundImage(backgroundImage);
        }
      } catch (error) {
        console.warn('Could not load background for export:', error);
      }
    }
  }
  
  // Wait for any pending image uploads in the multi-image system
  if (typeof uploadedImages !== 'undefined' && uploadedImages.length > 0) {
    await new Promise(resolve => {
      // Check if images are still loading
      const checkLoading = () => {
        const allLoaded = uploadedImages.every(img => img.complete);
        if (allLoaded) {
          resolve();
        } else {
          setTimeout(checkLoading, 50);
        }
      };
      checkLoading();
    });
  }
  
  console.log('✅ All assets loaded for export');
}

// Download current canvas as PNG with proper export sizing
async function downloadImage() {
  if (!canvas) {
    alert('Canvas not ready');
    return;
  }
  
  try {
    console.log('📥 Starting download process...');
    
    // Ensure all assets are loaded first
    await ensureAllAssetsLoaded();
    
    // Trigger a final compose to ensure canvas is up to date
    if (layerManager && layerManager.updateCanvas) {
      layerManager.updateCanvas();
    } else {
      updateCanvas();
    }
    
    // Wait for render to complete
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Get export dimensions from settings
    const dimensions = getExportDimensions();
    const exportWidth = dimensions.width;
    const exportHeight = dimensions.height;
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    
    // Clear and reset export canvas
    exportCtx.setTransform(1, 0, 0, 1, 0, 0);
    exportCtx.clearRect(0, 0, exportWidth, exportHeight);
    
    // Use the same rendering pipeline as preview for consistency
    if (layerManager) {
      // Create a temporary layer manager for export with the export canvas
      const originalCanvas = layerManager.canvas;
      const originalCtx = layerManager.ctx;
      
      // Temporarily switch to export canvas
      layerManager.canvas = exportCanvas;
      layerManager.ctx = exportCtx;
      
      // Render using the same unified pipeline
      layerManager.updateCanvas();
      
      // Restore original canvas
      layerManager.canvas = originalCanvas;
      layerManager.ctx = originalCtx;
    } else {
      // Fallback to legacy rendering for export
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
      
      // Draw slot layers (legacy support)
      if (typeof slotLayerManager !== 'undefined') {
        slotLayerManager.renderOnCanvas(exportCtx, exportWidth, exportHeight);
      }
      
      // Draw uploaded image (legacy support)
      if (uploadedImage && (typeof slotLayerManager === 'undefined' || slotLayerManager.slots.size === 0)) {
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
    }
    
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
    
    // Create download link
    const link = document.createElement('a');
    const preset = exportSettings.preset === 'current' ? 'custom' : exportSettings.preset;
    link.download = `${currentCategory}-${preset}-${exportWidth}x${exportHeight}.${extension}`;
    
    // Export canvas to blob for better performance and reliability
    exportCanvas.toBlob(async (blob) => {
      if (blob) {
        // 🔍 診斷：檢查下載一致性
        if (diagnosticSystem) {
          await diagnosticSystem.checkDownloadConsistency(canvas);
        }
        
        const url = URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        console.log('✅ Download completed successfully');
      } else {
        console.error('❌ Failed to create blob for download');
        alert('Download failed - could not create image data');
      }
    }, mimeType, quality);
    
  } catch (e) {
    console.error('❌ Download error:', e);
    alert('Download failed: ' + e.message);
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
    
    // Reset the rendering flag
    drawTextContent._isRendering = false;
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
      
      // Also select the corresponding text box in LayerManager
      if (layerManager && e.target.value) {
        const textBox = layerManager.textBoxes.find(tb => tb.id === e.target.value);
        if (textBox) {
          layerManager.selectTextBox(textBox);
        }
      }
      
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
  
  // Enhanced keyboard navigation for all layers and text
  document.addEventListener('keydown', (e) => {
    // Arrow key nudging (avoid interference with text input)
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') && 
        !e.target.matches('input, textarea, select')) {
      e.preventDefault();
      nudgeSelectedLayer(e.key, e.shiftKey, e.altKey);
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
  
  // 🔄 NEW: Sync text styles back to category text inputs for bidirectional sync
  syncTextStylesToTextInputs();
  
  updateCanvas();
  
  // Save history state for significant changes
  if (fontSize !== undefined || x !== undefined || y !== undefined || 
      fontFamily !== undefined || align !== undefined || color !== undefined ||
      autoFit !== undefined || strokeEnabled !== undefined || bgEnabled !== undefined) {
    saveHistoryState(`Text field "${selectedTextField}" updated`);
  }
}

// 🔄 NEW: Sync text styles back to category text inputs for bidirectional synchronization
function syncTextStylesToTextInputs() {
  if (!selectedTextField) return;
  
  // Find the corresponding input field in the "文字設定" panel
  const inputElement = document.getElementById(`option-${selectedTextField}`);
  if (inputElement && currentOptions[selectedTextField] !== undefined) {
    // The text content itself doesn't change in the adjustment panel
    // This function is mainly for future extensions like font style sync
    console.log(`🔄 Text sync: "${selectedTextField}" content preserved`);
  }
}

// 🔄 NEW: Sync text input changes to tuning panel
function syncTextInputToTuningPanel(key, value) {
  // When text content changes, ensure the tuning panel reflects any existing styles
  // This helps maintain consistency when switching between fields
  if (selectedTextField === key) {
    // Refresh the tuning panel to ensure all controls are in sync
    updateTextControlValues();
    console.log(`🔄 Text input synced to tuning panel: "${key}"`);
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

  const loadStartTime = performance.now();

  // Load background image using the new TemplateThumbs module
  if (templateThumbs && layerManager) {
    templateThumbs.getBackgroundForCanvas(category.folder, currentTemplate)
      .then(img => {
        const loadTime = performance.now() - loadStartTime;
        
        if (img) {
          backgroundImage = img;
          layerManager.setBackgroundImage(img);
          console.log('✅ Background image loaded via TemplateThumbs');
          
          // 🔍 診斷：檢查底圖對應
          if (diagnosticSystem) {
            const actualPath = img.src || 'unknown';
            diagnosticSystem.checkBackgroundMapping(category.folder, currentTemplate, actualPath, loadTime);
          }
        } else {
          console.warn('⚠️ Background image not found');
          backgroundImage = null;
          
          // 🔍 診斷：記錄載入失敗
          if (diagnosticSystem) {
            diagnosticSystem.checkBackgroundMapping(category.folder, currentTemplate, null, loadTime);
          }
        }
        
        // Also set in legacy slot system if it exists
        if (typeof slotLayerManager !== 'undefined') {
          slotLayerManager.setTemplate(img);
        }
        
        updateCanvas();
      })
      .catch(error => {
        const loadTime = performance.now() - loadStartTime;
        console.warn('Failed to load background image:', error);
        backgroundImage = null;
        
        // 🔍 診斷：記錄載入錯誤
        if (diagnosticSystem) {
          diagnosticSystem.checkBackgroundMapping(category.folder, currentTemplate, null, loadTime);
        }
        
        updateCanvas();
      });
  } else {
    // Fallback to legacy loading
    loadImageWithFallback(
      `assets/templates/${category.folder}/${category.folder}_Empty_${currentTemplate + 1}`,
      ['png', 'jpg'],
      (img) => {
        backgroundImage = img;
        if (layerManager) {
          layerManager.setBackgroundImage(img);
        }
        if (typeof slotLayerManager !== 'undefined') {
          slotLayerManager.setTemplate(img);
        }
        updateCanvas();
      },
      () => {
        console.warn('Background image not found');
        backgroundImage = null;
        updateCanvas();
      }
    );
  }

  // Load foreground image (current template) - removed SVG support
  loadImageWithFallback(
    `assets/templates/${category.folder}/${category.folder}_${currentTemplate + 1}`,
    ['jpg', 'png'],
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
  const safeAreaToggle = document.getElementById('safe-area-toggle') || document.getElementById('safeAreaToggle');
  const guidesToggle = document.getElementById('guides-toggle');
  const snapToggle = document.getElementById('snap-toggle');
  const safeAreaPreset = document.getElementById('safe-area-preset');
  
  // New safe area controls
  const safeAreaPadding = document.getElementById('safeAreaPadding');
  const safeAreaPaddingValue = document.getElementById('safeAreaPaddingValue');
  const safeAreaColor = document.getElementById('safeAreaColor');
  const safeAreaLockAspect = document.getElementById('safeAreaLockAspect');
  
  if (safeAreaToggle) {
    safeAreaToggle.addEventListener('change', (e) => {
      safeAreaEnabled = e.target.checked;
      updateSafeAreaOverlay();
    });
  }
  
  if (safeAreaPadding && safeAreaPaddingValue) {
    safeAreaPadding.addEventListener('input', (e) => {
      const value = e.target.value;
      safeAreaPaddingValue.textContent = value;
      // Convert percentage to decimal for internal use
      window.safeAreaPadding = parseFloat(value) / 100;
      updateSafeAreaOverlay();
    });
  }
  
  if (safeAreaColor) {
    safeAreaColor.addEventListener('change', (e) => {
      updateSafeAreaOverlay();
    });
  }
  
  if (safeAreaLockAspect) {
    safeAreaLockAspect.addEventListener('change', (e) => {
      // Store the lock aspect setting
      window.safeAreaLockAspect = e.target.checked;
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
        window.safeAreaPadding = parseFloat(value);
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

// Setup view menu controls
function setupViewMenuControls() {
  const menuToggle = document.getElementById('viewMenuToggle');
  const menuDropdown = document.getElementById('viewMenuDropdown');
  
  // Toggle dropdown
  if (menuToggle && menuDropdown) {
    menuToggle.addEventListener('click', () => {
      const isActive = menuDropdown.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', isActive);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuDropdown.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  
  // Snap controls
  const snapToggle = document.getElementById('snapToggle');
  const snapThreshold = document.getElementById('snapThreshold');
  const snapThresholdValue = document.getElementById('snapThresholdValue');
  
  if (snapToggle && guidesOverlay) {
    snapToggle.addEventListener('change', (e) => {
      guidesOverlay.setSnapEnabled(e.target.checked);
    });
    // Load saved preference
    snapToggle.checked = guidesOverlay.snapEnabled;
  }
  
  if (snapThreshold && snapThresholdValue && guidesOverlay) {
    snapThreshold.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      guidesOverlay.setSnapThreshold(value);
      snapThresholdValue.textContent = value;
    });
    // Load saved preference
    snapThreshold.value = guidesOverlay.snapThreshold;
    snapThresholdValue.textContent = guidesOverlay.snapThreshold;
  }
  
  // Rulers control
  const rulersToggle = document.getElementById('rulersToggle');
  if (rulersToggle && guidesOverlay) {
    rulersToggle.addEventListener('change', (e) => {
      guidesOverlay.setRulersEnabled(e.target.checked);
    });
    // Load saved preference
    rulersToggle.checked = guidesOverlay.rulersEnabled;
  }
  
  // Grid controls
  const gridToggle = document.getElementById('gridToggle');
  const gridSpacing = document.getElementById('gridSpacing');
  const gridSpacingValue = document.getElementById('gridSpacingValue');
  const gridOpacity = document.getElementById('gridOpacity');
  const gridOpacityValue = document.getElementById('gridOpacityValue');
  
  if (gridToggle && guidesOverlay) {
    gridToggle.addEventListener('change', (e) => {
      guidesOverlay.setGridEnabled(e.target.checked);
    });
    // Load saved preference
    gridToggle.checked = guidesOverlay.gridEnabled;
  }
  
  if (gridSpacing && gridSpacingValue && guidesOverlay) {
    gridSpacing.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      guidesOverlay.setGridSpacing(value);
      gridSpacingValue.textContent = value;
    });
    // Load saved preference
    gridSpacing.value = guidesOverlay.gridSpacing;
    gridSpacingValue.textContent = guidesOverlay.gridSpacing;
  }
  
  if (gridOpacity && gridOpacityValue && guidesOverlay) {
    gridOpacity.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      const opacity = value / 100;
      guidesOverlay.setGridOpacity(opacity);
      gridOpacityValue.textContent = value;
    });
    // Load saved preference
    const currentOpacity = Math.round(guidesOverlay.gridOpacity * 100);
    gridOpacity.value = currentOpacity;
    gridOpacityValue.textContent = currentOpacity;
  }
}

// Enhanced keyboard nudging for layers
function nudgeSelectedLayer(direction, shiftKey, altKey) {
  // Determine movement distance
  let stepSize = 1; // Default: 1px
  if (shiftKey) stepSize = 10; // Shift: 10px
  if (altKey && !shiftKey) stepSize = 0.5; // Alt: 0.5px (subpixel when scale allows)
  
  // For text fields, use the existing nudgeTextField function
  if (selectedTextField) {
    nudgeTextField(direction, shiftKey);
    return;
  }
  
  // For image layers (if we have a selected layer)
  if (layerManager && layerManager.selectedLayer) {
    const layer = layerManager.selectedLayer;
    let newX = layer.x;
    let newY = layer.y;
    
    switch (direction) {
      case 'ArrowUp':
        newY = Math.max(0, newY - stepSize);
        break;
      case 'ArrowDown':
        newY = Math.min(CANVAS_HEIGHT - layer.height, newY + stepSize);
        break;
      case 'ArrowLeft':
        newX = Math.max(0, newX - stepSize);
        break;
      case 'ArrowRight':
        newX = Math.min(CANVAS_WIDTH - layer.width, newX + stepSize);
        break;
    }
    
    // Apply snapping if enabled
    if (guidesOverlay && guidesOverlay.snapEnabled) {
      const allLayers = layerManager.getAllLayers ? layerManager.getAllLayers() : [];
      const snapResult = guidesOverlay.findSnapPoints(newX, newY, layer.width, layer.height, allLayers);
      newX = snapResult.x;
      newY = snapResult.y;
      
      // Show guides briefly
      if (snapResult.guides.length > 0) {
        guidesOverlay.showGuides(snapResult.guides);
        setTimeout(() => guidesOverlay.clearGuides(), 1000);
      }
    }
    
    // Update layer position
    layer.x = newX;
    layer.y = newY;
    
    // Update display
    updateCanvas();
    if (canvasTransform) {
      canvasTransform.updateTransformControl();
    }
    
    // Save history
    saveHistoryState(`Layer nudged ${direction} by ${stepSize}px`);
    return;
  }
  
  // For slot-based layers (current system)
  const selectedSlot = slotLayerManager?.getSelectedSlot();
  if (selectedSlot && selectedSlot.image) {
    const currentOffsetX = selectedSlot.offsetX || 0;
    const currentOffsetY = selectedSlot.offsetY || 0;
    
    let newOffsetX = currentOffsetX;
    let newOffsetY = currentOffsetY;
    
    switch (direction) {
      case 'ArrowUp':
        newOffsetY = currentOffsetY - stepSize;
        break;
      case 'ArrowDown':
        newOffsetY = currentOffsetY + stepSize;
        break;
      case 'ArrowLeft':
        newOffsetX = currentOffsetX - stepSize;
        break;
      case 'ArrowRight':
        newOffsetX = currentOffsetX + stepSize;
        break;
    }
    
    // Apply constraints
    newOffsetX = Math.max(-200, Math.min(200, newOffsetX));
    newOffsetY = Math.max(-200, Math.min(200, newOffsetY));
    
    // Update slot
    slotLayerManager.updateSlotProperty(selectedSlot.id, 'offsetX', newOffsetX);
    slotLayerManager.updateSlotProperty(selectedSlot.id, 'offsetY', newOffsetY);
    
    // Update UI
    updateCanvas();
    slotLayerManager.updateImageAdjustmentPanel();
    
    // Save history
    saveHistoryState(`Slot "${selectedSlot.name}" nudged ${direction} by ${stepSize}px`);
  }
}

// Backend Integration Functions
async function initializeBackend() {
  // Try to detect backend URL
  const possibleUrls = [
    'http://localhost:3000/api',
    `${window.location.origin}/api`,
    // Add more potential backend URLs
  ];
  
  for (const url of possibleUrls) {
    try {
      const response = await fetch(`${url}/health`, { method: 'GET' });
      if (response.ok) {
        backendUrl = url;
        backendEnabled = true;
        console.log(`✅ Backend detected at ${backendUrl}`);
        await loadUserPreferencesFromBackend();
        break;
      }
    } catch (error) {
      // Backend not available at this URL
    }
  }
  
  if (!backendEnabled) {
    console.log('ℹ️ Running in frontend-only mode');
  }
}

async function loadUserPreferencesFromBackend() {
  if (!backendEnabled || !authToken) return;
  
  try {
    const response = await fetch(`${backendUrl}/prefs`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const prefs = await response.json();
      
      // Apply backend preferences to guides overlay
      if (guidesOverlay) {
        guidesOverlay.setSnapEnabled(prefs.snapEnabled);
        guidesOverlay.setSnapThreshold(prefs.snapThreshold);
        guidesOverlay.setRulersEnabled(prefs.rulersEnabled);
        guidesOverlay.setGridEnabled(prefs.gridEnabled);
        guidesOverlay.setGridSpacing(prefs.gridSpacing);
        guidesOverlay.setGridOpacity(prefs.gridOpacity);
      }
      
      console.log('✅ User preferences loaded from backend');
    }
  } catch (error) {
    console.warn('Failed to load user preferences from backend:', error);
  }
}

async function saveUserPreferencesToBackend() {
  if (!backendEnabled || !authToken || !guidesOverlay) return;
  
  try {
    const prefs = {
      snapEnabled: guidesOverlay.snapEnabled,
      snapThreshold: guidesOverlay.snapThreshold,
      rulersEnabled: guidesOverlay.rulersEnabled,
      gridEnabled: guidesOverlay.gridEnabled,
      gridSpacing: guidesOverlay.gridSpacing,
      gridOpacity: guidesOverlay.gridOpacity,
    };
    
    const response = await fetch(`${backendUrl}/prefs`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prefs),
    });
    
    if (response.ok) {
      console.log('✅ User preferences saved to backend');
    }
  } catch (error) {
    console.warn('Failed to save user preferences to backend:', error);
  }
}

async function createExportJob(projectData, options = {}) {
  if (!backendEnabled || !authToken) {
    // Fallback to frontend export
    console.log('Using frontend export fallback');
    downloadImage();
    return;
  }
  
  try {
    const response = await fetch(`${backendUrl}/exports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectData,
        format: options.format || 'png',
        width: options.width || CANVAS_WIDTH,
        height: options.height || CANVAS_HEIGHT,
        quality: options.quality || 0.9,
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Export job created:', result.jobId);
      
      // Poll for completion
      pollExportJob(result.jobId);
    } else {
      throw new Error('Failed to create export job');
    }
  } catch (error) {
    console.warn('Backend export failed, using frontend fallback:', error);
    downloadImage();
  }
}

async function pollExportJob(jobId) {
  const pollInterval = 2000; // 2 seconds
  const maxAttempts = 30; // 1 minute total
  let attempts = 0;
  
  const poll = async () => {
    if (attempts >= maxAttempts) {
      console.error('Export job timeout');
      return;
    }
    
    try {
      const response = await fetch(`${backendUrl}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (response.ok) {
        const job = await response.json();
        
        if (job.status === 'completed') {
          console.log('✅ Export completed:', job.fileUrl);
          // Download the file
          const link = document.createElement('a');
          link.href = job.fileUrl;
          link.download = `export-${new Date().toISOString().split('T')[0]}.${job.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (job.status === 'failed') {
          console.error('Export job failed:', job.errorMessage);
        } else {
          // Still processing, poll again
          attempts++;
          setTimeout(poll, pollInterval);
        }
      }
    } catch (error) {
      console.error('Failed to poll export job:', error);
    }
  };
  
  poll();
}

// Make functions available globally for GuidesOverlay
window.saveUserPreferencesToBackend = saveUserPreferencesToBackend;

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

// Update add image button (DEPRECATED - no longer used in slot system)
function updateAddImageButton() {
  // This function is no longer needed since we use slot-based uploads
  console.warn('updateAddImageButton called but not needed in slot system');
}

// Setup slot-based image controls
function setupMultiImageControls() {
  // Image tuning toggle
  const imageTuningHeader = document.querySelector('#image-tuning-toggle').closest('.tuning-header');
  if (imageTuningHeader) {
    imageTuningHeader.addEventListener('click', toggleImageTuningPanel);
  }
  
  // Image adjustment controls
  const adjustmentControls = [
    'image-scale', 'image-offset-x', 'image-offset-y', 'image-rotation',
    'image-opacity', 'image-crop-top', 'image-crop-right', 
    'image-crop-bottom', 'image-crop-left', 'image-mask-radius',
    'image-feather', 'image-stroke-width', 'image-filter-intensity',
    'image-brightness', 'image-contrast', 'image-saturation', 'image-blur',
    // Edge feathering controls
    'edge-feather-top', 'edge-feather-right', 'edge-feather-bottom', 'edge-feather-left',
    'edge-feather-radial-size', 'edge-feather-linear-angle', 'edge-feather-linear-size'
  ];
  
  adjustmentControls.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        // Check both slot and layer managers for selected layers
        let selectedLayer = null;
        let useSlotManager = false;
        
        if (typeof slotLayerManager !== 'undefined') {
          const selectedSlot = slotLayerManager.getSelectedSlot();
          if (selectedSlot && selectedSlot.type !== 'template') {
            selectedLayer = selectedSlot;
            useSlotManager = true;
          }
        }
        
        if (!selectedLayer && layerManager) {
          selectedLayer = layerManager.selectedLayer;
        }
        
        if (!selectedLayer || selectedLayer.type === 'text') {
          updateImageAdjustmentInfo('請選擇一個圖層進行調整');
          return;
        }
        
        let property = id.replace('image-', '');
        if (property.startsWith('crop-')) {
          property = 'crop.' + property.replace('crop-', '');
        } else if (property.startsWith('edge-feather-')) {
          property = 'edgeFeather.' + property.replace('edge-feather-', '');
        } else if (property.includes('-')) {
          property = property.replace('-', '');
          if (property === 'offsetx') property = 'offsetX';
          if (property === 'offsety') property = 'offsetY';
        }
        
        const value = parseFloat(e.target.value);
        
        if (useSlotManager) {
          slotLayerManager.updateSlotProperty(selectedLayer.id, property, value);
        } else {
          // Update layer property directly for LayerManager
          updateLayerProperty(selectedLayer, property, value);
        }
        
        // Update display value
        const display = document.getElementById(id + '-value');
        if (display) {
          let unit = '';
          if (id.includes('rotation') || id.includes('angle')) unit = '°';
          else if (id.includes('crop') || id.includes('offset') || id.includes('feather')) unit = 'px';
          display.textContent = value + unit;
        }
        
        updateCanvas();
      });
    }
  });
  
  // Flip checkboxes
  const flipH = document.getElementById('image-flip-h');
  const flipV = document.getElementById('image-flip-v');
  
  if (flipH) {
    flipH.addEventListener('change', (e) => {
      // Check both managers for selected layer
      let selectedLayer = null;
      let useSlotManager = false;
      
      if (typeof slotLayerManager !== 'undefined') {
        const selectedSlot = slotLayerManager.getSelectedSlot();
        if (selectedSlot && selectedSlot.type !== 'template') {
          selectedLayer = selectedSlot;
          useSlotManager = true;
        }
      }
      
      if (!selectedLayer && layerManager) {
        selectedLayer = layerManager.selectedLayer;
      }
      
      if (selectedLayer) {
        if (useSlotManager) {
          slotLayerManager.updateSlotProperty(selectedLayer.id, 'flipH', e.target.checked);
        } else {
          updateLayerProperty(selectedLayer, 'flipH', e.target.checked);
        }
        updateCanvas();
      }
    });
  }
  
  if (flipV) {
    flipV.addEventListener('change', (e) => {
      // Check both managers for selected layer
      let selectedLayer = null;
      let useSlotManager = false;
      
      if (typeof slotLayerManager !== 'undefined') {
        const selectedSlot = slotLayerManager.getSelectedSlot();
        if (selectedSlot && selectedSlot.type !== 'template') {
          selectedLayer = selectedSlot;
          useSlotManager = true;
        }
      }
      
      if (!selectedLayer && layerManager) {
        selectedLayer = layerManager.selectedLayer;
      }
      
      if (selectedLayer) {
        if (useSlotManager) {
          slotLayerManager.updateSlotProperty(selectedLayer.id, 'flipV', e.target.checked);
        } else {
          updateLayerProperty(selectedLayer, 'flipV', e.target.checked);
        }
        updateCanvas();
      }
    });
  }
  
  // Blend mode
  const blendMode = document.getElementById('image-blend-mode');
  if (blendMode) {
    blendMode.addEventListener('change', (e) => {
      // Check both managers for selected layer
      let selectedLayer = null;
      let useSlotManager = false;
      
      if (typeof slotLayerManager !== 'undefined') {
        const selectedSlot = slotLayerManager.getSelectedSlot();
        if (selectedSlot && selectedSlot.type !== 'template') {
          selectedLayer = selectedSlot;
          useSlotManager = true;
        }
      }
      
      if (!selectedLayer && layerManager) {
        selectedLayer = layerManager.selectedLayer;
      }
      
      if (selectedLayer) {
        if (useSlotManager) {
          slotLayerManager.updateSlotProperty(selectedLayer.id, 'blendMode', e.target.value);
        } else {
          updateLayerProperty(selectedLayer, 'blendMode', e.target.value);
        }
        updateCanvas();
      }
    });
  }
  
  // Mask type
  const maskType = document.getElementById('image-mask-type');
  if (maskType) {
    maskType.addEventListener('change', (e) => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot) {
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'mask', e.target.value);
        updateCanvas();
      }
    });
  }
  
  // Stroke enabled
  const strokeEnabled = document.getElementById('image-stroke-enabled');
  if (strokeEnabled) {
    strokeEnabled.addEventListener('change', (e) => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot) {
        if (e.target.checked) {
          slotLayerManager.updateSlotProperty(selectedSlot.id, 'stroke', {
            enabled: true,
            width: 2,
            color: '#ffffff'
          });
        } else {
          slotLayerManager.updateSlotProperty(selectedSlot.id, 'stroke', { enabled: false });
        }
        
        // Show/hide stroke controls
        const strokeControls = document.getElementById('stroke-controls');
        if (strokeControls) {
          strokeControls.style.display = e.target.checked ? 'flex' : 'none';
        }
        updateCanvas();
      }
    });
  }
  
  // Stroke color
  const strokeColor = document.getElementById('image-stroke-color');
  if (strokeColor) {
    strokeColor.addEventListener('change', (e) => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot && selectedSlot.stroke) {
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'stroke.color', e.target.value);
        updateCanvas();
      }
    });
  }
  
  // Edge feather radial enabled
  const radialFeatherEnabled = document.getElementById('edge-feather-radial-enabled');
  if (radialFeatherEnabled) {
    radialFeatherEnabled.addEventListener('change', (e) => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot) {
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'edgeFeather.radialEnabled', e.target.checked);
        
        // Enable/disable radial size control
        const radialSize = document.getElementById('edge-feather-radial-size');
        if (radialSize) {
          radialSize.disabled = !e.target.checked;
        }
        updateCanvas();
      }
    });
  }
  
  // Edge feather linear enabled
  const linearFeatherEnabled = document.getElementById('edge-feather-linear-enabled');
  if (linearFeatherEnabled) {
    linearFeatherEnabled.addEventListener('change', (e) => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot) {
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'edgeFeather.linearEnabled', e.target.checked);
        
        // Enable/disable linear controls
        const linearAngle = document.getElementById('edge-feather-linear-angle');
        const linearControls = document.getElementById('linear-feather-controls');
        if (linearAngle) {
          linearAngle.disabled = !e.target.checked;
        }
        if (linearControls) {
          linearControls.style.display = e.target.checked ? 'flex' : 'none';
        }
        updateCanvas();
      }
    });
  }
  
  // Filter preset
  const filterPreset = document.getElementById('image-filter-preset');
  if (filterPreset) {
    filterPreset.addEventListener('change', (e) => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot) {
        applyFilterPreset(selectedSlot.id, e.target.value);
        updateCanvas();
      }
    });
  }
  
  // Z-order controls
  const moveUpBtn = document.getElementById('layer-move-up');
  const moveDownBtn = document.getElementById('layer-move-down');
  const moveTopBtn = document.getElementById('layer-move-top');
  const moveBottomBtn = document.getElementById('layer-move-bottom');
  
  if (moveUpBtn) {
    moveUpBtn.addEventListener('click', () => {
      const selectedLayer = getSelectedLayerForAdjustment();
      if (selectedLayer && layerManager) {
        layerManager.moveLayerUp(selectedLayer);
      }
    });
  }
  
  if (moveDownBtn) {
    moveDownBtn.addEventListener('click', () => {
      const selectedLayer = getSelectedLayerForAdjustment();
      if (selectedLayer && layerManager) {
        layerManager.moveLayerDown(selectedLayer);
      }
    });
  }
  
  if (moveTopBtn) {
    moveTopBtn.addEventListener('click', () => {
      const selectedLayer = getSelectedLayerForAdjustment();
      if (selectedLayer && layerManager) {
        layerManager.moveLayerToTop(selectedLayer);
      }
    });
  }
  
  if (moveBottomBtn) {
    moveBottomBtn.addEventListener('click', () => {
      const selectedLayer = getSelectedLayerForAdjustment();
      if (selectedLayer && layerManager) {
        layerManager.moveLayerToBottom(selectedLayer);
      }
    });
  }
  
  // Reset and delete buttons
  const resetBtn = document.getElementById('reset-image-adjustments');
  const deleteBtn = document.getElementById('delete-current-layer');
  
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot) {
        // Reset slot properties
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'scale', 1);
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'offsetX', 0);
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'offsetY', 0);
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'rotation', 0);
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'flipH', false);
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'flipV', false);
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'crop', { top: 0, right: 0, bottom: 0, left: 0 });
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'opacity', 1);
        slotLayerManager.updateSlotProperty(selectedSlot.id, 'blendMode', 'normal');
        slotLayerManager.updateImageAdjustmentPanel();
        updateCanvas();
      }
    });
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const selectedSlot = slotLayerManager.getSelectedSlot();
      if (selectedSlot && selectedSlot.type !== 'template' && confirm('確定要清除這個圖片嗎？')) {
        slotLayerManager.clearSlot(selectedSlot.id);
        updateCanvas();
      }
    });
  }
}

// Update layer property for LayerManager
function updateLayerProperty(layer, property, value) {
  if (!layer) return;
  
  if (property.includes('.')) {
    const [parentProp, childProp] = property.split('.');
    if (!layer[parentProp]) layer[parentProp] = {};
    layer[parentProp][childProp] = value;
  } else {
    layer[property] = value;
  }
  
  // Update layer in manager
  if (layerManager) {
    layerManager.updateCanvas();
  }
}

// Update image adjustment info display
function updateImageAdjustmentInfo(message) {
  const infoElement = document.getElementById('selected-layer-info');
  if (infoElement) {
    infoElement.textContent = message;
  }
}

// Get the currently selected layer for adjustment operations
function getSelectedLayerForAdjustment() {
  // Check slot manager first
  if (typeof slotLayerManager !== 'undefined') {
    const selectedSlot = slotLayerManager.getSelectedSlot();
    if (selectedSlot && selectedSlot.type !== 'template') {
      return selectedSlot;
    }
  }
  
  // Check layer manager
  if (layerManager && layerManager.selectedLayer) {
    return layerManager.selectedLayer;
  }
  
  return null;
}

// Enable/disable image adjustment controls based on selection
function updateImageAdjustmentControls() {
  let selectedLayer = null;
  let isImageLayer = false;
  
  // Check slot manager first
  if (typeof slotLayerManager !== 'undefined') {
    const selectedSlot = slotLayerManager.getSelectedSlot();
    if (selectedSlot && selectedSlot.type !== 'template') {
      selectedLayer = selectedSlot;
      isImageLayer = selectedSlot.image !== null;
    }
  }
  
  // Check layer manager
  if (!selectedLayer && layerManager) {
    selectedLayer = layerManager.selectedLayer;
    isImageLayer = selectedLayer && selectedLayer.type !== 'text' && selectedLayer.type !== 'background';
  }
  
  // Update info display
  if (selectedLayer && isImageLayer) {
    updateImageAdjustmentInfo(`已選擇: ${selectedLayer.name || '圖層'}`);
  } else if (selectedLayer) {
    updateImageAdjustmentInfo(`已選擇: ${selectedLayer.name || '圖層'} (非圖片圖層)`);
  } else {
    updateImageAdjustmentInfo('請選擇一個圖層進行調整');
  }
  
  // Enable/disable controls
  const controlIds = [
    'image-scale', 'image-offset-x', 'image-offset-y', 'image-rotation',
    'image-opacity', 'image-crop-top', 'image-crop-right', 
    'image-crop-bottom', 'image-crop-left', 'image-flip-h', 'image-flip-v',
    'image-blend-mode', 'image-brightness', 'image-contrast', 'image-saturation', 'image-blur'
  ];
  
  // Enable/disable layer order controls
  const orderControlIds = ['layer-move-up', 'layer-move-down', 'layer-move-top', 'layer-move-bottom'];
  
  controlIds.forEach(id => {
    const control = document.getElementById(id);
    if (control) {
      control.disabled = !isImageLayer;
      if (isImageLayer && selectedLayer) {
        // Update control values from layer properties
        updateControlValue(control, selectedLayer, id);
      }
    }
  });
  
  // Enable layer order controls for any layer (except background)
  orderControlIds.forEach(id => {
    const control = document.getElementById(id);
    if (control) {
      control.disabled = !selectedLayer || selectedLayer.type === 'background';
    }
  });
}

// Update control value from layer property
function updateControlValue(control, layer, controlId) {
  if (!layer || !control) return;
  
  let property = controlId.replace('image-', '');
  let value = null;
  
  if (property.startsWith('crop-')) {
    const cropProp = property.replace('crop-', '');
    value = layer.crop?.[cropProp] || 0;
  } else if (property.includes('-')) {
    property = property.replace('-', '');
    if (property === 'offsetx') property = 'offsetX';
    if (property === 'offsety') property = 'offsetY';
    if (property === 'fliph') property = 'flipH';
    if (property === 'flipv') property = 'flipV';
    if (property === 'blendmode') property = 'blendMode';
    value = layer[property];
  } else {
    value = layer[property];
  }
  
  if (value !== null && value !== undefined) {
    if (control.type === 'checkbox') {
      control.checked = Boolean(value);
    } else {
      control.value = value;
    }
    
    // Update display value if exists
    const display = document.getElementById(controlId + '-value');
    if (display && control.type !== 'checkbox') {
      let unit = '';
      if (controlId.includes('rotation') || controlId.includes('angle')) unit = '°';
      else if (controlId.includes('crop') || controlId.includes('offset')) unit = 'px';
      else if (controlId.includes('brightness') || controlId.includes('contrast') || 
               controlId.includes('saturation') || controlId.includes('opacity') ||
               controlId.includes('filter-strength')) unit = '%';
      display.textContent = value + unit;
    }
  }
}

// Toggle image tuning panel
function toggleImageTuningPanel() {
  const toggle = document.getElementById('image-tuning-toggle');
  const content = document.getElementById('image-adjustment-content');
  
  if (!toggle || !content) return;
  
  const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
  const newState = !isExpanded;
  
  toggle.setAttribute('aria-expanded', newState);
  content.style.display = newState ? 'block' : 'none';
  
  const icon = toggle.querySelector('.toggle-icon');
  if (icon) {
    icon.textContent = newState ? '▲' : '▼';
  }
  
  // Update panel when opened
  // Update image adjustment panel if slot is selected
  const selectedSlot = slotLayerManager.getSelectedSlot();
  if (selectedSlot) {
    slotLayerManager.updateImageAdjustmentPanel();
  }
}