// localStorage helper functions with safe error handling

// Constants for localStorage keys
export const STORAGE_KEYS = {
  SELECTED_CATEGORY: 'idg:selected-category',
  SELECTED_TEMPLATE_BY_CATEGORY: 'idg:selected-template-by-category', 
  CATEGORY_CONFIGS_OVERRIDE: 'idg:category-configs-override'
};

// Safe localStorage operations
export const storage = {
  // Get item from localStorage with fallback
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.warn(`Failed to get localStorage item: ${key}`, e);
      return defaultValue;
    }
  },

  // Set item in localStorage
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Failed to set localStorage item: ${key}`, e);
      return false;
    }
  },

  // Remove item from localStorage
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`Failed to remove localStorage item: ${key}`, e);
      return false;
    }
  },

  // Clear all localStorage items
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.warn('Failed to clear localStorage', e);
      return false;
    }
  }
};

// Category-specific helpers
export const categoryStorage = {
  // Get selected category
  getSelectedCategory(defaultValue = 'classic') {
    return storage.get(STORAGE_KEYS.SELECTED_CATEGORY, defaultValue);
  },

  // Set selected category
  setSelectedCategory(category) {
    return storage.set(STORAGE_KEYS.SELECTED_CATEGORY, category);
  },

  // Get selected template index for a category
  getSelectedTemplate(category, defaultValue = 0) {
    const templates = storage.get(STORAGE_KEYS.SELECTED_TEMPLATE_BY_CATEGORY, {});
    return templates[category] || defaultValue;
  },

  // Set selected template index for a category
  setSelectedTemplate(category, index) {
    const templates = storage.get(STORAGE_KEYS.SELECTED_TEMPLATE_BY_CATEGORY, {});
    templates[category] = index;
    return storage.set(STORAGE_KEYS.SELECTED_TEMPLATE_BY_CATEGORY, templates);
  },

  // Get category configs override
  getConfigsOverride() {
    return storage.get(STORAGE_KEYS.CATEGORY_CONFIGS_OVERRIDE);
  },

  // Set category configs override
  setConfigsOverride(configs) {
    return storage.set(STORAGE_KEYS.CATEGORY_CONFIGS_OVERRIDE, configs);
  },

  // Clear category configs override
  clearConfigsOverride() {
    return storage.remove(STORAGE_KEYS.CATEGORY_CONFIGS_OVERRIDE);
  }
};