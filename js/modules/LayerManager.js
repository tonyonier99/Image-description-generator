/**
 * LayerManager - Enhanced layer management with text boxes and background handling
 * Supports adding/deleting text boxes, background full-cover, and layer locking
 */

// UUID generator utility
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class LayerManager {
  constructor(canvas, ctx, stateStore) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.stateStore = stateStore;
    this.layers = [];
    this.textBoxes = [];
    this.selectedLayer = null;
    this.selectedTextBox = null;
    this.backgroundLayer = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Add text box button
    const addTextBoxBtn = document.getElementById('add-text-box-btn');
    if (addTextBoxBtn) {
      addTextBoxBtn.addEventListener('click', () => this.addTextBox());
    }
    
    // Delete text box button
    const deleteTextBoxBtn = document.getElementById('delete-text-box-btn');
    if (deleteTextBoxBtn) {
      deleteTextBoxBtn.addEventListener('click', () => this.deleteSelectedTextBox());
    }
    
    // Duplicate text box button
    const duplicateTextBoxBtn = document.getElementById('duplicate-text-box-btn');
    if (duplicateTextBoxBtn) {
      duplicateTextBoxBtn.addEventListener('click', () => this.duplicateSelectedTextBox());
    }
    
    // Text box property controls
    this.setupTextBoxPropertyControls();
  }
  
  setupTextBoxPropertyControls() {
    // Populate font family dropdown first
    this.populateFontDropdown();
    
    const controls = [
      { id: 'text-box-content', property: 'content', type: 'textarea' },
      { id: 'text-box-font-family', property: 'fontFamily', type: 'select' },
      { id: 'text-box-font-size', property: 'fontSize', type: 'number' },
      { id: 'text-box-font-weight', property: 'fontWeight', type: 'select' },
      { id: 'text-box-color', property: 'color', type: 'color' },
      { id: 'text-box-align', property: 'align', type: 'select' }
    ];
    
    controls.forEach(({ id, property, type }) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', (e) => {
          this.updateSelectedTextBoxProperty(property, e.target.value);
        });
        
        if (type === 'textarea') {
          element.addEventListener('input', (e) => {
            this.updateSelectedTextBoxProperty(property, e.target.value);
          });
        }
      }
    });
  }
  
  /**
   * Populate font family dropdown with loaded fonts
   */
  populateFontDropdown() {
    const fontFamilySelect = document.getElementById('text-box-font-family');
    if (fontFamilySelect) {
      // Add system fonts
      fontFamilySelect.innerHTML = `
        <option value="Inter, sans-serif">Inter</option>
        <option value="Arial, sans-serif">Arial</option>
        <option value="'Microsoft JhengHei', sans-serif">微軟正黑體</option>
      `;
      
      // Add loaded custom fonts from global loadedFonts array
      if (typeof window.loadedFonts !== 'undefined' && window.loadedFonts.length > 0) {
        window.loadedFonts.forEach(font => {
          const option = document.createElement('option');
          option.value = font.family;
          option.textContent = font.display;
          fontFamilySelect.appendChild(option);
        });
      }
    }
  }
  
  /**
   * Initialize layers for a category
   */
  initializeCategory(categoryConfig) {
    // Clear existing layers except background
    this.layers = this.layers.filter(layer => layer.type === 'background');
    this.textBoxes = [];
    
    // Initialize background layer
    this.initializeBackgroundLayer(categoryConfig);
    
    // Update UI
    this.updateLayersList();
    this.updateCanvas();
  }
  
  /**
   * Initialize background layer (full-cover)
   */
  initializeBackgroundLayer(categoryConfig) {
    if (!this.backgroundLayer) {
      this.backgroundLayer = {
        id: 'bg-layer',
        type: 'background',
        name: '底圖',
        x: 0,
        y: 0,
        width: this.canvas.width,
        height: this.canvas.height,
        zIndex: -1000,
        locked: true,
        visible: true,
        image: null,
        fitMode: 'cover' // Full-cover mode
      };
      
      this.layers.unshift(this.backgroundLayer);
    }
  }
  
  /**
   * Set background image with full-cover
   */
  setBackgroundImage(image) {
    if (this.backgroundLayer) {
      this.backgroundLayer.image = image;
      this.updateCanvas();
    }
  }
  
  /**
   * Add a new text box
   */
  addTextBox(config = {}) {
    const textBox = {
      id: config.id || generateUUID(),
      type: 'text',
      name: config.name || `文字框 ${this.textBoxes.length + 1}`,
      content: config.content || '新增文字',
      x: config.x || this.canvas.width * 0.25,
      y: config.y || this.canvas.height * 0.25,
      width: config.width || this.canvas.width * 0.5,
      height: config.height || 60,
      rotation: config.rotation || 0,
      zIndex: config.zIndex || this.getNextZIndex(),
      locked: config.locked || false,
      visible: config.visible !== false,
      // Text styling
      fontFamily: config.fontFamily || 'Inter, sans-serif',
      fontSize: config.fontSize || 24,
      fontWeight: config.fontWeight || '400',
      color: config.color || '#333333',
      align: config.align || 'center',
      lineHeight: config.lineHeight || 1.2,
      letterSpacing: config.letterSpacing || 0
    };
    
    this.textBoxes.push(textBox);
    // 🔧 FIX: Don't auto-select text box to keep creation simple
    // Advanced editing should be done via "Text Adjustment" panel
    // this.selectTextBox(textBox);
    
    this.updateTextBoxesList();
    this.refreshTextFieldSelect();
    this.updateCanvas();
    
    console.log('Added text box:', textBox);
    return textBox;
  }
  
  /**
   * Delete a text box
   */
  deleteTextBox(textBox) {
    const index = this.textBoxes.findIndex(tb => tb.id === textBox.id);
    if (index > -1) {
      this.textBoxes.splice(index, 1);
      
      if (this.selectedTextBox === textBox) {
        this.deselectTextBox();
      }
      
      this.updateTextBoxesList();
      this.refreshTextFieldSelect();
      this.updateCanvas();
      
      console.log('Deleted text box:', textBox.id);
    }
  }
  
  /**
   * Delete selected text box
   */
  deleteSelectedTextBox() {
    if (this.selectedTextBox) {
      this.deleteTextBox(this.selectedTextBox);
    }
  }
  
  /**
   * Duplicate a text box
   */
  duplicateTextBox(textBox) {
    const duplicate = {
      ...textBox,
      id: generateUUID(),
      name: `${textBox.name} (副本)`,
      x: textBox.x + 20,
      y: textBox.y + 20,
      zIndex: this.getNextZIndex()
    };
    
    this.textBoxes.push(duplicate);
    this.selectTextBox(duplicate);
    this.updateTextBoxesList();
    this.refreshTextFieldSelect();
    this.updateCanvas();
    
    return duplicate;
  }
  
  /**
   * Duplicate selected text box
   */
  duplicateSelectedTextBox() {
    if (this.selectedTextBox) {
      this.duplicateTextBox(this.selectedTextBox);
    }
  }
  
  /**
   * Select a text box
   */
  selectTextBox(textBox) {
    this.selectedTextBox = textBox;
    this.updateTextBoxProperties();
    this.updateTextBoxesList();
    
    // Show properties panel
    const propertiesPanel = document.getElementById('text-box-properties');
    if (propertiesPanel) {
      propertiesPanel.style.display = 'block';
    }
  }
  
  /**
   * Deselect current text box
   */
  deselectTextBox() {
    this.selectedTextBox = null;
    this.updateTextBoxesList();
    
    // Hide properties panel
    const propertiesPanel = document.getElementById('text-box-properties');
    if (propertiesPanel) {
      propertiesPanel.style.display = 'none';
    }
  }
  
  /**
   * Update selected text box property
   */
  updateSelectedTextBoxProperty(property, value) {
    if (!this.selectedTextBox) return;
    
    // Convert value types
    if (property === 'fontSize') {
      value = parseInt(value) || 24;
    } else if (property === 'lineHeight' || property === 'letterSpacing') {
      value = parseFloat(value) || 0;
    }
    
    this.selectedTextBox[property] = value;
    this.updateTextBoxesList();
    this.updateCanvas();
    
    console.log(`Updated text box ${property}:`, value);
  }
  
  /**
   * Update text box properties form
   */
  updateTextBoxProperties() {
    if (!this.selectedTextBox) return;
    
    const textBox = this.selectedTextBox;
    const controls = [
      { id: 'text-box-content', value: textBox.content },
      { id: 'text-box-font-family', value: textBox.fontFamily },
      { id: 'text-box-font-size', value: textBox.fontSize },
      { id: 'text-box-font-weight', value: textBox.fontWeight },
      { id: 'text-box-color', value: textBox.color },
      { id: 'text-box-align', value: textBox.align }
    ];
    
    controls.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = value;
      }
    });
  }
  
  /**
   * Update text boxes list UI
   */
  updateTextBoxesList() {
    const listElement = document.getElementById('text-box-list');
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    this.textBoxes.forEach(textBox => {
      const item = document.createElement('div');
      item.className = `text-box-item ${this.selectedTextBox === textBox ? 'selected' : ''}`;
      
      // Create simplified interface with inline editing
      item.innerHTML = `
        <div class="text-box-item-header">
          <div class="text-box-item-name">${textBox.name}</div>
          <div class="text-box-item-actions">
            <button class="text-box-edit-btn" title="使用「文字調整」編輯">✏️</button>
            <button class="text-box-duplicate-btn" title="複製">📋</button>
            <button class="text-box-delete-btn" title="刪除">🗑️</button>
          </div>
        </div>
        <input type="text" class="text-box-content-input" value="${textBox.content}" placeholder="輸入文字內容">
      `;
      
      // Add event listeners for simple operations
      const contentInput = item.querySelector('.text-box-content-input');
      const editBtn = item.querySelector('.text-box-edit-btn');
      const duplicateBtn = item.querySelector('.text-box-duplicate-btn');
      const deleteBtn = item.querySelector('.text-box-delete-btn');
      
      // Content editing
      contentInput.addEventListener('input', (e) => {
        textBox.content = e.target.value;
        this.updateCanvas();
        this.refreshTextFieldSelect();
      });
      
      // Edit via Text Adjustment panel
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Select this text box in the text adjustment panel
        const fieldSelect = document.getElementById('text-field-select');
        if (fieldSelect) {
          fieldSelect.value = textBox.id;
          fieldSelect.dispatchEvent(new Event('change'));
        }
        // Expand text adjustment panel if collapsed
        const textTuningToggle = document.getElementById('text-tuning-toggle');
        const textTuningContent = document.getElementById('text-tuning-content');
        if (textTuningToggle && textTuningContent) {
          textTuningToggle.setAttribute('aria-expanded', 'true');
          textTuningContent.style.display = 'block';
          const icon = textTuningToggle.querySelector('.toggle-icon');
          if (icon) icon.textContent = '▲';
        }
      });
      
      // Duplicate
      duplicateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.duplicateTextBox(textBox);
      });
      
      // Delete
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${textBox.name}」嗎？`)) {
          this.deleteTextBox(textBox);
        }
      });
      
      listElement.appendChild(item);
    });
  }
  
  /**
   * Refresh text field select dropdown (Task 3)
   */
  refreshTextFieldSelect() {
    const fieldSelect = document.getElementById('text-field-select');
    if (!fieldSelect) return;
    
    // Store current selection
    const currentValue = fieldSelect.value;
    
    // Call the main updateTextTuningPanel function to handle both category and text box fields
    if (typeof window.updateTextTuningPanel === 'function') {
      window.updateTextTuningPanel();
    } else {
      // Fallback: Clear and rebuild options for text boxes only
      fieldSelect.innerHTML = '<option value="">請選擇文字欄位</option>';
      
      this.textBoxes.forEach(textBox => {
        const option = document.createElement('option');
        option.value = textBox.id;
        option.textContent = textBox.name;
        fieldSelect.appendChild(option);
      });
    }
    
    // Restore selection if still valid
    if (currentValue && this.textBoxes.find(tb => tb.id === currentValue)) {
      fieldSelect.value = currentValue;
    }
  }
  
  /**
   * Update layers list UI
   */
  updateLayersList() {
    const listElement = document.getElementById('image-layers-list');
    if (!listElement) return;
    
    listElement.innerHTML = '';
    
    // Sort layers by z-index (highest first)
    const sortedLayers = [...this.layers].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    
    sortedLayers.forEach(layer => {
      const item = document.createElement('div');
      item.className = `layer-item ${this.selectedLayer === layer ? 'selected' : ''} ${layer.locked ? 'locked' : ''}`;
      
      const icon = this.getLayerIcon(layer);
      const lockIcon = layer.locked ? '🔒' : '';
      const visibilityIcon = layer.visible ? '👁' : '👁‍🗨';
      
      item.innerHTML = `
        <div class="layer-info">
          <div class="layer-icon">${icon}</div>
          <div class="layer-name">${layer.name}</div>
        </div>
        <div class="layer-controls">
          <button class="layer-visibility-btn" title="顯示/隱藏">${visibilityIcon}</button>
          ${layer.type === 'background' ? `<button class="layer-lock-btn" title="鎖定/解鎖">${lockIcon}</button>` : ''}
        </div>
      `;
      
      if (layer.type !== 'background') {
        item.addEventListener('click', () => this.selectLayer(layer));
      }
      
      // Handle visibility toggle for all layers
      const visibilityBtn = item.querySelector('.layer-visibility-btn');
      if (visibilityBtn) {
        visibilityBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleLayerVisibility(layer);
        });
      }
      
      // Handle lock/unlock for background layers
      const lockBtn = item.querySelector('.layer-lock-btn');
      if (lockBtn && layer.type === 'background') {
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleLayerLock(layer);
        });
      }
      
      listElement.appendChild(item);
    });
  }
  
  /**
   * Get icon for layer type
   */
  getLayerIcon(layer) {
    switch (layer.type) {
      case 'background': return '🖼️';
      case 'image': return '📷';
      case 'text': return '📝';
      default: return '📄';
    }
  }
  
  /**
   * Toggle layer lock
   */
  toggleLayerLock(layer) {
    layer.locked = !layer.locked;
    this.updateLayersList();
    console.log(`Layer ${layer.name} ${layer.locked ? 'locked' : 'unlocked'}`);
  }
  
  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(layer) {
    layer.visible = !layer.visible;
    this.updateLayersList();
    this.updateCanvas();
    console.log(`Layer ${layer.name} ${layer.visible ? 'shown' : 'hidden'}`);
  }
  
  /**
   * Select a layer
   */
  selectLayer(layer) {
    this.selectedLayer = layer;
    this.updateLayersList();
    
    // Update image adjustment controls when layer is selected
    if (typeof updateImageAdjustmentControls === 'function') {
      updateImageAdjustmentControls();
    }
  }
  
  /**
   * Deselect current layer
   */
  deselectLayer() {
    this.selectedLayer = null;
    this.updateLayersList();
  }
  
  /**
   * Get next available z-index
   */
  getNextZIndex() {
    const allItems = [...this.layers, ...this.textBoxes];
    const maxZ = Math.max(0, ...allItems.map(item => item.zIndex || 0));
    return maxZ + 1;
  }
  
  /**
   * Get all layers (including text boxes)
   */
  getAllLayers() {
    return [...this.layers, ...this.textBoxes];
  }
  
  /**
   * Move layer up in z-index order
   */
  moveLayerUp(layer) {
    if (!layer || layer.type === 'background') return;
    
    const allLayers = this.getAllLayers().filter(l => l.type !== 'background');
    const sortedLayers = allLayers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const currentIndex = sortedLayers.findIndex(l => l.id === layer.id);
    
    if (currentIndex < sortedLayers.length - 1) {
      // Swap z-index with the layer above
      const upperLayer = sortedLayers[currentIndex + 1];
      const tempZ = layer.zIndex;
      layer.zIndex = upperLayer.zIndex;
      upperLayer.zIndex = tempZ;
      
      this.updateLayersList();
      this.updateCanvas();
      console.log(`Moved layer ${layer.name} up`);
    }
  }
  
  /**
   * Move layer down in z-index order
   */
  moveLayerDown(layer) {
    if (!layer || layer.type === 'background') return;
    
    const allLayers = this.getAllLayers().filter(l => l.type !== 'background');
    const sortedLayers = allLayers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const currentIndex = sortedLayers.findIndex(l => l.id === layer.id);
    
    if (currentIndex > 0) {
      // Swap z-index with the layer below
      const lowerLayer = sortedLayers[currentIndex - 1];
      const tempZ = layer.zIndex;
      layer.zIndex = lowerLayer.zIndex;
      lowerLayer.zIndex = tempZ;
      
      this.updateLayersList();
      this.updateCanvas();
      console.log(`Moved layer ${layer.name} down`);
    }
  }
  
  /**
   * Move layer to top
   */
  moveLayerToTop(layer) {
    if (!layer || layer.type === 'background') return;
    
    const maxZ = this.getNextZIndex();
    layer.zIndex = maxZ;
    
    this.updateLayersList();
    this.updateCanvas();
    console.log(`Moved layer ${layer.name} to top`);
  }
  
  /**
   * Move layer to bottom
   */
  moveLayerToBottom(layer) {
    if (!layer || layer.type === 'background') return;
    
    const allLayers = this.getAllLayers().filter(l => l.type !== 'background');
    const minZ = Math.min(...allLayers.map(l => l.zIndex || 0));
    layer.zIndex = minZ - 1;
    
    this.updateLayersList();
    this.updateCanvas();
    console.log(`Moved layer ${layer.name} to bottom`);
  }
  
  /**
   * Update canvas with all layers
   */
  updateCanvas() {
    if (!this.ctx) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background layer with full-cover (only if visible)
    if (this.backgroundLayer && this.backgroundLayer.image && this.backgroundLayer.visible) {
      this.drawBackgroundLayer(this.backgroundLayer);
    } else {
      // Default white background when no background image or when hidden
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Draw slot layers from SlotLayerManager (if available)
    if (typeof window.slotLayerManager !== 'undefined') {
      window.slotLayerManager.renderOnCanvas(this.ctx, this.canvas.width, this.canvas.height);
    }
    
    // Draw category text fields (integration with main app)
    this.drawCategoryTextFields();
    
    // Get all drawable items sorted by z-index
    const allItems = [...this.layers, ...this.textBoxes]
      .filter(item => item.visible && item.type !== 'background')
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    // Draw each item
    allItems.forEach(item => {
      if (item.type === 'text') {
        this.drawTextBox(item);
      } else {
        this.drawLayer(item);
      }
    });
    
    // Also render legacy text content from currentOptions (for compatibility)
    if (typeof window.drawTextContent === 'function') {
      try {
        window.drawTextContent();
      } catch (error) {
        console.warn('Failed to render legacy text content:', error);
      }
    }
  }
  
  /**
   * Draw background layer with full-cover
   */
  drawBackgroundLayer(layer) {
    if (!layer.image) return;
    
    const ctx = this.ctx;
    const canvas = this.canvas;
    const img = layer.image;
    
    // Calculate cover fit dimensions
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = img.width / img.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imageRatio > canvasRatio) {
      // Image is wider, fit height and crop width
      drawHeight = canvas.height;
      drawWidth = drawHeight * imageRatio;
      drawX = (canvas.width - drawWidth) / 2;
      drawY = 0;
    } else {
      // Image is taller, fit width and crop height
      drawWidth = canvas.width;
      drawHeight = drawWidth / imageRatio;
      drawX = 0;
      drawY = (canvas.height - drawHeight) / 2;
    }
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }
  
  /**
   * Draw a text box
   */
  drawTextBox(textBox) {
    if (!textBox.visible) return;
    
    const ctx = this.ctx;
    
    ctx.save();
    
    // Apply transformations
    const centerX = textBox.x + textBox.width / 2;
    const centerY = textBox.y + textBox.height / 2;
    
    ctx.translate(centerX, centerY);
    if (textBox.rotation) {
      ctx.rotate((textBox.rotation * Math.PI) / 180);
    }
    ctx.translate(-centerX, -centerY);
    
    // Set text style
    ctx.font = `${textBox.fontWeight} ${textBox.fontSize}px ${textBox.fontFamily}`;
    ctx.fillStyle = textBox.color;
    ctx.textAlign = textBox.align;
    ctx.textBaseline = 'top';
    
    // Calculate text position based on alignment
    let textX;
    switch (textBox.align) {
      case 'left': textX = textBox.x; break;
      case 'right': textX = textBox.x + textBox.width; break;
      default: textX = textBox.x + textBox.width / 2; break;
    }
    
    // Draw text (handle line breaks)
    const lines = this.wrapText(textBox.content, textBox.width);
    const lineHeight = textBox.fontSize * (textBox.lineHeight || 1.2);
    
    lines.forEach((line, index) => {
      const y = textBox.y + (index * lineHeight);
      ctx.fillText(line, textX, y);
    });
    
    ctx.restore();
  }
  
  /**
   * Draw a regular layer
   */
  drawLayer(layer) {
    if (!layer.visible || !layer.image) return;
    
    const ctx = this.ctx;
    
    ctx.save();
    
    // Apply transformations
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    
    ctx.translate(centerX, centerY);
    if (layer.rotation) {
      ctx.rotate((layer.rotation * Math.PI) / 180);
    }
    ctx.translate(-centerX, -centerY);
    
    // Apply opacity
    if (layer.opacity !== undefined && layer.opacity !== 1) {
      ctx.globalAlpha = layer.opacity;
    }
    
    // Draw image
    ctx.drawImage(layer.image, layer.x, layer.y, layer.width, layer.height);
    
    ctx.restore();
  }
  
  /**
   * Wrap text to fit within specified width
   */
  wrapText(text, maxWidth) {
    const ctx = this.ctx;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (let word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  /**
   * Save current state to template store
   */
  saveState(category, templateIndex) {
    if (this.stateStore) {
      this.stateStore.saveState(category, templateIndex, {
        layers: this.layers,
        textBoxes: this.textBoxes,
        settings: {
          selectedLayer: this.selectedLayer?.id,
          selectedTextBox: this.selectedTextBox?.id
        }
      });
    }
  }
  
  /**
   * Load state from template store
   */
  loadState(category, templateIndex) {
    if (!this.stateStore) return false;
    
    const state = this.stateStore.loadState(category, templateIndex);
    if (state) {
      // Restore layers (but keep background)
      this.layers = this.layers.filter(layer => layer.type === 'background');
      if (state.layers) {
        this.layers.push(...state.layers.filter(layer => layer.type !== 'background'));
      }
      
      // Restore text boxes
      this.textBoxes = state.textBoxes || [];
      
      // Restore selections
      if (state.settings?.selectedLayer) {
        this.selectedLayer = this.layers.find(l => l.id === state.settings.selectedLayer);
      }
      if (state.settings?.selectedTextBox) {
        this.selectedTextBox = this.textBoxes.find(tb => tb.id === state.settings.selectedTextBox);
      }
      
      // Update UI
      this.updateLayersList();
      this.updateTextBoxesList();
      this.updateCanvas();
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Draw category text fields from the main app
   */
  drawCategoryTextFields() {
    // Get category configuration and current options from main app
    const categoryConfig = typeof window.getCurrentCategoryConfig === 'function' ? 
      window.getCurrentCategoryConfig() : null;
    const currentOptions = typeof window.getCurrentOptions === 'function' ? 
      window.getCurrentOptions() : {};
    
    if (!categoryConfig || !categoryConfig.options) return;
    
    const ctx = this.ctx;
    ctx.font = '24px Inter, sans-serif';
    ctx.fillStyle = '#333333';
    
    // Render text for each category field
    categoryConfig.options.forEach((field, index) => {
      if (field.type === 'text' || field.type === 'textarea') {
        const value = currentOptions[field.key] || '';
        console.log(`🔤 LayerManager rendering field ${field.key}: "${value}"`);
        
        if (value) {
          // Calculate default positions for different field types
          let x = this.canvas.width * 0.5; // Center horizontally
          let y;
          
          switch (field.key) {
            case 'title':
              y = this.canvas.height * 0.3; // Top third
              ctx.font = '36px Inter, sans-serif';
              break;
            case 'subtitle':
              y = this.canvas.height * 0.45; // Middle-top
              ctx.font = '28px Inter, sans-serif';
              break;
            case 'content':
              y = this.canvas.height * 0.6; // Middle-bottom
              ctx.font = '24px Inter, sans-serif';
              break;
            default:
              y = this.canvas.height * 0.4 + (index * 50); // Stacked vertically
              ctx.font = '24px Inter, sans-serif';
          }
          
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(value, x, y);
        }
      }
    });
  }
}

export { LayerManager };