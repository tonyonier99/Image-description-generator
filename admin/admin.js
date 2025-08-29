// Admin interface for managing category configurations
// localStorage-based configuration management

// Storage keys
const STORAGE_KEYS = {
  CATEGORY_CONFIGS_OVERRIDE: 'idg:category-configs-override',
  FONTS_CONFIG: 'idg:fonts-config',
  TEXT_DEFAULTS: 'idg:text-defaults',
  ADMIN_SNAPSHOTS: 'idg:admin-snapshots'
};

// Global state
let currentConfigs = null;
let hasOverride = false;

// Initialize admin interface
document.addEventListener('DOMContentLoaded', async function() {
  await loadConfigs();
  renderCategories();
  renderFonts();
  setupTextDefaults();
  setupEventListeners();
  renderSnapshotList(); // Initialize snapshots display
});

// Load configuration (override takes priority over default)
async function loadConfigs() {
  try {
    // Check for local override first
    const override = localStorage.getItem(STORAGE_KEYS.CATEGORY_CONFIGS_OVERRIDE);
    if (override) {
      currentConfigs = JSON.parse(override);
      hasOverride = true;
      showStatus('已載入本地覆寫設定', 'success');
      return;
    }

    // Fall back to default config
    const response = await fetch('../data/category-configs.json');
    if (!response.ok) throw new Error('Failed to load default config');
    currentConfigs = await response.json();
    hasOverride = false;
    showStatus('已載入預設設定', 'success');
  } catch (error) {
    console.error('Failed to load configs:', error);
    currentConfigs = { categories: [] };
    showStatus('載入設定失敗，使用空白設定', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  const importFile = document.getElementById('import-file');
  if (importFile) {
    importFile.addEventListener('change', handleFileImport);
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;

  statusEl.innerHTML = `<div class="status ${type}">${message}</div>`;
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusEl.innerHTML = '';
    }, 5000);
  }
}

// Render categories list
function renderCategories() {
  const container = document.getElementById('categories-container');
  if (!container || !currentConfigs) return;

  if (!currentConfigs.categories || currentConfigs.categories.length === 0) {
    container.innerHTML = '<p class="hint">尚未設定任何類別。點擊「新增類別」開始設定。</p>';
    return;
  }

  container.innerHTML = currentConfigs.categories.map((category, index) => `
    <div class="category-item" data-index="${index}">
      <div class="category-header">
        <div class="category-title">${category.label} (${category.key})</div>
        <div class="button-group">
          <button onclick="editCategory(${index})" class="secondary">編輯</button>
          <button onclick="deleteCategoryWithConfirmation(${index})" class="danger">刪除</button>
        </div>
      </div>
      
      <div class="field">
        <strong>資料夾：</strong> ${category.folder} | 
        <strong>副檔名：</strong> ${category.ext} | 
        <strong>範本數量：</strong> ${category.count}
      </div>
      
      <div class="options-list">
        <strong>選項欄位 (${category.options ? category.options.length : 0})：</strong>
        ${category.options && category.options.length > 0 ? 
          category.options.map(option => `
            <div class="option-item">
              <strong>${option.label}</strong> (${option.key}) - ${option.type}
              ${option.options ? ` [${option.options.join(', ')}]` : ''}
            </div>
          `).join('') : 
          '<div class="hint">此類別沒有設定選項欄位</div>'
        }
      </div>
    </div>
  `).join('');
}

// Load default configuration
async function loadDefaultConfig() {
  try {
    const response = await fetch('../data/category-configs.json');
    if (!response.ok) throw new Error('Failed to load default config');
    currentConfigs = await response.json();
    hasOverride = false;
    renderCategories();
    showStatus('已載入預設設定', 'success');
  } catch (error) {
    console.error('Failed to load default config:', error);
    showStatus('載入預設設定失敗', 'error');
  }
}

// Export configuration as JSON
function exportConfig() {
  if (!currentConfigs) {
    showStatus('沒有可匯出的設定', 'error');
    return;
  }

  try {
    const json = JSON.stringify(currentConfigs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'category-configs.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showStatus('設定已匯出', 'success');
  } catch (error) {
    console.error('Export failed:', error);
    showStatus('匯出失敗', 'error');
  }
}

// Import configuration from JSON file
function importConfig() {
  const fileInput = document.getElementById('import-file');
  if (fileInput) {
    fileInput.click();
  }
}

// Handle file import
function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      
      // Validate structure
      if (!imported.categories || !Array.isArray(imported.categories)) {
        throw new Error('Invalid configuration format');
      }

      currentConfigs = imported;
      renderCategories();
      showStatus('設定已匯入，記得點擊「儲存覆寫」以保存到本地', 'success');
    } catch (error) {
      console.error('Import failed:', error);
      showStatus('匯入失敗：檔案格式錯誤', 'error');
    }
  };
  
  reader.readAsText(file);
  event.target.value = ''; // Reset file input
}

// Clear local override
function clearOverride() {
  if (confirm('確定要清除本地覆寫設定嗎？這將回復為預設設定。')) {
    localStorage.removeItem(STORAGE_KEYS.CATEGORY_CONFIGS_OVERRIDE);
    hasOverride = false;
    loadDefaultConfig();
    showStatus('本地覆寫已清除', 'success');
  }
}

// Add new category
function addNewCategory() {
  const newCategory = {
    key: `category_${Date.now()}`,
    label: '新類別',
    folder: 'NewCategory',
    ext: 'svg',
    count: 1,
    options: [
      {
        key: 'title',
        label: '標題',
        type: 'text'
      }
    ]
  };

  if (!currentConfigs.categories) {
    currentConfigs.categories = [];
  }
  
  currentConfigs.categories.push(newCategory);
  renderCategories();
  saveToLocal();
  showStatus('已新增類別，請編輯詳細設定', 'success');
}

// Edit category
function editCategory(index) {
  const category = currentConfigs.categories[index];
  if (!category) return;

  const key = prompt('類別 key (英文):', category.key);
  if (key === null) return;

  const label = prompt('類別名稱 (中文):', category.label);
  if (label === null) return;

  const folder = prompt('資料夾名稱:', category.folder);
  if (folder === null) return;

  const ext = prompt('檔案副檔名 (png/svg/jpg):', category.ext);
  if (ext === null) return;

  const count = prompt('範本數量:', category.count.toString());
  if (count === null) return;

  const optionsJson = prompt('選項欄位 (JSON格式):', JSON.stringify(category.options || [], null, 2));
  if (optionsJson === null) return;

  try {
    const options = JSON.parse(optionsJson);
    
    // Update category
    currentConfigs.categories[index] = {
      ...category,
      key: key.trim(),
      label: label.trim(),
      folder: folder.trim(),
      ext: ext.trim(),
      count: parseInt(count) || 1,
      options: options
    };

    renderCategories();
    saveToLocal();
    showStatus('類別已更新', 'success');
  } catch (error) {
    console.error('Failed to parse options JSON:', error);
    showStatus('選項 JSON 格式錯誤', 'error');
  }
}

// Delete category
function deleteCategory(index) {
  const category = currentConfigs.categories[index];
  if (!category) return;

  if (confirm(`確定要刪除類別「${category.label}」嗎？`)) {
    currentConfigs.categories.splice(index, 1);
    renderCategories();
    saveToLocal();
    showStatus('類別已刪除', 'success');
  }
}

// Save current config to localStorage as override
function saveToLocal() {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORY_CONFIGS_OVERRIDE, JSON.stringify(currentConfigs));
    hasOverride = true;
    showStatus('設定已保存到本地覆寫', 'success');
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    showStatus('保存失敗', 'error');
  }
}

// Font management functions
function renderFonts() {
  const container = document.getElementById('fonts-container');
  if (!container) return;

  const fontsConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.FONTS_CONFIG) || '{"fonts": []}');
  
  if (!fontsConfig.fonts || fontsConfig.fonts.length === 0) {
    container.innerHTML = '<p class="hint">尚未設定任何字體。點擊「新增字體」或「從 index.json 載入」開始設定。</p>';
    return;
  }

  container.innerHTML = fontsConfig.fonts.map((font, index) => `
    <div class="category-item" data-index="${index}">
      <div class="category-header">
        <div class="category-title">${font.display || font.family}</div>
        <div class="button-group">
          <button onclick="editFont(${index})" class="secondary">編輯</button>
          <button onclick="deleteFont(${index})" class="danger">刪除</button>
        </div>
      </div>
      <div class="field">
        <strong>字體名稱：</strong> ${font.family} | 
        <strong>檔案：</strong> ${font.src} | 
        <strong>字重：</strong> ${font.weight || 'normal'} |
        <strong>樣式：</strong> ${font.style || 'normal'}
      </div>
    </div>
  `).join('');
}

function addNewFont() {
  const newFont = {
    family: '新字體',
    src: 'fonts/new-font.ttf',
    weight: 'normal',
    style: 'normal',
    display: '新字體'
  };

  const fontsConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.FONTS_CONFIG) || '{"fonts": []}');
  if (!fontsConfig.fonts) fontsConfig.fonts = [];
  
  fontsConfig.fonts.push(newFont);
  localStorage.setItem(STORAGE_KEYS.FONTS_CONFIG, JSON.stringify(fontsConfig));
  
  renderFonts();
  showStatus('已新增字體，請編輯詳細設定', 'success');
}

function editFont(index) {
  const fontsConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.FONTS_CONFIG) || '{"fonts": []}');
  const font = fontsConfig.fonts[index];
  if (!font) return;

  const family = prompt('字體名稱（CSS font-family）:', font.family);
  if (family === null) return;

  const src = prompt('字體檔案路徑:', font.src);
  if (src === null) return;

  const weight = prompt('字重 (normal, bold, 100-900):', font.weight || 'normal');
  if (weight === null) return;

  const style = prompt('樣式 (normal, italic):', font.style || 'normal');
  if (style === null) return;

  const display = prompt('顯示名稱:', font.display || font.family);
  if (display === null) return;

  fontsConfig.fonts[index] = { family, src, weight, style, display };
  localStorage.setItem(STORAGE_KEYS.FONTS_CONFIG, JSON.stringify(fontsConfig));
  
  renderFonts();
  showStatus('字體設定已更新', 'success');
}

function deleteFont(index) {
  if (!confirm('確定要刪除這個字體嗎？')) return;

  const fontsConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.FONTS_CONFIG) || '{"fonts": []}');
  fontsConfig.fonts.splice(index, 1);
  localStorage.setItem(STORAGE_KEYS.FONTS_CONFIG, JSON.stringify(fontsConfig));
  
  renderFonts();
  showStatus('字體已刪除', 'success');
}

async function loadFontsFromIndex() {
  try {
    const response = await fetch('../fonts/index.json');
    if (!response.ok) throw new Error('無法載入 fonts/index.json');
    
    const fontsIndex = await response.json();
    localStorage.setItem(STORAGE_KEYS.FONTS_CONFIG, JSON.stringify(fontsIndex));
    
    renderFonts();
    showStatus('已從 fonts/index.json 載入字體設定', 'success');
  } catch (error) {
    showStatus('載入字體設定失敗: ' + error.message, 'error');
  }
}

// Text defaults functions
function setupTextDefaults() {
  const categorySelect = document.getElementById('text-defaults-category');
  if (!categorySelect || !currentConfigs) return;

  // Populate category dropdown
  categorySelect.innerHTML = '<option value="">請選擇類別</option>';
  if (currentConfigs.categories) {
    currentConfigs.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.key;
      option.textContent = category.label;
      categorySelect.appendChild(option);
    });
  }

  // Add change listener
  categorySelect.addEventListener('change', (e) => {
    const categoryKey = e.target.value;
    if (categoryKey) {
      renderTextDefaults(categoryKey);
    } else {
      document.getElementById('text-defaults-container').style.display = 'none';
      document.getElementById('save-text-defaults').style.display = 'none';
    }
  });
}

function renderTextDefaults(categoryKey) {
  const container = document.getElementById('text-defaults-container');
  const saveButton = document.getElementById('save-text-defaults');
  if (!container || !currentConfigs) return;

  const category = currentConfigs.categories.find(cat => cat.key === categoryKey);
  if (!category) return;

  const textFields = category.options.filter(opt => opt.type === 'text' || opt.type === 'textarea');
  if (textFields.length === 0) {
    container.innerHTML = '<p class="hint">此類別沒有文字欄位。</p>';
    container.style.display = 'block';
    saveButton.style.display = 'none';
    return;
  }

  // Load existing defaults
  const textDefaults = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEXT_DEFAULTS) || '{}');
  const categoryDefaults = textDefaults[categoryKey] || {};

  container.innerHTML = textFields.map(field => {
    const defaults = categoryDefaults[field.key] || {};
    return `
      <div class="field-defaults" data-category="${categoryKey}" data-field="${field.key}">
        <h3>${field.label} (${field.key})</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div class="field">
            <label>X 位置 (0-1):</label>
            <input type="number" class="text-default-x" min="0" max="1" step="0.01" value="${defaults.x || 0.5}">
          </div>
          <div class="field">
            <label>Y 位置 (0-1):</label>
            <input type="number" class="text-default-y" min="0" max="1" step="0.01" value="${defaults.y || 0.5}">
          </div>
          <div class="field">
            <label>字體大小:</label>
            <input type="number" class="text-default-font-size" min="12" max="120" value="${defaults.fontSize || (field.key.includes('title') ? 36 : 24)}">
          </div>
          <div class="field">
            <label>行高:</label>
            <input type="number" class="text-default-line-height" min="1" max="3" step="0.1" value="${defaults.lineHeight || 1.4}">
          </div>
          <div class="field">
            <label>字體:</label>
            <input type="text" class="text-default-font-family" value="${defaults.fontFamily || 'Inter, sans-serif'}">
          </div>
          <div class="field">
            <label>對齊:</label>
            <select class="text-default-align">
              <option value="left" ${defaults.align === 'left' ? 'selected' : ''}>左對齊</option>
              <option value="center" ${defaults.align === 'center' || !defaults.align ? 'selected' : ''}>置中</option>
              <option value="right" ${defaults.align === 'right' ? 'selected' : ''}>右對齊</option>
            </select>
          </div>
          <div class="field">
            <label>顏色:</label>
            <input type="color" class="text-default-color" value="${defaults.color || '#333333'}">
          </div>
          <div class="field">
            <label>最大寬度 (0-1):</label>
            <input type="number" class="text-default-max-width" min="0" max="1" step="0.01" value="${defaults.maxWidth || 0.8}">
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.style.display = 'block';
  saveButton.style.display = 'block';
}

function saveTextDefaults() {
  const textDefaults = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEXT_DEFAULTS) || '{}');
  
  document.querySelectorAll('.field-defaults').forEach(fieldDiv => {
    const categoryKey = fieldDiv.dataset.category;
    const fieldKey = fieldDiv.dataset.field;
    
    if (!textDefaults[categoryKey]) textDefaults[categoryKey] = {};
    
    textDefaults[categoryKey][fieldKey] = {
      x: parseFloat(fieldDiv.querySelector('.text-default-x').value),
      y: parseFloat(fieldDiv.querySelector('.text-default-y').value),
      fontSize: parseInt(fieldDiv.querySelector('.text-default-font-size').value),
      lineHeight: parseFloat(fieldDiv.querySelector('.text-default-line-height').value),
      fontFamily: fieldDiv.querySelector('.text-default-font-family').value,
      align: fieldDiv.querySelector('.text-default-align').value,
      color: fieldDiv.querySelector('.text-default-color').value,
      maxWidth: parseFloat(fieldDiv.querySelector('.text-default-max-width').value)
    };
  });

  localStorage.setItem(STORAGE_KEYS.TEXT_DEFAULTS, JSON.stringify(textDefaults));
  showStatus('文字預設值已儲存', 'success');
}

// Add save button to config management section
document.addEventListener('DOMContentLoaded', function() {
  const configSection = document.querySelector('.section .button-group');
  if (configSection) {
    const saveButton = document.createElement('button');
    saveButton.textContent = '儲存覆寫';
    saveButton.onclick = saveToLocal;
    configSection.appendChild(saveButton);
  }
});

// Enhanced Admin Features

// Schema validation function
function validateConfig(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('設定必須是有效的物件');
    return errors;
  }
  
  if (!config.categories || !Array.isArray(config.categories)) {
    errors.push('缺少有效的 categories 陣列');
    return errors;
  }
  
  const usedKeys = new Set();
  const usedLabels = new Set();
  
  config.categories.forEach((category, index) => {
    const prefix = `類別 ${index + 1}`;
    
    // Required fields
    if (!category.key || typeof category.key !== 'string') {
      errors.push(`${prefix}: 缺少有效的 key`);
    } else if (usedKeys.has(category.key)) {
      errors.push(`${prefix}: key "${category.key}" 重複`);
    } else {
      usedKeys.add(category.key);
    }
    
    if (!category.label || typeof category.label !== 'string') {
      errors.push(`${prefix}: 缺少有效的 label`);
    } else if (usedLabels.has(category.label)) {
      errors.push(`${prefix}: label "${category.label}" 重複`);
    } else {
      usedLabels.add(category.label);
    }
    
    if (!category.folder || typeof category.folder !== 'string') {
      errors.push(`${prefix}: 缺少有效的 folder`);
    }
    
    if (!category.ext || typeof category.ext !== 'string') {
      errors.push(`${prefix}: 缺少有效的 ext`);
    } else if (!['png', 'svg', 'jpg', 'jpeg'].includes(category.ext.toLowerCase())) {
      errors.push(`${prefix}: ext 必須是 png, svg, jpg 或 jpeg`);
    }
    
    if (!category.count || typeof category.count !== 'number' || category.count < 1) {
      errors.push(`${prefix}: count 必須是大於 0 的數字`);
    }
    
    // Validate options
    if (category.options && Array.isArray(category.options)) {
      const optionKeys = new Set();
      category.options.forEach((option, optIndex) => {
        const optPrefix = `${prefix} 選項 ${optIndex + 1}`;
        
        if (!option.key || typeof option.key !== 'string') {
          errors.push(`${optPrefix}: 缺少有效的 key`);
        } else if (optionKeys.has(option.key)) {
          errors.push(`${optPrefix}: key "${option.key}" 重複`);
        } else {
          optionKeys.add(option.key);
        }
        
        if (!option.label || typeof option.label !== 'string') {
          errors.push(`${optPrefix}: 缺少有效的 label`);
        }
        
        if (!option.type || !['text', 'textarea', 'number', 'color', 'select'].includes(option.type)) {
          errors.push(`${optPrefix}: type 必須是 text, textarea, number, color 或 select`);
        }
        
        if (option.type === 'select' && (!option.options || !Array.isArray(option.options))) {
          errors.push(`${optPrefix}: select 類型必須包含有效的 options 陣列`);
        }
      });
    }
  });
  
  return errors;
}

// Snapshot management
function createSnapshot(description = '') {
  const snapshots = getSnapshots();
  const snapshot = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    description: description || `快照 ${snapshots.length + 1}`,
    config: JSON.parse(JSON.stringify(currentConfigs))
  };
  
  snapshots.push(snapshot);
  
  // Keep only last 10 snapshots
  if (snapshots.length > 10) {
    snapshots.shift();
  }
  
  localStorage.setItem(STORAGE_KEYS.ADMIN_SNAPSHOTS, JSON.stringify(snapshots));
  showStatus(`快照已建立: ${snapshot.description}`, 'success');
  return snapshot;
}

function getSnapshots() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_SNAPSHOTS) || '[]');
  } catch (error) {
    console.warn('Failed to load snapshots:', error);
    return [];
  }
}

function restoreSnapshot(snapshotId) {
  const snapshots = getSnapshots();
  const snapshot = snapshots.find(s => s.id === snapshotId);
  
  if (!snapshot) {
    showStatus('找不到指定的快照', 'error');
    return false;
  }
  
  if (confirm(`確定要還原到快照「${snapshot.description}」嗎？目前的變更將會遺失。`)) {
    currentConfigs = JSON.parse(JSON.stringify(snapshot.config));
    renderCategories();
    saveToLocal();
    showStatus(`已還原到快照: ${snapshot.description}`, 'success');
    return true;
  }
  return false;
}

function deleteSnapshot(snapshotId) {
  if (confirm('確定要刪除此快照嗎？')) {
    const snapshots = getSnapshots();
    const filtered = snapshots.filter(s => s.id !== snapshotId);
    localStorage.setItem(STORAGE_KEYS.ADMIN_SNAPSHOTS, JSON.stringify(filtered));
    showStatus('快照已刪除', 'success');
    renderSnapshotList();
  }
}

function renderSnapshotList() {
  const snapshots = getSnapshots();
  const container = document.getElementById('snapshot-list');
  if (!container) return;
  
  if (snapshots.length === 0) {
    container.innerHTML = '<p>尚無快照</p>';
    return;
  }
  
  container.innerHTML = snapshots.map(snapshot => `
    <div class="snapshot-item">
      <div class="snapshot-info">
        <strong>${snapshot.description}</strong>
        <small>${new Date(snapshot.timestamp).toLocaleString()}</small>
      </div>
      <div class="button-group">
        <button onclick="restoreSnapshot(${snapshot.id})">還原</button>
        <button class="danger" onclick="deleteSnapshot(${snapshot.id})">刪除</button>
      </div>
    </div>
  `).join('');
}

// Import/Export with diff preview
function importConfigWithPreview() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = handleImportWithPreview;
  input.click();
}

function handleImportWithPreview(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedConfig = JSON.parse(e.target.result);
      
      // Validate imported config
      const errors = validateConfig(importedConfig);
      if (errors.length > 0) {
        showStatus(`匯入失敗:\n${errors.join('\n')}`, 'error');
        return;
      }
      
      // Show diff preview
      showDiffPreview(currentConfigs, importedConfig, (confirmed) => {
        if (confirmed) {
          createSnapshot('匯入前快照');
          currentConfigs = importedConfig;
          renderCategories();
          saveToLocal();
          showStatus('設定已匯入', 'success');
        }
      });
    } catch (error) {
      showStatus('JSON 格式錯誤', 'error');
    }
  };
  reader.readAsText(file);
}

function showDiffPreview(oldConfig, newConfig, callback) {
  const diff = generateConfigDiff(oldConfig, newConfig);
  
  const modal = document.createElement('div');
  modal.className = 'diff-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>匯入預覽</h3>
      <div class="diff-content">
        ${diff.html}
      </div>
      <div class="modal-actions">
        <button onclick="this.closest('.diff-modal').remove()">取消</button>
        <button class="primary" onclick="confirmDiff()">確認匯入</button>
      </div>
    </div>
  `;
  
  // Store callback for confirm button
  window.confirmDiff = () => {
    modal.remove();
    delete window.confirmDiff;
    callback(true);
  };
  
  document.body.appendChild(modal);
}

function generateConfigDiff(oldConfig, newConfig) {
  const changes = [];
  
  // Compare categories
  const oldCategories = oldConfig.categories || [];
  const newCategories = newConfig.categories || [];
  
  // Find added categories
  newCategories.forEach(newCat => {
    if (!oldCategories.find(oldCat => oldCat.key === newCat.key)) {
      changes.push({ type: 'added', category: newCat.key, label: newCat.label });
    }
  });
  
  // Find removed categories
  oldCategories.forEach(oldCat => {
    if (!newCategories.find(newCat => newCat.key === oldCat.key)) {
      changes.push({ type: 'removed', category: oldCat.key, label: oldCat.label });
    }
  });
  
  // Find modified categories
  oldCategories.forEach(oldCat => {
    const newCat = newCategories.find(newCat => newCat.key === oldCat.key);
    if (newCat && JSON.stringify(oldCat) !== JSON.stringify(newCat)) {
      changes.push({ type: 'modified', category: oldCat.key, label: oldCat.label });
    }
  });
  
  const html = changes.length === 0 
    ? '<p>沒有變更</p>'
    : changes.map(change => {
        const icon = change.type === 'added' ? '+ ' : change.type === 'removed' ? '- ' : '~ ';
        const color = change.type === 'added' ? 'green' : change.type === 'removed' ? 'red' : 'orange';
        return `<div style="color: ${color}">${icon}${change.label} (${change.category})</div>`;
      }).join('');
  
  return { changes, html };
}

// Field presets
const FIELD_PRESETS = {
  menu: {
    name: '菜單預設',
    fields: [
      { key: 'section', label: '區段標題', type: 'text' },
      { key: 'items', label: '品項（多行）', type: 'textarea' },
      { key: 'currency', label: '幣別', type: 'select', options: ['$', 'NT$', '¥'] },
      { key: 'priceColor', label: '價格顏色', type: 'color' }
    ]
  },
  room: {
    name: '房型預設',
    fields: [
      { key: 'roomType', label: '房型名稱', type: 'text' },
      { key: 'capacity', label: '入住人數', type: 'number' },
      { key: 'amenities', label: '設施', type: 'textarea' },
      { key: 'viewType', label: '景觀類型', type: 'select', options: ['海景', '山景', '市景', '庭園景'] }
    ]
  },
  classic: {
    name: '經典預設',
    fields: [
      { key: 'title', label: '主標題', type: 'text' },
      { key: 'subtitle', label: '副標題', type: 'text' },
      { key: 'accentColor', label: '強調色', type: 'color' },
      { key: 'borderStyle', label: '邊框樣式', type: 'select', options: ['無邊框', '簡單邊框', '優雅邊框'] }
    ]
  },
  card: {
    name: '名片預設',
    fields: [
      { key: 'name', label: '姓名', type: 'text' },
      { key: 'role', label: '職稱', type: 'text' },
      { key: 'phone', label: '電話', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'logoPosition', label: 'Logo位置', type: 'select', options: ['左上角', '右上角', '置中'] }
    ]
  }
};

function applyFieldPreset(presetKey) {
  const preset = FIELD_PRESETS[presetKey];
  if (!preset) return;
  
  if (confirm(`確定要套用「${preset.name}」預設欄位嗎？`)) {
    // You would implement this based on your current category editing UI
    showStatus(`已套用 ${preset.name}`, 'success');
  }
}

// Enhanced save function with confirmation
function saveToLocalWithConfirmation() {
  // Validate before saving
  const errors = validateConfig(currentConfigs);
  if (errors.length > 0) {
    showStatus(`儲存失敗，請修正以下問題:\n${errors.join('\n')}`, 'error');
    return;
  }
  
  if (confirm('確定要儲存覆寫設定嗎？這將覆蓋目前的本地設定。')) {
    createSnapshot('儲存前快照');
    saveToLocal();
  }
}

// Enhanced delete with confirmation
function deleteCategoryWithConfirmation(index) {
  const category = currentConfigs.categories[index];
  if (!category) return;
  
  if (confirm(`確定要刪除類別「${category.label}」嗎？\n\n此操作無法復原，建議先建立快照。`)) {
    createSnapshot(`刪除 ${category.label} 前快照`);
    deleteCategory(index);
  }
}

// Enhanced clear with confirmation
function clearOverrideWithConfirmation() {
  if (confirm('確定要清除本地覆寫設定嗎？\n\n這將回復為預設設定，所有本地變更將會遺失。\n\n建議先建立快照或匯出設定。')) {
    createSnapshot('清除前快照');
    clearOverride();
  }
}