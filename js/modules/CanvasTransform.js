/**
 * CanvasTransform - Handles direct manipulation of layers on canvas
 * Provides dragging, scaling, rotation and selection for images and text
 */
class CanvasTransform {
  constructor(canvas, layerManager) {
    this.canvas = canvas;
    this.layerManager = layerManager;
    this.selectedLayer = null;
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.dragStart = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.transformControl = null;
    this.alignmentGuides = [];
    
    this.init();
  }
  
  init() {
    this.createTransformControl();
    this.createAlignmentGuides();
    this.bindEvents();
  }
  
  createTransformControl() {
    this.transformControl = document.createElement('div');
    this.transformControl.className = 'transform-control';
    
    // Create resize handles
    const handles = ['nw', 'ne', 'sw', 'se', 'rotate'];
    handles.forEach(direction => {
      const handle = document.createElement('div');
      handle.className = `transform-handle ${direction}`;
      handle.dataset.direction = direction;
      this.transformControl.appendChild(handle);
    });
    
    this.canvas.parentElement.appendChild(this.transformControl);
  }
  
  createAlignmentGuides() {
    const container = this.canvas.parentElement;
    
    // Create horizontal and vertical guides
    ['horizontal', 'vertical'].forEach(type => {
      const guide = document.createElement('div');
      guide.className = `alignment-guide ${type}`;
      container.appendChild(guide);
      this.alignmentGuides.push(guide);
    });
  }
  
  bindEvents() {
    const container = this.canvas.parentElement;
    
    // Mouse events for canvas
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    container.addEventListener('mousemove', this.onMouseMove.bind(this));
    container.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Wheel event for scaling
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    
    // Handle clicks on transform handles
    this.transformControl.addEventListener('mousedown', this.onHandleMouseDown.bind(this));
    
    // Keyboard events for delete and nudging
    document.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  
  onWheel(e) {
    if (!this.selectedLayer) return;
    
    // Check if we're over the selected layer
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasX = (x / rect.width) * this.canvas.width;
    const canvasY = (y / rect.height) * this.canvas.height;
    
    if (this.isPointInLayer(canvasX, canvasY, this.selectedLayer)) {
      e.preventDefault();
      
      const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const newWidth = Math.max(20, this.selectedLayer.width * scaleFactor);
      const newHeight = Math.max(20, this.selectedLayer.height * scaleFactor);
      
      // Scale from center
      const centerX = this.selectedLayer.x + this.selectedLayer.width / 2;
      const centerY = this.selectedLayer.y + this.selectedLayer.height / 2;
      
      this.selectedLayer.width = newWidth;
      this.selectedLayer.height = newHeight;
      this.selectedLayer.x = centerX - newWidth / 2;
      this.selectedLayer.y = centerY - newHeight / 2;
      
      this.updateTransformControl();
      this.layerManager.updateCanvas();
    }
  }
  
  onKeyDown(e) {
    if (!this.selectedLayer) return;
    
    // Handle delete key
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedLayer.type !== 'background') {
        this.deleteSelectedLayer();
        e.preventDefault();
      }
      return;
    }
    
    // Handle arrow keys for nudging
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const step = e.shiftKey ? 10 : 1; // Shift for larger steps
      const layer = this.selectedLayer;
      
      switch (e.key) {
        case 'ArrowUp':
          layer.y = Math.max(0, layer.y - step);
          break;
        case 'ArrowDown':
          layer.y = Math.min(this.canvas.height - layer.height, layer.y + step);
          break;
        case 'ArrowLeft':
          layer.x = Math.max(0, layer.x - step);
          break;
        case 'ArrowRight':
          layer.x = Math.min(this.canvas.width - layer.width, layer.x + step);
          break;
      }
      
      this.updateTransformControl();
      this.layerManager.updateCanvas();
      e.preventDefault();
    }
  }
  
  onMouseDown(e) {
    // Prevent conflicts with other event handlers by checking if this should be handled
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to canvas coordinates
    const canvasX = (x / rect.width) * this.canvas.width;
    const canvasY = (y / rect.height) * this.canvas.height;
    
    // Check if clicking on a layer
    const layer = this.getLayerAtPoint(canvasX, canvasY);
    
    if (layer && !layer.locked) {
      // This is a valid layer interaction, handle it and prevent other handlers
      this.selectLayer(layer);
      this.isDragging = true;
      this.dragStart = { x: canvasX, y: canvasY };
      e.preventDefault();
      e.stopPropagation(); // Prevent other event handlers from interfering
      return true; // Indicate this was handled
    } else {
      this.deselectLayer();
      // Don't prevent propagation - let other handlers try
      return false; // Indicate this was not handled
    }
  }
  
  onMouseMove(e) {
    if (!this.selectedLayer) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canvasX = (x / rect.width) * this.canvas.width;
    const canvasY = (y / rect.height) * this.canvas.height;
    
    if (this.isDragging) {
      const deltaX = canvasX - this.dragStart.x;
      const deltaY = canvasY - this.dragStart.y;
      
      this.selectedLayer.x += deltaX;
      this.selectedLayer.y += deltaY;
      
      this.dragStart = { x: canvasX, y: canvasY };
      
      this.showAlignmentGuides();
      this.updateTransformControl();
      this.layerManager.updateCanvas();
    } else if (this.isResizing) {
      this.handleResize(canvasX, canvasY);
    } else if (this.isRotating) {
      this.handleRotation(canvasX, canvasY);
    }
  }
  
  onMouseUp(e) {
    if (this.isDragging || this.isResizing || this.isRotating) {
      this.hideAlignmentGuides();
      this.isDragging = false;
      this.isResizing = false;
      this.isRotating = false;
      this.resizeHandle = null;
      
      // Save state for undo
      if (typeof window.saveHistoryState === 'function') {
        window.saveHistoryState('Layer transformed');
      }
    }
  }
  
  onHandleMouseDown(e) {
    e.stopPropagation();
    const handle = e.target.closest('.transform-handle');
    if (!handle) return;
    
    const direction = handle.dataset.direction;
    
    if (direction === 'rotate') {
      this.isRotating = true;
    } else {
      this.isResizing = true;
      this.resizeHandle = direction;
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.dragStart = {
      x: (x / rect.width) * this.canvas.width,
      y: (y / rect.height) * this.canvas.height
    };
  }
  
  handleResize(canvasX, canvasY) {
    if (!this.selectedLayer || !this.resizeHandle) return;
    
    const layer = this.selectedLayer;
    const deltaX = canvasX - this.dragStart.x;
    const deltaY = canvasY - this.dragStart.y;
    
    // Calculate new dimensions based on handle direction
    switch (this.resizeHandle) {
      case 'se': // Bottom-right
        layer.width = Math.max(20, layer.width + deltaX);
        layer.height = Math.max(20, layer.height + deltaY);
        break;
      case 'sw': // Bottom-left
        layer.width = Math.max(20, layer.width - deltaX);
        layer.height = Math.max(20, layer.height + deltaY);
        layer.x += deltaX;
        break;
      case 'ne': // Top-right
        layer.width = Math.max(20, layer.width + deltaX);
        layer.height = Math.max(20, layer.height - deltaY);
        layer.y += deltaY;
        break;
      case 'nw': // Top-left
        layer.width = Math.max(20, layer.width - deltaX);
        layer.height = Math.max(20, layer.height - deltaY);
        layer.x += deltaX;
        layer.y += deltaY;
        break;
    }
    
    this.dragStart = { x: canvasX, y: canvasY };
    this.updateTransformControl();
    this.layerManager.updateCanvas();
  }
  
  handleRotation(canvasX, canvasY) {
    if (!this.selectedLayer) return;
    
    const layer = this.selectedLayer;
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    
    const angle = Math.atan2(canvasY - centerY, canvasX - centerX);
    layer.rotation = (angle * 180 / Math.PI + 360) % 360;
    
    this.updateTransformControl();
    this.layerManager.updateCanvas();
  }
  
  getLayerAtPoint(x, y) {
    // Get all layers sorted by z-index (highest first)
    const layers = this.layerManager.getAllLayers()
      .filter(layer => layer.type !== 'background' && !layer.locked)
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    
    for (const layer of layers) {
      if (this.isPointInLayer(x, y, layer)) {
        return layer;
      }
    }
    
    return null;
  }
  
  isPointInLayer(x, y, layer) {
    return x >= layer.x && 
           x <= layer.x + layer.width && 
           y >= layer.y && 
           y <= layer.y + layer.height;
  }
  
  selectLayer(layer) {
    this.selectedLayer = layer;
    this.updateTransformControl();
    this.showTransformControl();
    
    // Notify layer manager about selection
    if (this.layerManager.selectLayer) {
      this.layerManager.selectLayer(layer);
    }
  }
  
  deselectLayer() {
    this.selectedLayer = null;
    this.hideTransformControl();
    
    if (this.layerManager.deselectLayer) {
      this.layerManager.deselectLayer();
    }
  }
  
  updateTransformControl() {
    if (!this.selectedLayer) return;
    
    const layer = this.selectedLayer;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    
    this.transformControl.style.left = (layer.x * scaleX) + 'px';
    this.transformControl.style.top = (layer.y * scaleY) + 'px';
    this.transformControl.style.width = (layer.width * scaleX) + 'px';
    this.transformControl.style.height = (layer.height * scaleY) + 'px';
    
    if (layer.rotation) {
      this.transformControl.style.transform = `rotate(${layer.rotation}deg)`;
    } else {
      this.transformControl.style.transform = '';
    }
  }
  
  showTransformControl() {
    this.transformControl.classList.add('active');
  }
  
  hideTransformControl() {
    this.transformControl.classList.remove('active');
  }
  
  showAlignmentGuides() {
    if (!this.selectedLayer) return;
    
    const layer = this.selectedLayer;
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Show center alignment guides
    const centerX = layer.x + layer.width / 2;
    const centerY = layer.y + layer.height / 2;
    const canvasCenterX = this.canvas.width / 2;
    const canvasCenterY = this.canvas.height / 2;
    
    // Vertical center guide
    if (Math.abs(centerX - canvasCenterX) < 20) {
      const guide = this.alignmentGuides.find(g => g.classList.contains('vertical'));
      if (guide) {
        guide.style.left = (canvasCenterX * canvasRect.width / this.canvas.width) + 'px';
        guide.classList.add('active');
      }
    }
    
    // Horizontal center guide
    if (Math.abs(centerY - canvasCenterY) < 20) {
      const guide = this.alignmentGuides.find(g => g.classList.contains('horizontal'));
      if (guide) {
        guide.style.top = (canvasCenterY * canvasRect.height / this.canvas.height) + 'px';
        guide.classList.add('active');
      }
    }
  }
  
  hideAlignmentGuides() {
    this.alignmentGuides.forEach(guide => {
      guide.classList.remove('active');
    });
  }
  
  // Public methods
  getSelectedLayer() {
    return this.selectedLayer;
  }
  
  deleteSelectedLayer() {
    if (this.selectedLayer && this.selectedLayer.type !== 'background') {
      this.layerManager.deleteLayer(this.selectedLayer);
      this.deselectLayer();
    }
  }
}

export { CanvasTransform };