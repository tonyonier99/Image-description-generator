// Admin interface for managing category configurations
// localStorage-based configuration management

// Storage keys
const STORAGE_KEYS = {
  CATEGORY_CONFIGS_OVERRIDE: 'idg:category-configs-override'
};

// Global state
let currentConfigs = null;
let hasOverride = false;

// Initialize admin interface
document.addEventListener('DOMContentLoaded', async function() {
  await loadConfigs();
  renderCategories();
  setupEventListeners();
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
          <button onclick="deleteCategory(${index})" class="danger">刪除</button>
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