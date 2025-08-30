/**
 * TemplateStateStore - Manages layout memory for different templates
 * Saves and restores layer positions, sizes, styles across template switches
 */
class TemplateStateStore {
  constructor() {
    this.memoryStore = new Map();
    this.useLocalStorage = true;
    this.storageKey = 'idg:template-layouts';
    this.loadFromStorage();
  }
  
  /**
   * Generate a unique key for category + template combination
   */
  generateKey(category, templateIndex) {
    return `${category}:${templateIndex}`;
  }
  
  /**
   * Save current state for a template
   */
  saveState(category, templateIndex, layerState) {
    const key = this.generateKey(category, templateIndex);
    const state = {
      timestamp: Date.now(),
      layers: this.serializeLayers(layerState.layers || []),
      textBoxes: this.serializeTextBoxes(layerState.textBoxes || []),
      settings: layerState.settings || {}
    };
    
    this.memoryStore.set(key, state);
    
    if (this.useLocalStorage) {
      this.saveToStorage();
    }
    
    console.log(`💾 Saved template state for ${key}`, state);
  }
  
  /**
   * Load state for a template
   */
  loadState(category, templateIndex) {
    const key = this.generateKey(category, templateIndex);
    const state = this.memoryStore.get(key);
    
    if (state) {
      console.log(`📂 Loaded template state for ${key}`, state);
      return {
        layers: this.deserializeLayers(state.layers),
        textBoxes: this.deserializeTextBoxes(state.textBoxes),
        settings: state.settings
      };
    }
    
    console.log(`📂 No saved state found for ${key}, using defaults`);
    return null;
  }
  
  /**
   * Check if state exists for a template
   */
  hasState(category, templateIndex) {
    const key = this.generateKey(category, templateIndex);
    return this.memoryStore.has(key);
  }
  
  /**
   * Clear state for a specific template
   */
  clearState(category, templateIndex) {
    const key = this.generateKey(category, templateIndex);
    this.memoryStore.delete(key);
    
    if (this.useLocalStorage) {
      this.saveToStorage();
    }
    
    console.log(`🗑️ Cleared template state for ${key}`);
  }
  
  /**
   * Clear all states
   */
  clearAllStates() {
    this.memoryStore.clear();
    
    if (this.useLocalStorage) {
      localStorage.removeItem(this.storageKey);
    }
    
    console.log('🗑️ Cleared all template states');
  }
  
  /**
   * Get all stored template keys
   */
  getAllKeys() {
    return Array.from(this.memoryStore.keys());
  }
  
  /**
   * Serialize layers for storage
   */
  serializeLayers(layers) {
    return layers.map(layer => ({
      id: layer.id,
      type: layer.type,
      name: layer.name,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation || 0,
      zIndex: layer.zIndex || 0,
      opacity: layer.opacity || 1,
      locked: layer.locked || false,
      visible: layer.visible !== false,
      // Image-specific properties
      scale: layer.scale,
      offsetX: layer.offsetX,
      offsetY: layer.offsetY,
      flipH: layer.flipH,
      flipV: layer.flipV,
      blendMode: layer.blendMode,
      maskType: layer.maskType,
      maskParams: layer.maskParams,
      // Don't store the actual image data, just reference
      imageSrc: layer.imageSrc,
      // Store any additional properties
      customProps: layer.customProps
    }));
  }
  
  /**
   * Deserialize layers from storage
   */
  deserializeLayers(serializedLayers) {
    if (!Array.isArray(serializedLayers)) return [];
    
    return serializedLayers.map(layerData => ({
      ...layerData,
      // Ensure required properties have defaults
      x: layerData.x || 0,
      y: layerData.y || 0,
      width: layerData.width || 100,
      height: layerData.height || 100,
      rotation: layerData.rotation || 0,
      zIndex: layerData.zIndex || 0,
      opacity: layerData.opacity || 1,
      locked: layerData.locked || false,
      visible: layerData.visible !== false
    }));
  }
  
  /**
   * Serialize text boxes for storage
   */
  serializeTextBoxes(textBoxes) {
    return textBoxes.map(textBox => ({
      id: textBox.id,
      content: textBox.content,
      x: textBox.x,
      y: textBox.y,
      width: textBox.width,
      height: textBox.height,
      rotation: textBox.rotation || 0,
      zIndex: textBox.zIndex || 0,
      locked: textBox.locked || false,
      visible: textBox.visible !== false,
      // Text styling
      fontFamily: textBox.fontFamily,
      fontSize: textBox.fontSize,
      fontWeight: textBox.fontWeight,
      color: textBox.color,
      align: textBox.align,
      lineHeight: textBox.lineHeight,
      letterSpacing: textBox.letterSpacing,
      // Text effects
      stroke: textBox.stroke,
      shadow: textBox.shadow,
      background: textBox.background
    }));
  }
  
  /**
   * Deserialize text boxes from storage
   */
  deserializeTextBoxes(serializedTextBoxes) {
    if (!Array.isArray(serializedTextBoxes)) return [];
    
    return serializedTextBoxes.map(textBoxData => ({
      ...textBoxData,
      // Ensure required properties have defaults
      content: textBoxData.content || '',
      x: textBoxData.x || 0,
      y: textBoxData.y || 0,
      width: textBoxData.width || 200,
      height: textBoxData.height || 50,
      rotation: textBoxData.rotation || 0,
      zIndex: textBoxData.zIndex || 0,
      locked: textBoxData.locked || false,
      visible: textBoxData.visible !== false,
      fontFamily: textBoxData.fontFamily || 'Inter, sans-serif',
      fontSize: textBoxData.fontSize || 24,
      fontWeight: textBoxData.fontWeight || '400',
      color: textBoxData.color || '#333333',
      align: textBoxData.align || 'center'
    }));
  }
  
  /**
   * Save current memory store to localStorage
   */
  saveToStorage() {
    if (!this.useLocalStorage) return;
    
    try {
      const serialized = JSON.stringify(Array.from(this.memoryStore.entries()));
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.warn('Failed to save template states to localStorage:', error);
    }
  }
  
  /**
   * Load memory store from localStorage
   */
  loadFromStorage() {
    if (!this.useLocalStorage) return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const entries = JSON.parse(stored);
        this.memoryStore = new Map(entries);
        console.log(`📂 Loaded ${entries.length} template states from storage`);
      }
    } catch (error) {
      console.warn('Failed to load template states from localStorage:', error);
      this.memoryStore = new Map();
    }
  }
  
  /**
   * Get statistics about stored states
   */
  getStats() {
    const stats = {
      totalStates: this.memoryStore.size,
      categories: new Set(),
      templates: new Set()
    };
    
    for (const key of this.memoryStore.keys()) {
      const [category, templateIndex] = key.split(':');
      stats.categories.add(category);
      stats.templates.add(key);
    }
    
    return {
      ...stats,
      categories: Array.from(stats.categories),
      templates: Array.from(stats.templates)
    };
  }
  
  /**
   * Export all states as JSON
   */
  exportStates() {
    return JSON.stringify(Array.from(this.memoryStore.entries()), null, 2);
  }
  
  /**
   * Import states from JSON
   */
  importStates(jsonData) {
    try {
      const entries = JSON.parse(jsonData);
      this.memoryStore = new Map(entries);
      
      if (this.useLocalStorage) {
        this.saveToStorage();
      }
      
      console.log(`📥 Imported ${entries.length} template states`);
      return true;
    } catch (error) {
      console.error('Failed to import template states:', error);
      return false;
    }
  }
}

export { TemplateStateStore };