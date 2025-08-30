/**
 * TemplateThumbs - Updated template thumbnail management
 * Loads JPG/PNG images from templates folder, removes SVG support
 */
class TemplateThumbs {
  constructor() {
    this.thumbnailCache = new Map();
    this.loadPromises = new Map();
  }
  
  /**
   * Generate template grid for a category
   */
  generateTemplateGrid(categoryConfig, currentTemplate, onTemplateChange) {
    if (!categoryConfig) return '';
    
    const templates = Array.from({ length: categoryConfig.count }, (_, index) => {
      const templateNumber = index + 1;
      return {
        index,
        name: `${categoryConfig.label}${templateNumber}`,
        thumbnailPath: this.getThumbnailPath(categoryConfig.folder, templateNumber)
      };
    });
    
    return templates.map((template, index) => 
      `<label class="template-card">
        <input type="radio" name="template" value="${template.index}" 
               ${template.index === currentTemplate ? 'checked' : ''}
               onchange="handleTemplateChange(${template.index})">
        <div class="template-preview">
          <img src="${template.thumbnailPath}" alt="${template.name}" class="template-image" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
               onload="this.style.display='block'; this.nextElementSibling.style.display='none';">
          <div class="template-fallback" style="display: none;">
            <div class="demo-title">${template.name}</div>
          </div>
        </div>
        <span class="template-name">${template.name}</span>
      </label>`
    ).join('');
  }
  
  /**
   * Get thumbnail path for a template
   * Tries JPG first, then PNG as fallback
   */
  getThumbnailPath(categoryFolder, templateNumber) {
    // Primary path: Category_N.jpg format in templates folder
    return `assets/templates/${categoryFolder}/${categoryFolder}_${templateNumber}.jpg`;
  }
  
  /**
   * Get background image path for a template
   * For full-bleed backgrounds
   */
  getBackgroundPath(categoryFolder, templateNumber) {
    // Try background image: Category_Empty_N.jpg format
    return `assets/templates/${categoryFolder}/${categoryFolder}_Empty_${templateNumber}.jpg`;
  }
  
  /**
   * Load template image with fallback support
   */
  loadTemplateImage(categoryFolder, templateNumber, extensions = ['jpg', 'png']) {
    const cacheKey = `${categoryFolder}_${templateNumber}`;
    
    // Return cached promise if exists
    if (this.loadPromises.has(cacheKey)) {
      return this.loadPromises.get(cacheKey);
    }
    
    // Create loading promise
    const loadPromise = this.loadImageWithFallbacks(categoryFolder, templateNumber, extensions);
    this.loadPromises.set(cacheKey, loadPromise);
    
    return loadPromise;
  }
  
  /**
   * Load background image for a template
   */
  loadBackgroundImage(categoryFolder, templateNumber) {
    const cacheKey = `bg_${categoryFolder}_${templateNumber}`;
    
    if (this.loadPromises.has(cacheKey)) {
      return this.loadPromises.get(cacheKey);
    }
    
    const loadPromise = this.loadImageWithFallbacks(
      categoryFolder, 
      templateNumber, 
      ['jpg', 'png'],
      'bg_'
    );
    this.loadPromises.set(cacheKey, loadPromise);
    
    return loadPromise;
  }
  
  /**
   * Load image with multiple extension fallbacks
   */
  async loadImageWithFallbacks(categoryFolder, templateNumber, extensions, prefix = '') {
    for (const ext of extensions) {
      try {
        const filename = prefix ? `${prefix}${templateNumber}` : `${categoryFolder}_${templateNumber}`;
        const path = `assets/templates/${categoryFolder}/${filename}.${ext}`;
        const image = await this.loadImage(path);
        
        console.log(`✅ Loaded template image: ${path}`);
        return image;
      } catch (error) {
        console.log(`⚠️ Failed to load: assets/templates/${categoryFolder}/${prefix ? prefix + templateNumber : categoryFolder + '_' + templateNumber}.${ext}`);
        continue;
      }
    }
    
    throw new Error(`Failed to load template image for ${categoryFolder}_${templateNumber}`);
  }
  
  /**
   * Load a single image
   */
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      
      img.src = src;
    });
  }
  
  /**
   * Preload thumbnails for a category
   */
  async preloadThumbnails(categoryConfig) {
    if (!categoryConfig) return;
    
    const promises = [];
    
    for (let i = 1; i <= categoryConfig.count; i++) {
      const promise = this.loadTemplateImage(categoryConfig.folder, i, ['jpg', 'png'])
        .catch(error => {
          console.warn(`Failed to preload thumbnail ${categoryConfig.folder}_${i}:`, error);
          return null;
        });
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    const loadedCount = results.filter(Boolean).length;
    
    console.log(`📷 Preloaded ${loadedCount}/${categoryConfig.count} thumbnails for ${categoryConfig.folder}`);
    return results;
  }
  
  /**
   * Get template image for canvas rendering
   */
  async getTemplateForCanvas(categoryFolder, templateNumber) {
    // Try to load the main template image (not thumbnail)
    try {
      return await this.loadTemplateImage(categoryFolder, templateNumber, ['jpg', 'png']);
    } catch (error) {
      console.warn(`Failed to load template for canvas: ${categoryFolder}_${templateNumber}`, error);
      return null;
    }
  }
  
  /**
   * Get background image for canvas rendering
   * Uses current template index to load corresponding Empty background
   */
  async getBackgroundForCanvas(categoryFolder, templateIndex = 1) {
    // Convert templateIndex to 1-based for filename
    const templateNumber = templateIndex + 1;
    
    // Try to load empty/background template for current template
    try {
      const emptyImage = await this.loadImageWithFallbacks(
        categoryFolder, 
        templateNumber, 
        ['png', 'jpg'],
        `${categoryFolder}_Empty_`
      );
      return emptyImage;
    } catch (error) {
      console.warn(`Failed to load background ${categoryFolder}_Empty_${templateNumber}, falling back to Empty_1`, error);
      
      // Fallback to Empty_1 if specific template background doesn't exist
      try {
        const fallbackImage = await this.loadImageWithFallbacks(
          categoryFolder, 
          1, 
          ['png', 'jpg'],
          `${categoryFolder}_Empty_`
        );
        return fallbackImage;
      } catch (fallbackError) {
        console.warn(`Failed to load fallback background for canvas: ${categoryFolder}`, fallbackError);
        return null;
      }
    }
  }
  
  /**
   * Clear cache for memory management
   */
  clearCache() {
    this.thumbnailCache.clear();
    this.loadPromises.clear();
    console.log('🗑️ Cleared template thumbnail cache');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      thumbnailsCached: this.thumbnailCache.size,
      loadPromises: this.loadPromises.size
    };
  }
  
  /**
   * Check if SVG files exist (for cleanup validation)
   */
  async findSVGReferences(categoryFolder) {
    const svgFiles = [];
    
    // Check for SVG files that might need cleanup
    for (let i = 1; i <= 10; i++) {
      try {
        await this.loadImage(`assets/templates/${categoryFolder}/${categoryFolder}_${i}.svg`);
        svgFiles.push(`${categoryFolder}_${i}.svg`);
      } catch (error) {
        // SVG doesn't exist, which is expected after cleanup
      }
    }
    
    return svgFiles;
  }
  
  /**
   * Validate template directory structure
   */
  async validateTemplateStructure(categoryConfig) {
    const results = {
      category: categoryConfig.folder,
      thumbnails: { found: 0, missing: [] },
      templates: { found: 0, missing: [] },
      backgrounds: { found: 0, missing: [] },
      svgFiles: []
    };
    
    // Check thumbnails (Card_N.jpg)
    for (let i = 1; i <= categoryConfig.count; i++) {
      try {
        await this.loadImage(`assets/templates/${categoryConfig.folder}/Card_${i}.jpg`);
        results.thumbnails.found++;
      } catch (error) {
        results.thumbnails.missing.push(`Card_${i}.jpg`);
      }
    }
    
    // Check templates
    for (let i = 1; i <= categoryConfig.count; i++) {
      try {
        await this.loadTemplateImage(categoryConfig.folder, i, ['jpg', 'png']);
        results.templates.found++;
      } catch (error) {
        results.templates.missing.push(`${categoryConfig.folder}_${i}`);
      }
    }
    
    // Check backgrounds
    try {
      await this.getBackgroundForCanvas(categoryConfig.folder);
      results.backgrounds.found++;
    } catch (error) {
      results.backgrounds.missing.push('Empty_1');
    }
    
    // Check for SVG files that should be removed
    results.svgFiles = await this.findSVGReferences(categoryConfig.folder);
    
    return results;
  }
}

export { TemplateThumbs };