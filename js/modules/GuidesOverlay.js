/**
 * GuidesOverlay - Enhanced guides, snapping, rulers and grid system
 * Provides comprehensive visual aids for precise layer placement
 */
class GuidesOverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = canvas.parentElement;
    
    // State
    this.enabled = false;
    this.snapEnabled = false;
    this.rulersEnabled = false;
    this.gridEnabled = false;
    
    // Configuration
    this.snapThreshold = 10; // pixels
    this.gridSpacing = 20; // pixels
    this.gridOpacity = 0.3;
    
    // DOM elements
    this.overlay = null;
    this.rulersOverlay = null;
    this.gridOverlay = null;
    this.activeGuides = [];
    
    // Mouse tracking
    this.mousePosition = { x: 0, y: 0 };
    
    this.init();
  }
  
  init() {
    this.createOverlays();
    this.bindEvents();
    this.loadPreferences();
  }
  
  createOverlays() {
    // Main guides overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'guides-overlay';
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    this.container.appendChild(this.overlay);
    
    // Rulers overlay
    this.rulersOverlay = document.createElement('div');
    this.rulersOverlay.className = 'rulers-overlay';
    this.rulersOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;
    this.container.appendChild(this.rulersOverlay);
    
    // Grid overlay
    this.gridOverlay = document.createElement('div');
    this.gridOverlay.className = 'grid-overlay';
    this.gridOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      opacity: ${this.gridOpacity};
    `;
    this.container.appendChild(this.gridOverlay);
    
    this.createRulers();
    this.updateGrid();
  }
  
  createRulers() {
    // Horizontal ruler (top)
    this.horizontalRuler = document.createElement('div');
    this.horizontalRuler.className = 'ruler horizontal-ruler';
    this.horizontalRuler.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      width: 100%;
      height: 20px;
      background: #2d3748;
      border-bottom: 1px solid #4a5568;
      font-size: 10px;
      color: #a0aec0;
      overflow: hidden;
      pointer-events: none;
    `;
    
    // Vertical ruler (left)
    this.verticalRuler = document.createElement('div');
    this.verticalRuler.className = 'ruler vertical-ruler';
    this.verticalRuler.style.cssText = `
      position: absolute;
      top: 0;
      left: -20px;
      width: 20px;
      height: 100%;
      background: #2d3748;
      border-right: 1px solid #4a5568;
      font-size: 10px;
      color: #a0aec0;
      overflow: hidden;
      pointer-events: none;
    `;
    
    // Mouse position indicators
    this.mouseIndicatorH = document.createElement('div');
    this.mouseIndicatorH.className = 'mouse-indicator horizontal';
    this.mouseIndicatorH.style.cssText = `
      position: absolute;
      width: 1px;
      height: 20px;
      background: #3b82f6;
      pointer-events: none;
      display: none;
    `;
    
    this.mouseIndicatorV = document.createElement('div');
    this.mouseIndicatorV.className = 'mouse-indicator vertical';
    this.mouseIndicatorV.style.cssText = `
      position: absolute;
      width: 20px;
      height: 1px;
      background: #3b82f6;
      pointer-events: none;
      display: none;
    `;
    
    this.horizontalRuler.appendChild(this.mouseIndicatorH);
    this.verticalRuler.appendChild(this.mouseIndicatorV);
    
    this.container.appendChild(this.horizontalRuler);
    this.container.appendChild(this.verticalRuler);
    
    this.updateRulerMarks();
  }
  
  updateRulerMarks() {
    if (!this.rulersEnabled) return;
    
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    // Clear existing marks
    this.horizontalRuler.querySelectorAll('.ruler-mark').forEach(el => el.remove());
    this.verticalRuler.querySelectorAll('.ruler-mark').forEach(el => el.remove());
    
    // Horizontal ruler marks
    const step = 50; // pixels between major marks
    for (let i = 0; i <= this.canvas.width; i += step) {
      const mark = document.createElement('div');
      mark.className = 'ruler-mark';
      mark.style.cssText = `
        position: absolute;
        left: ${(i / this.canvas.width) * 100}%;
        top: 15px;
        width: 1px;
        height: 5px;
        background: #718096;
      `;
      
      if (i % 100 === 0) {
        mark.style.height = '8px';
        mark.style.top = '12px';
        
        const label = document.createElement('span');
        label.textContent = i.toString();
        label.style.cssText = `
          position: absolute;
          left: 2px;
          top: -12px;
          font-size: 9px;
          white-space: nowrap;
        `;
        mark.appendChild(label);
      }
      
      this.horizontalRuler.appendChild(mark);
    }
    
    // Vertical ruler marks
    for (let i = 0; i <= this.canvas.height; i += step) {
      const mark = document.createElement('div');
      mark.className = 'ruler-mark';
      mark.style.cssText = `
        position: absolute;
        top: ${(i / this.canvas.height) * 100}%;
        left: 15px;
        width: 5px;
        height: 1px;
        background: #718096;
      `;
      
      if (i % 100 === 0) {
        mark.style.width = '8px';
        mark.style.left = '12px';
        
        const label = document.createElement('span');
        label.textContent = i.toString();
        label.style.cssText = `
          position: absolute;
          top: 2px;
          left: -10px;
          font-size: 9px;
          white-space: nowrap;
          transform: rotate(-90deg);
          transform-origin: center;
        `;
        mark.appendChild(label);
      }
      
      this.verticalRuler.appendChild(mark);
    }
  }
  
  updateGrid() {
    if (!this.gridEnabled) {
      this.gridOverlay.style.display = 'none';
      return;
    }
    
    this.gridOverlay.style.display = 'block';
    
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    // Create SVG for grid
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = `
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    `;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'grid-pattern');
    pattern.setAttribute('width', this.gridSpacing);
    pattern.setAttribute('height', this.gridSpacing);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${this.gridSpacing} 0 L 0 0 0 ${this.gridSpacing}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#718096');
    path.setAttribute('stroke-width', '0.5');
    
    pattern.appendChild(path);
    defs.appendChild(pattern);
    svg.appendChild(defs);
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'url(#grid-pattern)');
    
    svg.appendChild(rect);
    
    this.gridOverlay.innerHTML = '';
    this.gridOverlay.appendChild(svg);
  }
  
  bindEvents() {
    // Mouse tracking for rulers
    this.container.addEventListener('mousemove', (e) => {
      this.updateMousePosition(e);
    });
    
    // Window resize
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => {
        this.updateRulerMarks();
        this.updateGrid();
      });
    });
  }
  
  updateMousePosition(e) {
    if (!this.rulersEnabled) return;
    
    const containerRect = this.container.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    // Convert to canvas coordinates
    const canvasX = (x / canvasRect.width) * this.canvas.width;
    const canvasY = (y / canvasRect.height) * this.canvas.height;
    
    this.mousePosition = { x: canvasX, y: canvasY };
    
    // Update mouse indicators
    if (x >= 0 && x <= canvasRect.width) {
      this.mouseIndicatorH.style.left = `${(x / canvasRect.width) * 100}%`;
      this.mouseIndicatorH.style.display = 'block';
    } else {
      this.mouseIndicatorH.style.display = 'none';
    }
    
    if (y >= 0 && y <= canvasRect.height) {
      this.mouseIndicatorV.style.top = `${(y / canvasRect.height) * 100}%`;
      this.mouseIndicatorV.style.display = 'block';
    } else {
      this.mouseIndicatorV.style.display = 'none';
    }
  }
  
  computeSnapCandidates(layer, allLayers = []) {
    if (!this.snapEnabled) return [];
    
    const candidates = [];
    
    // Canvas edges
    candidates.push(
      { type: 'canvas-edge', value: 0, axis: 'x' },
      { type: 'canvas-edge', value: this.canvas.width, axis: 'x' },
      { type: 'canvas-edge', value: 0, axis: 'y' },
      { type: 'canvas-edge', value: this.canvas.height, axis: 'y' }
    );
    
    // Canvas center
    candidates.push(
      { type: 'canvas-center', value: this.canvas.width / 2, axis: 'x' },
      { type: 'canvas-center', value: this.canvas.height / 2, axis: 'y' }
    );
    
    // Grid lines (if enabled)
    if (this.gridEnabled) {
      for (let i = 0; i <= this.canvas.width; i += this.gridSpacing) {
        candidates.push({ type: 'grid', value: i, axis: 'x' });
      }
      for (let i = 0; i <= this.canvas.height; i += this.gridSpacing) {
        candidates.push({ type: 'grid', value: i, axis: 'y' });
      }
    }
    
    // Other layers (visible and unlocked only)
    allLayers.forEach(otherLayer => {
      if (otherLayer === layer || otherLayer.locked || !otherLayer.visible) return;
      
      // Layer edges and center
      const left = otherLayer.x;
      const right = otherLayer.x + otherLayer.width;
      const centerX = otherLayer.x + otherLayer.width / 2;
      const top = otherLayer.y;
      const bottom = otherLayer.y + otherLayer.height;
      const centerY = otherLayer.y + otherLayer.height / 2;
      
      candidates.push(
        { type: 'layer-edge', value: left, axis: 'x', layerId: otherLayer.id },
        { type: 'layer-edge', value: right, axis: 'x', layerId: otherLayer.id },
        { type: 'layer-center', value: centerX, axis: 'x', layerId: otherLayer.id },
        { type: 'layer-edge', value: top, axis: 'y', layerId: otherLayer.id },
        { type: 'layer-edge', value: bottom, axis: 'y', layerId: otherLayer.id },
        { type: 'layer-center', value: centerY, axis: 'y', layerId: otherLayer.id }
      );
    });
    
    return candidates;
  }
  
  findSnapPoints(x, y, width, height, allLayers = []) {
    if (!this.snapEnabled) return { x, y, guides: [] };
    
    const layer = { x, y, width, height };
    const candidates = this.computeSnapCandidates(layer, allLayers);
    
    let snappedX = x;
    let snappedY = y;
    const activeGuides = [];
    
    // Test layer left edge, center, and right edge for X snapping
    const layerLeft = x;
    const layerCenter = x + width / 2;
    const layerRight = x + width;
    
    for (const candidate of candidates.filter(c => c.axis === 'x')) {
      // Check if any layer edge/center is close to candidate
      const distances = [
        { point: 'left', distance: Math.abs(layerLeft - candidate.value), offset: 0 },
        { point: 'center', distance: Math.abs(layerCenter - candidate.value), offset: -width / 2 },
        { point: 'right', distance: Math.abs(layerRight - candidate.value), offset: -width }
      ];
      
      const closest = distances.reduce((min, curr) => 
        curr.distance < min.distance ? curr : min
      );
      
      if (closest.distance <= this.snapThreshold) {
        snappedX = candidate.value + closest.offset;
        activeGuides.push({
          type: 'vertical',
          position: candidate.value,
          source: candidate.type
        });
        break;
      }
    }
    
    // Test layer top edge, center, and bottom edge for Y snapping
    const layerTop = y;
    const layerCenterY = y + height / 2;
    const layerBottom = y + height;
    
    for (const candidate of candidates.filter(c => c.axis === 'y')) {
      const distances = [
        { point: 'top', distance: Math.abs(layerTop - candidate.value), offset: 0 },
        { point: 'center', distance: Math.abs(layerCenterY - candidate.value), offset: -height / 2 },
        { point: 'bottom', distance: Math.abs(layerBottom - candidate.value), offset: -height }
      ];
      
      const closest = distances.reduce((min, curr) => 
        curr.distance < min.distance ? curr : min
      );
      
      if (closest.distance <= this.snapThreshold) {
        snappedY = candidate.value + closest.offset;
        activeGuides.push({
          type: 'horizontal',
          position: candidate.value,
          source: candidate.type
        });
        break;
      }
    }
    
    return { x: snappedX, y: snappedY, guides: activeGuides };
  }
  
  showGuides(guides) {
    this.clearGuides();
    
    if (!this.enabled) return;
    
    guides.forEach(guide => {
      const line = document.createElement('div');
      line.className = `active-guide ${guide.type}`;
      
      if (guide.type === 'vertical') {
        line.style.cssText = `
          position: absolute;
          left: ${(guide.position / this.canvas.width) * 100}%;
          top: 0;
          width: 1px;
          height: 100%;
          background: #3b82f6;
          z-index: 15;
          pointer-events: none;
        `;
      } else {
        line.style.cssText = `
          position: absolute;
          top: ${(guide.position / this.canvas.height) * 100}%;
          left: 0;
          width: 100%;
          height: 1px;
          background: #3b82f6;
          z-index: 15;
          pointer-events: none;
        `;
      }
      
      this.overlay.appendChild(line);
      this.activeGuides.push(line);
    });
  }
  
  clearGuides() {
    this.activeGuides.forEach(guide => guide.remove());
    this.activeGuides = [];
  }
  
  // Settings methods
  setSnapEnabled(enabled) {
    this.snapEnabled = enabled;
    this.savePreference('snapEnabled', enabled);
  }
  
  setSnapThreshold(threshold) {
    this.snapThreshold = Math.max(1, Math.min(50, threshold));
    this.savePreference('snapThreshold', this.snapThreshold);
  }
  
  setRulersEnabled(enabled) {
    this.rulersEnabled = enabled;
    this.horizontalRuler.style.display = enabled ? 'block' : 'none';
    this.verticalRuler.style.display = enabled ? 'block' : 'none';
    this.savePreference('rulersEnabled', enabled);
  }
  
  setGridEnabled(enabled) {
    this.gridEnabled = enabled;
    this.updateGrid();
    this.savePreference('gridEnabled', enabled);
  }
  
  setGridSpacing(spacing) {
    this.gridSpacing = Math.max(10, Math.min(100, spacing));
    this.updateGrid();
    this.savePreference('gridSpacing', this.gridSpacing);
  }
  
  setGridOpacity(opacity) {
    this.gridOpacity = Math.max(0.1, Math.min(1, opacity));
    this.gridOverlay.style.opacity = this.gridOpacity;
    this.savePreference('gridOpacity', this.gridOpacity);
  }
  
  // Preferences persistence
  savePreference(key, value) {
    try {
      const prefs = JSON.parse(localStorage.getItem('guidesPreferences')) || {};
      prefs[key] = value;
      localStorage.setItem('guidesPreferences', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save guides preference:', e);
    }
  }
  
  loadPreferences() {
    try {
      const prefs = JSON.parse(localStorage.getItem('guidesPreferences')) || {};
      
      if (prefs.snapEnabled !== undefined) this.snapEnabled = prefs.snapEnabled;
      if (prefs.snapThreshold !== undefined) this.snapThreshold = prefs.snapThreshold;
      if (prefs.rulersEnabled !== undefined) this.setRulersEnabled(prefs.rulersEnabled);
      if (prefs.gridEnabled !== undefined) this.setGridEnabled(prefs.gridEnabled);
      if (prefs.gridSpacing !== undefined) this.gridSpacing = prefs.gridSpacing;
      if (prefs.gridOpacity !== undefined) this.gridOpacity = prefs.gridOpacity;
      
    } catch (e) {
      console.warn('Failed to load guides preferences:', e);
    }
  }
  
  // Cleanup
  destroy() {
    this.clearGuides();
    this.overlay?.remove();
    this.rulersOverlay?.remove();
    this.gridOverlay?.remove();
    this.horizontalRuler?.remove();
    this.verticalRuler?.remove();
  }
}

export { GuidesOverlay };